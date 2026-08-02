"""Telnyx telephony configuration schemas."""

from typing import Literal

from pydantic import BaseModel, Field


class TelnyxConfigurationRequest(BaseModel):
    """Request schema for Telnyx configuration."""

    provider: Literal["telnyx"] = Field(default="telnyx")
    api_key: str = Field(..., description="Telnyx API Key")
    connection_id: str | None = Field(
        default=None,
        description=(
            "Telnyx Call Control Application ID (connection_id). If omitted, "
            "a Call Control Application is auto-created on save and its id is "
            "stored on the configuration."
        ),
    )
    webhook_public_key: str | None = Field(
        default=None,
        description=(
            "Webhook public key from Mission Control Portal → Keys & "
            "Credentials → Public Key. Used to verify Telnyx webhook "
            "signatures."
        ),
    )
    # Phone numbers are managed via the dedicated phone-numbers endpoints; the
    # legacy /telephony-config POST shim still accepts them inline.
    from_numbers: list[str] = Field(
        default_factory=list, description="List of Telnyx phone numbers"
    )


class TelnyxConfigurationResponse(BaseModel):
    """Response schema for Telnyx configuration with masked sensitive fields."""

    provider: Literal["telnyx"] = Field(default="telnyx")
    api_key: str  # Masked
    connection_id: str | None = None
    webhook_public_key: str | None = None
    from_numbers: list[str]
