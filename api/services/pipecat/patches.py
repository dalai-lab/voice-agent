import asyncio
import io
import time
import wave
from loguru import logger

from pipecat.frames.frames import OutputAudioRawFrame
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.transports.websocket.fastapi import FastAPIWebsocketTransport
from pipecat.transports.websocket.server import SingleClientWebsocketServerTransport
from pipecat.transports.websocket.client import WebsocketClientTransport

logger.info("Applying non-blocking audio write patches to Pipecat transports")

# 1. Patch SmallWebRTCTransport
original_smallwebrtc_write = SmallWebRTCTransport.write_audio_frame

async def smallwebrtc_write_audio_frame_patched(self, frame: OutputAudioRawFrame) -> bool:
    """Non-blocking patch for SmallWebRTCTransport."""
    if self._can_send() and self._audio_output_track:
        # Enqueue audio without awaiting playback completion.
        # recv() paces itself via wall-clock timing, so blocking here
        # for the full audio duration is unnecessary and stalls the
        # pipeline event loop.
        self._audio_output_track.add_audio_bytes(frame.audio)
        return True
    return False

SmallWebRTCTransport.write_audio_frame = smallwebrtc_write_audio_frame_patched


# 2. Patch FastAPIWebsocketTransport
async def fastapi_write_audio_frame_patched(self, frame: OutputAudioRawFrame) -> bool:
    """Non-blocking patch for FastAPIWebsocketTransport."""
    if self._client.is_closing or not self._client.is_connected:
        return False

    frame = OutputAudioRawFrame(
        audio=frame.audio,
        sample_rate=self.sample_rate,
        num_channels=self._params.audio_out_channels,
    )

    if self._params.add_wav_header:
        with io.BytesIO() as buffer:
            with wave.open(buffer, "wb") as wf:
                wf.setsampwidth(2)
                wf.setnchannels(frame.num_channels)
                wf.setframerate(frame.sample_rate)
                wf.writeframes(frame.audio)
            wav_frame = OutputAudioRawFrame(
                buffer.getvalue(),
                sample_rate=frame.sample_rate,
                num_channels=frame.num_channels,
            )
            frame = wav_frame

    await self._write_frame(frame)

    # Non-blocking timing update
    _advance_audio_clock(self)
    await asyncio.sleep(0)
    return True

FastAPIWebsocketTransport.write_audio_frame = fastapi_write_audio_frame_patched


# 3. Patch SingleClientWebsocketServerTransport
async def server_write_audio_frame_patched(self, frame: OutputAudioRawFrame) -> bool:
    """Non-blocking patch for SingleClientWebsocketServerTransport."""
    if not self._websocket:
        return False

    frame = OutputAudioRawFrame(
        audio=frame.audio,
        sample_rate=self.sample_rate,
        num_channels=self._params.audio_out_channels,
    )

    if self._params.add_wav_header:
        with io.BytesIO() as buffer:
            with wave.open(buffer, "wb") as wf:
                wf.setsampwidth(2)
                wf.setnchannels(frame.num_channels)
                wf.setframerate(frame.sample_rate)
                wf.writeframes(frame.audio)
            wav_frame = OutputAudioRawFrame(
                buffer.getvalue(),
                sample_rate=frame.sample_rate,
                num_channels=frame.num_channels,
            )
            frame = wav_frame

    await self._write_frame(frame)

    # Non-blocking timing update
    _advance_audio_clock(self)
    await asyncio.sleep(0)
    return True

SingleClientWebsocketServerTransport.write_audio_frame = server_write_audio_frame_patched


# 4. Patch WebsocketClientTransport
async def client_write_audio_frame_patched(self, frame: OutputAudioRawFrame) -> bool:
    """Non-blocking patch for WebsocketClientTransport."""
    if self._session.is_closing or not self._session.is_connected:
        return False

    frame = OutputAudioRawFrame(
        audio=frame.audio,
        sample_rate=self.sample_rate,
        num_channels=self._params.audio_out_channels,
    )

    if self._params.add_wav_header:
        with io.BytesIO() as buffer:
            with wave.open(buffer, "wb") as wf:
                wf.setsampwidth(2)
                wf.setnchannels(frame.num_channels)
                wf.setframerate(frame.sample_rate)
                wf.writeframes(frame.audio)
            wav_frame = OutputAudioRawFrame(
                buffer.getvalue(),
                sample_rate=frame.sample_rate,
                num_channels=frame.num_channels,
            )
            frame = wav_frame

    await self._write_frame(frame)

    # Non-blocking timing update
    _advance_audio_clock(self)
    await asyncio.sleep(0)
    return True

WebsocketClientTransport.write_audio_frame = client_write_audio_frame_patched


def _advance_audio_clock(transport):
    """Advance the audio send clock without sleeping."""
    current_time = time.monotonic()
    if transport._next_send_time <= current_time:
        transport._next_send_time = current_time + transport._send_interval
    else:
        transport._next_send_time += transport._send_interval
