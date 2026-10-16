"""
Tests for api.tasks.campaign_tasks failure handling.

Specifically: each kind of failure that pauses or fails a campaign should
write a specific, identifiable entry into the campaign log so operators
can tell at a glance why a campaign stopped.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.services.campaign.errors import (
    ConcurrentSlotAcquisitionError,
    PhoneNumberPoolExhaustedError,
)
from api.tasks.campaign_tasks import process_campaign_batch, sync_campaign_source


class TestProcessCampaignBatchFailureLogs:
    """``process_campaign_batch`` should log a *specific* event for each
    distinct failure mode, not collapse them all into a generic
    ``batch_failed`` entry."""

    @pytest.mark.asyncio
    async def test_phone_number_pool_exhausted_retries_before_final_pause(self):
        """The first two consecutive pool exhaustion attempts keep the
        campaign running and schedule another batch."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.rate_limiter") as mock_rl,
            patch(
                "api.tasks.campaign_tasks.get_campaign_event_publisher"
            ) as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=PhoneNumberPoolExhaustedError(organization_id=7)
            )
            mock_db.get_campaign_by_id = AsyncMock(
                return_value=MagicMock(state="running", orchestrator_metadata={})
            )
            mock_rl.get_live_slot_count = AsyncMock(return_value=0)
            mock_rl.get_in_use_from_number_count = AsyncMock(return_value=0)
            mock_db.get_active_runs_count_for_campaign = AsyncMock(return_value=0)
            mock_db.increment_campaign_metadata_counter = AsyncMock(return_value=2)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=42)

            mock_db.update_campaign.assert_not_awaited()
            mock_pub.publish_batch_failed.assert_not_awaited()
            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=42,
                processed_count=0,
                failed_count=0,
                batch_size=10,
                metadata={"defer_seconds": 15, "reason": "phone_number_pool_exhausted"},
            )

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["campaign_id"] == 42
            assert kwargs["event"] == "phone_number_pool_exhausted_retry"
            assert kwargs["level"] == "warning"
            assert kwargs["details"]["organization_id"] == 7
            assert kwargs["details"]["attempt"] == 2

    @pytest.mark.asyncio
    async def test_phone_number_pool_exhausted_pauses_on_max_attempts(self):
        """When retries are exhausted and NO active calls are in progress,
        the campaign is PAUSED (not failed) for operator review without raising."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.rate_limiter") as mock_rl,
            patch(
                "api.tasks.campaign_tasks.get_campaign_event_publisher"
            ) as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=PhoneNumberPoolExhaustedError(organization_id=7)
            )
            mock_rl.get_live_slot_count = AsyncMock(return_value=0)
            mock_rl.get_in_use_from_number_count = AsyncMock(return_value=0)
            mock_db.get_active_runs_count_for_campaign = AsyncMock(return_value=0)
            mock_db.increment_campaign_metadata_counter = AsyncMock(return_value=3)
            mock_db.get_campaign_by_id = AsyncMock(
                return_value=MagicMock(state="running", orchestrator_metadata={})
            )
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            # Does NOT raise!
            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=42)

            mock_db.update_campaign.assert_called_once_with(
                campaign_id=42,
                state="paused",
                orchestrator_metadata={"paused_reason": "phone_number_pool_exhausted"},
            )
            mock_pub.publish_batch_failed.assert_awaited_once()

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["campaign_id"] == 42
            assert kwargs["event"] == "campaign_paused_phone_number_pool_exhausted"
            assert kwargs["level"] == "warning"
            assert kwargs["details"]["organization_id"] == 7
            assert kwargs["details"]["attempt"] == 3

    @pytest.mark.asyncio
    async def test_phone_number_pool_exhausted_does_not_pause_while_campaign_call_in_progress(self):
        """When an ongoing call is in progress for this campaign, retry counters are NOT incremented and campaign does NOT pause."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.rate_limiter") as mock_rl,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=PhoneNumberPoolExhaustedError(organization_id=8, telephony_configuration_id=11, campaign_id=67)
            )
            mock_db.get_campaign_by_id = AsyncMock(
                return_value=MagicMock(state="running", orchestrator_metadata={})
            )
            # 1 ongoing call in progress for this campaign
            mock_rl.get_live_slot_count = AsyncMock(return_value=1)
            mock_db.reset_campaign_metadata_counter = AsyncMock()
            mock_db.increment_campaign_metadata_counter = AsyncMock()
            mock_db.update_campaign = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=67)

            # Counter was reset, NOT incremented
            mock_db.reset_campaign_metadata_counter.assert_awaited_once_with(
                campaign_id=67, key="phone_number_pool_exhausted_attempts"
            )
            mock_db.increment_campaign_metadata_counter.assert_not_called()
            # Campaign was NOT paused or failed
            mock_db.update_campaign.assert_not_called()
            # Published batch completed with 15s backoff
            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=67,
                processed_count=0,
                failed_count=0,
                batch_size=10,
                metadata={"defer_seconds": 15, "reason": "campaign_call_in_progress"},
            )

    @pytest.mark.asyncio
    async def test_phone_number_pool_exhausted_does_not_pause_while_pool_numbers_in_use(self):
        """When phone numbers in the pool are in use by active calls (e.g. other calls in org), counter is reset and campaign defers."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.rate_limiter") as mock_rl,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=PhoneNumberPoolExhaustedError(organization_id=8, telephony_configuration_id=11, campaign_id=67)
            )
            mock_db.get_campaign_by_id = AsyncMock(
                return_value=MagicMock(state="running", orchestrator_metadata={})
            )
            mock_rl.get_live_slot_count = AsyncMock(return_value=0)
            mock_db.get_active_runs_count_for_campaign = AsyncMock(return_value=0)
            # 2 numbers in use in pool
            mock_rl.get_in_use_from_number_count = AsyncMock(return_value=2)

            mock_db.reset_campaign_metadata_counter = AsyncMock()
            mock_db.increment_campaign_metadata_counter = AsyncMock()
            mock_db.update_campaign = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=67)

            mock_db.reset_campaign_metadata_counter.assert_awaited_once_with(
                campaign_id=67, key="phone_number_pool_exhausted_attempts"
            )
            mock_db.increment_campaign_metadata_counter.assert_not_called()
            mock_db.update_campaign.assert_not_called()
            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=67,
                processed_count=0,
                failed_count=0,
                batch_size=10,
                metadata={"defer_seconds": 15, "reason": "campaign_call_in_progress"},
            )

    @pytest.mark.asyncio
    async def test_concurrent_slot_timeout_retries_with_backoff(self):
        """When concurrency slot timeout occurs and attempts remain, it logs a retry and defers."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch(
                "api.tasks.campaign_tasks.get_campaign_event_publisher"
            ) as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=ConcurrentSlotAcquisitionError(
                    organization_id=7, campaign_id=42, wait_time=30.0, max_concurrent=5
                )
            )
            mock_db.get_campaign_by_id = AsyncMock(
                return_value=MagicMock(state="running", orchestrator_metadata={})
            )
            mock_db.increment_campaign_metadata_counter = AsyncMock(return_value=1)
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=42)

            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=42,
                processed_count=0,
                failed_count=0,
                batch_size=10,
                metadata={"defer_seconds": 15, "reason": "concurrent_slot_timeout"},
            )
            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["event"] == "concurrent_slot_timeout_retry"
            assert kwargs["details"]["attempt"] == 1

    @pytest.mark.asyncio
    async def test_concurrent_slot_timeout_pauses_campaign_after_max_retries(self):
        """When retries are exhausted, the campaign is paused for operator review."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch(
                "api.tasks.campaign_tasks.get_campaign_event_publisher"
            ) as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=ConcurrentSlotAcquisitionError(
                    organization_id=7, campaign_id=42, wait_time=30.0, max_concurrent=5
                )
            )
            mock_db.increment_campaign_metadata_counter = AsyncMock(return_value=6)
            mock_db.get_campaign_by_id = AsyncMock(
                return_value=MagicMock(state="running", orchestrator_metadata={})
            )
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=42)

            mock_db.update_campaign.assert_called_once_with(
                campaign_id=42,
                state="paused",
                orchestrator_metadata={
                    "paused_reason": "concurrency_limit_exhausted",
                    "paused_max_concurrent": 5,
                },
            )
            mock_pub.publish_batch_failed.assert_awaited_once()
            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["event"] == "campaign_paused_concurrency_limit"
            assert kwargs["details"]["reason"] == "concurrency_limit_exhausted"

    @pytest.mark.asyncio
    async def test_concurrent_slot_timeout_does_not_pause_while_call_in_progress(self):
        """When an ongoing call is in progress for this campaign, retry counters are NOT incremented and campaign does NOT pause."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.rate_limiter") as mock_rl,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=ConcurrentSlotAcquisitionError(
                    organization_id=89, campaign_id=62, wait_time=0.0, max_concurrent=1
                )
            )
            mock_db.get_campaign_by_id = AsyncMock(
                return_value=MagicMock(state="running", orchestrator_metadata={})
            )
            # 1 ongoing call in progress for this campaign
            mock_rl.get_live_slot_count = AsyncMock(return_value=1)
            mock_db.reset_campaign_metadata_counter = AsyncMock()
            mock_db.increment_campaign_metadata_counter = AsyncMock()
            mock_db.update_campaign = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=62)

            # Counter was reset, NOT incremented
            mock_db.reset_campaign_metadata_counter.assert_awaited_once_with(
                campaign_id=62, key="concurrent_slot_timeout_attempts"
            )
            mock_db.increment_campaign_metadata_counter.assert_not_called()
            # Campaign was NOT paused
            mock_db.update_campaign.assert_not_called()
            # Published batch completed with 15s backoff
            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=62,
                processed_count=0,
                failed_count=0,
                batch_size=10,
                metadata={"defer_seconds": 15, "reason": "campaign_call_in_progress"},
            )

    @patch("api.tasks.campaign_tasks.get_campaign_event_publisher")
    @patch("api.tasks.campaign_tasks.db_client")
    @patch("api.tasks.campaign_tasks.campaign_call_dispatcher")
    async def test_rate_limit_timeout_defers_without_failing(
        self, mock_dispatcher, mock_db, mock_get_pub
    ):
        """When rate limit acquisition times out, batch defers cleanly without failing leads or pausing."""
        from api.services.campaign.errors import CampaignRateLimitTimeoutError

        mock_dispatcher.process_batch.side_effect = CampaignRateLimitTimeoutError(
            organization_id=8, campaign_id=69, wait_time=10.0
        )
        mock_db.get_campaign_by_id = AsyncMock(
            return_value=MagicMock(state="running", orchestrator_metadata={})
        )
        mock_db.update_campaign = AsyncMock()
        mock_pub = AsyncMock()
        mock_get_pub.return_value = mock_pub

        await process_campaign_batch({"redis": AsyncMock()}, campaign_id=69)

        # Campaign is NOT marked failed or paused
        mock_db.update_campaign.assert_not_called()
        # Batch completed is published with defer_seconds=5
        mock_pub.publish_batch_completed.assert_awaited_once_with(
            campaign_id=69,
            processed_count=0,
            failed_count=0,
            batch_size=10,
            metadata={"defer_seconds": 5, "reason": "rate_limit_timeout"},
        )

    @patch("api.tasks.campaign_tasks.get_campaign_event_publisher")
    @patch("api.tasks.campaign_tasks.db_client")
    @patch("api.tasks.campaign_tasks.campaign_call_dispatcher")
    async def test_quota_exceeded_pauses_without_raising(
        self, mock_dispatcher, mock_db, mock_get_pub
    ):
        """When quota is depleted, campaign pauses safely and does not raise into ARQ."""
        from api.services.campaign.errors import CampaignQuotaExceededError
        from unittest.mock import MagicMock

        mock_dispatcher.process_batch.side_effect = CampaignQuotaExceededError(
            organization_id=8,
            campaign_id=69,
            error_code="insufficient_credits",
            error_message="Wallet depleted",
        )
        mock_campaign = MagicMock(state="running", orchestrator_metadata={})
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.update_campaign = AsyncMock()
        mock_db.append_campaign_log = AsyncMock()
        mock_pub = AsyncMock()
        mock_get_pub.return_value = mock_pub

        # Must NOT raise exception
        await process_campaign_batch({"redis": AsyncMock()}, campaign_id=69)

        # Paused safely
        mock_db.update_campaign.assert_awaited_once_with(
            campaign_id=69,
            state="paused",
            orchestrator_metadata={"paused_reason": "wallet_depleted"},
        )
        mock_pub.publish_batch_failed.assert_awaited_once()


class TestSyncCampaignSourceStateHandling:
    """Tests ensuring sync_campaign_source respects campaigns paused or modified
    during background sync and never clobbers their state or triggers unauthorized calls."""

    @pytest.mark.asyncio
    async def test_sync_maintains_paused_state_when_campaign_paused_during_sync(self):
        """When an operator pauses a syncing campaign, completing sync must NOT clobber
        paused state to running and must NOT publish sync_completed."""
        campaign_initial = MagicMock()
        campaign_initial.id = 101
        campaign_initial.source_type = "csv"
        campaign_initial.source_id = "test.csv"
        campaign_initial.state = "syncing"

        campaign_paused = MagicMock()
        campaign_paused.id = 101
        campaign_paused.source_type = "csv"
        campaign_paused.source_id = "test.csv"
        campaign_paused.state = "paused"

        with (
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_sync_service") as mock_get_sync,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            # First fetch returns campaign in syncing state; second fetch (after sync) returns paused
            mock_db.get_campaign_by_id = AsyncMock(side_effect=[campaign_initial, campaign_paused])
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()

            mock_sync = AsyncMock()
            mock_sync.sync_source_data = AsyncMock(return_value=150)
            mock_get_sync.return_value = mock_sync

            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await sync_campaign_source({}, campaign_id=101)

            # Verification:
            # 1. Database was updated with completed source sync, but state was NOT set to 'running'
            mock_db.update_campaign.assert_awaited_once()
            call_kwargs = mock_db.update_campaign.call_args.kwargs
            assert call_kwargs["campaign_id"] == 101
            assert call_kwargs["source_sync_status"] == "completed"
            assert "state" not in call_kwargs

            # 2. Sync completed event was NOT published (so batch scheduling never starts)
            mock_pub.publish_sync_completed.assert_not_called()

            # 3. Campaign log reflects that contacts synced while campaign remained paused
            mock_db.append_campaign_log.assert_awaited_once()
            log_kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert log_kwargs["campaign_id"] == 101
            assert log_kwargs["event"] == "campaign_source_synced"
            assert log_kwargs["details"]["state"] == "paused"
            assert log_kwargs["details"]["total_rows"] == 150

    @pytest.mark.asyncio
    async def test_sync_maintains_paused_state_when_zero_rows_found(self):
        """When 0 rows are found and campaign was paused, campaign stays paused rather than completing."""
        campaign_initial = MagicMock()
        campaign_initial.id = 102
        campaign_initial.source_type = "csv"
        campaign_initial.source_id = "empty.csv"
        campaign_initial.state = "syncing"

        campaign_paused = MagicMock()
        campaign_paused.id = 102
        campaign_paused.source_type = "csv"
        campaign_paused.source_id = "empty.csv"
        campaign_paused.state = "paused"

        with (
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_sync_service") as mock_get_sync,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_db.get_campaign_by_id = AsyncMock(side_effect=[campaign_initial, campaign_paused])
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()

            mock_sync = AsyncMock()
            mock_sync.sync_source_data = AsyncMock(return_value=0)
            mock_get_sync.return_value = mock_sync

            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await sync_campaign_source({}, campaign_id=102)

            mock_db.update_campaign.assert_awaited_once()
            call_kwargs = mock_db.update_campaign.call_args.kwargs
            assert call_kwargs["campaign_id"] == 102
            assert call_kwargs["source_sync_status"] == "completed"
            assert "state" not in call_kwargs

            mock_pub.publish_sync_completed.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_does_not_clobber_terminal_state(self):
        """When a campaign was cancelled/failed during sync, sync completion does not revert it to running."""
        campaign_initial = MagicMock()
        campaign_initial.id = 103
        campaign_initial.source_type = "csv"
        campaign_initial.source_id = "test.csv"
        campaign_initial.state = "syncing"

        campaign_failed = MagicMock()
        campaign_failed.id = 103
        campaign_failed.source_type = "csv"
        campaign_failed.source_id = "test.csv"
        campaign_failed.state = "failed"

        with (
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_sync_service") as mock_get_sync,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_db.get_campaign_by_id = AsyncMock(side_effect=[campaign_initial, campaign_failed])
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()

            mock_sync = AsyncMock()
            mock_sync.sync_source_data = AsyncMock(return_value=80)
            mock_get_sync.return_value = mock_sync

            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await sync_campaign_source({}, campaign_id=103)

            mock_db.update_campaign.assert_awaited_once()
            call_kwargs = mock_db.update_campaign.call_args.kwargs
            assert call_kwargs["campaign_id"] == 103
            assert call_kwargs["source_sync_status"] == "completed"
            assert "state" not in call_kwargs

            mock_pub.publish_sync_completed.assert_not_called()


class TestProcessCampaignBatchStateHandling:
    """Verifies process_campaign_batch skips execution if the campaign is paused or not found."""

    @pytest.mark.asyncio
    async def test_process_campaign_batch_skips_when_campaign_paused(self):
        """Paused campaign batch task should exit early without calling dispatcher or publishing events."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_campaign = MagicMock(id=55, state="paused")
            mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=55)

            mock_disp.process_batch.assert_not_called()
            mock_pub.publish_batch_completed.assert_not_called()
            mock_pub.publish_batch_failed.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_campaign_batch_skips_when_campaign_not_found(self):
        """Missing campaign batch task should exit early without error."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_db.get_campaign_by_id = AsyncMock(return_value=None)
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": AsyncMock()}, campaign_id=55)

            mock_disp.process_batch.assert_not_called()
            mock_pub.publish_batch_completed.assert_not_called()
            mock_pub.publish_batch_failed.assert_not_called()


class TestProcessCampaignBatchConsecutiveFailures:
    """Verifies that transient worker errors defer with backoff up to 3 times before failing the campaign."""

    @pytest.mark.asyncio
    async def test_transient_worker_error_defers_and_keeps_campaign_running(self):
        """A single transient worker error defers the batch for 15s without failing the campaign."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_redis = AsyncMock()
            mock_redis.set = AsyncMock(return_value=True)  # Lock acquired
            mock_redis.incr = AsyncMock(return_value=1)     # Attempt 1
            mock_redis.expire = AsyncMock()

            mock_disp.process_batch = AsyncMock(side_effect=RuntimeError("Transient DB connection blip"))
            mock_db.get_campaign_by_id = AsyncMock(return_value=MagicMock(id=77, state="running"))
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            with pytest.raises(RuntimeError, match="Transient DB connection blip"):
                await process_campaign_batch({"redis": mock_redis}, campaign_id=77)

            # Campaign must NOT be transitioned to "failed"
            mock_db.update_campaign.assert_not_called()
            mock_pub.publish_batch_failed.assert_not_called()

            # Batch completed event published with retry backoff
            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=77,
                processed_count=0,
                failed_count=0,
                batch_size=10,
                metadata={"defer_seconds": 15, "reason": "batch_transient_failure_retry"},
            )
            mock_db.append_campaign_log.assert_called_once()
            log_kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert log_kwargs["event"] == "batch_transient_failure_retry"
            assert log_kwargs["details"]["failures"] == 1

    @pytest.mark.asyncio
    async def test_consecutive_worker_errors_fails_campaign_after_3_attempts(self):
        """When worker errors reach 3 consecutive failures, campaign state is set to 'failed'."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_redis = AsyncMock()
            mock_redis.set = AsyncMock(return_value=True)  # Lock acquired
            mock_redis.incr = AsyncMock(return_value=3)     # Attempt 3 (threshold reached)
            mock_redis.expire = AsyncMock()

            mock_disp.process_batch = AsyncMock(side_effect=RuntimeError("Persistent unrecoverable crash"))
            mock_db.get_campaign_by_id = AsyncMock(return_value=MagicMock(id=77, state="running"))
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            with pytest.raises(RuntimeError, match="Persistent unrecoverable crash"):
                await process_campaign_batch({"redis": mock_redis}, campaign_id=77)

            # Campaign MUST now be failed
            mock_db.update_campaign.assert_called_once_with(campaign_id=77, state="failed")
            mock_pub.publish_batch_failed.assert_awaited_once_with(
                campaign_id=77,
                error="Persistent unrecoverable crash",
                processed_count=0,
            )
            mock_pub.publish_batch_completed.assert_not_called()
            mock_db.append_campaign_log.assert_called_once()
            log_kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert log_kwargs["event"] == "batch_failed"
            assert log_kwargs["details"]["failures"] == 3

    @pytest.mark.asyncio
    async def test_fallback_to_db_counter_when_redis_fails(self):
        """When Redis is unavailable or fails, fallback to increment_campaign_metadata_counter."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_redis = AsyncMock()
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.incr = AsyncMock(side_effect=Exception("Redis connection refused"))

            mock_disp.process_batch = AsyncMock(side_effect=RuntimeError("Worker error with Redis down"))
            mock_db.get_campaign_by_id = AsyncMock(return_value=MagicMock(id=77, state="running"))
            mock_db.increment_campaign_metadata_counter = AsyncMock(return_value=2)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            with pytest.raises(RuntimeError, match="Worker error with Redis down"):
                await process_campaign_batch({"redis": mock_redis}, campaign_id=77)

            mock_db.increment_campaign_metadata_counter.assert_awaited_once_with(
                campaign_id=77, key="consecutive_batch_failures"
            )
            # 2 < 3, so campaign is not marked as failed
            mock_db.update_campaign.assert_not_called()
            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=77,
                processed_count=0,
                failed_count=0,
                batch_size=10,
                metadata={"defer_seconds": 15, "reason": "batch_transient_failure_retry"},
            )

    @pytest.mark.asyncio
    async def test_successful_batch_resets_consecutive_failure_counters(self):
        """A successful batch resets the consecutive batch failures counter in both DB and Redis."""
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_redis = AsyncMock()
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.delete = AsyncMock()

            mock_disp.process_batch = AsyncMock(return_value=5)
            mock_db.get_campaign_by_id = AsyncMock(return_value=MagicMock(id=77, state="running"))
            mock_db.reset_campaign_metadata_counter = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({"redis": mock_redis}, campaign_id=77)

            mock_db.reset_campaign_metadata_counter.assert_any_await(
                campaign_id=77, key="consecutive_batch_failures"
            )
            mock_redis.delete.assert_any_await("campaign:consecutive_batch_failures:77")



