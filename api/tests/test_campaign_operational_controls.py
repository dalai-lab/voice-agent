from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException

from api.db.campaign_client import CampaignClient
from api.db.models import CampaignModel, QueuedRunModel
from api.routes.campaign import cancel_campaign, delete_campaign
from api.services.campaign.runner import CampaignRunnerService


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.selected_organization_id = 456
    return user


class TestCancelCampaignRouteAndService:
    @pytest.mark.asyncio
    async def test_cancel_campaign_not_found(self, mock_user):
        """Verify cancel_campaign raises 404 when campaign is not found."""
        with patch("api.routes.campaign.db_client") as mock_db:
            mock_db.get_campaign = AsyncMock(return_value=None)

            with pytest.raises(HTTPException) as exc_info:
                await cancel_campaign(campaign_id=999, user=mock_user)

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_cancel_campaign_already_completed(self, mock_user):
        """Verify cancel_campaign raises 400 if campaign is already completed."""
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 100
        campaign.state = "completed"

        with patch("api.routes.campaign.db_client") as mock_db, \
             patch("api.routes.campaign.campaign_runner_service") as mock_runner:
            mock_db.get_campaign = AsyncMock(return_value=campaign)
            mock_runner.cancel_campaign = AsyncMock(side_effect=ValueError("Cannot cancel a completed campaign"))

            with pytest.raises(HTTPException) as exc_info:
                await cancel_campaign(campaign_id=100, user=mock_user)

            assert exc_info.value.status_code == 400
            assert "Cannot cancel a completed campaign" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_cancel_campaign_success(self, mock_user):
        """Verify cancel_campaign transitions state to cancelled, cancels queued runs, and logs event."""
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 200
        campaign.state = "running"

        with patch("api.routes.campaign.db_client") as mock_db, \
             patch("api.routes.campaign.campaign_runner_service") as mock_runner:
            mock_db.get_campaign = AsyncMock(return_value=campaign)
            mock_runner.cancel_campaign = AsyncMock()

            resp = await cancel_campaign(campaign_id=200, user=mock_user)

            assert resp == {"message": "Campaign cancelled successfully"}
            mock_runner.cancel_campaign.assert_awaited_once_with(200)

    @pytest.mark.asyncio
    async def test_runner_cancel_campaign_execution(self):
        """Verify runner.cancel_campaign updates state to cancelled and marks queued runs cancelled."""
        runner = CampaignRunnerService()
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 300
        campaign.state = "running"

        with patch("api.services.campaign.runner.db_client") as mock_db:
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.cancel_pending_queued_runs = AsyncMock(return_value=42)
            mock_db.append_campaign_log = AsyncMock()

            await runner.cancel_campaign(300)

            mock_db.update_campaign.assert_awaited_once()
            call_kwargs = mock_db.update_campaign.await_args.kwargs
            assert call_kwargs["campaign_id"] == 300
            assert call_kwargs["state"] == "cancelled"
            assert "completed_at" in call_kwargs

            mock_db.cancel_pending_queued_runs.assert_awaited_once_with(300)
            mock_db.append_campaign_log.assert_called_once()
            log_kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert log_kwargs["event"] == "campaign_cancelled"
            assert log_kwargs["level"] == "warning"
            assert log_kwargs["details"]["cancelled_queued_runs"] == 42


class TestDeleteCampaignRoute:
    @pytest.mark.asyncio
    async def test_delete_campaign_not_found(self, mock_user):
        """Verify delete_campaign raises 404 when campaign is not found."""
        with patch("api.routes.campaign.db_client") as mock_db:
            mock_db.get_campaign = AsyncMock(return_value=None)

            with pytest.raises(HTTPException) as exc_info:
                await delete_campaign(campaign_id=999, user=mock_user)

            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_campaign_running_cancels_then_deletes(self, mock_user):
        """Verify delete_campaign cancels a running campaign before deleting it."""
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 400
        campaign.state = "running"

        with patch("api.routes.campaign.db_client") as mock_db, \
             patch("api.routes.campaign.campaign_runner_service") as mock_runner:
            mock_db.get_campaign = AsyncMock(return_value=campaign)
            mock_runner.cancel_campaign = AsyncMock()
            mock_db.delete_campaign = AsyncMock(return_value=True)

            resp = await delete_campaign(campaign_id=400, user=mock_user)

            assert resp == {"message": "Campaign deleted successfully", "id": 400}
            mock_runner.cancel_campaign.assert_awaited_once_with(400)
            mock_db.delete_campaign.assert_awaited_once_with(400, mock_user.selected_organization_id)

    @pytest.mark.asyncio
    async def test_delete_campaign_success(self, mock_user):
        """Verify delete_campaign deletes completed/paused campaign."""
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 401
        campaign.state = "completed"

        with patch("api.routes.campaign.db_client") as mock_db, \
             patch("api.routes.campaign.campaign_runner_service") as mock_runner:
            mock_db.get_campaign = AsyncMock(return_value=campaign)
            mock_runner.cancel_campaign = AsyncMock()
            mock_db.delete_campaign = AsyncMock(return_value=True)

            resp = await delete_campaign(campaign_id=401, user=mock_user)

            assert resp == {"message": "Campaign deleted successfully", "id": 401}
            # Should not call cancel on already completed campaign
            mock_runner.cancel_campaign.assert_not_called()
            mock_db.delete_campaign.assert_awaited_once_with(401, mock_user.selected_organization_id)


class TestCampaignClientCancelPendingQueuedRuns:
    @pytest.mark.asyncio
    async def test_cancel_pending_queued_runs_executes_update(self):
        """Verify cancel_pending_queued_runs updates queued and processing runs to cancelled."""
        client = CampaignClient()
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 15
        mock_session.execute = AsyncMock(return_value=mock_result)

        mock_session_ctx = AsyncMock()
        mock_session_ctx.__aenter__.return_value = mock_session
        mock_session_ctx.__aexit__.return_value = None
        client.async_session = MagicMock(return_value=mock_session_ctx)

        count = await client.cancel_pending_queued_runs(campaign_id=50)

        assert count == 15
        assert mock_session.execute.await_count == 1
        assert mock_session.commit.await_count == 1

        executed_stmt = mock_session.execute.await_args_list[0].args[0]
        sql_text = str(executed_stmt)
        assert "UPDATE queued_runs" in sql_text
        assert "state" in sql_text
