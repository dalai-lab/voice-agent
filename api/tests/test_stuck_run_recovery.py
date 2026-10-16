from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from sqlalchemy.sql.elements import BinaryExpression, BooleanClauseList

from api.db.campaign_client import CampaignClient
from api.db.models import QueuedRunModel


@pytest.mark.asyncio
async def test_cleanup_stuck_processing_queued_runs_filter_does_not_require_old_created_at():
    """Verify that stuck run recovery filters strictly by processing state and processed_at,

    and does NOT filter out recently created retries by created_at.
    """
    client = CampaignClient()
    mock_session = AsyncMock()
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_session
    mock_session_ctx.__aexit__.return_value = None
    client.async_session = MagicMock(return_value=mock_session_ctx)

    # Mock execute results
    res_processed = MagicMock(rowcount=2)
    res_reset = MagicMock(rowcount=3)
    mock_session.execute = AsyncMock(side_effect=[res_processed, res_reset])

    total = await client.cleanup_stuck_processing_queued_runs(threshold_seconds=300, campaign_id=42)

    assert total == 5
    assert mock_session.execute.await_count == 2
    assert mock_session.commit.await_count == 1

    # Verify SQL expressions generated for the update statements do not filter on created_at
    first_stmt = mock_session.execute.await_args_list[0].args[0]
    second_stmt = mock_session.execute.await_args_list[1].args[0]

    first_sql = str(first_stmt)
    second_sql = str(second_stmt)

    assert "queued_runs.created_at" not in first_sql
    assert "queued_runs.created_at" not in second_sql
    assert "queued_runs.processed_at" in first_sql
    assert "queued_runs.processed_at" in second_sql
    assert "queued_runs.state =" in first_sql
    assert "queued_runs.campaign_id =" in first_sql

