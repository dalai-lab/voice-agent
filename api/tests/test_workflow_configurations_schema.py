import pytest
from pydantic import ValidationError

from api.constants import (
    MAX_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
    MIN_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
    TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS,
)
from api.schemas.workflow_configurations import (
    DEFAULT_MAX_CALL_DURATION_SECONDS,
    DEFAULT_TURN_SILENCE_TIMEOUT_SECS,
    DEFAULT_USER_TURN_STOP_TIMEOUT,
    DEFAULT_VAD_CONFIDENCE,
    DEFAULT_VAD_MIN_VOLUME,
    DEFAULT_VAD_STOP_SECS,
    MAX_CALL_DURATION_SECONDS,
    MAX_TURN_SILENCE_TIMEOUT_SECS,
    MAX_USER_TURN_STOP_TIMEOUT,
    MAX_VAD_CONFIDENCE,
    MAX_VAD_MIN_VOLUME,
    MAX_VAD_STOP_SECS,
    MIN_TURN_SILENCE_TIMEOUT_SECS,
    MIN_USER_TURN_STOP_TIMEOUT,
    MIN_VAD_CONFIDENCE,
    MIN_VAD_MIN_VOLUME,
    MIN_VAD_STOP_SECS,
    TextChatInactivityTimeoutConstraints,
    WorkflowConfigurationDefaults,
)


def test_max_call_duration_default_within_bounds():
    config = WorkflowConfigurationDefaults()
    assert config.max_call_duration == DEFAULT_MAX_CALL_DURATION_SECONDS


def test_max_call_duration_accepts_cap():
    config = WorkflowConfigurationDefaults(max_call_duration=MAX_CALL_DURATION_SECONDS)
    assert config.max_call_duration == MAX_CALL_DURATION_SECONDS


def test_max_call_duration_rejects_over_cap():
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(max_call_duration=MAX_CALL_DURATION_SECONDS + 1)


def test_max_call_duration_rejects_non_positive():
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(max_call_duration=0)


def test_text_chat_inactivity_timeout_defaults_to_deployment_value():
    config = WorkflowConfigurationDefaults()

    assert (
        config.text_chat_inactivity_timeout_seconds
        == TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS
    )


def test_text_chat_inactivity_timeout_accepts_workflow_override():
    config = WorkflowConfigurationDefaults(text_chat_inactivity_timeout_seconds=15 * 60)

    assert config.text_chat_inactivity_timeout_seconds == 15 * 60


def test_text_chat_inactivity_timeout_rejects_values_below_minimum():
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(
            text_chat_inactivity_timeout_seconds=(
                MIN_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS - 1
            )
        )


def test_text_chat_inactivity_timeout_rejects_values_beyond_sweep_lookback():
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(
            text_chat_inactivity_timeout_seconds=(
                MAX_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS + 1
            )
        )


def test_text_chat_inactivity_timeout_bounds_are_exported_in_schema():
    field_schema = WorkflowConfigurationDefaults.model_json_schema()["properties"][
        "text_chat_inactivity_timeout_seconds"
    ]

    assert field_schema["minimum"] == MIN_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS
    assert field_schema["maximum"] == MAX_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS


def test_text_chat_inactivity_timeout_constraints_export_backend_constants():
    constraints = TextChatInactivityTimeoutConstraints()

    assert constraints.default_seconds == TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS
    assert constraints.minimum_seconds == MIN_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS
    assert constraints.maximum_seconds == MAX_TEXT_CHAT_INACTIVITY_TIMEOUT_SECONDS


def test_null_values_treated_as_unset():
    """Stored configs / older clients send explicit JSON nulls for keys the
    user never configured; they must validate as defaults, not fail."""
    config = WorkflowConfigurationDefaults.model_validate(
        {
            "max_call_duration": None,
            "turn_start_strategy": None,
            "turn_start_min_words": None,
        }
    )
    assert config.max_call_duration == DEFAULT_MAX_CALL_DURATION_SECONDS
    # Nulls count as unset, so a sparse round-trip drops them entirely.
    assert config.model_dump(exclude_unset=True) == {}


def test_exclude_unset_round_trip_stays_sparse():
    config = WorkflowConfigurationDefaults.model_validate(
        {"max_call_duration": 600, "custom_extra_key": {"a": 1}}
    )
    assert config.model_dump(exclude_unset=True) == {
        "max_call_duration": 600,
        "custom_extra_key": {"a": 1},
    }


def test_cap_stays_within_concurrency_stale_timeout():
    """A call outliving the rate limiter's stale window has its concurrency
    slot purged mid-call, so the cap must never exceed it."""
    from api.services.call_concurrency.rate_limiter import rate_limiter

    assert MAX_CALL_DURATION_SECONDS <= rate_limiter.stale_call_timeout


def test_external_pbx_field_mapping_is_validated():
    config = WorkflowConfigurationDefaults(
        external_pbx_field_mappings=[
            {"context_path": " qualified ", "destination_field": " address3 "}
        ]
    )

    assert config.external_pbx_field_mappings[0].context_path == "qualified"
    assert config.external_pbx_field_mappings[0].destination_field == "address3"


def test_external_pbx_field_mapping_rejects_blank_context_paths():
    with pytest.raises(ValidationError, match="context_path"):
        WorkflowConfigurationDefaults(
            external_pbx_field_mappings=[
                {"context_path": "   ", "destination_field": "address3"}
            ]
        )


def test_external_pbx_field_mapping_rejects_invalid_field_names():
    with pytest.raises(ValidationError, match="destination_field"):
        WorkflowConfigurationDefaults(
            external_pbx_field_mappings=[
                {"context_path": "qualified", "destination_field": "invalid-field"}
            ]
        )


def test_vad_min_volume_default_and_bounds():
    config = WorkflowConfigurationDefaults()
    assert config.vad_min_volume == DEFAULT_VAD_MIN_VOLUME

    # Accepts boundary values
    assert WorkflowConfigurationDefaults(vad_min_volume=MIN_VAD_MIN_VOLUME).vad_min_volume == MIN_VAD_MIN_VOLUME
    assert WorkflowConfigurationDefaults(vad_min_volume=MAX_VAD_MIN_VOLUME).vad_min_volume == MAX_VAD_MIN_VOLUME

    # Rejects out-of-bounds
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(vad_min_volume=MIN_VAD_MIN_VOLUME - 0.01)
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(vad_min_volume=MAX_VAD_MIN_VOLUME + 0.01)


def test_vad_confidence_default_and_bounds():
    config = WorkflowConfigurationDefaults()
    assert config.vad_confidence == DEFAULT_VAD_CONFIDENCE

    # Accepts boundary values
    assert WorkflowConfigurationDefaults(vad_confidence=MIN_VAD_CONFIDENCE).vad_confidence == MIN_VAD_CONFIDENCE
    assert WorkflowConfigurationDefaults(vad_confidence=MAX_VAD_CONFIDENCE).vad_confidence == MAX_VAD_CONFIDENCE

    # Rejects out-of-bounds
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(vad_confidence=MIN_VAD_CONFIDENCE - 0.01)
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(vad_confidence=MAX_VAD_CONFIDENCE + 0.01)


def test_vad_stop_secs_default_and_bounds():
    config = WorkflowConfigurationDefaults()
    assert config.vad_stop_secs == DEFAULT_VAD_STOP_SECS

    # Accepts boundary values
    assert WorkflowConfigurationDefaults(vad_stop_secs=MIN_VAD_STOP_SECS).vad_stop_secs == MIN_VAD_STOP_SECS
    assert WorkflowConfigurationDefaults(vad_stop_secs=MAX_VAD_STOP_SECS).vad_stop_secs == MAX_VAD_STOP_SECS

    # Rejects out-of-bounds
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(vad_stop_secs=MIN_VAD_STOP_SECS - 0.01)
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(vad_stop_secs=MAX_VAD_STOP_SECS + 0.01)


def test_user_turn_stop_timeout_default_and_bounds():
    config = WorkflowConfigurationDefaults()
    assert config.user_turn_stop_timeout == DEFAULT_USER_TURN_STOP_TIMEOUT

    # Accepts boundary values
    assert WorkflowConfigurationDefaults(user_turn_stop_timeout=MIN_USER_TURN_STOP_TIMEOUT).user_turn_stop_timeout == MIN_USER_TURN_STOP_TIMEOUT
    assert WorkflowConfigurationDefaults(user_turn_stop_timeout=MAX_USER_TURN_STOP_TIMEOUT).user_turn_stop_timeout == MAX_USER_TURN_STOP_TIMEOUT

    # Rejects out-of-bounds
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(user_turn_stop_timeout=MIN_USER_TURN_STOP_TIMEOUT - 0.1)
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(user_turn_stop_timeout=MAX_USER_TURN_STOP_TIMEOUT + 0.1)


def test_turn_silence_timeout_secs_default_and_bounds():
    config = WorkflowConfigurationDefaults()
    assert config.turn_silence_timeout_secs == DEFAULT_TURN_SILENCE_TIMEOUT_SECS

    # Accepts boundary values
    assert WorkflowConfigurationDefaults(turn_silence_timeout_secs=MIN_TURN_SILENCE_TIMEOUT_SECS).turn_silence_timeout_secs == MIN_TURN_SILENCE_TIMEOUT_SECS
    assert WorkflowConfigurationDefaults(turn_silence_timeout_secs=MAX_TURN_SILENCE_TIMEOUT_SECS).turn_silence_timeout_secs == MAX_TURN_SILENCE_TIMEOUT_SECS

    # Rejects out-of-bounds
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(turn_silence_timeout_secs=MIN_TURN_SILENCE_TIMEOUT_SECS - 0.05)
    with pytest.raises(ValidationError):
        WorkflowConfigurationDefaults(turn_silence_timeout_secs=MAX_TURN_SILENCE_TIMEOUT_SECS + 0.05)


def test_boost_affirmations_default():
    config = WorkflowConfigurationDefaults()
    assert config.boost_affirmations is True

    # Accepts override
    assert WorkflowConfigurationDefaults(boost_affirmations=False).boost_affirmations is False


def test_vad_and_turn_settings_null_values_treated_as_unset():
    config = WorkflowConfigurationDefaults.model_validate(
        {
            "vad_min_volume": None,
            "vad_confidence": None,
            "vad_stop_secs": None,
            "user_turn_stop_timeout": None,
            "turn_silence_timeout_secs": None,
            "boost_affirmations": None,
        }
    )
    assert config.vad_min_volume == DEFAULT_VAD_MIN_VOLUME
    assert config.vad_confidence == DEFAULT_VAD_CONFIDENCE
    assert config.vad_stop_secs == DEFAULT_VAD_STOP_SECS
    assert config.user_turn_stop_timeout == DEFAULT_USER_TURN_STOP_TIMEOUT
    assert config.turn_silence_timeout_secs == DEFAULT_TURN_SILENCE_TIMEOUT_SECS
    assert config.boost_affirmations is True
    # Verify sparse dump drops nulls
    assert config.model_dump(exclude_unset=True) == {}
