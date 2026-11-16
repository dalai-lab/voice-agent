"""MCP tools for inspecting wallet balances and billing transactions via talkar-service."""

from __future__ import annotations

import json
from typing import Any

import httpx
from loguru import logger

from api.constants import TALKAR_BILLING_API_TOKEN, TALKAR_SERVICE_URL
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "error_code": code, "error": message, **extra}


def _get_auth_headers(user_email: str | None) -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if TALKAR_BILLING_API_TOKEN:
        headers["Authorization"] = f"Bearer {TALKAR_BILLING_API_TOKEN}"
    if user_email:
        headers["X-Talkar-Email"] = user_email
    return headers


@traced_tool
async def get_wallet_balance() -> dict[str, Any]:
    """Fetch the organization's real-time talk-time wallet balance, currency, account status, and call minutes remaining.

    Connects to the Talkar billing service.

    On failure, returns `success: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `billing_account_not_found` — no billing customer profile found for this organization.
    - `billing_service_unavailable` — billing service timed out or returned an error.
    - `fetch_failed` — unexpected network or parsing error.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result("billing_account_not_found", "No organization selected")

    url = f"{TALKAR_SERVICE_URL}/billing/wallet/by-org/{org_id}"
    headers = _get_auth_headers(user.email)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code == 404:
            return _error_result(
                "billing_account_not_found",
                "Complete billing onboarding on the Talkar dashboard to activate your talk-time wallet",
            )
        if resp.status_code >= 400:
            return _error_result(
                "billing_service_unavailable",
                f"Billing service returned error status {resp.status_code}",
            )

        data = resp.json()
    except (httpx.TimeoutException, httpx.NetworkError) as e:
        logger.warning(f"Billing service timeout/network error for org {org_id}: {e}")
        return _error_result(
            "billing_service_unavailable",
            "Talkar billing service is temporarily unreachable",
        )
    except json.JSONDecodeError as e:
        logger.error(f"Billing service returned non-JSON response for org {org_id}: {e}")
        return _error_result(
            "billing_service_unavailable",
            "Billing service returned an invalid response format",
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching wallet balance for org {org_id}: {e}")
        return _error_result("fetch_failed", str(e))

    balance_paise = data.get("balance_paise", 0)
    balance_rupees = round(balance_paise / 100.0, 2)
    rate_per_min = 6.00  # Default rate per minute
    estimated_mins = int(balance_rupees / rate_per_min) if balance_rupees > 0 else 0

    return {
        "success": True,
        "organization_id": org_id,
        "balance": {
            "rupees": balance_rupees,
            "paise": balance_paise,
            "currency": "INR",
            "formatted": f"₹{balance_rupees:,.2f}",
        },
        "status": {
            "account_status": data.get("customer_status", "active"),
            "is_blocked": balance_paise <= 0 or data.get("customer_status") == "suspended",
            "is_sub_org": data.get("is_sub_org", False),
            "can_manage_billing": data.get("can_manage_billing", True),
            "low_balance_warning": balance_rupees < 100.0,
        },
        "plan": {
            "tier": data.get("plan", "starter"),
            "plan_status": data.get("plan_status", "active"),
            "rate_per_minute_rupees": rate_per_min,
            "estimated_minutes_remaining": estimated_mins,
        },
        "auto_recharge": {
            "enabled": data.get("auto_recharge_enabled", False),
            "threshold_rupees": round((data.get("auto_recharge_threshold_paise") or 0) / 100.0, 2),
            "recharge_amount_rupees": round((data.get("auto_recharge_amount_paise") or 0) / 100.0, 2),
        },
    }


@traced_tool
async def list_wallet_transactions(
    page: int = 1,
    limit: int = 10,
    type: str | None = None,
) -> dict[str, Any]:
    """Retrieve calling deduction and wallet top-up transaction logs with pagination.

    On failure, returns `success: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `billing_account_not_found` — no billing customer profile found for this organization.
    - `billing_service_unavailable` — billing service timed out or returned an error.
    - `fetch_failed` — unexpected network or parsing error.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result("billing_account_not_found", "No organization selected")

    url = f"{TALKAR_SERVICE_URL}/billing/transactions/by-org/{org_id}"
    params: dict[str, Any] = {"page": max(1, page), "limit": min(max(1, limit), 50)}
    if type:
        params["type"] = type

    headers = _get_auth_headers(user.email)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params, headers=headers)

        if resp.status_code == 404:
            return _error_result(
                "billing_account_not_found",
                "No billing account found for your organization",
            )
        if resp.status_code >= 400:
            return _error_result(
                "billing_service_unavailable",
                f"Billing service returned error status {resp.status_code}",
            )

        data = resp.json()
    except (httpx.TimeoutException, httpx.NetworkError) as e:
        logger.warning(f"Billing transactions network error for org {org_id}: {e}")
        return _error_result(
            "billing_service_unavailable",
            "Talkar billing service is temporarily unreachable",
        )
    except json.JSONDecodeError as e:
        logger.error(f"Billing transactions non-JSON response for org {org_id}: {e}")
        return _error_result(
            "billing_service_unavailable",
            "Billing service returned an invalid response format",
        )
    except Exception as e:
        logger.error(f"Error fetching transactions for org {org_id}: {e}")
        return _error_result("fetch_failed", str(e))

    items = data.get("items") or data.get("transactions") or []
    if isinstance(data, list):
        items = data

    return {
        "success": True,
        "page": page,
        "limit": limit,
        "total_count": data.get("total_count", len(items)),
        "transactions": items,
    }
