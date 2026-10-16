from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from api.enums import TelephonyCallStatus, WorkflowRunState
from api.services.telephony.status_processor import (
    StatusCallbackRequest,
    _process_status_update,
)
from api.tasks.function_names import FunctionNames


@pytest.mark.asyncio
async def test_initialized_no_answer_enqueues_workflow_completion():
    workflow_run = SimpleNamespace(
        id=123,
        campaign_id=None,
        queued_run_id=None,
        state=WorkflowRunState.INITIALIZED.value,
        is_completed=False,
        logs={"telephony_status_callbacks": []},
        gathered_context={"call_tags": ["existing"]},
    )
    status = StatusCallbackRequest(
        call_id="call-123",
        status="No-Answer",
    )

    with (
        patch("api.services.telephony.status_processor.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor.campaign_call_dispatcher"
        ) as mock_dispatcher,
        patch(
            "api.services.telephony.status_processor.enqueue_job",
            new_callable=AsyncMock,
        ) as mock_enqueue,
    ):
        mock_db.get_workflow_run_by_id = AsyncMock(return_value=workflow_run)
        mock_db.update_workflow_run = AsyncMock()
        mock_dispatcher.release_call_slot = AsyncMock(return_value=True)

        await _process_status_update(123, status)

    log_update = mock_db.update_workflow_run.await_args_list[0].kwargs
    callback_log = log_update["logs"]["telephony_status_callbacks"][0]
    assert callback_log["status"] == "no-answer"
    assert callback_log["call_id"] == "call-123"

    completion_update = mock_db.update_workflow_run.await_args_list[1].kwargs
    assert completion_update["run_id"] == 123
    assert completion_update["is_completed"] is True
    assert completion_update["state"] == WorkflowRunState.COMPLETED.value
    assert completion_update["usage_info"] == {"call_duration_seconds": 0}
    assert completion_update["gathered_context"] == {
        "call_tags": ["existing", "not_connected", "telephony_no-answer"],
        "call_disposition": "no-answer",
        "mapped_call_disposition": "no-answer",
        "call_id": "call-123",
    }
    mock_enqueue.assert_awaited_once_with(
        FunctionNames.PROCESS_WORKFLOW_COMPLETION, 123
    )
    mock_dispatcher.release_call_slot.assert_awaited_once_with(123)


@pytest.mark.asyncio
async def test_running_terminal_status_does_not_enqueue_workflow_completion():
    workflow_run = SimpleNamespace(
        id=456,
        campaign_id=None,
        queued_run_id=None,
        state=WorkflowRunState.RUNNING.value,
        is_completed=False,
        logs={"telephony_status_callbacks": []},
        gathered_context={"call_tags": ["not_connected"]},
    )
    status = StatusCallbackRequest(
        call_id="call-456",
        status=TelephonyCallStatus.FAILED,
        duration="7",
    )

    with (
        patch("api.services.telephony.status_processor.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor.campaign_call_dispatcher"
        ) as mock_dispatcher,
        patch(
            "api.services.telephony.status_processor.enqueue_job",
            new_callable=AsyncMock,
        ) as mock_enqueue,
    ):
        mock_db.get_workflow_run_by_id = AsyncMock(return_value=workflow_run)
        mock_db.update_workflow_run = AsyncMock()
        mock_dispatcher.release_call_slot = AsyncMock(return_value=True)

        await _process_status_update(456, status)

    completion_update = mock_db.update_workflow_run.await_args_list[1].kwargs
    assert "usage_info" not in completion_update
    assert completion_update["gathered_context"]["call_tags"] == [
        "not_connected",
        "telephony_failed",
    ]
    mock_enqueue.assert_not_awaited()
    mock_dispatcher.release_call_slot.assert_awaited_once_with(456)


@pytest.mark.asyncio
async def test_completed_call_with_voicemail_publishes_retry_needed():
    """When a completed call has voicemail_detected in call_tags, it publishes retry_needed."""
    workflow_run = SimpleNamespace(
        id=789,
        campaign_id=42,
        queued_run_id=101,
        state=WorkflowRunState.RUNNING.value,
        is_completed=False,
        logs={"telephony_status_callbacks": []},
        gathered_context={"call_tags": ["voicemail_detected"], "answered_by": "machine_start"},
    )
    status = StatusCallbackRequest(
        call_id="call-789",
        status=TelephonyCallStatus.COMPLETED,
        duration="15",
    )

    with (
        patch("api.services.telephony.status_processor.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor.campaign_call_dispatcher"
        ) as mock_dispatcher,
        patch(
            "api.services.telephony.status_processor.get_campaign_event_publisher"
        ) as mock_get_pub,
        patch(
            "api.services.telephony.status_processor.circuit_breaker"
        ) as mock_cb,
        patch(
            "api.services.telephony.status_processor.call_concurrency"
        ) as mock_cc,
    ):
        mock_db.get_workflow_run_by_id = AsyncMock(return_value=workflow_run)
        mock_db.update_workflow_run = AsyncMock()
        mock_dispatcher.release_call_slot = AsyncMock(return_value=True)
        mock_cc.unregister_active_call = AsyncMock()
        mock_cb.record_and_evaluate = AsyncMock()
        mock_pub = AsyncMock()
        mock_get_pub.return_value = mock_pub

        await _process_status_update(789, status)

        mock_pub.publish_retry_needed.assert_awaited_once_with(
            workflow_run_id=789,
            reason="voicemail",
            campaign_id=42,
            queued_run_id=101,
        )


@pytest.mark.asyncio
async def test_completed_human_call_does_not_publish_retry_needed():
    """When a completed call was answered by a human, retry_needed is NOT published."""
    workflow_run = SimpleNamespace(
        id=790,
        campaign_id=42,
        queued_run_id=102,
        state=WorkflowRunState.RUNNING.value,
        is_completed=False,
        logs={"telephony_status_callbacks": []},
        gathered_context={"call_tags": ["human_answered"], "answered_by": "human"},
    )
    status = StatusCallbackRequest(
        call_id="call-790",
        status=TelephonyCallStatus.COMPLETED,
        duration="45",
    )

    with (
        patch("api.services.telephony.status_processor.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor.campaign_call_dispatcher"
        ) as mock_dispatcher,
        patch(
            "api.services.telephony.status_processor.get_campaign_event_publisher"
        ) as mock_get_pub,
        patch(
            "api.services.telephony.status_processor.circuit_breaker"
        ) as mock_cb,
        patch(
            "api.services.telephony.status_processor.call_concurrency"
        ) as mock_cc,
    ):
        mock_db.get_workflow_run_by_id = AsyncMock(return_value=workflow_run)
        mock_db.update_workflow_run = AsyncMock()
        mock_dispatcher.release_call_slot = AsyncMock(return_value=True)
        mock_cc.unregister_active_call = AsyncMock()
        mock_cb.record_and_evaluate = AsyncMock()
        mock_pub = AsyncMock()
        mock_get_pub.return_value = mock_pub

        await _process_status_update(790, status)

        mock_pub.publish_retry_needed.assert_not_called()

