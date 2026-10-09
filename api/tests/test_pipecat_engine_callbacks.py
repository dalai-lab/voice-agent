from unittest.mock import AsyncMock
import asyncio

import pytest
from pipecat.frames.frames import CancelFrame, EndFrame, HeartbeatFrame, StartFrame
from pipecat.processors.frame_processor import FrameDirection
from pipecat.utils.enums import EndTaskReason

from api.services.pipecat.pipeline_engine_callbacks_processor import (
    PipelineEngineCallbacksProcessor,
)
from api.services.workflow.pipecat_engine_callbacks import create_max_duration_callback


@pytest.mark.asyncio
async def test_max_duration_callback_aborts_immediately():
    engine = AsyncMock()

    callback = create_max_duration_callback(engine)
    await callback()

    engine.end_call_with_reason.assert_awaited_once_with(
        EndTaskReason.CALL_DURATION_EXCEEDED.value,
        abort_immediately=True,
    )


@pytest.mark.asyncio
async def test_pipeline_engine_callbacks_processor_watchdog():
    end_callback = AsyncMock()
    processor = PipelineEngineCallbacksProcessor(
        max_call_duration_seconds=0.05,
        max_duration_end_task_callback=end_callback,
    )

    await processor._start(StartFrame())
    assert processor._watchdog_task is not None

    await asyncio.sleep(0.08)
    end_callback.assert_awaited_once()


@pytest.mark.asyncio
async def test_pipeline_engine_callbacks_processor_early_end_cancels_watchdog():
    end_callback = AsyncMock()
    processor = PipelineEngineCallbacksProcessor(
        max_call_duration_seconds=10,
        max_duration_end_task_callback=end_callback,
    )

    await processor._start(StartFrame())
    assert processor._watchdog_task is not None
    assert not processor._watchdog_task.done()

    # When EndFrame arrives, watchdog is cancelled
    if processor._watchdog_task and not processor._watchdog_task.done():
        processor._watchdog_task.cancel()
    await asyncio.sleep(0.01)
    assert processor._watchdog_task.cancelled()
    end_callback.assert_not_awaited()

