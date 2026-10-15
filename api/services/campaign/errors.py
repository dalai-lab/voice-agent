"""
Campaign service exceptions.
"""


class ConcurrentSlotAcquisitionError(Exception):
    """Raised when a concurrent call slot cannot be acquired within the timeout period."""

    def __init__(
        self,
        organization_id: int,
        campaign_id: int,
        wait_time: float,
        max_concurrent: int = 0,
    ):
        self.organization_id = organization_id
        self.campaign_id = campaign_id
        self.wait_time = wait_time
        self.max_concurrent = max_concurrent
        super().__init__(
            f"Failed to acquire concurrent slot for org {organization_id}, "
            f"campaign {campaign_id} after waiting {wait_time:.1f}s"
        )


class PhoneNumberPoolExhaustedError(Exception):
    """Raised when no phone numbers are available in the pool for outbound calls."""

    def __init__(
        self,
        organization_id: int,
        telephony_configuration_id: int | None = None,
        campaign_id: int | None = None,
    ):
        self.organization_id = organization_id
        self.telephony_configuration_id = telephony_configuration_id
        self.campaign_id = campaign_id
        super().__init__(
            f"All phone numbers are in use for org {organization_id}. "
            f"No available from_number in pool."
        )


class CampaignQuotaExceededError(Exception):
    """Raised when a campaign call cannot be dispatched due to exhausted quota, wallet depletion, or concurrency limit."""

    def __init__(
        self,
        organization_id: int,
        campaign_id: int,
        error_code: str,
        error_message: str,
    ):
        self.organization_id = organization_id
        self.campaign_id = campaign_id
        self.error_code = error_code
        self.error_message = error_message
        super().__init__(
            f"Quota check failed for campaign {campaign_id} (org {organization_id}): [{error_code}] {error_message}"
        )

