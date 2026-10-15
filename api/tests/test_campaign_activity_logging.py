"""Tests for Campaign Activity Logging & Edge-Triggered Schedule Transitions."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from api.db.models import CampaignModel
from api.services.campaign.campaign_orchestrator import CampaignOrchestrator
from api.services.campaign.runner import CampaignRunnerService
from api.tasks.campaign_tasks import sync_campaign_source


@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    # In-memory store for Redis keys to test atomic swap behavior
    store = {}

    async def mock_set(key, val, get=False, nx=False, ex=None):
        old = store.get(key)
        if nx and key in store:
            return False
        store[key] = val
        if get:
            return old
        return True

    async def mock_delete(*keys):
        for k in keys:
            store.pop(k, None)
        return len(keys)

    redis.set.side_effect = mock_set
    redis.delete.side_effect = mock_delete
    redis._store = store
    return redis


class TestScheduleWindowActivityLogging:
    @pytest.mark.asyncio
    async def test_schedule_transition_edge_triggered(self, mock_redis):
        """Test that schedule window open/close events are logged strictly on transitions
        and do not spam the database on subsequent checks."""
        orchestrator = CampaignOrchestrator(mock_redis)

        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 101
        campaign.state = "running"
        campaign.orchestrator_metadata = {
            "schedule_config": {
                "enabled": True,
                "timezone": "America/New_York",
                "slots": [{"day_of_week": 0, "start_time": "09:00", "end_time": "17:00"}],
            }
        }

        with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
            mock_db.append_campaign_log = AsyncMock()

            # 1. First check while outside window (e.g. campaign started at night)
            with patch.object(orchestrator, "_is_within_schedule", return_value=False):
                res = await orchestrator._check_and_log_schedule_transition(campaign)
                assert res is False
                assert mock_db.append_campaign_log.call_count == 1
                kwargs = mock_db.append_campaign_log.call_args.kwargs
                assert kwargs["campaign_id"] == 101
                assert kwargs["event"] == "schedule_window_closed"
                assert kwargs["level"] == "info"

            # 2. Subsequent checks while still outside window (Cron ticking every 5 seconds)
            # Should NOT log again! (Prevent log flooding)
            mock_db.append_campaign_log.reset_mock()
            with patch.object(orchestrator, "_is_within_schedule", return_value=False):
                for _ in range(10):
                    res = await orchestrator._check_and_log_schedule_transition(campaign)
                    assert res is False
                assert mock_db.append_campaign_log.call_count == 0

            # 3. Clock enters window (9:00 AM) -> should trigger schedule_window_opened ONCE
            mock_db.append_campaign_log.reset_mock()
            with patch.object(orchestrator, "_is_within_schedule", return_value=True):
                res = await orchestrator._check_and_log_schedule_transition(campaign)
                assert res is True
                assert mock_db.append_campaign_log.call_count == 1
                kwargs = mock_db.append_campaign_log.call_args.kwargs
                assert kwargs["campaign_id"] == 101
                assert kwargs["event"] == "schedule_window_opened"
                assert kwargs["level"] == "info"

            # 4. Subsequent checks while still inside window -> should NOT log again
            mock_db.append_campaign_log.reset_mock()
            with patch.object(orchestrator, "_is_within_schedule", return_value=True):
                for _ in range(5):
                    res = await orchestrator._check_and_log_schedule_transition(campaign)
                    assert res is True
                assert mock_db.append_campaign_log.call_count == 0

            # 5. Clock leaves window (5:01 PM) -> should trigger schedule_window_closed ONCE
            mock_db.append_campaign_log.reset_mock()
            with patch.object(orchestrator, "_is_within_schedule", return_value=False):
                res = await orchestrator._check_and_log_schedule_transition(campaign)
                assert res is False
                assert mock_db.append_campaign_log.call_count == 1
                kwargs = mock_db.append_campaign_log.call_args.kwargs
                assert kwargs["event"] == "schedule_window_closed"

    @pytest.mark.asyncio
    async def test_no_schedule_config_never_logs(self, mock_redis):
        """Campaign without schedule config runs unrestricted and never logs schedule events."""
        orchestrator = CampaignOrchestrator(mock_redis)
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 102
        campaign.state = "running"
        campaign.orchestrator_metadata = {}

        with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
            mock_db.append_campaign_log = AsyncMock()
            res = await orchestrator._check_and_log_schedule_transition(campaign)
            assert res is True
            mock_db.append_campaign_log.assert_not_called()


class TestCampaignRunnerActivityLogging:
    @pytest.mark.asyncio
    async def test_start_campaign_logs_started(self):
        runner = CampaignRunnerService()
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 201
        campaign.state = "created"
        campaign.source_type = "csv"
        campaign.source_id = 99
        campaign.orchestrator_metadata = {}

        with (
            patch("api.services.campaign.runner.db_client") as mock_db,
            patch("api.services.campaign.runner.enqueue_job", new_callable=AsyncMock),
        ):
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()

            await runner.start_campaign(201)

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["campaign_id"] == 201
            assert kwargs["event"] == "campaign_started"
            assert kwargs["level"] == "info"
            assert kwargs["details"]["source_type"] == "csv"

    @pytest.mark.asyncio
    async def test_start_redial_campaign_logs_redial_started(self):
        runner = CampaignRunnerService()
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 202
        campaign.state = "created"
        campaign.source_type = "redial"
        campaign.source_id = None
        campaign.total_rows = 45
        campaign.orchestrator_metadata = {"parent_campaign_id": 100}

        with (
            patch("api.services.campaign.runner.db_client") as mock_db,
            patch("api.services.campaign.runner.get_campaign_event_publisher") as mock_pub,
        ):
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_publisher = AsyncMock()
            mock_pub.return_value = mock_publisher

            await runner.start_campaign(202)

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["campaign_id"] == 202
            assert kwargs["event"] == "campaign_started"
            assert kwargs["details"]["is_redial"] is True
            assert kwargs["details"]["parent_campaign_id"] == 100

    @pytest.mark.asyncio
    async def test_pause_and_resume_logs_manual_events(self):
        runner = CampaignRunnerService()
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 203
        campaign.state = "running"
        campaign.orchestrator_metadata = {"paused_reason": "wallet_depleted"}

        with (
            patch("api.services.campaign.runner.db_client") as mock_db,
            patch("api.services.campaign.runner.circuit_breaker") as mock_cb,
            patch("api.services.campaign.runner.get_campaign_event_publisher") as mock_pub,
        ):
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_db.reset_campaign_metadata_counter = AsyncMock()
            mock_cb.reset = AsyncMock()
            mock_pub.return_value = AsyncMock()

            # Test pause
            await runner.pause_campaign(203)
            assert mock_db.append_campaign_log.call_count == 1
            pause_kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert pause_kwargs["event"] == "campaign_paused_manual"

            # Test resume
            campaign.state = "paused"
            mock_db.append_campaign_log.reset_mock()
            await runner.resume_campaign(203)
            assert mock_db.append_campaign_log.call_count == 1
            resume_kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert resume_kwargs["event"] == "campaign_resumed_manual"
            assert resume_kwargs["details"]["previous_paused_reason"] == "wallet_depleted"


class TestSourceSyncAndCompletionLogging:
    @pytest.mark.asyncio
    async def test_sync_campaign_source_success_logs(self):
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 301
        campaign.source_type = "csv"
        campaign.source_id = 12

        with (
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_sync_service") as mock_get_sync,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_pub,
        ):
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_sync = AsyncMock()
            mock_sync.sync_source_data = AsyncMock(return_value=120)
            mock_get_sync.return_value = mock_sync
            mock_pub.return_value = AsyncMock()

            await sync_campaign_source({}, 301)

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["campaign_id"] == 301
            assert kwargs["event"] == "campaign_source_synced"
            assert kwargs["details"]["total_rows"] == 120

    @pytest.mark.asyncio
    async def test_sync_campaign_source_zero_rows_logs_completion(self):
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 302
        campaign.source_type = "csv"
        campaign.source_id = 13

        with (
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_sync_service") as mock_get_sync,
        ):
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_sync = AsyncMock()
            mock_sync.sync_source_data = AsyncMock(return_value=0)
            mock_get_sync.return_value = mock_sync

            await sync_campaign_source({}, 302)

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["campaign_id"] == 302
            assert kwargs["event"] == "campaign_completed"
            assert kwargs["details"]["total_rows"] == 0

    @pytest.mark.asyncio
    async def test_orchestrator_complete_campaign_logs_completion(self, mock_redis):
        orchestrator = CampaignOrchestrator(mock_redis)
        campaign = MagicMock(spec=CampaignModel)
        campaign.id = 401
        campaign.started_at = datetime.now(UTC)
        campaign.total_rows = 50
        campaign.processed_rows = 50
        campaign.failed_rows = 5

        with patch("api.services.campaign.campaign_orchestrator.db_client") as mock_db:
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            with patch.object(orchestrator, "_has_any_remaining_work", return_value=False):
                orchestrator.publisher.publish_campaign_completed = AsyncMock()
                await orchestrator._complete_campaign(campaign)

                mock_db.append_campaign_log.assert_called_once()
                kwargs = mock_db.append_campaign_log.call_args.kwargs
                assert kwargs["campaign_id"] == 401
                assert kwargs["event"] == "campaign_completed"
                assert kwargs["details"]["processed_rows"] == 50
                assert kwargs["details"]["failed_rows"] == 5
