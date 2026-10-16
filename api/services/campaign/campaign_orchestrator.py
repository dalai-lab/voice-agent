"""Campaign Orchestrator Service.

This service ensures continuous campaign processing by listening to events
and scheduling batches immediately upon completion. It also monitors campaigns
for final completion after 1 hour of inactivity and handles retry events.
"""

from api.logging_config import setup_logging

setup_logging()


import asyncio
import random
import signal
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import redis.asyncio as aioredis
from api.constants import REDIS_URL
from api.db import db_client
from api.db.models import CampaignModel, QueuedRunModel
from api.enums import RedisChannel
from api.services.campaign.campaign_event_protocol import (
    BatchCompletedEvent,
    BatchFailedEvent,
    CampaignResumedEvent,
    CircuitBreakerTrippedEvent,
    RetryNeededEvent,
    SyncCompletedEvent,
    parse_campaign_event,
)
from api.services.campaign.campaign_event_publisher import CampaignEventPublisher
from api.services.campaign.circuit_breaker import circuit_breaker
from api.tasks.arq import enqueue_job
from api.tasks.function_names import FunctionNames
from loguru import logger


class CampaignOrchestrator:
    """Orchestrates campaign processing, retry handling, and completion detection."""

    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.publisher = CampaignEventPublisher(redis_client)
        self.completion_check_interval = 60  # 1 minute
        self.completion_timeout = 3600  # 1 hour
        self._processing_locks: dict[int, datetime] = {}  # prevent duplicate scheduling
        self._last_activity: dict[
            int, datetime
        ] = {}  # track last activity per campaign
        self._batch_in_progress: dict[
            int, datetime
        ] = {}  # track batches that have been scheduled but not completed
        self._running = False
        self._pubsub = None

    async def run(self):
        """Main service with two concurrent tasks."""
        self._running = True
        logger.info("Campaign Orchestrator starting...")

        try:
            # Task 1: Listen for events and react immediately
            event_task = asyncio.create_task(self._listen_for_events())

            # Task 2: Periodically check for stale campaigns
            completion_task = asyncio.create_task(self._monitor_completion())

            # Wait for both tasks
            await asyncio.gather(event_task, completion_task)

        except asyncio.CancelledError:
            logger.info("Campaign Orchestrator cancelled")
            raise
        except Exception as e:
            logger.error(f"Campaign Orchestrator error: {e}")
            raise
        finally:
            await self.shutdown()

    async def _listen_for_events(self):
        """Listen for campaign events and react immediately."""
        self._pubsub = self.redis.pubsub()
        await self._pubsub.subscribe(RedisChannel.CAMPAIGN_EVENTS.value)
        logger.info(f"Subscribed to {RedisChannel.CAMPAIGN_EVENTS.value} channel")

        async for message in self._pubsub.listen():
            if not self._running:
                break

            if message["type"] == "message":
                try:
                    event = parse_campaign_event(message["data"])
                    if event:
                        await self._handle_event(event)
                    else:
                        logger.error(
                            f"Failed to parse campaign event: {message['data']}"
                        )
                except Exception as e:
                    logger.error(f"Error handling campaign event: {e}")

    async def _handle_event(self, event):
        """Handle campaign events including retry events."""
        # All events should have campaign_id
        if not hasattr(event, "campaign_id") or not event.campaign_id:
            logger.warning(f"Event missing campaign_id: {type(event).__name__}")
            return

        campaign_id = event.campaign_id

        # Deduplicate events on pub/sub replay using event timestamp
        event_ts = getattr(event, "timestamp", None)
        if event_ts:
            event_key = f"campaign:event:seen:{event.type}:{campaign_id}:{event_ts}"
            try:
                is_new = await self.redis.set(event_key, "1", nx=True, ex=300)
                if not is_new:
                    logger.warning(
                        f"campaign_id: {campaign_id} - Duplicate event {event.type} ignored (pub/sub replay detected, ts={event_ts})"
                    )
                    return
            except Exception as e:
                logger.debug(f"Redis event deduplication check failed: {e}")

        logger.debug(
            f"campaign_id: {campaign_id} - Received event: {type(event).__name__}"
        )

        if isinstance(event, RetryNeededEvent):
            await self._handle_retry_event(event)

        elif isinstance(event, BatchCompletedEvent):
            # Clear the batch in progress flag
            if campaign_id in self._batch_in_progress:
                del self._batch_in_progress[campaign_id]
                logger.debug(
                    f"campaign_id: {campaign_id} - Batch completed, cleared in-progress flag"
                )
            try:
                await self.redis.delete(f"campaign:batch_in_progress:{campaign_id}")
            except Exception:
                pass

            # Clear processing lock held by the completed batch so the next batch can be scheduled
            if campaign_id in self._processing_locks:
                del self._processing_locks[campaign_id]
            try:
                await self.redis.delete(f"campaign:batch:scheduling_lock:{campaign_id}")
            except Exception:
                pass

            # Check campaign state before scheduling next batch
            campaign = await db_client.get_campaign_by_id(campaign_id)
            if not campaign:
                logger.error(f"campaign_id: {campaign_id} - Campaign not found")
                self._clear_campaign_state(campaign_id)
                return

            if campaign.state != "running":
                logger.info(
                    f"campaign_id: {campaign_id} - Campaign not in running state ({campaign.state}), "
                    f"clearing campaign state"
                )
                self._clear_campaign_state(campaign_id)
                return

            defer_seconds = 0
            if event.metadata:
                defer_seconds = int(event.metadata.get("defer_seconds", 0) or 0)

            # Schedule next batch
            await self._schedule_next_batch(campaign_id, defer_seconds=defer_seconds)
            self._last_activity[campaign_id] = datetime.now(UTC)

        elif isinstance(event, CampaignResumedEvent):
            logger.info(
                f"campaign_id: {campaign_id} - Campaign resumed event received, scheduling batch"
            )
            if campaign_id in self._processing_locks:
                del self._processing_locks[campaign_id]
            if campaign_id in self._batch_in_progress:
                del self._batch_in_progress[campaign_id]
            try:
                await self.redis.delete(
                    f"campaign:batch_in_progress:{campaign_id}",
                    f"campaign:batch:scheduling_lock:{campaign_id}",
                )
            except Exception:
                pass
            await self._schedule_next_batch(campaign_id)
            self._last_activity[campaign_id] = datetime.now(UTC)

        elif isinstance(event, BatchFailedEvent):
            # Clear the batch in progress flag
            if campaign_id in self._batch_in_progress:
                del self._batch_in_progress[campaign_id]
            try:
                await self.redis.delete(f"campaign:batch_in_progress:{campaign_id}")
            except Exception:
                pass

            logger.warning(
                f"campaign_id: {campaign_id} - Batch failed: {event.error}; "
                f"cleared batch in-progress flag."
            )

            self._last_activity[campaign_id] = datetime.now(UTC)

        elif isinstance(event, SyncCompletedEvent):
            # Start processing after sync
            logger.info(
                f"campaign_id: {campaign_id} - Sync completed, starting processing"
            )
            await self._schedule_next_batch(campaign_id)
            self._last_activity[campaign_id] = datetime.now(UTC)

        elif isinstance(event, CircuitBreakerTrippedEvent):
            # Circuit breaker tripped - clear state for this campaign
            logger.warning(
                f"campaign_id: {campaign_id} - Circuit breaker tripped event received: "
                f"failure_rate={event.failure_rate:.2%}"
            )
            campaign = await db_client.get_campaign_by_id(campaign_id)
            if campaign and campaign.state != "paused":
                new_meta = dict(campaign.orchestrator_metadata or {})
                new_meta["paused_reason"] = "circuit_breaker"
                await db_client.update_campaign(campaign_id=campaign_id, state="paused", orchestrator_metadata=new_meta)
            self._clear_campaign_state(campaign_id)

    async def _handle_retry_event(self, event: RetryNeededEvent):
        """Process retry event and schedule if eligible (from campaign_retry_manager)."""

        # Check retry eligibility
        campaign_id = event.campaign_id
        if not campaign_id:
            logger.debug("Skipping non-campaign retry event")
            return

        # Get campaign configuration
        campaign = await db_client.get_campaign_by_id(campaign_id)
        if not campaign:
            logger.error(f"campaign_id: {campaign_id} - Campaign not found")
            return

        # Get the original queued run
        queued_run = await db_client.get_queued_run_by_id(event.queued_run_id)
        if not queued_run:
            logger.error(
                f"campaign_id: {campaign_id} - Queued run {event.queued_run_id} not found"
            )
            return

        retry_config = campaign.retry_config or {}
        if not retry_config.get("enabled", True):
            logger.info(
                f"campaign_id: {campaign_id} - Retry disabled, marking run {queued_run.id} as failed"
            )
            await self._mark_final_failure(queued_run, event.reason)
            return

        # Check if this reason should be retried
        reason = event.reason
        if reason == "busy" and not retry_config.get("retry_on_busy", True):
            logger.info(
                f"campaign_id: {campaign_id} - Skipping retry for busy signal, marking run {queued_run.id} as failed"
            )
            await self._mark_final_failure(queued_run, reason)
            return
        if reason == "no_answer" and not retry_config.get("retry_on_no_answer", True):
            logger.info(
                f"campaign_id: {campaign_id} - Skipping retry for no-answer, marking run {queued_run.id} as failed"
            )
            await self._mark_final_failure(queued_run, reason)
            return
        if reason == "voicemail" and not retry_config.get("retry_on_voicemail", True):
            logger.info(
                f"campaign_id: {campaign_id} - Skipping retry for voicemail, marking run {queued_run.id} as failed"
            )
            await self._mark_final_failure(queued_run, reason)
            return

        max_retries = retry_config.get("max_retries", 1)

        if queued_run.retry_count >= max_retries:
            await self._mark_final_failure(queued_run, reason)
            logger.info(
                f"campaign_id: {campaign_id} - Max retries ({max_retries}) reached for queued run {queued_run.id}"
            )
            return

        # Create scheduled retry entry
        retry_delay = retry_config.get("retry_delay_seconds", 120)
        await self._schedule_retry(queued_run, reason, retry_delay)

        # Update last activity
        self._last_activity[campaign_id] = datetime.now(UTC)

    async def _schedule_retry(
        self, original_run: QueuedRunModel, reason: str, delay_seconds: int
    ):
        """Create a new queued run for retry."""

        campaign_id = original_run.campaign_id

        # Create retry context
        retry_context = {
            **original_run.context_variables,
            "is_retry": True,
            "retry_attempt": original_run.retry_count + 1,
            "retry_reason": reason,
        }

        logger.debug(
            f"campaign_id: {campaign_id} - Scheduling retry for {reason} in {delay_seconds}s, "
            f"retry attempt {original_run.retry_count + 1}"
        )

        # Check if a retry run has already been scheduled for this attempt
        retry_source_uuid = f"{original_run.source_uuid}_retry_{original_run.retry_count + 1}"
        existing_retry = await db_client.get_queued_run_by_source_uuid(
            campaign_id, retry_source_uuid
        )
        if existing_retry:
            logger.debug(
                f"campaign_id: {campaign_id} - Retry run already exists (id={existing_retry.id}), "
                f"skipping duplicate schedule"
            )
            return

        # Add random jitter (±20%) to prevent thundering herd bursts on the carrier pool
        jitter = random.uniform(0.8, 1.2)
        effective_delay = max(1, int(delay_seconds * jitter))

        # Create retry entry with unique source_uuid
        retry_run = await db_client.create_queued_run(
            campaign_id=campaign_id,
            source_uuid=retry_source_uuid,
            context_variables=retry_context,
            state="queued",
            retry_count=original_run.retry_count + 1,
            parent_queued_run_id=original_run.id,
            scheduled_for=datetime.now(UTC) + timedelta(seconds=effective_delay),
            retry_reason=reason,
        )

        logger.info(
            f"campaign_id: {campaign_id} - Scheduled retry {retry_run.id} for {reason} in {effective_delay}s (base {delay_seconds}s), "
            f"retry attempt {retry_run.retry_count}"
        )

        phone = (
            (original_run.context_variables or {}).get("phone_number")
            or (original_run.context_variables or {}).get("phone")
            or "contact"
        )
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="info",
            event="lead_retry_scheduled",
            message=f"Scheduled retry #{original_run.retry_count + 1} for {phone} in {effective_delay}s (reason: {reason}).",
            details={
                "lead_phone": phone,
                "retry_attempt": original_run.retry_count + 1,
                "delay_seconds": effective_delay,
                "base_delay_seconds": delay_seconds,
                "reason": reason,
                "queued_run_id": retry_run.id,
            },
        )

    async def _mark_final_failure(self, queued_run: QueuedRunModel, reason: str):
        """Mark a queued run as finally failed after max retries."""
        campaign_id = queued_run.campaign_id

        # Idempotency: if already marked failed, do not double-increment counters
        if queued_run.state == "failed":
            logger.debug(
                f"campaign_id: {campaign_id} - Queued run {queued_run.id} already marked as failed, "
                f"skipping duplicate final failure."
            )
            return

        # Update the campaign's failed_rows counter atomically
        try:
            await db_client.increment_campaign_failed_rows(campaign_id)
        except Exception as inc_err:
            logger.warning(
                f"campaign_id: {campaign_id} - Failed to atomically increment failed rows: {inc_err}"
            )

        # Mark the queued run as failed
        try:
            await db_client.update_queued_run(
                queued_run_id=queued_run.id,
                state="failed",
            )
        except Exception as q_err:
            logger.warning(
                f"campaign_id: {campaign_id} - Failed to update queued run {queued_run.id} to failed: {q_err}"
            )

        logger.info(
            f"campaign_id: {campaign_id} - Queued run {queued_run.id} finally failed after max retries, "
            f"last reason: {reason}"
        )

        phone = (
            (queued_run.context_variables or {}).get("phone_number")
            or (queued_run.context_variables or {}).get("phone")
            or "contact"
        )
        await db_client.append_campaign_log(
            campaign_id=campaign_id,
            level="warning",
            event="lead_retries_exhausted",
            message=f"All retry attempts exhausted for {phone}. Marked as permanently failed (last reason: {reason}).",
            details={
                "lead_phone": phone,
                "attempts": queued_run.retry_count + 1,
                "last_reason": reason,
                "queued_run_id": queued_run.id,
            },
        )

    def _is_within_schedule(self, campaign: CampaignModel) -> bool:
        """Check if the current time falls within the campaign's schedule windows.

        Returns True (allow scheduling) if:
        - No schedule_config in metadata
        - Schedule is disabled
        - No slots configured
        - Invalid timezone (fail open)
        - Current time matches a slot
        """
        if not campaign.orchestrator_metadata:
            return True

        schedule_config = campaign.orchestrator_metadata.get("schedule_config")
        if not schedule_config:
            return True

        if not schedule_config.get("enabled", False):
            return True

        slots = schedule_config.get("slots")
        if not slots:
            return True

        timezone_str = schedule_config.get("timezone", "UTC")
        try:
            tz = ZoneInfo(timezone_str)
        except (KeyError, Exception):
            logger.warning(
                f"campaign_id: {campaign.id} - Invalid timezone '{timezone_str}' in schedule_config, "
                f"failing open (allowing scheduling)"
            )
            return True

        now = datetime.now(tz)
        current_day = now.weekday()  # 0=Monday through 6=Sunday
        current_time = now.strftime("%H:%M")

        for slot in slots:
            if slot.get("day_of_week") == current_day:
                start = slot.get("start_time", "")
                end = slot.get("end_time", "")
                if not start or not end:
                    continue
                if start <= end:
                    if start <= current_time < end:
                        return True
                else:
                    # Overnight slot spanning midnight (e.g. 22:00 to 02:00)
                    if current_time >= start or current_time < end:
                        return True

        return False

    async def _check_and_log_schedule_transition(
        self, campaign: CampaignModel
    ) -> bool:
        """Evaluate if campaign is within schedule window and atomically log transitions."""
        is_in_schedule = self._is_within_schedule(campaign)

        schedule_config = (campaign.orchestrator_metadata or {}).get("schedule_config")
        # If schedule is not configured or disabled, campaign runs unrestricted (24/7)
        if (
            not schedule_config
            or not schedule_config.get("enabled", False)
            or not schedule_config.get("slots")
        ):
            return True

        target_state = "in" if is_in_schedule else "out"
        redis_key = f"campaign:schedule_state:{campaign.id}"

        try:
            # Atomic swap: set new state and get previous state
            old_state = await self.redis.set(redis_key, target_state, get=True)
            if isinstance(old_state, bytes):
                old_state = old_state.decode("utf-8")

            timezone_str = schedule_config.get("timezone", "UTC")

            if not is_in_schedule:
                # Transition into outside window:
                # Log if old_state was None (first check outside) or was previously "in"
                if old_state != "out":
                    logger.info(
                        f"campaign_id: {campaign.id} - Transitioned outside schedule window ({timezone_str})"
                    )
                    await db_client.append_campaign_log(
                        campaign_id=campaign.id,
                        level="info",
                        event="schedule_window_closed",
                        message=(
                            f"Allowed calling hours ended for today (outside scheduled window). "
                            f"Outbound call dispatching paused until next scheduled window. "
                            f"Campaign remains in running state."
                        ),
                        details={
                            "timezone": timezone_str,
                            "slots": schedule_config.get("slots", []),
                            "state": campaign.state,
                        },
                    )
            else:
                # Transition back into schedule window:
                # Only log if previously was outside ("out")
                if old_state == "out":
                    logger.info(
                        f"campaign_id: {campaign.id} - Transitioned into schedule window ({timezone_str})"
                    )
                    await db_client.append_campaign_log(
                        campaign_id=campaign.id,
                        level="info",
                        event="schedule_window_opened",
                        message=(
                            f"Allowed calling window opened ({timezone_str}). "
                            f"Resuming outbound call batch dispatches."
                        ),
                        details={
                            "timezone": timezone_str,
                            "state": campaign.state,
                        },
                    )
        except Exception as e:
            logger.debug(
                f"campaign_id: {campaign.id} - Redis schedule transition check error: {e}"
            )

        return is_in_schedule

    async def _schedule_next_batch(self, campaign_id: int, defer_seconds: int = 0):
        """Schedule next batch immediately (or deferred) if work available."""

        # Check if a batch is already in progress (guard against duplicate batch dispatch)
        if campaign_id in self._batch_in_progress:
            batch_start_time = self._batch_in_progress[campaign_id]
            if (datetime.now(UTC) - batch_start_time).total_seconds() < 300:
                logger.debug(
                    f"campaign_id: {campaign_id} - Batch already in progress since {batch_start_time}, "
                    f"skipping duplicate schedule"
                )
                return

        # Prevent duplicate scheduling with in-memory lock
        if campaign_id in self._processing_locks:
            lock_time = self._processing_locks[campaign_id]
            if (datetime.now(UTC) - lock_time).total_seconds() < 5:
                logger.debug(
                    f"campaign_id: {campaign_id} - Batch already scheduled recently"
                )
                return

        # Distributed scheduling lock across processes with Redis
        try:
            lock_acquired = await self.redis.set(
                f"campaign:batch:scheduling_lock:{campaign_id}", "1", nx=True, ex=5
            )
            if not lock_acquired:
                logger.debug(
                    f"campaign_id: {campaign_id} - Batch already scheduled recently (Redis lock active)"
                )
                return
        except Exception as redis_err:
            logger.debug(f"Redis scheduling lock check error: {redis_err}")

        # Set lock
        self._processing_locks[campaign_id] = datetime.now(UTC)

        try:
            # Check campaign status
            campaign = await db_client.get_campaign_by_id(campaign_id)
            if not campaign:
                logger.error(f"campaign_id: {campaign_id} - Campaign not found")
                return
                
            if campaign.state == "paused":
                logger.info(f"campaign_id: {campaign_id} - Campaign is paused.")
                return
            elif campaign.state not in ["running", "syncing"]:
                logger.info(f"campaign_id: {campaign_id} - Campaign is not running ({campaign.state}).")
                return

            # Check schedule window before scheduling
            if not await self._check_and_log_schedule_transition(campaign):
                logger.info(
                    f"campaign_id: {campaign_id} - Outside scheduled time window"
                )
                return

            # Safety net: check circuit breaker before scheduling
            cb_config = None
            if campaign.orchestrator_metadata:
                cb_config = campaign.orchestrator_metadata.get("circuit_breaker")

            is_open, stats = await circuit_breaker.is_circuit_open(
                campaign_id=campaign_id,
                config=cb_config,
            )

            if is_open and stats:
                logger.warning(
                    f"campaign_id: {campaign_id} - Circuit breaker is open, "
                    f"pausing campaign. Stats: {stats}"
                )
                new_meta = dict(campaign.orchestrator_metadata or {})
                new_meta["paused_reason"] = "circuit_breaker"
                await db_client.update_campaign(campaign_id=campaign_id, state="paused", orchestrator_metadata=new_meta)
                await db_client.append_campaign_log(
                    campaign_id=campaign_id,
                    level="warning",
                    event="circuit_breaker_tripped",
                    message=(
                        f"Paused at scheduling: failure rate "
                        f"{stats['failure_rate']:.2%} "
                        f"({stats['failure_count']}/"
                        f"{stats['failure_count'] + stats['success_count']}) "
                        f"exceeded threshold {stats['threshold']:.2%} "
                        f"in {stats['window_seconds']}s window"
                    ),
                    details=stats,
                )
                await self.publisher.publish_circuit_breaker_tripped(
                    campaign_id=campaign_id,
                    failure_rate=stats["failure_rate"],
                    failure_count=stats["failure_count"],
                    success_count=stats["success_count"],
                    threshold=stats["threshold"],
                    window_seconds=stats["window_seconds"],
                )
                self._clear_campaign_state(campaign_id)
                return

            # Check for available work that is due right now
            has_work = await self._has_due_work(campaign_id)

            if has_work:
                # Schedule batch immediately or deferred
                enqueue_kwargs = {}
                if defer_seconds > 0:
                    enqueue_kwargs["_defer_by"] = timedelta(seconds=defer_seconds)

                await enqueue_job(
                    FunctionNames.PROCESS_CAMPAIGN_BATCH,
                    campaign_id,
                    10,  # batch_size
                    **enqueue_kwargs,
                )
                logger.info(
                    f"campaign_id: {campaign_id} - Scheduled next batch "
                    f"(defer_seconds={defer_seconds})"
                )

                # Set batch in progress flag (both in-memory and in Redis with 5-minute safety TTL)
                now = datetime.now(UTC)
                self._batch_in_progress[campaign_id] = now
                try:
                    await self.redis.set(f"campaign:batch_in_progress:{campaign_id}", "1", ex=300)
                except Exception as redis_err:
                    logger.debug(f"Redis batch_in_progress set error: {redis_err}")

                # Update database
                await db_client.update_campaign(
                    campaign_id=campaign_id,
                    last_batch_scheduled_at=datetime.now(UTC),
                    last_activity_at=datetime.now(UTC),
                )
            else:
                logger.info(
                    f"campaign_id: {campaign_id} - No pending work to process, "
                    f"campaign may complete or wait for retries"
                )

        except Exception as e:
            logger.error(f"campaign_id: {campaign_id} - Error scheduling batch: {e}")
        finally:
            # Release lock after a short delay
            asyncio.create_task(self._release_lock_after_delay(campaign_id, 5))

    async def _release_lock_after_delay(self, campaign_id: int, delay: int):
        """Release processing lock after delay."""
        await asyncio.sleep(delay)
        if campaign_id in self._processing_locks:
            del self._processing_locks[campaign_id]
            logger.debug(f"campaign_id: {campaign_id} - Released processing lock")
        try:
            await self.redis.delete(f"campaign:batch:scheduling_lock:{campaign_id}")
        except Exception:
            pass

    def _clear_campaign_state(self, campaign_id: int):
        """Clear all in-memory state for a campaign."""
        if campaign_id in self._last_activity:
            del self._last_activity[campaign_id]
        if campaign_id in self._processing_locks:
            del self._processing_locks[campaign_id]
        if campaign_id in self._batch_in_progress:
            del self._batch_in_progress[campaign_id]
        try:
            asyncio.create_task(
                self.redis.delete(
                    f"campaign:batch_in_progress:{campaign_id}",
                    f"campaign:batch:scheduling_lock:{campaign_id}",
                )
            )
        except Exception:
            pass
        logger.debug(f"campaign_id: {campaign_id} - Cleared all in-memory state")

    async def _monitor_completion(self):
        """Periodically check for campaigns that should be marked complete."""
        while self._running:
            try:
                await self._check_stale_campaigns()
            except Exception as e:
                logger.error(f"Completion monitoring failed: {e}")

            await asyncio.sleep(self.completion_check_interval)

    async def _check_stale_campaigns(self):
        """Check all running campaigns for completion or orphaned work."""
        logger.debug("Checking for stale campaigns...")

        # Periodic cleanup: recover any queued runs stuck in 'processing' state (>5 min without workflow)
        try:
            recovered = await db_client.cleanup_stuck_processing_queued_runs(threshold_seconds=300)
            if recovered > 0:
                logger.info(f"Stale campaign sweep recovered {recovered} stuck processing queued runs")
        except Exception as cleanup_err:
            logger.error(f"Error during cleanup of stuck processing queued runs: {cleanup_err}")

        campaigns = await db_client.get_campaigns_by_status(statuses=["running"])

        for campaign in campaigns:
            try:
                campaign_id = campaign.id

                # Check if batch is stuck (initiated > 5 minutes ago but no completion)
                if campaign_id in self._batch_in_progress:
                    batch_start_time = self._batch_in_progress[campaign_id]
                    time_since_batch_start = (
                        datetime.now(UTC) - batch_start_time
                    ).total_seconds()

                    if time_since_batch_start > 300:  # 5 minutes
                        logger.warning(
                            f"campaign_id: {campaign_id} - Batch stuck for {time_since_batch_start:.0f}s, "
                            f"clearing flag, recovering stuck claims, and checking for more work"
                        )
                        del self._batch_in_progress[campaign_id]
                        try:
                            await self.redis.delete(f"campaign:batch_in_progress:{campaign_id}")
                        except Exception:
                            pass

                        # Explicitly recover any claimed runs stuck in processing for this campaign
                        recovered_count = (
                            await db_client.cleanup_stuck_processing_queued_runs(
                                threshold_seconds=300, campaign_id=campaign_id
                            )
                        )
                        await db_client.append_campaign_log(
                            campaign_id=campaign_id,
                            level="warning",
                            event="stuck_batch_recovered",
                            message=(
                                f"Orchestrator recovered stalled batch ({time_since_batch_start:.0f}s inactivity). "
                                f"Reclaimed {recovered_count or 0} stuck runs and resumed processing."
                            ),
                            details={
                                "stall_duration_seconds": time_since_batch_start,
                                "recovered_runs_count": recovered_count or 0,
                            },
                        )

                        # Check if there's work to be done
                        if await self._has_due_work(campaign_id):
                            logger.info(
                                f"campaign_id: {campaign_id} - Found pending work after stuck batch, "
                                f"scheduling new batch"
                            )
                            await self._schedule_next_batch(campaign_id)
                            continue

                # Check for orphaned work (e.g., newly created retries with no batch in progress)
                if campaign_id not in self._batch_in_progress:
                    has_work = await self._has_due_work(campaign_id)
                    if has_work:
                        in_sched = await self._check_and_log_schedule_transition(
                            campaign
                        )
                        if not in_sched or campaign.state != "running":
                            logger.info(
                                f"campaign_id: {campaign_id} - Found orphaned work but outside "
                                f"schedule window (or not running), skipping"
                            )
                            continue

                        logger.info(
                            f"campaign_id: {campaign_id} - Found orphaned work (likely new retries), "
                            f"scheduling batch to process"
                        )
                        await self._schedule_next_batch(campaign_id)
                        continue

                # Check if campaign should be marked complete
                if await self._should_mark_complete(campaign):
                    await self._complete_campaign(campaign)
            except Exception as e:
                logger.error(
                    f"campaign_id: {campaign.id} - Completion check failed: {e}"
                )

    async def _should_mark_complete(self, campaign: CampaignModel) -> bool:
        """Check if campaign has no activity for 1 hour."""
        campaign_id = campaign.id

        # Don't mark complete if batch is in progress
        if campaign_id in self._batch_in_progress:
            logger.debug(
                f"campaign_id: {campaign_id} - Batch in progress, not marking complete"
            )
            return False

        # Check for any remaining work (due now or scheduled for future)
        has_work = await self._has_any_remaining_work(campaign_id)
        if has_work:
            # If outside schedule window, don't mark complete — work remains for next window
            if not self._is_within_schedule(campaign):
                logger.debug(
                    f"campaign_id: {campaign_id} - Outside schedule window with pending work, "
                    f"not marking complete"
                )
            return False

        # Check if there are active runs still in progress
        active_runs = await db_client.get_active_runs_count_for_campaign(campaign_id)
        if active_runs > 0:
            logger.debug(
                f"campaign_id: {campaign_id} - {active_runs} active runs still in progress, "
                f"not marking complete"
            )
            return False

        # If all work is finished and no calls are active, complete after short grace period (30s)
        grace_period = 30
        last_activity = self._last_activity.get(campaign_id) or campaign.last_activity_at
        if last_activity:
            time_since = (datetime.now(UTC) - last_activity).total_seconds()
            if time_since < grace_period:
                logger.debug(
                    f"campaign_id: {campaign_id} - Within grace period ({time_since:.1f}s < {grace_period}s), "
                    f"waiting before completion"
                )
                return False

        logger.info(
            f"campaign_id: {campaign_id} - All work finished and no active runs for >{grace_period}s, "
            f"marking complete"
        )
        return True

    async def _has_due_work(self, campaign_id: int) -> bool:
        """Check if there is any work that can be processed right now."""
        # Check for regular queued runs (exclude scheduled runs)
        queued_count = await db_client.get_queued_runs_count(
            campaign_id=campaign_id, states=["queued"], non_scheduled_only=True
        )

        if queued_count > 0:
            logger.debug(f"campaign_id: {campaign_id} - Has {queued_count} queued runs")
            return True

        # Check scheduled retries that are due right now
        scheduled_count = await db_client.get_scheduled_runs_count(
            campaign_id=campaign_id, scheduled_before=datetime.now(UTC)
        )

        if scheduled_count > 0:
            logger.debug(
                f"campaign_id: {campaign_id} - Has {scheduled_count} scheduled retries due"
            )
            return True

        return False

    async def _has_any_remaining_work(self, campaign_id: int) -> bool:
        """Check if campaign has any work remaining, including future scheduled retries."""
        if await self._has_due_work(campaign_id):
            return True

        # Check for ANY future scheduled retries
        pending_retries_count = await db_client.get_scheduled_runs_count(
            campaign_id=campaign_id
        )
        if pending_retries_count > 0:
            logger.debug(
                f"campaign_id: {campaign_id} - Has {pending_retries_count} future retries"
            )
            return True

        return False

    async def _complete_campaign(self, campaign: CampaignModel):
        """Mark campaign as complete."""
        campaign_id = campaign.id

        try:
            # Double-check no remaining work
            if await self._has_any_remaining_work(campaign_id):
                logger.info(
                    f"campaign_id: {campaign_id} - Found pending work, not completing"
                )
                return

            # Update campaign status
            await db_client.update_campaign(
                campaign_id=campaign_id,
                state="completed",
                completed_at=datetime.now(UTC),
            )

            logger.info(f"campaign_id: {campaign_id} - Campaign marked as completed")

            # Calculate duration if started_at is available
            duration = None
            if campaign.started_at:
                duration = (datetime.now(UTC) - campaign.started_at).total_seconds()

            # Clean up schedule state Redis key
            try:
                await self.redis.delete(f"campaign:schedule_state:{campaign_id}")
            except Exception:
                pass

            duration_str = ""
            if duration is not None:
                mins = int(duration // 60)
                secs = int(duration % 60)
                duration_str = f" in {mins}m {secs}s" if mins > 0 else f" in {secs}s"

            total = campaign.total_rows or 0
            processed = campaign.processed_rows
            failed = campaign.failed_rows

            # Try to fetch fresh campaign counts from DB if available
            try:
                latest_campaign = await db_client.get_campaign_by_id(campaign_id)
                if latest_campaign:
                    total = latest_campaign.total_rows or total
                    processed = latest_campaign.processed_rows
                    failed = latest_campaign.failed_rows
            except Exception as fetch_err:
                logger.debug(
                    f"campaign_id: {campaign_id} - Using in-memory campaign counters for completion log: {fetch_err}"
                )

            await db_client.append_campaign_log(
                campaign_id=campaign_id,
                level="info",
                event="campaign_completed",
                message=(
                    f"Campaign completed successfully. Processed {processed}/{total} contacts"
                    f" ({failed} failed){duration_str}."
                ),
                details={
                    "total_rows": total,
                    "processed_rows": processed,
                    "failed_rows": failed,
                    "duration_seconds": duration,
                },
            )

            # Publish completion event
            await self.publisher.publish_campaign_completed(
                campaign_id=campaign_id,
                total_rows=total,
                processed_rows=processed,
                failed_rows=failed,
                duration_seconds=duration,
            )

            # Clean up in-memory state
            self._clear_campaign_state(campaign_id)

        except Exception as e:
            logger.error(
                f"campaign_id: {campaign_id} - Failed to complete campaign: {e}"
            )

    async def shutdown(self):
        """Clean shutdown of the orchestrator."""
        logger.info("Campaign Orchestrator shutting down...")
        self._running = False

        if self._pubsub:
            try:
                await self._pubsub.unsubscribe(RedisChannel.CAMPAIGN_EVENTS.value)
                await self._pubsub.aclose()
            except Exception as e:
                logger.error(f"Error closing pubsub: {e}")

        logger.info("Campaign Orchestrator shutdown complete")


async def main():
    """Main entry point for Campaign Orchestrator service."""

    # Setup Redis connection
    redis = await aioredis.from_url(REDIS_URL, decode_responses=True)

    # Create and run orchestrator
    orchestrator = CampaignOrchestrator(redis)

    # Create a shutdown event for clean coordination
    shutdown_event = asyncio.Event()

    # Setup signal handlers
    loop = asyncio.get_event_loop()

    def signal_handler(signum):
        logger.info(f"Received shutdown signal {signum}")
        shutdown_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda s=sig: signal_handler(s))

    # Run orchestrator with shutdown monitoring
    orchestrator_task = asyncio.create_task(orchestrator.run())
    shutdown_task = asyncio.create_task(shutdown_event.wait())

    try:
        # Wait for either orchestrator to complete or shutdown signal
        done, _ = await asyncio.wait(
            [orchestrator_task, shutdown_task], return_when=asyncio.FIRST_COMPLETED
        )

        # If shutdown was triggered, stop the orchestrator
        if shutdown_task in done:
            logger.info("Shutdown signal received, stopping orchestrator...")
            orchestrator._running = False
            # Cancel the orchestrator task immediately since it may be blocked
            orchestrator_task.cancel()
            try:
                await orchestrator_task
            except asyncio.CancelledError:
                logger.info("Orchestrator task cancelled successfully")

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    finally:
        # Ensure clean shutdown
        await orchestrator.shutdown()
        await redis.aclose()

        logger.info("Campaign Orchestrator service stopped")


if __name__ == "__main__":
    asyncio.run(main())
