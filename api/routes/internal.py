import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import func, or_, select, text, update
from sqlalchemy.orm import joinedload

from api.constants import DOGRAH_DEVOPS_SECRET, TALKAR_BILLING_API_TOKEN
from api.db import db_client
from api.db.models import (
    APIKeyModel,
    OrganizationModel,
    TelephonyConfigurationModel,
    TelephonyPhoneNumberModel,
    UserModel,
    WorkflowModel,
    WorkflowRunModel,
    organization_users_association,
)
from api.enums import WorkflowRunState, WorkflowStatus

router = APIRouter(prefix="/internal", tags=["internal"])


async def verify_internal_token(
    authorization: Annotated[str | None, Header()] = None,
    x_service_token: Annotated[str | None, Header(alias="X-Service-Token")] = None,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> None:
    """Validate internal service-to-service authentication token."""
    provided_tokens: list[str] = []
    if x_service_token:
        provided_tokens.append(x_service_token.strip())
    if x_api_key:
        provided_tokens.append(x_api_key.strip())
    if authorization:
        auth = authorization.strip()
        if auth.lower().startswith("bearer "):
            provided_tokens.append(auth[7:].strip())
        else:
            provided_tokens.append(auth)

    valid_tokens = set(
        filter(
            None,
            [
                TALKAR_BILLING_API_TOKEN,
                DOGRAH_DEVOPS_SECRET,
                os.getenv("TALKAR_BILLING_API_TOKEN"),
                os.getenv("DOGRAH_ADMIN_TOKEN"),
            ],
        )
    )

    for tok in provided_tokens:
        if tok and any(secrets.compare_digest(tok, vt) for vt in valid_tokens):
            return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid internal service token",
    )


class UpsertOrgConfigRequest(BaseModel):
    key: str
    value: Any


@router.post("/org-config/{org_id}")
async def upsert_org_configuration(
    org_id: int,
    request: UpsertOrgConfigRequest,
    _: None = Depends(verify_internal_token),
):
    """Upsert an organization configuration key-value pair."""
    org = await db_client.get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization {org_id} not found")

    await db_client.upsert_configuration(
        organization_id=org_id,
        key=request.key,
        value=request.value,
    )
    if request.key == "CONCURRENCY_GROUP_ID":
        try:
            from api.services.call_concurrency.service import call_concurrency
            await call_concurrency.invalidate_concurrency_group(org_id)
        except Exception:
            pass
    return {"status": "success", "org_id": org_id, "key": request.key}


@router.get("/org-config/{org_id}/{key}")
async def get_org_configuration(
    org_id: int,
    key: str,
    _: None = Depends(verify_internal_token),
):
    """Retrieve an organization configuration value by key."""
    cfg = await db_client.get_configuration(organization_id=org_id, key=key)
    return {"org_id": org_id, "key": key, "value": cfg.value if cfg else None}


@router.post("/concurrency-group/{org_id}/invalidate")
@router.post("/org-concurrency-group/{org_id}/invalidate")
async def invalidate_concurrency_group_cache(
    org_id: int,
    _: None = Depends(verify_internal_token),
):
    """Invalidate memory and Redis concurrency group cache for an organization (Blocker 25)."""
    try:
        from api.services.call_concurrency.service import call_concurrency
        await call_concurrency.invalidate_concurrency_group(org_id)
    except Exception as e:
        logger.error(f"Error invalidating concurrency group cache for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "org_id": org_id, "message": "Concurrency group cache invalidated"}



@router.get("/runs/{run_id}")
async def get_internal_run(
    run_id: int,
    _: None = Depends(verify_internal_token),
):
    """Fetch run metadata and duration for Talkar billing reconciliation."""
    run = await db_client.get_workflow_run_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    dur = 0.0
    if run.usage_info and isinstance(run.usage_info, dict):
        raw_dur = run.usage_info.get("call_duration_seconds")
        if raw_dur is not None:
            try:
                dur = float(raw_dur)
            except (ValueError, TypeError):
                dur = 0.0

    org_id = None
    if run.workflow:
        org_id = run.workflow.organization_id

    return {
        "id": run.id,
        "organization_id": org_id,
        "workflow_id": run.workflow_id,
        "status": getattr(run.state, "value", str(run.state)),
        "mode": run.mode,
        "duration_seconds": dur,
    }


@router.get("/runs/completed")
async def get_internal_completed_runs(
    hours: int = Query(default=25, ge=1, le=720),
    _: None = Depends(verify_internal_token),
):
    """Fetch completed runs in the last N hours for cron reconciliation."""
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    async with db_client.async_session() as session:
        result = await session.execute(
            select(WorkflowRunModel)
            .options(joinedload(WorkflowRunModel.workflow))
            .where(
                WorkflowRunModel.state == WorkflowRunState.COMPLETED.value,
                WorkflowRunModel.created_at >= cutoff,
                or_(WorkflowRunModel.mode.is_(None), WorkflowRunModel.mode != "textchat"),
            )
        )
        runs_models = result.scalars().all()
        runs_out = []
        for r in runs_models:
            dur = 0.0
            if r.usage_info and isinstance(r.usage_info, dict):
                raw_dur = r.usage_info.get("call_duration_seconds")
                if raw_dur is not None:
                    try:
                        dur = float(raw_dur)
                    except (ValueError, TypeError):
                        dur = 0.0
            org_id = r.workflow.organization_id if r.workflow else None
            runs_out.append(
                {
                    "id": r.id,
                    "organization_id": org_id,
                    "workflow_id": r.workflow_id,
                    "status": getattr(r.state, "value", str(r.state)),
                    "mode": r.mode,
                    "duration_seconds": dur,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
            )
        return runs_out


@router.get("/org-users/verify")
async def verify_org_user(
    org_id: int = Query(...),
    user_id: int | None = Query(default=None),
    email: str | None = Query(default=None),
    require_owner: bool = Query(default=False),
    _: None = Depends(verify_internal_token),
):
    """Verify whether a user belongs to an organization, and optionally verify if they are an owner/admin."""
    if not org_id or (user_id is None and not email):
        return {"verified": False}

    org = await db_client.get_organization_by_id(org_id)
    if not org:
        return {"verified": False}

    async with db_client.async_session() as session:
        query = (
            select(UserModel)
            .join(
                organization_users_association,
                organization_users_association.c.user_id == UserModel.id,
            )
            .where(organization_users_association.c.organization_id == org_id)
        )
        if user_id is not None:
            query = query.where(UserModel.id == user_id)
        if email:
            clean_email = email.strip().lower()
            query = query.where(func.lower(UserModel.email) == clean_email)

        result = await session.execute(query.limit(1))
        matched_user = result.scalars().first()
        if not matched_user:
            return {"verified": False}

        if not require_owner:
            return {"verified": True}

        # --- Owner / Admin Verification (Issue 8 Prevention) ---
        # 1. Platform superuser check
        if matched_user.is_superuser:
            return {"verified": True}

        # 2. Check ORGANIZATION_OWNER_ID in organization_configurations
        owner_cfg = await db_client.get_configuration(org_id, "ORGANIZATION_OWNER_ID")
        if owner_cfg and owner_cfg.value:
            val = owner_cfg.value
            if isinstance(val, dict):
                if val.get("user_id") == matched_user.id:
                    return {"verified": True}
                if matched_user.email and val.get("email") and val.get("email").strip().lower() == matched_user.email.strip().lower():
                    return {"verified": True}
            elif str(val) == str(matched_user.id):
                return {"verified": True}

        # 3. Check APIKeyModel creator (the user who created the organization has Default API Key created_by)
        api_key_res = await session.execute(
            select(APIKeyModel.created_by)
            .where(APIKeyModel.organization_id == org_id)
            .order_by(APIKeyModel.id.asc())
            .limit(1)
        )
        creator_id = api_key_res.scalar_one_or_none()
        if creator_id is not None and creator_id == matched_user.id:
            return {"verified": True}

        # 4. Check if matched_user is the sole member of the organization
        total_users_res = await session.execute(
            select(func.count())
            .select_from(organization_users_association)
            .where(organization_users_association.c.organization_id == org_id)
        )
        total_users = total_users_res.scalar()
        if total_users == 1:
            return {"verified": True}

        # Otherwise, the user is an invited member / collaborator, NOT the organization owner
        return {"verified": False}


class SyncPhoneNumberRequest(BaseModel):
    org_id: int
    phone_number: str
    workflow_id: int | None = None


@router.post("/telephony/sync-number")
async def sync_phone_number(
    request: SyncPhoneNumberRequest,
    _: None = Depends(verify_internal_token),
):
    """Sync assigned PSTN number into Dograh's telephony tables."""
    clean_number = request.phone_number.strip()
    if not clean_number:
        raise HTTPException(status_code=400, detail="Empty phone number")

    normalized = clean_number if clean_number.startswith("+") else f"+{clean_number}"
    country_code = "IN" if normalized.startswith("+91") else None

    org = await db_client.get_organization_by_id(request.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    async with db_client.async_session() as session:
        # 1. Telephony configuration
        cfg_res = await session.execute(
            select(TelephonyConfigurationModel)
            .where(TelephonyConfigurationModel.organization_id == request.org_id)
            .order_by(TelephonyConfigurationModel.id.asc())
            .limit(1)
        )
        cfg = cfg_res.scalars().first()
        if not cfg:
            cfg = TelephonyConfigurationModel(
                organization_id=request.org_id,
                name="talkar_telephony",
                provider="plivo",
                credentials={},
                is_default_outbound=True,
            )
            session.add(cfg)
            await session.commit()
            await session.refresh(cfg)

        # 2. Resolve default active workflow if not provided
        target_wf_id = request.workflow_id
        if target_wf_id is None:
            wf_res = await session.execute(
                select(WorkflowModel.id)
                .where(
                    WorkflowModel.organization_id == request.org_id,
                    WorkflowModel.status == "active",
                )
                .order_by(WorkflowModel.id.asc())
                .limit(1)
            )
            target_wf_id = wf_res.scalar_one_or_none()

        # 3. Check if number exists
        num_res = await session.execute(
            select(TelephonyPhoneNumberModel)
            .where(
                TelephonyPhoneNumberModel.organization_id == request.org_id,
                TelephonyPhoneNumberModel.address_normalized == normalized,
            )
            .limit(1)
        )
        phone_row = num_res.scalars().first()
        if phone_row:
            phone_row.is_active = True
            if target_wf_id:
                phone_row.inbound_workflow_id = target_wf_id
            phone_row.updated_at = datetime.now(UTC)
        else:
            phone_row = TelephonyPhoneNumberModel(
                organization_id=request.org_id,
                telephony_configuration_id=cfg.id,
                address=clean_number,
                address_normalized=normalized,
                address_type="pstn_number",
                country_code=country_code,
                inbound_workflow_id=target_wf_id,
                is_active=True,
                is_default_caller_id=True,
                extra_metadata={},
            )
            session.add(phone_row)

        await session.commit()
        return {
            "status": "success",
            "phone_number": clean_number,
            "inbound_workflow_id": target_wf_id,
        }


class ReleasePhoneNumberRequest(BaseModel):
    org_id: int
    phone_number: str


@router.post("/telephony/release-number")
async def release_phone_number(
    request: ReleasePhoneNumberRequest,
    _: None = Depends(verify_internal_token),
):
    """Deactivate released PSTN number in Dograh's telephony tables."""
    clean_number = request.phone_number.strip()
    if not clean_number:
        raise HTTPException(status_code=400, detail="Empty phone number")

    normalized = clean_number if clean_number.startswith("+") else f"+{clean_number}"

    async with db_client.async_session() as session:
        num_res = await session.execute(
            select(TelephonyPhoneNumberModel).where(
                TelephonyPhoneNumberModel.organization_id == request.org_id,
                TelephonyPhoneNumberModel.address_normalized == normalized,
            )
        )
        phone_rows = num_res.scalars().all()
        for phone_row in phone_rows:
            phone_row.is_active = False
            phone_row.updated_at = datetime.now(UTC)
        await session.commit()

        logger.info(
            f"Deactivated {len(phone_rows)} Dograh telephony record(s) for {clean_number} (org {request.org_id})"
        )
        return {
            "status": "success",
            "phone_number": clean_number,
            "deactivated_count": len(phone_rows),
        }


@router.get("/org-workflows/{org_id}")
async def get_org_workflows(
    org_id: int,
    _: None = Depends(verify_internal_token),
):
    """Retrieve workflows belonging to an organization for Talkar agent syncing."""
    async with db_client.async_session() as session:
        res = await session.execute(
            select(WorkflowModel).where(WorkflowModel.organization_id == org_id)
        )
        wfs = res.scalars().all()
        return [
            {
                "id": w.id,
                "name": w.name,
                "status": w.status,
                "created_at": w.created_at.isoformat() if w.created_at else None,
            }
            for w in wfs
        ]


@router.post("/organizations/{org_id}/archive")
async def archive_organization(
    org_id: int,
    _: None = Depends(verify_internal_token),
):
    """Archive an organization in Dograh, revoking keys, pausing numbers, and disabling call limits."""
    org = await db_client.get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # 1. Block calls and mark org archived in configuration
    await db_client.create_or_update_organization_configuration(
        org_id, "CONCURRENT_CALL_LIMIT", {"value": 0}
    )
    await db_client.create_or_update_organization_configuration(
        org_id, "TALKAR_ORG_STATUS", {"value": "archived"}
    )

    # 2. Invalidate API keys, deactivate telephony phone numbers, archive workflows
    async with db_client.async_session() as session:
        now = datetime.now(UTC)
        await session.execute(
            update(APIKeyModel)
            .where(APIKeyModel.organization_id == org_id)
            .values(is_active=False, archived_at=now)
        )
        await session.execute(
            update(TelephonyPhoneNumberModel)
            .where(TelephonyPhoneNumberModel.organization_id == org_id)
            .values(is_active=False)
        )
        await session.execute(
            update(WorkflowModel)
            .where(
                WorkflowModel.organization_id == org_id,
                WorkflowModel.status != WorkflowStatus.ARCHIVED.value,
            )
            .values(status=WorkflowStatus.ARCHIVED.value)
        )
        await session.commit()

    logger.info(f"Internal request: archived Dograh org {org_id}")
    return {"status": "success", "org_id": org_id, "action": "archived"}


@router.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    _: None = Depends(verify_internal_token),
):
    """Delete an organization and all associated data in Dograh."""
    org = await db_client.get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    async with db_client.async_session() as session:
        # 1. Unlink user active organization
        await session.execute(
            text("UPDATE users SET selected_organization_id = NULL WHERE selected_organization_id = :org_id"),
            {"org_id": org_id},
        )

        # 2. Delete organization_users association
        await session.execute(
            text("DELETE FROM organization_users WHERE organization_id = :org_id"),
            {"org_id": org_id},
        )

        # 3. Handle campaigns and unbind runs
        await session.execute(
            text("""
                UPDATE workflow_runs SET campaign_id = NULL
                WHERE campaign_id IN (SELECT id FROM campaigns WHERE organization_id = :org_id)
            """),
            {"org_id": org_id},
        )
        await session.execute(
            text("DELETE FROM campaigns WHERE organization_id = :org_id"),
            {"org_id": org_id},
        )

        # 4. Handle workflows and their runs / definitions
        await session.execute(
            text("""
                DELETE FROM workflow_runs
                WHERE workflow_id IN (SELECT id FROM workflows WHERE organization_id = :org_id)
            """),
            {"org_id": org_id},
        )
        await session.execute(
            text("""
                DELETE FROM workflow_definitions
                WHERE workflow_id IN (SELECT id FROM workflows WHERE organization_id = :org_id)
            """),
            {"org_id": org_id},
        )
        await session.execute(
            text("DELETE FROM workflows WHERE organization_id = :org_id"),
            {"org_id": org_id},
        )

        # 5. Delete folders
        await session.execute(
            text("DELETE FROM folders WHERE organization_id = :org_id"),
            {"org_id": org_id},
        )

        # 6. Delete integrations
        await session.execute(
            text("DELETE FROM integrations WHERE organization_id = :org_id"),
            {"org_id": org_id},
        )

        # 7. Delete organization usage cycles
        await session.execute(
            text("DELETE FROM organization_usage_cycles WHERE organization_id = :org_id"),
            {"org_id": org_id},
        )

        # 8. Delete organization (cascades configs, api_keys, telephony tables, tools, docs, etc.)
        await session.execute(
            text("DELETE FROM organizations WHERE id = :org_id"),
            {"org_id": org_id},
        )
        await session.commit()

    logger.info(f"Internal request: deleted Dograh org {org_id}")
    return {"status": "success", "org_id": org_id, "action": "deleted"}


class MockTelephonyOverrideRequest(BaseModel):
    organization_id: int
    min_duration_seconds: int | None = None
    max_duration_seconds: int | None = None
    outcomes: dict[str, int] | None = None


@router.post("/mock-telephony/override")
async def set_mock_telephony_override(
    request: MockTelephonyOverrideRequest,
    _: None = Depends(verify_internal_token),
):
    """Set live Redis simulation override parameters for an organization without restarting."""
    import redis.asyncio as aioredis
    from api.constants import REDIS_URL

    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    override_dict = {
        k: v
        for k, v in request.model_dump().items()
        if v is not None and k != "organization_id"
    }

    key = f"mock_telephony:config:{request.organization_id}"
    await redis_client.set(key, json.dumps(override_dict))
    logger.info(
        f"Internal request: updated mock telephony override for org {request.organization_id}: {override_dict}"
    )
    return {
        "status": "success",
        "organization_id": request.organization_id,
        "config": override_dict,
    }


@router.get("/mock-telephony/override")
async def get_mock_telephony_override(
    organization_id: int = Query(..., description="Organization ID"),
    _: None = Depends(verify_internal_token),
):
    """Get active live Redis simulation override for an organization."""
    import redis.asyncio as aioredis
    from api.constants import REDIS_URL

    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    raw = await redis_client.get(f"mock_telephony:config:{organization_id}")
    config = json.loads(raw) if raw else None
    return {
        "organization_id": organization_id,
        "config": config,
    }


@router.delete("/mock-telephony/override")
async def clear_mock_telephony_override(
    organization_id: int = Query(..., description="Organization ID"),
    _: None = Depends(verify_internal_token),
):
    """Delete live Redis simulation override for an organization, reverting to campaign/telephony config defaults."""
    import redis.asyncio as aioredis
    from api.constants import REDIS_URL

    redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    deleted = await redis_client.delete(f"mock_telephony:config:{organization_id}")
    logger.info(
        f"Internal request: cleared mock telephony override for org {organization_id}"
    )
    return {
        "status": "success",
        "organization_id": organization_id,
        "cleared": bool(deleted),
    }


@router.post("/cleanup-abandoned-signups")
async def cleanup_abandoned_signups_endpoint(
    max_age_hours: int = Query(48, description="Purge unverified accounts older than this many hours"),
    _: None = Depends(verify_internal_token),
):
    """Purge abandoned unverified user signups older than max_age_hours (Edge Case 28)."""
    deleted_count = await db_client.cleanup_abandoned_signups(max_age_hours=max_age_hours)
    logger.info(f"Purged {deleted_count} abandoned unverified user signups older than {max_age_hours}h")
    return {"status": "success", "deleted_count": deleted_count}

