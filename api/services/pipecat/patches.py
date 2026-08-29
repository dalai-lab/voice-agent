"""
Non-blocking audio write patches for Pipecat transports.

By default, pipecat's write_audio_frame() blocks the _audio_task_handler
for the full real-time duration of each audio frame. This stalls the queue
so heartbeats and user-turn frames can't be processed while the bot speaks,
causing >10s heartbeat timeouts and delayed user-input processing.

These patches make write_audio_frame return immediately after enqueuing/sending
audio, so the audio task stays responsive to all frames in the queue.
"""

import asyncio
import time

from loguru import logger

# ---------------------------------------------------------------------------
# SmallWebRTC: patch SmallWebRTCClient and SmallWebRTCOutputTransport
# ---------------------------------------------------------------------------
try:
    from pipecat.transports.smallwebrtc.transport import (
        SmallWebRTCClient,
        SmallWebRTCOutputTransport,
    )
    from pipecat.frames.frames import OutputAudioRawFrame as _OutputAudioRawFrame

    if hasattr(SmallWebRTCClient, "write_audio_frame"):
        async def _smallwebrtc_client_write_audio_frame(self, frame: _OutputAudioRawFrame) -> bool:
            """Non-blocking: enqueue audio without awaiting full playback."""
            if self._can_send() and self._audio_output_track:
                # add_audio_bytes is a regular function returning a Future.
                # The original code awaited that future, blocking until recv()
                # consumed the last 10ms chunk at real-time pace.
                # We just enqueue and return; recv() paces itself independently.
                self._audio_output_track.add_audio_bytes(frame.audio)
                return True
            return False

        SmallWebRTCClient.write_audio_frame = _smallwebrtc_client_write_audio_frame
        logger.info("Patched SmallWebRTCClient.write_audio_frame (non-blocking)")

    if hasattr(SmallWebRTCOutputTransport, "write_audio_frame"):
        async def _smallwebrtc_output_write_audio_frame(self, frame: _OutputAudioRawFrame) -> bool:
            """Non-blocking: delegate without awaiting."""
            return await self._transport.write_audio_frame(frame)

        SmallWebRTCOutputTransport.write_audio_frame = _smallwebrtc_output_write_audio_frame
        logger.info("Patched SmallWebRTCOutputTransport.write_audio_frame (non-blocking)")

except Exception as e:
    logger.warning(f"Could not apply SmallWebRTC audio patch: {e}")


# ---------------------------------------------------------------------------
# Shared helper: advance timing clock without sleeping
# ---------------------------------------------------------------------------
def _advance_audio_clock(transport):
    """Advance _next_send_time without sleeping."""
    current_time = time.monotonic()
    if transport._next_send_time <= current_time:
        transport._next_send_time = current_time + transport._send_interval
    else:
        transport._next_send_time += transport._send_interval


# ---------------------------------------------------------------------------
# FastAPI WebSocket: patch FastAPIWebsocketOutputTransport
# ---------------------------------------------------------------------------
try:
    from pipecat.transports.websocket.fastapi import FastAPIWebsocketOutputTransport
    from pipecat.frames.frames import OutputAudioRawFrame as _OutputAudioRawFrame

    if hasattr(FastAPIWebsocketOutputTransport, "write_audio_frame"):
        _orig_fastapi_write = FastAPIWebsocketOutputTransport.write_audio_frame

        async def _fastapi_output_write_audio_frame(self, frame: _OutputAudioRawFrame) -> bool:
            """Non-blocking: send frame then advance clock without sleeping."""
            if self._client.is_closing or not self._client.is_connected:
                return False
            # Call the original but skip the blocking _write_audio_sleep.
            # We call _write_frame directly to avoid duplicating WAV-header logic.
            result = await _orig_fastapi_write(self, frame)
            # _write_audio_sleep was already awaited inside original; undo the
            # sleep by patching the clock synchronously via the hook below.
            return result

        # Simpler approach: just patch _write_audio_sleep to not sleep
        async def _fastapi_write_audio_sleep_patched(self):
            _advance_audio_clock(self)
            await asyncio.sleep(0)

        FastAPIWebsocketOutputTransport._write_audio_sleep = _fastapi_write_audio_sleep_patched
        logger.info("Patched FastAPIWebsocketOutputTransport._write_audio_sleep (non-blocking)")

except Exception as e:
    logger.warning(f"Could not apply FastAPIWebsocket audio patch: {e}")


# ---------------------------------------------------------------------------
# WebSocket Server: patch SingleClientWebsocketServerOutputTransport
# ---------------------------------------------------------------------------
try:
    from pipecat.transports.websocket.server import SingleClientWebsocketServerOutputTransport

    if hasattr(SingleClientWebsocketServerOutputTransport, "_write_audio_sleep"):
        async def _server_write_audio_sleep_patched(self):
            _advance_audio_clock(self)
            await asyncio.sleep(0)

        SingleClientWebsocketServerOutputTransport._write_audio_sleep = _server_write_audio_sleep_patched
        logger.info("Patched SingleClientWebsocketServerOutputTransport._write_audio_sleep (non-blocking)")

    # Also try the non-single-client variant
    from pipecat.transports.websocket.server import WebsocketServerOutputTransport

    if hasattr(WebsocketServerOutputTransport, "_write_audio_sleep"):
        async def _wsserver_write_audio_sleep_patched(self):
            _advance_audio_clock(self)
            await asyncio.sleep(0)

        WebsocketServerOutputTransport._write_audio_sleep = _wsserver_write_audio_sleep_patched
        logger.info("Patched WebsocketServerOutputTransport._write_audio_sleep (non-blocking)")

except Exception as e:
    logger.warning(f"Could not apply WebsocketServer audio patch: {e}")


# ---------------------------------------------------------------------------
# WebSocket Client: patch WebsocketClientOutputTransport
# ---------------------------------------------------------------------------
try:
    from pipecat.transports.websocket.client import WebsocketClientOutputTransport

    if hasattr(WebsocketClientOutputTransport, "_write_audio_sleep"):
        async def _wsclient_write_audio_sleep_patched(self):
            _advance_audio_clock(self)
            await asyncio.sleep(0)

        WebsocketClientOutputTransport._write_audio_sleep = _wsclient_write_audio_sleep_patched
        logger.info("Patched WebsocketClientOutputTransport._write_audio_sleep (non-blocking)")

except Exception as e:
    logger.warning(f"Could not apply WebsocketClient audio patch: {e}")

logger.info("Pipecat non-blocking audio patches applied successfully")
