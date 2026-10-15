from datetime import UTC, datetime

from loguru import logger

from api.db import db_client
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
    ctx: dict, campaign_id: int, batch_size: int = 10, callbacks_only: bool = False
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

    failed_count = 0
    try:
        # Process the batch
        processed_count = await campaign_call_dispatcher.process_batch(
            campaign_id=campaign_id, batch_size=batch_size, callbacks_only=callbacks_only
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
        logger.warning(
            f"Failed to acquire concurrent slot for campaign {campaign_id}: {e}"
        )

        # Publish batch failed event with specific error
        publisher = await get_campaign_event_publisher()
        await publisher.publish_batch_failed(
            campaign_id=campaign_id,
            error=f"Concurrent slot acquisition timeout: {e}",
            processed_count=0,
        )

        # Update campaign state to failed
        await db_client.update_campaign(campaign_id=campaign_id, state="failed")
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="error",
            event="batch_failed",
            message=f"Concurrent slot acquisition timeout: {e}",
            details={"error": str(e), "reason": "concurrent_slot_timeout"},
        )
        raise

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
            )
            return

        # Persistent depletion, suspension, or transient retries exhausted -> PAUSE campaign safely
        # Blocker 29: Differentiate wallet depletion from policy suspension and spending caps
        is_policy_suspension = e.error_code in (
            "customer_status_suspended",
            "master_suspended",
        )
        is_under_review = e.error_code == "customer_status_under_review"
        is_spending_cap = e.error_code == "spending_cap_exceeded"

        if is_policy_suspension:
            paused_reason = "policy_suspended"
            event_name = "campaign_paused_policy_suspended"
            log_msg = (
                f"Campaign {campaign_id} paused due to account/policy suspension: [{e.error_code}] {e.error_message}. "
                "Contact support or resolve account status to resume."
            )
        elif is_under_review:
            paused_reason = "under_review"
            event_name = "campaign_paused_under_review"
            log_msg = (
                f"Campaign {campaign_id} paused because account is under review: [{e.error_code}] {e.error_message}."
            )
        elif is_spending_cap:
            paused_reason = "spending_cap_exceeded"
            event_name = "campaign_paused_spending_cap_exceeded"
            log_msg = (
                f"Campaign {campaign_id} paused due to spending cap: [{e.error_code}] {e.error_message}."
            )
        elif e.error_code in ("insufficient_balance", "insufficient_quota", "insufficient_credits", "quota_exceeded", "insufficient_reserve"):
            paused_reason = "wallet_depleted"
            event_name = "campaign_paused_quota_exhausted"
            log_msg = (
                f"Campaign {campaign_id} paused due to wallet depletion: [{e.error_code}] {e.error_message}. "
                "Top up wallet or resolve billing to resume."
            )
        else:
            paused_reason = "quota_exceeded"
            event_name = "campaign_paused_quota_exhausted"
            log_msg = (
                f"Campaign {campaign_id} paused due to quota check failure: [{e.error_code}] {e.error_message}."
            )

        logger.warning(
            f"Pausing campaign {campaign_id} due to {paused_reason}: [{e.error_code}] {e.error_message}"
        )

        campaign = await db_client.get_campaign_by_id(campaign_id)
        new_meta = dict(campaign.orchestrator_metadata or {}) if campaign else {}
        new_meta["paused_reason"] = paused_reason

        await db_client.update_campaign(
            campaign_id=campaign_id,
            state="paused",
            orchestrator_metadata=new_meta,
        )
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="warning",
            event=event_name,
            message=log_msg,
            details={
                "error_code": e.error_code,
                "error_message": e.error_message,
                "organization_id": e.organization_id,
                "paused_reason": paused_reason,
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
