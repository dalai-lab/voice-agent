from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
import pytest
from api.db.campaign_client import CampaignClient
from api.routes.campaign import _build_campaign_response
from api.db.models import CampaignModel


@pytest.mark.asyncio
async def test_get_queued_runs_stats_counts_active_workflow_runs():
    client = CampaignClient()
    mock_session = AsyncMock()
    client.async_session = MagicMock(return_value=mock_session)
    mock_session.__aenter__.return_value = mock_session

    # Mock 1: result of queued_runs query:
    # 1000 total leads: 975 queued, 20 processed, 5 processing
    # (campaign_id, state, is_sched, is_ret, count)
    mock_queued_result = MagicMock()
    mock_queued_result.all.return_value = [
        (1, "queued", 0, 0, 975),
        (1, "processed", 0, 0, 20),
        (1, "processing", 0, 0, 5),
    ]

    # Mock 2: result of workflow_runs query:
    # 15 active calls (is_completed=False), 4 completed, 1 failed, 0 unanswered
    # (campaign_id, act_calls, f_calls, u_calls, c_calls)
    mock_wf_result = MagicMock()
    mock_wf_result.all.return_value = [
        (1, 15, 1, 0, 4),
    ]

    mock_session.execute.side_effect = [mock_queued_result, mock_wf_result]

    stats = await client.get_queued_runs_stats_for_campaigns([1])

    assert 1 in stats
    # Active must strictly reflect the 15 active workflow runs in progress (not internal processing batch claims)
    assert stats[1]["active"] == 15
    assert stats[1]["total"] == 1000
    assert stats[1]["pending"] == 975
    assert stats[1]["executed"] == 20
    assert stats[1]["completed_calls"] == 4
    assert stats[1]["failed_calls"] == 1
    assert stats[1]["unanswered_calls"] == 0


@pytest.mark.asyncio
async def test_get_queued_runs_stats_includes_preflight_failures():
    client = CampaignClient()
    mock_session = AsyncMock()
    client.async_session = MagicMock(return_value=mock_session)
    mock_session.__aenter__.return_value = mock_session

    # 1 queued run permanently failed pre-flight (no workflow run created)
    mock_queued_result = MagicMock()
    mock_queued_result.all.return_value = [
        (2, "failed", 0, 0, 1),
        (2, "queued", 0, 0, 99),
    ]

    # Workflow run query has 0 failed calls because no workflow run was created for the preflight failure
    mock_wf_result = MagicMock()
    mock_wf_result.all.return_value = [
        (2, 0, 0, 0, 0),
    ]

    mock_session.execute.side_effect = [mock_queued_result, mock_wf_result]

    stats = await client.get_queued_runs_stats_for_campaigns([2])

    assert stats[2]["failed_calls"] == 1
    assert stats[2]["total"] == 100
    assert stats[2]["executed"] == 1


def test_build_campaign_response_stats_alignment():
    campaign = MagicMock(spec=CampaignModel)
    campaign.id = 10
    campaign.name = "Test Live Campaign"
    campaign.workflow_id = 1
    campaign.state = "running"
    campaign.source_type = "csv"
    campaign.source_id = "src-1"
    campaign.total_rows = 1000
    campaign.processed_rows = 25
    campaign.failed_rows = 1
    campaign.created_at = datetime.now(UTC)
    campaign.started_at = None
    campaign.completed_at = None
    campaign.retry_config = None
    campaign.orchestrator_metadata = {}

    stats = {
        "total": 1000,
        "executed": 25,
        "active": 20,
        "pending": 975,
        "scheduled_retries": 0,
        "retry_attempts": 0,
        "completed_calls": 4,
        "failed_calls": 1,
        "unanswered_calls": 0,
    }

    resp = _build_campaign_response(
        campaign,
        workflow_name="Workflow A",
        stats=stats,
    )

    assert resp.total_queued_count == 1000
    assert resp.executed_count == 25
    assert resp.active_count == 20
    assert resp.pending_count == 975
    assert resp.completed_calls_count == 4
    assert resp.failed_calls_count == 1
