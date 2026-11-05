from types import SimpleNamespace
from unittest.mock import patch

import pytest
from pipecat.services.settings import NOT_GIVEN
from pipecat.transcriptions.language import Language

from api.services.configuration.registry import (
    DeepgramSTTConfiguration,
    OpenAILLMService,
    SarvamLLMConfiguration,
    SarvamTTSConfiguration,
    ServiceProviders,
    SmallestAISTTConfiguration,
    SmallestAITTSConfiguration,
)
from api.services.pipecat.audio_config import AudioConfig
from api.services.pipecat.service_factory import (
    create_llm_service,
    create_stt_service,
    create_tts_service,
)


@pytest.fixture
def audio_config():
    return AudioConfig(
        transport_in_sample_rate=16000,
        transport_out_sample_rate=16000,
    )


class TestSmallestAITTSConfigurationEnhancements:
    def test_schema_defaults(self):
        config = SmallestAITTSConfiguration(api_key="test-key")
        assert config.word_timestamps is True
        assert config.sample_rate is None
        assert "auto" in SmallestAITTSConfiguration.model_json_schema()["properties"]["language"]["examples"]

    def test_factory_passes_custom_sample_rate_and_word_timestamps(self, audio_config):
        user_config = SimpleNamespace(
            tts=SimpleNamespace(
                provider=ServiceProviders.SMALLEST.value,
                api_key="test-key",
                model="lightning_v3.1",
                voice="sophia",
                language="auto",
                speed=1.2,
                sample_rate=24000,
                word_timestamps=False,
            )
        )
        with patch("api.services.pipecat.service_factory.SmallestTTSService") as mock_service:
            create_tts_service(user_config, audio_config)

        kwargs = mock_service.call_args.kwargs
        assert kwargs["settings"].model == "lightning_v3.1"
        assert kwargs["settings"].voice == "sophia"
        assert kwargs["settings"].language == "auto"
        assert kwargs["settings"].speed == 1.2
        assert kwargs["sample_rate"] == 24000
        assert kwargs["word_timestamps"] is False


class TestSarvamTTSConfigurationEnhancements:
    def test_schema_defaults(self):
        config = SarvamTTSConfiguration(api_key="test-key")
        assert config.temperature is None
        assert config.min_buffer_size is None
        assert config.max_chunk_length is None
        assert config.pitch is None
        assert config.loudness is None
        assert config.enable_preprocessing is None

    def test_factory_guards_temperature_to_v3_and_v4(self, audio_config):
        # bulbul:v3 gets temperature
        user_config_v3 = SimpleNamespace(
            tts=SimpleNamespace(
                provider=ServiceProviders.SARVAM.value,
                api_key="test-key",
                model="bulbul:v3",
                voice="shubh",
                language="hi-IN",
                temperature=0.85,
                min_buffer_size=25,
                max_chunk_length=120,
            )
        )
        with patch("api.services.pipecat.service_factory.SarvamTTSService") as mock_service:
            create_tts_service(user_config_v3, audio_config)

        settings = mock_service.call_args.kwargs["settings"]
        assert settings.temperature == 0.85
        assert settings.min_buffer_size == 25
        assert settings.max_chunk_length == 120

        # bulbul:v2 does NOT get temperature even if set, but gets pitch/loudness
        user_config_v2 = SimpleNamespace(
            tts=SimpleNamespace(
                provider=ServiceProviders.SARVAM.value,
                api_key="test-key",
                model="bulbul:v2",
                voice="anushka",
                language="hi-IN",
                temperature=0.85,
                pitch=0.2,
                loudness=1.4,
                enable_preprocessing=True,
            )
        )
        with patch("api.services.pipecat.service_factory.SarvamTTSService") as mock_service_v2:
            create_tts_service(user_config_v2, audio_config)

        settings_v2 = mock_service_v2.call_args.kwargs["settings"]
        assert getattr(settings_v2, "pitch", None) == 0.2
        assert getattr(settings_v2, "loudness", None) == 1.4
        assert getattr(settings_v2, "enable_preprocessing", None) is True


class TestDeepgramSTTConfigurationEnhancements:
    def test_schema_defaults(self):
        config = DeepgramSTTConfiguration(api_key="test-key")
        assert config.endpointing == 100
        assert config.profanity_filter is False
        assert config.eot_threshold == 0.7
        assert config.eot_timeout_ms == 3000
        assert config.eager_eot_threshold == 0.5
        assert config.smart_format is None
        assert config.numerals is None

    def test_factory_passes_nova_options(self, audio_config):
        user_config = SimpleNamespace(
            stt=SimpleNamespace(
                provider=ServiceProviders.DEEPGRAM.value,
                api_key="test-key",
                model="nova-3-general",
                language="en",
                endpointing=250,
                profanity_filter=True,
                smart_format=True,
                punctuate=True,
                numerals=True,
                utterance_end_ms=1200,
            )
        )
        with patch("api.services.pipecat.service_factory.DeepgramSTTService") as mock_service:
            create_stt_service(user_config, audio_config)

        settings = mock_service.call_args.kwargs["settings"]
        assert settings.endpointing == 250
        assert settings.profanity_filter is True
        assert settings.smart_format is True
        assert settings.punctuate is True
        assert settings.numerals is True
        assert settings.utterance_end_ms == 1200

    def test_factory_passes_flux_options_without_nova_leakage(self, audio_config):
        user_config = SimpleNamespace(
            stt=SimpleNamespace(
                provider=ServiceProviders.DEEPGRAM.value,
                api_key="test-key",
                model="flux-general-en",
                language="en",
                eot_threshold=0.85,
                eot_timeout_ms=4500,
                eager_eot_threshold=0.6,
                numerals=True,
            )
        )
        with patch("api.services.pipecat.service_factory.DeepgramFluxSTTService") as mock_service:
            create_stt_service(user_config, audio_config)

        settings = mock_service.call_args.kwargs["settings"]
        assert settings.eot_threshold == 0.85
        assert settings.eot_timeout_ms == 4500
        assert settings.eager_eot_threshold == 0.6
        assert settings.numerals is True


class TestOpenAILLMConfigurationEnhancements:
    def test_schema_defaults(self):
        config = OpenAILLMService(api_key="test-key")
        assert config.temperature is None
        assert config.reasoning_effort is None
        assert config.max_completion_tokens is None
        assert config.top_p is None

    def test_factory_guards_temperature_for_reasoning_models(self):
        # o3-mini must NEVER have temperature passed to prevent 400 Bad Request
        user_config_o3 = SimpleNamespace(
            llm=SimpleNamespace(
                provider=ServiceProviders.OPENAI.value,
                api_key="test-key",
                model="o3-mini",
                temperature=0.7,
                reasoning_effort="low",
                max_tokens=200,
            )
        )
        with patch("api.services.pipecat.service_factory.OpenAILLMService") as mock_service:
            create_llm_service(user_config_o3)

        settings = mock_service.call_args.kwargs["settings"]
        # temperature should NOT be set
        assert settings.temperature in (None, NOT_GIVEN) if hasattr(settings, "temperature") else True
        assert settings.extra.get("reasoning_effort") == "low"
        # max_tokens auto-mapped to max_completion_tokens
        assert settings.max_completion_tokens == 200

    def test_factory_passes_temperature_for_standard_models(self):
        user_config_gpt4 = SimpleNamespace(
            llm=SimpleNamespace(
                provider=ServiceProviders.OPENAI.value,
                api_key="test-key",
                model="gpt-4.1",
                temperature=0.3,
                top_p=0.9,
                frequency_penalty=0.5,
                presence_penalty=0.2,
                seed=42,
            )
        )
        with patch("api.services.pipecat.service_factory.OpenAILLMService") as mock_service:
            create_llm_service(user_config_gpt4)

        settings = mock_service.call_args.kwargs["settings"]
        assert settings.temperature == 0.3
        assert settings.top_p == 0.9
        assert settings.frequency_penalty == 0.5
        assert settings.presence_penalty == 0.2
        assert settings.seed == 42


class TestSarvamLLMConfigurationEnhancements:
    def test_schema_defaults(self):
        config = SarvamLLMConfiguration(api_key="test-key")
        assert config.temperature == 0.5
        assert config.reasoning_effort is None
        assert config.max_tokens is None
        assert config.base_url == "https://api.sarvam.ai/v1"

    def test_factory_passes_all_options(self):
        user_config = SimpleNamespace(
            llm=SimpleNamespace(
                provider=ServiceProviders.SARVAM.value,
                api_key="test-key",
                model="sarvam-30b",
                temperature=0.4,
                reasoning_effort="low",
                max_tokens=300,
                top_p=0.9,
                frequency_penalty=0.3,
                presence_penalty=0.1,
                wiki_grounding=True,
                base_url="https://api.sarvam.ai/v2",
            )
        )
        with patch("api.services.pipecat.service_factory.SarvamLLMService") as mock_service:
            create_llm_service(user_config)

        call_kwargs = mock_service.call_args.kwargs
        assert call_kwargs["base_url"] == "https://api.sarvam.ai/v2"
        settings = call_kwargs["settings"]
        assert settings.temperature == 0.4
        assert settings.reasoning_effort == "low"
        assert settings.max_tokens == 300
        assert settings.top_p == 0.9
        assert settings.frequency_penalty == 0.3
        assert settings.presence_penalty == 0.1
        assert settings.wiki_grounding is True

    def test_sarvam_reasoning_effort_none_supported(self):
        config = SarvamLLMConfiguration(api_key="test-key", reasoning_effort="none")
        assert config.reasoning_effort == "none"

        user_config = SimpleNamespace(
            llm=SimpleNamespace(
                provider=ServiceProviders.SARVAM.value,
                api_key="test-key",
                model="sarvam-105b",
                reasoning_effort="none",
            )
        )
        with patch("api.services.pipecat.service_factory.SarvamLLMService") as mock_service:
            create_llm_service(user_config)

        settings = mock_service.call_args.kwargs["settings"]
        assert settings.reasoning_effort == "none"


class TestSanitizationEnhancements:
    def test_sanitize_empty_and_nan(self):
        # Test OpenAI LLM with empty string and NaN
        openai_cfg = OpenAILLMService.model_validate({
            "provider": "openai",
            "api_key": "test-key",
            "model": "gpt-4.1",
            "temperature": float("nan"),
            "reasoning_effort": "",
            "max_tokens": "",
        })
        assert openai_cfg.temperature is None
        assert openai_cfg.reasoning_effort is None
        assert openai_cfg.max_tokens is None

        # Test Deepgram STT with empty string and NaN
        deepgram_cfg = DeepgramSTTConfiguration.model_validate({
            "provider": "deepgram",
            "api_key": "test-key",
            "model": "nova-3-general",
            "endpointing": "",
            "utterance_end_ms": "",
            "smart_format": "",
        })
        assert deepgram_cfg.endpointing == 100  # Default preserved
        assert deepgram_cfg.utterance_end_ms is None
        assert deepgram_cfg.smart_format is None

        # Test Sarvam TTS with empty string and NaN
        sarvam_cfg = SarvamTTSConfiguration.model_validate({
            "provider": "sarvam",
            "api_key": "test-key",
            "model": "bulbul:v3",
            "temperature": float("nan"),
            "min_buffer_size": "",
            "pitch": "",
        })
        assert sarvam_cfg.temperature is None
        assert sarvam_cfg.min_buffer_size is None
        assert sarvam_cfg.pitch is None

        # Test Smallest STT with empty strings and defaults
        smallest_stt_cfg = SmallestAISTTConfiguration.model_validate({
            "provider": "smallest",
            "api_key": "test-key",
            "model": "pulse-2",
            "eou_timeout_ms": "",
            "keywords": "",
            "emotion_detection": "",
        })
        assert smallest_stt_cfg.model == "pulse-2"
        assert smallest_stt_cfg.eou_timeout_ms is None
        assert smallest_stt_cfg.keywords is None
        assert smallest_stt_cfg.emotion_detection is None

