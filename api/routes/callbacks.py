import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc

from api.db import db_client
from api.db.models import (
    ScheduledCallbackModel,
    QueuedRunModel,
    UserModel,
    WorkflowModel,
    CampaignModel
)
from api.services.auth.depends import get_user

router = APIRouter(prefix="/callbacks")

class UnifiedCallbackItem(BaseModel):
    id: int
    source: str
    status: str
    scheduled_for: Optional[datetime]
    fires_in_seconds: Optional[int]
    was_late_seconds: Optional[int]
    to_number: Optional[str]
    from_number: Optional[str]
    conversation_summary: Optional[str]
    callback_chain_depth: int
    workflow_id: Optional[int]
    workflow_name: Optional[str]
    campaign_id: Optional[int]
    campaign_name: Optional[str]
    original_run_id: Optional[int]
    created_at: Optional[datetime]

class UnifiedCallbackListResponse(BaseModel):
    items: List[UnifiedCallbackItem]
    total: int
    has_more: bool

@router.get("", response_model=UnifiedCallbackListResponse)
async def list_callbacks(
    status: Optional[str] = Query(None, description="Filter by status (e.g. pending, completed, failed, cancelled)"),
    source: str = Query("all", description="Source of callback: all, standalone, campaign"),
    campaign_id: Optional[int] = Query(None),
    workflow_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: UserModel = Depends(get_user),
) -> Any:
    """Get all scheduled callbacks for the organization."""
    org_id = user.selected_organization_id
    now = datetime.now(timezone.utc)
    
    standalone_items = []
    campaign_items = []
    wf_names = {}
    
    async with db_client.async_session() as db:
        if source in ("all", "standalone") and not campaign_id:
            q_sa = select(ScheduledCallbackModel).where(ScheduledCallbackModel.organization_id == org_id)
            if status:
                q_sa = q_sa.where(ScheduledCallbackModel.status == status)
            if workflow_id:
                q_sa = q_sa.where(ScheduledCallbackModel.workflow_id == workflow_id)
                
            q_sa = q_sa.order_by(desc(ScheduledCallbackModel.scheduled_for)).limit(offset + limit)
            result = await db.execute(q_sa)
            standalone_items = result.scalars().all()

        if source in ("all", "campaign"):
            q_camp = select(QueuedRunModel, CampaignModel).join(
                CampaignModel, QueuedRunModel.campaign_id == CampaignModel.id
            ).where(
                CampaignModel.organization_id == org_id,
                QueuedRunModel.retry_reason == "user_requested_callback"
            )
            if campaign_id:
                q_camp = q_camp.where(QueuedRunModel.campaign_id == campaign_id)
            if workflow_id:
                q_camp = q_camp.where(CampaignModel.workflow_id == workflow_id)
                
            if status:
                if status == "pending":
                    q_camp = q_camp.where(QueuedRunModel.state == "queued")
                elif status == "completed":
                    q_camp = q_camp.where(QueuedRunModel.state == "processed")
                else:
                    q_camp = q_camp.where(QueuedRunModel.state == status)
                    
            q_camp = q_camp.order_by(desc(QueuedRunModel.scheduled_for)).limit(offset + limit)
            result = await db.execute(q_camp)
            campaign_items = result.all()

        # Fetch workflow names
        wf_ids = set()
        for cb in standalone_items:
            if cb.workflow_id:
                wf_ids.add(cb.workflow_id)
        for qr, camp in campaign_items:
            if camp.workflow_id:
                wf_ids.add(camp.workflow_id)
                
        if wf_ids:
            result = await db.execute(select(WorkflowModel.id, WorkflowModel.name).where(WorkflowModel.id.in_(wf_ids)))
            for row in result:
                wf_names[row[0]] = row[1]

    merged = []
    for cb in standalone_items:
        fires_in = None
        was_late = None
        if cb.scheduled_for:
            fires_in = int((cb.scheduled_for - now).total_seconds())
            if fires_in < 0 and cb.status == "pending":
                was_late = abs(fires_in)
            
        fis = None
        if fires_in is not None and cb.status == "pending":
            fis = fires_in

        merged.append(UnifiedCallbackItem(
            id=cb.id,
            source="standalone",
            status=cb.status,
            scheduled_for=cb.scheduled_for,
            fires_in_seconds=fis,
            was_late_seconds=was_late,
            to_number=cb.to_number,
            from_number=cb.from_number,
            conversation_summary=cb.conversation_summary,
            callback_chain_depth=cb.callback_chain_depth or 1,
            workflow_id=cb.workflow_id,
            workflow_name=wf_names.get(cb.workflow_id),
            campaign_id=None,
            campaign_name=None,
            original_run_id=cb.original_run_id,
            created_at=cb.created_at
        ))

    for qr, camp in campaign_items:
        fires_in = None
        was_late = None
        if qr.scheduled_for:
            fires_in = int((qr.scheduled_for - now).total_seconds())
            
        cv = qr.context_variables or {}
        
        status_mapped = qr.state
        if qr.state == "queued":
            status_mapped = "pending"
        elif qr.state == "processed":
            status_mapped = "completed"
            
        if fires_in is not None and fires_in < 0 and status_mapped == "pending":
            was_late = abs(fires_in)
            
        fis = None
        if fires_in is not None and status_mapped == "pending":
            fis = fires_in

        merged.append(UnifiedCallbackItem(
            id=qr.id,
            source="campaign",
            status=status_mapped,
            scheduled_for=qr.scheduled_for,
            fires_in_seconds=fis,
            was_late_seconds=was_late,
            to_number=cv.get("called_number") or cv.get("to_number"),
            from_number=cv.get("caller_number") or cv.get("from_number"),
            conversation_summary=cv.get("conversation_summary"),
            callback_chain_depth=cv.get("callback_chain_depth", 1),
            workflow_id=camp.workflow_id,
            workflow_name=wf_names.get(camp.workflow_id),
            campaign_id=camp.id,
            campaign_name=camp.name,
            original_run_id=cv.get("original_run_id"),
            created_at=qr.created_at
        ))
        
    merged.sort(key=lambda x: x.scheduled_for or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    total = len(merged)
    paginated = merged[offset:offset+limit]
    
    return UnifiedCallbackListResponse(
        items=paginated,
        total=total,
        has_more=len(merged) > offset + limit
    )

@router.delete("/{callback_id}", response_model=Dict[str, Any])
async def cancel_callback(
    callback_id: int,
    source: str = Query("standalone"),
    user: UserModel = Depends(get_user),
) -> Any:
    """Cancel a pending callback."""
    if source not in ("standalone", "campaign"):
        raise HTTPException(status_code=400, detail="Invalid source. Must be 'standalone' or 'campaign'")
        
    async with db_client.async_session() as db:
        if source == "campaign":
            query = select(QueuedRunModel, CampaignModel).join(
                CampaignModel, QueuedRunModel.campaign_id == CampaignModel.id
            ).where(
                QueuedRunModel.id == callback_id,
                CampaignModel.organization_id == user.selected_organization_id
            )
            result = await db.execute(query)
            row = result.first()
            if not row:
                raise HTTPException(status_code=404, detail="Callback not found")
            
            qr, _ = row
            if qr.state != "queued":
                raise HTTPException(status_code=400, detail=f"Cannot cancel a callback in {qr.state} state")
            
            qr.state = "cancelled"
            await db.commit()
        else:
            query = select(ScheduledCallbackModel).where(
                ScheduledCallbackModel.id == callback_id,
                ScheduledCallbackModel.organization_id == user.selected_organization_id,
            )
            result = await db.execute(query)
            callback = result.scalar_one_or_none()

            if not callback:
                raise HTTPException(status_code=404, detail="Callback not found")

            if callback.status != "pending":
                raise HTTPException(status_code=400, detail=f"Cannot cancel a callback in {callback.status} state")

            callback.status = "cancelled"
            await db.commit()
    
    return {"status": "success", "message": "Callback cancelled successfully"}
