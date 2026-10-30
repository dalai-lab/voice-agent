"""Tests for sequential audio playback during call transfers.

Ensures that the transfer speech / handoff message completes before
the calling tone (hold ring audio) begins playing, avoiding any audio overlap.
"""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    TTSStartedFrame,
    TTSStoppedFrame,
    TTSSpeakFrame,
)
from pipecat.observers.base_observer import BaseObserver, FramePushed
from pipecat.processors.frame_processor import FrameDirection

from api.enums import WorkflowRunMode
from api.services.workflow.pipecat_engine_custom_tools import (
    CustomToolManager,
    _TransferSpeechObserver,
)


class MockToolModel:
    def __init__(self, tool_uuid: str, name: str, description: str, category: str, definition: dict):
        self.tool_uuid = tool_uuid
        self.name = name
        self.description = description
        self.category = category
        self.definition = definition


@pytest.mark.asyncio
async def test_transfer_speech_observer_state_machine():
    """Observer transitions from waiting -> started -> completed on BotStoppedSpeakingFrame."""
    obs = _TransferSpeechObserver()
    assert not obs._done_event.is_set()

    # Ignore stop frame before start
    data_early_stop = FramePushed(
        source=Mock(), destination=Mock(), frame=BotStoppedSpeakingFrame(), direction=FrameDirection.UPSTREAM, timestamp=0.5
    )
    await obs.on_push_frame(data_early_stop)
    assert not obs._done_event.is_set()

    # Start speech
    data_start = FramePushed(
        source=Mock(), destination=Mock(), frame=TTSStartedFrame(), direction=FrameDirection.DOWNSTREAM, timestamp=1.0
    )
    await obs.on_push_frame(data_start)
    assert obs._seen_started
    assert not obs._done_event.is_set()

    # Bot finishes speaking
    data_stop = FramePushed(
        source=Mock(), destination=Mock(), frame=BotStoppedSpeakingFrame(), direction=FrameDirection.UPSTREAM, timestamp=2.0
    )
    await obs.on_push_frame(data_stop)
    assert obs._done_event.is_set()


@pytest.mark.asyncio
async def test_transfer_speech_observer_fallback_on_tts_stopped():
    """Observer triggers fallback if BotStoppedSpeakingFrame does not arrive after TTSStoppedFrame."""
    obs = _TransferSpeechObserver()
    data_start = FramePushed(
        source=Mock(), destination=Mock(), frame=TTSStartedFrame(), direction=FrameDirection.DOWNSTREAM, timestamp=1.0
    )
    await obs.on_push_frame(data_start)

    # Patch sleep inside fallback timer to 0.01 for fast test
    with patch("asyncio.sleep", new=AsyncMock()):
        data_tts_stop = FramePushed(
            source=Mock(), destination=Mock(), frame=TTSStoppedFrame(), direction=FrameDirection.DOWNSTREAM, timestamp=1.5
        )
        await obs.on_push_frame(data_tts_stop)
        await obs._fallback_task
        assert obs._done_event.is_set()


@pytest.mark.asyncio
async def test_transfer_calling_tone_waits_for_speech_to_finish():
    """Transfer call handler does not start play_audio_loop until speech is completed."""
    mock_engine = Mock()
    mock_engine._workflow_run_id = 100
    mock_engine._call_context_vars = {}
    mock_engine._gathered_context = {}
    mock_engine._fetch_recording_audio = None
    mock_engine._audio_config = SimpleNamespace(transport_out_sample_rate=8000)
    mock_engine._transport_output = SimpleNamespace(queue_frame=AsyncMock())
    mock_engine._get_organization_id = AsyncMock(return_value=1)
    mock_engine.set_mute_pipeline = Mock()
    mock_engine.end_call_with_reason = AsyncMock()

    # Pipeline task that supports observers and queues frames
    registered_observers = []

    class RealMockTask:
        def add_observer(self, obs):
            registered_observers.append(obs)

        async def remove_observer(self, obs):
            if obs in registered_observers:
                registered_observers.remove(obs)

        async def queue_frame(self, frame):
            pass

    mock_engine.task = RealMockTask()

    manager = CustomToolManager(mock_engine)
    tool = MockToolModel(
        tool_uuid="transfer-tool-1",
        name="transfer_call",
        description="Transfer call tool",
        category="transfer_call",
        definition={
            "schema_version": 1,
            "type": "transfer_call",
            "config": {
                "destination": "+14155551234",
                "timeout": 30,
                "messageType": "custom",
                "customMessage": "Hold on while I transfer you.",
            },
        },
    )
    handler, _ = manager._create_handler(tool, "transfer_call")

    workflow_run = SimpleNamespace(
        mode=WorkflowRunMode.TWILIO.value,
        gathered_context={"call_id": "call-123"},
    )
    provider = Mock()
    provider.supports_transfers.return_value = True
    provider.validate_config.return_value = True
    provider.transfer_call = AsyncMock(return_value={"call_sid": "dest-call-123"})

    play_audio_loop_started = asyncio.Event()

    async def mock_play_audio_loop(stop_event, sample_rate, queue_frame, audio_file=None):
        play_audio_loop_started.set()
        await stop_event.wait()

    transfer_event = Mock()
    transfer_event.to_result_dict.return_value = {
        "status": "success",
        "action": "transferred",
    }
    transfer_manager = Mock()
    transfer_manager.store_transfer_context = AsyncMock()

    # Transfer completion event that we control
    transfer_done = asyncio.Event()

    async def mock_wait_for_transfer(transfer_id, timeout_seconds):
        await transfer_done.wait()
        return transfer_event

    transfer_manager.wait_for_transfer_completion = mock_wait_for_transfer

    mock_params = Mock()
    mock_params.arguments = {}
    mock_params.result_callback = AsyncMock()

    with (
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.db_client.get_workflow_run_by_id",
            new=AsyncMock(return_value=workflow_run),
        ),
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.get_telephony_provider_for_run",
            new=AsyncMock(return_value=provider),
        ),
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.get_call_transfer_manager",
            new=AsyncMock(return_value=transfer_manager),
        ),
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.play_audio_loop",
            new=mock_play_audio_loop,
        ),
    ):
        # Run handler in background
        handler_task = asyncio.create_task(handler(mock_params))

        # Give it a brief moment to initiate provider call and start speech
        await asyncio.sleep(0.05)

        # Observer should be registered
        assert len(registered_observers) == 1
        obs = registered_observers[0]

        # Speech has NOT finished yet, so calling tone must NOT have started!
        assert not play_audio_loop_started.is_set(), "Calling tone started while speech was still playing!"

        # Now simulate speech playback in progress
        await obs.on_push_frame(
            FramePushed(
                source=Mock(),
                destination=Mock(),
                frame=TTSStartedFrame(),
                direction=FrameDirection.DOWNSTREAM,
                timestamp=1.0,
            )
        )
        assert not play_audio_loop_started.is_set(), "Calling tone started during speech!"

        # Now speech finishes playing out
        await obs.on_push_frame(
            FramePushed(
                source=Mock(),
                destination=Mock(),
                frame=BotStoppedSpeakingFrame(),
                direction=FrameDirection.UPSTREAM,
                timestamp=2.0,
            )
        )

        # Give it a moment to enter hold music loop
        await asyncio.sleep(0.05)

        # NOW calling tone MUST be playing
        assert play_audio_loop_started.is_set(), "Calling tone should have started after speech completed!"

        # Simulate agent answering call
        transfer_done.set()
        await handler_task

        # Verify observer was cleanly deregistered
        assert len(registered_observers) == 0


@pytest.mark.asyncio
async def test_transfer_early_completion_prevents_calling_tone():
    """If transfer completes or fails before speech finishes, calling tone is never started."""
    mock_engine = Mock()
    mock_engine._workflow_run_id = 101
    mock_engine._call_context_vars = {}
    mock_engine._gathered_context = {}
    mock_engine._fetch_recording_audio = None
    mock_engine._audio_config = SimpleNamespace(transport_out_sample_rate=8000)
    mock_engine._transport_output = SimpleNamespace(queue_frame=AsyncMock())
    mock_engine._get_organization_id = AsyncMock(return_value=1)
    mock_engine.set_mute_pipeline = Mock()
    mock_engine.end_call_with_reason = AsyncMock()

    registered_observers = []

    class RealMockTask:
        def add_observer(self, obs):
            registered_observers.append(obs)

        async def remove_observer(self, obs):
            if obs in registered_observers:
                registered_observers.remove(obs)

        async def queue_frame(self, frame):
            pass

    mock_engine.task = RealMockTask()

    manager = CustomToolManager(mock_engine)
    tool = MockToolModel(
        tool_uuid="transfer-tool-2",
        name="transfer_call",
        description="Transfer call tool",
        category="transfer_call",
        definition={
            "schema_version": 1,
            "type": "transfer_call",
            "config": {
                "destination": "+14155551234",
                "timeout": 30,
                "messageType": "custom",
                "customMessage": "Hold on while I transfer you.",
            },
        },
    )
    handler, _ = manager._create_handler(tool, "transfer_call")

    workflow_run = SimpleNamespace(
        mode=WorkflowRunMode.TWILIO.value,
        gathered_context={"call_id": "call-124"},
    )
    provider = Mock()
    provider.supports_transfers.return_value = True
    provider.validate_config.return_value = True
    provider.transfer_call = AsyncMock(return_value={"call_sid": "dest-call-124"})

    play_audio_loop_started = asyncio.Event()

    async def mock_play_audio_loop(stop_event, sample_rate, queue_frame, audio_file=None):
        play_audio_loop_started.set()
        await stop_event.wait()

    transfer_event = Mock()
    transfer_event.to_result_dict.return_value = {
        "status": "success",
        "action": "transferred",
    }
    transfer_manager = Mock()
    transfer_manager.store_transfer_context = AsyncMock()
    # Completes immediately
    transfer_manager.wait_for_transfer_completion = AsyncMock(return_value=transfer_event)

    mock_params = Mock()
    mock_params.arguments = {}
    mock_params.result_callback = AsyncMock()

    with (
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.db_client.get_workflow_run_by_id",
            new=AsyncMock(return_value=workflow_run),
        ),
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.get_telephony_provider_for_run",
            new=AsyncMock(return_value=provider),
        ),
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.get_call_transfer_manager",
            new=AsyncMock(return_value=transfer_manager),
        ),
        patch(
            "api.services.workflow.pipecat_engine_custom_tools.play_audio_loop",
            new=mock_play_audio_loop,
        ),
    ):
        await handler(mock_params)

    # Calling tone should never have started because transfer finished immediately
    assert not play_audio_loop_started.is_set()
