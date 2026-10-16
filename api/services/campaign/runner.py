import inspect
from datetime import UTC, datetime
from typing import Any

from api.db import db_client
from api.services.campaign.campaign_event_publisher import (
    get_campaign_event_publisher,
)
from api.services.campaign.circuit_breaker import circuit_breaker
from api.tasks.arq import enqueue_job
from api.tasks.function_names import FunctionNames
from loguru import logger


async def _safe_append_campaign_log(
    campaign_id: int,
    level: str,
    event: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Non-blocking activity log helper that safely awaits coroutines and ignores synchronous test mocks."""
    try:
        ret = db_client.append_campaign_log(
            campaign_id=campaign_id,
            level=level,
            event=event,
            message=message,
            details=details,
        )
        if inspect.isawaitable(ret):
            await ret
    except Exception as e:
        logger.error(
            f"Failed to append campaign log for {campaign_id} (event={event}): {e}"
        )


class CampaignRunnerService:
    """Orchestrates campaign execution"""

    async def start_campaign(self, campaign_id: int) -> None:
        """Entry point - updates state to 'syncing' and enqueues sync task"""
        # Get campaign
        campaign = await db_client.get_campaign_by_id(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        if campaign.state != "created":
            raise ValueError(
                f"Campaign must be in 'created' state to start, current state: {campaign.state}"
            )

        # Redial campaigns have queued_runs pre-seeded from the parent campaign,
        # so skip source sync and transition straight to 'running'.
        is_redial = bool(
            (campaign.orchestrator_metadata or {}).get("parent_campaign_id")
        )
        if is_redial:
            now = datetime.now(UTC)
            await db_client.update_campaign(
                campaign_id=campaign_id,
                state="running",
                started_at=now,
                source_last_synced_at=now,
            )
            parent_id = (campaign.orchestrator_metadata or {}).get("parent_campaign_id")
            await _safe_append_campaign_log(
                campaign_id=campaign_id,
                level="info",
                event="campaign_started",
                message=f"Redial campaign started for parent campaign #{parent_id}. Queued {campaign.total_rows or 0} contact runs.",
                details={
                    "parent_campaign_id": parent_id,
                    "total_rows": campaign.total_rows or 0,
                    "is_redial": True,
                },
            )
            publisher = await get_campaign_event_publisher()
            await publisher.publish_sync_completed(
                campaign_id=campaign_id,
                total_rows=campaign.total_rows or 0,
                source_type=campaign.source_type,
                source_id=campaign.source_id,
            )
            logger.info(f"Redial campaign {campaign_id} started, source sync skipped")
            return

        # Update campaign state to syncing
        await db_client.update_campaign(
            campaign_id=campaign_id,
            state="syncing",
            started_at=datetime.now(UTC),
            source_sync_status="in_progress",
        )
        await _safe_append_campaign_log(
            campaign_id=campaign_id,
            level="info",
            event="campaign_started",
            message=f"Campaign started by operator. Initiating contact sync from source ({campaign.source_type}).",
            details={
                "source_type": campaign.source_type,
                "source_id": campaign.source_id,
            },
        )

        # Enqueue the sync task
        await enqueue_job(FunctionNames.SYNC_CAMPAIGN_SOURCE, campaign_id)

        logger.info(f"Campaign {campaign_id} started, syncing source data")

    async def pause_campaign(self, campaign_id: int) -> None:
        """Pauses active campaign processing"""
        campaign = await db_client.get_campaign_by_id(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        if campaign.state not in ["running", "syncing"]:
            raise ValueError(
                f"Campaign must be in 'running' or 'syncing' state to pause, current state: {campaign.state}"
            )

        # Update state to paused
        await db_client.update_campaign(campaign_id=campaign_id, state="paused")
        await _safe_append_campaign_log(
            campaign_id=campaign_id,
            level="info",
            event="campaign_paused_manual",
            message="Campaign paused by operator. Active in-flight calls will complete; new calls are suspended.",
            details={"previous_state": campaign.state},
        )

        logger.info(f"Campaign {campaign_id} paused")

    async def resume_campaign(self, campaign_id: int) -> None:
        """Resumes paused campaign"""
        campaign = await db_client.get_campaign_by_id(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        if campaign.state != "paused":
            raise ValueError(
                f"Campaign must be in 'paused' state to resume, current state: {campaign.state}"
            )

        # Clear paused reason and details from orchestrator metadata
        new_meta = dict(campaign.orchestrator_metadata or {})
        paused_reason = new_meta.pop("paused_reason", None)
        new_meta.pop("paused_max_concurrent", None)

        # Update state to running
        await db_client.update_campaign(
            campaign_id=campaign_id,
            state="running",
            orchestrator_metadata=new_meta,
        )
        await _safe_append_campaign_log(
            campaign_id=campaign_id,
            level="info",
            event="campaign_resumed_manual",
            message="Campaign resumed by operator. Resetting retry counters and resuming call dispatch.",
            details={"previous_paused_reason": paused_reason},
        )

        # Reset retry counters so resumed campaign starts with full retry attempts
        await db_client.reset_campaign_metadata_counter(
            campaign_id=campaign_id,
            key="concurrent_slot_timeout_attempts",
        )
        await db_client.reset_campaign_metadata_counter(
            campaign_id=campaign_id,
            key="quota_exhausted_attempts",
        )
        await db_client.reset_campaign_metadata_counter(
            campaign_id=campaign_id,
            key="phone_number_pool_exhausted_attempts",
        )

        # Reset circuit breaker so the resumed campaign starts with a clean slate
        await circuit_breaker.reset(campaign_id)

        # Publish event so orchestrator kicks off processing immediately
        publisher = await get_campaign_event_publisher()
        await publisher.publish_campaign_resumed(campaign_id)

        logger.info(f"Campaign {campaign_id} resumed")

    async def get_campaign_status(self, campaign_id: int) -> dict[str, Any]:
        """Returns detailed campaign status"""
        campaign = await db_client.get_campaign_by_id(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")

        stats_map = await db_client.get_queued_runs_stats_for_campaigns([campaign_id])
        stats = stats_map.get(campaign_id, {})
        failed_calls = max(campaign.failed_rows or 0, stats.get("failed_calls", 0))
        completed_calls = stats.get("completed_calls", 0)
        dispatched_rows = campaign.processed_rows or 0
        total_rows = campaign.total_rows or 0
        # processed_rows tracks unique contact leads dispatched.
        # resolved_rows must not add dispatched_rows + failed_calls (which double-counts failed leads).
        resolved_rows = min(total_rows, max(dispatched_rows, completed_calls + failed_calls))

        return {
            "campaign_id": campaign_id,
            "state": campaign.state,
            "total_rows": total_rows,
            "processed_rows": dispatched_rows,
            "failed_calls": failed_calls,
            "progress_percentage": (
                min(100.0, (resolved_rows / total_rows * 100))
                if total_rows > 0
                else 0.0
            ),
            "source_sync": {
                "status": campaign.source_sync_status,
                "last_synced_at": campaign.source_last_synced_at,
                "error": campaign.source_sync_error,
            },
            "rate_limit": campaign.rate_limit_per_second,
            "started_at": campaign.started_at,
            "completed_at": campaign.completed_at,
        }


# Global instance
campaign_runner_service = CampaignRunnerService()
