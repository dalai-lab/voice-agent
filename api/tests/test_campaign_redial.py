import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from api.routes.campaign import RedialCampaignRequest, redial_campaign
from api.db.campaign_client import CampaignClient
from pydantic import ValidationError


def test_redial_campaign_request_validation():
    # Default: all True
    req = RedialCampaignRequest()
    assert req.retry_on_voicemail is True
    assert req.retry_on_no_answer is True
    assert req.retry_on_busy is True
    assert req.retry_on_failed is True

    # Only retry_on_failed is True
    req2 = RedialCampaignRequest(
        retry_on_voicemail=False,
        retry_on_no_answer=False,
        retry_on_busy=False,
        retry_on_failed=True,
    )
    assert req2.retry_on_failed is True

    # All False should fail validation
    with pytest.raises(ValidationError):
        RedialCampaignRequest(
            retry_on_voicemail=False,
            retry_on_no_answer=False,
            retry_on_busy=False,
            retry_on_failed=False,
        )


@pytest.mark.asyncio
async def test_redial_campaign_endpoint_passes_include_failed():
    user = MagicMock()
    user.selected_organization_id = "org-123"

    parent_campaign = MagicMock()
    parent_campaign.id = 10
    parent_campaign.state = "completed"
    parent_campaign.orchestrator_metadata = {}
    parent_campaign.name = "Test Parent"

    mock_db = MagicMock()
    mock_db.get_campaign = AsyncMock(return_value=parent_campaign)
    mock_db.get_workflow_name = AsyncMock(return_value="Test Workflow")
    mock_db.get_redial_candidates = AsyncMock(return_value=[{"source_uuid": "lead-1", "context_variables": {}}])
    mock_db.create_redial_campaign = AsyncMock(return_value=MagicMock(id=11))

    request = RedialCampaignRequest(
        retry_on_voicemail=False,
        retry_on_no_answer=False,
        retry_on_busy=False,
        retry_on_failed=True,
    )

    with patch("api.routes.campaign.db_client", mock_db), \
         patch("api.routes.campaign._get_campaign_stats", new_callable=AsyncMock, return_value={}), \
         patch("api.routes.campaign._get_telephony_configuration_name", new_callable=AsyncMock, return_value="Default Trunk"), \
         patch("api.routes.campaign._build_campaign_response", return_value=MagicMock()):
        await redial_campaign(campaign_id=10, request=request, user=user)

        mock_db.get_redial_candidates.assert_awaited_once_with(
            campaign_id=10,
            include_voicemail=False,
            include_no_answer=False,
            include_busy=False,
            include_failed=True,
        )


@pytest.mark.asyncio
async def test_get_redial_candidates_sql_generation():
    client = CampaignClient()
    session_mock = AsyncMock()
    execute_mock = MagicMock()
    execute_mock.all.return_value = [("uuid-1", {"phone": "+1234567890"})]
    session_mock.execute = AsyncMock(return_value=execute_mock)
    client.async_session = MagicMock(return_value=session_mock)
    session_mock.__aenter__.return_value = session_mock
    session_mock.__aexit__.return_value = None

    # Test with include_failed=True
    candidates = await client.get_redial_candidates(
        campaign_id=99,
        include_voicemail=False,
        include_no_answer=False,
        include_busy=False,
        include_failed=True,
    )

    assert len(candidates) == 1
    assert candidates[0]["source_uuid"] == "uuid-1"

    # Verify SQL contained failure clauses and latest_queued_state
    sql_arg = session_mock.execute.call_args[0][0]
    sql_text = str(sql_arg)
    assert "telephony_failed" in sql_text
    assert "call_dispatch_failed" in sql_text
    assert "latest_queued_state = 'failed'" in sql_text
    assert "latest_queued_per_root" in sql_text


@pytest.mark.asyncio
async def test_get_redial_candidates_empty_when_all_false():
    client = CampaignClient()
    candidates = await client.get_redial_candidates(
        campaign_id=99,
        include_voicemail=False,
        include_no_answer=False,
        include_busy=False,
        include_failed=False,
    )
    assert candidates == []
