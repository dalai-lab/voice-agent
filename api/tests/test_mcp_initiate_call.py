from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.mcp_server.tools.initiate_call import initiate_call
from api.services.call_concurrency import CallConcurrencyLimitError


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.id = 1
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_initiate_call_invalid_phone_number(authed_user: MagicMock):
    with patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)):
        result = await initiate_call(workflow_id=1, phone_number="123")

    assert result["success"] is False
    assert result["error_code"] == "invalid_phone_number"


@pytest.mark.asyncio
async def test_initiate_call_workflow_not_found(authed_user: MagicMock):
    with (
        patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_workflow", AsyncMock(return_value=None)),
    ):
        result = await initiate_call(workflow_id=999, phone_number="+15551234567")

    assert result["success"] is False
    assert result["error_code"] == "not_found"


@pytest.mark.asyncio
async def test_initiate_call_workflow_archived(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(id=5, name="Old Agent", status="archived")
    with (
        patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
    ):
        result = await initiate_call(workflow_id=5, phone_number="+15551234567")

    assert result["success"] is False
    assert result["error_code"] == "workflow_archived"


@pytest.mark.asyncio
async def test_initiate_call_telephony_not_configured(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(id=5, name="Sales Agent", status="active")
    with (
        patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.initiate_call.get_default_telephony_provider", AsyncMock(side_effect=ValueError("No default provider"))),
    ):
        result = await initiate_call(workflow_id=5, phone_number="+15551234567")

    assert result["success"] is False
    assert result["error_code"] == "telephony_not_configured"


@pytest.mark.asyncio
async def test_initiate_call_concurrency_limit_reached(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(id=5, name="Sales Agent", status="active", user_id=1)
    mock_provider = MagicMock()
    mock_provider.PROVIDER_NAME = "twilio"
    mock_provider.validate_config.return_value = True

    with (
        patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.initiate_call.get_default_telephony_provider", AsyncMock(return_value=mock_provider)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_default_telephony_configuration", AsyncMock(return_value=SimpleNamespace(id=101))),
        patch(
            "api.mcp_server.tools.initiate_call.call_concurrency.acquire_org_slot",
            AsyncMock(
                side_effect=CallConcurrencyLimitError(
                    organization_id=1,
                    source="mcp_call",
                    wait_time=0.0,
                    max_concurrent=5,
                )
            ),
        ),
    ):
        result = await initiate_call(workflow_id=5, phone_number="+15551234567")

    assert result["success"] is False
    assert result["error_code"] == "concurrency_limit_reached"


@pytest.mark.asyncio
async def test_initiate_call_insufficient_wallet_balance(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(id=5, name="Sales Agent", status="active", user_id=1)
    mock_provider = MagicMock()
    mock_provider.PROVIDER_NAME = "twilio"
    mock_provider.validate_config.return_value = True

    mock_run_inputs = SimpleNamespace(definition_id=10, initial_context={"customer_name": "Arnav"})
    mock_run = SimpleNamespace(id=501, initial_context={"customer_name": "Arnav"})
    mock_quota = SimpleNamespace(has_quota=False, error_message="Talk-time wallet balance is empty")

    with (
        patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.initiate_call.get_default_telephony_provider", AsyncMock(return_value=mock_provider)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_default_telephony_configuration", AsyncMock(return_value=SimpleNamespace(id=101))),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.acquire_org_slot", AsyncMock(return_value="slot_1")),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.bind_workflow_run", AsyncMock(return_value=None)),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.release_workflow_run_slot", AsyncMock(return_value=None)) as release_slot_mock,
        patch("api.mcp_server.tools.initiate_call.prepare_workflow_run_inputs", AsyncMock(return_value=mock_run_inputs)),
        patch("api.mcp_server.tools.initiate_call.db_client.create_workflow_run", AsyncMock(return_value=mock_run)),
        patch("api.mcp_server.tools.initiate_call.authorize_workflow_run_start", AsyncMock(return_value=mock_quota)),
        patch("api.mcp_server.tools.initiate_call.mark_workflow_run_failed", AsyncMock(return_value=None)) as mark_failed_mock,
    ):
        result = await initiate_call(workflow_id=5, phone_number="+15551234567")

    assert result["success"] is False
    assert result["error_code"] == "insufficient_wallet_balance"
    release_slot_mock.assert_awaited_once_with(501)
    mark_failed_mock.assert_awaited_once_with(501, "Talk-time wallet balance is empty")


@pytest.mark.asyncio
async def test_initiate_call_success_with_initial_context(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(id=5, name="Sales Agent", status="active", user_id=1)
    mock_provider = MagicMock()
    mock_provider.PROVIDER_NAME = "plivo"
    mock_provider.WEBHOOK_ENDPOINT = "plivo/webhook"
    mock_provider.validate_config.return_value = True

    mock_dispatch_result = SimpleNamespace(
        caller_number="+15559876543",
        provider_metadata={"call_uuid": "plivo-uuid-12345"},
    )
    mock_provider.initiate_call = AsyncMock(return_value=mock_dispatch_result)

    mock_run_inputs = SimpleNamespace(
        definition_id=10,
        initial_context={
            "customer_name": "Arnav",
            "order_id": "ORD-999",
            "phone_number": "+15551234567",
            "called_number": "+15551234567",
            "provider": "plivo",
            "telephony_configuration_id": 101,
        },
    )
    mock_run = SimpleNamespace(
        id=502,
        initial_context=mock_run_inputs.initial_context,
    )
    mock_quota = SimpleNamespace(has_quota=True, error_message=None)

    with (
        patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.initiate_call.get_default_telephony_provider", AsyncMock(return_value=mock_provider)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_default_telephony_configuration", AsyncMock(return_value=SimpleNamespace(id=101))),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.acquire_org_slot", AsyncMock(return_value="slot_1")),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.bind_workflow_run", AsyncMock(return_value=None)),
        patch("api.mcp_server.tools.initiate_call.prepare_workflow_run_inputs", AsyncMock(return_value=mock_run_inputs)),
        patch("api.mcp_server.tools.initiate_call.db_client.create_workflow_run", AsyncMock(return_value=mock_run)),
        patch("api.mcp_server.tools.initiate_call.authorize_workflow_run_start", AsyncMock(return_value=mock_quota)),
        patch("api.mcp_server.tools.initiate_call.get_backend_endpoints", AsyncMock(return_value=("https://api.talkar.io", "wss://api.talkar.io"))),
        patch("api.mcp_server.tools.initiate_call.db_client.update_workflow_run", AsyncMock(return_value=None)),
    ):
        result = await initiate_call(
            workflow_id=5,
            phone_number="+1 555-123-4567",
            initial_context={"customer_name": "Arnav", "order_id": "ORD-999"},
        )

    assert result["success"] is True
    assert result["workflow_run_id"] == 502
    assert result["called_number"] == "+15551234567"
    assert result["caller_number"] == "+15559876543"
    assert result["provider"] == "plivo"
    assert result["status"] == "initiated"
    assert result["initial_context"]["customer_name"] == "Arnav"
    assert result["initial_context"]["order_id"] == "ORD-999"


@pytest.mark.asyncio
async def test_initiate_call_carrier_dispatch_failed(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(id=5, name="Sales Agent", status="active", user_id=1)
    mock_provider = MagicMock()
    mock_provider.PROVIDER_NAME = "plivo"
    mock_provider.WEBHOOK_ENDPOINT = "plivo/webhook"
    mock_provider.validate_config.return_value = True
    mock_provider.initiate_call = AsyncMock(side_effect=RuntimeError("Carrier gateway timed out"))

    mock_run_inputs = SimpleNamespace(definition_id=10, initial_context={})
    mock_run = SimpleNamespace(id=503, initial_context={})
    mock_quota = SimpleNamespace(has_quota=True, error_message=None)

    with (
        patch("api.mcp_server.tools.initiate_call.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.initiate_call.get_default_telephony_provider", AsyncMock(return_value=mock_provider)),
        patch("api.mcp_server.tools.initiate_call.db_client.get_default_telephony_configuration", AsyncMock(return_value=SimpleNamespace(id=101))),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.acquire_org_slot", AsyncMock(return_value="slot_1")),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.bind_workflow_run", AsyncMock(return_value=None)),
        patch("api.mcp_server.tools.initiate_call.call_concurrency.release_workflow_run_slot", AsyncMock(return_value=None)) as release_mock,
        patch("api.mcp_server.tools.initiate_call.prepare_workflow_run_inputs", AsyncMock(return_value=mock_run_inputs)),
        patch("api.mcp_server.tools.initiate_call.db_client.create_workflow_run", AsyncMock(return_value=mock_run)),
        patch("api.mcp_server.tools.initiate_call.authorize_workflow_run_start", AsyncMock(return_value=mock_quota)),
        patch("api.mcp_server.tools.initiate_call.get_backend_endpoints", AsyncMock(return_value=("https://api.talkar.io", "wss://api.talkar.io"))),
        patch("api.mcp_server.tools.initiate_call.mark_workflow_run_failed", AsyncMock(return_value=None)) as mark_failed_mock,
    ):
        result = await initiate_call(workflow_id=5, phone_number="+15551234567")

    assert result["success"] is False
    assert result["error_code"] == "call_dispatch_failed"
    assert "Carrier gateway timed out" in result["error"]
    release_mock.assert_awaited_once_with(503)
    mark_failed_mock.assert_awaited_once()
