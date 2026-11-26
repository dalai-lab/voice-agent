import json
import numpy as np
from fastapi import APIRouter, WebSocket
from loguru import logger
from starlette.websockets import WebSocketDisconnect

from pipecat.audio.vad.silero import SileroOnnxModel

router = APIRouter(prefix="/vad-test")

# Lazy-loaded single instance of the Silero ONNX model
_silero_model: SileroOnnxModel | None = None


def get_silero_model() -> SileroOnnxModel:
    global _silero_model
    if _silero_model is None:
        import os
        from importlib.resources import files
        # Find bundled silero_vad.onnx from pipecat
        model_path = files("pipecat.audio.vad.data").joinpath("silero_vad.onnx")
        logger.info(f"Initializing SileroOnnxModel for live VAD testing: {model_path}")
        _silero_model = SileroOnnxModel(str(model_path))
    return _silero_model


@router.websocket("/stream")
async def vad_test_websocket(websocket: WebSocket):
    """
    Real-time WebSocket endpoint for testing Silero VAD from the UI.
    Receives JSON configuration updates or binary PCM chunks (8kHz or 16kHz float32/int16),
    runs the exact same Silero ONNX model, and responds with:
      - raw_volume: float
      - smoothed_volume: float
      - speech_prob: float
      - is_speaking: bool (passes both volume_floor and neural_confidence)
    """
    await websocket.accept()
    logger.info("VAD test WebSocket client connected")

    try:
        model = get_silero_model()
    except Exception as e:
        logger.error(f"Failed to load Silero model for VAD test: {e}")
        await websocket.close(code=1011, reason="Failed to load Silero model")
        return

    # Default parameters
    sample_rate = 8000
    vad_min_volume = 0.20
    vad_confidence = 0.50

    # Exponential smoothing factor for volume
    smoothed_volume = 0.0
    volume_smoothing_alpha = 0.2

    # Reset states for this session
    model.reset_states()

    try:
        while True:
            message = await websocket.receive()
            if "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    if payload.get("type") == "config":
                        sample_rate = int(payload.get("sample_rate", sample_rate))
                        vad_min_volume = float(payload.get("vad_min_volume", vad_min_volume))
                        vad_confidence = float(payload.get("vad_confidence", vad_confidence))
                        model.reset_states()
                        await websocket.send_json({
                            "type": "config_ack",
                            "sample_rate": sample_rate,
                            "vad_min_volume": vad_min_volume,
                            "vad_confidence": vad_confidence,
                        })
                except Exception as parse_err:
                    logger.warning(f"Error parsing VAD test config: {parse_err}")

            elif "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                # Convert bytes to numpy float32 array
                # Typically incoming as 16-bit PCM (int16)
                num_samples = len(raw_bytes) // 2
                if num_samples == 0:
                    continue

                audio_int16 = np.frombuffer(raw_bytes, dtype=np.int16)
                audio_float32 = audio_int16.astype(np.float32) / 32768.0

                # Compute instantaneous RMS volume
                raw_vol = float(np.sqrt(np.mean(audio_float32 ** 2)))
                smoothed_volume = (
                    volume_smoothing_alpha * raw_vol
                    + (1.0 - volume_smoothing_alpha) * smoothed_volume
                )

                # Silero expects 256 samples for 8kHz, 512 samples for 16kHz
                required_samples = 256 if sample_rate == 8000 else 512

                # If chunk size matches, run model directly
                speech_prob = 0.0
                if len(audio_float32) >= required_samples:
                    # Take the first required_samples or run inference
                    chunk = audio_float32[:required_samples]
                    try:
                        out = model(chunk, sample_rate)
                        speech_prob = float(out[0][0])
                    except Exception as inf_err:
                        logger.debug(f"Silero inference error: {inf_err}")
                        speech_prob = 0.0

                # Determine if speech is detected based on active user parameters
                is_speaking = bool(
                    (smoothed_volume >= vad_min_volume) and (speech_prob >= vad_confidence)
                )

                await websocket.send_json({
                    "type": "vad_result",
                    "speech_prob": round(speech_prob, 3),
                    "raw_volume": round(raw_vol, 4),
                    "smoothed_volume": round(smoothed_volume, 4),
                    "is_speaking": is_speaking,
                })

    except WebSocketDisconnect:
        logger.info("VAD test WebSocket disconnected")
    except Exception as e:
        logger.error(f"VAD test WebSocket error: {e}")
