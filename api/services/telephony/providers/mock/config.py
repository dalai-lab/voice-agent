"""Mock telephony provider configuration schemas."""

from typing import Any, Literal
from pydantic import BaseModel, Field


class MockConfigurationRequest(BaseModel):
    """Configuration request schema for Mock Telephony Provider."""

    provider: Literal["mock"] = Field(default="mock")
    from_numbers: list[str] = Field(
        default_factory=lambda: ["+19990000001", "+19990000002"],
        description="Simulated caller ID phone numbers for the pool",
    )
    min_duration_seconds: int = Field(
        default=10,
        description="Minimum call duration in seconds",
    )
    max_duration_seconds: int = Field(
        default=600,
        description="Maximum call duration in seconds (up to 1800s / 30m)",
    )
    outcomes: dict[str, int] = Field(
        default_factory=lambda: {
            "completed": 70,
            "busy": 10,
            "no_answer": 10,
            "carrier_error": 5,
            "callback": 5,
        },
        description="Weighted distribution of simulated call outcomes",
    )
    callback_delay_minutes: int = Field(
        default=15,
        description="Default delay in minutes for simulated callbacks",
    )
    fast_forward_callbacks: bool = Field(
        default=False,
        description="When true, bypasses sociable hours clamping to test callbacks overnight instantly",
    )


class MockConfigurationResponse(BaseModel):
    """Configuration response schema for Mock Telephony Provider."""

    provider: Literal["mock"] = Field(default="mock")
    from_numbers: list[str] = Field(default_factory=list)
    min_duration_seconds: int = 10
    max_duration_seconds: int = 600
    outcomes: dict[str, int] = Field(default_factory=dict)
    callback_delay_minutes: int = 15
    fast_forward_callbacks: bool = False
