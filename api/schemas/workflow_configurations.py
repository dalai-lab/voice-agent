from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from api.constants import (
    MAX_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
    MIN_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
    TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
)

DEFAULT_MAX_CALL_DURATION_SECONDS = 300
# Hard ceiling on configurable call duration. Must stay <= the concurrency
# rate limiter's stale_call_timeout (20 min): a call running past that has
# its slot purged as stale and the org concurrency limit under-counts.
MAX_CALL_DURATION_SECONDS = 1200
DEFAULT_MAX_USER_IDLE_TIMEOUT_SECONDS = 10.0
DEFAULT_SMART_TURN_STOP_SECS = 2.0
DEFAULT_TURN_START_STRATEGY = "default"
DEFAULT_TURN_START_MIN_WORDS = 3
DEFAULT_PROVISIONAL_VAD_PAUSE_SECS = 1.5
DEFAULT_TURN_STOP_STRATEGY = "transcription"
DEFAULT_CONTEXT_COMPACTION_ENABLED = False

# Constants for Turn Detection & Voice Sensitivity
DEFAULT_VAD_MIN_VOLUME: float = 0.20
MIN_VAD_MIN_VOLUME: float = 0.05
MAX_VAD_MIN_VOLUME: float = 0.80

DEFAULT_VAD_CONFIDENCE: float = 0.50
MIN_VAD_CONFIDENCE: float = 0.30
MAX_VAD_CONFIDENCE: float = 0.90

DEFAULT_VAD_STOP_SECS: float = 0.25
MIN_VAD_STOP_SECS: float = 0.10
MAX_VAD_STOP_SECS: float = 1.00

DEFAULT_USER_TURN_STOP_TIMEOUT: float = 3.5
MIN_USER_TURN_STOP_TIMEOUT: float = 1.0
MAX_USER_TURN_STOP_TIMEOUT: float = 15.0

DEFAULT_EXTERNAL_TURN_USER_STOP_TIMEOUT: float = 4.0

DEFAULT_TURN_SILENCE_TIMEOUT_SECS: float = 0.8
MIN_TURN_SILENCE_TIMEOUT_SECS: float = 0.3
MAX_TURN_SILENCE_TIMEOUT_SECS: float = 3.0


class ExternalPBXFieldMapping(BaseModel):
    """Map one gathered-context value to a provider-native field."""

    context_path: str = Field(min_length=1, max_length=255)
    destination_field: str = Field(pattern=r"^[A-Za-z][A-Za-z0-9_]{0,63}$")

    @field_validator("context_path", mode="before")
    @classmethod
    def strip_context_path(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("destination_field", mode="before")
    @classmethod
    def strip_destination_field(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class AmbientNoiseConfigurationDefaults(BaseModel):
    model_config = ConfigDict(extra="allow")

    enabled: bool = False
    volume: float = 0.3


class WorkflowConfigurationDefaults(BaseModel):
    model_config = ConfigDict(extra="allow")

    @model_validator(mode="before")
    @classmethod
    def _treat_null_as_unset(cls, data):
        # Stored configs (and older clients) carry explicit JSON nulls for
        # keys the user never configured; dropping them lets the field
        # defaults apply instead of failing validation.
        if isinstance(data, dict):
            return {k: v for k, v in data.items() if v is not None}
        return data

    ambient_noise_configuration: AmbientNoiseConfigurationDefaults = Field(
        default_factory=AmbientNoiseConfigurationDefaults
    )
    max_call_duration: int = Field(
        default=DEFAULT_MAX_CALL_DURATION_SECONDS,
        gt=0,
        le=MAX_CALL_DURATION_SECONDS,
    )
    max_user_idle_timeout: float = DEFAULT_MAX_USER_IDLE_TIMEOUT_SECONDS
    smart_turn_stop_secs: float = DEFAULT_SMART_TURN_STOP_SECS
    turn_start_strategy: Literal["default", "min_words", "provisional_vad"] = (
        DEFAULT_TURN_START_STRATEGY
    )
    turn_start_min_words: int = DEFAULT_TURN_START_MIN_WORDS
    provisional_vad_pause_secs: float = DEFAULT_PROVISIONAL_VAD_PAUSE_SECS
    turn_stop_strategy: Literal["transcription", "turn_analyzer"] = (
        DEFAULT_TURN_STOP_STRATEGY
    )
    dictionary: str = ""
    context_compaction_enabled: bool = DEFAULT_CONTEXT_COMPACTION_ENABLED
    text_chat_inactivity_timeout_seconds: int = Field(
        default=TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
        ge=MIN_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
        le=MAX_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
    )
    external_pbx_field_mappings: list[ExternalPBXFieldMapping] = Field(
        default_factory=list,
        max_length=100,
    )
    vad_min_volume: float = Field(
        default=DEFAULT_VAD_MIN_VOLUME,
        ge=MIN_VAD_MIN_VOLUME,
        le=MAX_VAD_MIN_VOLUME,
        description="Audio loudness threshold for detecting human voice. Lower detects whispers and quiet 'yes'.",
    )
    vad_confidence: float = Field(
        default=DEFAULT_VAD_CONFIDENCE,
        ge=MIN_VAD_CONFIDENCE,
        le=MAX_VAD_CONFIDENCE,
        description="Silero VAD speech probability threshold.",
    )
    vad_stop_secs: float = Field(
        default=DEFAULT_VAD_STOP_SECS,
        ge=MIN_VAD_STOP_SECS,
        le=MAX_VAD_STOP_SECS,
        description="Silence duration before VAD marks speech ended.",
    )
    user_turn_stop_timeout: float = Field(
        default=DEFAULT_USER_TURN_STOP_TIMEOUT,
        ge=MIN_USER_TURN_STOP_TIMEOUT,
        le=MAX_USER_TURN_STOP_TIMEOUT,
        description="Safety timeout (seconds) to force user turn completion if transcriber/analyzer stalls.",
    )
    turn_silence_timeout_secs: float = Field(
        default=DEFAULT_TURN_SILENCE_TIMEOUT_SECS,
        ge=MIN_TURN_SILENCE_TIMEOUT_SECS,
        le=MAX_TURN_SILENCE_TIMEOUT_SECS,
        description="Silence duration after user speech before bot generates response.",
    )
    boost_affirmations: bool = Field(
        default=True,
        description="Inject acoustic keyterm boosts for short affirmations ('yes', 'no', 'yeah', 'correct').",
    )


class TextChatInactivityTimeoutConstraints(BaseModel):
    """Backend-owned timeout metadata consumed by generated API clients."""

    default_seconds: int = TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS
    minimum_seconds: int = MIN_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS
    maximum_seconds: int = MAX_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS


def get_default_workflow_configurations() -> WorkflowConfigurationDefaults:
    return WorkflowConfigurationDefaults()
