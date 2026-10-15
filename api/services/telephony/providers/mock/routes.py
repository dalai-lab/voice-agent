"""Mock telephony routes for simulated webhooks and manual status callback testing."""

import json
from typing import Any

from fastapi import APIRouter, Request
from loguru import logger
from pipecat.utils.run_context import set_current_run_id

from api.db import db_client
from api.enums import TelephonyCallStatus
from api.services.telephony.status_processor import (
    StatusCallbackRequest,
    _process_status_update,
)

router = APIRouter()


@router.post("/mock/status-callback")
@router.post("/mock/status-callback/{workflow_run_id}")
async def handle_mock_status_callback(
    request: Request,
    workflow_run_id: int | None = None,
):
    """Handle simulated status callbacks for manual or external test integration."""
    try:
        data: dict[str, Any] = await request.json()
    except Exception:
        form = await request.form()
        data = dict(form)

    # Resolve run id from query or payload if not in path
    run_id = (
        workflow_run_id
        or request.query_params.get("workflow_run_id")
        or data.get("workflow_run_id")
    )
    if run_id is not None:
        run_id = int(run_id)
        set_current_run_id(run_id)

    if not run_id:
        logger.warning("[MOCK TELEPHONY] Status callback missing workflow_run_id")
        return {"status": "error", "message": "workflow_run_id is required"}

    raw_status = data.get("status", "completed")
    call_id = data.get("call_id", f"mock_{run_id}")
    duration = str(data.get("duration", 0))

    status_req = StatusCallbackRequest(
        call_id=call_id,
        status=TelephonyCallStatus.from_raw(raw_status),
        duration=duration,
        from_number=data.get("from_number"),
        to_number=data.get("to_number"),
        extra={"mock_telephony": True, "raw": data},
    )

    logger.info(
        f"[run {run_id}] Processing mock HTTP status callback: status={raw_status}, duration={duration}"
    )
    await _process_status_update(run_id, status_req)
    return {"status": "success", "workflow_run_id": run_id, "processed_status": raw_status}
