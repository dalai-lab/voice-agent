"""MCP tools for querying call logs, conversation transcripts, and audio recordings."""

from __future__ import annotations

import re
from typing import Any

import httpx
from fastapi import HTTPException
from loguru import logger
from sqlalchemy import String, cast, select

from api.db import db_client
from api.db.models import WorkflowModel, WorkflowRunModel
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool
from api.services.storage import get_storage_for_backend, storage_fs
from api.services.workflow.run_usage_response import (
    artifact_url,
    extract_public_extracted_data,
    has_recording_track,
    resolve_call_duration_seconds,
)

_TRANSCRIPT_LINE_RE = re.compile(
    r"^(?:\[(.*?)\]\s*)?(user|assistant)(?:\s*\[keypad\])?:\s*(.*)$",
    re.IGNORECASE,
)


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "error_code": code, "error": message, **extra}


@traced_tool
async def list_call_logs(
    workflow_id: int | None = None,
    call_type: str = "all",
    phone_number: str | None = None,
    limit: int = 10,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Search and filter past voice calls placed or received by your organization.

    Returns call duration, status, caller/called phone numbers, and flags
    indicating whether recordings and transcripts are available.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return []

    clean_limit = min(max(1, limit), 50)
    clean_offset = max(0, offset)

    async with db_client.async_session() as session:
        query = (
            select(WorkflowRunModel, WorkflowModel.name)
            .join(WorkflowModel, WorkflowRunModel.workflow_id == WorkflowModel.id)
            .where(WorkflowModel.organization_id == org_id)
        )

        if workflow_id is not None:
            query = query.where(WorkflowRunModel.workflow_id == workflow_id)
        if call_type and call_type.lower() != "all":
            query = query.where(WorkflowRunModel.call_type == call_type.lower())
        if phone_number:
            clean_num = re.sub(r"[\s\-()]", "", phone_number.strip())
            query = query.where(
                cast(WorkflowRunModel.initial_context, String).ilike(f"%{clean_num}%")
            )

        query = (
            query.order_by(WorkflowRunModel.created_at.desc())
            .limit(clean_limit)
            .offset(clean_offset)
        )
        result = await session.execute(query)
        rows = result.all()

    runs_list = []
    for run, wf_name in rows:
        initial = run.initial_context if isinstance(run.initial_context, dict) else {}
        gathered = run.gathered_context if isinstance(run.gathered_context, dict) else {}

        caller = (
            initial.get("caller_number")
            or initial.get("from_number")
            or initial.get("phone_number")
        )
        called = initial.get("called_number") or initial.get("to_number")
        duration = resolve_call_duration_seconds(run.usage_info, run.cost_info)
        disposition = (
            gathered.get("mapped_call_disposition")
            or gathered.get("call_disposition")
        )

        has_rec = bool(
            run.recording_url
            or has_recording_track(run.extra, "mixed")
            or has_recording_track(run.extra, "user")
            or has_recording_track(run.extra, "bot")
        )

        runs_list.append(
            {
                "run_id": run.id,
                "workflow_id": run.workflow_id,
                "workflow_name": wf_name,
                "call_type": run.call_type,
                "caller_number": str(caller) if caller else None,
                "called_number": str(called) if called else None,
                "duration_seconds": duration,
                "disposition": str(disposition) if disposition else None,
                "is_completed": run.is_completed,
                "started_at": run.created_at.isoformat() if run.created_at else None,
                "has_recording": has_rec,
                "has_transcript": bool(run.transcript_url),
            }
        )

    return runs_list


@traced_tool
async def get_call_details(
    run_id: int,
    max_turns: int = 50,
) -> dict[str, Any]:
    """Retrieve full conversation transcript, extracted customer variables, and audio playback URL for a specific call.

    On failure, returns `success: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `not_found` — the call run does not exist or belongs to another organization.
    - `fetch_failed` — unexpected error reading transcript or call metadata.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result("not_found", "No organization selected")

    run = await db_client.get_workflow_run(run_id, organization_id=org_id)
    if not run:
        return _error_result("not_found", f"Call run {run_id} not found in your organization")

    initial = run.initial_context if isinstance(run.initial_context, dict) else {}
    gathered = run.gathered_context if isinstance(run.gathered_context, dict) else {}

    caller = (
        initial.get("caller_number")
        or initial.get("from_number")
        or initial.get("phone_number")
    )
    called = initial.get("called_number") or initial.get("to_number")
    duration = resolve_call_duration_seconds(run.usage_info, run.cost_info)
    disposition = (
        gathered.get("mapped_call_disposition")
        or gathered.get("call_disposition")
    )

    # Audio Recording URL resolution
    recording_url = None
    try:
        backend_fs = get_storage_for_backend(run.storage_backend)
        if run.recording_url:
            recording_url = await backend_fs.aget_signed_url(run.recording_url, expiration=7200)
    except Exception as e:
        logger.warning(f"Could not generate recording URL for run {run_id}: {e}")

    # Transcript turns resolution
    turns: list[dict[str, str]] = []
    if run.transcript_url:
        try:
            backend_fs = get_storage_for_backend(run.storage_backend)
            signed_url = await backend_fs.aget_signed_url(
                run.transcript_url, expiration=300, use_internal_endpoint=True
            )
            if signed_url:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(signed_url)
                    if resp.status_code == 200:
                        lines = resp.text.splitlines()
                        for line in lines:
                            line_str = line.strip()
                            if not line_str:
                                continue
                            match = _TRANSCRIPT_LINE_RE.match(line_str)
                            if match:
                                ts, role, text = match.groups()
                                turns.append(
                                    {
                                        "role": role.lower(),
                                        "message": text.strip(),
                                        "timestamp": ts or "",
                                    }
                                )
                            else:
                                # Fallback line parsing
                                turns.append({"role": "system", "message": line_str, "timestamp": ""})
        except Exception as e:
            logger.warning(f"Could not fetch transcript text for run {run_id}: {e}")

    total_turns = len(turns)
    truncated = total_turns > max_turns
    capped_turns = turns[:max_turns] if truncated else turns

    extracted_vars = extract_public_extracted_data(run.extracted_data, run.gathered_context)

    wf_name = None
    if run.workflow:
        wf_name = run.workflow.name

    return {
        "success": True,
        "run_id": run.id,
        "workflow_id": run.workflow_id,
        "workflow_name": wf_name or run.name,
        "call_type": run.call_type,
        "caller_number": str(caller) if caller else None,
        "called_number": str(called) if called else None,
        "duration_seconds": duration,
        "disposition": str(disposition) if disposition else None,
        "is_completed": run.is_completed,
        "extracted_variables": extracted_vars,
        "recording_url": recording_url,
        "total_turns": total_turns,
        "truncated": truncated,
        "transcript": capped_turns,
    }
