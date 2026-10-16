from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException

from api.routes.campaign import start_campaign, resume_campaign
from api.services.quota_service import (
    QuotaCheckResult,
    _authorize_talkar_workflow_run_start,
)


class TestCampaignPreflightQuota:
    @pytest.fixture
    def mock_user(self):
        return SimpleNamespace(
            id=1,
            selected_organization_id=8,
        )

    @pytest.fixture
    def mock_campaign(self):
        return SimpleNamespace(
            id=42,
            workflow_id=10,
            organization_id=8,
            state="created",
            telephony_configuration_id=11,
            total_rows=100,
            processed_rows=0,
            source_type="csv",
            source_id="csv_123",
            campaign_name="Test Campaign",
            name="Test Campaign",
            orchestrator_metadata={},
            created_at=None,
            updated_at=None,
            started_at=None,
            completed_at=None,
            failed_rows=0,
            timezone="UTC",
            schedule=None,
            retry_config=None,
            voice_agent_id=10,
        )

    @pytest.mark.asyncio
    async def test_start_campaign_passes_check_concurrency_false_and_ignores_concurrency_limit(
        self, mock_user, mock_campaign
    ):
        with (
            patch("api.routes.campaign.db_client") as mock_db,
            patch(
                "api.routes.campaign.authorize_workflow_run_start", new_callable=AsyncMock
            ) as mock_auth,
            patch("api.routes.campaign.campaign_runner_service") as mock_runner,
            patch("api.routes.campaign._get_campaign_stats", new_callable=AsyncMock) as mock_stats,
            patch(
                "api.routes.campaign._get_telephony_configuration_name",
                new_callable=AsyncMock,
            ) as mock_cfg_name,
            patch("api.routes.campaign._build_campaign_response") as mock_build_resp,
        ):
            mock_db.list_telephony_configurations = AsyncMock(return_value=[{"id": 11}])
            mock_db.get_campaign = AsyncMock(return_value=mock_campaign)
            mock_db.get_workflow_name = AsyncMock(return_value="Test Workflow")
            mock_runner.start_campaign = AsyncMock()
            mock_runner.resume_campaign = AsyncMock()
            mock_stats.return_value = (0, 100)
            mock_cfg_name.return_value = "Mock Telephony"
            mock_build_resp.return_value = {"id": 42, "state": "running"}

            # Simulate Talkar returning concurrency_limit_exceeded (e.g. 4/2)
            mock_auth.return_value = QuotaCheckResult(
                has_quota=False,
                error_code="concurrency_limit_exceeded",
                error_message="Concurrent call limit reached (4/2).",
            )

            # Starting the campaign must succeed without throwing HTTPException(402)
            await start_campaign(campaign_id=42, user=mock_user)

            # Verify authorize_workflow_run_start was called with check_concurrency=False
            mock_auth.assert_awaited_once_with(
                workflow_id=mock_campaign.workflow_id,
                organization_id=mock_user.selected_organization_id,
                actor_user=mock_user,
                check_concurrency=False,
            )
            mock_runner.start_campaign.assert_awaited_once_with(42)

    @pytest.mark.asyncio
    async def test_start_campaign_raises_402_on_wallet_depletion(
        self, mock_user, mock_campaign
    ):
        with (
            patch("api.routes.campaign.db_client") as mock_db,
            patch(
                "api.routes.campaign.authorize_workflow_run_start", new_callable=AsyncMock
            ) as mock_auth,
            patch("api.routes.campaign.campaign_runner_service") as mock_runner,
        ):
            mock_db.list_telephony_configurations = AsyncMock(return_value=[{"id": 11}])
            mock_db.get_campaign = AsyncMock(return_value=mock_campaign)
            mock_runner.start_campaign = AsyncMock()

            mock_auth.return_value = QuotaCheckResult(
                has_quota=False,
                error_code="insufficient_balance",
                error_message="Talkar wallet balance is exhausted.",
            )

            with pytest.raises(HTTPException) as exc_info:
                await start_campaign(campaign_id=42, user=mock_user)

            assert exc_info.value.status_code == 402
            assert "Talkar wallet balance is exhausted" in str(exc_info.value.detail)
            mock_runner.start_campaign.assert_not_called()

    @pytest.mark.asyncio
    async def test_resume_campaign_passes_check_concurrency_false_and_ignores_concurrency_limit(
        self, mock_user, mock_campaign
    ):
        mock_campaign.state = "paused"
        with (
            patch("api.routes.campaign.db_client") as mock_db,
            patch(
                "api.routes.campaign.authorize_workflow_run_start", new_callable=AsyncMock
            ) as mock_auth,
            patch("api.routes.campaign.campaign_runner_service") as mock_runner,
            patch("api.routes.campaign._get_campaign_stats", new_callable=AsyncMock) as mock_stats,
            patch(
                "api.routes.campaign._get_telephony_configuration_name",
                new_callable=AsyncMock,
            ) as mock_cfg_name,
            patch("api.routes.campaign._build_campaign_response") as mock_build_resp,
        ):
            mock_db.list_telephony_configurations = AsyncMock(return_value=[{"id": 11}])
            mock_db.get_campaign = AsyncMock(return_value=mock_campaign)
            mock_db.get_workflow_name = AsyncMock(return_value="Test Workflow")
            mock_runner.start_campaign = AsyncMock()
            mock_runner.resume_campaign = AsyncMock()
            mock_stats.return_value = (0, 100)
            mock_cfg_name.return_value = "Mock Telephony"
            mock_build_resp.return_value = {"id": 42, "state": "running"}

            # Simulate Talkar returning concurrency_limit_exceeded (e.g. 4/2)
            mock_auth.return_value = QuotaCheckResult(
                has_quota=False,
                error_code="concurrency_limit_exceeded",
                error_message="Concurrent call limit reached (4/2).",
            )

            # Resuming the campaign must succeed without throwing HTTPException(402)
            await resume_campaign(campaign_id=42, user=mock_user)

            mock_auth.assert_awaited_once_with(
                workflow_id=mock_campaign.workflow_id,
                organization_id=mock_user.selected_organization_id,
                actor_user=mock_user,
                check_concurrency=False,
            )
            mock_runner.resume_campaign.assert_awaited_once_with(42)

    @pytest.mark.asyncio
    async def test_resume_campaign_raises_402_on_master_suspended(
        self, mock_user, mock_campaign
    ):
        mock_campaign.state = "paused"
        with (
            patch("api.routes.campaign.db_client") as mock_db,
            patch(
                "api.routes.campaign.authorize_workflow_run_start", new_callable=AsyncMock
            ) as mock_auth,
            patch("api.routes.campaign.campaign_runner_service") as mock_runner,
        ):
            mock_db.list_telephony_configurations = AsyncMock(return_value=[{"id": 11}])
            mock_db.get_campaign = AsyncMock(return_value=mock_campaign)
            mock_runner.resume_campaign = AsyncMock()

            mock_auth.return_value = QuotaCheckResult(
                has_quota=False,
                error_code="master_suspended",
                error_message="Master account is suspended.",
            )

            with pytest.raises(HTTPException) as exc_info:
                await resume_campaign(campaign_id=42, user=mock_user)

            assert exc_info.value.status_code == 402
            assert "Master account is suspended" in str(exc_info.value.detail)
            mock_runner.resume_campaign.assert_not_called()


class TestTalkarQuotaServiceConcurrencyBypass:
    @pytest.mark.asyncio
    async def test_authorize_talkar_check_concurrency_false_sets_active_calls_1_and_bypasses(
        self,
    ):
        captured_payload = None

        class MockResponse:
            status_code = 200

            def json(self):
                return {
                    "has_quota": False,
                    "reason": "concurrency_limit_exceeded",
                    "active_calls": 4,
                    "concurrent_call_limit": 2,
                }

        class MockAsyncClient:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                pass

            async def post(self, url, json=None, headers=None, timeout=None):
                nonlocal captured_payload
                captured_payload = json
                return MockResponse()

        with (
            patch("httpx.AsyncClient", return_value=MockAsyncClient()),
            patch(
                "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
                new_callable=AsyncMock,
                return_value="org:8",
            ),
            patch(
                "api.services.call_concurrency.rate_limiter.rate_limiter.get_concurrent_count",
                new_callable=AsyncMock,
                return_value=5,  # 5 active calls running in redis
            ),
        ):
            # With check_concurrency=False, active_calls must be clamped to 1
            result = await _authorize_talkar_workflow_run_start(
                organization_id=8,
                check_concurrency=False,
            )

            assert captured_payload is not None
            assert captured_payload["active_calls"] == 1
            assert captured_payload["organization_id"] == 8
            # The concurrency_limit_exceeded failure from Talkar is ignored
            assert result.has_quota is True

    @pytest.mark.asyncio
    async def test_authorize_talkar_check_concurrency_true_enforces_limit(self):
        class MockResponse:
            status_code = 200

            def json(self):
                return {
                    "has_quota": False,
                    "reason": "concurrency_limit_exceeded",
                    "active_calls": 3,
                    "concurrent_call_limit": 2,
                }

        class MockAsyncClient:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                pass

            async def post(self, url, json=None, headers=None, timeout=None):
                return MockResponse()

        with (
            patch("httpx.AsyncClient", return_value=MockAsyncClient()),
            patch(
                "api.services.call_concurrency.service.call_concurrency.get_concurrency_group_id",
                new_callable=AsyncMock,
                return_value="org:8",
            ),
            patch(
                "api.services.call_concurrency.rate_limiter.rate_limiter.get_concurrent_count",
                new_callable=AsyncMock,
                return_value=2,
            ),
        ):
            result = await _authorize_talkar_workflow_run_start(
                organization_id=8,
                check_concurrency=True,
            )

            assert result.has_quota is False
            assert result.error_code == "concurrency_limit_exceeded"
            assert "Concurrent call limit reached" in result.error_message


class TestValidateMaxConcurrencyTelephonyConfig:
    @pytest.mark.asyncio
    async def test_validate_max_concurrency_uses_selected_telephony_config(self):
        from api.routes.campaign import _validate_max_concurrency

        with (
            patch("api.routes.campaign._get_org_concurrent_limit", new_callable=AsyncMock, return_value=100),
            patch("api.routes.campaign.db_client") as mock_db,
        ):
            # Selected config 99 has 50 numbers; default config 11 has only 2 numbers
            mock_db.list_active_normalized_addresses_for_config = AsyncMock(
                return_value=[f"+1555777{i:04d}" for i in range(1, 51)]
            )

            # Validating max_concurrency=50 with telephony_configuration_id=99 must pass without exception
            await _validate_max_concurrency(
                max_concurrency=50,
                organization_id=8,
                telephony_configuration_id=99,
            )

            mock_db.list_active_normalized_addresses_for_config.assert_awaited_once_with(99)

    @pytest.mark.asyncio
    async def test_validate_max_concurrency_fails_if_exceeds_selected_config(self):
        from api.routes.campaign import _validate_max_concurrency

        with (
            patch("api.routes.campaign._get_org_concurrent_limit", new_callable=AsyncMock, return_value=100),
            patch("api.routes.campaign.db_client") as mock_db,
        ):
            # Selected config 99 has 10 numbers
            mock_db.list_active_normalized_addresses_for_config = AsyncMock(
                return_value=[f"+1555777{i:04d}" for i in range(1, 11)]
            )

            with pytest.raises(HTTPException) as exc_info:
                await _validate_max_concurrency(
                    max_concurrency=50,
                    organization_id=8,
                    telephony_configuration_id=99,
                )

            assert exc_info.value.status_code == 400
            assert "max_concurrency (50) cannot exceed 10" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_validate_max_concurrency_fails_if_zero_numbers_in_selected_config(self):
        from api.routes.campaign import _validate_max_concurrency

        with (
            patch("api.routes.campaign._get_org_concurrent_limit", new_callable=AsyncMock, return_value=100),
            patch("api.routes.campaign.db_client") as mock_db,
        ):
            # Selected config 99 has 0 numbers
            mock_db.list_active_normalized_addresses_for_config = AsyncMock(
                return_value=[]
            )

            with pytest.raises(HTTPException) as exc_info:
                await _validate_max_concurrency(
                    max_concurrency=10,
                    organization_id=8,
                    telephony_configuration_id=99,
                )

            assert exc_info.value.status_code == 400
            assert "Selected telephony configuration has 0 configured phone numbers" in exc_info.value.detail


