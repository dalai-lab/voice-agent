from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from api.enums import TelephonyCallStatus, WorkflowRunState
from api.tasks.telephony_tasks import (
    STUCK_INITIALIZED_THRESHOLD_SECONDS,
    STUCK_RUNNING_THRESHOLD_SECONDS,
    sweep_stuck_telephony_runs,
)


@pytest.mark.asyncio
async def test_sweep_stuck_telephony_runs_initialized():
    stuck_run = SimpleNamespace(
        id=8052,
        created_at=datetime.now(UTC),
        state=WorkflowRunState.INITIALIZED.value,
        gathered_context={"call_id": "plivo-uuid-8052"},
    )

    with (
        patch("api.tasks.telephony_tasks.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor._process_status_update",
            new_callable=AsyncMock,
        ) as mock_process,
    ):
        mock_db.get_stuck_workflow_runs_by_state = AsyncMock(
            side_effect=lambda state, threshold_seconds, limit: (
                [stuck_run] if state == WorkflowRunState.INITIALIZED.value else []
            )
        )

        recovered = await sweep_stuck_telephony_runs()

    assert recovered == 1
    mock_db.get_stuck_workflow_runs_by_state.assert_any_call(
        state=WorkflowRunState.INITIALIZED.value,
        threshold_seconds=STUCK_INITIALIZED_THRESHOLD_SECONDS,
        limit=50,
    )
    mock_process.assert_awaited_once()
    run_id, status_req = mock_process.await_args[0]
    assert run_id == 8052
    assert status_req.call_id == "plivo-uuid-8052"
    assert status_req.status == TelephonyCallStatus.CANCELED
    assert status_req.duration == "0"
    assert status_req.extra["reaper"] is True


@pytest.mark.asyncio
async def test_sweep_stuck_telephony_runs_running():
    stuck_run = SimpleNamespace(
        id=9001,
        created_at=datetime.now(UTC),
        state=WorkflowRunState.RUNNING.value,
        gathered_context={},
    )

    with (
        patch("api.tasks.telephony_tasks.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor._process_status_update",
            new_callable=AsyncMock,
        ) as mock_process,
    ):
        mock_db.get_stuck_workflow_runs_by_state = AsyncMock(
            side_effect=lambda state, threshold_seconds, limit: (
                [stuck_run] if state == WorkflowRunState.RUNNING.value else []
            )
        )

        recovered = await sweep_stuck_telephony_runs()

    assert recovered == 1
    mock_db.get_stuck_workflow_runs_by_state.assert_any_call(
        state=WorkflowRunState.RUNNING.value,
        threshold_seconds=STUCK_RUNNING_THRESHOLD_SECONDS,
        limit=20,
    )
    mock_process.assert_awaited_once()
    run_id, status_req = mock_process.await_args[0]
    assert run_id == 9001
    assert status_req.call_id == "stuck_9001"
    assert status_req.status == TelephonyCallStatus.COMPLETED
    assert status_req.duration == str(STUCK_RUNNING_THRESHOLD_SECONDS)
    assert status_req.extra["reaper"] is True


@pytest.mark.asyncio
async def test_sweep_stuck_telephony_runs_empty():
    with (
        patch("api.tasks.telephony_tasks.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor._process_status_update",
            new_callable=AsyncMock,
        ) as mock_process,
    ):
        mock_db.get_stuck_workflow_runs_by_state = AsyncMock(return_value=[])
        recovered = await sweep_stuck_telephony_runs()

    assert recovered == 0
    mock_process.assert_not_awaited()


@pytest.mark.asyncio
async def test_sweep_stuck_telephony_runs_handles_individual_errors():
    run_err = SimpleNamespace(id=1, created_at=datetime.now(UTC), gathered_context={})
    run_ok = SimpleNamespace(id=2, created_at=datetime.now(UTC), gathered_context={})

    with (
        patch("api.tasks.telephony_tasks.db_client") as mock_db,
        patch(
            "api.services.telephony.status_processor._process_status_update",
            new_callable=AsyncMock,
        ) as mock_process,
    ):
        mock_db.get_stuck_workflow_runs_by_state = AsyncMock(
            side_effect=lambda state, threshold_seconds, limit: (
                [run_err, run_ok]
                if state == WorkflowRunState.INITIALIZED.value
                else []
            )
        )
        mock_process.side_effect = [RuntimeError("DB lock"), None]

        recovered = await sweep_stuck_telephony_runs()

    assert recovered == 1
    assert mock_process.await_count == 2


@pytest.mark.asyncio
async def test_update_workflow_run_atomic_completion_success():
    from unittest.mock import MagicMock
    from api.db.workflow_run_client import WorkflowRunClient

    client = WorkflowRunClient.__new__(WorkflowRunClient)
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.rowcount = 1
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.commit = AsyncMock()

    class SessionContext:
        async def __aenter__(self):
            return mock_session

        async def __aexit__(self, exc_type, exc, tb):
            pass

    client.async_session = MagicMock(return_value=SessionContext())

    updated = await client.update_workflow_run_atomic_completion(
        run_id=8052,
        state="completed",
        gathered_context={"call_tags": ["canceled"]},
        usage_info={"call_duration_seconds": 0},
    )

    assert updated is True
    mock_session.execute.assert_awaited_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_workflow_run_atomic_completion_already_completed():
    from unittest.mock import MagicMock
    from api.db.workflow_run_client import WorkflowRunClient

    client = WorkflowRunClient.__new__(WorkflowRunClient)
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.rowcount = 0  # 0 rows affected because is_completed was already True
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.commit = AsyncMock()

    class SessionContext:
        async def __aenter__(self):
            return mock_session

        async def __aexit__(self, exc_type, exc, tb):
            pass

    client.async_session = MagicMock(return_value=SessionContext())

    updated = await client.update_workflow_run_atomic_completion(
        run_id=8052,
        state="completed",
    )

    assert updated is False
    mock_session.commit.assert_awaited_once()

