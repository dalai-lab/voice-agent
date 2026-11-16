from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from api.mcp_server.tools.wallet import get_wallet_balance, list_wallet_transactions


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.email = "test@example.com"
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_get_wallet_balance_success(authed_user: MagicMock):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "balance_paise": 15000,
        "customer_status": "active",
        "is_sub_org": False,
        "can_manage_billing": True,
    }

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with (
        patch("api.mcp_server.tools.wallet.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.wallet.httpx.AsyncClient", return_value=mock_client),
    ):
        result = await get_wallet_balance()

    assert result["success"] is True
    assert result["organization_id"] == 42
    assert result["balance"]["rupees"] == 150.0
    assert result["balance"]["currency"] == "INR"
    assert result["status"]["account_status"] == "active"
    assert result["status"]["low_balance_warning"] is False


@pytest.mark.asyncio
async def test_get_wallet_balance_unonboarded_404(authed_user: MagicMock):
    mock_resp = MagicMock()
    mock_resp.status_code = 404

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with (
        patch("api.mcp_server.tools.wallet.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.wallet.httpx.AsyncClient", return_value=mock_client),
    ):
        result = await get_wallet_balance()

    assert result["success"] is False
    assert result["error_code"] == "billing_account_not_found"


@pytest.mark.asyncio
async def test_get_wallet_balance_service_unavailable(authed_user: MagicMock):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with (
        patch("api.mcp_server.tools.wallet.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.wallet.httpx.AsyncClient", return_value=mock_client),
    ):
        result = await get_wallet_balance()

    assert result["success"] is False
    assert result["error_code"] == "billing_service_unavailable"


@pytest.mark.asyncio
async def test_list_wallet_transactions_success(authed_user: MagicMock):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "items": [
            {
                "id": "tx_1",
                "amount_paise": -250,
                "type": "usage",
                "description": "Call to +15551234567 (120s)",
                "created_at": "2026-03-01T12:00:00Z",
            }
        ],
        "total_count": 1,
    }

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with (
        patch("api.mcp_server.tools.wallet.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.wallet.httpx.AsyncClient", return_value=mock_client),
    ):
        result = await list_wallet_transactions(limit=10)

    assert result["success"] is True
    assert len(result["transactions"]) == 1
    assert result["transactions"][0]["id"] == "tx_1"
