from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.mcp_server.tools.call_logs import list_call_logs, get_call_details


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_list_call_logs_success(authed_user: MagicMock):
    start = datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc)
    mock_run = SimpleNamespace(
        id=101,
        workflow_id=5,
        call_type="inbound",
        initial_context={"caller_number": "+15551234567", "called_number": "+15559876543"},
        gathered_context={"call_disposition": "completed"},
        usage_info={"call_duration_seconds": 120},
        cost_info={},
        is_completed=True,
        created_at=start,
        recording_url="rec/101.mp3",
        transcript_url="transcripts/101.txt",
        extra={},
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = [(mock_run, "Customer Care")]
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_ctx = MagicMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
    mock_ctx.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("api.mcp_server.tools.call_logs.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.call_logs.db_client.async_session", return_value=mock_ctx),
    ):
        result = await list_call_logs(workflow_id=5, limit=20)

    assert len(result) == 1
    call = result[0]
    assert call["run_id"] == 101
    assert call["workflow_name"] == "Customer Care"
    assert call["duration_seconds"] == 120
    assert call["disposition"] == "completed"
    assert call["has_recording"] is True
    assert call["has_transcript"] is True


@pytest.mark.asyncio
async def test_get_call_details_not_found(authed_user: MagicMock):
    with (
        patch("api.mcp_server.tools.call_logs.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.call_logs.db_client.get_workflow_run", AsyncMock(return_value=None)),
    ):
        result = await get_call_details(run_id=999)

    assert result["success"] is False
    assert result["error_code"] == "not_found"


@pytest.mark.asyncio
async def test_get_call_details_success(authed_user: MagicMock):
    start = datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc)
    mock_run = SimpleNamespace(
        id=103,
        workflow_id=5,
        name="Care Run 103",
        workflow=SimpleNamespace(name="Customer Care"),
        call_type="inbound",
        initial_context={"caller_number": "+15551234567", "called_number": "+15559876543"},
        gathered_context={"call_disposition": "completed"},
        extracted_data={"order_id": "ORD-999"},
        usage_info={"call_duration_seconds": 90},
        cost_info={},
        is_completed=True,
        recording_url=None,
        transcript_url=None,
        storage_backend="local",
        extra={},
    )

    with (
        patch("api.mcp_server.tools.call_logs.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.call_logs.db_client.get_workflow_run", AsyncMock(return_value=mock_run)),
    ):
        result = await get_call_details(run_id=103)

    assert result["success"] is True
    assert result["run_id"] == 103
    assert result["workflow_name"] == "Customer Care"
    assert result["duration_seconds"] == 90
    assert result["caller_number"] == "+15551234567"
    assert result["extracted_variables"]["order_id"] == "ORD-999"
