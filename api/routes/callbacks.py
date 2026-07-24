from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from datetime import datetime, timezone

from api.db import db_client
from api.db.models import ScheduledCallbackModel, UserModel
from api.services.auth.depends import get_user

router = APIRouter(prefix="/callbacks")

@router.get("", response_model=List[Dict[str, Any]])
async def list_callbacks(
    status: Optional[str] = Query(None, description="Filter by status (e.g. pending, completed, failed, cancelled)"),
    limit: int = 50,
    offset: int = 0,
    user: UserModel = Depends(get_user),
) -> Any:
    """Get all scheduled callbacks for the organization."""
    query = select(ScheduledCallbackModel).where(
        ScheduledCallbackModel.organization_id == user.selected_organization_id
    )

    if status:
        query = query.where(ScheduledCallbackModel.status == status)

    query = query.order_by(desc(ScheduledCallbackModel.scheduled_for)).limit(limit).offset(offset)
    
    async with db_client.session_maker() as db:
        result = await db.execute(query)
        callbacks = result.scalars().all()

    return [
        {
            "id": cb.id,
            "organization_id": cb.organization_id,
            "workflow_id": cb.workflow_id,
            "original_run_id": cb.original_run_id,
            "status": cb.status,
            "scheduled_for": cb.scheduled_for.isoformat() if cb.scheduled_for else None,
            "to_number": cb.to_number,
            "from_number": cb.from_number,
            "conversation_summary": cb.conversation_summary,
            "callback_chain_depth": cb.callback_chain_depth,
            "created_at": cb.created_at.isoformat() if cb.created_at else None,
        }
        for cb in callbacks
    ]

@router.delete("/{callback_id}", response_model=Dict[str, Any])
async def cancel_callback(
    callback_id: int,
    user: UserModel = Depends(get_user),
) -> Any:
    """Cancel a pending callback."""
    query = select(ScheduledCallbackModel).where(
        ScheduledCallbackModel.id == callback_id,
        ScheduledCallbackModel.organization_id == user.selected_organization_id,
    )
    
    async with db_client.session_maker() as db:
        result = await db.execute(query)
        callback = result.scalar_one_or_none()

        if not callback:
            raise HTTPException(status_code=404, detail="Callback not found")

        if callback.status != "pending":
            raise HTTPException(status_code=400, detail=f"Cannot cancel a callback in {callback.status} state")

        callback.status = "cancelled"
        await db.commit()
    
    # We do not attempt to purge the ARQ job from Redis here. 
    # When the ARQ worker fires the callback, it will check the database. 
    # If the status is not 'pending', it will just ignore it.

    return {"status": "success", "message": "Callback cancelled successfully"}
