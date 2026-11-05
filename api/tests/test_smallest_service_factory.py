from types import SimpleNamespace
from unittest.mock import patch

from api.services.configuration.check_validity import UserConfigurationValidator
from api.services.configuration.registry import (
    REGISTRY,
    ServiceProviders,
    ServiceType,
    SmallestAISTTConfiguration,
    SmallestAITTSConfiguration,
)
from api.services.pipecat.service_factory import (
    create_stt_service,
    create_tts_service,
)


def test_smallest_tts_configuration_defaults_and_registry():
    config = SmallestAITTSConfiguration(api_key="test-key")

    assert config.provider == ServiceProviders.SMALLEST
    assert config.model == "lightning_v3.1"
    assert config.voice == "sophia"
    assert config.language == "en"
    assert config.speed == 1.0
    assert (
        REGISTRY[ServiceType.TTS][ServiceProviders.SMALLEST]
        is SmallestAITTSConfiguration
    )


def test_smallest_stt_configuration_defaults_and_registry():
    config = SmallestAISTTConfiguration(api_key="test-key")

    assert config.provider == ServiceProviders.SMALLEST
    assert config.model == "pulse"
    assert config.language == "en"
    assert (
        REGISTRY[ServiceType.STT][ServiceProviders.SMALLEST]
        is SmallestAISTTConfiguration
    )


def test_validator_accepts_smallest_services():
    validator = UserConfigurationValidator()

    assert (
        validator._validate_service(
            SmallestAITTSConfiguration(api_key="test-key"),
            "tts",
        )
        == []
    )
    assert (
        validator._validate_service(
            SmallestAISTTConfiguration(api_key="test-key"),
            "stt",
        )
        == []
    )


def test_create_smallest_tts_service_normalizes_hyphenated_model_values():
    user_config = SimpleNamespace(
        tts=SimpleNamespace(
            provider=ServiceProviders.SMALLEST.value,
            api_key="test-key",
            model="lightning-v3.1",
            voice="sophia",
            language="en",
            speed=1.0,
        )
    )
    audio_config = SimpleNamespace(transport_in_sample_rate=16000)

    with patch(
        "api.services.pipecat.service_factory.SmallestTTSService"
    ) as mock_service:
        create_tts_service(user_config, audio_config)

    assert mock_service.call_count == 1
    kwargs = mock_service.call_args.kwargs
    assert kwargs["settings"].model == "lightning_v3.1"


def test_create_smallest_stt_service_passes_advanced_parameters():
    user_config = SimpleNamespace(
        stt=SimpleNamespace(
            provider=ServiceProviders.SMALLEST.value,
            api_key="test-key",
            model="pulse-2",
            language="multi",
            keywords="Talkar:2,Nvidia:3",
            itn_normalize=True,
            format=True,
            word_timestamps=True,
            sentence_timestamps=True,
            diarize=True,
            redact_pii=True,
            redact_pci=True,
            endpointing=True,
            eou_timeout_ms=500,
            emotion_detection=True,
            gender_detection=True,
        )
    )
    audio_config = SimpleNamespace(transport_in_sample_rate=16000)

    with patch(
        "api.services.pipecat.service_factory.SmallestSTTService"
    ) as mock_service:
        create_stt_service(user_config, audio_config, boost_affirmations=False)

    assert mock_service.call_count == 1
    kwargs = mock_service.call_args.kwargs
    settings = kwargs["settings"]
    assert settings.model == "pulse-2"
    assert settings.language == "multi"
    assert settings.keywords == "Talkar:2,Nvidia:3"
    assert settings.itn_normalize is True
    assert settings.format is True
    assert settings.word_timestamps is True
    assert settings.sentence_timestamps is True
    assert settings.diarize is True
    assert settings.redact_pii is True
    assert settings.redact_pci is True
    assert settings.endpointing is True
    assert settings.eou_timeout_ms == 500
    assert settings.emotion_detection is True
    assert settings.gender_detection is True
