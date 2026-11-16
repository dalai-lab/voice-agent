from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.mcp_server.tools.campaigns import (
    list_campaigns,
    get_campaign_status,
    update_campaign_status,
)


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_list_campaigns_success(authed_user: MagicMock):
    mock_campaign = SimpleNamespace(
        id=1,
        name="Q1 Product Launch",
        workflow_id=10,
        state="running",
        total_rows=100,
        processed_rows=40,
        failed_rows=5,
        source_sync_status="completed",
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = [(mock_campaign, "Outbound Outreach")]
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_ctx = MagicMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
    mock_ctx.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("api.mcp_server.tools.campaigns.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.campaigns.db_client.async_session", return_value=mock_ctx),
    ):
        result = await list_campaigns()

    assert len(result) == 1
    c = result[0]
    assert c["campaign_id"] == 1
    assert c["name"] == "Q1 Product Launch"
    assert c["status"] == "running"
    assert c["progress_percentage"] == 40.0


@pytest.mark.asyncio
async def test_update_campaign_status_not_found(authed_user: MagicMock):
    with (
        patch("api.mcp_server.tools.campaigns.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.campaigns.db_client.get_campaign", AsyncMock(return_value=None)),
    ):
        result = await update_campaign_status(campaign_id=999, action="start")

    assert result["success"] is False
    assert result["error_code"] == "not_found"


@pytest.mark.asyncio
async def test_update_campaign_status_invalid_transition(authed_user: MagicMock):
    mock_campaign = SimpleNamespace(
        id=1,
        name="Completed Campaign",
        state="completed",
        total_rows=10,
        source_sync_status="completed",
    )

    with (
        patch("api.mcp_server.tools.campaigns.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.campaigns.db_client.get_campaign", AsyncMock(return_value=mock_campaign)),
    ):
        result = await update_campaign_status(campaign_id=1, action="start")

    assert result["success"] is False
    assert result["error_code"] == "invalid_state_transition"


@pytest.mark.asyncio
async def test_update_campaign_status_start_success(authed_user: MagicMock):
    mock_campaign = SimpleNamespace(
        id=1,
        name="Ready Campaign",
        workflow_id=5,
        state="created",
        total_rows=50,
        source_sync_status="completed",
    )
    mock_updated = SimpleNamespace(
        id=1,
        name="Ready Campaign",
        workflow_id=5,
        state="running",
    )
    mock_workflow = SimpleNamespace(id=5, name="Support Agent", status="active")
    mock_quota = SimpleNamespace(has_quota=True, error_code=None, error_message=None)

    with (
        patch("api.mcp_server.tools.campaigns.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.campaigns.db_client.get_campaign", AsyncMock(side_effect=[mock_campaign, mock_updated])),
        patch("api.mcp_server.tools.campaigns.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.campaigns.db_client.list_telephony_configurations", AsyncMock(return_value=[MagicMock()])),
        patch("api.mcp_server.tools.campaigns.authorize_workflow_run_start", AsyncMock(return_value=mock_quota)),
        patch("api.mcp_server.tools.campaigns.campaign_runner_service.start_campaign", AsyncMock(return_value=True)),
    ):
        result = await update_campaign_status(campaign_id=1, action="start")

    assert result["success"] is True
    assert result["status"] == "running"
    assert result["campaign_id"] == 1


@pytest.mark.asyncio
async def test_update_campaign_status_pause_idempotent(authed_user: MagicMock):
    mock_campaign = SimpleNamespace(
        id=1,
        name="Already Paused Campaign",
        state="paused",
    )

    with (
        patch("api.mcp_server.tools.campaigns.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.campaigns.db_client.get_campaign", AsyncMock(return_value=mock_campaign)),
    ):
        result = await update_campaign_status(campaign_id=1, action="pause")

    assert result["success"] is True
    assert result["status"] == "paused"
    assert "already paused" in result["message"]
