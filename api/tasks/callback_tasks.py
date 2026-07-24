from loguru import logger
from api.db import db_client
from api.services.telephony.factory import get_default_telephony_provider, get_telephony_provider_by_id
from api.utils.common import get_backend_endpoints
from api.services.workflow.run_creation import prepare_workflow_run_inputs
from arq import Retry
from datetime import timedelta

async def execute_callback(ctx, to_number: str, from_number: str,
                           workflow_id: int, organization_id: int,
                           original_run_id: int, conversation_summary: str,
                           gathered_context: dict,
                           callback_chain_depth: int = 1,
                           campaign_id: int = None):
    """
    Fires the actual callback outbound call.
    Called by ARQ after the delay expires.
    """
    try:
        logger.info(f"Executing scheduled callback for original run {original_run_id} to {to_number}")
        if campaign_id:
            campaign = await db_client.get_campaign_by_id(campaign_id)
            provider = await get_telephony_provider_by_id(
                campaign.telephony_configuration_id if campaign else None, 
                organization_id
            )
        else:
            provider = await get_default_telephony_provider(organization_id)

        # Fetch workflow to get user_id and resume mode
        workflow = await db_client.get_workflow(workflow_id, organization_id=organization_id)
        if not workflow:
            logger.error(f"org_notification: Cannot execute callback for run {original_run_id}. Workflow {workflow_id} was deleted.")
            # We don't want ARQ to retry this, so we handle it without throwing an exception that triggers Retry
            return

        # Check if cancelled for standalone callbacks
        if not campaign_id:
            from sqlalchemy import select
            from api.db.models import ScheduledCallbackModel
            async with db_client.async_session() as session:
                stmt = select(ScheduledCallbackModel).where(ScheduledCallbackModel.original_run_id == original_run_id)
                result = await session.execute(stmt)
                cb_record = result.scalars().first()
                if cb_record and cb_record.status == "cancelled":
                    logger.info(f"Callback for original run {original_run_id} was cancelled. Ignoring.")
                    return

        # Check quota for standalone callbacks
        if not campaign_id:
            from api.services.quota_service import authorize_workflow_run_start
            quota_result = await authorize_workflow_run_start(
                workflow_id=workflow_id, 
                organization_id=organization_id
            )
            if not quota_result.has_quota:
                logger.error(f"org_notification: quota_exceeded_callback - Cannot execute callback for run {original_run_id}. Reason: {quota_result.error_message}")
                return

        callback_context = {
            "is_callback": True,
            "callback_reason": "user_requested",
            "original_run_id": original_run_id,
            "conversation_summary": conversation_summary,
            "gathered_context": gathered_context,
            "callback_chain_depth": callback_chain_depth,
            "callback_resume_mode": workflow.callback_resume_mode,
            "caller_number": from_number,
            "called_number": to_number,
            "provider": provider.PROVIDER_NAME,
        }
        if campaign_id:
            callback_context["campaign_id"] = campaign_id

        # Removed early status=completed update; moved to after initiate_call

        run_inputs = await prepare_workflow_run_inputs(db_client, workflow)

        new_run = await db_client.create_workflow_run(
            name=f"WR-CALLBACK-{original_run_id}",
            workflow_id=workflow_id,
            mode=provider.PROVIDER_NAME,
            user_id=workflow.user_id,
            definition_id=run_inputs.definition_id,
            initial_context=callback_context,
            campaign_id=campaign_id,
            organization_id=organization_id,
        )

        backend_endpoint, _ = await get_backend_endpoints()
        webhook_url = (
            f"{backend_endpoint}/api/v1/telephony/{provider.WEBHOOK_ENDPOINT}"
            f"?workflow_id={workflow_id}&workflow_run_id={new_run.id}"
            f"&organization_id={organization_id}"
        )

        await provider.initiate_call(
            to_number=to_number,
            from_number=from_number,
            webhook_url=webhook_url,
            workflow_run_id=new_run.id,
        )
        logger.info(f"Successfully initiated callback run {new_run.id}")
        
        # Update ScheduledCallbackModel to "completed" if non-campaign
        if not campaign_id:
            try:
                from api.db.models import ScheduledCallbackModel
                from sqlalchemy import update
                async with db_client.async_session() as session:
                    stmt = (
                        update(ScheduledCallbackModel)
                        .where(ScheduledCallbackModel.original_run_id == original_run_id)
                        .where(ScheduledCallbackModel.status == "pending")
                        .values(status="completed")
                    )
                    await session.execute(stmt)
                    await session.commit()
            except Exception as e:
                logger.error(f"Failed to update ScheduledCallbackModel status: {e}")
    except Exception as e:
        logger.error(f"Failed to execute callback: {e}")
        
        # Let ARQ retry up to 3 times (ctx['job_try'] is 1-indexed)
        job_try = int(ctx.get('job_try') or 1) if ctx else 1
        if job_try < 3:
            logger.info(f"Retrying callback initiation (attempt {job_try + 1}/3) in 30 seconds")
            raise Retry(defer=timedelta(seconds=30))
            
        # Update status to failed only if all retries are exhausted
        if not campaign_id:
            try:
                from api.db.models import ScheduledCallbackModel
                from sqlalchemy import update
                async with db_client.async_session() as session:
                    stmt = (
                        update(ScheduledCallbackModel)
                        .where(ScheduledCallbackModel.original_run_id == original_run_id)
                        .where(ScheduledCallbackModel.status == "pending")
                        .values(status="failed")
                    )
                    await session.execute(stmt)
                    await session.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update ScheduledCallbackModel to failed: {inner_e}")
