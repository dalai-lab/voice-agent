"""Background watchdog tasks for telephony call lifecycle management."""

from datetime import UTC, datetime
from loguru import logger

from api.db import db_client
from api.enums import TelephonyCallStatus, WorkflowRunState

STUCK_INITIALIZED_THRESHOLD_SECONDS = 180  # 3 minutes (safe post-ringing threshold)
STUCK_RUNNING_THRESHOLD_SECONDS = 3600  # 60 minutes (orphaned worker crash threshold)


async def sweep_stuck_telephony_runs(ctx: dict = None) -> int:
    """Periodic ARQ cron task to recover telephony runs stuck in 'initialized' or 'running'.

    Prevents orphaned runs when callers hang up before media connection or
    when carrier callbacks fail to deliver.
    """
    from api.services.telephony.status_processor import (
        StatusCallbackRequest,
        _process_status_update,
    )

    logger.debug("Running periodic sweep of stuck telephony runs...")

    # 1. Sweep stuck 'initialized' runs (> 3 minutes without media connect)
    stuck_initialized = await db_client.get_stuck_workflow_runs_by_state(
        state=WorkflowRunState.INITIALIZED.value,
        threshold_seconds=STUCK_INITIALIZED_THRESHOLD_SECONDS,
        limit=50,
    )

    recovered_count = 0
    for run in stuck_initialized:
        try:
            logger.warning(
                f"[run {run.id}] Found stuck initialized run created at {run.created_at}. "
                "Finalizing via status_processor as dropped before connect."
            )
            status_update = StatusCallbackRequest(
                call_id=(run.gathered_context or {}).get("call_id") or f"stuck_{run.id}",
                status=TelephonyCallStatus.CANCELED,
                duration="0",
                extra={
                    "reaper": True,
                    "recovered_at": datetime.now(UTC).isoformat(),
                    "reason": "initialized_media_timeout",
                    "description": "Call dropped or terminated before media stream connected",
                },
            )
            await _process_status_update(run.id, status_update)
            recovered_count += 1
        except Exception as e:
            logger.error(f"[run {run.id}] Failed to recover stuck initialized run: {e}")

    # 2. Safety Net: Sweep stuck 'running' runs (> 60 minutes past max call duration)
    stuck_running = await db_client.get_stuck_workflow_runs_by_state(
        state=WorkflowRunState.RUNNING.value,
        threshold_seconds=STUCK_RUNNING_THRESHOLD_SECONDS,
        limit=20,
    )
    for run in stuck_running:
        try:
            logger.warning(
                f"[run {run.id}] Found stuck running run active > {STUCK_RUNNING_THRESHOLD_SECONDS}s. "
                "Finalizing orphaned worker run."
            )
            status_update = StatusCallbackRequest(
                call_id=(run.gathered_context or {}).get("call_id") or f"stuck_{run.id}",
                status=TelephonyCallStatus.COMPLETED,
                duration=str(STUCK_RUNNING_THRESHOLD_SECONDS),
                extra={
                    "reaper": True,
                    "recovered_at": datetime.now(UTC).isoformat(),
                    "reason": "running_worker_timeout",
                    "description": "Call exceeded maximum runtime limit without disconnect callback",
                },
            )
            await _process_status_update(run.id, status_update)
            recovered_count += 1
        except Exception as e:
            logger.error(f"[run {run.id}] Failed to recover stuck running run: {e}")

    if recovered_count > 0:
        logger.info(f"Telephony reaper recovered {recovered_count} stuck runs")

    return recovered_count
