"""MCP tool for publishing the editable draft version of a voice agent to live production."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from loguru import logger
from pydantic import ValidationError as PydanticValidationError

from api.db import db_client
from api.enums import PostHogEvent
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool
from api.services.posthog_client import capture_event
from api.services.workflow.dto import ReactFlowDTO
from api.services.workflow.tool_name_validation import (
    validate_workflow_tool_name_collisions,
)
from api.services.workflow.trigger_paths import (
    extract_trigger_paths,
    validate_trigger_paths,
)
from api.services.workflow.workflow_graph import WorkflowGraph


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"published": False, "error_code": code, "error": message, **extra}


@traced_tool
async def publish_workflow(workflow_id: int) -> dict[str, Any]:
    """Promote the current draft version of an agent workflow to live production.

    Validates the canvas graph, DTO schema, trigger paths, and custom tools
    before promoting the draft to live status. On success:
    - The current draft version status becomes "published".
    - The previous published version becomes "archived".
    - Live inbound and outbound telephony calls will immediately execute this new version.

    On failure, returns `published: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `not_found` — workflow does not exist in your organization.
    - `workflow_archived` — cannot publish an archived workflow.
    - `no_draft` — workflow has no editable draft version to publish. Make edits first with `save_workflow` or `update_workflow_settings`.
    - `schema_validation` — canvas definition failed DTO schema validation.
    - `graph_validation` — canvas definition failed structural graph validation.
    - `tool_name_collision` — tool name collisions detected in custom tools.
    - `trigger_path_conflict` — trigger path is already in use by another agent.
    - `publish_failed` — unexpected error promoting draft to published version.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    workflow = await db_client.get_workflow(workflow_id, organization_id=org_id)
    if not workflow:
        return _error_result(
            "not_found", f"Workflow {workflow_id} not found in your organization"
        )

    if workflow.status == "archived":
        return _error_result(
            "workflow_archived",
            f"Cannot publish archived workflow '{workflow.name}'",
        )

    draft = await db_client.get_draft_version(workflow_id)
    if not draft:
        return _error_result(
            "no_draft",
            f"Workflow {workflow_id} has no draft version to publish. Make edits first using save_workflow or update_workflow_settings.",
        )

    payload = draft.workflow_json or {}
    if payload:
        # 1. DTO validation
        try:
            dto = ReactFlowDTO.model_validate(payload)
        except PydanticValidationError as e:
            return _error_result("schema_validation", str(e))

        # 2. Graph validation
        try:
            WorkflowGraph(dto)
        except ValueError as e:
            return _error_result("graph_validation", str(e))

        # 3. Trigger paths validation
        for issue in validate_trigger_paths(payload):
            return _error_result("graph_validation", issue.message)

        # 4. Tool collisions
        tool_errors = await validate_workflow_tool_name_collisions(payload, org_id)
        if tool_errors:
            return _error_result(
                "tool_name_collision",
                tool_errors[0].message
                if hasattr(tool_errors[0], "message")
                else str(tool_errors[0]),
            )

        # 5. Trigger path conflicts
        trigger_paths = extract_trigger_paths(payload)
        if trigger_paths:
            conflicts = await db_client.check_trigger_path_conflicts(
                trigger_paths=trigger_paths,
                exclude_workflow_id=workflow_id,
            )
            if conflicts:
                return _error_result(
                    "trigger_path_conflict",
                    f"Trigger path '{conflicts[0]}' is already in use by another agent.",
                )

    # Promote draft -> published in DB
    try:
        published = await db_client.publish_workflow_draft(workflow_id)
    except ValueError as e:
        return _error_result("publish_failed", str(e))
    except Exception as e:
        logger.exception(
            f"Unexpected error publishing draft for workflow {workflow_id}: {e}"
        )
        return _error_result("publish_failed", f"Failed to publish workflow: {e}")

    try:
        capture_event(
            distinct_id=str(user.provider_id),
            event=PostHogEvent.WORKFLOW_PUBLISHED,
            properties={
                "workflow_id": workflow_id,
                "version_number": published.version_number,
                "organization_id": org_id,
            },
        )
    except Exception:
        pass

    return {
        "published": True,
        "workflow_id": workflow_id,
        "name": workflow.name,
        "version_number": published.version_number,
        "status": published.status,
        "published_at": published.published_at.isoformat()
        if published.published_at
        else None,
        "message": f"Workflow '{workflow.name}' published successfully as version {published.version_number}.",
    }
