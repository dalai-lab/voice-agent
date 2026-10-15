"""Mock telephony Arq tasks for simulated call completions and callbacks."""

import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from loguru import logger

from api.db import db_client
from api.db.models import QueuedRunModel, ScheduledCallbackModel
from api.enums import TelephonyCallStatus
from api.services.workflow.tools.callback_settings import (
    adjust_for_sociable_hours,
    get_timezone_for_number,
    resolve_callback_settings,
)

MAX_CALLBACK_CHAIN_DEPTH = 3


async def simulate_mock_call_completion(
    ctx: dict[str, Any] | None,
    workflow_run_id: int,
    call_id: str,
    duration: int,
    outcome: str,
    to_number: str,
    from_number: str,
    callback_params: dict[str, Any] | None = None,
) -> None:
    """Triggered by Arq when the simulated mock call duration completes.

    Processes call completion, generates callback QueuedRuns when outcome is 'callback',
    and triggers _process_status_update to exercise real production slot-release,
    circuit-breaker, and orchestrator loops.
    """
    logger.info(
        f"[MOCK TELEPHONY] Timer completed for run {workflow_run_id} ({call_id}) | "
        f"duration={duration}s, target_outcome={outcome}"
    )

    run = await db_client.get_workflow_run_by_id(workflow_run_id)
    if not run:
        logger.warning(
            f"[MOCK TELEPHONY] Run {workflow_run_id} not found on timer completion"
        )
        return

    orig_context = run.initial_context or {}
    chain_depth = orig_context.get("callback_chain_depth", 0)

    # 1. Specialized Callback Simulation Flow
    if outcome == "callback":
        if chain_depth >= MAX_CALLBACK_CHAIN_DEPTH:
            logger.info(
                f"[MOCK TELEPHONY] Callback chain depth {chain_depth} reached max {MAX_CALLBACK_CHAIN_DEPTH}; "
                f"forcing completion to avoid infinite recursion."
            )
            outcome = "completed"
        else:
            cb_params = callback_params or {}
            delay_minutes = int(cb_params.get("delay_minutes", 15))
            summary = cb_params.get(
                "summary", "Simulated contact requested appointment callback"
            )
            fast_forward = cb_params.get("fast_forward", False)

            if run.campaign_id:
                settings = await resolve_callback_settings(
                    organization_id=run.organization_id,
                    workflow_id=run.workflow_id,
                    campaign_id=run.campaign_id,
                )

                requested_time = datetime.now(UTC) + timedelta(minutes=delay_minutes)
                if fast_forward:
                    adjusted_time = requested_time
                else:
                    start_str = settings.get("sociable_hours_start", "08:00")
                    end_str = settings.get("sociable_hours_end", "21:00")
                    default_tz = settings.get("sociable_timezone", "UTC")
                    tz_str = get_timezone_for_number(to_number, default_tz)
                    adjusted_time = adjust_for_sociable_hours(
                        requested_time, start_str, end_str, tz_str
                    )

                orig_queued = (
                    await db_client.get_queued_run_by_id(run.queued_run_id)
                    if run.queued_run_id
                    else None
                )
                orig_source_uuid = (
                    orig_queued.source_uuid if orig_queued else str(uuid.uuid4())
                )

                new_queued_run = QueuedRunModel(
                    campaign_id=run.campaign_id,
                    source_uuid=f"{orig_source_uuid}_mock_callback_{int(time.time())}",
                    context_variables={
                        **orig_context,
                        "is_callback": True,
                        "callback_reason": "user_requested",
                        "original_run_id": workflow_run_id,
                        "conversation_summary": summary,
                        "callback_chain_depth": chain_depth + 1,
                        "caller_number": from_number,  # STICKY CALLER ID
                        "called_number": to_number,
                        "phone_number": to_number,
                        "callback_originally_requested_minutes": delay_minutes,
                    },
                    state="queued",
                    retry_reason="user_requested_callback",
                    retry_count=0,
                    scheduled_for=adjusted_time,
                )

                async with db_client.async_session() as session:
                    session.add(new_queued_run)
                    await session.commit()

                logger.info(
                    f"[MOCK TELEPHONY] Scheduled mock callback QueuedRun for campaign {run.campaign_id} "
                    f"at {adjusted_time.isoformat()} to {to_number} (caller_id: {from_number}, depth={chain_depth + 1})"
                )
            else:
                # Standalone callback support
                scheduled_cb = ScheduledCallbackModel(
                    organization_id=run.organization_id,
                    workflow_id=run.workflow_id,
                    original_run_id=workflow_run_id,
                    status="pending",
                    scheduled_for=datetime.now(UTC) + timedelta(minutes=delay_minutes),
                    to_number=to_number,
                    from_number=from_number,
                    conversation_summary=summary,
                    callback_chain_depth=chain_depth + 1,
                )
                async with db_client.async_session() as session:
                    session.add(scheduled_cb)
                    await session.commit()

            # The initial call concludes successfully
            outcome = "completed"

    # 2. Map outcome to real TelephonyCallStatus
    status_map = {
        "completed": TelephonyCallStatus.COMPLETED,
        "busy": TelephonyCallStatus.BUSY,
        "no_answer": TelephonyCallStatus.NO_ANSWER,
        "carrier_error": TelephonyCallStatus.FAILED,  # Exercises circuit breaker!
    }
    mapped_status = status_map.get(outcome, TelephonyCallStatus.COMPLETED)

    # 3. Call standard, unmodified Status Processor
    from api.services.telephony.status_processor import (
        StatusCallbackRequest,
        _process_status_update,
    )

    status_req = StatusCallbackRequest(
        call_id=call_id,
        status=mapped_status,
        duration=str(duration) if mapped_status == TelephonyCallStatus.COMPLETED else "0",
        from_number=from_number,
        to_number=to_number,
        extra={"mock_telephony": True, "raw_outcome": outcome},
    )

    # This executes real release_call_slot, frees from_number,
    # evaluates circuit breaker, and notifies the orchestrator!
    await _process_status_update(workflow_run_id, status_req)
