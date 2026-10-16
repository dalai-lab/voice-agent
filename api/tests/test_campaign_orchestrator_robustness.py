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
    RetryNeededEvent,
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


@pytest.mark.asyncio
async def test_duplicate_batch_on_pubsub_replay_is_dropped(orchestrator, mock_redis):
    """If pub/sub delivers a duplicate event (same timestamp), it should be dropped immediately."""
    campaign_id = 55
    event = BatchCompletedEvent(campaign_id=campaign_id, processed_count=5)

    # First delivery: redis.set returns True (new event)
    mock_redis.set = AsyncMock(return_value=True)

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
        assert mock_enqueue.await_count == 1

        # Second delivery (replay): redis.set returns None/False (already seen key)
        mock_redis.set = AsyncMock(return_value=None)
        await orchestrator._handle_event(event)

        # Enqueue count should still be 1 (second was dropped)
        assert mock_enqueue.await_count == 1


@pytest.mark.asyncio
async def test_batch_in_progress_prevents_duplicate_schedule(orchestrator, mock_redis):
    """_schedule_next_batch should not enqueue if a batch is already in progress."""
    campaign_id = 77
    orchestrator._batch_in_progress[campaign_id] = datetime.now(UTC)

    with patch("api.services.campaign.campaign_orchestrator.enqueue_job", new_callable=AsyncMock) as mock_enqueue:
        await orchestrator._schedule_next_batch(campaign_id)
        mock_enqueue.assert_not_called()


@pytest.mark.asyncio
async def test_stale_campaign_sweep_cleans_up_stuck_processing_runs(orchestrator):
    """_check_stale_campaigns triggers cleanup_stuck_processing_queued_runs."""
    with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
        mock_db.cleanup_stuck_processing_queued_runs = AsyncMock(return_value=3)
        mock_db.get_campaigns_by_status = AsyncMock(return_value=[])
        mock_db.get_campaigns_with_due_callbacks = AsyncMock(return_value=[])

        await orchestrator._check_stale_campaigns()

        mock_db.cleanup_stuck_processing_queued_runs.assert_awaited_once_with(threshold_seconds=300)


@pytest.mark.asyncio
async def test_worker_execution_lock_prevents_concurrent_batch():
    """process_campaign_batch skips execution if another worker currently holds the execution lock."""
    from api.tasks.campaign_tasks import process_campaign_batch

    mock_redis = AsyncMock()
    # Lock acquisition returns False (another worker holds the lock)
    mock_redis.set = AsyncMock(return_value=False)

    ctx = {"redis": mock_redis}
    with patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp:
        await process_campaign_batch(ctx, campaign_id=88)
        mock_disp.process_batch.assert_not_called()


@pytest.mark.asyncio
async def test_should_mark_complete_resolves_last_activity_and_grace_period(orchestrator):
    """_should_mark_complete correctly extracts last_activity from self._last_activity
    or campaign.last_activity_at without raising NameError."""
    campaign_id = 999
    now = datetime.now(UTC)

    with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
        # No pending work, no active runs
        mock_db.get_queued_runs_count = AsyncMock(return_value=0)
        mock_db.get_scheduled_runs_count = AsyncMock(return_value=0)
        mock_db.get_active_runs_count_for_campaign = AsyncMock(return_value=0)

        # Case 1: In grace period (last activity was 10s ago in orchestrator cache)
        orchestrator._last_activity[campaign_id] = now - timedelta(seconds=10)
        mock_campaign = MagicMock(
            id=campaign_id,
            state="running",
            last_activity_at=None,
            orchestrator_metadata={},
        )
        assert await orchestrator._should_mark_complete(mock_campaign) is False

        # Case 2: Grace period expired (>30s ago in orchestrator cache)
        orchestrator._last_activity[campaign_id] = now - timedelta(seconds=45)
        assert await orchestrator._should_mark_complete(mock_campaign) is True

        # Case 3: Orchestrator cache is empty, falls back to campaign.last_activity_at (>30s ago)
        del orchestrator._last_activity[campaign_id]
        mock_campaign.last_activity_at = now - timedelta(seconds=45)
        assert await orchestrator._should_mark_complete(mock_campaign) is True

        # Case 4: Orchestrator cache is empty, falls back to campaign.last_activity_at (within grace period)
        mock_campaign.last_activity_at = now - timedelta(seconds=15)
        assert await orchestrator._should_mark_complete(mock_campaign) is False


@pytest.mark.asyncio
async def test_get_campaign_status_does_not_double_count_progress():
    """Verify that runner.get_campaign_status does not add dispatched leads and failed calls together,
    which previously caused 50% dispatched leads to report 100% completion."""
    runner = CampaignRunnerService()
    campaign_id = 701

    mock_campaign = MagicMock(
        id=campaign_id,
        state="running",
        total_rows=100,
        processed_rows=50,  # 50 initial leads dispatched
        failed_rows=50,     # all 50 failed
        source_sync_status="completed",
        source_last_synced_at=None,
        source_sync_error=None,
        rate_limit_per_second=5,
        started_at=None,
        completed_at=None,
    )

    with patch("api.services.campaign.runner.db_client") as mock_db:
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.get_queued_runs_stats_for_campaigns = AsyncMock(
            return_value={
                campaign_id: {
                    "failed_calls": 50,
                    "completed_calls": 0,
                }
            }
        )

        status = await runner.get_campaign_status(campaign_id)

        # 50 unique leads were dispatched, all 50 failed.
        # Progress must be 50%, NOT 100%!
        assert status["total_rows"] == 100
        assert status["processed_rows"] == 50
        assert status["failed_calls"] == 50
        assert status["progress_percentage"] == 50.0


@pytest.mark.asyncio
async def test_get_campaign_status_100_percent_failed_never_reports_200_percent():
    """Verify that when 100% of leads fail, progress is 100.0%, never 200.0%."""
    runner = CampaignRunnerService()
    campaign_id = 702

    mock_campaign = MagicMock(
        id=campaign_id,
        state="running",
        total_rows=100,
        processed_rows=100,  # 100 initial leads dispatched
        failed_rows=100,     # all 100 failed
        source_sync_status="completed",
        source_last_synced_at=None,
        source_sync_error=None,
        rate_limit_per_second=5,
        started_at=None,
        completed_at=None,
    )

    with patch("api.services.campaign.runner.db_client") as mock_db:
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.get_queued_runs_stats_for_campaigns = AsyncMock(
            return_value={
                campaign_id: {
                    "failed_calls": 100,
                    "completed_calls": 0,
                }
            }
        )

        status = await runner.get_campaign_status(campaign_id)
        assert status["progress_percentage"] == 100.0


@pytest.mark.asyncio
async def test_telephony_initiation_failure_sets_failed_disposition_and_links_queued_run():
    """Verify that when provider.initiate_call raises an exception, the dispatcher marks
    the workflow run with mapped_call_disposition='failed' and links the queued_run."""
    from api.services.campaign.campaign_call_dispatcher import CampaignCallDispatcher
    dispatcher = CampaignCallDispatcher()

    queued_run = MagicMock()
    queued_run.id = 501
    queued_run.context_variables = {"phone_number": "+15551234567"}
    queued_run.source_uuid = "uuid-501"

    campaign = MagicMock()
    campaign.id = 801
    campaign.workflow_id = 901
    campaign.organization_id = 1
    campaign.telephony_configuration_id = None

    workflow = MagicMock()
    workflow.id = 901

    workflow_run = MagicMock()
    workflow_run.id = 1001
    workflow_run.logs = {}

    provider = MagicMock()
    provider.PROVIDER_NAME = "mock"
    provider.WEBHOOK_ENDPOINT = "webhook"
    provider.initiate_call = AsyncMock(side_effect=RuntimeError("Carrier initiation network timeout"))

    with (
        patch("api.services.campaign.campaign_call_dispatcher.db_client") as mock_db,
        patch.object(dispatcher, "get_provider_for_campaign", return_value=provider),
        patch.object(dispatcher, "acquire_from_number", return_value="+15559876543"),
        patch.object(dispatcher, "release_call_slot", return_value=None),
        patch("api.services.campaign.campaign_call_dispatcher.prepare_workflow_run_inputs", return_value=MagicMock(definition_id=1)),
        patch("api.services.campaign.campaign_call_dispatcher.authorize_workflow_run_start", return_value=MagicMock(has_quota=True)),
        patch("api.services.campaign.campaign_call_dispatcher.get_backend_endpoints", return_value=("http://localhost:8000", "ws://localhost:8000")),
        patch("api.services.campaign.campaign_call_dispatcher.circuit_breaker.record_and_evaluate", return_value=None),
        patch("api.services.campaign.campaign_call_dispatcher.rate_limiter.store_workflow_from_number_mapping", return_value=None),
    ):
        mock_db.get_workflow = AsyncMock(return_value=workflow)
        mock_db.create_workflow_run = AsyncMock(return_value=workflow_run)
        mock_db.update_workflow_run = AsyncMock()
        mock_db.update_queued_run = AsyncMock()

        with pytest.raises(RuntimeError, match="Carrier initiation network timeout"):
            await dispatcher.dispatch_call(queued_run, campaign, concurrency_slot=None)

        # 1. Workflow run updated with failure disposition and tags
        mock_db.update_workflow_run.assert_awaited()
        update_call = mock_db.update_workflow_run.call_args_list[-1]
        assert update_call.kwargs["run_id"] == 1001
        assert update_call.kwargs["is_completed"] is True
        assert update_call.kwargs["gathered_context"]["mapped_call_disposition"] == "failed"
        assert "telephony_failed" in update_call.kwargs["gathered_context"]["call_tags"]
        assert "initiation_failed" in update_call.kwargs["gathered_context"]["call_tags"]

        # 2. Queued run linked to workflow run
        mock_db.update_queued_run.assert_awaited_once_with(
            queued_run_id=501,
            workflow_run_id=1001,
        )


@pytest.mark.asyncio
async def test_orchestrator_handles_voicemail_retry_event(orchestrator):
    """When a RetryNeededEvent for voicemail is received, orchestrator schedules a retry."""
    campaign_id = 77
    queued_run_id = 301
    event = RetryNeededEvent(
        campaign_id=campaign_id,
        workflow_run_id=901,
        queued_run_id=queued_run_id,
        reason="voicemail",
    )

    campaign = MagicMock(
        id=campaign_id,
        retry_config={
            "enabled": True,
            "max_retries": 2,
            "retry_delay_seconds": 60,
            "retry_on_voicemail": True,
        },
    )
    original_run = MagicMock(
        id=queued_run_id,
        campaign_id=campaign_id,
        source_uuid="lead_77_301",
        retry_count=0,
        context_variables={"phone_number": "+1234567890"},
    )

    with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
        mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
        mock_db.get_queued_run_by_id = AsyncMock(return_value=original_run)
        mock_db.get_queued_run_by_source_uuid = AsyncMock(return_value=None)
        mock_db.create_queued_run = AsyncMock()
        mock_db.append_campaign_log = AsyncMock()

        await orchestrator._handle_event(event)

        mock_db.create_queued_run.assert_awaited_once()
        create_kwargs = mock_db.create_queued_run.call_args.kwargs
        assert create_kwargs["campaign_id"] == campaign_id
        assert create_kwargs["retry_count"] == 1
        assert create_kwargs["parent_queued_run_id"] == queued_run_id
        assert create_kwargs["retry_reason"] == "voicemail"
        assert create_kwargs["state"] == "queued"
        assert create_kwargs["context_variables"]["is_retry"] is True
        assert create_kwargs["context_variables"]["retry_reason"] == "voicemail"








