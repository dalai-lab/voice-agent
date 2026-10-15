from datetime import UTC, datetime

from loguru import logger

from api.db import db_client
from api.services.call_concurrency.rate_limiter import rate_limiter
from api.services.campaign.campaign_call_dispatcher import campaign_call_dispatcher
from api.services.campaign.campaign_event_publisher import (
    get_campaign_event_publisher,
)
from api.services.campaign.errors import (
    CampaignQuotaExceededError,
    ConcurrentSlotAcquisitionError,
    PhoneNumberPoolExhaustedError,
)
from api.services.campaign.source_sync_factory import get_sync_service

PHONE_NUMBER_POOL_EXHAUSTED_COUNTER_KEY = "phone_number_pool_exhausted_attempts"
MAX_PHONE_NUMBER_POOL_EXHAUSTED_ATTEMPTS = 3
CAMPAIGN_QUOTA_RETRY_COUNTER_KEY = "quota_exhausted_attempts"
MAX_CAMPAIGN_QUOTA_RETRY_ATTEMPTS = 5
# Max retries before a concurrent-slot timeout permanently fails the campaign.
# Each retry re-schedules via publish_batch_completed so the orchestrator backs
# off naturally between attempts.  6 retries * ~30s orchestrator cycle ≈ 3 min
# of grace time after a slot jam before we give up.
CONCURRENT_SLOT_RETRY_COUNTER_KEY = "concurrent_slot_timeout_attempts"
MAX_CONCURRENT_SLOT_RETRY_ATTEMPTS = 6
TRANSIENT_QUOTA_ERROR_CODES = {
    "concurrency_limit_exceeded",
    "sub_org_concurrency_limit_exceeded",
    "insufficient_reserve",
    "billing_service_unavailable",
}


async def sync_campaign_source(ctx: dict, campaign_id: int) -> None:
    """
    Phase 1: Syncs data from configured source to queued_runs table
    - Campaign state should already be 'syncing'
    - Determines source type from campaign configuration
    - Fetches data via the appropriate sync service
    - Creates queued_run entries with unique source_uuid
    - Updates campaign total_rows
    - Transitions campaign state to 'running' on success
    - Enqueues process_campaign_batch tasks
    """
    logger.info(f"Starting source sync for campaign {campaign_id}")

    try:
        # Get campaign
        campaign = await db_client.get_campaign_by_id(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        # Get appropriate sync service
        sync_service = get_sync_service(campaign.source_type)

        # Sync source data
        rows_synced = await sync_service.sync_source_data(campaign_id)

        if rows_synced == 0:
            # No data to process
            await db_client.update_campaign(
                campaign_id=campaign_id,
                state="completed",
                completed_at=datetime.now(UTC),
                source_sync_status="completed",
                source_last_synced_at=datetime.now(UTC),
            )
            logger.info(f"Campaign {campaign_id} completed with no data to process")
            return

        # Update campaign state to running
        await db_client.update_campaign(
            campaign_id=campaign_id,
            state="running",
            source_sync_status="completed",
            source_last_synced_at=datetime.now(UTC),
        )

        # Publish sync completed event - orchestrator will schedule first batch
        publisher = await get_campaign_event_publisher()
        await publisher.publish_sync_completed(
            campaign_id=campaign_id,
            total_rows=rows_synced,
            source_type=campaign.source_type,
            source_id=campaign.source_id,
        )

        logger.info(
            f"Campaign {campaign_id} source sync completed, {rows_synced} rows synced"
        )

    except Exception as e:
        logger.error(f"Error syncing campaign {campaign_id} source: {e}")

        # Update campaign with error
        await db_client.update_campaign(
            campaign_id=campaign_id,
            state="failed",
            source_sync_status="failed",
            source_sync_error=str(e),
        )
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="error",
            event="source_sync_failed",
            message=f"Source sync failed: {e}",
            details={"error": str(e)},
        )
        raise


async def process_campaign_batch(
    ctx: dict, campaign_id: int, batch_size: int = 10
) -> None:
    """
    Phase 2: Processes a batch of queued runs
    - Fetches next batch of 'queued' runs (including due retries)
    - Creates workflow runs with context variables
    - Initiates Twilio calls with rate limiting
    - Updates queued_run state to 'processed'
    - Updates campaign.processed_rows counter
    - Publishes batch_completed event for orchestrator

    # TODO: May be not fail the campaign immediately on a single batch failure
    # and propagate the error to campaign orchestrator which can fail the campaign
    # on some consecutive batch failures.
    """
    logger.info(f"Processing batch for campaign {campaign_id}, batch_size={batch_size}")

    # Worker-level deduplication: ensure only one worker executes a batch for this campaign at a time
    redis = ctx.get("redis") if isinstance(ctx, dict) else None
    if redis is None:
        try:
            from api.tasks.arq import get_arq_redis
            redis = await get_arq_redis()
        except Exception:
            redis = None

    exec_lock_key = f"campaign:batch_executing:{campaign_id}"
    if redis is not None:
        try:
            lock_acquired = await redis.set(exec_lock_key, "1", nx=True, ex=120)
            if not lock_acquired:
                logger.warning(
                    f"Campaign {campaign_id} batch is already running in another worker, skipping duplicate task execution"
                )
                return
        except Exception as lock_err:
            logger.debug(f"Worker execution lock error: {lock_err}")

    failed_count = 0
    try:
        # Process the batch
        processed_count = await campaign_call_dispatcher.process_batch(
            campaign_id=campaign_id, batch_size=batch_size
        )

        if processed_count > 0:
            await db_client.reset_campaign_metadata_counter(
                campaign_id=campaign_id,
                key=PHONE_NUMBER_POOL_EXHAUSTED_COUNTER_KEY,
            )
            await db_client.reset_campaign_metadata_counter(
                campaign_id=campaign_id,
                key=CAMPAIGN_QUOTA_RETRY_COUNTER_KEY,
            )
            await db_client.reset_campaign_metadata_counter(
                campaign_id=campaign_id,
                key=CONCURRENT_SLOT_RETRY_COUNTER_KEY,
            )

        # Publish batch completed event - orchestrator will handle next batch scheduling
        publisher = await get_campaign_event_publisher()
        await publisher.publish_batch_completed(
            campaign_id=campaign_id,
            processed_count=processed_count,
            failed_count=failed_count,
            batch_size=batch_size,
        )

        logger.info(
            f"Campaign {campaign_id} batch completed: processed={processed_count}, "
            f"failed={failed_count}"
        )

    except ConcurrentSlotAcquisitionError as e:
        # Check if the campaign itself has active calls running right now.
        # If the campaign is actively executing calls (e.g. a customer call lasting 5-10 minutes),
        # its slot being occupied is EXPECTED and HEALTHY, not an error or starvation condition.
        # We must NOT increment the exhaustion counter or pause the campaign while its calls are active!
        has_active_call = False
        try:
            scope_count = await rate_limiter.get_live_slot_count(f"campaign:{campaign_id}")
            if scope_count and scope_count > 0:
                has_active_call = True
            else:
                db_active = await db_client.get_active_runs_count_for_campaign(campaign_id)
                if db_active > 0:
                    has_active_call = True
        except Exception as active_err:
            logger.debug(f"Error checking active campaign calls: {active_err}")

        publisher = await get_campaign_event_publisher()

        if has_active_call:
            # Reset retry counter since the campaign is actively executing calls
            await db_client.reset_campaign_metadata_counter(
                campaign_id=campaign_id,
                key=CONCURRENT_SLOT_RETRY_COUNTER_KEY,
            )
            logger.info(
                f"Campaign {campaign_id} currently has active call(s) in progress; "
                f"waiting for active call to complete before dispatching next batch. Deferring 15s."
            )
            await publisher.publish_batch_completed(
                campaign_id=campaign_id,
                processed_count=0,
                failed_count=0,
                batch_size=batch_size,
                metadata={"defer_seconds": 15, "reason": "campaign_call_in_progress"},
            )
            return

        attempt = await db_client.increment_campaign_metadata_counter(
            campaign_id=campaign_id,
            key=CONCURRENT_SLOT_RETRY_COUNTER_KEY,
        )
        logger.warning(
            f"Failed to acquire concurrent slot for campaign {campaign_id}: {e}; "
            f"attempt={attempt}/{MAX_CONCURRENT_SLOT_RETRY_ATTEMPTS}"
        )

        if attempt < MAX_CONCURRENT_SLOT_RETRY_ATTEMPTS:
            # Transient: all org slots are busy right now.  Let the orchestrator
            # reschedule — stale slots will expire and free up within seconds.
            await db_client.append_campaign_log(
                campaign_id=campaign_id,
                level="warning",
                event="concurrent_slot_timeout_retry",
                message=(
                    f"Concurrent slot acquisition timed out for campaign {campaign_id} "
                    f"(org {e.organization_id}); all {e.max_concurrent} slots occupied. "
                    f"Retry attempt {attempt}/{MAX_CONCURRENT_SLOT_RETRY_ATTEMPTS}. "
                    "Stale slots will be evicted automatically within 120 s."
                ),
                details={
                    "error": str(e),
                    "organization_id": e.organization_id,
                    "max_concurrent": e.max_concurrent,
                    "wait_time": e.wait_time,
                    "attempt": attempt,
                    "max_attempts": MAX_CONCURRENT_SLOT_RETRY_ATTEMPTS,
                    "reason": "concurrent_slot_timeout",
                },
            )
            # Publish as batch_completed (0 processed) with defer_seconds so the orchestrator
            # backs off before scheduling the next batch without burning retries instantly.
            await publisher.publish_batch_completed(
                campaign_id=campaign_id,
                processed_count=0,
                failed_count=0,
                batch_size=batch_size,
                metadata={"defer_seconds": 15, "reason": "concurrent_slot_timeout"},
            )
            return

        # Retries exhausted — the concurrency pool is persistently saturated.
        # PAUSE (not fail) the campaign: this is an operational condition
        # (org limit too low, or many long calls in flight), not a code error.
        # The campaign can be resumed once the operator adjusts the concurrency
        # limit or active calls clear out naturally.
        logger.warning(
            f"Concurrent slot acquisition exhausted retries for campaign {campaign_id} "
            f"after {attempt} attempts; pausing campaign for operator review."
        )

        campaign_obj = await db_client.get_campaign_by_id(campaign_id)
        new_meta = dict(campaign_obj.orchestrator_metadata or {}) if campaign_obj else {}
        new_meta["paused_reason"] = "concurrency_limit_exhausted"
        new_meta["paused_max_concurrent"] = e.max_concurrent

        await publisher.publish_batch_failed(
            campaign_id=campaign_id,
            error=f"Concurrent slot acquisition timeout: {e}",
            processed_count=0,
        )
        await db_client.update_campaign(
            campaign_id=campaign_id,
            state="paused",
            orchestrator_metadata=new_meta,
        )
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="warning",
            event="campaign_paused_concurrency_limit",
            message=(
                f"Campaign {campaign_id} paused: concurrent slot acquisition timed out "
                f"after {attempt} consecutive attempts (org {e.organization_id}, "
                f"limit={e.max_concurrent}). "
                "Increase the org's concurrent call limit or wait for active calls to clear, "
                "then resume the campaign."
            ),
            details={
                "error": str(e),
                "organization_id": e.organization_id,
                "max_concurrent": e.max_concurrent,
                "wait_time": e.wait_time,
                "attempt": attempt,
                "max_attempts": MAX_CONCURRENT_SLOT_RETRY_ATTEMPTS,
                "reason": "concurrency_limit_exhausted",
                "action": "campaign_paused_resumable",
            },
        )
        # Do NOT raise — campaign is paused, not crashed.
        # The orchestrator's BatchFailedEvent handler clears _batch_in_progress.


    except PhoneNumberPoolExhaustedError as e:
        attempt = await db_client.increment_campaign_metadata_counter(
            campaign_id=campaign_id,
            key=PHONE_NUMBER_POOL_EXHAUSTED_COUNTER_KEY,
        )
        logger.warning(
            f"Phone number pool exhausted for campaign {campaign_id}: {e}; "
            f"attempt={attempt}/{MAX_PHONE_NUMBER_POOL_EXHAUSTED_ATTEMPTS}"
        )

        publisher = await get_campaign_event_publisher()

        if attempt < MAX_PHONE_NUMBER_POOL_EXHAUSTED_ATTEMPTS:
            await db_client.append_campaign_log(
                campaign_id=campaign_id,
                level="warning",
                event="phone_number_pool_exhausted_retry",
                message=(
                    f"Phone number pool exhausted for org {e.organization_id}: "
                    "no free from_number available to dispatch outbound calls; "
                    f"retry attempt {attempt}/"
                    f"{MAX_PHONE_NUMBER_POOL_EXHAUSTED_ATTEMPTS}"
                ),
                details={
                    "error": str(e),
                    "organization_id": e.organization_id,
                    "attempt": attempt,
                    "max_attempts": MAX_PHONE_NUMBER_POOL_EXHAUSTED_ATTEMPTS,
                },
            )
            await publisher.publish_batch_completed(
                campaign_id=campaign_id,
                processed_count=0,
                failed_count=0,
                batch_size=batch_size,
                metadata={"defer_seconds": 15, "reason": "phone_number_pool_exhausted"},
            )
            return

        await publisher.publish_batch_failed(
            campaign_id=campaign_id,
            error=f"Phone number pool exhausted: {e}",
            processed_count=0,
        )

        await db_client.update_campaign(campaign_id=campaign_id, state="failed")
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="error",
            event="phone_number_pool_exhausted",
            message=(
                f"Phone number pool exhausted for org {e.organization_id} after "
                f"{attempt} consecutive attempts: no free from_number available "
                "to dispatch outbound calls"
            ),
            details={
                "error": str(e),
                "organization_id": e.organization_id,
                "attempt": attempt,
                "max_attempts": MAX_PHONE_NUMBER_POOL_EXHAUSTED_ATTEMPTS,
            },
        )
        raise

    except CampaignQuotaExceededError as e:
        is_transient = e.error_code in TRANSIENT_QUOTA_ERROR_CODES
        attempt = 0
        if is_transient:
            attempt = await db_client.increment_campaign_metadata_counter(
                campaign_id=campaign_id,
                key=CAMPAIGN_QUOTA_RETRY_COUNTER_KEY,
            )
            logger.warning(
                f"Transient quota error for campaign {campaign_id}: {e}; "
                f"attempt={attempt}/{MAX_CAMPAIGN_QUOTA_RETRY_ATTEMPTS}"
            )

        publisher = await get_campaign_event_publisher()

        if is_transient and attempt < MAX_CAMPAIGN_QUOTA_RETRY_ATTEMPTS:
            await db_client.append_campaign_log(
                campaign_id=campaign_id,
                level="warning",
                event="campaign_quota_transient_retry",
                message=(
                    f"Transient quota check failure for campaign {campaign_id} (org {e.organization_id}): "
                    f"[{e.error_code}] {e.error_message}; retrying attempt {attempt}/{MAX_CAMPAIGN_QUOTA_RETRY_ATTEMPTS}"
                ),
                details={
                    "error_code": e.error_code,
                    "error_message": e.error_message,
                    "organization_id": e.organization_id,
                    "attempt": attempt,
                    "max_attempts": MAX_CAMPAIGN_QUOTA_RETRY_ATTEMPTS,
                },
            )
            await publisher.publish_batch_completed(
                campaign_id=campaign_id,
                processed_count=0,
                failed_count=0,
                batch_size=batch_size,
                metadata={"defer_seconds": 15, "reason": "quota_transient_retry"},
            )
            return

        # Persistent depletion or transient retries exhausted -> PAUSE campaign safely
        logger.warning(
            f"Pausing campaign {campaign_id} due to wallet depletion/quota exhaustion: "
            f"[{e.error_code}] {e.error_message}"
        )

        campaign = await db_client.get_campaign_by_id(campaign_id)
        new_meta = dict(campaign.orchestrator_metadata or {}) if campaign else {}
        new_meta["paused_reason"] = (
            "wallet_depleted"
            if e.error_code in ("insufficient_quota", "insufficient_credits", "quota_exceeded", "insufficient_reserve")
            else "quota_exceeded"
        )

        await db_client.update_campaign(
            campaign_id=campaign_id,
            state="paused",
            orchestrator_metadata=new_meta,
        )
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="warning",
            event="campaign_paused_quota_exhausted",
            message=(
                f"Campaign {campaign_id} paused due to wallet depletion/quota exhaustion: [{e.error_code}] {e.error_message}. "
                "No contact leads were marked as failed. Top up wallet or resolve billing to resume."
            ),
            details={
                "error_code": e.error_code,
                "error_message": e.error_message,
                "organization_id": e.organization_id,
                "attempt": attempt if is_transient else None,
            },
        )

        await publisher.publish_batch_failed(
            campaign_id=campaign_id,
            error=f"Campaign paused due to quota check failure: [{e.error_code}] {e.error_message}",
            processed_count=0,
        )
        raise

    except Exception as e:
        logger.error(f"Error processing batch for campaign {campaign_id}: {e}")

        # Publish batch failed event
        publisher = await get_campaign_event_publisher()
        await publisher.publish_batch_failed(
            campaign_id=campaign_id,
            error=str(e),
            processed_count=0,
        )

        # Update campaign state to failed
        await db_client.update_campaign(campaign_id=campaign_id, state="failed")
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="error",
            event="batch_failed",
            message=f"Batch processing failed: {e}",
            details={"error": str(e)},
        )
        raise
    finally:
        if redis is not None:
            try:
                await redis.delete(exec_lock_key)
            except Exception:
                pass


async def sweep_stuck_campaign_runs(ctx: dict) -> int:
    """Periodic ARQ cron task to recover queued runs stuck in 'processing' state.

    Safety net for runs whose worker crashed, got evicted, or hit an unhandled exception.
    """
    logger.debug("Running periodic sweep of stuck processing campaign runs...")
    try:
        recovered = await db_client.cleanup_stuck_processing_queued_runs(threshold_seconds=300)
        if recovered > 0:
            logger.info(f"Sweep recovered {recovered} stuck processing queued runs")
        return recovered
    except Exception as e:
        logger.error(f"Error during sweep of stuck processing queued runs: {e}")
        return 0

