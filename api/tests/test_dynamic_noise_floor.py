import time
import pytest
from unittest.mock import AsyncMock, MagicMock

from api.services.pipecat.dynamic_noise_floor import (
    DynamicNoiseFloorConfig,
    DynamicNoiseFloorTracker,
)


def test_backward_compatibility_disabled():
    """When dynamic_noise_floor is disabled, threshold must strictly equal static_threshold."""
    config = DynamicNoiseFloorConfig(enabled=False, static_threshold=0.35)
    tracker = DynamicNoiseFloorTracker(config)

    for vol in [0.05, 0.20, 0.50, 0.70, 0.10]:
        threshold = tracker.update_and_get_threshold(
            smoothed_volume=vol,
            confidence=0.0,
            vad_state_quiet=True,
        )
        assert threshold == 0.35
        assert tracker.current_threshold == 0.35


def test_monologue_freeze():
    """Continuous speech must NOT cause the noise floor to creep upward."""
    config = DynamicNoiseFloorConfig(
        enabled=True,
        static_threshold=0.35,
        min_bound=0.15,
        max_bound=0.55,
        margin=0.15,
    )
    tracker = DynamicNoiseFloorTracker(config)

    # Fast warm-up with low room noise
    for _ in range(10):
        tracker.update_and_get_threshold(
            smoothed_volume=0.08,
            confidence=0.0,
            vad_state_quiet=True,
        )

    baseline_before_speech = tracker.current_noise_floor

    # Simulate 1,000 frames (~32 seconds) of high-energy caller monologue
    for _ in range(1000):
        threshold = tracker.update_and_get_threshold(
            smoothed_volume=0.45,
            confidence=0.85,  # Clear speech confidence
            vad_state_quiet=False,  # VAD is in STARTING / SPEAKING
        )
        assert threshold > 0.15

    baseline_after_speech = tracker.current_noise_floor
    # The baseline must remain completely frozen during caller speech
    assert abs(baseline_after_speech - baseline_before_speech) < 0.005


def test_fast_decay_on_silence():
    """When a loud room becomes quiet, the floor should adapt downward quickly."""
    config = DynamicNoiseFloorConfig(
        enabled=True,
        min_bound=0.15,
        max_bound=0.55,
        margin=0.15,
        alpha_down=0.05,
    )
    tracker = DynamicNoiseFloorTracker(config)
    tracker._warmup_frames_remaining = 0
    tracker._noise_floor = 0.40  # Start with loud noise

    # Feed 20 frames (~640ms) of quiet audio
    for _ in range(20):
        tracker.update_and_get_threshold(
            smoothed_volume=0.05,
            confidence=0.0,
            vad_state_quiet=True,
        )

    # With alpha_down=0.05, 0.40 decays to < 0.18 within 20 frames
    assert tracker.current_noise_floor < 0.20


def test_slow_attack_on_spikes():
    """A transient loud spike (cough / door slam) must not ratchet the baseline up."""
    config = DynamicNoiseFloorConfig(
        enabled=True,
        min_bound=0.15,
        max_bound=0.55,
        margin=0.15,
        alpha_up=0.003,
    )
    tracker = DynamicNoiseFloorTracker(config)
    tracker._warmup_frames_remaining = 0
    tracker._noise_floor = 0.10

    # 5 frames of a 150ms loud non-speech impulse (e.g. cough or bang at 0.75)
    for _ in range(5):
        tracker.update_and_get_threshold(
            smoothed_volume=0.75,
            confidence=0.10,  # Below 0.20 confidence
            vad_state_quiet=True,
        )

    # 5 * (0.003 * 0.75) ≈ 0.011 shift
    assert tracker.current_noise_floor - 0.10 < 0.015


def test_hard_clamps():
    """Threshold must remain strictly within [min_bound, max_bound]."""
    config = DynamicNoiseFloorConfig(
        enabled=True,
        min_bound=0.15,
        max_bound=0.55,
        margin=0.15,
    )
    tracker = DynamicNoiseFloorTracker(config)
    tracker._warmup_frames_remaining = 0

    # Extreme low volume
    tracker._noise_floor = 0.00
    assert tracker._calculate_clamped_threshold() == 0.15

    # Extreme high volume
    tracker._noise_floor = 0.90
    assert tracker._calculate_clamped_threshold() == 0.55


def test_bot_speaking_freeze():
    """Noise floor must NOT update while the bot is outputting speech."""
    config = DynamicNoiseFloorConfig(enabled=True)
    tracker = DynamicNoiseFloorTracker(config)
    tracker._warmup_frames_remaining = 0
    tracker._noise_floor = 0.10

    tracker.set_bot_speaking(True)

    # Audio arriving while bot speaks
    for _ in range(20):
        tracker.update_and_get_threshold(
            smoothed_volume=0.40,
            confidence=0.05,
            vad_state_quiet=True,
        )

    assert tracker.current_noise_floor == 0.10


def test_bot_tail_hold():
    """After bot stops speaking, updates must stay frozen during egress buffer drain tail."""
    config = DynamicNoiseFloorConfig(enabled=True, bot_tail_hold_secs=0.25)
    tracker = DynamicNoiseFloorTracker(config)
    tracker._warmup_frames_remaining = 0
    tracker._noise_floor = 0.10

    tracker.set_bot_speaking(False)  # Arms bot_tail_until for 250ms

    # Immediate frame arriving during tail hold
    tracker.update_and_get_threshold(
        smoothed_volume=0.25,
        confidence=0.05,
        vad_state_quiet=True,
    )
    assert tracker.current_noise_floor == 0.10

    # Fast forward past tail hold
    now = time.time()
    tracker._bot_tail_until = now - 1.0
    tracker._last_frame_time = now - 0.02

    tracker.update_and_get_threshold(
        smoothed_volume=0.25,
        confidence=0.05,
        vad_state_quiet=True,
    )
    assert tracker.current_noise_floor > 0.10


def test_inband_dtmf_freeze():
    """Pure sinusoidal tones (DTMF key presses) must freeze baseline adaptation."""
    config = DynamicNoiseFloorConfig(enabled=True)
    tracker = DynamicNoiseFloorTracker(config)
    tracker._warmup_frames_remaining = 0
    tracker._noise_floor = 0.10

    # High volume (0.45) with pure sinusoidal tone (confidence < 0.08)
    for _ in range(10):
        tracker.update_and_get_threshold(
            smoothed_volume=0.45,
            confidence=0.03,
            vad_state_quiet=True,
        )

    assert tracker.current_noise_floor == 0.10


def test_margin_compression():
    """In loud ambient noise (> 0.25), margin must compress to maintain caller comfort."""
    config = DynamicNoiseFloorConfig(
        enabled=True,
        margin=0.15,
        min_bound=0.15,
        max_bound=0.55,
    )
    tracker = DynamicNoiseFloorTracker(config)

    # In quiet noise (0.10), full margin (0.15) applies -> 0.25
    tracker._noise_floor = 0.10
    assert tracker._calculate_clamped_threshold() == pytest.approx(0.25, 0.01)

    # In heavy noise (0.40), compression = 0.25 * (0.40 - 0.25) = 0.0375
    # Effective margin = 0.15 - 0.0375 = 0.1125 -> threshold = 0.40 + 0.1125 = 0.5125
    tracker._noise_floor = 0.40
    assert tracker._calculate_clamped_threshold() == pytest.approx(0.5125, 0.01)


@pytest.mark.asyncio
async def test_observer_lifecycle_attachment():
    """Lifecycle events from TurnTrackingObserver must update tracker state cleanly."""
    config = DynamicNoiseFloorConfig(enabled=True)
    tracker = DynamicNoiseFloorTracker(config)

    # Mock observer with event_handler decorator
    handlers = {}

    class MockObserver:
        def event_handler(self, event_name):
            def decorator(fn):
                handlers[event_name] = fn
                return fn
            return decorator

    mock_obs = MockObserver()
    tracker.attach_turn_tracking_observer(mock_obs)

    assert "on_bot_started_speaking" in handlers
    assert "on_bot_stopped_speaking" in handlers
    assert "on_turn_started" in handlers
    assert "on_turn_ended" in handlers

    # Test bot speaking events
    await handlers["on_bot_started_speaking"](mock_obs, 1, None)
    assert tracker._bot_speaking is True

    await handlers["on_bot_stopped_speaking"](mock_obs, 1, None)
    assert tracker._bot_speaking is False
    assert tracker._bot_tail_until > time.time()

    # Test turn events
    await handlers["on_turn_started"](mock_obs, 2)
    assert tracker._user_turn_active is True

    await handlers["on_turn_ended"](mock_obs, 2, 1.5, False)
    assert tracker._user_turn_active is False
