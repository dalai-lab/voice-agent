from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.mcp_server.tools.telephony import list_phone_numbers, update_phone_number_routing


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_list_phone_numbers_success(authed_user: MagicMock):
    mock_phone_1 = SimpleNamespace(
        id=1,
        address="+15551234567",
        address_normalized="+15551234567",
        address_type="pstn",
        phone_number="+15551234567",
        telephony_provider="twilio",
        telephony_configuration_id=101,
        inbound_workflow_id=10,
        is_active=True,
        is_default_caller_id=True,
    )
    mock_phone_2 = SimpleNamespace(
        id=2,
        address="+15559876543",
        address_normalized="+15559876543",
        address_type="pstn",
        phone_number="+15559876543",
        telephony_provider="plivo",
        telephony_configuration_id=102,
        inbound_workflow_id=None,
        is_active=False,
        is_default_caller_id=False,
    )

    with (
        patch("api.mcp_server.tools.telephony.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch(
            "api.mcp_server.tools.telephony.db_client.list_phone_numbers_for_org",
            AsyncMock(return_value=[
                (mock_phone_1, "Sales Inbound Agent", "twilio"),
                (mock_phone_2, None, "plivo"),
            ]),
        ),
    ):
        result = await list_phone_numbers(include_inactive=True)

    assert len(result) == 2
    assert result[0]["address"] == "+15551234567"
    assert result[0]["inbound_workflow_id"] == 10
    assert result[0]["inbound_workflow_name"] == "Sales Inbound Agent"
    assert result[1]["address"] == "+15559876543"
    assert result[1]["inbound_workflow_id"] is None


@pytest.mark.asyncio
async def test_update_phone_number_routing_not_found(authed_user: MagicMock):
    with (
        patch("api.mcp_server.tools.telephony.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.telephony.db_client.get_phone_number", AsyncMock(return_value=None)),
    ):
        result = await update_phone_number_routing(phone_number_id=999, workflow_id=5)

    assert result["success"] is False
    assert result["error_code"] == "not_found"


@pytest.mark.asyncio
async def test_update_phone_number_routing_workflow_not_found(authed_user: MagicMock):
    mock_phone = SimpleNamespace(
        id=1,
        organization_id=42,
        address="+15551234567",
        telephony_configuration_id=101,
        telephony_provider="twilio",
        label="Main Line",
        is_active=True,
    )

    with (
        patch("api.mcp_server.tools.telephony.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.telephony.db_client.get_phone_number", AsyncMock(return_value=mock_phone)),
        patch("api.mcp_server.tools.telephony.db_client.get_workflow", AsyncMock(return_value=None)),
    ):
        result = await update_phone_number_routing(phone_number_id=1, workflow_id=999)

    assert result["success"] is False
    assert result["error_code"] == "workflow_not_found"


@pytest.mark.asyncio
async def test_update_phone_number_routing_success(authed_user: MagicMock):
    mock_phone = SimpleNamespace(
        id=1,
        organization_id=42,
        address="+15551234567",
        telephony_configuration_id=101,
        label="Main Line",
        is_active=True,
        is_default_caller_id=False,
    )
    mock_workflow = SimpleNamespace(id=10, name="New Support Inbound", status="active")
    mock_updated_phone = SimpleNamespace(
        id=1,
        address="+15551234567",
        telephony_configuration_id=101,
        inbound_workflow_id=10,
        is_active=True,
        is_default_caller_id=False,
    )

    with (
        patch("api.mcp_server.tools.telephony.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.telephony.db_client.get_phone_number", AsyncMock(return_value=mock_phone)),
        patch("api.mcp_server.tools.telephony.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.telephony.db_client.update_phone_number", AsyncMock(return_value=mock_updated_phone)),
        patch("api.mcp_server.tools.telephony._sync_inbound_for_phone_number", AsyncMock(return_value=SimpleNamespace(ok=True, message="Synced"))),
    ):
        result = await update_phone_number_routing(phone_number_id=1, workflow_id=10)

    assert result["success"] is True
    assert result["phone_number_id"] == 1
    assert result["address"] == "+15551234567"
    assert result["assigned_workflow_id"] == 10
    assert result["assigned_workflow_name"] == "New Support Inbound"
