from loguru import logger
from pipecat.utils.run_context import set_current_run_id

from api.constants import DEPLOYMENT_MODE, TALKAR_SERVICE_URL, TALKAR_BILLING_API_TOKEN
from api.services.workflow_run_billing import (
    report_completed_workflow_run_platform_usage,
)
from api.tasks.run_integrations import run_integrations_post_workflow_run


async def process_workflow_completion(
    _ctx,
    workflow_run_id: int,
    attempt: int = 1,
):
    """Process workflow completion: run integrations and report billing.

    Recording/transcript uploads happen in the pipeline process itself
    (api/services/workflow_run_artifacts.py) before this job is enqueued,
    so this task needs no shared filesystem with the web tier.

    Args:
        _ctx: ARQ context (unused)
        workflow_run_id: The workflow run ID
        attempt: Current delivery attempt (for billing retries)
    """
    run_id = str(workflow_run_id)
    set_current_run_id(run_id)

    logger.info(f"Processing workflow completion for run {workflow_run_id} (attempt {attempt})")

    # Run integrations including QA analysis on the initial attempt
    if attempt == 1:
        try:
            await run_integrations_post_workflow_run(_ctx, workflow_run_id)
        except Exception as e:
            logger.error(f"Error running integrations for workflow {workflow_run_id}: {e}")

        # Notify MPS after completion. MPS owns credit accounting in hosted SaaS mode only.
        if DEPLOYMENT_MODE not in ("oss", "talkar"):
            try:
                await report_completed_workflow_run_platform_usage(workflow_run_id)
            except Exception as e:
                logger.error(
                    f"Error reporting platform usage for workflow {workflow_run_id}: {e}"
                )

    # TALKAR PATCH: Deduct from Talkar wallet with retry loop and DLQ persistence
    if DEPLOYMENT_MODE == "talkar":
        MAX_BILLING_ATTEMPTS = 5
        deduct_payload = None
        deduct_success = False
        last_error = None

        try:
            import httpx
            from api.db import db_client
            workflow_run = await db_client.get_workflow_run_by_id(workflow_run_id)
            if workflow_run:
                if getattr(workflow_run, "mode", None) == "textchat":
                    logger.info(f"Skipping Talkar deduction for text chat run {workflow_run_id}")
                    deduct_success = True
                else:
                    usage_info = getattr(workflow_run, "usage_info", None) or {}
                    duration = usage_info.get("call_duration_seconds")
                    try:
                        import math
                        duration_seconds = math.ceil(float(duration))
                    except (TypeError, ValueError):
                        duration_seconds = 0
                    
                    workflow = getattr(workflow_run, "workflow", None)
                    workflow_id = getattr(workflow, "id", None) or getattr(workflow_run, "workflow_id", None)
                    org_id = getattr(workflow, "organization_id", None) or getattr(workflow_run, "organization_id", None)
                    if not org_id and workflow_id:
                        try:
                            org_id = await db_client.get_workflow_organization_id(workflow_id)
                        except Exception as org_err:
                            logger.warning(f"Could not load organization_id for workflow {workflow_id}: {org_err}")
                    
                    if org_id:
                        import os
                        talkar_billing_token = os.getenv(
                            "TALKAR_BILLING_API_TOKEN",
                            TALKAR_BILLING_API_TOKEN,
                        ).strip()
                        headers = {"Content-Type": "application/json"}
                        if talkar_billing_token:
                            headers["Authorization"] = f"Bearer {talkar_billing_token}"
                        run_mode = getattr(workflow_run, "mode", None)
                        deduct_payload = {
                            "workflow_run_id": workflow_run_id,
                            "duration_seconds": duration_seconds,
                            "organization_id": org_id,
                            "mode": run_mode,
                            "workflow_id": workflow_id,
                        }

                        # Inline retry loop (up to 3 immediate retries with brief delay)
                        for inline_try in range(1, 4):
                            try:
                                async with httpx.AsyncClient() as client:
                                    res = await client.post(
                                        f"{TALKAR_SERVICE_URL}/billing/deduct",
                                        json=deduct_payload,
                                        headers=headers,
                                        timeout=15.0,
                                    )
                                    res.raise_for_status()
                                    deduct_success = True
                                    logger.info(f"Successfully deducted Talkar billing for run {workflow_run_id}")
                                    break
                            except Exception as http_err:
                                last_error = http_err
                                if inline_try < 3:
                                    import asyncio
                                    await asyncio.sleep(inline_try * 0.5)
                    else:
                        logger.warning(f"No organization_id resolvable for run {workflow_run_id}, skipping billing deduction")
                        deduct_success = True
        except Exception as e:
            last_error = e

        if not deduct_success and deduct_payload:
            if attempt < MAX_BILLING_ATTEMPTS:
                backoff_seconds = min(15 * (2 ** (attempt - 1)), 300)
                logger.warning(
                    f"Talkar billing deduction failed for run {workflow_run_id} (attempt {attempt}/{MAX_BILLING_ATTEMPTS}): {last_error}. "
                    f"Re-enqueuing in {backoff_seconds}s with exponential backoff."
                )
                try:
                    from api.tasks.arq import enqueue_job
                    from api.tasks.function_names import FunctionNames
                    await enqueue_job(
                        FunctionNames.PROCESS_WORKFLOW_COMPLETION,
                        workflow_run_id,
                        attempt + 1,
                        _job_id=f"talkar-billing-retry-{workflow_run_id}-{attempt + 1}",
                        _defer_by=backoff_seconds,
                    )
                except Exception as arq_err:
                    logger.error(f"Failed to re-enqueue billing retry for run {workflow_run_id}: {arq_err}")
            else:
                # Max retries exhausted - Park in Redis Dead Letter Queue (DLQ)
                logger.critical(
                    f"Talkar billing deduction exhausted all {MAX_BILLING_ATTEMPTS} attempts for run {workflow_run_id}: {last_error}. "
                    f"Parking in Dead-Letter Queue (talkar:billing:dlq)."
                )
                try:
                    import json
                    from datetime import datetime, UTC
                    from api.tasks.arq import get_arq_redis
                    redis = await get_arq_redis()
                    dlq_record = {
                        "workflow_run_id": workflow_run_id,
                        "payload": deduct_payload,
                        "error": str(last_error),
                        "attempts": attempt,
                        "failed_at": datetime.now(UTC).isoformat(),
                    }
                    await redis.rpush("talkar:billing:dlq", json.dumps(dlq_record))
                    try:
                        import sentry_sdk
                        sentry_sdk.capture_message(
                            f"Talkar billing deduction failed after max retries and parked in DLQ for run {workflow_run_id}: {last_error}",
                            level="error",
                        )
                    except Exception:
                        pass
                except Exception as dlq_err:
                    logger.error(f"Failed to record run {workflow_run_id} into DLQ: {dlq_err}")

    logger.info(f"Completed workflow completion processing for run {workflow_run_id}")
