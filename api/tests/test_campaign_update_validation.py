from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException

from api.db.models import CampaignModel
from api.routes.campaign import UpdateCampaignRequest, update_campaign


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.selected_organization_id = 123
    return user


@pytest.fixture
def base_campaign():
    campaign = MagicMock(spec=CampaignModel)
    campaign.id = 10
    campaign.name = "Test Campaign"
    campaign.workflow_id = 5
    campaign.state = "running"
    campaign.source_type = "csv"
    campaign.source_id = "src-1"
    campaign.total_rows = 100
    campaign.processed_rows = 10
    campaign.failed_rows = 0
    campaign.created_at = datetime.now(UTC)
    campaign.started_at = datetime.now(UTC)
    campaign.completed_at = None
    campaign.retry_config = None
    campaign.orchestrator_metadata = {"max_concurrency": 2}
    campaign.telephony_configuration_id = 1  # Old trunk
    campaign.logs = []
    return campaign


@pytest.mark.asyncio
async def test_upgrade_trunk_and_increase_concurrency_succeeds(mock_user, base_campaign):
    """Verify that upgrading to a larger trunk and increasing concurrency validates against the NEW trunk."""
    # Old trunk (id=1) has 2 numbers, new trunk (id=2) has 20 numbers.
    # Request sets concurrency to 10 and trunk to 2.
    req = UpdateCampaignRequest(
        telephony_configuration_id=2,
        max_concurrency=10,
    )

    with patch("api.routes.campaign.db_client") as mock_db, \
         patch("api.routes.campaign._get_org_concurrent_limit", return_value=50), \
         patch("api.routes.campaign._get_from_numbers_count") as mock_numbers_count, \
         patch("api.routes.campaign._get_campaign_stats", return_value={}):

        mock_cfg = MagicMock()
        mock_cfg.id = 2
        mock_cfg.name = "Large Trunk"
        mock_db.get_campaign = AsyncMock(return_value=base_campaign)
        mock_db.get_telephony_configuration_for_org = AsyncMock(return_value=mock_cfg)
        mock_db.update_campaign = AsyncMock()
        mock_db.get_workflow_name = AsyncMock(return_value="Support Flow")

        # _get_from_numbers_count returns 20 for trunk 2, 2 for trunk 1
        def mock_count(org_id, telephony_configuration_id=None):
            if telephony_configuration_id == 2:
                return 20
            return 2
        mock_numbers_count.side_effect = mock_count

        await update_campaign(campaign_id=10, request=req, user=mock_user)

        # Validation must have been called for trunk 2
        mock_numbers_count.assert_called_with(123, telephony_configuration_id=2)
        mock_db.update_campaign.assert_awaited_once()
        update_call_kwargs = mock_db.update_campaign.await_args.kwargs
        assert update_call_kwargs["telephony_configuration_id"] == 2
        assert update_call_kwargs["orchestrator_metadata"]["max_concurrency"] == 10


@pytest.mark.asyncio
async def test_downgrade_trunk_exceeding_concurrency_fails(mock_user, base_campaign):
    """Verify that downgrading to a 1-number trunk and setting concurrency to 5 fails validation with HTTP 400."""
    base_campaign.telephony_configuration_id = 2  # Current trunk has 20 numbers
    req = UpdateCampaignRequest(
        telephony_configuration_id=1,  # Downgrading to trunk 1 with 1 number
        max_concurrency=5,
    )

    with patch("api.routes.campaign.db_client") as mock_db, \
         patch("api.routes.campaign._get_org_concurrent_limit", return_value=50), \
         patch("api.routes.campaign._get_from_numbers_count") as mock_numbers_count:

        mock_db.get_campaign = AsyncMock(return_value=base_campaign)
        mock_db.get_telephony_configuration_for_org = AsyncMock(return_value=MagicMock(id=1, name="Single Number Trunk"))
        mock_db.update_campaign = AsyncMock()

        def mock_count(org_id, telephony_configuration_id=None):
            if telephony_configuration_id == 1:
                return 1
            return 20
        mock_numbers_count.side_effect = mock_count

        with pytest.raises(HTTPException) as exc_info:
            await update_campaign(campaign_id=10, request=req, user=mock_user)

        assert exc_info.value.status_code == 400
        assert "cannot exceed 1" in exc_info.value.detail
        mock_db.update_campaign.assert_not_called()


@pytest.mark.asyncio
async def test_update_telephony_configuration_not_found(mock_user, base_campaign):
    """Verify that specifying a non-existent telephony configuration ID returns 404."""
    req = UpdateCampaignRequest(
        telephony_configuration_id=999,
        max_concurrency=5,
    )

    with patch("api.routes.campaign.db_client") as mock_db:
        mock_db.get_campaign = AsyncMock(return_value=base_campaign)
        mock_db.get_telephony_configuration_for_org = AsyncMock(return_value=None)
        mock_db.update_campaign = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await update_campaign(campaign_id=10, request=req, user=mock_user)

        assert exc_info.value.status_code == 404
        assert "Telephony configuration 999 not found" in exc_info.value.detail
        mock_db.update_campaign.assert_not_called()


@pytest.mark.asyncio
async def test_downgrade_trunk_without_concurrency_param_checks_existing_concurrency(mock_user, base_campaign):
    """Verify that downgrading to a 1-number trunk when the campaign already has max_concurrency=10 fails validation."""
    base_campaign.telephony_configuration_id = 2
    base_campaign.orchestrator_metadata = {"max_concurrency": 10}
    # Request only updates telephony_configuration_id, max_concurrency is None
    req = UpdateCampaignRequest(
        telephony_configuration_id=1,
    )

    with patch("api.routes.campaign.db_client") as mock_db, \
         patch("api.routes.campaign._get_org_concurrent_limit", return_value=50), \
         patch("api.routes.campaign._get_from_numbers_count") as mock_numbers_count:

        mock_db.get_campaign = AsyncMock(return_value=base_campaign)
        mock_db.get_telephony_configuration_for_org = AsyncMock(return_value=MagicMock(id=1, name="Single Number Trunk"))
        mock_db.update_campaign = AsyncMock()

        def mock_count(org_id, telephony_configuration_id=None):
            if telephony_configuration_id == 1:
                return 1
            return 20
        mock_numbers_count.side_effect = mock_count

        with pytest.raises(HTTPException) as exc_info:
            await update_campaign(campaign_id=10, request=req, user=mock_user)

        assert exc_info.value.status_code == 400
        assert "cannot exceed 1" in exc_info.value.detail
        mock_db.update_campaign.assert_not_called()


@pytest.mark.asyncio
async def test_update_trunk_with_zero_numbers_fails(mock_user, base_campaign):
    """Verify that updating to a trunk with 0 configured phone numbers fails validation with HTTP 400."""
    req = UpdateCampaignRequest(
        telephony_configuration_id=3,
        max_concurrency=5,
    )

    with patch("api.routes.campaign.db_client") as mock_db, \
         patch("api.routes.campaign._get_org_concurrent_limit", return_value=50), \
         patch("api.routes.campaign._get_from_numbers_count", return_value=0):

        mock_db.get_campaign = AsyncMock(return_value=base_campaign)
        mock_db.get_telephony_configuration_for_org = AsyncMock(return_value=MagicMock(id=3, name="Empty Trunk"))
        mock_db.update_campaign = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await update_campaign(campaign_id=10, request=req, user=mock_user)

        assert exc_info.value.status_code == 400
        assert "0 configured phone numbers" in exc_info.value.detail
        mock_db.update_campaign.assert_not_called()


