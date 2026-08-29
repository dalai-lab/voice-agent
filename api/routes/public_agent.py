"""Public API endpoints for public agent execution.

These endpoints are accessible with API key authentication and allow
external systems to programmatically trigger phone calls.
"""

import random
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from fastapi import APIRouter, Header, HTTPException
from loguru import logger
from pydantic import BaseModel

from api.db import db_client
from api.enums import TriggerState, WorkflowStatus
from api.services.call_concurrency import (
    CallConcurrencyLimitError,
    call_concurrency,
)
from api.services.quota_service import authorize_workflow_run_start
from api.services.telephony.factory import (
    get_default_telephony_provider,
    get_telephony_provider_by_id,
)
from api.services.workflow.initial_context import merge_external_initial_context
from api.services.workflow.run_creation import prepare_workflow_run_inputs
from api.services.workflow_run_failure import mark_workflow_run_failed
from api.utils.common import get_backend_endpoints

router = APIRouter(prefix="/public/agent")


class TriggerCallRequest(BaseModel):
    """Request model for triggering a call via API"""

    phone_number: str
    initial_context: dict | None = None
    telephony_configuration_id: int | None = None


class TriggerCallResponse(BaseModel):
    """Response model for successful call initiation"""

    status: str
    workflow_run_id: int
    workflow_run_name: str


class RunExtractionResponse(BaseModel):
    """Lightweight response for demo polling: completion flag + extracted variables."""

    run_id: int
    is_completed: bool
    extracted_data: dict | None = None


@dataclass
class ResolvedAgentTarget:
    workflow: object
    organization_id: int
    identifier_type: str
    identifier_value: str


def trigger_exists_in_workflow(workflow_definition: dict, trigger_path: str) -> bool:
    """Check if trigger node exists in workflow definition.

    Args:
        workflow_definition: The workflow definition JSON
        trigger_path: The trigger UUID to look for

    Returns:
        True if trigger node exists, False otherwise
    """
    nodes = workflow_definition.get("nodes", [])
    for node in nodes:
        if node.get("type") == "trigger":
            if node.get("data", {}).get("trigger_path") == trigger_path:
                return True
    return False


async def _validate_api_key(x_api_key: str):
    """Validate the org API key used to invoke a public agent endpoint."""
    api_key = await db_client.validate_api_key(x_api_key)
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


def _ensure_workflow_is_active(workflow) -> None:
    if workflow.status != WorkflowStatus.ACTIVE.value:
        raise HTTPException(status_code=404, detail="Workflow is not active")


def _get_execution_user_id(workflow) -> int:
    if workflow.user_id is None:
        raise HTTPException(
            status_code=409,
            detail="Workflow has no execution owner",
        )
    return workflow.user_id


async def _get_workflow_definition_for_execution(workflow, *, use_draft: bool) -> dict:
    """Return the definition that would execute for this public agent request."""
    if use_draft:
        draft = await db_client.get_draft_version(workflow.id)
        if draft:
            return draft.workflow_json

    if workflow.released_definition is None:
        raise HTTPException(
            status_code=404, detail="Workflow has no published definition"
        )

    return workflow.released_definition.workflow_json


async def _resolve_trigger_target(
    trigger_path: str,
    organization_id: int,
    *,
    use_draft: bool,
) -> ResolvedAgentTarget:
    """Resolve a trigger UUID to a workflow, scoped to the API key's org."""
    trigger = await db_client.get_agent_trigger_by_path(trigger_path)
    if not trigger:
        raise HTTPException(status_code=404, detail="Agent trigger not found")

    if organization_id != trigger.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if trigger.state != TriggerState.ACTIVE.value:
        raise HTTPException(status_code=404, detail="Agent trigger is not active")

    workflow = await db_client.get_workflow(
        trigger.workflow_id,
        organization_id=organization_id,
    )
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    _ensure_workflow_is_active(workflow)
    workflow_definition = await _get_workflow_definition_for_execution(
        workflow,
        use_draft=use_draft,
    )
    if not trigger_exists_in_workflow(workflow_definition, trigger_path):
        raise HTTPException(
            status_code=404,
            detail="Trigger not found in the selected Agent",
        )

    return ResolvedAgentTarget(
        workflow=workflow,
        organization_id=organization_id,
        identifier_type="trigger_path",
        identifier_value=trigger_path,
    )


async def _resolve_workflow_uuid_target(
    workflow_uuid: str,
    organization_id: int,
    *,
    use_draft: bool,
) -> ResolvedAgentTarget:
    """Resolve a workflow UUID directly, scoped to the API key's org."""
    workflow = await db_client.get_workflow_by_uuid(workflow_uuid, organization_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    _ensure_workflow_is_active(workflow)
    await _get_workflow_definition_for_execution(workflow, use_draft=use_draft)

    return ResolvedAgentTarget(
        workflow=workflow,
        organization_id=organization_id,
        identifier_type="workflow_uuid",
        identifier_value=workflow_uuid,
    )


async def _execute_resolved_target(
    target: ResolvedAgentTarget,
    request: TriggerCallRequest,
    *,
    use_draft: bool,
    api_key_id: int | None,
    api_key_created_by: int | None,
) -> TriggerCallResponse:
    """Shared execution path once the target workflow has been resolved."""
    execution_user_id = _get_execution_user_id(target.workflow)

    # Get telephony provider — either the caller-specified config (validated
    # against the workflow's org) or the org's default config.
    if request.telephony_configuration_id is not None:
        cfg = await db_client.get_telephony_configuration_for_org(
            request.telephony_configuration_id,
            target.organization_id,
        )
        if not cfg:
            raise HTTPException(
                status_code=404, detail="Telephony configuration not found"
            )
        try:
            provider = await get_telephony_provider_by_id(
                cfg.id, target.organization_id
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Telephony provider not configured for this configuration",
            )
        resolved_cfg_id = cfg.id
    else:
        try:
            provider = await get_default_telephony_provider(target.organization_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Telephony provider not configured for this organization",
            )
        default_cfg = await db_client.get_default_telephony_configuration(
            target.organization_id
        )
        resolved_cfg_id = default_cfg.id if default_cfg else None

    # Validate provider is configured
    if not provider.validate_config():
        raise HTTPException(
            status_code=400,
            detail="Telephony provider not configured for this organization",
        )

    # 7. Determine the workflow run mode based on provider type
    workflow_run_mode = provider.PROVIDER_NAME

    # 8. Create workflow run
    mode_label = "TEST" if use_draft else "API"
    workflow_run_name = f"WR-{mode_label}-{random.randint(1000, 9999)}"
    initial_context = {
        "provider": provider.PROVIDER_NAME,
        "phone_number": request.phone_number,
        "trigger_mode": "test" if use_draft else "production",
        "telephony_configuration_id": resolved_cfg_id,
        "agent_identifier": target.identifier_value,
        "agent_identifier_type": target.identifier_type,
        "workflow_uuid": target.workflow.workflow_uuid,
    }
    if target.identifier_type == "trigger_path":
        initial_context["agent_uuid"] = target.identifier_value
    if api_key_id is not None:
        initial_context["api_key_id"] = api_key_id
    if api_key_created_by is not None:
        initial_context["api_key_created_by"] = api_key_created_by
    initial_context = merge_external_initial_context(
        initial_context, request.initial_context
    )
    # The destination describes the actual call and must not be overridden by
    # caller-supplied context.
    initial_context["called_number"] = request.phone_number

    try:
        concurrency_slot = await call_concurrency.acquire_org_slot(
            target.organization_id,
            source="public_agent",
            timeout=0,
        )
    except CallConcurrencyLimitError:
        raise HTTPException(
            status_code=429,
            detail="Concurrent call limit reached",
        )
    except Exception as e:
        logger.warning(f"Redis down, failing open for org {target.organization_id}: {e}")
        concurrency_slot = None

    try:
        run_inputs = await prepare_workflow_run_inputs(
            db_client,
            target.workflow,
            initial_context=initial_context,
            use_draft=use_draft,
            include_template_context=use_draft,
        )
        workflow_run = await db_client.create_workflow_run(
            name=workflow_run_name,
            workflow_id=target.workflow.id,
            mode=workflow_run_mode,
            initial_context=run_inputs.initial_context,
            user_id=execution_user_id,
            organization_id=target.organization_id,
            definition_id=run_inputs.definition_id,
        )
        await call_concurrency.bind_workflow_run(concurrency_slot, workflow_run.id)
    except Exception:
        await call_concurrency.release_slot(concurrency_slot)
        raise

    logger.info(
        f"Created workflow run {workflow_run.id} for public agent "
        f"{target.identifier_type}={target.identifier_value} "
        f"(mode={'test' if use_draft else 'production'}) "
        f"to phone number {request.phone_number}"
    )

    # Check Dograh quota after the run exists so hosted v2 can mint and store
    # the MPS correlation id before the provider starts the call.
    quota_result = await authorize_workflow_run_start(
        workflow_id=target.workflow.id,
        organization_id=target.organization_id,
        workflow_run_id=workflow_run.id,
    )
    if not quota_result.has_quota:
        await mark_workflow_run_failed(
            workflow_run.id, quota_result.error_message or "Quota exceeded"
        )
        await call_concurrency.release_workflow_run_slot(workflow_run.id)
        raise HTTPException(status_code=402, detail=quota_result.error_message)

    # 9. Construct webhook URL for telephony provider callback
    try:
        backend_endpoint, _ = await get_backend_endpoints()
    except Exception:
        await call_concurrency.release_workflow_run_slot(workflow_run.id)
        raise
    webhook_endpoint = provider.WEBHOOK_ENDPOINT

    webhook_url = (
        f"{backend_endpoint}/api/v1/telephony/{webhook_endpoint}"
        f"?workflow_id={target.workflow.id}"
        f"&workflow_run_id={workflow_run.id}"
        f"&organization_id={target.organization_id}"
    )

    # 10. Initiate call via telephony provider. workflow_id and organization_id
    # are required by providers that build the media WebSocket URL at dial time
    # (e.g. Telnyx, Cloudonix); without them the URL contains "None/None" and
    # the stream connection fails.
    try:
        result = await provider.initiate_call(
            to_number=request.phone_number,
            webhook_url=webhook_url,
            workflow_run_id=workflow_run.id,
            workflow_id=target.workflow.id,
            organization_id=target.organization_id,
        )
    except Exception as e:
        logger.warning(
            f"Failed to initiate call for workflow run {workflow_run.id}: {e}"
        )
        await mark_workflow_run_failed(workflow_run.id, f"Failed to initiate call: {e}")
        await call_concurrency.release_workflow_run_slot(workflow_run.id)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to initiate call: {e}",
        )

    gathered_context = {
        "provider": provider.PROVIDER_NAME,
        "triggered_by": "api",
        **(result.provider_metadata or {}),
    }
    if target.identifier_type == "trigger_path":
        gathered_context["trigger_uuid"] = target.identifier_value

    telephony_context = {"called_number": request.phone_number}
    if result.caller_number:
        telephony_context["caller_number"] = result.caller_number

    try:
        await db_client.update_workflow_run(
            run_id=workflow_run.id,
            gathered_context=gathered_context,
            initial_context=telephony_context,
        )
    except Exception as e:
        logger.warning(
            f"Call initiated for workflow run {workflow_run.id}, but failed to "
            f"persist call metadata and telephony context: {e}"
        )

    logger.info(
        f"Call initiated successfully for workflow run {workflow_run.id} "
        f"via {target.identifier_type}={target.identifier_value}"
    )

    return TriggerCallResponse(
        status="initiated",
        workflow_run_id=workflow_run.id,
        workflow_run_name=workflow_run_name,
    )


async def _initiate_call(
    identifier: str,
    request: TriggerCallRequest,
    x_api_key: str,
    *,
    use_draft: bool,
    target_resolver: Callable[..., Awaitable[ResolvedAgentTarget]],
) -> TriggerCallResponse:
    """Resolve the requested public target, then execute the common call flow."""
    api_key = await _validate_api_key(x_api_key)
    target = await target_resolver(
        identifier,
        api_key.organization_id,
        use_draft=use_draft,
    )
    return await _execute_resolved_target(
        target,
        request,
        use_draft=use_draft,
        api_key_id=api_key.id,
        api_key_created_by=api_key.created_by,
    )


@router.post("/{uuid}", response_model=TriggerCallResponse)
async def initiate_call(
    uuid: str,
    request: TriggerCallRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Initiate a phone call against the published agent.

    Executes the workflow's currently released definition.
    """
    return await _initiate_call(
        uuid,
        request,
        x_api_key,
        use_draft=False,
        target_resolver=_resolve_trigger_target,
    )


@router.post("/test/{uuid}", response_model=TriggerCallResponse)
async def initiate_call_test(
    uuid: str,
    request: TriggerCallRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Initiate a phone call against the latest draft of the agent.

    Useful for verifying changes before publishing. Falls back to the
    published definition when no draft exists.
    """
    return await _initiate_call(
        uuid,
        request,
        x_api_key,
        use_draft=True,
        target_resolver=_resolve_trigger_target,
    )


@router.post("/workflow/{workflow_uuid}", response_model=TriggerCallResponse)
async def initiate_call_by_workflow_uuid(
    workflow_uuid: str,
    request: TriggerCallRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Initiate a phone call against the published workflow identified by UUID."""
    return await _initiate_call(
        workflow_uuid,
        request,
        x_api_key,
        use_draft=False,
        target_resolver=_resolve_workflow_uuid_target,
    )


@router.post("/test/workflow/{workflow_uuid}", response_model=TriggerCallResponse)
async def initiate_call_test_by_workflow_uuid(
    workflow_uuid: str,
    request: TriggerCallRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Initiate a phone call against the latest draft of the workflow by UUID."""
    return await _initiate_call(
        workflow_uuid,
        request,
        x_api_key,
        use_draft=True,
        target_resolver=_resolve_workflow_uuid_target,
    )


@router.get("/run/{run_id}", response_model=RunExtractionResponse)
async def get_run_extraction(
    run_id: int,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Poll a workflow run for completion and extracted variables.

    Intended for the demo landing page to fetch AI-extracted call data
    after a phone call ends. Scoped to the API key's organisation.
    """
    api_key = await _validate_api_key(x_api_key)
    run = await db_client.get_workflow_run(
        run_id, organization_id=api_key.organization_id
    )
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
        
    extracted = run.extracted_data
    if not extracted and run.gathered_context and isinstance(run.gathered_context, dict):
        extracted = run.gathered_context.get("extracted_variables", {})

    return RunExtractionResponse(
        run_id=run.id,
        is_completed=run.is_completed,
        extracted_data=extracted,
    )


# ---------------------------------------------------------------------------
# DEMO-ONLY: Live transcript stream from in-process InMemoryLogsBuffer
# ---------------------------------------------------------------------------

from api.services.pipecat.live_buffer_registry import get_live_buffer  # noqa: E402


class LiveTranscriptResponse(BaseModel):
    """Real-time transcript events read directly from the in-memory buffer."""

    run_id: int
    is_live: bool  # True while the pipeline is still running
    turns: list[dict]  # {role: "agent"|"user", text: str, timestamp: str}


@router.get("/run/{run_id}/live-transcript", response_model=LiveTranscriptResponse)
async def get_live_transcript(
    run_id: int,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """[DEMO ONLY] Return live transcript turns from the in-process buffer.

    Reads directly from InMemoryLogsBuffer while the pipeline is running so
    the demo frontend can show turns in real-time without waiting for the call
    to complete. Pure read — no side effects, no call impact.
    """
    api_key = await _validate_api_key(x_api_key)

    buffer = get_live_buffer(run_id)
    if buffer is None:
        # Call is not live (not yet started or already finished).
        # Fall back to persisted DB events so the demo can still replay.
        run = await db_client.get_workflow_run(
            run_id, organization_id=api_key.organization_id
        )
        if not run:
            raise HTTPException(status_code=404, detail="Workflow run not found")

        events: list[dict] = run.logs.get("realtime_feedback_events", []) if run.logs else []
        turns = _events_to_turns(events)
        return LiveTranscriptResponse(run_id=run_id, is_live=False, turns=turns)

    # Call is live — read directly from in-memory buffer (no DB hit)
    events = buffer.get_events()
    turns = _events_to_turns(events)
    return LiveTranscriptResponse(run_id=run_id, is_live=True, turns=turns)


def _events_to_turns(events: list[dict]) -> list[dict]:
    """Convert raw realtime_feedback_events to simple {role, text, timestamp} dicts."""
    turns = []
    for ev in events:
        ev_type = ev.get("type", "")
        payload = ev.get("payload", {})
        ts = ev.get("timestamp") or payload.get("timestamp", "")

        if ev_type == "rtf-user-transcription" and payload.get("final") and payload.get("text"):
            turns.append({
                "role": "user",
                "text": payload["text"],
                "timestamp": ts,
            })
        elif ev_type == "rtf-bot-text" and payload.get("text"):
            turns.append({
                "role": "agent",
                "text": payload["text"],
                "timestamp": ts,
            })
    return turns


# ---------------------------------------------------------------------------
# DEMO-ONLY: True SSE streaming — pushes events the instant they hit the buffer
# Uses query-param auth because browser EventSource doesn't support headers.
# ---------------------------------------------------------------------------

import asyncio
import json

from fastapi.responses import StreamingResponse


@router.get("/run/{run_id}/stream")
async def stream_live_transcript(
    run_id: int,
    api_key: str,  # query param — EventSource can't send headers
):
    """[DEMO ONLY] Server-Sent Events stream of live transcript turns.

    Pushes each turn the instant it appears in InMemoryLogsBuffer (100 ms
    check cadence). Also emits partial user transcriptions so words appear
    as they're being spoken. Pure read — zero call impact.
    """
    # Validate the API key (same helper, just sourced from query)
    key_obj = await db_client.validate_api_key(api_key)
    if not key_obj:
        async def _deny():
            yield "data: " + json.dumps({"type": "error", "message": "Invalid API key"}) + "\n\n"
        return StreamingResponse(_deny(), media_type="text/event-stream")

    async def event_generator():
        sent_event_idx = 0  # index into the raw events list we've already streamed
        partial_text_sent = ""  # last partial text we emitted so we don't spam repeats
        POLL_MS = 0.1  # 100 ms
        seen_buffer = False  # have we EVER seen the buffer? distinguishes "not started" vs "finished"
        startup_elapsed = 0.0
        STARTUP_TIMEOUT = 30.0  # wait up to 30s for pipeline to start before giving up

        yield "data: " + json.dumps({"type": "connected", "run_id": run_id}) + "\n\n"

        while True:
            buf = get_live_buffer(run_id)

            if buf is None:
                if seen_buffer:
                    # We had the buffer before → pipeline has now finished
                    yield "data: " + json.dumps({"type": "ended"}) + "\n\n"
                    break
                else:
                    # Pipeline hasn't started yet (telephony handshake in progress)
                    # Keep waiting — don't emit "ended"
                    startup_elapsed += POLL_MS
                    if startup_elapsed > STARTUP_TIMEOUT:
                        yield "data: " + json.dumps({"type": "timeout"}) + "\n\n"
                        break
                    await asyncio.sleep(POLL_MS)
                    continue

            # Buffer exists — pipeline is live
            seen_buffer = True
            events = buf.get_events()

            # Emit any new events since our last send
            for ev in events[sent_event_idx:]:
                sent_event_idx += 1
                ev_type = ev.get("type", "")
                payload = ev.get("payload", {})
                ts = ev.get("timestamp") or payload.get("timestamp", "")
                text = payload.get("text", "")

                if not text:
                    continue

                if ev_type == "rtf-user-transcription":
                    if payload.get("final"):
                        # Final turn — clear partial
                        partial_text_sent = ""
                        yield "data: " + json.dumps({
                            "type": "turn",
                            "role": "user",
                            "text": text,
                            "final": True,
                            "timestamp": ts,
                        }) + "\n\n"
                    elif text != partial_text_sent:
                        # Interim/partial — stream word-by-word feel
                        partial_text_sent = text
                        yield "data: " + json.dumps({
                            "type": "turn",
                            "role": "user",
                            "text": text,
                            "final": False,
                            "timestamp": ts,
                        }) + "\n\n"

                elif ev_type == "rtf-bot-text":
                    yield "data: " + json.dumps({
                        "type": "turn",
                        "role": "agent",
                        "text": text,
                        "final": True,
                        "timestamp": ts,
                    }) + "\n\n"

            await asyncio.sleep(POLL_MS)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )
