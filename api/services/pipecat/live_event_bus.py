"""Live event fan-out: taps the existing ws_sender stream and re-broadcasts
to any number of SSE consumers (e.g. the demo /stream endpoint).

Architecture:
  run_pipeline → ws_sender → [signaling WS] (existing)
                           ↘ LiveEventBus  → [SSE queues] (demo only, read-only)

No existing logic is modified. This module only:
1. Wraps an existing ws_sender to intercept its messages (zero side-effects).
2. Maintains per-run queues that SSE consumers can subscribe to.
3. Cleans up automatically when the call ends.
"""

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable

_run_queues: dict[int, list[asyncio.Queue]] = defaultdict(list)


def subscribe(run_id: int) -> asyncio.Queue:
    """Open a new subscription queue for a run. Caller must call unsubscribe() when done."""
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    _run_queues[run_id].append(q)
    return q


def unsubscribe(run_id: int, q: asyncio.Queue) -> None:
    """Remove a subscription queue."""
    queues = _run_queues.get(run_id)
    if queues:
        try:
            queues.remove(q)
        except ValueError:
            pass
        if not queues:
            _run_queues.pop(run_id, None)


def broadcast(run_id: int, event: dict) -> None:
    """Push an event to all SSE subscribers for a run (non-blocking, drop if full)."""
    for q in _run_queues.get(run_id, []):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass  # slow consumer — drop rather than block the pipeline


def make_tapping_sender(
    run_id: int,
    original_sender: Callable[[dict], Awaitable[None]] | None,
) -> Callable[[dict], Awaitable[None]]:
    """Return a wrapper around original_sender that also fans-out to SSE subscribers.

    If original_sender is None (no WS connected), the wrapper still broadcasts
    to SSE subscribers so the demo works for telephony calls without a signaling WS.
    """

    async def _tapping_sender(event: dict) -> None:
        # 1. Forward to original WS sender (existing behaviour, unchanged)
        if original_sender is not None:
            await original_sender(event)
        # 2. Fan-out to SSE demo subscribers (read-only, no call impact)
        broadcast(run_id, event)

    return _tapping_sender


def close_run(run_id: int) -> None:
    """Signal all SSE subscribers that the call has ended, then clean up."""
    sentinel = {"type": "ended"}
    for q in _run_queues.get(run_id, []):
        try:
            q.put_nowait(sentinel)
        except asyncio.QueueFull:
            pass
    _run_queues.pop(run_id, None)
