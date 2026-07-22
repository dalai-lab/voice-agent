from typing import Any, Dict

def get_wait_tools() -> list[Dict[str, Any]]:
    """Get wait tool definitions for LLM function calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": "wait_for_user",
                "description": "Wait for a specified number of seconds. Use this when the user asks you to wait or hold on. IMPORTANT: You MUST output a conversational acknowledgment before invoking this tool so the user knows you are waiting.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "seconds": {
                            "type": "integer",
                            "description": "The number of seconds to wait. Defaults to 60 if not specified.",
                        }
                    },
                },
            },
        }
    ]
