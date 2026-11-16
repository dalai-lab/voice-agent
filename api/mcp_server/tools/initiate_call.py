"""MCP tool for placing live outbound voice calls with dynamic initial context."""

from __future__ import annotations

import json
import re
import uuid
from typing import Any

from loguru import logger

from api.db import db_client
from api.enums import CallType
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool
from api.services.call_concurrency import (
    CallConcurrencyLimitError,
    call_concurrency,
)
from api.services.call_concurrency.rate_limiter import rate_limiter
from api.services.quota_service import authorize_workflow_run_start
from api.services.telephony.factory import (
    get_default_telephony_provider,
    get_telephony_provider_by_id,
)
from api.services.workflow.run_creation import prepare_workflow_run_inputs
from api.services.workflow_run_failure import mark_workflow_run_failed
from api.utils.common import get_backend_endpoints


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "error_code": code, "error": message, **extra}


@traced_tool
async def initiate_call(
    workflow_id: int,
    phone_number: str,
    initial_context: dict[str, Any] | None = None,
    from_phone_number_id: int | None = None,
    telephony_configuration_id: int | None = None,
    use_draft: bool = False,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    """Place a live outbound voice call to a phone number using an agent workflow.

    Supports custom initial context variables for prompt personalization, caller-ID selection,
    and draft vs published version execution.

    On failure, returns `success: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `not_found` — workflow or caller-ID phone number not found in your organization.
    - `workflow_archived` — cannot initiate calls on an archived workflow.
    - `invalid_phone_number` — destination phone number is missing or invalid.
    - `telephony_not_configured` — no active telephony carrier configured.
    - `concurrency_limit_reached` — simultaneous call limit reached for your organization.
    - `insufficient_wallet_balance` — talk-time wallet balance is zero or below reserve.
    - `call_dispatch_failed` — carrier API rejected call initiation.
    - `service_unavailable` — concurrency or telephony service temporarily unavailable.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result("not_found", "No organization selected")

    # 1. Idempotency Check (Redis cache)
    if idempotency_key:
        try:
            r = await rate_limiter._get_redis() if hasattr(rate_limiter, "_get_redis") else None
            if r:
                cached = await r.get(f"mcp:idempotency:{org_id}:{idempotency_key}")
                if cached:
                    return json.loads(cached)
        except Exception as e:
            logger.debug(f"Could not read idempotency key: {e}")

    # 2. Clean and normalize destination phone number
    cleaned_number = re.sub(r"[\s\-\(\)]", "", (phone_number or "").strip())
    if not cleaned_number or len(cleaned_number) < 7:
        return _error_result(
            "invalid_phone_number",
            f"Invalid destination phone number '{phone_number}'. Must include country code.",
        )
    if not cleaned_number.startswith("+"):
        cleaned_number = f"+{cleaned_number}"

    # 3. Validate workflow ownership and state
    workflow = await db_client.get_workflow(workflow_id, organization_id=org_id)
    if not workflow:
        return _error_result("not_found", f"Workflow {workflow_id} not found in your organization")
    if workflow.status == "archived":
        return _error_result("workflow_archived", f"Cannot initiate calls on archived workflow '{workflow.name}'")

    # 4. Resolve Telephony Carrier Provider
    if telephony_configuration_id:
        try:
            provider = await get_telephony_provider_by_id(telephony_configuration_id, org_id)
        except ValueError:
            return _error_result(
                "telephony_not_configured",
                f"Telephony configuration {telephony_configuration_id} not found in your organization",
            )
    else:
        try:
            provider = await get_default_telephony_provider(org_id)
        except ValueError:
            return _error_result(
                "telephony_not_configured",
                "No active outbound telephony configuration provisioned in your organization",
            )
        default_cfg = await db_client.get_default_telephony_configuration(org_id)
        telephony_configuration_id = default_cfg.id if default_cfg else None

    if not provider or not provider.validate_config():
        return _error_result("telephony_not_configured", "Telephony provider credentials are not properly configured")

    # 5. Resolve Outbound Caller-ID (from_number)
    from_number = None
    if from_phone_number_id is not None:
        phone_row = await db_client.get_phone_number(from_phone_number_id)
        if not phone_row or phone_row.organization_id != org_id or not phone_row.is_active:
            return _error_result(
                "not_found",
                f"Caller ID phone number {from_phone_number_id} not found or inactive in your organization",
            )
        from_number = getattr(phone_row, "address_normalized", phone_row.address)

    # 6. Acquire Concurrency Slot (Fail Closed)
    concurrency_slot = None
    try:
        concurrency_slot = await call_concurrency.acquire_org_slot(
            org_id, source="telephony_outbound", timeout=0
        )
    except CallConcurrencyLimitError:
        return _error_result(
            "concurrency_limit_reached",
            "Organization concurrent call limit reached. Please retry after active calls finish.",
        )
    except Exception as e:
        logger.error(f"Call concurrency service error for org {org_id}: {e}")
        return _error_result("service_unavailable", "Call concurrency infrastructure is temporarily unavailable")

    workflow_run_id = None
    try:
        # 7. Merge Initial Context & Create Workflow Run
        numeric_suffix = int(str(uuid.uuid4()).replace("-", "")[:8], 16) % 100000000
        workflow_run_name = f"WR-TEL-OUT-{numeric_suffix:08d}"

        merged_initial_context = {
            **(initial_context or {}),
            "phone_number": cleaned_number,
            "called_number": cleaned_number,
            "provider": provider.PROVIDER_NAME,
            "telephony_configuration_id": telephony_configuration_id,
        }

        run_inputs = await prepare_workflow_run_inputs(
            db_client,
            workflow,
            initial_context=merged_initial_context,
            use_draft=use_draft,
            include_template_context=True,
        )

        execution_user_id = getattr(workflow, "user_id", None) or getattr(user, "id", None)
        workflow_run = await db_client.create_workflow_run(
            workflow_run_name,
            workflow.id,
            provider.PROVIDER_NAME,
            user_id=execution_user_id,
            call_type=CallType.OUTBOUND,
            initial_context=run_inputs.initial_context,
            organization_id=org_id,
            definition_id=run_inputs.definition_id,
        )
        workflow_run_id = workflow_run.id

        if concurrency_slot is not None:
            await call_concurrency.bind_workflow_run(concurrency_slot, workflow_run_id)

        # 8. Check Quota / Wallet Balance Pre-Flight
        quota_result = await authorize_workflow_run_start(
            workflow_id=workflow.id,
            organization_id=org_id,
            workflow_run_id=workflow_run_id,
            actor_user=user,
        )
        if not quota_result.has_quota:
            await mark_workflow_run_failed(
                workflow_run_id, quota_result.error_message or "Insufficient wallet balance"
            )
            await call_concurrency.release_workflow_run_slot(workflow_run_id)
            concurrency_slot = None
            return _error_result(
                "insufficient_wallet_balance",
                quota_result.error_message or "Insufficient talk-time wallet balance",
            )

        # 9. Dispatch Call via Carrier Provider
        try:
            backend_endpoint, _ = await get_backend_endpoints()
        except Exception as e:
            logger.error(f"Failed to resolve backend webhook endpoint: {e}")
            if workflow_run_id:
                await mark_workflow_run_failed(workflow_run_id, "Backend endpoint resolution failed")
                await call_concurrency.release_workflow_run_slot(workflow_run_id)
            return _error_result("service_unavailable", "Failed to resolve backend endpoint for telephony webhooks")

        webhook_url = (
            f"{backend_endpoint}/api/v1/telephony/{provider.WEBHOOK_ENDPOINT}"
            f"?workflow_id={workflow.id}"
            f"&workflow_run_id={workflow_run_id}"
            f"&organization_id={org_id}"
        )

        dispatch_result = await provider.initiate_call(
            to_number=cleaned_number,
            webhook_url=webhook_url,
            workflow_run_id=workflow_run_id,
            from_number=from_number,
            workflow_id=workflow.id,
            organization_id=org_id,
        )

        effective_caller_number = dispatch_result.caller_number or from_number
        updated_ctx = dict(workflow_run.initial_context or {})
        if effective_caller_number:
            updated_ctx["caller_number"] = effective_caller_number

        await db_client.update_workflow_run(
            run_id=workflow_run_id,
            gathered_context={
                "provider": provider.PROVIDER_NAME,
                **(dispatch_result.provider_metadata or {}),
            },
            initial_context=updated_ctx,
        )

        version_used = "draft" if use_draft else "published"
        result_payload = {
            "success": True,
            "workflow_run_id": workflow_run_id,
            "run_name": workflow_run_name,
            "called_number": cleaned_number,
            "caller_number": effective_caller_number,
            "provider": provider.PROVIDER_NAME,
            "status": "initiated",
            "version_used": version_used,
            "initial_context": updated_ctx,
            "message": f"Call successfully initiated to {cleaned_number} (run {workflow_run_name}).",
        }

        # Cache in idempotency storage if key supplied
        if idempotency_key:
            try:
                r = await rate_limiter._get_redis() if hasattr(rate_limiter, "_get_redis") else None
                if r:
                    await r.set(
                        f"mcp:idempotency:{org_id}:{idempotency_key}",
                        json.dumps(result_payload),
                        ex=300,
                    )
            except Exception:
                pass

        return result_payload

    except Exception as e:
        logger.error(f"Failed to initiate call to {cleaned_number}: {e}")
        if workflow_run_id:
            await mark_workflow_run_failed(workflow_run_id, str(e))
            await call_concurrency.release_workflow_run_slot(workflow_run_id)
        elif concurrency_slot is not None:
            await call_concurrency.release_slot(concurrency_slot)
        return _error_result("call_dispatch_failed", f"Failed to dispatch call via telephony provider: {str(e)}")
