"""MCP tools for managing and monitoring outbound blast calling campaigns."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from loguru import logger
from sqlalchemy import select

from api.db import db_client
from api.db.models import CampaignModel, WorkflowModel
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool
from api.services.campaign.runner import campaign_runner_service
from api.services.quota_service import authorize_workflow_run_start


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"success": False, "error_code": code, "error": message, **extra}


@traced_tool
async def list_campaigns(status: str = "all") -> list[dict[str, Any]]:
    """List outbound blast campaigns for your organization with completion percentages.

    Optional `status` filter: "all", "created", "syncing", "running", "paused", "completed", "failed", "cancelled".
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return []

    async with db_client.async_session() as session:
        query = (
            select(CampaignModel, WorkflowModel.name)
            .join(WorkflowModel, CampaignModel.workflow_id == WorkflowModel.id)
            .where(CampaignModel.organization_id == org_id)
        )
        if status and status.lower() != "all":
            query = query.where(CampaignModel.state == status.lower())

        query = query.order_by(CampaignModel.id.desc())
        result = await session.execute(query)
        rows = result.all()

    campaigns = []
    for camp, wf_name in rows:
        total = camp.total_rows or 0
        processed = camp.processed_rows or 0
        pct = round((processed / total) * 100, 1) if total > 0 else 0.0

        campaigns.append(
            {
                "campaign_id": camp.id,
                "name": camp.name,
                "workflow_id": camp.workflow_id,
                "workflow_name": wf_name,
                "status": camp.state,
                "total_contacts": total,
                "processed_contacts": processed,
                "failed_contacts": camp.failed_rows or 0,
                "progress_percentage": pct,
                "source_sync_status": camp.source_sync_status,
            }
        )

    return campaigns


@traced_tool
async def get_campaign_status(campaign_id: int) -> dict[str, Any]:
    """Fetch real-time execution progress, metrics, and call breakdown for an outbound campaign.

    On failure, returns `success: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `not_found` — the campaign does not exist in your organization.
    - `fetch_failed` — unexpected error querying campaign progress.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result("not_found", "No organization selected")

    campaign = await db_client.get_campaign(campaign_id, org_id)
    if not campaign:
        return _error_result("not_found", f"Campaign {campaign_id} not found in your organization")

    try:
        detailed_stats = await campaign_runner_service.get_campaign_status(campaign_id)
    except Exception as e:
        logger.error(f"Error fetching campaign progress for {campaign_id}: {e}")
        return _error_result("fetch_failed", str(e))

    wf = await db_client.get_workflow(campaign.workflow_id, organization_id=org_id)
    wf_name = wf.name if wf else "Unknown"

    total = campaign.total_rows or 0
    completed = detailed_stats.get("completed_calls", 0)
    connected = detailed_stats.get("connected_leads", 0)
    failed = detailed_stats.get("failed_calls", 0)
    unanswered = detailed_stats.get("unanswered_calls", 0)
    in_flight = detailed_stats.get("active", 0)
    pending = detailed_stats.get("pending", 0)
    progress_pct = round(((completed + failed) / total) * 100, 1) if total > 0 else 0.0

    return {
        "success": True,
        "campaign_id": campaign.id,
        "name": campaign.name,
        "workflow_id": campaign.workflow_id,
        "workflow_name": wf_name,
        "status": campaign.state,
        "total_contacts": total,
        "completed": completed,
        "connected": connected,
        "busy_or_unanswered": unanswered,
        "failed": failed,
        "in_progress": in_flight,
        "pending": pending,
        "progress_percentage": progress_pct,
    }


@traced_tool
async def update_campaign_status(
    campaign_id: int,
    action: str,
) -> dict[str, Any]:
    """Start, pause, resume, or cancel an outbound blast calling campaign.

    Supported actions: "start", "pause", "resume", "cancel".

    On failure, returns `success: false`, a machine-readable `error_code`,
    and a human-readable `error`. Possible `error_code` values:
    - `not_found` — campaign not found in your organization.
    - `telephony_not_configured` — no active telephony carrier configured.
    - `workflow_archived` — target workflow is archived.
    - `campaign_not_ready` — contacts are still syncing or source CSV is empty.
    - `insufficient_wallet_balance` — wallet balance is zero or below minimum reserve.
    - `invalid_state_transition` — action cannot be performed from the current state.
    - `fetch_failed` — unexpected failure querying campaign status.
    - `action_failed` — unexpected failure in the campaign runner.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result("not_found", "No organization selected")

    campaign = await db_client.get_campaign(campaign_id, org_id)
    if not campaign:
        return _error_result("not_found", f"Campaign {campaign_id} not found in your organization")

    act = action.strip().lower()
    current_state = campaign.state

    # 1. State machine transition checks & idempotency
    if act == "start":
        if current_state in ("running", "syncing"):
            return {
                "success": True,
                "campaign_id": campaign.id,
                "status": current_state,
                "message": f"Campaign is already {current_state}",
            }
        if current_state not in ("created", "paused"):
            return _error_result(
                "invalid_state_transition",
                f"Cannot start campaign from current state '{current_state}'. Allowed from: created, paused.",
            )

        # Contact readiness check
        if campaign.source_sync_status != "completed" or (campaign.total_rows or 0) <= 0:
            return _error_result(
                "campaign_not_ready",
                "Campaign contacts are not yet fully synced or source CSV is empty",
            )

        # Telephony check
        configs = await db_client.list_telephony_configurations(org_id)
        if not configs:
            return _error_result(
                "telephony_not_configured",
                "No active telephony configuration provisioned in your organization",
            )

        # Workflow status check
        wf = await db_client.get_workflow(campaign.workflow_id, organization_id=org_id)
        if wf and wf.status == "archived":
            return _error_result(
                "workflow_archived",
                f"Cannot start campaign because workflow '{wf.name}' is archived",
            )

        # Quota and wallet check
        quota_result = await authorize_workflow_run_start(
            workflow_id=campaign.workflow_id,
            organization_id=org_id,
            actor_user=user,
            check_concurrency=False,
        )
        if not quota_result.has_quota:
            if quota_result.error_code in ("insufficient_balance", "insufficient_reserve"):
                return _error_result(
                    "insufficient_wallet_balance",
                    quota_result.error_message or "Insufficient talk-time wallet balance",
                )
            return _error_result("action_failed", quota_result.error_message)

        try:
            await campaign_runner_service.start_campaign(campaign_id)
        except Exception as e:
            return _error_result("action_failed", str(e))

    elif act == "pause":
        if current_state == "paused":
            return {
                "success": True,
                "campaign_id": campaign.id,
                "status": "paused",
                "message": "Campaign is already paused",
            }
        if current_state not in ("running", "syncing"):
            return _error_result(
                "invalid_state_transition",
                f"Cannot pause campaign from state '{current_state}'. Allowed from: running, syncing.",
            )
        try:
            await campaign_runner_service.pause_campaign(campaign_id)
        except Exception as e:
            return _error_result("action_failed", str(e))

    elif act == "resume":
        if current_state == "running":
            return {
                "success": True,
                "campaign_id": campaign.id,
                "status": "running",
                "message": "Campaign is already running",
            }
        if current_state != "paused":
            return _error_result(
                "invalid_state_transition",
                f"Cannot resume campaign from state '{current_state}'. Allowed only from: paused.",
            )
        try:
            await campaign_runner_service.resume_campaign(campaign_id)
        except Exception as e:
            return _error_result("action_failed", str(e))

    elif act == "cancel":
        if current_state == "cancelled":
            return {
                "success": True,
                "campaign_id": campaign.id,
                "status": "cancelled",
                "message": "Campaign is already cancelled",
            }
        if current_state not in ("created", "running", "paused", "syncing"):
            return _error_result(
                "invalid_state_transition",
                f"Cannot cancel campaign from state '{current_state}'.",
            )
        try:
            await campaign_runner_service.cancel_campaign(campaign_id)
        except Exception as e:
            return _error_result("action_failed", str(e))
    else:
        return _error_result(
            "invalid_state_transition",
            f"Unsupported action '{action}'. Allowed actions: start, pause, resume, cancel.",
        )

    updated_campaign = await db_client.get_campaign(campaign_id, org_id)
    new_state = updated_campaign.state if updated_campaign else act

    return {
        "success": True,
        "campaign_id": campaign_id,
        "name": campaign.name,
        "action": act,
        "status": new_state,
        "message": f"Campaign successfully updated to '{new_state}'.",
    }
