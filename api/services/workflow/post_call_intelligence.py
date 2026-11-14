"""Post-Call Intelligence extraction orchestrator."""

import json
from typing import Any

from api.db.models import WorkflowRunModel
from api.services.gen_ai.json_parser import parse_llm_json
from api.services.workflow.dto import QANodeData
from api.services.workflow.qa.conversation import (
    build_conversation_structure,
    format_transcript,
)
from api.services.workflow.qa.llm_config import create_qa_llm_service
from loguru import logger
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.utils.enums import EndTaskReason


async def run_post_call_intelligence(
    workflow_run: WorkflowRunModel,
    post_call_schema: list,
) -> dict[str, Any] | None:
    """Run post-call intelligence extraction on a completed workflow run.

    Returns the extracted data dict, or None if skipped/failed.
    """
    if not post_call_schema:
        return None

    # Check minimum duration (default 10s if not specified)
    usage_info = workflow_run.usage_info or {}
    call_duration = usage_info.get("call_duration_seconds", 0)
    if call_duration < 10:
        logger.info(f"Skipping PCI for run {workflow_run.id}: call_too_short ({call_duration}s)")
        return {"_error": "skipped", "reason": "call_too_short"}

    gathered_context = workflow_run.gathered_context or {}
    call_disposition = gathered_context.get("call_disposition", "")
    call_tags = gathered_context.get("call_tags") or []

    if (
        call_disposition in (EndTaskReason.VOICEMAIL_DETECTED.value, "voicemail")
        or "voicemail_detected" in call_tags
    ):
        logger.info(f"Skipping PCI for run {workflow_run.id}: voicemail")
        return {"_error": "skipped", "reason": "voicemail"}

    logs = workflow_run.logs or {}
    rtf_events = logs.get("realtime_feedback_events", [])
    if not rtf_events:
        logger.info(f"Skipping PCI for run {workflow_run.id}: no_transcript (no events)")
        return {"_error": "skipped", "reason": "no_transcript"}

    conversation = build_conversation_structure(rtf_events)
    transcript = format_transcript(conversation)
    if not transcript:
        logger.info(f"Skipping PCI for run {workflow_run.id}: no_transcript (empty)")
        return {"_error": "skipped", "reason": "no_transcript"}

    # Resolve workflow/org LLM config directly using central factory (Intelligence LLM)
    resolved_llm = await create_qa_llm_service(None, workflow_run)
    if not resolved_llm:
        logger.warning(f"Skipping PCI for run {workflow_run.id}: no_api_key")
        return {"_error": "error", "reason": "no_api_key"}
    
    llm, model = resolved_llm

    # Build system prompt with schema
    schema_json = json.dumps(post_call_schema, indent=2)
    system_prompt = (
        "Extract the following fields from this conversation transcript. "
        "You MUST return a valid JSON object where the keys match the field names exactly, "
        "and the values match the requested types. Do not include markdown formatting.\n\n"
        f"Schema fields to extract:\n{schema_json}"
    )

    messages = [
        {"role": "user", "content": f"## Transcript\n{transcript}"},
    ]

    context = LLMContext()
    context.set_messages(messages)

    raw_response = None
    token_usage = None
    try:
        if hasattr(llm, "run_inference_with_usage"):
            raw_response, token_usage = await llm.run_inference_with_usage(
                context, system_instruction=system_prompt
            )
        else:
            res = await llm.run_inference(context, system_instruction=system_prompt)
            if isinstance(res, tuple):
                raw_response, token_usage = res
            else:
                raw_response = res
    except Exception as e:
        logger.error(f"PCI LLM call failed for run {workflow_run.id}: {e}")
        return {"_error": "error", "reason": str(e)}

    parsed = parse_llm_json(raw_response or "")
    if not isinstance(parsed, dict):
        logger.warning(
            f"PCI LLM returned non-object JSON on run {workflow_run.id}; got {type(parsed).__name__}"
        )
        parsed = {}

    # Attach token usage and model metadata so post-call integrations can record usage
    if token_usage:
        parsed["_token_usage"] = {
            "prompt_tokens": getattr(token_usage, "prompt_tokens", 0) or 0,
            "completion_tokens": getattr(token_usage, "completion_tokens", 0) or 0,
            "total_tokens": getattr(token_usage, "total_tokens", 0) or 0,
            "cache_read_input_tokens": getattr(token_usage, "cache_read_input_tokens", 0) or 0,
            "cache_creation_input_tokens": getattr(token_usage, "cache_creation_input_tokens", 0) or 0,
        }
        parsed["_model"] = model

    return parsed
