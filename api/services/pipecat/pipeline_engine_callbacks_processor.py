import asyncio
import time
from collections.abc import Awaitable, Callable

from api.schemas.workflow_configurations import DEFAULT_MAX_CALL_DURATION_SECONDS
from loguru import logger

from pipecat.frames.frames import (
    CancelFrame,
    EndFrame,
    Frame,
    HeartbeatFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    StartFrame,
    TTSSpeakFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor


class PipelineEngineCallbacksProcessor(FrameProcessor):
    """
    Custom PipelineEngineCallbacksProcessor that accepts callbacks for various
    use cases, like ending tasks when max call duration is exceeded, or informing
    the engine that the bot is done speaking.
    """

    def __init__(
        self,
        max_call_duration_seconds: int = DEFAULT_MAX_CALL_DURATION_SECONDS,
        max_duration_end_task_callback: Callable[[], Awaitable[None]] | None = None,
        generation_started_callback: Callable[[], Awaitable[None]] | None = None,
        llm_text_frame_callback: Callable[[str], Awaitable[None]] | None = None,
        dtmf_callback: Callable[[str], Awaitable[None]] | None = None,
    ):
        super().__init__()
        self._start_time = None
        self._max_call_duration_seconds = max_call_duration_seconds
        self._max_duration_end_task_callback = max_duration_end_task_callback
        self._generation_started_callback = generation_started_callback
        self._llm_text_frame_callback = llm_text_frame_callback
        self._dtmf_callback = dtmf_callback
        self._end_task_frame_pushed = False
        self._watchdog_task: asyncio.Task | None = None

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, StartFrame):
            await self._start(frame)
        elif isinstance(frame, (EndFrame, CancelFrame)):
            if self._watchdog_task and not self._watchdog_task.done():
                self._watchdog_task.cancel()
        elif isinstance(frame, HeartbeatFrame):
            await self._check_call_duration()
        elif isinstance(frame, LLMFullResponseStartFrame):
            await self._generation_started()
        elif (
            isinstance(frame, (LLMTextFrame, TTSSpeakFrame))
            and self._llm_text_frame_callback
        ):
            # Include TTSSpeakFrame here since for static nodes, we send TTSSpeakFrame
            # which can act as reference while fixing the aggregated trascript
            await self._llm_text_frame_callback(frame.text)
        elif frame.__class__.__name__ == "InputDTMFFrame" and self._dtmf_callback:
            digit = getattr(frame.button, "value", str(frame.button))
            await self._dtmf_callback(digit)

        await self.push_frame(frame, direction)

    async def _start(self, _: StartFrame):
        self._start_time = time.time()
        if (
            self._max_call_duration_seconds
            and self._max_call_duration_seconds > 0
            and self._max_duration_end_task_callback
        ):
            if self._watchdog_task and not self._watchdog_task.done():
                self._watchdog_task.cancel()
            self._watchdog_task = asyncio.create_task(self._watchdog_timer())

    async def _watchdog_timer(self):
        try:
            await asyncio.sleep(self._max_call_duration_seconds)
            logger.warning(
                f"Max call duration ({self._max_call_duration_seconds}s) reached by active watchdog. Terminating call."
            )
            await self._trigger_max_duration()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in call duration watchdog timer: {e}")

    async def _trigger_max_duration(self):
        if not self._end_task_frame_pushed:
            self._end_task_frame_pushed = True
            if self._max_duration_end_task_callback:
                await self._max_duration_end_task_callback()
        else:
            logger.debug(
                "Max call duration exceeded. Skipping termination since already requested"
            )

    async def _check_call_duration(self):
        if self._start_time is not None and self._max_call_duration_seconds:
            if time.time() - self._start_time >= self._max_call_duration_seconds:
                await self._trigger_max_duration()

    async def _generation_started(self):
        if self._generation_started_callback:
            await self._generation_started_callback()
