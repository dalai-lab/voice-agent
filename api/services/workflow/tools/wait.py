from typing import Any, Dict

def get_wait_tools() -> list[Dict[str, Any]]:
    """Get wait tool definitions for LLM function calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": "wait_for_user",
                "description": "Wait for a specified number of seconds. Use this when the user asks you to wait or hold on.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "seconds": {
                            "type": "integer",
                            "description": "The number of seconds to wait. Defaults to 60 if not specified.",
                        },
                        "message": {
                            "type": "string",
                            "description": "A short conversational acknowledgment to speak to the user before waiting (e.g. 'Sure, I will wait.').",
                        }
                    },
                    "required": ["seconds", "message"],
                },
            },
        }
    ]
