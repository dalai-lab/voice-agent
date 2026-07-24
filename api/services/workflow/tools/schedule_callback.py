from typing import Any, Dict

def get_schedule_callback_tools() -> list[Dict[str, Any]]:
    """Get schedule_callback tool definitions for LLM function calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": "schedule_callback",
                "description": (
                    "Schedule a callback call to the current user after a delay. "
                    "Use this ONLY when the user explicitly asks to be called back later. "
                    "This will end the current call and call the user back after the specified delay. "
                    "Minimum delay is 1 minute. Maximum delay is 480 minutes (8 hours) by default. "
                    "NOT available for web/browser calls — only phone calls. "
                    "After calling this tool, say your farewell_message and let the call end naturally. "
                    "\n\nIMPORTANT — Clarify vague time phrases before scheduling: "
                    "If the user says something like 'after lunch', 'after my meeting', 'later', "
                    "'in a while', or any other vague phrase that does not specify an exact time or duration, "
                    "do NOT call this tool immediately. Instead, suggest a specific time and confirm with the user first. "
                    "Example: 'Sure! Does 2:00 PM work for you?' or 'How about I call you back in 2 hours?' "
                    "Only call this tool after the user confirms a specific time or duration. "
                    "If the user already gives a clear relative time (e.g. 'in 10 minutes', 'in an hour', 'at 3 PM'), "
                    "schedule it directly without asking for confirmation."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "minutes": {
                            "type": "integer",
                            "description": "Number of minutes before calling back. Min: 1, Max: 480.",
                            "minimum": 1,
                            "maximum": 480
                        },
                        "farewell_message": {
                            "type": "string",
                            "description": "What to say to the user before ending the call. E.g. 'Perfect, I'll call you back in 10 minutes!'",
                        },
                        "conversation_summary": {
                            "type": "string",
                            "description": "A 1-2 sentence summary of the conversation so far, to be injected as context on the callback call.",
                        }
                    },
                    "required": ["minutes", "farewell_message", "conversation_summary"],
                },
            },
        }
    ]
