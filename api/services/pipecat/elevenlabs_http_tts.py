"""ElevenLabs HTTP TTS service wrapper with self-managed aiohttp session.

Pipecat's ``ElevenLabsHttpTTSService`` normally requires the caller to supply
an ``aiohttp.ClientSession``.  This thin wrapper creates and owns its own
session so Dograh's synchronous ``create_tts_service`` factory doesn't need to
become async.

We use the HTTP streaming endpoint instead of the WebSocket ``multi-stream-input``
endpoint because the WebSocket path has a known issue where it silently returns
empty audio when using BYOK (Bring Your Own Key) ElevenLabs API keys.
See: https://github.com/dograh-hq/dograh/issues (ElevenLabs BYOK silent audio bug)
"""

import aiohttp
from loguru import logger

from pipecat.frames.frames import StopFrame
from pipecat.services.elevenlabs.tts import ElevenLabsHttpTTSService


class DograhElevenLabsHttpTTSService(ElevenLabsHttpTTSService):
    """ElevenLabs HTTP TTS service that creates and manages its own aiohttp session.

    Drop-in replacement for ``ElevenLabsTTSService`` (WebSocket) that uses the
    HTTP streaming endpoint instead of the WebSocket ``multi-stream-input``
    endpoint.  This avoids the BYOK silent-audio bug in the multi-stream
    protocol while remaining fully compatible with all ElevenLabs voice types
    (pre-made, cloned, and community library voices).

    Latency trade-off: HTTP streaming adds ~150-300 ms to time-to-first-byte
    compared to the WebSocket endpoint, which is acceptable for telephony and
    web calls.
    """

    def __init__(self, *, api_key: str, base_url: str = "https://api.elevenlabs.io", **kwargs):
        """Initialize the service and create a dedicated aiohttp session.

        Args:
            api_key: ElevenLabs API key for authentication.
            base_url: Base URL for ElevenLabs HTTP API (must use https://).
            **kwargs: Forwarded to ``ElevenLabsHttpTTSService``.
        """
        self._own_session = aiohttp.ClientSession()
        logger.debug("DograhElevenLabsHttpTTSService: created own aiohttp session")
        super().__init__(
            api_key=api_key,
            aiohttp_session=self._own_session,
            base_url=base_url,
            **kwargs,
        )

    async def stop(self, frame: StopFrame):
        """Stop the service and close the aiohttp session."""
        await super().stop(frame)
        if self._own_session and not self._own_session.closed:
            await self._own_session.close()
            logger.debug("DograhElevenLabsHttpTTSService: closed own aiohttp session")
            self._own_session = None
