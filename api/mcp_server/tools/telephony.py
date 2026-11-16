"""MCP tools for managing telephony phone numbers and inbound call routing."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from loguru import logger

from api.db import db_client
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool
from api.routes.organization import _sync_inbound_for_phone_number
from api.mcp_server.tools.initiate_call import initiate_call


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "error_code": code, "error": message, **extra}


@traced_tool
async def list_phone_numbers(include_inactive: bool = False) -> list[dict[str, Any]]:
    """List all telephony phone numbers provisioned for your organization.

    Returns the provisioned phone numbers, carrier provider, and currently
    routed inbound voice agent workflow. By default only active numbers
    are returned; set `include_inactive=True` to include deactivated numbers.
    """
    user = await authenticate_mcp_request()
    if not user.selected_organization_id:
        return []

    rows = await db_client.list_phone_numbers_for_org(
        organization_id=user.selected_organization_id,
        include_inactive=include_inactive,
    )

    return [
        {
            "id": phone.id,
            "address": getattr(phone, "address", getattr(phone, "phone_number", "")),
            "address_normalized": getattr(phone, "address_normalized", getattr(phone, "address", "")),
            "address_type": getattr(phone, "address_type", "pstn"),
            "label": getattr(phone, "label", None),
            "country_code": getattr(phone, "country_code", None),
            "provider": provider,
            "telephony_configuration_id": getattr(phone, "telephony_configuration_id", None),
            "inbound_workflow_id": getattr(phone, "inbound_workflow_id", None),
            "inbound_workflow_name": workflow_name,
            "is_active": getattr(phone, "is_active", True),
            "is_default_caller_id": getattr(phone, "is_default_caller_id", False),
        }
        for phone, workflow_name, provider in rows
    ]


@traced_tool
async def update_phone_number_routing(
    phone_number_id: int,
    workflow_id: int | None = None,
    clear_inbound_workflow: bool = False,
    label: str | None = None,
    set_as_default_caller_id: bool = False,
) -> dict[str, Any]:
    """Change or clear which voice agent workflow answers incoming calls for a phone number.

    Automatically synchronizes the inbound webhook with the upstream telephony
    carrier (e.g. Plivo/Twilio). Set `clear_inbound_workflow=True` or pass
    `workflow_id=None` to detach the voice agent so calls are not answered.

    On failure, returns `success: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `not_found` — the phone number does not exist in your organization.
    - `workflow_not_found` — the target workflow does not exist in your organization.
    - `workflow_archived` — cannot route calls to an archived workflow.
    - `update_failed` — database or carrier sync operation failed.
    """
    user = await authenticate_mcp_request()
    if not user.selected_organization_id:
        return _error_result("not_found", "No organization selected")

    phone = await db_client.get_phone_number(phone_number_id)
    if not phone or phone.organization_id != user.selected_organization_id:
        return _error_result("not_found", f"Phone number {phone_number_id} not found in your organization")

    target_workflow_name = None
    target_workflow_id = None
    is_active = phone.is_active

    if not clear_inbound_workflow and workflow_id is not None:
        target_wf = await db_client.get_workflow(
            workflow_id, organization_id=user.selected_organization_id
        )
        if not target_wf:
            return _error_result("workflow_not_found", f"Workflow {workflow_id} not found in your organization")
        if target_wf.status == "archived":
            return _error_result("workflow_archived", f"Cannot route inbound calls to archived workflow {workflow_id}")

        target_workflow_id = workflow_id
        target_workflow_name = target_wf.name
        is_active = True  # Automatically reactivate when assigning a workflow
    else:
        clear_inbound_workflow = True

    try:
        updated_row = await db_client.update_phone_number(
            phone_number_id=phone_number_id,
            telephony_configuration_id=phone.telephony_configuration_id,
            label=label if label is not None else phone.label,
            inbound_workflow_id=target_workflow_id,
            is_active=is_active,
            clear_inbound_workflow=clear_inbound_workflow,
        )
        if not updated_row:
            return _error_result("update_failed", "Failed to update phone number in database")

        if set_as_default_caller_id:
            await db_client.set_default_caller_id(
                phone_number_id, phone.telephony_configuration_id
            )

        provider_sync = await _sync_inbound_for_phone_number(
            config_id=phone.telephony_configuration_id,
            organization_id=user.selected_organization_id,
            address=phone.address,
            attach=(target_workflow_id is not None and is_active),
        )

        return {
            "success": True,
            "phone_number_id": phone.id,
            "address": phone.address,
            "assigned_workflow_id": target_workflow_id,
            "assigned_workflow_name": target_workflow_name,
            "is_default_caller_id": set_as_default_caller_id or phone.is_default_caller_id,
            "provider_synced": getattr(provider_sync, "ok", False),
            "provider_sync_message": getattr(provider_sync, "message", None),
            "message": "Phone number routing updated and carrier inbound webhooks synchronized.",
        }
    except Exception as e:
        logger.error(f"Error updating phone number routing for {phone_number_id}: {e}")
        return _error_result("update_failed", str(e))
