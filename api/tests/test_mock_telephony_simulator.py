"""Unit and integration tests for the Mock Telephony Provider & Campaign Soak Simulator."""

import json
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.enums import TelephonyCallStatus, WorkflowRunMode
from api.services.telephony.providers.mock.config import (
    MockConfigurationRequest,
    MockConfigurationResponse,
)
from api.services.telephony.providers.mock.provider import (
    MockTelephonyProvider,
    resolve_simulation_parameters,
)
from api.services.telephony.registry import get as get_telephony_provider_spec
from api.tasks.function_names import FunctionNames
from api.tasks.mock_telephony_tasks import (
    MAX_CALLBACK_CHAIN_DEPTH,
    simulate_mock_call_completion,
)


def test_mock_provider_is_registered():
    """Verify mock provider is registered cleanly in telephony registry with MOCK enum."""
    spec = get_telephony_provider_spec("mock")
    assert spec is not None
    assert spec.name == "mock"
    assert spec.provider_cls == MockTelephonyProvider
    assert WorkflowRunMode.MOCK.value == "mock"


def test_resolve_simulation_parameters_contact_override():
    """Tier 1: Per-contact context overrides all other tiers."""
    contact_context = {
        "simulated_duration": 120,
        "simulated_outcome": "callback",
        "callback_delay_minutes": 5,
        "callback_summary": "Customer requested callback at 5pm",
        "callback_fast_forward": True,
    }
    campaign_meta = {
        "simulation_config": {
            "min_duration_seconds": 10,
            "max_duration_seconds": 20,
            "outcomes": {"completed": 100},
        }
    }
    telephony_config = {"min_duration_seconds": 1, "max_duration_seconds": 2}
    live_redis_config = {"min_duration_seconds": 5, "max_duration_seconds": 5}

    duration, outcome, cb_params = resolve_simulation_parameters(
        contact_context=contact_context,
        campaign_meta=campaign_meta,
        telephony_config=telephony_config,
        live_redis_config=live_redis_config,
    )

    assert duration == 120
    assert outcome == "callback"
    assert cb_params["delay_minutes"] == 5
    assert cb_params["summary"] == "Customer requested callback at 5pm"
    assert cb_params["fast_forward"] is True


def test_resolve_simulation_parameters_live_redis_override():
    """Tier 2: Live Redis override takes precedence over campaign meta and config defaults."""
    contact_context = {}
    campaign_meta = {
        "simulation_config": {
            "min_duration_seconds": 300,
            "max_duration_seconds": 300,
            "outcomes": {"busy": 100},
        }
    }
    telephony_config = {"min_duration_seconds": 1, "max_duration_seconds": 2}
    live_redis_config = {
        "min_duration_seconds": 45,
        "max_duration_seconds": 45,
        "outcomes": {"completed": 100},
        "callback_delay_minutes": 2,
        "fast_forward_callbacks": True,
    }

    duration, outcome, cb_params = resolve_simulation_parameters(
        contact_context=contact_context,
        campaign_meta=campaign_meta,
        telephony_config=telephony_config,
        live_redis_config=live_redis_config,
    )

    assert duration == 45
    assert outcome == "completed"
    assert cb_params["delay_minutes"] == 2
    assert cb_params["fast_forward"] is True


def test_resolve_simulation_parameters_campaign_meta():
    """Tier 3: Campaign metadata simulation_config takes precedence over provider config."""
    contact_context = {}
    campaign_meta = {
        "simulation_config": {
            "min_duration_seconds": 15,
            "max_duration_seconds": 15,
            "outcomes": {"no_answer": 100},
        }
    }
    telephony_config = {
        "min_duration_seconds": 60,
        "max_duration_seconds": 60,
        "outcomes": {"completed": 100},
    }

    duration, outcome, _ = resolve_simulation_parameters(
        contact_context=contact_context,
        campaign_meta=campaign_meta,
        telephony_config=telephony_config,
        live_redis_config=None,
    )

    assert duration == 15
    assert outcome == "no_answer"


def test_resolve_simulation_parameters_provider_defaults():
    """Tier 4: Telephony provider config defaults are used when no higher tier is set."""
    contact_context = {}
    campaign_meta = {}
    telephony_config = {
        "min_duration_seconds": 25,
        "max_duration_seconds": 25,
        "outcomes": {"carrier_error": 100},
    }

    duration, outcome, _ = resolve_simulation_parameters(
        contact_context=contact_context,
        campaign_meta=campaign_meta,
        telephony_config=telephony_config,
        live_redis_config=None,
    )

    assert duration == 25
    assert outcome == "carrier_error"


def test_mock_provider_number_pool_selection():
    """Verify phone number pool selection and preferred caller ID retention."""
    provider = MockTelephonyProvider(
        config={
            "from_numbers": ["+19990000001", "+19990000002", "+19990000003"],
            "default_from_number": "+19990000001",
        }
    )

    assert provider.select_from_number("+19990000002") == "+19990000002"
    assert provider.select_from_number("+19990000003") == "+19990000003"
    assert provider.select_from_number("+10000000000") == "+19990000001"
    assert provider.select_from_number(None) == "+19990000001"


@pytest.mark.asyncio
async def test_mock_provider_initiate_call():
    """Verify initiate_call loads context, schedules delayed Arq task, and returns initiated result."""
    provider = MockTelephonyProvider(
        config={
            "from_numbers": ["+19990000001"],
            "default_from_number": "+19990000001",
            "min_duration_seconds": 30,
            "max_duration_seconds": 30,
            "outcomes": {"completed": 100},
        }
    )

    mock_run = MagicMock()
    mock_run.initial_context = {"simulated_duration": 40, "simulated_outcome": "completed"}
    mock_run.campaign_id = 42
    mock_run.organization_id = 99

    with patch("api.services.telephony.providers.mock.provider.db_client.get_workflow_run_by_id", new_callable=AsyncMock) as mock_get_run, \
         patch("api.services.telephony.providers.mock.provider.db_client.get_campaign_by_id", new_callable=AsyncMock) as mock_get_camp, \
         patch("api.tasks.arq.enqueue_job", new_callable=AsyncMock) as mock_enqueue:

        mock_get_run.return_value = mock_run
        mock_get_camp.return_value = MagicMock(orchestrator_metadata={})

        result = await provider.initiate_call(
            to_number="+15551234567",
            webhook_url="https://api.test/webhook",
            workflow_run_id=101,
            from_number="+19990000001",
        )

        assert result.status == "initiated"
        assert result.caller_number == "+19990000001"
        assert result.provider_metadata["provider"] == "mock"
        assert result.provider_metadata["simulated_duration"] == 40
        assert result.provider_metadata["simulated_outcome"] == "completed"

        mock_enqueue.assert_called_once()
        args, kwargs = mock_enqueue.call_args
        assert args[0] == FunctionNames.SIMULATE_MOCK_CALL_COMPLETION
        assert kwargs["workflow_run_id"] == 101
        assert kwargs["duration"] == 40
        assert kwargs["outcome"] == "completed"
        assert kwargs["to_number"] == "+15551234567"
        assert kwargs["from_number"] == "+19990000001"
        assert kwargs["_defer_by"] == timedelta(seconds=40)


@pytest.mark.asyncio
async def test_simulate_mock_call_completion_normal_completed():
    """Verify normal completed call dispatches status update with duration to _process_status_update."""
    mock_run = MagicMock()
    mock_run.id = 500
    mock_run.initial_context = {}
    mock_run.campaign_id = 10

    with patch("api.tasks.mock_telephony_tasks.db_client.get_workflow_run_by_id", new_callable=AsyncMock) as mock_get_run, \
         patch("api.services.telephony.status_processor._process_status_update", new_callable=AsyncMock) as mock_status_update:

        mock_get_run.return_value = mock_run

        await simulate_mock_call_completion(
            ctx=None,
            workflow_run_id=500,
            call_id="mock_test_123",
            duration=35,
            outcome="completed",
            to_number="+15551234567",
            from_number="+19990000001",
        )

        mock_status_update.assert_called_once()
        run_id, status_req = mock_status_update.call_args[0]
        assert run_id == 500
        assert status_req.call_id == "mock_test_123"
        assert status_req.status == TelephonyCallStatus.COMPLETED
        assert status_req.duration == "35"
        assert status_req.from_number == "+19990000001"
        assert status_req.to_number == "+15551234567"


@pytest.mark.asyncio
async def test_simulate_mock_call_completion_busy_and_failed():
    """Verify busy and carrier_error outcomes map to BUSY and FAILED statuses with zero duration."""
    mock_run = MagicMock()
    mock_run.id = 501
    mock_run.initial_context = {}
    mock_run.campaign_id = 10

    with patch("api.tasks.mock_telephony_tasks.db_client.get_workflow_run_by_id", new_callable=AsyncMock) as mock_get_run, \
         patch("api.services.telephony.status_processor._process_status_update", new_callable=AsyncMock) as mock_status_update:

        mock_get_run.return_value = mock_run

        # Busy
        await simulate_mock_call_completion(
            ctx=None,
            workflow_run_id=501,
            call_id="mock_busy",
            duration=10,
            outcome="busy",
            to_number="+15551234567",
            from_number="+19990000001",
        )
        assert mock_status_update.call_args[0][1].status == TelephonyCallStatus.BUSY
        assert mock_status_update.call_args[0][1].duration == "0"

        # Carrier Error (circuit breaker test)
        await simulate_mock_call_completion(
            ctx=None,
            workflow_run_id=501,
            call_id="mock_err",
            duration=10,
            outcome="carrier_error",
            to_number="+15551234567",
            from_number="+19990000001",
        )
        assert mock_status_update.call_args[0][1].status == TelephonyCallStatus.FAILED


@pytest.mark.asyncio
async def test_simulate_mock_call_completion_creates_callback_with_sticky_caller_id():
    """Verify outcome='callback' creates QueuedRunModel with retry_reason='user_requested_callback' and preserves caller ID."""
    mock_run = MagicMock()
    mock_run.id = 600
    mock_run.campaign_id = 88
    mock_run.organization_id = 1
    mock_run.workflow_id = 10
    mock_run.queued_run_id = 700
    mock_run.initial_context = {
        "original_field": "val1",
        "callback_chain_depth": 1,
    }

    mock_session = AsyncMock()
    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    with patch("api.tasks.mock_telephony_tasks.db_client.get_workflow_run_by_id", new_callable=AsyncMock) as mock_get_run, \
         patch("api.tasks.mock_telephony_tasks.db_client.get_queued_run_by_id", new_callable=AsyncMock) as mock_get_queued, \
         patch("api.tasks.mock_telephony_tasks.resolve_callback_settings", new_callable=AsyncMock) as mock_resolve_settings, \
         patch("api.tasks.mock_telephony_tasks.db_client.async_session", return_value=mock_session_ctx), \
         patch("api.services.telephony.status_processor._process_status_update", new_callable=AsyncMock) as mock_status_update:

        mock_get_run.return_value = mock_run
        mock_get_queued.return_value = MagicMock(source_uuid="src_uuid_orig")
        mock_resolve_settings.return_value = {
            "sociable_hours_start": "08:00",
            "sociable_hours_end": "21:00",
            "sociable_timezone": "UTC",
        }

        await simulate_mock_call_completion(
            ctx=None,
            workflow_run_id=600,
            call_id="mock_cb_call",
            duration=25,
            outcome="callback",
            to_number="+15559876543",
            from_number="+19990000002",  # Sticky caller ID
            callback_params={
                "delay_minutes": 10,
                "summary": "Customer requested appointment callback",
                "fast_forward": True,
            },
        )

        # 1. Verify a new QueuedRunModel was added to DB session
        mock_session.add.assert_called_once()
        added_queued_run = mock_session.add.call_args[0][0]
        assert added_queued_run.campaign_id == 88
        assert added_queued_run.state == "queued"
        assert added_queued_run.retry_reason == "user_requested_callback"
        assert added_queued_run.retry_count == 0

        # Context variables check
        cv = added_queued_run.context_variables
        assert cv["is_callback"] is True
        assert cv["callback_reason"] == "user_requested"
        assert cv["original_run_id"] == 600
        assert cv["conversation_summary"] == "Customer requested appointment callback"
        assert cv["callback_chain_depth"] == 2
        assert cv["caller_number"] == "+19990000002"  # STICKY CALLER ID PRESERVED
        assert cv["called_number"] == "+15559876543"
        assert cv["phone_number"] == "+15559876543"
        assert cv["callback_originally_requested_minutes"] == 10

        # 2. Verify initial call status update completed normally
        mock_status_update.assert_called_once()
        assert mock_status_update.call_args[0][1].status == TelephonyCallStatus.COMPLETED


@pytest.mark.asyncio
async def test_simulate_mock_call_completion_chain_depth_limit():
    """Verify callback recursion is capped at MAX_CALLBACK_CHAIN_DEPTH to prevent infinite loops."""
    mock_run = MagicMock()
    mock_run.id = 601
    mock_run.campaign_id = 88
    mock_run.organization_id = 1
    mock_run.workflow_id = 10
    mock_run.initial_context = {
        "callback_chain_depth": MAX_CALLBACK_CHAIN_DEPTH,  # Already at max depth (3)
    }

    mock_session = AsyncMock()
    mock_session_ctx = MagicMock()
    mock_session_ctx.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_ctx.__aexit__ = AsyncMock(return_value=None)

    with patch("api.tasks.mock_telephony_tasks.db_client.get_workflow_run_by_id", new_callable=AsyncMock) as mock_get_run, \
         patch("api.tasks.mock_telephony_tasks.db_client.async_session", return_value=mock_session_ctx), \
         patch("api.services.telephony.status_processor._process_status_update", new_callable=AsyncMock) as mock_status_update:

        mock_get_run.return_value = mock_run

        await simulate_mock_call_completion(
            ctx=None,
            workflow_run_id=601,
            call_id="mock_cb_max_chain",
            duration=20,
            outcome="callback",
            to_number="+15559876543",
            from_number="+19990000001",
        )

        # No new queued run added because chain depth was capped
        mock_session.add.assert_not_called()

        # Call completes cleanly
        mock_status_update.assert_called_once()
        assert mock_status_update.call_args[0][1].status == TelephonyCallStatus.COMPLETED
