from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException

from api.db.models import CampaignModel
from api.routes.campaign import CreateCampaignRequest, create_campaign
from api.services.campaign.runner import CampaignRunnerService


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.selected_organization_id = 123
    return user


class TestRunnerStartCampaignTelephonyPreflight:
    @pytest.mark.asyncio
    async def test_start_campaign_fails_when_no_telephony_and_no_default(self):
        """Verify runner.start_campaign raises ValueError when campaign has no telephony config and org has no default."""
        runner = CampaignRunnerService()
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 501
        campaign.state = "created"
        campaign.organization_id = 123
        campaign.telephony_configuration_id = None
        campaign.orchestrator_metadata = {}

        with patch("api.services.campaign.runner.db_client") as mock_db:
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.get_default_telephony_configuration = AsyncMock(return_value=None)
            mock_db.update_campaign = AsyncMock()

            with pytest.raises(ValueError) as exc_info:
                await runner.start_campaign(501)

            assert "No telephony configuration assigned and no default configuration found" in str(exc_info.value)
            mock_db.update_campaign.assert_not_called()

    @pytest.mark.asyncio
    async def test_start_campaign_auto_assigns_default_telephony_config(self):
        """Verify runner.start_campaign auto-assigns default telephony config if campaign.telephony_configuration_id is None."""
        runner = CampaignRunnerService()
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 502
        campaign.state = "created"
        campaign.organization_id = 123
        campaign.telephony_configuration_id = None
        campaign.source_type = "csv"
        campaign.source_id = "csv-1"
        campaign.orchestrator_metadata = {}

        mock_default_cfg = MagicMock()
        mock_default_cfg.id = 77

        with patch("api.services.campaign.runner.db_client") as mock_db, \
             patch("api.services.campaign.runner.enqueue_job", new_callable=AsyncMock):
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.get_default_telephony_configuration = AsyncMock(return_value=mock_default_cfg)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()

            await runner.start_campaign(502)

            # Must have updated campaign with default telephony config id 77
            mock_db.update_campaign.assert_any_await(
                502, telephony_configuration_id=77
            )
            assert campaign.telephony_configuration_id == 77


class TestCreateCampaignTelephonyPreflight:
    @pytest.mark.asyncio
    async def test_create_campaign_fails_when_no_config_and_no_default(self, mock_user):
        """Verify create_campaign raises 400 when neither telephony_configuration_id nor default config exists."""
        req = CreateCampaignRequest(
            name="New Campaign",
            workflow_id=1,
            source_type="csv",
            source_id="src-1",
            telephony_configuration_id=None,
        )

        mock_sync_service = MagicMock()
        mock_sync_service.validate_source = AsyncMock(return_value=MagicMock(is_valid=True))

        with patch("api.routes.campaign.db_client") as mock_db, \
             patch("api.routes.campaign.get_sync_service", return_value=mock_sync_service):
            mock_db.get_workflow = AsyncMock(return_value=MagicMock(id=1, is_active=True))
            mock_db.get_default_telephony_configuration = AsyncMock(return_value=None)

            with pytest.raises(HTTPException) as exc_info:
                await create_campaign(request=req, user=mock_user)

            assert exc_info.value.status_code == 400
            assert "No telephony configuration provided and no default configuration found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_create_campaign_auto_pins_default_telephony_config(self, mock_user):
        """Verify create_campaign pins default telephony config when request telephony_configuration_id is None."""
        req = CreateCampaignRequest(
            name="New Campaign With Default Config",
            workflow_id=1,
            source_type="csv",
            source_id="src-1",
            telephony_configuration_id=None,
        )

        created_campaign = MagicMock(spec=CampaignModel)
        created_campaign.id = 901
        created_campaign.name = req.name
        created_campaign.workflow_id = 1
        created_campaign.state = "created"
        created_campaign.source_type = "csv"
        created_campaign.source_id = "src-1"
        created_campaign.total_rows = 0
        created_campaign.processed_rows = 0
        created_campaign.failed_rows = 0
        created_campaign.created_at = datetime.now(UTC)
        created_campaign.started_at = None
        created_campaign.completed_at = None
        created_campaign.retry_config = None
        created_campaign.orchestrator_metadata = {}
        created_campaign.telephony_configuration_id = 88
        created_campaign.logs = []

        mock_default_cfg = MagicMock()
        mock_default_cfg.id = 88
        mock_default_cfg.name = "Default Twilio Trunk"

        mock_sync_service = MagicMock()
        mock_sync_service.validate_source = AsyncMock(return_value=MagicMock(is_valid=True))

        with patch("api.routes.campaign.db_client") as mock_db, \
             patch("api.routes.campaign.get_sync_service", return_value=mock_sync_service), \
             patch("api.routes.campaign._get_campaign_stats", return_value={}):
            mock_wf = MagicMock()
            mock_wf.id = 1
            mock_wf.is_active = True
            mock_wf.name = "Test Flow"
            mock_db.get_workflow = AsyncMock(return_value=mock_wf)
            mock_db.get_workflow_name = AsyncMock(return_value="Test Flow")
            mock_db.get_default_telephony_configuration = AsyncMock(return_value=mock_default_cfg)
            mock_db.get_telephony_configuration_for_org = AsyncMock(return_value=mock_default_cfg)
            mock_db.create_campaign = AsyncMock(return_value=created_campaign)

            resp = await create_campaign(request=req, user=mock_user)

            assert resp.id == 901
            assert resp.telephony_configuration_id == 88
            mock_db.create_campaign.assert_awaited_once()
            call_kwargs = mock_db.create_campaign.await_args.kwargs
            assert call_kwargs["telephony_configuration_id"] == 88
