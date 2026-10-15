"""Mock telephony Arq tasks for simulated call completions and callbacks."""

import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from loguru import logger

from api.db import db_client
from api.enums import TelephonyCallStatus


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

    Processes call completion and triggers _process_status_update to exercise
    real production slot-release, circuit-breaker, and orchestrator loops.
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

    # Map outcome to real TelephonyCallStatus
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
