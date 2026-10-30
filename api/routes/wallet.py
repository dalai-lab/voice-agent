from typing import Annotated, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from pydantic import BaseModel, Field

from api.constants import TALKAR_BILLING_API_TOKEN, TALKAR_SERVICE_URL
from api.db.models import UserModel
from api.services.auth.depends import get_user_with_selected_organization

router = APIRouter(prefix="/wallet", tags=["Wallet"])

PLAN_RATES: dict[str, float] = {
    "starter": 6.00,
    "growth": 6.00,
    "pro": 18.00,
}
DEFAULT_RATE = 6.00


class BalanceSchema(BaseModel):
    rupees: float
    paise: int
    currency: str = "INR"
    formatted: str


class StatusSchema(BaseModel):
    account_status: str
    is_blocked: bool
    is_sub_org: bool
    low_balance_warning: bool


class PlanSchema(BaseModel):
    tier: str
    rate_per_minute_rupees: float
    estimated_minutes_remaining: int


class AutoRechargeSchema(BaseModel):
    enabled: bool
    threshold_rupees: float
    recharge_amount_rupees: float


class WalletResponseSchema(BaseModel):
    organization_id: int
    balance: BalanceSchema
    status: StatusSchema
    plan: PlanSchema
    auto_recharge: AutoRechargeSchema


class TransactionItemSchema(BaseModel):
    id: int
    type: str
    amount_rupees: float
    amount_paise: int
    direction: str
    description: Optional[str] = None
    dograh_run_id: Optional[int] = None
    created_at: Optional[str] = None


class PaginationSchema(BaseModel):
    page: int
    limit: int
    total_records: int
    total_pages: int
    has_next: bool
    has_prev: bool


class TransactionsResponseSchema(BaseModel):
    organization_id: int
    pagination: PaginationSchema
    transactions: list[TransactionItemSchema]


def _get_talkar_headers() -> dict[str, str]:
    token = (TALKAR_BILLING_API_TOKEN or "change-me-in-production-billing-token").strip()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


async def _fetch_wallet_summary(org_id: int) -> WalletResponseSchema:
    headers = _get_talkar_headers()
    url = f"{TALKAR_SERVICE_URL.rstrip('/')}/billing/wallet/by-org/{org_id}"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, headers=headers)
    except (httpx.TimeoutException, httpx.RequestError) as exc:
        logger.error(f"[WalletAPI] Connection failed to talkar-service for org {org_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Talkar billing service is temporarily unreachable. Please retry shortly.",
        )

    if resp.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Talkar billing account found for organization {org_id}. Complete onboarding first.",
        )

    if not resp.is_success:
        logger.error(f"[WalletAPI] Talkar service returned {resp.status_code}: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve wallet information from billing service.",
        )

    data = resp.json()

    balance_paise = int(data.get("balance_paise", 0) or 0)
    balance_rupees = round(balance_paise / 100.0, 2)
    formatted = f"₹{balance_rupees:,.2f}"

    tier = str(data.get("plan") or "starter").lower()
    rate = PLAN_RATES.get(tier, DEFAULT_RATE)

    # Estimated call minutes remaining based on current tier rate
    estimated_minutes = max(0, int(balance_rupees // rate)) if rate > 0 else 0

    customer_status = str(data.get("customer_status") or "active")
    is_blocked = (balance_paise <= 0) or (customer_status == "suspended")
    is_sub_org = bool(data.get("is_sub_org", False))
    low_balance = balance_paise <= 100000  # <= ₹1,000 threshold

    threshold_paise = int(data.get("auto_recharge_threshold_paise", 0) or 0)
    recharge_paise = int(data.get("auto_recharge_amount_paise", 0) or 0)

    return WalletResponseSchema(
        organization_id=org_id,
        balance=BalanceSchema(
            rupees=balance_rupees,
            paise=balance_paise,
            currency="INR",
            formatted=formatted,
        ),
        status=StatusSchema(
            account_status=customer_status,
            is_blocked=is_blocked,
            is_sub_org=is_sub_org,
            low_balance_warning=low_balance,
        ),
        plan=PlanSchema(
            tier=tier,
            rate_per_minute_rupees=rate,
            estimated_minutes_remaining=estimated_minutes,
        ),
        auto_recharge=AutoRechargeSchema(
            enabled=bool(data.get("auto_recharge_enabled", False)),
            threshold_rupees=round(threshold_paise / 100.0, 2),
            recharge_amount_rupees=round(recharge_paise / 100.0, 2),
        ),
    )


@router.get("", response_model=WalletResponseSchema)
@router.get("/balance", response_model=WalletResponseSchema)
async def get_wallet(
    user: Annotated[UserModel, Depends(get_user_with_selected_organization)],
) -> WalletResponseSchema:
    """Retrieve current wallet balance, currency, status, and calling capacity."""
    org_id = user.selected_organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    return await _fetch_wallet_summary(org_id)


@router.get("/transactions", response_model=TransactionsResponseSchema)
async def get_wallet_transactions(
    user: Annotated[UserModel, Depends(get_user_with_selected_organization)],
    page: int = Query(1, ge=1, description="Page number (1-based index)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    type: Optional[str] = Query(None, description="Transaction type filter (e.g. call_deduction, topup)"),
) -> TransactionsResponseSchema:
    """Retrieve calling deduction and top-up transaction logs with pagination."""
    org_id = user.selected_organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization selected")

    headers = _get_talkar_headers()
    params: dict[str, int | str] = {"page": page, "limit": limit}
    if type and type != "all":
        params["type"] = type

    url = f"{TALKAR_SERVICE_URL.rstrip('/')}/billing/transactions/by-org/{org_id}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers, params=params)
    except (httpx.TimeoutException, httpx.RequestError) as exc:
        logger.error(f"[WalletAPI] Failed to fetch transactions for org {org_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Talkar billing service is temporarily unreachable. Please retry shortly.",
        )

    if resp.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Talkar billing account found for organization {org_id}.",
        )

    if not resp.is_success:
        logger.error(f"[WalletAPI] Talkar service returned {resp.status_code}: {resp.text}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve transactions from billing service.",
        )

    data = resp.json()
    raw_txs = data.get("transactions", [])
    total_records = int(data.get("total", len(raw_txs)))
    total_pages = max(1, (total_records + limit - 1) // limit) if total_records > 0 else 1

    items: list[TransactionItemSchema] = []
    for t in raw_txs:
        paise = int(t.get("amount_paise", 0) or 0)
        t_type = str(t.get("type", "deduction"))
        # Top-ups and refunds credit the balance, deductions debit
        direction = "credit" if ("topup" in t_type.lower() or "refund" in t_type.lower() or paise > 0) else "debit"
        amount_rupees = round(abs(paise) / 100.0, 2)

        items.append(
            TransactionItemSchema(
                id=t.get("id"),
                type=t_type,
                amount_rupees=amount_rupees,
                amount_paise=paise,
                direction=direction,
                description=t.get("description"),
                dograh_run_id=t.get("dograh_run_id"),
                created_at=t.get("created_at"),
            )
        )

    return TransactionsResponseSchema(
        organization_id=org_id,
        pagination=PaginationSchema(
            page=page,
            limit=limit,
            total_records=total_records,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
        transactions=items,
    )
