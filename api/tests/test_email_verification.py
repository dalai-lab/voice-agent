from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import api.routes.auth as auth_routes
from api.routes.auth import router
from api.services.auth import depends as auth_depends
from api.utils.auth import create_jwt_token, hash_otp_code, hash_password
from api.utils.email_validation import (
    _HOURLY_WINDOW_CACHE,
    get_canonical_email,
    is_disposable_email,
    normalize_email,
)


def _make_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture(autouse=True)
def reset_hourly_rate_limit_cache():
    _HOURLY_WINDOW_CACHE.clear()
    yield
    _HOURLY_WINDOW_CACHE.clear()


@pytest.fixture
def test_client(monkeypatch):
    monkeypatch.setattr(auth_depends, "AUTH_PROVIDER", "local")
    monkeypatch.setattr(auth_routes, "ENABLE_SIGNUP", True)
    monkeypatch.setattr(auth_routes, "DEPLOYMENT_MODE", "oss")
    return TestClient(_make_test_app())


@pytest.mark.asyncio
async def test_signup_creates_unverified_user_and_dispatches_otp(test_client, monkeypatch):
    dispatched = []

    async def mock_dispatch(email, code):
        dispatched.append((email, code))
        return True

    monkeypatch.setattr(auth_routes, "_dispatch_verification_email", mock_dispatch)
    monkeypatch.setattr(auth_routes, "validate_domain_mx", AsyncMock(return_value=True))

    fake_user = SimpleNamespace(
        id=101,
        email="newuser@example.com",
        is_verified=False,
        provider_id="oss_user_101",
    )

    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=None))
    monkeypatch.setattr(auth_routes.db_client, "create_user_with_email", AsyncMock(return_value=fake_user))

    response = test_client.post(
        "/auth/signup",
        json={"email": "NewUser@Example.com", "password": "Password123!", "name": "New User"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_verified"] is False
    assert data["user"]["is_verified"] is False
    assert len(dispatched) == 1
    assert dispatched[0][0] == "newuser@example.com"
    assert len(dispatched[0][1]) == 6  # 6-digit OTP


@pytest.mark.asyncio
async def test_signup_pre_hijacking_protection(test_client, monkeypatch):
    """If an unverified account already exists, signup updates password and dispatches a fresh OTP."""
    dispatched = []

    async def mock_dispatch(email, code):
        dispatched.append((email, code))
        return True

    monkeypatch.setattr(auth_routes, "_dispatch_verification_email", mock_dispatch)
    monkeypatch.setattr(auth_routes, "validate_domain_mx", AsyncMock(return_value=True))

    unverified_user = SimpleNamespace(
        id=102,
        email="unverified@example.com",
        is_verified=False,
        provider_id="oss_user_102",
    )

    update_otp_mock = AsyncMock()
    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=unverified_user))
    monkeypatch.setattr(auth_routes.db_client, "update_user_verification_otp", update_otp_mock)

    response = test_client.post(
        "/auth/signup",
        json={"email": "unverified@example.com", "password": "NewVictimPassword123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_verified"] is False
    assert update_otp_mock.awaited
    assert len(dispatched) == 1


@pytest.mark.asyncio
async def test_signup_conflict_on_already_verified(test_client, monkeypatch):
    verified_user = SimpleNamespace(
        id=103,
        email="verified@example.com",
        is_verified=True,
    )
    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=verified_user))
    monkeypatch.setattr(auth_routes, "validate_domain_mx", AsyncMock(return_value=True))

    response = test_client.post(
        "/auth/signup",
        json={"email": "verified@example.com", "password": "Password123!"},
    )

    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_verify_email_success(test_client, monkeypatch):
    unverified_user = SimpleNamespace(
        id=104,
        email="verify@example.com",
        is_verified=True,
        selected_organization_id=None,
        provider_id="oss_user_104",
    )

    mock_org = SimpleNamespace(id=501, provider_id="org_oss_user_104")
    monkeypatch.setattr(
        auth_routes.db_client,
        "verify_user_otp_atomic",
        AsyncMock(return_value=(True, "SUCCESS", unverified_user, 0)),
    )
    monkeypatch.setattr(auth_routes.db_client, "mark_user_email_verified", AsyncMock())
    monkeypatch.setattr(auth_routes.db_client, "get_or_create_organization_by_provider_id", AsyncMock(return_value=(mock_org, True)))
    monkeypatch.setattr(auth_routes.db_client, "add_user_to_organization", AsyncMock())
    monkeypatch.setattr(auth_routes.db_client, "update_user_selected_organization", AsyncMock())
    monkeypatch.setattr(auth_routes, "create_user_configuration_with_mps_key", AsyncMock(return_value=None))

    response = test_client.post(
        "/auth/verify-email",
        json={"email": "verify@example.com", "code": "123456"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_verified"] is True
    assert data["user"]["is_verified"] is True
    assert data["token"]


@pytest.mark.asyncio
async def test_verify_email_invalid_code_attempts_decrement(test_client, monkeypatch):
    unverified_user = SimpleNamespace(id=105, email="wrongcode@example.com")
    monkeypatch.setattr(
        auth_routes.db_client,
        "verify_user_otp_atomic",
        AsyncMock(return_value=(False, "INVALID_CODE", unverified_user, 3)),
    )

    response = test_client.post(
        "/auth/verify-email",
        json={"email": "wrongcode@example.com", "code": "000000"},
    )

    assert response.status_code == 400
    assert "3 attempts remaining" in response.json()["detail"]


@pytest.mark.asyncio
async def test_verify_email_lockout_on_fifth_attempt(test_client, monkeypatch):
    unverified_user = SimpleNamespace(id=106, email="lockout@example.com")
    monkeypatch.setattr(
        auth_routes.db_client,
        "verify_user_otp_atomic",
        AsyncMock(return_value=(False, "INVALID_CODE", unverified_user, 0)),
    )

    response = test_client.post(
        "/auth/verify-email",
        json={"email": "lockout@example.com", "code": "000000"},
    )

    assert response.status_code == 400
    assert "Maximum attempts reached" in response.json()["detail"]


@pytest.mark.asyncio
async def test_verify_email_expired_otp_rejected(test_client, monkeypatch):
    unverified_user = SimpleNamespace(id=107, email="expired@example.com")
    monkeypatch.setattr(
        auth_routes.db_client,
        "verify_user_otp_atomic",
        AsyncMock(return_value=(False, "CODE_EXPIRED", unverified_user, 0)),
    )

    response = test_client.post(
        "/auth/verify-email",
        json={"email": "expired@example.com", "code": "123456"},
    )

    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_resend_cooldown_60_seconds(test_client, monkeypatch):
    recent_user = SimpleNamespace(
        id=108,
        email="cooldown@example.com",
        is_verified=False,
        last_verification_sent_at=datetime.now(UTC) - timedelta(seconds=20),
    )

    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=recent_user))

    # 1. Should be rejected with 429 cooldown
    response = test_client.post(
        "/auth/resend-verification",
        json={"email": "cooldown@example.com"},
    )
    assert response.status_code == 429
    assert "wait" in response.json()["detail"].lower()

    # 2. Now simulate 65 seconds elapsed
    recent_user.last_verification_sent_at = datetime.now(UTC) - timedelta(seconds=65)
    monkeypatch.setattr(auth_routes.db_client, "update_user_verification_otp", AsyncMock())
    monkeypatch.setattr(auth_routes, "_dispatch_verification_email", AsyncMock(return_value=True))

    ok_response = test_client.post(
        "/auth/resend-verification",
        json={"email": "cooldown@example.com"},
    )
    assert ok_response.status_code == 200
    assert ok_response.json()["success"] is True


@pytest.mark.asyncio
async def test_resend_hourly_cap_enforced(test_client, monkeypatch):
    """Test Case 9: Request 5 resends -> 6th attempt within rolling hour rejected with 429."""
    user = SimpleNamespace(
        id=115,
        email="hourlycap@example.com",
        is_verified=False,
        last_verification_sent_at=None,
    )
    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=user))
    monkeypatch.setattr(auth_routes.db_client, "update_user_verification_otp", AsyncMock())
    monkeypatch.setattr(auth_routes, "_dispatch_verification_email", AsyncMock(return_value=True))

    # Send 5 requests (bypassing 60s cooldown by setting last_verification_sent_at to None)
    for _ in range(5):
        user.last_verification_sent_at = None
        res = test_client.post("/auth/resend-verification", json={"email": "hourlycap@example.com"})
        assert res.status_code == 200

    # 6th attempt should be blocked by hourly rate limit
    user.last_verification_sent_at = None
    rate_limited_res = test_client.post("/auth/resend-verification", json={"email": "hourlycap@example.com"})
    assert rate_limited_res.status_code == 429
    assert "Too many verification requests" in rate_limited_res.json()["detail"]


@pytest.mark.asyncio
async def test_change_signup_email_flow(test_client, monkeypatch):
    pwd_hash = hash_password("CorrectPassword123!")
    user = SimpleNamespace(
        id=109,
        email="wrong@example.com",
        password_hash=pwd_hash,
        is_verified=False,
    )

    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(side_effect=[user, None]))
    monkeypatch.setattr(auth_routes.db_client, "update_user_email", AsyncMock())
    monkeypatch.setattr(auth_routes.db_client, "update_user_verification_otp", AsyncMock())
    monkeypatch.setattr(auth_routes, "_dispatch_verification_email", AsyncMock(return_value=True))
    monkeypatch.setattr(auth_routes, "validate_domain_mx", AsyncMock(return_value=True))

    response = test_client.post(
        "/auth/change-signup-email",
        json={
            "current_email": "wrong@example.com",
            "new_email": "corrected@example.com",
            "password": "CorrectPassword123!",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["new_email"] == "corrected@example.com"
    assert data["token"]


@pytest.mark.asyncio
async def test_login_blocks_unverified_user(test_client, monkeypatch):
    pwd_hash = hash_password("ValidPassword123!")
    unverified_user = SimpleNamespace(
        id=110,
        email="gated@example.com",
        password_hash=pwd_hash,
        is_verified=False,
    )

    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=unverified_user))

    response = test_client.post(
        "/auth/login",
        json={"email": "gated@example.com", "password": "ValidPassword123!"},
    )

    assert response.status_code == 403
    data = response.json()
    assert data["detail"]["code"] == "EMAIL_NOT_VERIFIED"


@pytest.mark.asyncio
async def test_login_passwordless_user_gives_informative_error(test_client, monkeypatch):
    passwordless_user = SimpleNamespace(
        id=111,
        email="codeonly@example.com",
        password_hash=None,
        is_verified=True,
    )

    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=passwordless_user))

    response = test_client.post(
        "/auth/login",
        json={"email": "codeonly@example.com", "password": "AnyPassword123!"},
    )

    assert response.status_code == 400
    assert "created with email codes" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_send_code_jit_creation_and_login_with_code(test_client, monkeypatch):
    """Sign in with code creates JIT user if non-existent, then logs in with OTP."""
    monkeypatch.setattr(auth_routes, "validate_domain_mx", AsyncMock(return_value=True))
    dispatched = []

    async def mock_dispatch(email, code):
        dispatched.append((email, code))
        return True

    monkeypatch.setattr(auth_routes, "_dispatch_verification_email", mock_dispatch)

    # 1. Non-existent email -> creates user
    monkeypatch.setattr(auth_routes.db_client, "get_user_by_email", AsyncMock(return_value=None))
    create_mock = AsyncMock()
    monkeypatch.setattr(auth_routes.db_client, "create_user_with_email", create_mock)

    send_res = test_client.post(
        "/auth/send-code",
        json={"email": "jituser@example.com"},
    )
    assert send_res.status_code == 200
    assert create_mock.awaited
    assert len(dispatched) == 1
    otp = dispatched[0][1]

    # 2. Verify with code -> promotes to verified and provisions org
    jit_user = SimpleNamespace(
        id=112,
        email="jituser@example.com",
        is_verified=True,
        selected_organization_id=None,
        provider_id="oss_user_112",
    )
    mock_org = SimpleNamespace(id=502, provider_id="org_oss_user_112")

    monkeypatch.setattr(
        auth_routes.db_client,
        "verify_user_otp_atomic",
        AsyncMock(return_value=(True, "SUCCESS", jit_user, 0)),
    )
    monkeypatch.setattr(auth_routes.db_client, "mark_user_email_verified", AsyncMock())
    monkeypatch.setattr(auth_routes.db_client, "get_or_create_organization_by_provider_id", AsyncMock(return_value=(mock_org, True)))
    monkeypatch.setattr(auth_routes.db_client, "add_user_to_organization", AsyncMock())
    monkeypatch.setattr(auth_routes.db_client, "update_user_selected_organization", AsyncMock())
    monkeypatch.setattr(auth_routes, "create_user_configuration_with_mps_key", AsyncMock(return_value=None))

    login_res = test_client.post(
        "/auth/login-with-code",
        json={"email": "jituser@example.com", "code": otp},
    )
    assert login_res.status_code == 200
    assert login_res.json()["is_verified"] is True
    assert login_res.json()["user"]["is_verified"] is True


@pytest.mark.asyncio
async def test_disposable_email_rejected_at_signup(test_client):
    response = test_client.post(
        "/auth/signup",
        json={"email": "attacker@mailinator.com", "password": "Password123!"},
    )
    assert response.status_code == 400
    assert "disposable" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_handle_oss_auth_rejects_unverified_scope(monkeypatch):
    """Protected API routes reject tokens with scope='unverified'."""
    unverified_token = create_jwt_token(user_id=113, email="unverified@example.com", scope="unverified")

    with pytest.raises(HTTPException) as exc_info:
        await auth_depends._handle_oss_auth(authorization=f"Bearer {unverified_token}")

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "EMAIL_NOT_VERIFIED"


def test_canonical_email_strips_plus_addressing():
    """Edge Case 22: Plus-addressing sub-aliases are stripped for master quota tracking."""
    assert get_canonical_email("user+test1@gmail.com") == "user@gmail.com"
    assert get_canonical_email("User+Spam@Googlemail.com") == "user@gmail.com"
    assert get_canonical_email("regular@company.com") == "regular@company.com"
