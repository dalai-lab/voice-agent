"""
Tests for Campaign Orchestrator robustness guarantees:
1. Fast batch completions clear processing lock immediately (no 60s freeze).
2. Deferred batch scheduling respects defer_seconds via _defer_by.
3. Future callbacks do not cause busy empty batch loops.
4. Future callbacks keep campaign alive (prevent premature completion).
5. Resuming campaign clears pause metadata, resets retry counters, and kicks off next batch immediately.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

import pytest
from api.services.campaign.campaign_event_protocol import (
    BatchCompletedEvent,
    CampaignResumedEvent,
)
from api.services.campaign.campaign_orchestrator import CampaignOrchestrator
from api.services.campaign.runner import CampaignRunnerService


@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    pubsub = AsyncMock()
    redis.pubsub = MagicMock(return_value=pubsub)
    return redis


@pytest.fixture
def orchestrator(mock_redis):
    return CampaignOrchestrator(mock_redis)


@pytest.mark.asyncio
async def test_batch_completed_clears_processing_locks(orchestrator):
    """A batch that finishes in under 5s should not be blocked from scheduling the next batch."""
    campaign_id = 99
    # Simulate lock being set 1 second ago
    orchestrator._processing_locks[campaign_id] = datetime.now(UTC) - timedelta(seconds=1)
    orchestrator._batch_in_progress[campaign_id] = datetime.now(UTC) - timedelta(seconds=1)

    event = BatchCompletedEvent(campaign_id=campaign_id, processed_count=5)

    with (
        patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db,
        patch("api.services.campaign.campaign_orchestrator.enqueue_job", new_callable=AsyncMock) as mock_enqueue,
    ):
        mock_campaign = MagicMock(id=campaign_id, state="running", orchestrator_metadata={})
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.get_queued_runs_count = AsyncMock(return_value=10)
        mock_db.get_scheduled_runs_count = AsyncMock(return_value=0)
        mock_db.update_campaign = AsyncMock()

        await orchestrator._handle_event(event)

        # Ensure batch in progress was cleared
        assert campaign_id not in orchestrator._batch_in_progress or orchestrator._batch_in_progress[campaign_id] != event
        # Ensure job was scheduled despite the previous lock being < 5s ago
        mock_enqueue.assert_awaited_once()


@pytest.mark.asyncio
async def test_batch_completed_with_defer_seconds(orchestrator):
    """Batch completed with defer_seconds (transient retry backoff) passes _defer_by to enqueue_job."""
    campaign_id = 105
    event = BatchCompletedEvent(
        campaign_id=campaign_id,
        processed_count=0,
        metadata={"defer_seconds": 15, "reason": "concurrent_slot_timeout"},
    )

    with (
        patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db,
        patch("api.services.campaign.campaign_orchestrator.enqueue_job", new_callable=AsyncMock) as mock_enqueue,
    ):
        mock_campaign = MagicMock(id=campaign_id, state="running", orchestrator_metadata={})
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.get_queued_runs_count = AsyncMock(return_value=5)
        mock_db.get_scheduled_runs_count = AsyncMock(return_value=0)
        mock_db.update_campaign = AsyncMock()

        await orchestrator._handle_event(event)

        mock_enqueue.assert_awaited_once()
        _, kwargs = mock_enqueue.call_args
        assert "_defer_by" in kwargs
        assert kwargs["_defer_by"] == timedelta(seconds=15)


@pytest.mark.asyncio
async def test_future_callback_does_not_cause_empty_batch_loop(orchestrator):
    """If no runs are due now, but a callback is scheduled for tomorrow, do not schedule an immediate empty batch."""
    campaign_id = 200

    with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
        # No regular runs
        mock_db.get_queued_runs_count = AsyncMock(return_value=0)
        # No scheduled runs due before now
        mock_db.get_scheduled_runs_count = AsyncMock(return_value=0)

        # _has_due_work should be False
        assert await orchestrator._has_due_work(campaign_id) is False


@pytest.mark.asyncio
async def test_future_callback_prevents_premature_completion(orchestrator):
    """Future callbacks keep the campaign alive."""
    campaign_id = 200

    with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
        mock_db.get_queued_runs_count = AsyncMock(return_value=0)

        def mock_scheduled(campaign_id=None, scheduled_before=None, retry_reason=None):
            if scheduled_before is not None:
                return 0  # Nothing due right now
            if retry_reason == "user_requested_callback":
                return 1  # 1 callback in the future
            return 1

        mock_db.get_scheduled_runs_count = AsyncMock(side_effect=mock_scheduled)

        assert await orchestrator._has_due_work(campaign_id) is False
        assert await orchestrator._has_any_remaining_work(campaign_id) is True

        mock_campaign = MagicMock(
            id=campaign_id,
            state="running",
            last_activity_at=datetime.now(UTC) - timedelta(hours=2),
            orchestrator_metadata={},
        )
        # Should NOT mark complete because remaining work exists
        assert await orchestrator._should_mark_complete(mock_campaign) is False


@pytest.mark.asyncio
async def test_campaign_resumed_event_triggers_immediate_batch(orchestrator):
    """CampaignResumedEvent clears locks and immediately schedules the next batch."""
    campaign_id = 300
    orchestrator._processing_locks[campaign_id] = datetime.now(UTC)
    orchestrator._batch_in_progress[campaign_id] = datetime.now(UTC)

    event = CampaignResumedEvent(campaign_id=campaign_id)

    with (
        patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db,
        patch("api.services.campaign.campaign_orchestrator.enqueue_job", new_callable=AsyncMock) as mock_enqueue,
    ):
        mock_campaign = MagicMock(id=campaign_id, state="running", orchestrator_metadata={})
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.get_queued_runs_count = AsyncMock(return_value=5)
        mock_db.get_scheduled_runs_count = AsyncMock(return_value=0)
        mock_db.update_campaign = AsyncMock()

        await orchestrator._handle_event(event)

        mock_enqueue.assert_awaited_once()


@pytest.mark.asyncio
async def test_runner_resume_resets_counters_and_publishes_event():
    """runner.resume_campaign resets retry counters, clears paused_reason, and publishes CampaignResumedEvent."""
    runner = CampaignRunnerService()
    campaign_id = 400

    mock_campaign = MagicMock(
        id=campaign_id,
        state="paused",
        orchestrator_metadata={
            "paused_reason": "concurrency_limit_exhausted",
            "paused_max_concurrent": 3,
        },
    )

    with (
        patch("api.services.campaign.runner.db_client") as mock_db,
        patch("api.services.campaign.runner.circuit_breaker.reset", new_callable=AsyncMock) as mock_cb_reset,
        patch("api.services.campaign.runner.get_campaign_event_publisher") as mock_get_pub,
    ):
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.update_campaign = AsyncMock()
        mock_db.reset_campaign_metadata_counter = AsyncMock()
        mock_pub = AsyncMock()
        mock_get_pub.return_value = mock_pub

        await runner.resume_campaign(campaign_id)

        # Verify state updated to running and paused_reason cleared
        mock_db.update_campaign.assert_awaited_once_with(
            campaign_id=campaign_id,
            state="running",
            orchestrator_metadata={},
        )
        # Verify counters reset
        mock_db.reset_campaign_metadata_counter.assert_any_await(
            campaign_id=campaign_id,
            key="concurrent_slot_timeout_attempts",
        )
        mock_db.reset_campaign_metadata_counter.assert_any_await(
            campaign_id=campaign_id,
            key="quota_exhausted_attempts",
        )
        mock_db.reset_campaign_metadata_counter.assert_any_await(
            campaign_id=campaign_id,
            key="phone_number_pool_exhausted_attempts",
        )
        # Verify circuit breaker reset
        mock_cb_reset.assert_awaited_once_with(campaign_id)
        # Verify resume event published
        mock_pub.publish_campaign_resumed.assert_awaited_once_with(campaign_id)


def test_is_within_schedule_matching_slot(orchestrator):
    """When current time falls inside a configured schedule slot, returns True."""
    tz = "America/New_York"
    now_ny = datetime.now(ZoneInfo(tz))
    current_day = now_ny.weekday()
    # Create a slot that spans 1 hour ago to 1 hour from now
    start_time = (now_ny - timedelta(hours=1)).strftime("%H:%M")
    end_time = (now_ny + timedelta(hours=1)).strftime("%H:%M")

    campaign = MagicMock(
        orchestrator_metadata={
            "schedule_config": {
                "enabled": True,
                "timezone": tz,
                "slots": [
                    {
                        "day_of_week": current_day,
                        "start_time": start_time,
                        "end_time": end_time,
                    }
                ],
            }
        }
    )
    assert orchestrator._is_within_schedule(campaign) is True


def test_is_within_schedule_outside_slot(orchestrator):
    """When current time is outside all configured schedule slots, returns False."""
    tz = "America/New_York"
    now_ny = datetime.now(ZoneInfo(tz))
    current_day = now_ny.weekday()
    # Create a slot strictly in the past
    start_time = (now_ny - timedelta(hours=4)).strftime("%H:%M")
    end_time = (now_ny - timedelta(hours=2)).strftime("%H:%M")

    campaign = MagicMock(
        orchestrator_metadata={
            "schedule_config": {
                "enabled": True,
                "timezone": tz,
                "slots": [
                    {
                        "day_of_week": current_day,
                        "start_time": start_time,
                        "end_time": end_time,
                    }
                ],
            }
        }
    )
    assert orchestrator._is_within_schedule(campaign) is False


def test_is_within_schedule_disabled_or_empty(orchestrator):
    """When schedule config is absent or disabled, fails open (returns True)."""
    # No metadata
    c1 = MagicMock(orchestrator_metadata=None)
    assert orchestrator._is_within_schedule(c1) is True

    # Disabled
    c2 = MagicMock(orchestrator_metadata={"schedule_config": {"enabled": False}})
    assert orchestrator._is_within_schedule(c2) is True

    # Invalid timezone fails open
    c3 = MagicMock(
        orchestrator_metadata={
            "schedule_config": {
                "enabled": True,
                "timezone": "Invalid/Timezone_Name",
                "slots": [{"day_of_week": 0, "start_time": "09:00", "end_time": "17:00"}],
            }
        }
    )
    assert orchestrator._is_within_schedule(c3) is True


@pytest.mark.asyncio
async def test_check_slots_available_scope_and_org():
    from api.services.call_concurrency.service import CallConcurrencyService

    service = CallConcurrencyService()
    service.get_effective_org_concurrent_limit = AsyncMock(return_value=5)
    service.get_concurrency_group_id = AsyncMock(return_value=89)

    with patch("api.services.call_concurrency.service.rate_limiter.get_live_slot_count") as mock_live_count:
        # Case 1: Org is full (5/5)
        mock_live_count.return_value = 5
        res = await service.check_slots_available(89)
        assert res is False

        # Case 2: Org has capacity (1/5), but campaign scope is full (1/1)
        async def mock_count_side_effect(key):
            if key == 89:
                return 1  # Org active
            if key == "campaign:62":
                return 1  # Campaign active
            return 0

        mock_live_count.side_effect = mock_count_side_effect
        res = await service.check_slots_available(
            organization_id=89,
            scope_key="campaign:62",
            scope_max_concurrent=1,
        )
        assert res is False

        # Case 3: Org has capacity (1/5) and campaign has capacity (0/1)
        async def mock_count_has_room(key):
            if key == 89:
                return 1
            if key == "campaign:62":
                return 0
            return 0

        mock_live_count.side_effect = mock_count_has_room
        res = await service.check_slots_available(
            organization_id=89,
            scope_key="campaign:62",
            scope_max_concurrent=1,
        )
        assert res is True


@pytest.mark.asyncio
async def test_dispatcher_skips_claim_when_scope_full():
    from api.services.campaign.campaign_call_dispatcher import CampaignCallDispatcher
    from api.services.campaign.errors import ConcurrentSlotAcquisitionError

    dispatcher = CampaignCallDispatcher()
    mock_campaign = MagicMock(
        id=62,
        organization_id=89,
        state="running",
        orchestrator_metadata={"max_concurrency": 1},
    )

    with (
        patch("api.services.campaign.campaign_call_dispatcher.db_client") as mock_db,
        patch("api.services.campaign.campaign_call_dispatcher.call_concurrency") as mock_concurrency,
    ):
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        # Concurrency precheck reports full for scope
        mock_concurrency.check_slots_available = AsyncMock(return_value=False)
        mock_concurrency.get_effective_org_concurrent_limit = AsyncMock(return_value=2)

        with pytest.raises(ConcurrentSlotAcquisitionError) as exc_info:
            await dispatcher.process_batch(campaign_id=62, batch_size=10)

        # Confirm 0 runs were claimed because precheck aborted before DB query
        mock_db.claim_queued_runs_for_processing.assert_not_called()
        assert exc_info.value.max_concurrent == 1
        assert exc_info.value.wait_time == 0.0


@pytest.mark.asyncio
async def test_publish_campaign_resumed_event():
    from api.services.campaign.campaign_event_publisher import CampaignEventPublisher
    from api.services.campaign.campaign_event_protocol import parse_campaign_event, CampaignResumedEvent

    mock_redis = AsyncMock()
    publisher = CampaignEventPublisher(mock_redis)

    await publisher.publish_campaign_resumed(62, metadata={"reason": "manual_resume"})

    mock_redis.publish.assert_awaited_once()
    channel, payload = mock_redis.publish.call_args[0]
    assert channel == "campaign_events"
    parsed_event = parse_campaign_event(payload)
    assert isinstance(parsed_event, CampaignResumedEvent)
    assert parsed_event.campaign_id == 62
    assert parsed_event.metadata == {"reason": "manual_resume"}



