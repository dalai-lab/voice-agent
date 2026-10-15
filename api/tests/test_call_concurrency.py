import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.services.call_concurrency import (
    CallConcurrencyLimitError,
    CallConcurrencyService,
    CallConcurrencySlot,
)
from api.services.call_concurrency.rate_limiter import (
    FLEET_CONCURRENT_KEY,
    ConcurrentSlotAcquisition,
    RateLimiter,
)


@pytest.mark.asyncio
async def test_acquire_org_slot_logs_post_acquire_count_and_limit():
    service = CallConcurrencyService()

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch(
            "api.services.call_concurrency.service.rate_limiter"
        ) as mock_rate_limiter,
        patch("api.services.call_concurrency.service.logger") as mock_logger,
    ):
        mock_db.get_configuration = AsyncMock(return_value=None)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(
            return_value=ConcurrentSlotAcquisition(
                slot_id="slot-123",
                active_count=7,
            )
        )

        slot = await service.acquire_org_slot(199, source="test_source")

    assert slot.organization_id == 199
    assert slot.slot_id == "slot-123"
    assert slot.max_concurrent == 10
    assert slot.source == "test_source"
    mock_rate_limiter.try_acquire_concurrent_slot_details.assert_awaited_once_with(
        199, 10, scope_key=None, scope_max_concurrent=None
    )
    mock_logger.info.assert_called_once()
    log_message = mock_logger.info.call_args.args[0]
    assert "org 199" in log_message
    assert "source=test_source" in log_message
    assert "active_calls=7/10" in log_message
    assert "slot_id=slot-123" in log_message


@pytest.mark.asyncio
async def test_acquire_org_slot_logs_warning_when_limit_reached():
    service = CallConcurrencyService()

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch(
            "api.services.call_concurrency.service.rate_limiter"
        ) as mock_rate_limiter,
        patch("api.services.call_concurrency.service.logger") as mock_logger,
    ):
        mock_db.get_configuration = AsyncMock(return_value=None)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(
            return_value=None
        )
        mock_rate_limiter.get_concurrent_count = AsyncMock(return_value=12)
        mock_rate_limiter.get_live_slot_count = AsyncMock(return_value=12)

        with pytest.raises(CallConcurrencyLimitError):
            await service.acquire_org_slot(199, source="test_source", timeout=0)

    mock_rate_limiter.get_concurrent_count.assert_awaited_once_with(199)
    mock_logger.warning.assert_called_once()
    log_message = mock_logger.warning.call_args.args[0]
    assert "Concurrent call limit reached for org 199" in log_message
    assert "source=test_source" in log_message
    assert "active_calls=12/10" in log_message


@pytest.mark.asyncio
async def test_acquire_org_slot_fires_usage_event_per_org_member_when_limit_reached():
    """Mirrors the MPS org-event convention: one event per org member with the
    member's provider_id as distinct_id, event_source property, no $groups."""
    from types import SimpleNamespace

    from api.enums import PostHogEvent

    service = CallConcurrencyService()
    members = [
        SimpleNamespace(provider_id="user-a"),
        SimpleNamespace(provider_id="user-b"),
    ]

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch(
            "api.services.call_concurrency.service.rate_limiter"
        ) as mock_rate_limiter,
        patch("api.services.call_concurrency.service.capture_event") as mock_capture,
    ):
        mock_db.get_configuration = AsyncMock(return_value=None)
        mock_db.get_organization_users = AsyncMock(return_value=members)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(
            return_value=None
        )
        mock_rate_limiter.get_concurrent_count = AsyncMock(return_value=10)
        mock_rate_limiter.get_live_slot_count = AsyncMock(return_value=10)

        with pytest.raises(CallConcurrencyLimitError):
            await service.acquire_org_slot(199, source="webrtc", timeout=0)

    mock_db.get_organization_users.assert_awaited_once_with(199)
    assert mock_capture.call_count == 2
    distinct_ids = [c.kwargs["distinct_id"] for c in mock_capture.call_args_list]
    assert distinct_ids == ["user-a", "user-b"]
    for call in mock_capture.call_args_list:
        kwargs = call.kwargs
        assert kwargs["event"] == PostHogEvent.USAGE_CONCURRENT_CALL_LIMIT_REACHED
        assert "groups" not in kwargs
        assert kwargs["properties"]["event_source"] == "dograh"
        assert kwargs["properties"]["organization_id"] == 199
        assert kwargs["properties"]["source"] == "webrtc"
        assert kwargs["properties"]["active_calls"] == 10
        assert kwargs["properties"]["max_concurrent"] == 10
        assert "scope_key" not in kwargs["properties"]


@pytest.mark.asyncio
async def test_acquire_org_slot_passes_scope_to_rate_limiter():
    service = CallConcurrencyService()

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch(
            "api.services.call_concurrency.service.rate_limiter"
        ) as mock_rate_limiter,
    ):
        mock_db.get_configuration = AsyncMock(return_value=None)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(
            return_value=ConcurrentSlotAcquisition(slot_id="slot-123", active_count=1)
        )
        mock_rate_limiter.store_workflow_slot_mapping_if_absent = AsyncMock(
            return_value=True
        )

        slot = await service.acquire_org_slot(
            199,
            source="campaign:42",
            scope_key="campaign:42",
            scope_max_concurrent=3,
        )
        await service.bind_workflow_run(slot, 501)

    assert slot.scope_key == "campaign:42"
    mock_rate_limiter.try_acquire_concurrent_slot_details.assert_awaited_once_with(
        199, 10, scope_key="campaign:42", scope_max_concurrent=3
    )
    mock_rate_limiter.store_workflow_slot_mapping_if_absent.assert_awaited_once_with(
        501, 199, "slot-123", scope_key="campaign:42"
    )


@pytest.mark.asyncio
async def test_release_workflow_run_slot_keeps_mapping_on_redis_error():
    service = CallConcurrencyService()

    with patch(
        "api.services.call_concurrency.service.rate_limiter"
    ) as mock_rate_limiter:
        mock_rate_limiter.get_workflow_slot_mapping = AsyncMock(
            return_value=(11, "slot-1", None)
        )
        # None = Redis error during release (vs False = slot already gone)
        mock_rate_limiter.release_concurrent_slot = AsyncMock(return_value=None)
        mock_rate_limiter.delete_workflow_slot_mapping = AsyncMock()

        released = await service.release_workflow_run_slot(501)

    assert released is False
    mock_rate_limiter.release_concurrent_slot.assert_awaited_once_with(
        11, "slot-1", scope_key=None
    )
    mock_rate_limiter.delete_workflow_slot_mapping.assert_not_awaited()


@pytest.mark.asyncio
async def test_release_workflow_run_slot_deletes_mapping_when_slot_already_gone():
    service = CallConcurrencyService()

    with patch(
        "api.services.call_concurrency.service.rate_limiter"
    ) as mock_rate_limiter:
        mock_rate_limiter.get_workflow_slot_mapping = AsyncMock(
            return_value=(11, "slot-1", "campaign:42")
        )
        mock_rate_limiter.release_concurrent_slot = AsyncMock(return_value=False)
        mock_rate_limiter.delete_workflow_slot_mapping = AsyncMock(return_value=True)

        released = await service.release_workflow_run_slot(501)

    assert released is False
    mock_rate_limiter.release_concurrent_slot.assert_awaited_once_with(
        11, "slot-1", scope_key="campaign:42"
    )
    mock_rate_limiter.delete_workflow_slot_mapping.assert_awaited_once_with(501)


@pytest.mark.asyncio
async def test_unregister_active_call_never_raises():
    service = CallConcurrencyService()

    with patch(
        "api.services.call_concurrency.service.rate_limiter"
    ) as mock_rate_limiter:
        mock_rate_limiter.get_workflow_slot_mapping = AsyncMock(
            side_effect=RuntimeError("redis down")
        )

        released = await service.unregister_active_call(501)

    assert released is False


@pytest.mark.asyncio
async def test_sub_org_blocked_by_zero_limit_with_active_master_group():
    """Security/Quota regression test:
    When a sub-org is suspended (CONCURRENT_CALL_LIMIT=0), it must not bypass
    the block simply because its master group (CONCURRENCY_GROUP_ID) has an active limit (10).
    """
    from types import SimpleNamespace
    from api.enums import OrganizationConfigurationKey

    service = CallConcurrencyService()

    async def mock_get_cfg(org_id, key):
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENCY_GROUP_ID.value:
            return SimpleNamespace(value={"value": 100})
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 0})
        if org_id == 100 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 10})
        return None

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch("api.services.call_concurrency.service.rate_limiter") as mock_rate_limiter,
        patch("api.services.call_concurrency.service.logger") as mock_logger,
    ):
        mock_db.get_configuration = AsyncMock(side_effect=mock_get_cfg)
        mock_db.get_organization_users = AsyncMock(return_value=[])
        mock_rate_limiter.get_concurrent_count = AsyncMock(return_value=0)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(return_value=None)

        with pytest.raises(CallConcurrencyLimitError) as exc_info:
            await service.acquire_org_slot(200, source="webrtc", timeout=5)

    assert exc_info.value.organization_id == 200
    assert exc_info.value.max_concurrent == 0
    assert exc_info.value.wait_time == 0.0
    mock_rate_limiter.try_acquire_concurrent_slot_details.assert_not_called()
    mock_logger.warning.assert_called_once()
    assert "Concurrent call limit reached for org 200 (group 100)" in mock_logger.warning.call_args.args[0]


@pytest.mark.asyncio
async def test_sub_org_blocked_when_master_group_is_blocked():
    """When master org limit is 0 (master blocked/suspended), sub-org calls must also be blocked."""
    from types import SimpleNamespace
    from api.enums import OrganizationConfigurationKey

    service = CallConcurrencyService()

    async def mock_get_cfg(org_id, key):
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENCY_GROUP_ID.value:
            return SimpleNamespace(value={"value": 100})
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 5})
        if org_id == 100 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 0})
        return None

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch("api.services.call_concurrency.service.rate_limiter") as mock_rate_limiter,
    ):
        mock_db.get_configuration = AsyncMock(side_effect=mock_get_cfg)
        mock_db.get_organization_users = AsyncMock(return_value=[])
        mock_rate_limiter.get_concurrent_count = AsyncMock(return_value=0)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(return_value=None)

        with pytest.raises(CallConcurrencyLimitError) as exc_info:
            await service.acquire_org_slot(200, source="test_source", timeout=1)

    assert exc_info.value.max_concurrent == 0
    assert exc_info.value.wait_time == 0.0
    mock_rate_limiter.try_acquire_concurrent_slot_details.assert_not_called()


@pytest.mark.asyncio
async def test_sub_org_uses_effective_minimum_limit():
    """When sub-org has limit 3 and master has limit 10, the effective limit is min(3, 10) = 3."""
    from types import SimpleNamespace
    from api.enums import OrganizationConfigurationKey

    service = CallConcurrencyService()

    async def mock_get_cfg(org_id, key):
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENCY_GROUP_ID.value:
            return SimpleNamespace(value={"value": 100})
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 3})
        if org_id == 100 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 10})
        return None

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch("api.services.call_concurrency.service.rate_limiter") as mock_rate_limiter,
    ):
        mock_db.get_configuration = AsyncMock(side_effect=mock_get_cfg)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(
            return_value=ConcurrentSlotAcquisition(slot_id="slot-sub", active_count=1)
        )

        slot = await service.acquire_org_slot(200, source="test_source")

    assert slot.organization_id == 100
    assert slot.slot_id == "slot-sub"
    assert slot.max_concurrent == 3
    mock_rate_limiter.try_acquire_concurrent_slot_details.assert_awaited_once_with(
        100, 3, scope_key=None, scope_max_concurrent=None
    )


@pytest.mark.asyncio
async def test_sub_org_uses_master_limit_when_master_limit_is_smaller():
    """When sub-org has limit 10 and master has limit 4, the effective limit is min(10, 4) = 4."""
    from types import SimpleNamespace
    from api.enums import OrganizationConfigurationKey

    service = CallConcurrencyService()

    async def mock_get_cfg(org_id, key):
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENCY_GROUP_ID.value:
            return SimpleNamespace(value={"value": 100})
        if org_id == 200 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 10})
        if org_id == 100 and key == OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value:
            return SimpleNamespace(value={"value": 4})
        return None

    with (
        patch("api.services.call_concurrency.service.db_client") as mock_db,
        patch("api.services.call_concurrency.service.rate_limiter") as mock_rate_limiter,
    ):
        mock_db.get_configuration = AsyncMock(side_effect=mock_get_cfg)
        mock_rate_limiter.try_acquire_concurrent_slot_details = AsyncMock(
            return_value=ConcurrentSlotAcquisition(slot_id="slot-sub-2", active_count=2)
        )

        slot = await service.acquire_org_slot(200, source="test_source")

    assert slot.organization_id == 100
    assert slot.max_concurrent == 4
    mock_rate_limiter.try_acquire_concurrent_slot_details.assert_awaited_once_with(
        100, 4, scope_key=None, scope_max_concurrent=None
    )


@pytest.mark.asyncio
async def test_get_workflow_slot_position_returns_rank_plus_one():
    """Verify that get_workflow_slot_position correctly returns 1-based rank (position) from Redis."""
    from api.services.call_concurrency.rate_limiter import RateLimiter

    rl = RateLimiter()
    mock_redis = AsyncMock()

    with (
        patch.object(rl, "_get_redis", AsyncMock(return_value=mock_redis)),
        patch.object(
            rl, "get_workflow_slot_mapping", AsyncMock(return_value=(100, "slot-abc", None))
        ),
    ):
        # 1st position (rank 0 in ZSET)
        mock_redis.zrank = AsyncMock(return_value=0)
        pos = await rl.get_workflow_slot_position(501)
        assert pos == 1
        mock_redis.zremrangebyscore.assert_awaited_once()
        mock_redis.zrank.assert_awaited_once_with("concurrent_calls:100", "slot-abc")

        # 3rd position (rank 2 in ZSET)
        mock_redis.zrank = AsyncMock(return_value=2)
        pos = await rl.get_workflow_slot_position(501)
        assert pos == 3


@pytest.mark.asyncio
async def test_get_workflow_slot_position_returns_none_when_unmapped():
    """Verify get_workflow_slot_position returns None when workflow run has no slot mapping."""
    from api.services.call_concurrency.rate_limiter import RateLimiter

    rl = RateLimiter()

    with patch.object(rl, "get_workflow_slot_mapping", AsyncMock(return_value=None)):
        pos = await rl.get_workflow_slot_position(999)
        assert pos is None


@pytest.mark.asyncio
async def test_authorize_talkar_uses_slot_position_to_prevent_burst_self_starvation():
    """Verify that burst calls send their individual slot position (1, 2, 3...)
    to Talkar check-quota instead of aggregate peak active_calls, preventing self-starvation.
    """
    from api.services.quota_service import _authorize_talkar_workflow_run_start

    # Simulate 3 burst calls: all slotted in Redis, with positions 1, 2, 3
    # Call 1: position 1
    # Call 2: position 2
    # Call 3: position 3
    for run_id, expected_position in [(101, 1), (102, 2), (103, 3)]:
        with (
            patch(
                "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
                AsyncMock(return_value=100),
            ),
            patch(
                "api.services.call_concurrency.rate_limiter.rate_limiter.get_workflow_slot_position",
                AsyncMock(return_value=expected_position),
            ),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_client = AsyncMock()
            mock_resp = AsyncMock()
            mock_resp.status_code = 200
            mock_resp.json = MagicMock(return_value={"has_quota": True})
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__.return_value = mock_client

            result = await _authorize_talkar_workflow_run_start(
                organization_id=200, workflow_run_id=run_id
            )

            assert result.has_quota is True
            # Check the JSON payload sent to Talkar
            mock_client.post.assert_awaited_once()
            sent_payload = mock_client.post.call_args.kwargs["json"]
            assert sent_payload["organization_id"] == 200
            assert sent_payload["workflow_run_id"] == run_id
            assert sent_payload["active_calls"] == expected_position


@pytest.mark.asyncio
async def test_authorize_talkar_avoids_plus_one_double_count_when_slot_position_none():
    """When workflow_run_id is provided and slot_position is None (fallback),
    active_count must NOT add +1 because the slot was already acquired in Redis.
    """
    from api.services.quota_service import _authorize_talkar_workflow_run_start

    with (
        patch(
            "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
            AsyncMock(return_value=100),
        ),
        patch(
            "api.services.call_concurrency.rate_limiter.rate_limiter.get_workflow_slot_position",
            AsyncMock(return_value=None),
        ),
        patch(
            "api.services.call_concurrency.rate_limiter.rate_limiter.get_concurrent_count",
            AsyncMock(return_value=2),
        ),
        patch("httpx.AsyncClient") as mock_client_cls,
    ):
        mock_client = AsyncMock()
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = MagicMock(return_value={"has_quota": True})
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        result = await _authorize_talkar_workflow_run_start(
            organization_id=200, workflow_run_id=102
        )

        assert result.has_quota is True
        sent_payload = mock_client.post.call_args.kwargs["json"]
        assert sent_payload["organization_id"] == 200
        assert sent_payload["workflow_run_id"] == 102
        # active_count is 2, MUST NOT be 3 (2 + 1)
        assert sent_payload["active_calls"] == 2


@pytest.mark.asyncio
async def test_authorize_talkar_adds_plus_one_for_preflight_without_run_id():
    """When workflow_run_id is None (preflight check), active_count must add +1
    to account for the upcoming call that has not acquired a slot yet.
    """
    from api.services.quota_service import _authorize_talkar_workflow_run_start

    with (
        patch(
            "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
            AsyncMock(return_value=100),
        ),
        patch(
            "api.services.call_concurrency.rate_limiter.rate_limiter.get_concurrent_count",
            AsyncMock(return_value=2),
        ),
        patch("httpx.AsyncClient") as mock_client_cls,
    ):
        mock_client = AsyncMock()
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = MagicMock(return_value={"has_quota": True})
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        result = await _authorize_talkar_workflow_run_start(
            organization_id=200, workflow_run_id=None
        )

        assert result.has_quota is True
        sent_payload = mock_client.post.call_args.kwargs["json"]
        assert sent_payload["organization_id"] == 200
        assert "workflow_run_id" not in sent_payload
        # Preflight check without run_id: 2 + 1 = 3
        assert sent_payload["active_calls"] == 3


@pytest.mark.asyncio
async def test_get_concurrency_group_id_serves_from_memory_cache_first():
    """Verify that get_concurrency_group_id returns cached values without querying Redis or DB."""
    service = CallConcurrencyService()
    service._group_memory_cache[999] = 1234
    group_id = await service.get_concurrency_group_id(999)
    assert group_id == 1234


@pytest.mark.asyncio
async def test_group_memory_cache_ttl_expiration_and_invalidation():
    """Verify that _group_memory_cache respects TTL expiration and invalidation (Blocker 25)."""
    service = CallConcurrencyService()
    now = time.monotonic()
    
    # 1. Active cache within TTL returns cached value
    service._group_memory_cache[100] = 500
    service._group_memory_cache_expiry[100] = now + 300.0  # 5 minutes in future
    
    val = await service.get_concurrency_group_id(100)
    assert val == 500
    assert 100 in service._group_memory_cache

    # 2. Expired cache (time advanced beyond 300s TTL) expires and purges entry
    with patch("time.monotonic", return_value=now + 305.0):
        # When cache expires, it will purge and try Redis/DB fallback
        with patch.object(service, "default_concurrent_limit", 10):
            val = await service.get_concurrency_group_id(100)
            # Without DB/Redis, get_concurrency_group_id returns org_id (100) as fallback
            assert val == 100
            assert 100 not in service._group_memory_cache
            assert 100 not in service._group_memory_cache_expiry

    # 3. Invalidate concurrency group actively purges cache and expiry
    service._group_memory_cache[200] = 777
    service._group_memory_cache_expiry[200] = now + 300.0
    await service.invalidate_concurrency_group(200)
    assert 200 not in service._group_memory_cache
    assert 200 not in service._group_memory_cache_expiry


@pytest.mark.asyncio
async def test_internal_api_endpoint_invalidates_concurrency_group():
    """Verify Dograh internal API endpoint to invalidate concurrency group cache (Blocker 25)."""
    from api.routes.internal import invalidate_concurrency_group_cache
    from api.services.call_concurrency.service import call_concurrency

    call_concurrency._group_memory_cache[300] = 888
    call_concurrency._group_memory_cache_expiry[300] = time.monotonic() + 300.0

    res = await invalidate_concurrency_group_cache(org_id=300, _=None)
    assert res["status"] == "success"
    assert res["org_id"] == 300
    assert 300 not in call_concurrency._group_memory_cache
    assert 300 not in call_concurrency._group_memory_cache_expiry



@pytest.mark.asyncio
async def test_bind_workflow_run_none_slot_safely_noops():
    """When concurrency slot is None (e.g. failing open or disabled), bind_workflow_run must not raise AttributeError."""
    service = CallConcurrencyService()
    # Must complete cleanly without raising AttributeError: 'NoneType' object has no attribute 'organization_id'
    await service.bind_workflow_run(None, 501)


@pytest.mark.asyncio
async def test_authorize_talkar_fails_closed_when_billing_returns_500():
    """When Talkar billing returns HTTP 500, quota check fails closed with billing_service_unavailable."""
    from api.services.quota_service import _authorize_talkar_workflow_run_start

    with (
        patch(
            "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
            AsyncMock(return_value=100),
        ),
        patch(
            "api.services.call_concurrency.rate_limiter.rate_limiter.get_concurrent_count",
            AsyncMock(return_value=1),
        ),
        patch("httpx.AsyncClient") as mock_client_cls,
    ):
        mock_client = AsyncMock()
        mock_resp = AsyncMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        result = await _authorize_talkar_workflow_run_start(
            organization_id=200, workflow_run_id=None
        )

        assert result.has_quota is False
        assert result.error_code == "billing_service_unavailable"
        assert "temporarily unavailable" in result.error_message


@pytest.mark.asyncio
async def test_authorize_talkar_fails_closed_when_billing_times_out():
    """When Talkar billing request times out or raises an exception, quota check fails closed."""
    import httpx
    from api.services.quota_service import _authorize_talkar_workflow_run_start

    with (
        patch(
            "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
            AsyncMock(return_value=100),
        ),
        patch(
            "api.services.call_concurrency.rate_limiter.rate_limiter.get_concurrent_count",
            AsyncMock(return_value=1),
        ),
        patch("httpx.AsyncClient") as mock_client_cls,
    ):
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=httpx.ConnectTimeout("Connection timed out"))
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        result = await _authorize_talkar_workflow_run_start(
            organization_id=200, workflow_run_id=None
        )

        assert result.has_quota is False
        assert result.error_code == "billing_service_unavailable"


@pytest.mark.asyncio
async def test_authorize_talkar_extracts_specific_reasons_on_quota_rejection():
    """When Talkar returns 200 with has_quota=False and reason=concurrency_limit_exceeded, specific error_code is preserved."""
    from api.services.quota_service import _authorize_talkar_workflow_run_start

    with (
        patch(
            "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
            AsyncMock(return_value=100),
        ),
        patch(
            "api.services.call_concurrency.rate_limiter.rate_limiter.get_concurrent_count",
            AsyncMock(return_value=2),
        ),
        patch("httpx.AsyncClient") as mock_client_cls,
    ):
        mock_client = AsyncMock()
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = MagicMock(return_value={
            "has_quota": False,
            "reason": "concurrency_limit_exceeded",
            "active_calls": 3,
            "concurrent_call_limit": 2,
        })
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        result = await _authorize_talkar_workflow_run_start(
            organization_id=200, workflow_run_id=None
        )

        assert result.has_quota is False
        assert result.error_code == "concurrency_limit_exceeded"
        assert "Concurrent call limit reached" in result.error_message


@pytest.mark.asyncio
async def test_bind_workflow_run_redis_error_fails_open():
    """When Redis fails during store_workflow_slot_mapping_if_absent, bind_workflow_run should fail open rather than raising WorkflowRunSlotAlreadyBoundError."""
    service = CallConcurrencyService()
    slot = CallConcurrencySlot(
        organization_id=10,
        slot_id="slot-1",
        max_concurrent=5,
        source="test",
    )
    with patch(
        "api.services.call_concurrency.service.rate_limiter.store_workflow_slot_mapping_if_absent",
        new=AsyncMock(return_value=None),
    ):
        # When store returns None (Redis error), it should return cleanly
        await service.bind_workflow_run(slot, 501)


@pytest.mark.asyncio
async def test_release_slot_none_returns_false():
    """Releasing a None slot must return False without error."""
    service = CallConcurrencyService()
    assert await service.release_slot(None) is False


@pytest.mark.asyncio
async def test_rate_limiter_release_concurrent_slot_empty_slot_id():
    rl = RateLimiter()
    assert await rl.release_concurrent_slot(100, "") is False


@pytest.mark.asyncio
async def test_rate_limiter_release_concurrent_slot_calls_atomic_eval_unscoped():
    rl = RateLimiter()
    mock_redis = AsyncMock()
    mock_redis.eval = AsyncMock(return_value=1)

    with patch.object(rl, "_get_redis", AsyncMock(return_value=mock_redis)):
        result = await rl.release_concurrent_slot(123, "slot-456")

    assert result is True
    mock_redis.eval.assert_awaited_once()
    args, _ = mock_redis.eval.call_args
    script, num_keys, k1, k2, k3, a1, a2 = args
    assert "redis.call('ZREM', key, slot_id)" in script
    assert "redis.call('ZREM', fleet_key, fleet_member)" in script
    assert num_keys == 3
    assert k1 == "concurrent_calls:123"
    assert k2 == ""
    assert k3 == FLEET_CONCURRENT_KEY
    assert a1 == "slot-456"
    assert a2 == "123:slot-456"


@pytest.mark.asyncio
async def test_rate_limiter_release_concurrent_slot_calls_atomic_eval_scoped():
    rl = RateLimiter()
    mock_redis = AsyncMock()
    mock_redis.eval = AsyncMock(return_value=1)

    with patch.object(rl, "_get_redis", AsyncMock(return_value=mock_redis)):
        result = await rl.release_concurrent_slot(123, "slot-456", scope_key="campaign:99")

    assert result is True
    mock_redis.eval.assert_awaited_once()
    args, _ = mock_redis.eval.call_args
    _, num_keys, k1, k2, k3, a1, a2 = args
    assert num_keys == 3
    assert k1 == "concurrent_calls:123"
    assert k2 == "concurrent_calls:campaign:99"
    assert k3 == FLEET_CONCURRENT_KEY
    assert a1 == "slot-456"
    assert a2 == "123:slot-456"


@pytest.mark.asyncio
async def test_rate_limiter_release_concurrent_slot_returns_false_when_not_found():
    rl = RateLimiter()
    mock_redis = AsyncMock()
    mock_redis.eval = AsyncMock(return_value=0)

    with patch.object(rl, "_get_redis", AsyncMock(return_value=mock_redis)):
        result = await rl.release_concurrent_slot(123, "slot-456")

    assert result is False


@pytest.mark.asyncio
async def test_rate_limiter_release_concurrent_slot_returns_none_on_redis_error():
    rl = RateLimiter()
    mock_redis = AsyncMock()
    mock_redis.eval = AsyncMock(side_effect=Exception("Redis connection lost"))

    with patch.object(rl, "_get_redis", AsyncMock(return_value=mock_redis)):
        result = await rl.release_concurrent_slot(123, "slot-456")

    assert result is None


# ---------------------------------------------------------------------------
# Redis integration tests for scoped (campaign-level) slot acquisition
# ---------------------------------------------------------------------------

import os
import uuid

from api.services.call_concurrency.rate_limiter import RateLimiter

requires_redis = pytest.mark.skipif(
    "REDIS_URL" not in os.environ,
    reason="Requires Redis (set REDIS_URL via .env.test)",
)


def _unique_org_id() -> int:
    return uuid.uuid4().int % 10_000_000


@requires_redis
@pytest.mark.asyncio
async def test_scoped_acquisition_enforces_scope_limit_independently_of_org():
    """A campaign scope caps its own calls without measuring — or being
    starved by — other calls in the same org counter."""
    rl = RateLimiter()
    org_id = _unique_org_id()
    scope = f"campaign:{org_id}"
    org_key = f"concurrent_calls:{org_id}"
    scope_key_full = f"concurrent_calls:{scope}"
    redis_client = await rl._get_redis()

    try:
        # Unscoped (e.g. WebRTC) calls fill part of the org counter.
        for _ in range(3):
            assert await rl.try_acquire_concurrent_slot_details(org_id, 10)

        # Scope limit 2: two scoped acquisitions succeed...
        first = await rl.try_acquire_concurrent_slot_details(
            org_id, 10, scope_key=scope, scope_max_concurrent=2
        )
        second = await rl.try_acquire_concurrent_slot_details(
            org_id, 10, scope_key=scope, scope_max_concurrent=2
        )
        assert first and second

        # ...the third is rejected by the scope even though the org has room.
        third = await rl.try_acquire_concurrent_slot_details(
            org_id, 10, scope_key=scope, scope_max_concurrent=2
        )
        assert third is None

        # Unscoped calls are unaffected by the scope being full.
        assert await rl.try_acquire_concurrent_slot_details(org_id, 10)

        # Releasing with the scope key frees both counters.
        released = await rl.release_concurrent_slot(
            org_id, first.slot_id, scope_key=scope
        )
        assert released is True
        assert await redis_client.zscore(org_key, first.slot_id) is None
        assert await redis_client.zscore(scope_key_full, first.slot_id) is None

        # And the scope accepts a new call again.
        assert await rl.try_acquire_concurrent_slot_details(
            org_id, 10, scope_key=scope, scope_max_concurrent=2
        )
    finally:
        await redis_client.delete(org_key, scope_key_full)
        await rl.close()


@requires_redis
@pytest.mark.asyncio
async def test_fleet_count_tracks_acquire_and_release_without_double_count():
    """The fleet zset mirrors org slots one-to-one: a scoped call contributes
    exactly one member (via its org slot), and release removes it — so the
    autoscaling signal (get_fleet_concurrent_count) tracks live calls."""
    rl = RateLimiter()
    org_a, org_b = _unique_org_id(), _unique_org_id()
    scope = f"campaign:{org_b}"
    redis_client = await rl._get_redis()
    slots = []

    try:
        # Shared test Redis: assert deltas against the pre-test count.
        baseline = await rl.get_fleet_concurrent_count()

        a1 = await rl.try_acquire_concurrent_slot_details(org_a, 10)
        a2 = await rl.try_acquire_concurrent_slot_details(org_a, 10)
        b1 = await rl.try_acquire_concurrent_slot_details(
            org_b, 10, scope_key=scope, scope_max_concurrent=5
        )
        assert a1 and a2 and b1
        slots = [
            (org_a, a1.slot_id, None),
            (org_a, a2.slot_id, None),
            (org_b, b1.slot_id, scope),
        ]

        # Three calls fleet-wide; the scoped call is counted once, not twice.
        assert await rl.get_fleet_concurrent_count() == baseline + 3

        # A rejected acquisition must not leak a fleet member.
        assert await rl.try_acquire_concurrent_slot_details(org_a, 2) is None
        assert await rl.get_fleet_concurrent_count() == baseline + 3

        # Release drains the fleet count back down.
        for org_id, slot_id, scope_key in slots:
            assert await rl.release_concurrent_slot(
                org_id, slot_id, scope_key=scope_key
            )
        slots = []
        assert await rl.get_fleet_concurrent_count() == baseline
    finally:
        from api.services.call_concurrency.rate_limiter import FLEET_CONCURRENT_KEY

        for org_id, slot_id, _scope in slots:  # only on assertion failure
            await redis_client.zrem(FLEET_CONCURRENT_KEY, f"{org_id}:{slot_id}")
        await redis_client.delete(
            f"concurrent_calls:{org_a}",
            f"concurrent_calls:{org_b}",
            f"concurrent_calls:{scope}",
        )
        await rl.close()


@requires_redis
@pytest.mark.asyncio
async def test_org_limit_still_binds_scoped_acquisition():
    rl = RateLimiter()
    org_id = _unique_org_id()
    scope = f"campaign:{org_id}"
    org_key = f"concurrent_calls:{org_id}"
    scope_key_full = f"concurrent_calls:{scope}"
    redis_client = await rl._get_redis()

    try:
        assert await rl.try_acquire_concurrent_slot_details(org_id, 1)

        # Org counter is full, so the scoped acquire fails and must not
        # leave a phantom entry in the scope counter.
        rejected = await rl.try_acquire_concurrent_slot_details(
            org_id, 1, scope_key=scope, scope_max_concurrent=5
        )
        assert rejected is None
        assert await redis_client.zcard(scope_key_full) == 0
    finally:
        await redis_client.delete(org_key, scope_key_full)
        await rl.close()


@requires_redis
@pytest.mark.asyncio
async def test_workflow_slot_mapping_round_trips_scope_key():
    rl = RateLimiter()
    run_id = _unique_org_id()
    mapping_key = f"workflow_slot_mapping:{run_id}"
    redis_client = await rl._get_redis()

    try:
        stored = await rl.store_workflow_slot_mapping_if_absent(
            run_id, 11, "slot-1", scope_key="campaign:42"
        )
        assert stored is True
        assert await rl.get_workflow_slot_mapping(run_id) == (
            11,
            "slot-1",
            "campaign:42",
        )

        # Unscoped mappings surface scope_key=None.
        run_id_2 = _unique_org_id()
        try:
            await rl.store_workflow_slot_mapping_if_absent(run_id_2, 11, "slot-2")
            assert await rl.get_workflow_slot_mapping(run_id_2) == (
                11,
                "slot-2",
                None,
            )
        finally:
            await redis_client.delete(f"workflow_slot_mapping:{run_id_2}")
    finally:
        await redis_client.delete(mapping_key)
        await rl.close()


@pytest.mark.asyncio
async def test_rate_limiter_refresh_concurrent_slot_calls_atomic_lua():
    rl = RateLimiter()
    mock_redis = AsyncMock()
    mock_redis.eval = AsyncMock(return_value=1)
    rl._get_redis = AsyncMock(return_value=mock_redis)

    res = await rl.refresh_concurrent_slot(
        123, "slot-abc", scope_key="campaign:5", workflow_run_id=999
    )
    assert res is True
    mock_redis.eval.assert_awaited_once()
    args = mock_redis.eval.await_args[0]
    assert args[1] == 4
    assert args[2] == "concurrent_calls:123"
    assert args[3] == "concurrent_calls:campaign:5"
    assert args[4] == "concurrent_calls_fleet"
    assert args[5] == "workflow_slot_mapping:999"
    assert args[7] == "slot-abc"
    assert args[8] == "123:slot-abc"


@pytest.mark.asyncio
async def test_rate_limiter_refresh_concurrent_slot_returns_false_when_slot_missing():
    rl = RateLimiter()
    mock_redis = AsyncMock()
    mock_redis.eval = AsyncMock(return_value=0)
    rl._get_redis = AsyncMock(return_value=mock_redis)

    res = await rl.refresh_concurrent_slot(123, "slot-abc")
    assert res is False


@pytest.mark.asyncio
async def test_rate_limiter_uses_heartbeat_stale_timeout_for_fast_cleanup():
    rl = RateLimiter()
    mock_redis = AsyncMock()
    mock_redis.zremrangebyscore = AsyncMock()
    mock_redis.zcard = AsyncMock(return_value=1)
    rl._get_redis = AsyncMock(return_value=mock_redis)

    count = await rl.get_concurrent_count(123)
    assert count == 1
    mock_redis.zremrangebyscore.assert_awaited_once()
    concurrent_key, min_score, max_score = mock_redis.zremrangebyscore.await_args[0]
    assert concurrent_key == "concurrent_calls:123"
    assert min_score == 0
    expected_cutoff = time.time() - rl.heartbeat_stale_timeout
    assert abs(max_score - expected_cutoff) < 2.0


@pytest.mark.asyncio
async def test_service_refresh_workflow_run_slot():
    service = CallConcurrencyService()
    with patch("api.services.call_concurrency.service.rate_limiter") as mock_rl:
        mock_rl.get_workflow_slot_mapping = AsyncMock(
            return_value=(123, "slot-999", "campaign:7")
        )
        mock_rl.refresh_concurrent_slot = AsyncMock(return_value=True)

        res = await service.refresh_workflow_run_slot(501)
        assert res is True
        mock_rl.get_workflow_slot_mapping.assert_awaited_once_with(501)
        mock_rl.refresh_concurrent_slot.assert_awaited_once_with(
            123, "slot-999", scope_key="campaign:7", workflow_run_id=501
        )


@pytest.mark.asyncio
async def test_hold_slot_heartbeat_runs_and_cancels_cleanly():
    service = CallConcurrencyService()
    refreshes = []

    async def fake_refresh(run_id):
        refreshes.append(run_id)
        return True

    service.refresh_workflow_run_slot = AsyncMock(side_effect=fake_refresh)

    with patch("api.services.call_concurrency.service.rate_limiter") as mock_rl:
        mock_rl.heartbeat_interval = 0.02
        async with service.hold_slot_heartbeat(501):
            await asyncio.sleep(0.06)

    assert len(refreshes) >= 2
    assert all(r == 501 for r in refreshes)

