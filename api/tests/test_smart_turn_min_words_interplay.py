import pytest
from unittest.mock import MagicMock
from pipecat.frames.frames import TranscriptionFrame, StartFrame
from pipecat.turns.user_stop.turn_analyzer_user_turn_stop_strategy import TurnAnalyzerUserTurnStopStrategy
from pipecat.audio.turn.base_turn_analyzer import BaseTurnAnalyzer, BaseTurnParams, EndOfTurnState

class MockSmartTurnAnalyzer(BaseTurnAnalyzer):
    def __init__(self, stop_secs=2.5, speech_triggered=True):
        super().__init__()
        self._params = BaseTurnParams(stop_secs=stop_secs)
        self._is_speech_triggered = speech_triggered

    @property
    def params(self):
        return self._params

    @property
    def speech_triggered(self) -> bool:
        return self._is_speech_triggered

    def append_audio(self, buffer, is_speech):
        return EndOfTurnState.INCOMPLETE

    async def analyze_end_of_turn(self):
        return EndOfTurnState.INCOMPLETE, None

    def clear(self):
        self._is_speech_triggered = False

@pytest.mark.asyncio
async def test_smart_turn_does_not_override_with_stt_fallback_when_speech_triggered():
    analyzer = MockSmartTurnAnalyzer(stop_secs=2.5, speech_triggered=True)
    strategy = TurnAnalyzerUserTurnStopStrategy(turn_analyzer=analyzer)
    
    task_manager = MagicMock()
    await strategy.setup(task_manager)
    await strategy.process_frame(StartFrame(audio_in_sample_rate=16000))
    
    # Simulate a turn started via MinWords mid-utterance
    await strategy.handle_user_turn_started()
    assert strategy._vad_stopped is False
    assert strategy._vad_user_speaking is False
    
    # Receive a transcription frame
    frame = TranscriptionFrame(text="Actually, um, I want to.", user_id="user", timestamp="0", finalized=True)
    await strategy.process_frame(frame)
    
    # Verify that the emergency 0.9s STT fallback was SKIPPED because speech_triggered is True
    assert strategy._timeout_task is None
    assert strategy._turn_complete is False

@pytest.mark.asyncio
async def test_stt_fallback_still_arms_when_vad_never_detected_speech():
    # If speech was never triggered (e.g. text chat / whisper without VAD), the fallback MUST still run
    analyzer = MockSmartTurnAnalyzer(stop_secs=2.5, speech_triggered=False)
    strategy = TurnAnalyzerUserTurnStopStrategy(turn_analyzer=analyzer)
    
    task_manager = MagicMock()
    task_manager.create_task = MagicMock(return_value="mock_task")
    await strategy.setup(task_manager)
    await strategy.process_frame(StartFrame(audio_in_sample_rate=16000))
    
    await strategy.handle_user_turn_started()
    
    frame = TranscriptionFrame(text="Hello", user_id="user", timestamp="0", finalized=True)
    await strategy.process_frame(frame)
    
    # Fallback armed as expected for VAD-less speech
    assert strategy._turn_complete is True
    assert strategy._timeout_task == "mock_task"

@pytest.mark.asyncio
async def test_smart_turn_complete_waits_for_user_speech_timeout():
    import asyncio
    class CompleteAnalyzer(BaseTurnAnalyzer):
        def __init__(self):
            super().__init__()
            self._params = BaseTurnParams(stop_secs=2.0)
        @property
        def params(self):
            return self._params
        @property
        def speech_triggered(self) -> bool:
            return False
        def append_audio(self, buffer, is_speech):
            return EndOfTurnState.INCOMPLETE
        async def analyze_end_of_turn(self):
            return EndOfTurnState.COMPLETE, None
        def clear(self):
            pass

    analyzer = CompleteAnalyzer()
    # Configure 0.2s silence debounce
    strategy = TurnAnalyzerUserTurnStopStrategy(turn_analyzer=analyzer, user_speech_timeout=0.2)
    
    from pipecat.utils.asyncio.task_manager import TaskManager, TaskManagerParams
    task_manager = TaskManager()
    task_manager.setup(TaskManagerParams(loop=asyncio.get_running_loop()))
    await strategy.setup(task_manager)
    await strategy.process_frame(StartFrame(audio_in_sample_rate=16000))
    await strategy.handle_user_turn_started()

    from pipecat.frames.frames import VADUserStartedSpeakingFrame, VADUserStoppedSpeakingFrame
    import time

    stopped_events = []
    @strategy.event_handler("on_user_turn_stopped")
    async def on_user_turn_stopped(s, p):
        stopped_events.append(p)

    # 1. User speaks
    await strategy.process_frame(VADUserStartedSpeakingFrame(timestamp=time.time(), start_secs=0.0))
    # 2. User stops speaking (VAD stop)
    await strategy.process_frame(VADUserStoppedSpeakingFrame(timestamp=time.time(), stop_secs=0.2))
    # 3. Finalized transcript arrives
    await strategy.process_frame(TranscriptionFrame(text="Main 5 se 10 kg kam karna chahti hoon", user_id="u", timestamp="0", finalized=True))

    # At 50ms, turn should NOT be stopped yet because user_speech_timeout (200ms) is still running!
    await asyncio.sleep(0.05)
    assert len(stopped_events) == 0

    # Wait until debounce elapsed (total > 200ms)
    await asyncio.sleep(0.2)
    assert len(stopped_events) == 1

@pytest.mark.asyncio
async def test_smart_turn_incomplete_silence_timeout_overrides_without_extra_delay():
    import asyncio
    class SilenceTimeoutAnalyzer(BaseTurnAnalyzer):
        def __init__(self):
            super().__init__()
            self._params = BaseTurnParams(stop_secs=2.0)
        @property
        def params(self):
            return self._params
        @property
        def speech_triggered(self) -> bool:
            return True
        def append_audio(self, buffer, is_speech):
            # Simulate silence timeout in BaseSmartTurn.append_audio
            return EndOfTurnState.COMPLETE
        async def analyze_end_of_turn(self):
            return EndOfTurnState.COMPLETE, None
        def clear(self):
            pass

    analyzer = SilenceTimeoutAnalyzer()
    strategy = TurnAnalyzerUserTurnStopStrategy(turn_analyzer=analyzer, user_speech_timeout=0.5)

    from pipecat.utils.asyncio.task_manager import TaskManager, TaskManagerParams
    task_manager = TaskManager()
    task_manager.setup(TaskManagerParams(loop=asyncio.get_running_loop()))
    await strategy.setup(task_manager)
    await strategy.process_frame(StartFrame(audio_in_sample_rate=16000))
    await strategy.handle_user_turn_started()

    from pipecat.frames.frames import InputAudioRawFrame
    stopped_events = []
    @strategy.event_handler("on_user_turn_stopped")
    async def on_user_turn_stopped(s, p):
        stopped_events.append(p)

    # Transcript already arrived
    await strategy.process_frame(TranscriptionFrame(text="Actually, um...", user_id="u", timestamp="0", finalized=True))
    assert len(stopped_events) == 0

    # Silence reaches stop_secs in append_audio -> returns COMPLETE
    await strategy.process_frame(InputAudioRawFrame(audio=b"\x00" * 320, sample_rate=16000, num_channels=1))

    # It MUST trigger immediately (overrides user_speech_timeout) because caller already waited 2.0s!
    assert len(stopped_events) == 1
