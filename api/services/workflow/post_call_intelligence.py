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

    if call_disposition == EndTaskReason.VOICEMAIL_DETECTED.value:
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

    # Resolve workflow/org LLM config directly using central factory
    qa_data = QANodeData(qa_use_workflow_llm=True)
    resolved_llm = await create_qa_llm_service(qa_data, workflow_run)
    if not resolved_llm:
        logger.warning(f"Skipping PCI for run {workflow_run.id}: no_api_key")
        return {"_error": "error", "reason": "no_api_key"}
    
    llm, _ = resolved_llm

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

    try:
        raw_response = await llm.run_inference(context, system_instruction=system_prompt)
    except Exception as e:
        logger.error(f"PCI LLM call failed for run {workflow_run.id}: {e}")
        return {"_error": "error", "reason": str(e)}

    parsed = parse_llm_json(raw_response or "")
    if not isinstance(parsed, dict):
        logger.warning(
            f"PCI LLM returned non-object JSON on run {workflow_run.id}; got {type(parsed).__name__}"
        )
        parsed = {}

    # TODO: Update usage_info with token costs if possible (requires hooking into LLM usage callback)
    # For now we rely on the overall workflow run usage accumulation.

    return parsed
