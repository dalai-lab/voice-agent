"""Mock telephony provider package for campaign soak testing."""

from typing import Any

from api.services.telephony.registry import (
    ProviderSpec,
    ProviderUIField,
    ProviderUIMetadata,
    register,
)

from .config import MockConfigurationRequest, MockConfigurationResponse
from .provider import MockTelephonyProvider


def _config_loader(value: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": "mock",
        "from_numbers": value.get("from_numbers", ["+19990000001", "+19990000002"]),
        "min_duration_seconds": value.get("min_duration_seconds", 10),
        "max_duration_seconds": value.get("max_duration_seconds", 600),
        "outcomes": value.get(
            "outcomes",
            {
                "completed": 70,
                "busy": 10,
                "no_answer": 10,
                "carrier_error": 5,
                "callback": 5,
            },
        ),
        "callback_delay_minutes": value.get("callback_delay_minutes", 15),
        "fast_forward_callbacks": value.get("fast_forward_callbacks", False),
    }


async def _dummy_transport(*args: Any, **kwargs: Any) -> None:
    return None


_UI_METADATA = ProviderUIMetadata(
    display_name="Mock Simulator (Zero-Cost)",
    docs_url="https://docs.dograh.com/integrations/telephony/mock",
    fields=[
        ProviderUIField(
            name="from_numbers",
            label="Phone Numbers",
            type="string-array",
            description="E.164-formatted simulated phone numbers for the caller ID pool",
        ),
        ProviderUIField(
            name="min_duration_seconds",
            label="Min Duration (Seconds)",
            type="number",
            description="Minimum simulated call duration",
        ),
        ProviderUIField(
            name="max_duration_seconds",
            label="Max Duration (Seconds)",
            type="number",
            description="Maximum simulated call duration (up to 1800s / 30m)",
        ),
        ProviderUIField(
            name="callback_delay_minutes",
            label="Callback Delay (Minutes)",
            type="number",
            description="Scheduled callback delay in minutes",
        ),
        ProviderUIField(
            name="fast_forward_callbacks",
            label="Fast Forward Callbacks",
            type="boolean",
            description="Bypass sociable hours clamping to test callbacks overnight immediately",
        ),
    ],
)


SPEC = ProviderSpec(
    name="mock",
    provider_cls=MockTelephonyProvider,
    config_loader=_config_loader,
    transport_factory=_dummy_transport,
    transport_sample_rate=8000,
    config_request_cls=MockConfigurationRequest,
    ui_metadata=_UI_METADATA,
    config_response_cls=MockConfigurationResponse,
    account_id_credential_field="",
)


register(SPEC)

__all__ = [
    "SPEC",
    "MockConfigurationRequest",
    "MockConfigurationResponse",
    "MockTelephonyProvider",
]
