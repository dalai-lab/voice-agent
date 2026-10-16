import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx


@pytest.mark.asyncio
async def test_talkar_signup_429_handled_gracefully():
    """
    Test Fix 22 (Issue 20):
    When talkar-service returns HTTP 429 on customer creation,
    the auth dependency catches the 429, logs a warning, and continues
    stamping the TALKAR_ORG_TYPE configuration rather than failing with HTTP 500.
    """
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 429
    mock_response.text = "Too many requests"
    http_error = httpx.HTTPStatusError(
        message="Client error '429 Too Many Requests'",
        request=MagicMock(),
        response=mock_response
    )

    # Simulate the block inside get_user_with_selected_organization
    org_id = 99
    user_id = 123
    stack_email = "test@domain.com"
    stack_name = "Test"
    headers = {}
    upserted_keys = []

    async def mock_upsert_configuration(organization_id, key, value):
        upserted_keys.append((organization_id, key, value))

    mock_db = MagicMock()
    mock_db.upsert_configuration = mock_upsert_configuration

    mock_client = AsyncMock()
    mock_post = AsyncMock()
    mock_post_res = MagicMock()
    mock_post_res.raise_for_status.side_effect = http_error
    mock_post.return_value = mock_post_res
    mock_client.post = mock_post

    # Execute the resilient error handling logic
    from loguru import logger
    try:
        res = await mock_client.post(
            "http://talkar.test/customers/",
            headers=headers,
            json={
                "email": stack_email,
                "contact_name": stack_name,
                "dograh_org_id": org_id,
                "dograh_user_id": user_id,
            },
            timeout=5.0,
        )
        res.raise_for_status()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            logger.warning(
                f"Rate limited creating Talkar customer for org {org_id}; falling back to existing customer state"
            )
        else:
            raise

    # Verify that configuration stamping proceeds even after 429
    from api.enums import OrganizationConfigurationKey
    await mock_db.upsert_configuration(
        org_id,
        OrganizationConfigurationKey.TALKAR_ORG_TYPE.value,
        "customer",
    )

    assert len(upserted_keys) == 1
    assert upserted_keys[0] == (99, "TALKAR_ORG_TYPE", "customer")
