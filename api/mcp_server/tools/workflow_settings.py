"""MCP tools for managing workflow settings, model overrides, and Post-Call Intelligence schemas."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from loguru import logger
from sqlalchemy import func, select

from api.db import db_client
from api.db.models import WorkflowDefinitionModel, WorkflowModel, WorkflowRunModel
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool
from api.schemas.ai_model_configuration import OrganizationAIModelConfigurationV2
from api.services.configuration.ai_model_configuration import (
    WORKFLOW_MODEL_CONFIGURATION_V2_OVERRIDE_KEY,
    get_resolved_ai_model_configuration,
    merge_ai_model_configuration_v2_secrets,
)
from api.services.configuration.masking import mask_workflow_configurations
from api.services.configuration.merge import merge_workflow_configuration_secrets
from api.services.workflow.run_usage_response import resolve_call_duration_seconds

_IDENTIFIER_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")
_VALID_PCI_TYPES = frozenset({"string", "number", "boolean", "array", "object"})


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"saved": False, "error_code": code, "error": message, **extra}


@traced_tool
async def get_workflow_settings(workflow_id: int) -> dict[str, Any]:
    """Retrieve operational settings, Post-Call Intelligence schema, and configuration for a voice agent.

    Returns the complete settings bundle including timeouts, VAD parameters,
    model overrides (BYOK API keys masked), template variables, phonetic dictionary,
    Post-Call Intelligence extraction schema, voicemail detection, website embed,
    and the public Agent UUID.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    workflow = await db_client.get_workflow(workflow_id, organization_id=org_id)
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found in your organization")

    draft = await db_client.get_draft_version(workflow_id)
    published = getattr(workflow, "released_definition", None)
    active_def = draft or published

    if draft:
        raw_configs = draft.workflow_configurations or {}
        template_vars = draft.template_context_variables or {}
        post_call_schema = draft.post_call_schema or []
    elif published:
        raw_configs = published.workflow_configurations or {}
        template_vars = published.template_context_variables or {}
        post_call_schema = published.post_call_schema or []
    else:
        raw_configs = workflow.workflow_configurations or {}
        template_vars = workflow.template_context_variables or {}
        post_call_schema = workflow.post_call_schema or []

    masked_configs = mask_workflow_configurations(raw_configs) or {}

    general_settings = {
        "max_call_duration_seconds": masked_configs.get("max_call_duration", 300),
        "max_user_idle_timeout_seconds": masked_configs.get("max_user_idle_timeout", 10.0),
        "enable_dtmf": workflow.enable_dtmf,
        "turn_start_strategy": masked_configs.get("turn_start_strategy", "default"),
        "turn_start_min_words": masked_configs.get("turn_start_min_words", 3),
        "turn_stop_strategy": masked_configs.get("turn_stop_strategy", "transcription"),
        "turn_silence_timeout_secs": masked_configs.get("turn_silence_timeout_secs", 0.8),
        "smart_turn_stop_secs": masked_configs.get("smart_turn_stop_secs", 2.0),
        "vad_min_volume": masked_configs.get("vad_min_volume", 0.20),
        "vad_confidence": masked_configs.get("vad_confidence", 0.50),
        "vad_stop_secs": masked_configs.get("vad_stop_secs", 0.25),
        "user_turn_stop_timeout": masked_configs.get("user_turn_stop_timeout", 3.5),
        "boost_affirmations": masked_configs.get("boost_affirmations", True),
        "allow_transcription_fallback": masked_configs.get("allow_transcription_fallback", True),
        "dynamic_noise_floor": masked_configs.get("dynamic_noise_floor", False),
        "dynamic_noise_floor_margin": masked_configs.get("dynamic_noise_floor_margin", 0.15),
        "dynamic_noise_floor_min": masked_configs.get("dynamic_noise_floor_min", 0.15),
        "dynamic_noise_floor_max": masked_configs.get("dynamic_noise_floor_max", 0.55),
        "ambient_noise": masked_configs.get("ambient_noise_configuration", {"enabled": False, "volume": 0.3}),
    }

    model_overrides = (
        masked_configs.get("model_configuration_v2_override")
        or masked_configs.get("model_overrides")
        or {}
    )

    embed_config = masked_configs.get("embed") or {}
    embed_snippet = (
        f'<script src="https://talkar.in/widget.js" data-agent-id="{workflow.workflow_uuid}"></script>'
    )

    return {
        "workflow_id": workflow.id,
        "agent_uuid": workflow.workflow_uuid,
        "name": workflow.name,
        "status": getattr(workflow, "status", "active"),
        "version": {
            "status": active_def.status if active_def else "published",
            "version_number": active_def.version_number if active_def else 1,
        },
        "general": general_settings,
        "model_overrides": model_overrides,
        "template_context_variables": template_vars,
        "dictionary": masked_configs.get("dictionary", ""),
        "post_call_intelligence": post_call_schema,
        "voicemail_detection": masked_configs.get("voicemail_detection", {}),
        "website_embed": {
            "enabled": embed_config.get("enabled", False),
            "allowed_domains": embed_config.get("allowed_domains", []),
            "widget_title": embed_config.get("widget_title", f"Chat with {workflow.name}"),
            "embed_snippet": embed_snippet,
        },
    }


@traced_tool
async def update_workflow_settings(
    workflow_id: int,
    name: str | None = None,
    enable_dtmf: bool | None = None,
    general: dict[str, Any] | None = None,
    model_overrides: dict[str, Any] | None = None,
    template_context_variables: dict[str, Any] | None = None,
    dictionary: str | None = None,
    post_call_schema: list[dict[str, Any]] | None = None,
    voicemail_detection: dict[str, Any] | None = None,
    website_embed: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Update settings, model overrides, phonetic dictionary, or Post-Call Intelligence schemas for an agent.

    All updates are draft-safe: they fork or update the editable draft version,
    leaving published production traffic untouched. To promote draft changes to live calls,
    call `publish_workflow` or publish the agent in the UI.

    On failure, returns `saved: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `not_found` — workflow does not exist in your organization.
    - `workflow_archived` — cannot edit an archived workflow.
    - `invalid_pci_schema` — post-call intelligence schema validation error.
    - `validation_error` — parameter out of allowed bounds (e.g. call duration > 1800s).
    - `recording_not_found` — voicemail audio recording ID does not exist in your organization.
    - `save_failed` — unexpected error saving workflow draft.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result("not_found", "No organization selected")

    workflow = await db_client.get_workflow(workflow_id, organization_id=org_id)
    if not workflow:
        return _error_result("not_found", f"Workflow {workflow_id} not found in your organization")

    if workflow.status == "archived":
        return _error_result("workflow_archived", f"Cannot edit archived workflow '{workflow.name}'")

    updated_fields: list[str] = []

    # 1. Validate post_call_schema if supplied
    if post_call_schema is not None:
        seen_names = set()
        for item in post_call_schema:
            if not isinstance(item, dict):
                return _error_result("invalid_pci_schema", "Each item in post_call_schema must be an object")
            var_name = item.get("name")
            var_type = item.get("type")
            var_desc = item.get("description")

            if not var_name or not _IDENTIFIER_RE.match(str(var_name)):
                return _error_result(
                    "invalid_pci_schema",
                    f"Invalid variable name '{var_name}'. Must be a valid identifier (letters, numbers, underscores).",
                )
            if var_name in seen_names:
                return _error_result("invalid_pci_schema", f"Duplicate field name '{var_name}' in post_call_schema")
            seen_names.add(var_name)

            if var_type not in _VALID_PCI_TYPES:
                return _error_result(
                    "invalid_pci_schema",
                    f"Invalid type '{var_type}' for '{var_name}'. Allowed types: {sorted(_VALID_PCI_TYPES)}",
                )
            if not var_desc:
                return _error_result(
                    "invalid_pci_schema",
                    f"Field '{var_name}' must include a prompt description for the Post-Call LLM",
                )
            if "enum" in item:
                enum_vals = item["enum"]
                if not isinstance(enum_vals, list) or len(enum_vals) == 0:
                    return _error_result(
                        "invalid_pci_schema",
                        f"Field '{var_name}' has enum specified but it is empty",
                    )
        updated_fields.append("post_call_schema")

    # 2. Validate general settings if supplied
    if general is not None:
        if "max_call_duration_seconds" in general:
            duration = general["max_call_duration_seconds"]
            if not (1 <= duration <= 1800):
                return _error_result(
                    "validation_error",
                    f"max_call_duration_seconds must be between 1 and 1800 seconds (got {duration})",
                )
        if "vad_min_volume" in general:
            vol = general["vad_min_volume"]
            if not (0.05 <= vol <= 0.80):
                return _error_result("validation_error", f"vad_min_volume must be between 0.05 and 0.80 (got {vol})")
        if "vad_confidence" in general:
            conf = general["vad_confidence"]
            if not (0.30 <= conf <= 0.90):
                return _error_result("validation_error", f"vad_confidence must be between 0.30 and 0.90 (got {conf})")
        if "turn_silence_timeout_secs" in general:
            silence = general["turn_silence_timeout_secs"]
            if not (0.3 <= silence <= 3.0):
                return _error_result(
                    "validation_error",
                    f"turn_silence_timeout_secs must be between 0.3 and 3.0 seconds (got {silence})",
                )
        if "dynamic_noise_floor" in general and not isinstance(general["dynamic_noise_floor"], bool):
            return _error_result("validation_error", "dynamic_noise_floor must be a boolean")
        if "dynamic_noise_floor_margin" in general:
            margin = general["dynamic_noise_floor_margin"]
            if not (0.05 <= margin <= 0.35):
                return _error_result("validation_error", f"dynamic_noise_floor_margin must be between 0.05 and 0.35 (got {margin})")
        if "dynamic_noise_floor_min" in general:
            floor_min = general["dynamic_noise_floor_min"]
            if not (0.05 <= floor_min <= 0.35):
                return _error_result("validation_error", f"dynamic_noise_floor_min must be between 0.05 and 0.35 (got {floor_min})")
        if "dynamic_noise_floor_max" in general:
            floor_max = general["dynamic_noise_floor_max"]
            if not (0.35 <= floor_max <= 0.75):
                return _error_result("validation_error", f"dynamic_noise_floor_max must be between 0.35 and 0.75 (got {floor_max})")
        updated_fields.append("general")

    # 3. Validate voicemail audio recording if supplied
    if voicemail_detection is not None and voicemail_detection.get("audio_recording_id"):
        rec_id = voicemail_detection["audio_recording_id"]
        recordings = await db_client.get_recordings(organization_id=org_id)
        existing_rec_ids = {r.recording_id for r in recordings}
        if rec_id not in existing_rec_ids:
            return _error_result(
                "recording_not_found",
                f"Audio recording '{rec_id}' not found in organization recordings library",
            )
        updated_fields.append("voicemail_detection")

    if model_overrides is not None:
        updated_fields.append("model_overrides")
    if template_context_variables is not None:
        updated_fields.append("template_context_variables")
    if dictionary is not None:
        updated_fields.append("dictionary")
    if website_embed is not None:
        updated_fields.append("website_embed")
    if name is not None:
        updated_fields.append("name")
    if enable_dtmf is not None:
        updated_fields.append("enable_dtmf")

    # 4. Fetch existing base configurations for safe merge
    draft = await db_client.get_draft_version(workflow_id)
    published = getattr(workflow, "released_definition", None)
    existing_configs = (
        draft.workflow_configurations
        if draft and draft.workflow_configurations
        else (published.workflow_configurations if published and published.workflow_configurations else (workflow.workflow_configurations or {}))
    )
    existing_template_vars = (
        draft.template_context_variables
        if draft and draft.template_context_variables
        else (published.template_context_variables if published and published.template_context_variables else (workflow.template_context_variables or {}))
    )

    merged_configs = dict(existing_configs)

    if general is not None:
        for k, v in general.items():
            if k == "max_call_duration_seconds":
                merged_configs["max_call_duration"] = v
            elif k == "max_user_idle_timeout_seconds":
                merged_configs["max_user_idle_timeout"] = v
            elif k == "ambient_noise":
                merged_configs["ambient_noise_configuration"] = v
            else:
                merged_configs[k] = v

    if dictionary is not None:
        merged_configs["dictionary"] = dictionary

    if voicemail_detection is not None:
        merged_configs["voicemail_detection"] = voicemail_detection

    if website_embed is not None:
        merged_configs["embed"] = website_embed

    if model_overrides is not None:
        is_v2 = isinstance(model_overrides, dict) and (
            model_overrides.get("version") == 2
            or "byok" in model_overrides
            or "hosted" in model_overrides
            or model_overrides.get("mode") in ("byok", "hosted", "dograh")
        )
        if is_v2:
            try:
                incoming_v2 = OrganizationAIModelConfigurationV2.model_validate(model_overrides)
                existing_v2_raw = existing_configs.get(WORKFLOW_MODEL_CONFIGURATION_V2_OVERRIDE_KEY)
                existing_v2 = (
                    OrganizationAIModelConfigurationV2.model_validate(existing_v2_raw)
                    if existing_v2_raw
                    else None
                )
                merged_v2 = merge_ai_model_configuration_v2_secrets(incoming_v2, existing_v2)
                if existing_v2 is None:
                    try:
                        resolved_config = await get_resolved_ai_model_configuration(
                            organization_id=org_id,
                        )
                        if resolved_config and resolved_config.organization_configuration:
                            merged_v2 = merge_ai_model_configuration_v2_secrets(
                                merged_v2,
                                resolved_config.organization_configuration,
                            )
                    except Exception:
                        pass
                merged_configs[WORKFLOW_MODEL_CONFIGURATION_V2_OVERRIDE_KEY] = merged_v2.model_dump(
                    mode="json", exclude_none=True
                )
                merged_configs.pop("model_overrides", None)
            except Exception as e:
                return _error_result(
                    "validation_error",
                    f"Invalid v2 model override configuration: {e}",
                )
        elif model_overrides:
            # Legacy v1 model_overrides: merge secrets safely
            merged_configs = merge_workflow_configuration_secrets(
                {**merged_configs, "model_overrides": model_overrides},
                existing_configs,
            )
            # Clear any stale v2 override so it doesn't shadow the legacy override
            merged_configs.pop(WORKFLOW_MODEL_CONFIGURATION_V2_OVERRIDE_KEY, None)
        else:
            # Empty dict means clear overrides
            merged_configs.pop("model_overrides", None)
            merged_configs.pop(WORKFLOW_MODEL_CONFIGURATION_V2_OVERRIDE_KEY, None)

    merged_template_vars = (
        template_context_variables
        if template_context_variables is not None
        else existing_template_vars
    )

    try:
        updated_wf = await db_client.update_workflow(
            workflow_id=workflow_id,
            name=name if name is not None else workflow.name,
            workflow_definition=None,  # Leave canvas graph untouched
            template_context_variables=merged_template_vars,
            workflow_configurations=merged_configs,
            post_call_schema=post_call_schema,
            enable_dtmf=enable_dtmf if enable_dtmf is not None else workflow.enable_dtmf,
            organization_id=org_id,
        )

        active_draft = await db_client.get_draft_version(workflow_id)
        version_num = active_draft.version_number if active_draft else None

        return {
            "saved": True,
            "workflow_id": workflow_id,
            "agent_uuid": workflow.workflow_uuid,
            "name": updated_wf.name,
            "version_number": version_num,
            "version_status": "draft",
            "updated_fields": updated_fields,
            "message": "Workflow draft settings updated successfully. Use save_workflow or publish in UI to promote to live traffic.",
        }
    except Exception as e:
        logger.error(f"Error updating workflow settings for {workflow_id}: {e}")
        return _error_result("save_failed", str(e))


@traced_tool
async def get_workflow_report(
    workflow_id: int,
    days: int = 30,
) -> dict[str, Any]:
    """Retrieve analytics report data for a voice agent workflow.

    Returns aggregate call volume, completion rate, average duration,
    disposition breakdown, and estimated call costs.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    workflow = await db_client.get_workflow(workflow_id, organization_id=org_id)
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found in your organization")

    days_clamped = min(max(1, days), 90)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_clamped)

    async with db_client.async_session() as session:
        result = await session.execute(
            select(WorkflowRunModel)
            .where(
                WorkflowRunModel.workflow_id == workflow_id,
                WorkflowRunModel.created_at >= cutoff,
            )
        )
        runs = result.scalars().all()

    total_calls = len(runs)
    completed_calls = sum(1 for r in runs if r.is_completed)
    failed_calls = total_calls - completed_calls
    total_seconds = sum(
        (resolve_call_duration_seconds(r.usage_info, r.cost_info) or 0) for r in runs
    )
    avg_seconds = round(total_seconds / total_calls, 1) if total_calls > 0 else 0.0

    dispositions: dict[str, int] = {}
    pci_extractions_count = 0
    for r in runs:
        g = r.gathered_context if isinstance(r.gathered_context, dict) else {}
        disp = g.get("mapped_call_disposition") or g.get("call_disposition")
        if disp:
            disp_str = str(disp)
            dispositions[disp_str] = dispositions.get(disp_str, 0) + 1
        if r.extracted_data:
            pci_extractions_count += 1

    pci_rate = round((pci_extractions_count / total_calls) * 100, 1) if total_calls > 0 else 0.0
    est_cost_inr = round((total_seconds / 60.0) * 6.00, 2)

    return {
        "workflow_id": workflow.id,
        "agent_uuid": workflow.workflow_uuid,
        "name": workflow.name,
        "time_window_days": days_clamped,
        "summary": {
            "total_calls": total_calls,
            "completed_calls": completed_calls,
            "failed_or_dropped_calls": failed_calls,
            "total_duration_minutes": round(total_seconds / 60.0, 1),
            "average_duration_seconds": avg_seconds,
            "estimated_cost_rupees": est_cost_inr,
        },
        "dispositions": dispositions,
        "intelligence_extraction_rate_percent": pci_rate,
    }
