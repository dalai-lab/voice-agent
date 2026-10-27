from __future__ import annotations

import asyncio
import json
from typing import TYPE_CHECKING, Any

from api.services.gen_ai.json_parser import parse_llm_json
from api.services.pipecat.tracing_config import ensure_tracing
from api.services.workflow.dto import ExtractionVariableDTO
from loguru import logger
from opentelemetry import trace
from pipecat.metrics.metrics import LLMUsageMetricsData
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.utils.tracing.service_attributes import add_llm_span_attributes

if TYPE_CHECKING:
    from api.services.workflow.pipecat_engine import PipecatEngine


class VariableExtractionManager:
    """Helper that registers and executes the \"extract_variables\" tool.

    The manager is responsible for two things:
      1. Registering a callable with the LLM service so that the tool can be
         invoked from within the model.
      2. Executing the extraction in a background task while maintaining
         correct bookkeeping and optional OpenTelemetry tracing.
    """

    def __init__(self, engine: PipecatEngine) -> None:
        # We keep a reference to the engine so we can reuse its context
        # and update internal counters / extracted variable state.
        self._engine = engine
        self._context = engine.context

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    # Keys stripped from HTTP tool responses before passing to the extraction
    _TOOL_RESPONSE_STRIP_KEYS = {"status", "status_code"}

    # Maximum character length for a single tool response in the extraction
    # context.  Responses longer than this are truncated with a marker.
    _TOOL_RESPONSE_MAX_CHARS = 2000

    # Aggregate character budget across all turns and tool responses.
    # When conversation exceeds this, older turns are truncated to protect context limits.
    _MAX_TOTAL_CONVERSATION_CHARS = 16000

    # Transition tool response
    _TRANSITION_RESPONSE = '{"status": "done"}'

    def _build_tool_call_name_lookup(
        self, messages: list[Any] | None = None
    ) -> dict[str, str]:
        """Build a mapping of tool_call_id → function name from assistant messages.

        This allows labelling tool responses with the function that produced them.
        """
        lookup: dict[str, str] = {}
        msg_list = (
            messages if messages is not None else getattr(self._context, "messages", [])
        )
        for msg in msg_list:
            if not isinstance(msg, dict) or msg.get("role") != "assistant":
                continue
            for tc in msg.get("tool_calls", []):
                tc_id = tc.get("id")
                func = tc.get("function") or {}
                tc_name = func.get("name")
                if tc_id and tc_name:
                    lookup[tc_id] = tc_name
        return lookup

    def _format_tool_response(self, raw_content: str, tool_name: str) -> str | None:
        """Clean, trim, and format a tool response for the extraction context.

        Returns None if the response should be excluded (e.g. transition tools).
        """
        # Skip transition tool responses
        if raw_content.strip() == self._TRANSITION_RESPONSE:
            return None

        # Try to parse as JSON so we can strip wrapper keys and extract data
        try:
            parsed = json.loads(raw_content)
            if isinstance(parsed, dict):
                # If there is a "data" key, prefer its content — that is the
                # actual HTTP response payload from custom tools.
                if "data" in parsed:
                    parsed = parsed["data"]
                else:
                    # Strip wrapper metadata keys
                    for key in self._TOOL_RESPONSE_STRIP_KEYS:
                        parsed.pop(key, None)

                formatted = json.dumps(parsed, ensure_ascii=False)
            else:
                formatted = raw_content
        except (json.JSONDecodeError, TypeError):
            formatted = raw_content

        # Truncate if too long
        if len(formatted) > self._TOOL_RESPONSE_MAX_CHARS:
            formatted = formatted[: self._TOOL_RESPONSE_MAX_CHARS] + "...(truncated)"

        return f"[Tool Response: {tool_name}]\n{formatted}"

    def _get_role_and_content(self, msg: Any) -> tuple[str | None, str | None]:
        """Return (role, content) for a single context message.

        Supports both OpenAI-style dict messages and Google Gemini ``Content``
        objects.  Only plain textual content is returned — image parts, tool
        call placeholders, etc. are ignored.
        """
        # OpenAI format — dict with ``role`` and ``content`` keys
        if isinstance(msg, dict):
            role = msg.get("role")
            content_field = msg.get("content")

            if isinstance(content_field, str):
                return role, content_field
            if isinstance(content_field, list):
                texts = [
                    segment.get("text", "")
                    for segment in content_field
                    if isinstance(segment, dict) and segment.get("type") == "text"
                ]
                return role, (" ".join(texts) if texts else None)
            return role, None

        # Google Gemini format — ``Content`` object with ``parts`` list
        role_attr = getattr(msg, "role", None)
        parts_attr = getattr(msg, "parts", None)
        if role_attr is None or parts_attr is None:
            return None, None

        role = "assistant" if role_attr == "model" else role_attr
        texts = [t for p in parts_attr if (t := getattr(p, "text", None))]
        return role, (" ".join(texts) if texts else None)

    def _build_conversation_history(
        self, messages: list[Any] | None = None
    ) -> str:
        """Build a text representation of the conversation for the extraction LLM.

        Includes assistant/user messages and formatted tool responses (excluding
        transition tool responses). Enforces an aggregate total history budget.
        """
        msg_list = (
            messages if messages is not None else getattr(self._context, "messages", [])
        )
        tool_call_names = self._build_tool_call_name_lookup(msg_list)

        lines: list[str] = []
        for msg in msg_list:
            role, content = self._get_role_and_content(msg)
            if role in ("assistant", "user") and content:
                lines.append(f"{role}: {content}")
            elif isinstance(msg, dict) and msg.get("role") == "tool":
                tool_content = msg.get("content", "")
                tool_call_id = msg.get("tool_call_id", "")
                tool_name = tool_call_names.get(tool_call_id, "unknown")
                formatted = self._format_tool_response(tool_content, tool_name)
                if formatted:
                    lines.append(formatted)

        total_text = "\n".join(lines)
        if len(total_text) > self._MAX_TOTAL_CONVERSATION_CHARS:
            # Aggregate budget truncation: retain most recent turns within budget
            truncated_lines: list[str] = []
            current_chars = 0
            for line in reversed(lines):
                line_len = len(line) + 1  # newline
                if current_chars + line_len > self._MAX_TOTAL_CONVERSATION_CHARS:
                    break
                truncated_lines.append(line)
                current_chars += line_len
            truncated_lines.reverse()
            return "[...earlier turns truncated...]\n" + "\n".join(truncated_lines)

        return total_text

    @staticmethod
    def _coerce_variable_types(
        extracted_data: dict,
        extraction_variables: list[ExtractionVariableDTO],
    ) -> dict:
        """Coerce extracted string values to expected schema types (number, boolean, string)."""
        var_types: dict[str, str] = {
            v.name: (v.type.value if hasattr(v.type, "value") else str(v.type))
            for v in extraction_variables
        }
        coerced = dict(extracted_data)
        for key, val in extracted_data.items():
            if key not in var_types or val is None:
                continue
            expected_type = var_types[key]
            if expected_type == "number":
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    continue
                if isinstance(val, str):
                    cleaned = val.strip().replace(",", "")
                    try:
                        if "." in cleaned:
                            coerced[key] = float(cleaned)
                        else:
                            coerced[key] = int(cleaned)
                    except (ValueError, TypeError):
                        pass
            elif expected_type == "boolean":
                if isinstance(val, bool):
                    continue
                if isinstance(val, (int, float)):
                    coerced[key] = bool(val)
                elif isinstance(val, str):
                    cleaned = val.strip().lower()
                    if cleaned in ("true", "yes", "1", "y", "correct", "true."):
                        coerced[key] = True
                    elif cleaned in ("false", "no", "0", "n", "incorrect", "false."):
                        coerced[key] = False
            elif expected_type == "string":
                if not isinstance(val, str) and not isinstance(val, (dict, list)):
                    coerced[key] = str(val)
        return coerced

    async def _perform_extraction(
        self,
        extraction_variables: list[ExtractionVariableDTO],
        parent_ctx: Any,
        extraction_prompt: str = "",
    ) -> dict:
        """Run the actual extraction chat completion and post-process the result."""

        # ------------------------------------------------------------------
        # Build the prompt that instructs the model to extract the variables.
        # ------------------------------------------------------------------
        vars_description = "\n".join(
            f"- {v.name} ({v.type}): {v.prompt}" for v in extraction_variables
        )

        # ------------------------------------------------------------------
        # Build a normalized conversation history with snapshot isolation.
        # ------------------------------------------------------------------
        messages_snapshot = list(getattr(self._context, "messages", []))
        conversation_history = self._build_conversation_history(messages_snapshot)

        system_prompt = (
            "You are an assistant tasked with extracting structured data from the conversation. "
            "Return ONLY a valid JSON object with the requested variables as top-level keys. Do not wrap the JSON in markdown."
        )
        # Use provided extraction_prompt as system prompt, or default
        system_prompt = (
            system_prompt + "\n\n" + extraction_prompt
            if extraction_prompt
            else system_prompt
        )

        user_prompt = (
            "\n\nVariables to extract:\n"
            f"{vars_description}"
            "\n\nConversation history:\n"
            f"{conversation_history}"
        )

        extraction_context = LLMContext()
        extraction_messages = [
            {"role": "user", "content": user_prompt},
        ]
        extraction_context.set_messages(extraction_messages)

        # ------------------------------------------------------------------
        # Use engine's extraction LLM for out-of-band inference (no pipeline frames).
        # Automatic Runtime Fallback: If dedicated extraction LLM fails mid-call,
        # fallback to the primary conversational LLM.
        # ------------------------------------------------------------------
        used_llm = self._engine.variable_extraction_llm
        llm_response = None
        token_usage = None
        try:
            if hasattr(used_llm, "run_inference_with_usage"):
                llm_response, token_usage = await used_llm.run_inference_with_usage(
                    extraction_context, system_instruction=system_prompt
                )
            else:
                res = await used_llm.run_inference(
                    extraction_context, system_instruction=system_prompt
                )
                if isinstance(res, tuple):
                    llm_response, token_usage = res
                else:
                    llm_response = res
        except asyncio.CancelledError:
            raise
        except Exception as e:
            fallback_llm = getattr(self._engine, "inference_llm", None) or getattr(
                self._engine, "llm", None
            )
            if (
                fallback_llm is not None
                and fallback_llm is not self._engine.variable_extraction_llm
            ):
                logger.warning(
                    f"Variable extraction with dedicated LLM failed: {e}. "
                    f"Falling back to primary conversation LLM ({fallback_llm.__class__.__name__})."
                )
                try:
                    if hasattr(fallback_llm, "run_inference_with_usage"):
                        llm_response, token_usage = await fallback_llm.run_inference_with_usage(
                            extraction_context, system_instruction=system_prompt
                        )
                    else:
                        res = await fallback_llm.run_inference(
                            extraction_context, system_instruction=system_prompt
                        )
                        if isinstance(res, tuple):
                            llm_response, token_usage = res
                        else:
                            llm_response = res
                    used_llm = fallback_llm
                except asyncio.CancelledError:
                    raise
                except Exception as fallback_e:
                    logger.error(f"Fallback extraction LLM also failed: {fallback_e}")
                    raise fallback_e from e
            else:
                raise

        # Get model name for tracing and telemetry
        model_name = (
            getattr(getattr(used_llm, "_settings", None), "model", None)
            or getattr(getattr(used_llm, "settings", None), "model", None)
            or getattr(used_llm, "model_name", None)
            or getattr(used_llm, "model", None)
            or getattr(used_llm, "_model_name", None)
            or getattr(used_llm, "_model", None)
            or "unknown"
        )

        # Record extraction token usage in pipeline_metrics_aggregator
        aggregator = getattr(self._engine, "_pipeline_metrics_aggregator", None) or getattr(
            self._engine, "pipeline_metrics_aggregator", None
        )
        if aggregator is not None and token_usage is not None:
            usage_data = LLMUsageMetricsData(
                processor="variable_extraction:extraction",
                model=model_name,
                value=token_usage,
            )
            try:
                if hasattr(aggregator, "_handle_llm_usage_metrics"):
                    res = aggregator._handle_llm_usage_metrics(usage_data)
                    if asyncio.iscoroutine(res):
                        await res
            except Exception as metric_err:
                logger.warning(f"Failed to record extraction LLM usage metrics: {metric_err}")

        if ensure_tracing():
            tracer = trace.get_tracer("pipecat")
            with tracer.start_as_current_span(
                "llm-variable-extraction", context=parent_ctx
            ) as span:
                tracing_messages = [
                    {"role": "system", "content": system_prompt},
                    *extraction_messages,
                ]
                add_llm_span_attributes(
                    span,
                    service_name=used_llm.__class__.__name__,
                    model=model_name,
                    operation_name="llm-variable-extraction",
                    messages=tracing_messages,
                    output=json.dumps({"content": llm_response}),
                    stream=False,
                    parameters={},
                )

        # ------------------------------------------------------------------
        # Parse the assistant output – fall back to raw text if it is not valid JSON.
        # Uses parse_llm_json which handles common LLM mistakes like markdown
        # code blocks (```json ... ```) and extra text around the JSON.
        # ------------------------------------------------------------------
        if llm_response is None:
            logger.warning("Extractor returned no response; returning empty result.")
            extracted = {}
        else:
            extracted = parse_llm_json(llm_response)
            if "raw" in extracted and len(extracted) == 1:
                logger.warning(
                    "Extractor returned invalid JSON; storing raw content instead."
                )

        # Apply strict type coercion according to variable definitions
        if isinstance(extracted, dict):
            extracted = self._coerce_variable_types(extracted, extraction_variables)

        logger.debug(f"Extracted variables: {extracted}")
        return extracted
