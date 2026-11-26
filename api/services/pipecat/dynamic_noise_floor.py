import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any
from loguru import logger

if TYPE_CHECKING:
    from pipecat.observers.turn_tracking_observer import TurnTrackingObserver


def _to_float(val: Any) -> float:
    """Coerce float, numpy scalar, numpy ndarray, or tensor to a native Python float."""
    if hasattr(val, "item"):
        try:
            return float(val.item())
        except Exception:
            return float(val.flat[0])
    return float(val)


@dataclass
class DynamicNoiseFloorConfig:
    enabled: bool = False
    static_threshold: float = 0.35
    margin: float = 0.15
    min_bound: float = 0.15
    max_bound: float = 0.55
    alpha_up: float = 0.003
    alpha_down: float = 0.05
    bot_tail_hold_secs: float = 0.25


class DynamicNoiseFloorTracker:
    """Thread-safe adaptive noise floor tracker for Silero VAD analysis."""

    def __init__(self, config: DynamicNoiseFloorConfig):
        self.config = config
        self._noise_floor: float = max(config.min_bound * 0.5, 0.08)
        self._current_threshold: float = config.static_threshold
        self._bot_speaking: bool = False
        self._bot_tail_until: float = 0.0
        self._user_turn_active: bool = False
        self._dtmf_active: bool = False
        self._warmup_frames_remaining: int = 10  # ~300ms initial sniff
        self._last_frame_time: float = time.time()
        self._last_log_time: float = 0.0
        self._last_logged_floor: float = self._noise_floor
        self._speech_logged: bool = False

        if self.config.enabled:
            logger.info(
                f"[Dynamic Noise Floor] Initialized: static_threshold={config.static_threshold:.2f}, "
                f"margin={config.margin:.2f}, bounds=[{config.min_bound:.2f}, {config.max_bound:.2f}]"
            )

    def attach_turn_tracking_observer(self, observer: "TurnTrackingObserver") -> None:
        """Subscribes to pipeline canonical turn events (mirrors TranscriptLogCoordinator)."""

        @observer.event_handler("on_bot_started_speaking")
        async def on_bot_started_speaking(_observer, turn_number: int, _data):
            self.set_bot_speaking(True)

        @observer.event_handler("on_bot_stopped_speaking")
        async def on_bot_stopped_speaking(_observer, turn_number: int, _data):
            self.set_bot_speaking(False)

        @observer.event_handler("on_turn_started")
        async def on_turn_started(_observer, turn_number: int):
            self.set_user_turn_active(True)

        @observer.event_handler("on_turn_ended")
        async def on_turn_ended(_observer, turn_number: int, _duration: float, was_interrupted: bool):
            self.set_user_turn_active(False)

    def set_bot_speaking(self, speaking: bool) -> None:
        """Updates bot speaking state and arms the egress buffer tail hold."""
        self._bot_speaking = speaking
        if not speaking:
            # Egress buffer drain hold: hold freeze for 250ms after bot audio finishes
            self._bot_tail_until = time.time() + self.config.bot_tail_hold_secs
            if self.config.enabled:
                logger.debug(
                    f"[Dynamic Noise Floor] Bot stopped speaking -> baseline hold armed for {self.config.bot_tail_hold_secs}s"
                )
        elif self.config.enabled:
            logger.info(
                f"[Dynamic Noise Floor] Bot started speaking -> freezing baseline at {self._noise_floor:.3f}"
            )

    def set_user_turn_active(self, active: bool) -> None:
        """Updates user turn state."""
        self._user_turn_active = active
        if self.config.enabled:
            if active:
                logger.info(
                    f"[Dynamic Noise Floor] User turn started -> freezing baseline at {self._noise_floor:.3f}"
                )
            else:
                logger.debug(
                    f"[Dynamic Noise Floor] User turn ended -> unfreezing baseline (floor={self._noise_floor:.3f})"
                )

    def set_dtmf_active(self, active: bool) -> None:
        """Called when in-band DTMF key tones are active."""
        self._dtmf_active = active

    def update_and_get_threshold(
        self,
        smoothed_volume: float,
        confidence: float,
        vad_state_quiet: bool
    ) -> float:
        """Updates baseline if non-speech, and returns the effective volume threshold."""
        smoothed_volume = _to_float(smoothed_volume)
        confidence = _to_float(confidence)

        if not self.config.enabled:
            return self.config.static_threshold

        now = time.time()
        elapsed = now - self._last_frame_time
        self._last_frame_time = now

        # Skip adaptation on DTX resume after network silence gap (>100ms)
        if elapsed > 0.10:
            return self._current_threshold

        # Initial warm-up fast acquisition
        if self._warmup_frames_remaining > 0:
            self._warmup_frames_remaining -= 1
            self._noise_floor = 0.80 * self._noise_floor + 0.20 * smoothed_volume
            return self._calculate_clamped_threshold()

        # Check egress audio playback tail hold
        is_egress_tail_active = (now < self._bot_tail_until)

        # Reject pure sinusoidal tonal spikes (In-band DTMF or tone interference)
        is_synthetic_tone = (smoothed_volume > 0.35 and confidence < 0.08)

        # Check update eligibility (Frozen during speech, turns, DTMF, and bot playback/tail)
        can_update = (
            vad_state_quiet
            and (confidence < 0.20)
            and (not self._bot_speaking)
            and (not is_egress_tail_active)
            and (not self._user_turn_active)
            and (not self._dtmf_active)
            and (not is_synthetic_tone)
        )

        if can_update:
            if smoothed_volume < self._noise_floor:
                # Fast decay into quiet room
                self._noise_floor = (
                    (1.0 - self.config.alpha_down) * self._noise_floor
                    + self.config.alpha_down * smoothed_volume
                )
            else:
                # Slow attack against rising sustained noise
                self._noise_floor = (
                    (1.0 - self.config.alpha_up) * self._noise_floor
                    + self.config.alpha_up * smoothed_volume
                )

        threshold = self._calculate_clamped_threshold()

        if self.config.enabled:
            # 1. Log intentional speech crossing
            if smoothed_volume >= threshold and confidence >= 0.20:
                if not self._speech_logged:
                    logger.info(
                        f"[Dynamic Noise Floor] 🗣️ Speech detected: vol={smoothed_volume:.3f} >= "
                        f"threshold={threshold:.3f} (floor={self._noise_floor:.3f}, silero_conf={confidence:.0%})"
                    )
                    self._speech_logged = True
            else:
                self._speech_logged = False

            # 2. Throttled periodic or significant floor change log
            floor_delta = abs(self._noise_floor - self._last_logged_floor)
            if (now - self._last_log_time >= 2.0) or (floor_delta >= 0.04 and (now - self._last_log_time >= 0.5)):
                state_str = "Adapting" if can_update else "Frozen"
                logger.info(
                    f"[Dynamic Noise Floor] 📊 Noise Floor: {self._noise_floor:.3f} | "
                    f"Dynamic Threshold: {threshold:.3f} | Input Vol: {smoothed_volume:.3f} [{state_str}]"
                )
                self._last_log_time = now
                self._last_logged_floor = self._noise_floor

        return threshold

    def _calculate_clamped_threshold(self) -> float:
        """Calculates floating threshold with dynamic margin compression and hard clamps."""
        # Dynamic margin compression in high noise floors (> 0.25)
        margin_compression = 0.25 * max(0.0, self._noise_floor - 0.25)
        effective_margin = max(0.08, self.config.margin - margin_compression)

        floating = self._noise_floor + effective_margin
        self._current_threshold = max(self.config.min_bound, min(self.config.max_bound, floating))
        return self._current_threshold

    @property
    def current_noise_floor(self) -> float:
        return self._noise_floor

    @property
    def current_threshold(self) -> float:
        return self._current_threshold if self.config.enabled else self.config.static_threshold
