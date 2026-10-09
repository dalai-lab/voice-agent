
from api.constants import DEPLOYMENT_MODE
from api.services.mps_service_key_client import mps_service_key_client


async def ensure_hosted_mps_billing_account_v2(
    organization_id: int,
    *,
    created_by: str | None = None,
) -> dict | None:
    """Ensure hosted orgs have an MPS billing v2 account.

    OSS and Talkar deployments use external quota/wallet accounting and do not create MPS
    billing accounts.
    """
    if DEPLOYMENT_MODE in ("oss", "talkar"):
        return None

    return await mps_service_key_client.ensure_billing_account_v2(
        organization_id=organization_id,
        created_by=created_by,
    )
