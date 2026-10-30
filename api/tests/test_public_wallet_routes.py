import pytest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import httpx

from api.db.models import UserModel
from api.routes.wallet import router
from api.services.auth.depends import get_user, get_user_with_selected_organization


def _make_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture
def mock_user():
    user = UserModel()
    user.id = 1
    user.email = "test@example.com"
    user.selected_organization_id = 89
    return user


def test_get_wallet_success(mock_user):
    app = _make_test_app()
    app.dependency_overrides[get_user_with_selected_organization] = lambda: mock_user

    mock_talkar_response = {
        "balance_paise": 425050,
        "auto_recharge_enabled": True,
        "auto_recharge_threshold_paise": 100000,
        "auto_recharge_amount_paise": 500000,
        "has_saved_card": True,
        "plan": "starter",
        "plan_status": "active",
        "customer_status": "active",
        "is_sub_org": False,
    }

    mock_resp = httpx.Response(200, json=mock_talkar_response)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        client = TestClient(app)
        res = client.get("/api/v1/wallet")

    assert res.status_code == 200
    data = res.json()
    assert data["organization_id"] == 89
    assert data["balance"]["rupees"] == 4250.50
    assert data["balance"]["paise"] == 425050
    assert data["balance"]["currency"] == "INR"
    assert data["balance"]["formatted"] == "₹4,250.50"
    assert data["status"]["account_status"] == "active"
    assert data["status"]["is_blocked"] is False
    assert data["plan"]["tier"] == "starter"
    assert data["plan"]["rate_per_minute_rupees"] == 6.00
    assert data["plan"]["estimated_minutes_remaining"] == 708
    assert data["auto_recharge"]["enabled"] is True
    assert data["auto_recharge"]["threshold_rupees"] == 1000.00
    assert data["auto_recharge"]["recharge_amount_rupees"] == 5000.00


def test_get_wallet_balance_alias(mock_user):
    app = _make_test_app()
    app.dependency_overrides[get_user_with_selected_organization] = lambda: mock_user

    mock_talkar_response = {
        "balance_paise": 120000,
        "auto_recharge_enabled": False,
        "auto_recharge_threshold_paise": 0,
        "auto_recharge_amount_paise": 0,
        "plan": "pro",
        "customer_status": "active",
        "is_sub_org": False,
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = httpx.Response(200, json=mock_talkar_response)
        client = TestClient(app)
        res = client.get("/api/v1/wallet/balance")

    assert res.status_code == 200
    data = res.json()
    assert data["balance"]["rupees"] == 1200.00
    assert data["plan"]["tier"] == "pro"
    assert data["plan"]["rate_per_minute_rupees"] == 18.00
    assert data["plan"]["estimated_minutes_remaining"] == 66


def test_get_wallet_negative_balance_is_blocked(mock_user):
    app = _make_test_app()
    app.dependency_overrides[get_user_with_selected_organization] = lambda: mock_user

    mock_talkar_response = {
        "balance_paise": -5000,
        "auto_recharge_enabled": False,
        "auto_recharge_threshold_paise": 0,
        "auto_recharge_amount_paise": 0,
        "plan": "starter",
        "customer_status": "suspended",
        "is_sub_org": False,
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = httpx.Response(200, json=mock_talkar_response)
        client = TestClient(app)
        res = client.get("/api/v1/wallet")

    assert res.status_code == 200
    data = res.json()
    assert data["balance"]["rupees"] == -50.00
    assert data["status"]["is_blocked"] is True
    assert data["plan"]["estimated_minutes_remaining"] == 0


def test_get_wallet_404_not_onboarded(mock_user):
    app = _make_test_app()
    app.dependency_overrides[get_user_with_selected_organization] = lambda: mock_user

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = httpx.Response(404, text="Customer not found")
        client = TestClient(app)
        res = client.get("/api/v1/wallet")

    assert res.status_code == 404
    assert "No Talkar billing account found" in res.json()["detail"]


def test_get_wallet_503_billing_service_unreachable(mock_user):
    app = _make_test_app()
    app.dependency_overrides[get_user_with_selected_organization] = lambda: mock_user

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.ConnectError("Connection refused")
        client = TestClient(app)
        res = client.get("/api/v1/wallet")

    assert res.status_code == 503
    assert "temporarily unreachable" in res.json()["detail"]


def test_get_wallet_transactions_success(mock_user):
    app = _make_test_app()
    app.dependency_overrides[get_user_with_selected_organization] = lambda: mock_user

    mock_tx_data = {
        "transactions": [
            {
                "id": 101,
                "type": "call_deduction",
                "amount_paise": -1800,
                "description": "Round 2 AI Interview (Duration: 3 mins)",
                "dograh_run_id": 4821,
                "created_at": "2026-10-30T10:14:22Z",
            },
            {
                "id": 100,
                "type": "topup",
                "amount_paise": 500000,
                "description": "Auto-recharge via card",
                "dograh_run_id": None,
                "created_at": "2026-10-30T08:00:00Z",
            },
        ],
        "total": 35,
        "page": 1,
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = httpx.Response(200, json=mock_tx_data)
        client = TestClient(app)
        res = client.get("/api/v1/wallet/transactions?page=1&limit=20")

    assert res.status_code == 200
    data = res.json()
    assert data["organization_id"] == 89
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["limit"] == 20
    assert data["pagination"]["total_records"] == 35
    assert data["pagination"]["total_pages"] == 2
    assert data["pagination"]["has_next"] is True
    assert data["pagination"]["has_prev"] is False

    txs = data["transactions"]
    assert len(txs) == 2
    assert txs[0]["id"] == 101
    assert txs[0]["type"] == "call_deduction"
    assert txs[0]["amount_rupees"] == 18.00
    assert txs[0]["direction"] == "debit"
    assert txs[0]["dograh_run_id"] == 4821

    assert txs[1]["id"] == 100
    assert txs[1]["type"] == "topup"
    assert txs[1]["amount_rupees"] == 5000.00
    assert txs[1]["direction"] == "credit"
    assert txs[1]["dograh_run_id"] is None


def test_get_wallet_transactions_filter_type(mock_user):
    app = _make_test_app()
    app.dependency_overrides[get_user_with_selected_organization] = lambda: mock_user

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = httpx.Response(200, json={"transactions": [], "total": 0, "page": 1})
        client = TestClient(app)
        res = client.get("/api/v1/wallet/transactions?type=call_deduction")

    assert res.status_code == 200
    # Verify query params were passed to upstream
    mock_get.assert_called_once()
    _, kwargs = mock_get.call_args
    assert kwargs["params"]["type"] == "call_deduction"


def test_auth_via_x_api_key_header():
    from types import SimpleNamespace
    app = _make_test_app()

    api_key_mock = SimpleNamespace(id=1, organization_id=89, created_by=42, key_prefix="dgr_test")
    user_mock = UserModel()
    user_mock.id = 42
    user_mock.email = "owner@example.com"

    mock_talkar_response = {
        "balance_paise": 100000,
        "auto_recharge_enabled": False,
        "plan": "starter",
        "customer_status": "active",
    }

    with (
        patch("api.services.auth.depends.db_client.validate_api_key", new_callable=AsyncMock) as mock_val_key,
        patch("api.services.auth.depends.db_client.get_user_by_id", new_callable=AsyncMock) as mock_get_user,
        patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_http_get,
    ):
        mock_val_key.return_value = api_key_mock
        mock_get_user.return_value = user_mock
        mock_http_get.return_value = httpx.Response(200, json=mock_talkar_response)

        client = TestClient(app)
        res = client.get("/api/v1/wallet", headers={"X-API-Key": "dgr_test_valid_key"})

    assert res.status_code == 200
    assert res.json()["organization_id"] == 89
    assert res.json()["balance"]["rupees"] == 1000.00
    mock_val_key.assert_awaited_once_with("dgr_test_valid_key")


def test_auth_via_bearer_dgr_header():
    from types import SimpleNamespace
    app = _make_test_app()

    api_key_mock = SimpleNamespace(id=2, organization_id=89, created_by=42, key_prefix="dgr_bear")
    user_mock = UserModel()
    user_mock.id = 42
    user_mock.email = "owner@example.com"

    mock_talkar_response = {
        "balance_paise": 200000,
        "auto_recharge_enabled": False,
        "plan": "starter",
        "customer_status": "active",
    }

    with (
        patch("api.services.auth.depends.db_client.validate_api_key", new_callable=AsyncMock) as mock_val_key,
        patch("api.services.auth.depends.db_client.get_user_by_id", new_callable=AsyncMock) as mock_get_user,
        patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_http_get,
    ):
        mock_val_key.return_value = api_key_mock
        mock_get_user.return_value = user_mock
        mock_http_get.return_value = httpx.Response(200, json=mock_talkar_response)

        client = TestClient(app)
        res = client.get("/api/v1/wallet", headers={"Authorization": "Bearer dgr_bearer_test_key"})

    assert res.status_code == 200
    assert res.json()["organization_id"] == 89
    assert res.json()["balance"]["rupees"] == 2000.00
    mock_val_key.assert_awaited_once_with("dgr_bearer_test_key")


def test_auth_invalid_api_key_401():
    app = _make_test_app()

    with patch("api.services.auth.depends.db_client.validate_api_key", new_callable=AsyncMock) as mock_val_key:
        mock_val_key.return_value = None

        client = TestClient(app)
        res = client.get("/api/v1/wallet", headers={"X-API-Key": "dgr_invalid_key"})

    assert res.status_code == 401
    assert "Invalid or expired API key" in res.json()["detail"]

