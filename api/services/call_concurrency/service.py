import asyncio
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass

from api.constants import DEFAULT_ORG_CONCURRENCY_LIMIT
from api.db import db_client
from api.enums import OrganizationConfigurationKey, PostHogEvent
from api.services.call_concurrency.rate_limiter import rate_limiter
from api.services.posthog_client import capture_event
from loguru import logger


@dataclass(frozen=True)
class CallConcurrencySlot:
    organization_id: int
    slot_id: str
    max_concurrent: int
    source: str
    scope_key: str | None = None


class CallConcurrencyLimitError(Exception):
    """Raised when an org has no available concurrent call slots."""

    def __init__(
        self,
        *,
        organization_id: int,
        source: str,
        wait_time: float,
        max_concurrent: int,
    ):
        self.organization_id = organization_id
        self.source = source
        self.wait_time = wait_time
        self.max_concurrent = max_concurrent
        super().__init__(
            f"Concurrent call limit reached for org {organization_id} "
            f"(source={source}, limit={max_concurrent}, waited={wait_time:.1f}s)"
        )


class WorkflowRunSlotAlreadyBoundError(Exception):
    """Raised when a workflow run already owns a concurrent call slot."""

    def __init__(self, workflow_run_id: int):
        self.workflow_run_id = workflow_run_id
        super().__init__(
            f"Workflow run {workflow_run_id} already has an active call slot"
        )


class CallConcurrencyService:
    def __init__(self):
        self.default_concurrent_limit = int(DEFAULT_ORG_CONCURRENCY_LIMIT)
        self._limit_memory_cache: dict[int, int] = {}
        self._group_memory_cache: dict[int, int] = {}
        self._group_memory_cache_expiry: dict[int, float] = {}
        self.group_cache_ttl: float = 300.0  # 5 minutes TTL

    async def get_org_concurrent_limit(self, organization_id: int) -> int:
        """Get the concurrent call limit for an organization.

        Reads from database and caches in Redis/memory. On database errors or timeouts,
        falls back to the cached limit (preventing failing open to 10 slots for blocked orgs).
        If no cached limit exists and DB fails, fails closed (returns 0).
        """
        redis_client = None
        try:
            if hasattr(rate_limiter, "_get_redis"):
                redis_res = rate_limiter._get_redis()
                if asyncio.iscoroutine(redis_res):
                    redis_client = await redis_res
                else:
                    redis_client = redis_res
        except Exception:
            redis_client = None

        try:
            config = await db_client.get_configuration(
                organization_id,
                OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value,
            )
            if config and config.value:
                value = config.value.get("value")
                if value is not None:
                    limit_int = int(value)
                    self._limit_memory_cache[organization_id] = limit_int
                    if redis_client and hasattr(redis_client, "set"):
                        try:
                            set_res = redis_client.set(
                                f"org_concurrent_limit:{organization_id}",
                                str(limit_int),
                                ex=86400,
                            )
                            if asyncio.iscoroutine(set_res):
                                await set_res
                        except Exception:
                            pass
                    return limit_int
            # Healthy DB query, but no custom limit configured for this org
            return self.default_concurrent_limit
        except Exception as e:
            logger.error(
                f"Error getting concurrent limit for org {organization_id} from DB: {e}. "
                "Falling back to cached limit."
            )
            # 1. Fallback to Redis cache
            if redis_client and hasattr(redis_client, "get"):
                try:
                    cached_val = redis_client.get(f"org_concurrent_limit:{organization_id}")
                    if asyncio.iscoroutine(cached_val):
                        cached_val = await cached_val
                    if isinstance(cached_val, (str, int, bytes)):
                        return int(cached_val)
                except Exception:
                    pass

            # 2. Fallback to in-memory cache
            if organization_id in self._limit_memory_cache:
                return self._limit_memory_cache[organization_id]

            # 3. Check if org was explicitly marked blocked in Redis
            if redis_client and hasattr(redis_client, "get"):
                try:
                    is_blocked = redis_client.get(f"org_blocked:{organization_id}")
                    if asyncio.iscoroutine(is_blocked):
                        is_blocked = await is_blocked
                    if is_blocked:
                        logger.warning(f"Org {organization_id} is marked blocked in Redis; returning limit 0")
                        return 0
                except Exception:
                    pass

            # 4. Fallback to default limit during transient DB error instead of total call outage
            logger.warning(
                f"DB error and missing cache for org {organization_id}; falling back to default "
                f"limit ({self.default_concurrent_limit}) to prevent total call outage."
            )
            return self.default_concurrent_limit

    async def get_concurrency_group_id(self, organization_id: int) -> int:
        """Get the concurrency group ID for an organization (shares Redis counter across sub-orgs)."""
        now = time.monotonic()
        if organization_id in self._group_memory_cache:
            expiry = self._group_memory_cache_expiry.get(organization_id)
            if expiry is None or now < expiry:
                return self._group_memory_cache[organization_id]
            else:
                self._group_memory_cache.pop(organization_id, None)
                self._group_memory_cache_expiry.pop(organization_id, None)

        redis_client = None
        try:
            if hasattr(rate_limiter, "_get_redis"):
                redis_res = rate_limiter._get_redis()
                if asyncio.iscoroutine(redis_res):
                    redis_client = await redis_res
                else:
                    redis_client = redis_res
        except Exception:
            redis_client = None

        if redis_client and hasattr(redis_client, "get"):
            try:
                cached_val = redis_client.get(f"org_concurrency_group:{organization_id}")
                if asyncio.iscoroutine(cached_val):
                    cached_val = await cached_val
                if isinstance(cached_val, (str, int, bytes)):
                    group_int = int(cached_val)
                    self._group_memory_cache[organization_id] = group_int
                    self._group_memory_cache_expiry[organization_id] = time.monotonic() + self.group_cache_ttl
                    return group_int
            except Exception:
                pass

        try:
            config = await db_client.get_configuration(
                organization_id,
                OrganizationConfigurationKey.CONCURRENCY_GROUP_ID.value,
            )
            if config and config.value:
                val = config.value.get("value")
                if val is not None:
                    group_int = int(val)
                    self._group_memory_cache[organization_id] = group_int
                    self._group_memory_cache_expiry[organization_id] = time.monotonic() + self.group_cache_ttl
                    if redis_client and hasattr(redis_client, "set"):
                        try:
                            set_res = redis_client.set(
                                f"org_concurrency_group:{organization_id}",
                                str(group_int),
                                ex=86400,
                            )
                            if asyncio.iscoroutine(set_res):
                                await set_res
                        except Exception:
                            pass
                    return group_int
            return organization_id
        except Exception as e:
            logger.debug(
                f"No concurrency group ID found for org {organization_id}, attempting fallback: {e}"
            )
            if organization_id in self._group_memory_cache:
                return self._group_memory_cache[organization_id]

            return organization_id

    async def invalidate_concurrency_group(self, organization_id: int):
        """Invalidate in-memory and Redis cached concurrency group ID (Issue 11 / Blocker 25)."""
        self._group_memory_cache.pop(organization_id, None)
        self._group_memory_cache_expiry.pop(organization_id, None)
        try:
            redis_client = None
            if hasattr(rate_limiter, "_get_redis"):
                redis_res = rate_limiter._get_redis()
                if asyncio.iscoroutine(redis_res):
                    redis_client = await redis_res
                else:
                    redis_client = redis_res
            if redis_client and hasattr(redis_client, "delete"):
                del_res = redis_client.delete(f"org_concurrency_group:{organization_id}")
                if asyncio.iscoroutine(del_res):
                    await del_res
        except Exception as e:
            logger.debug(f"Failed to invalidate redis org_concurrency_group for {organization_id}: {e}")

    async def is_org_custom_concurrency_cap(self, organization_id: int) -> bool | None:
        """Check whether an organization has an explicitly configured custom concurrency cap.
        Returns:
            - True: Explicit custom limit/cap configured
            - False: Explicitly un-customized / default inherited limit
            - None: Configuration missing or not annotated
        """
        try:
            config = await db_client.get_configuration(
                organization_id,
                OrganizationConfigurationKey.CONCURRENT_CALL_LIMIT.value,
            )
            if config and isinstance(config.value, dict):
                return config.value.get("is_custom_cap")
            return None
        except Exception:
            return None

    async def get_effective_org_concurrent_limit(self, organization_id: int) -> int:
        """Get the effective concurrent call limit for an organization,
        evaluating both its individual limit and its group (master) limit.
        """
        group_id = await self.get_concurrency_group_id(organization_id)
        org_limit = await self.get_org_concurrent_limit(organization_id)
        if group_id != organization_id:
            group_limit = await self.get_org_concurrent_limit(group_id)
            if org_limit == 0 or group_limit == 0:
                return 0

            # Prevent sub-org concurrency freeze on master upgrades:
            # If the sub-org has no explicit custom cap and the group limit is higher,
            # allow the sub-org to share the upgraded group limit.
            is_custom = await self.is_org_custom_concurrency_cap(organization_id)
            if is_custom is False and group_limit > org_limit:
                return group_limit

            return min(org_limit, group_limit)
        return org_limit

    async def get_fleet_active_calls(self) -> int:
        """Total active calls across every org — the fleet-wide autoscaling
        signal scraped by /health/autoscale-metric. Thin passthrough so routes
        stay behind this facade; the Redis projection lives with the key schema
        in rate_limiter. Redis errors propagate (they must not read as an idle
        fleet — see get_fleet_concurrent_count)."""
        return await rate_limiter.get_fleet_concurrent_count()

    async def acquire_org_slot(
        self,
        organization_id: int,
        *,
        source: str,
        timeout: float = 0,
        scope_key: str | None = None,
        scope_max_concurrent: int | None = None,
        retry_interval: float = 1,
    ) -> CallConcurrencySlot:
        """Acquire a slot in the org-wide (or fleet group-wide) concurrency counter.

        ``scope_key``/``scope_max_concurrent`` additionally bound a secondary
        counter (e.g. ``campaign:<id>``) so a source can cap its own
        concurrency without measuring — or being starved by — unrelated calls
        in the same org.
        """
        group_id = await self.get_concurrency_group_id(organization_id)
        max_concurrent = await self.get_effective_org_concurrent_limit(organization_id)
        if scope_max_concurrent is not None:
            scope_max_concurrent = int(scope_max_concurrent)

        if max_concurrent <= 0:
            current_count = await rate_limiter.get_concurrent_count(group_id)
            scope_note = (
                f", scope={scope_key} (limit={scope_max_concurrent})"
                if scope_key
                else ""
            )
            logger.warning(
                f"Concurrent call limit reached for org {organization_id} (group {group_id}): "
                f"source={source}, active_calls={current_count}/{max_concurrent}"
                f"{scope_note}, waited=0.0s"
            )
            properties = {
                "event_source": "dograh",
                "organization_id": organization_id,
                "concurrency_group_id": group_id,
                "source": source,
                "max_concurrent": max_concurrent,
                "active_calls": current_count,
                "waited_seconds": 0.0,
            }
            if scope_key:
                properties["scope_key"] = scope_key
                properties["scope_max_concurrent"] = scope_max_concurrent
            await self._notify_limit_reached(organization_id, properties)
            raise CallConcurrencyLimitError(
                organization_id=organization_id,
                source=source,
                wait_time=0.0,
                max_concurrent=max_concurrent,
            )

        wait_start = time.time()
        while True:
            acquisition = await rate_limiter.try_acquire_concurrent_slot_details(
                group_id,
                max_concurrent,
                scope_key=scope_key,
                scope_max_concurrent=scope_max_concurrent,
            )
            if acquisition:
                logger.info(
                    f"Acquired concurrent call slot for org {organization_id} (group {group_id}): "
                    f"source={source}, active_calls="
                    f"{acquisition.active_count}/{max_concurrent}, "
                    f"slot_id={acquisition.slot_id}"
                )
                return CallConcurrencySlot(
                    organization_id=group_id,
                    slot_id=acquisition.slot_id,
                    max_concurrent=max_concurrent,
                    source=source,
                    scope_key=scope_key,
                )

            wait_time = time.time() - wait_start
            if wait_time >= timeout:
                current_count = await rate_limiter.get_concurrent_count(group_id)
                scope_note = (
                    f", scope={scope_key} (limit={scope_max_concurrent})"
                    if scope_key
                    else ""
                )
                logger.warning(
                    f"Concurrent call limit reached for org {organization_id} (group {group_id}): "
                    f"source={source}, active_calls={current_count}/{max_concurrent}"
                    f"{scope_note}, waited={wait_time:.1f}s"
                )
                properties = {
                    "event_source": "dograh",
                    "organization_id": organization_id,
                    "concurrency_group_id": group_id,
                    "source": source,
                    "max_concurrent": max_concurrent,
                    "active_calls": current_count,
                    "waited_seconds": round(wait_time, 1),
                }
                if scope_key:
                    properties["scope_key"] = scope_key
                    properties["scope_max_concurrent"] = scope_max_concurrent
                await self._notify_limit_reached(organization_id, properties)
                raise CallConcurrencyLimitError(
                    organization_id=organization_id,
                    source=source,
                    wait_time=wait_time,
                    max_concurrent=max_concurrent,
                )

            logger.debug(
                f"Waiting for concurrent call slot for org {organization_id}, "
                f"source={source}, waited {wait_time:.1f}s"
            )
            await asyncio.sleep(min(retry_interval, max(0, timeout - wait_time)))

    async def _notify_limit_reached(
        self, organization_id: int, properties: dict
    ) -> None:
        """Fan the usage event out to every org member's provider_id, matching
        how MPS emits org-scoped billing events (billing_posthog_service.py)
        into the shared PostHog project. Never raises.

        NOTE: intentionally NOT attaching ``$groups`` (organization) to this
        event. PostHog evaluates a $groups event at both person and group
        scope, which double-triggers person-scoped workflows enrolled on the
        event. The org is still available as the ``organization_id`` property.
        """
        try:
            members = await db_client.get_organization_users(organization_id)
            if not members:
                logger.debug(
                    f"No users found for org {organization_id}; skipping "
                    "concurrent-call-limit PostHog event"
                )
                return
            for member in members:
                capture_event(
                    distinct_id=str(member.provider_id),
                    event=PostHogEvent.USAGE_CONCURRENT_CALL_LIMIT_REACHED,
                    properties=properties,
                )
        except Exception:
            logger.exception(
                "Failed to send concurrent-call-limit PostHog event for org "
                f"{organization_id}"
            )

    async def bind_workflow_run(
        self, slot: CallConcurrencySlot | None, workflow_run_id: int
    ) -> None:
        if slot is None:
            return
        stored = await rate_limiter.store_workflow_slot_mapping_if_absent(
            workflow_run_id,
            slot.organization_id,
            slot.slot_id,
            scope_key=slot.scope_key,
        )
        if stored is True:
            return

        # Release slot to prevent untracked slot leak in Redis
        await self.release_slot(slot)
        if stored is None:
            logger.warning(
                f"Redis error storing workflow slot mapping for run {workflow_run_id}. "
                "Slot released to prevent concurrency pool starvation."
            )
            return

        raise WorkflowRunSlotAlreadyBoundError(workflow_run_id)

    async def register_active_call(
        self,
        organization_id: int,
        workflow_run_id: int,
        *,
        source: str,
        timeout: float = 0,
        scope_key: str | None = None,
        scope_max_concurrent: int | None = None,
        retry_interval: float = 1,
    ) -> CallConcurrencySlot:
        slot = await self.acquire_org_slot(
            organization_id,
            source=source,
            timeout=timeout,
            scope_key=scope_key,
            scope_max_concurrent=scope_max_concurrent,
            retry_interval=retry_interval,
        )
        await self.bind_workflow_run(slot, workflow_run_id)
        return slot

    async def unregister_active_call(self, workflow_run_id: int) -> bool:
        """Release the run's slot without ever raising.

        Callers invoke this from ``finally`` blocks during pipeline/socket
        teardown; a cleanup failure must not mask the original exception.
        The slot mapping survives a failed release, so a later cleanup path
        (status callback, StasisEnd) or the Redis stale timeout recovers it.
        """
        try:
            return await self.release_workflow_run_slot(workflow_run_id)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning(
                f"Failed to release concurrent call slot for workflow run "
                f"{workflow_run_id}: {e}"
            )
            return False

    async def release_slot(self, slot: CallConcurrencySlot | None) -> bool:
        if slot is None:
            return False
        released = await rate_limiter.release_concurrent_slot(
            slot.organization_id, slot.slot_id, scope_key=slot.scope_key
        )
        return bool(released)

    async def release_workflow_run_slot(self, workflow_run_id: int) -> bool:
        mapping = await rate_limiter.get_workflow_slot_mapping(workflow_run_id)
        if not mapping:
            return False

        org_id, slot_id, scope_key = mapping
        released = await rate_limiter.release_concurrent_slot(
            org_id, slot_id, scope_key=scope_key
        )
        if released is None:
            # Redis error while releasing — keep the mapping so a later
            # cleanup path can retry instead of orphaning a live slot until
            # the stale timeout.
            logger.warning(
                f"Failed to release concurrent slot for workflow run "
                f"{workflow_run_id}; keeping mapping for retry"
            )
            return False
        await rate_limiter.delete_workflow_slot_mapping(workflow_run_id)
        if released:
            logger.info(f"Released concurrent slot for workflow run {workflow_run_id}")
        else:
            logger.debug(
                f"Concurrent slot mapping for workflow run {workflow_run_id} "
                "had no live slot; deleted stale mapping"
            )
        return released

    async def refresh_workflow_run_slot(self, workflow_run_id: int) -> bool:
        """Refresh the concurrent slot score in Redis for an active workflow run."""
        mapping = await rate_limiter.get_workflow_slot_mapping(workflow_run_id)
        if not mapping:
            return False

        org_id, slot_id, scope_key = mapping
        return bool(
            await rate_limiter.refresh_concurrent_slot(
                org_id, slot_id, scope_key=scope_key, workflow_run_id=workflow_run_id
            )
        )

    async def _slot_heartbeat_loop(
        self, workflow_run_id: int, stop_event: asyncio.Event
    ) -> None:
        """Periodically refresh the slot in Redis while the pipeline is active."""
        interval = rate_limiter.heartbeat_interval
        while not stop_event.is_set():
            try:
                await asyncio.sleep(interval)
                if stop_event.is_set():
                    break
                refreshed = await self.refresh_workflow_run_slot(workflow_run_id)
                if not refreshed:
                    logger.debug(
                        f"Slot mapping for workflow run {workflow_run_id} no longer live; stopping heartbeat"
                    )
                    break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(
                    f"Slot heartbeat error for workflow run {workflow_run_id}: {e}"
                )

    @asynccontextmanager
    async def hold_slot_heartbeat(self, workflow_run_id: int):
        """Context manager maintaining an active slot heartbeat in Redis for a pipeline run."""
        stop_event = asyncio.Event()
        heartbeat_task = asyncio.create_task(
            self._slot_heartbeat_loop(workflow_run_id, stop_event)
        )
        try:
            yield
        finally:
            stop_event.set()
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except (asyncio.CancelledError, Exception):
                pass


call_concurrency = CallConcurrencyService()

