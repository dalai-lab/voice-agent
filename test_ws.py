import asyncio
import websockets
import sys

async def test():
    try:
        async with websockets.connect(
            'wss://api.elevenlabs.io/v1/text-to-speech/Ms9OTvWb99V6DwRHZn6q/multi-stream-input?model_id=eleven_turbo_v2_5&output_format=pcm_24000',
            additional_headers={'xi-api-key': 'sk_e4f6c3b41c3a66e2a50085eec73fb69b3c78e7b32d0b247a'}
        ) as ws:
            print('Connected!')
    except Exception as e:
        print('Error:', e)

asyncio.run(test())
