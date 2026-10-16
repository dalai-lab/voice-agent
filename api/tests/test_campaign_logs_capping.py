from datetime import UTC, datetime
import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from api.db.campaign_client import CampaignClient
from api.db.models import CampaignModel
from api.routes.campaign import _build_campaign_response, get_campaigns


@pytest.mark.asyncio
async def test_append_campaign_log_caps_at_100_entries():
    """Verify append_campaign_log executes capped SQL query retaining up to 100 most recent items."""
    client = CampaignClient()
    mock_session = AsyncMock()
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_session
    mock_session_ctx.__aexit__.return_value = None
    client.async_session = MagicMock(return_value=mock_session_ctx)

    campaign_id = 42
    await client.append_campaign_log(
        campaign_id=campaign_id,
        level="warning",
        event="circuit_breaker_tripped",
        message="Failure rate exceeded threshold",
        details={"failure_rate": 0.45},
    )

    assert mock_session.execute.await_count == 1
    assert mock_session.commit.await_count == 1

    executed_stmt, executed_params = mock_session.execute.await_args_list[0].args
    sql_text = str(executed_stmt)

    # Validate SQL contains capping logic
    assert "LIMIT 100" in sql_text
    assert "jsonb_array_elements" in sql_text
    assert "jsonb_agg" in sql_text
    assert "ORDER BY elem->>'ts' DESC" in sql_text
    assert "elem ORDER BY elem->>'ts' ASC" in sql_text

    # Validate parameters
    assert executed_params["campaign_id"] == campaign_id
    assert "now" in executed_params
    entry_payload = json.loads(executed_params["entry"])
    assert isinstance(entry_payload, list)
    assert len(entry_payload) == 1
    assert entry_payload[0]["event"] == "circuit_breaker_tripped"
    assert entry_payload[0]["level"] == "warning"
    assert entry_payload[0]["message"] == "Failure rate exceeded threshold"
    assert entry_payload[0]["details"] == {"failure_rate": 0.45}
    assert "ts" in entry_payload[0]


def test_build_campaign_response_include_logs_toggle():
    """Verify _build_campaign_response omits logs when include_logs=False."""
    campaign = MagicMock(spec=CampaignModel)
    campaign.id = 1
    campaign.name = "Test Campaign"
    campaign.workflow_id = 10
    campaign.state = "running"
    campaign.source_type = "csv"
    campaign.source_id = "src-1"
    campaign.total_rows = 100
    campaign.processed_rows = 10
    campaign.failed_rows = 2
    campaign.created_at = datetime.now(UTC)
    campaign.started_at = datetime.now(UTC)
    campaign.completed_at = None
    campaign.retry_config = None
    campaign.orchestrator_metadata = {}
    campaign.telephony_configuration_id = None
    campaign.logs = [
        {
            "ts": "2026-10-16T10:00:00Z",
            "level": "info",
            "event": "campaign_started",
            "message": "Campaign started",
        },
        {
            "ts": "2026-10-16T10:05:00Z",
            "level": "error",
            "event": "lead_retries_exhausted",
            "message": "Lead 123 retries exhausted",
        },
    ]

    # With include_logs=False (used by list_campaigns)
    resp_no_logs = _build_campaign_response(
        campaign=campaign,
        workflow_name="Test Flow",
        include_logs=False,
    )
    assert resp_no_logs.logs == []

    # With include_logs=True (used by get_campaign)
    resp_with_logs = _build_campaign_response(
        campaign=campaign,
        workflow_name="Test Flow",
        include_logs=True,
    )
    assert len(resp_with_logs.logs) == 2
    assert resp_with_logs.logs[0].event == "campaign_started"
    assert resp_with_logs.logs[1].event == "lead_retries_exhausted"


@pytest.mark.asyncio
async def test_list_campaigns_excludes_logs():
    """Verify list_campaigns route passes include_logs=False to prevent multi-megabyte payloads."""
    mock_user = MagicMock()
    mock_user.selected_organization_id = 123

    campaign = MagicMock(spec=CampaignModel)
    campaign.id = 99
    campaign.name = "High Volume Campaign"
    campaign.workflow_id = 5
    campaign.state = "running"
    campaign.source_type = "csv"
    campaign.source_id = "src-99"
    campaign.total_rows = 50000
    campaign.processed_rows = 1000
    campaign.failed_rows = 50
    campaign.created_at = datetime.now(UTC)
    campaign.started_at = datetime.now(UTC)
    campaign.completed_at = None
    campaign.retry_config = None
    campaign.orchestrator_metadata = {}
    campaign.telephony_configuration_id = None
    campaign.logs = [
        {"ts": f"2026-10-16T10:{i:02d}:00Z", "level": "info", "event": "lead_processed", "message": f"Lead {i}"}
        for i in range(50)
    ]

    with patch("api.routes.campaign.db_client") as mock_db:
        mock_db.get_campaigns = AsyncMock(return_value=[campaign])
        mock_db.get_workflows_by_ids = AsyncMock(return_value=[])
        mock_db.get_queued_runs_stats_for_campaigns = AsyncMock(return_value={})
        mock_db.list_telephony_configurations = AsyncMock(return_value=[])

        resp = await get_campaigns(user=mock_user)
        assert len(resp.campaigns) == 1
        # logs must be empty list to prevent payload explosion
        assert resp.campaigns[0].logs == []
