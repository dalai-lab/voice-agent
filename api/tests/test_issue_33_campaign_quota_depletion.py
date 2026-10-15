"""
Unit tests for Issue 33: Campaign Call Dispatcher Transient/Persistent Quota Depletion.

Verifies:
1. When authorize_workflow_run_start fails, dispatch_call detaches workflow_run
   (queued_run_id=None), marks it completed, releases concurrency/phone slots,
   reverts queued_run to state="queued", and raises CampaignQuotaExceededError.
2. In process_batch, catching CampaignQuotaExceededError returns all unprocessed
   claimed runs to state="queued" and aborts the batch loop immediately without
   marking any queued runs as failed.
3. In process_campaign_batch:
   - Transient errors (concurrency_limit_exceeded, insufficient_reserve,
     billing_service_unavailable) retry up to 5 times.
   - Persistent depletion (insufficient_quota, master_suspended, etc.) or exhausted
     retries pauses the campaign (state="paused", paused_reason="wallet_depleted")
     without failing contact leads.
"""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from api.db.models import QueuedRunModel, WorkflowRunModel
from api.enums import WorkflowRunState
from api.services.campaign.campaign_call_dispatcher import CampaignCallDispatcher
from api.services.campaign.errors import CampaignQuotaExceededError
from api.services.quota_service import QuotaCheckResult
from api.tasks.campaign_tasks import (
    CAMPAIGN_QUOTA_RETRY_COUNTER_KEY,
    MAX_CAMPAIGN_QUOTA_RETRY_ATTEMPTS,
    process_campaign_batch,
)


class TestCampaignCallDispatcherQuotaHandling:
    @pytest.mark.asyncio
    async def test_dispatch_call_quota_failure_detaches_workflow_and_reverts_queued_run(self):
        dispatcher = CampaignCallDispatcher()

        campaign = MagicMock()
        campaign.id = 42
        campaign.organization_id = 7
        campaign.workflow_id = 100
        campaign.created_by = 1
        campaign.telephony_configuration_id = 10

        queued_run = MagicMock(spec=QueuedRunModel)
        queued_run.id = 101
        queued_run.source_uuid = "uuid-101"
        queued_run.context_variables = {"phone_number": "+1234567890"}
        queued_run.retry_reason = None

        workflow = MagicMock()
        workflow.definition_id = 5

        workflow_run = MagicMock(spec=WorkflowRunModel)
        workflow_run.id = 501
        workflow_run.logs = {}

        provider = MagicMock()
        provider.PROVIDER_NAME = "twilio"
        provider.from_numbers = ["+1987654321"]

        with (
            patch("api.services.campaign.campaign_call_dispatcher.db_client") as mock_db,
            patch("api.services.campaign.campaign_call_dispatcher.rate_limiter") as mock_rl,
            patch("api.services.campaign.campaign_call_dispatcher.call_concurrency") as mock_cc,
            patch("api.services.campaign.campaign_call_dispatcher.authorize_workflow_run_start") as mock_auth,
            patch.object(dispatcher, "get_provider_for_campaign", AsyncMock(return_value=provider)),
            patch("api.services.campaign.campaign_call_dispatcher.prepare_workflow_run_inputs", AsyncMock(return_value=MagicMock(definition_id=5))),
            patch.object(dispatcher, "release_call_slot", AsyncMock(return_value=True)) as mock_release_slot,
        ):
            mock_db.get_workflow = AsyncMock(return_value=workflow)
            mock_db.create_workflow_run = AsyncMock(return_value=workflow_run)
            mock_db.update_workflow_run = AsyncMock(return_value=workflow_run)
            mock_db.update_queued_run = AsyncMock()

            mock_rl.acquire_from_number = AsyncMock(return_value="+1987654321")
            mock_rl.store_workflow_from_number_mapping = AsyncMock()

            mock_auth.return_value = QuotaCheckResult(
                has_quota=False,
                error_code="insufficient_quota",
                error_message="Talkar wallet balance is exhausted.",
            )

            with pytest.raises(CampaignQuotaExceededError) as exc_info:
                await dispatcher.dispatch_call(queued_run, campaign, concurrency_slot=None)

            assert exc_info.value.organization_id == 7
            assert exc_info.value.campaign_id == 42
            assert exc_info.value.error_code == "insufficient_quota"

            # Workflow run should be detached and marked completed
            mock_db.update_workflow_run.assert_awaited_once_with(
                run_id=501,
                is_completed=True,
                state=WorkflowRunState.COMPLETED.value,
                gathered_context={
                    "error": "Talkar wallet balance is exhausted.",
                    "error_code": "insufficient_quota",
                },
                queued_run_id=None,
            )

            # Slot must be released
            mock_release_slot.assert_awaited_once_with(501)

            # Current queued run must be reverted to queued, NOT marked failed!
            mock_db.update_queued_run.assert_awaited_once_with(
                queued_run_id=101,
                state="queued",
            )

    @pytest.mark.asyncio
    async def test_process_batch_aborts_and_reverts_unprocessed_claims_on_quota_failure(self):
        dispatcher = CampaignCallDispatcher()

        campaign = MagicMock()
        campaign.id = 42
        campaign.state = "running"
        campaign.organization_id = 7
        campaign.workflow_id = 100
        campaign.rate_limit_per_second = 1
        campaign.telephony_configuration_id = 10

        queued_runs = [
            MagicMock(spec=QueuedRunModel, id=101, retry_reason=None),
            MagicMock(spec=QueuedRunModel, id=102, retry_reason=None),
            MagicMock(spec=QueuedRunModel, id=103, retry_reason=None),
        ]

        provider = MagicMock()
        provider.from_numbers = ["+1987654321"]

        with (
            patch("api.services.campaign.campaign_call_dispatcher.db_client") as mock_db,
            patch.object(dispatcher, "get_provider_for_campaign", AsyncMock(return_value=provider)),
            patch.object(dispatcher, "apply_rate_limit", AsyncMock()),
            patch.object(dispatcher, "acquire_concurrent_slot", AsyncMock(return_value=None)),
            patch.object(
                dispatcher,
                "dispatch_call",
                AsyncMock(
                    side_effect=CampaignQuotaExceededError(
                        organization_id=7,
                        campaign_id=42,
                        error_code="insufficient_quota",
                        error_message="Talkar wallet balance is exhausted.",
                    )
                ),
            ),
        ):
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.claim_queued_runs_for_processing = AsyncMock(return_value=queued_runs)
            mock_db.return_processing_queued_runs_without_workflow = AsyncMock(return_value=3)
            mock_db.update_queued_run = AsyncMock()

            with pytest.raises(CampaignQuotaExceededError):
                await dispatcher.process_batch(campaign_id=42, batch_size=3)

            # Crucial: update_queued_run must NEVER be called with state="failed"
            for call in mock_db.update_queued_run.call_args_list:
                assert call.kwargs.get("state") != "failed"

            # All claimed queued runs must be returned
            mock_db.return_processing_queued_runs_without_workflow.assert_awaited_once_with(
                [101, 102, 103]
            )


class TestProcessCampaignBatchQuotaHandling:
    @pytest.mark.asyncio
    async def test_process_campaign_batch_retries_transient_quota_error(self):
        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=CampaignQuotaExceededError(
                    organization_id=7,
                    campaign_id=42,
                    error_code="concurrency_limit_exceeded",
                    error_message="Concurrent call limit reached.",
                )
            )
            mock_db.increment_campaign_metadata_counter = AsyncMock(return_value=2)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            await process_campaign_batch({}, campaign_id=42)

            mock_db.update_campaign.assert_not_awaited()
            mock_pub.publish_batch_failed.assert_not_awaited()
            mock_pub.publish_batch_completed.assert_awaited_once_with(
                campaign_id=42,
                processed_count=0,
                failed_count=0,
                batch_size=10,
            )

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["campaign_id"] == 42
            assert kwargs["event"] == "campaign_quota_transient_retry"
            assert kwargs["level"] == "warning"
            assert kwargs["details"]["error_code"] == "concurrency_limit_exceeded"
            assert kwargs["details"]["attempt"] == 2

    @pytest.mark.asyncio
    async def test_process_campaign_batch_pauses_on_persistent_wallet_depletion(self):
        campaign = MagicMock()
        campaign.id = 42
        campaign.orchestrator_metadata = {}

        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=CampaignQuotaExceededError(
                    organization_id=7,
                    campaign_id=42,
                    error_code="insufficient_quota",
                    error_message="Talkar wallet balance is exhausted.",
                )
            )
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            with pytest.raises(CampaignQuotaExceededError):
                await process_campaign_batch({}, campaign_id=42)

            # Campaign must be PAUSED, never marked as failed!
            mock_db.update_campaign.assert_awaited_once_with(
                campaign_id=42,
                state="paused",
                orchestrator_metadata={"paused_reason": "wallet_depleted"},
            )

            mock_pub.publish_batch_failed.assert_awaited_once_with(
                campaign_id=42,
                error="Campaign paused due to quota check failure: [insufficient_quota] Talkar wallet balance is exhausted.",
                processed_count=0,
            )

            mock_db.append_campaign_log.assert_called_once()
            kwargs = mock_db.append_campaign_log.call_args.kwargs
            assert kwargs["event"] == "campaign_paused_quota_exhausted"
            assert kwargs["level"] == "warning"
            assert kwargs["details"]["error_code"] == "insufficient_quota"

    @pytest.mark.asyncio
    async def test_process_campaign_batch_pauses_when_transient_retries_exhausted(self):
        campaign = MagicMock()
        campaign.id = 42
        campaign.orchestrator_metadata = {}

        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=CampaignQuotaExceededError(
                    organization_id=7,
                    campaign_id=42,
                    error_code="insufficient_reserve",
                    error_message="Insufficient wallet reserve for active concurrent calls.",
                )
            )
            mock_db.increment_campaign_metadata_counter = AsyncMock(return_value=5)
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            with pytest.raises(CampaignQuotaExceededError):
                await process_campaign_batch({}, campaign_id=42)

            # On 5th attempt, campaign is paused
            mock_db.update_campaign.assert_awaited_once_with(
                campaign_id=42,
                state="paused",
                orchestrator_metadata={"paused_reason": "wallet_depleted"},
            )
            mock_pub.publish_batch_failed.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_process_campaign_batch_pauses_with_policy_suspended(self):
        """Verify Blocker 29: customer_status_suspended sets paused_reason='policy_suspended'."""
        campaign = MagicMock(id=42, orchestrator_metadata={})

        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=CampaignQuotaExceededError(
                    organization_id=7,
                    campaign_id=42,
                    error_code="customer_status_suspended",
                    error_message="Account is currently suspended. Please contact support or resolve billing issues.",
                )
            )
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            with pytest.raises(CampaignQuotaExceededError):
                await process_campaign_batch({}, campaign_id=42)

            mock_db.update_campaign.assert_awaited_once_with(
                campaign_id=42,
                state="paused",
                orchestrator_metadata={"paused_reason": "policy_suspended"},
            )
            mock_db.append_campaign_log.assert_called_once()
            assert mock_db.append_campaign_log.call_args.kwargs["event"] == "campaign_paused_policy_suspended"

    @pytest.mark.asyncio
    async def test_process_campaign_batch_pauses_with_spending_cap_exceeded(self):
        """Verify Blocker 29: spending_cap_exceeded sets paused_reason='spending_cap_exceeded'."""
        campaign = MagicMock(id=42, orchestrator_metadata={})

        with (
            patch("api.tasks.campaign_tasks.campaign_call_dispatcher") as mock_disp,
            patch("api.tasks.campaign_tasks.db_client") as mock_db,
            patch("api.tasks.campaign_tasks.get_campaign_event_publisher") as mock_get_pub,
        ):
            mock_disp.process_batch = AsyncMock(
                side_effect=CampaignQuotaExceededError(
                    organization_id=7,
                    campaign_id=42,
                    error_code="spending_cap_exceeded",
                    error_message="Monthly spending cap exceeded (120/100 INR).",
                )
            )
            mock_db.get_campaign_by_id = AsyncMock(return_value=campaign)
            mock_db.update_campaign = AsyncMock()
            mock_db.append_campaign_log = AsyncMock()
            mock_pub = AsyncMock()
            mock_get_pub.return_value = mock_pub

            with pytest.raises(CampaignQuotaExceededError):
                await process_campaign_batch({}, campaign_id=42)

            mock_db.update_campaign.assert_awaited_once_with(
                campaign_id=42,
                state="paused",
                orchestrator_metadata={"paused_reason": "spending_cap_exceeded"},
            )
            assert mock_db.append_campaign_log.call_args.kwargs["event"] == "campaign_paused_spending_cap_exceeded"

    @pytest.mark.asyncio
    async def test_quota_service_distinct_error_messages(self):
        """Verify Blocker 29: quota_service maps suspended, under_review, and spending_cap_exceeded to distinct messages."""
        from api.services.quota_service import _authorize_talkar_workflow_run_start

        test_cases = [
            ("customer_status_suspended", "Account is currently suspended. Please contact support or resolve billing issues."),
            ("customer_status_under_review", "Account is currently under review by administration."),
            ("spending_cap_exceeded", "Monthly spending cap exceeded (150/100 INR)."),
        ]

        for code, expected_substring in test_cases:
            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_payload = {"has_quota": False, "reason": code}
                if code == "spending_cap_exceeded":
                    mock_payload["month_spend_paise"] = 15000
                    mock_payload["monthly_spending_cap_paise"] = 10000
                mock_resp.json.return_value = mock_payload
                mock_client.post.return_value = mock_resp
                mock_client_cls.return_value.__aenter__.return_value = mock_client

                with patch("api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id", AsyncMock(return_value=100)):
                    res = await _authorize_talkar_workflow_run_start(organization_id=10, workflow_run_id=1)
                    assert res.has_quota is False
                    assert res.error_code == code
                    assert expected_substring in res.error_message

