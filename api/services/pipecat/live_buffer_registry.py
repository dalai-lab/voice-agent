"""Registry to expose live InMemoryLogsBuffer instances for demo/debug read-only access.

This mirrors the ws_sender_registry pattern: a lightweight in-process dict that
allows a read-only demo endpoint to stream live transcript events WITHOUT modifying
any call logic. Callers MUST NOT mutate the buffer — only read from it.
"""

from api.services.pipecat.in_memory_buffers import InMemoryLogsBuffer

_live_buffers: dict[int, InMemoryLogsBuffer] = {}


def register_live_buffer(workflow_run_id: int, buffer: InMemoryLogsBuffer) -> None:
    """Register a buffer for a live run. Called once at pipeline startup."""
    _live_buffers[workflow_run_id] = buffer


def unregister_live_buffer(workflow_run_id: int) -> None:
    """Remove the buffer when the pipeline finishes."""
    _live_buffers.pop(workflow_run_id, None)


def get_live_buffer(workflow_run_id: int) -> InMemoryLogsBuffer | None:
    """Return the live buffer for a run, or None if not active."""
    return _live_buffers.get(workflow_run_id)
