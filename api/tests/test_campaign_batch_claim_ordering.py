import pytest
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from api.db.campaign_client import CampaignClient
from api.db.models import QueuedRunModel


@pytest.mark.asyncio
async def test_claim_queued_runs_orders_by_id_asc_not_random():
    client = CampaignClient()
    session_mock = AsyncMock()

    # Empty scheduled runs result
    scheduled_exec_mock = MagicMock()
    scheduled_exec_mock.scalars.return_value.all.return_value = []

    # Mock queued run for regular query
    mock_run = MagicMock(spec=QueuedRunModel)
    mock_run.id = 42
    mock_run.state = "queued"
    mock_run.scheduled_for = None
    regular_exec_mock = MagicMock()
    regular_exec_mock.scalars.return_value.all.return_value = [mock_run]

    session_mock.execute = AsyncMock(side_effect=[scheduled_exec_mock, regular_exec_mock])
    session_mock.commit = AsyncMock()
    session_mock.refresh = AsyncMock()
    session_mock.__aenter__.return_value = session_mock
    session_mock.__aexit__.return_value = None
    client.async_session = MagicMock(return_value=session_mock)

    now = datetime.now(UTC)
    claimed = await client.claim_queued_runs_for_processing(
        campaign_id=1,
        scheduled_before=now,
        limit=5,
    )

    assert len(claimed) == 1
    assert claimed[0] == mock_run

    # Verify regular query arguments
    assert session_mock.execute.call_count == 2
    regular_query = session_mock.execute.call_args_list[1][0][0]

    # Inspect compiled / stringified query
    query_str = str(regular_query)
    # Ensure random() is NOT used
    assert "random()" not in query_str.lower()
    # Ensure ordered by queued_runs.id ASC
    assert "queued_runs.id ASC" in query_str or "order by queued_runs.id" in query_str.lower()
