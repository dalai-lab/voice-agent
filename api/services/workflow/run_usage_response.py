"""Format workflow run usage, extracted data, and canonical public payloads."""

import json
from typing import Any

from api.utils.artifacts import artifact_url
from api.utils.recording_artifacts import get_recording_storage_key, has_recording_track

_TELEMETRY_ONLY_GATHERED_KEYS = frozenset(
    {
        "call_tags",
        "Call Tags",
        "provider",
        "call_id",
        "nodes_visited",
        "extracted_variables",
        "extracted variables",
        "call_disposition",
        "mapped_call_disposition",
        "Transcript URL",
        "Recording URL",
        "is_retry_call",
        "retry_reason",
    }
)


def resolve_call_duration_seconds(
    usage_info: dict[str, Any] | None, cost_info: dict[str, Any] | None
) -> int | None:
    """Resolve call duration in seconds from usage_info or cost_info."""
    if isinstance(usage_info, dict) and usage_info.get("call_duration_seconds") is not None:
        return int(round(float(usage_info.get("call_duration_seconds") or 0)))
    if isinstance(cost_info, dict) and cost_info.get("call_duration_seconds") is not None:
        return int(round(float(cost_info.get("call_duration_seconds") or 0)))
    return None


def _parse_optional_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if raw.startswith("{"):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return parsed
            except (ValueError, TypeError):
                return {}
    return {}


def extract_public_extracted_data(
    extracted_data: dict[str, Any] | None,
    gathered_context: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Merge extracted_variables / gathered_context with run.extracted_data.

    Live campaign & workflow agents frequently persist structured extractions inside
    ``gathered_context['extracted_variables']`` while ``WorkflowRunModel.extracted_data``
    remains NULL. Exposing the merged map on ``extracted_data`` makes public API
    responses consistent with the CSV report export.
    """
    merged: dict[str, Any] = {}
    gathered = _parse_optional_dict(gathered_context)
    if gathered:
        for key, value in gathered.items():
            if key not in _TELEMETRY_ONLY_GATHERED_KEYS:
                merged[key] = value
        nested = _parse_optional_dict(
            gathered.get("extracted_variables")
            or gathered.get("extracted variables")
        )
        merged.update(nested)

    explicit = _parse_optional_dict(extracted_data)
    if explicit:
        merged.update(explicit)

    return merged or None


def format_public_usage_info(
    usage_info: dict | None,
    cost_info: dict | None = None,
) -> dict | None:
    """Return normalized public usage_info, backfilling duration from cost_info if needed."""
    has_usage_duration = (
        isinstance(usage_info, dict)
        and usage_info.get("call_duration_seconds") is not None
    )
    raw_duration = (
        usage_info.get("call_duration_seconds")
        if has_usage_duration
        else resolve_call_duration_seconds(usage_info, cost_info)
    )
    if not usage_info and raw_duration is None:
        return None

    base = usage_info if isinstance(usage_info, dict) else {}
    return {
        "llm": base.get("llm") or {},
        "tts": base.get("tts") or {},
        "stt": base.get("stt") or {},
        "call_duration_seconds": raw_duration,
    }


def format_public_cost_info(
    cost_info: dict | None, usage_info: dict | None
) -> dict | None:
    """Return the legacy response shape without doing local cost accounting."""
    duration = resolve_call_duration_seconds(usage_info, cost_info)

    dograh_token_usage = 0
    if cost_info:
        if "dograh_token_usage" in cost_info:
            dograh_token_usage = cost_info.get("dograh_token_usage") or 0
        elif "total_cost_usd" in cost_info:
            dograh_token_usage = round(
                float(cost_info.get("total_cost_usd", 0)) * 100, 2
            )

    if duration is None and dograh_token_usage == 0:
        return None

    return {
        "dograh_token_usage": dograh_token_usage,
        "call_duration_seconds": duration,
    }


def _resolve_attempt_metadata(
    initial: dict[str, Any], campaign_id: int | None
) -> tuple[int | None, bool | None]:
    raw_retry_attempt = initial.get("retry_attempt")
    raw_is_retry = initial.get("is_retry")
    is_retry: bool | None = (
        bool(raw_is_retry)
        if ("is_retry" in initial or "retry_attempt" in initial)
        else None
    )

    attempt_number: int | None = None
    if raw_retry_attempt is not None:
        try:
            attempt_number = int(raw_retry_attempt) + 1
            if is_retry is None:
                is_retry = attempt_number > 1
        except (TypeError, ValueError):
            attempt_number = None
    elif is_retry is True:
        attempt_number = 2
    elif campaign_id is not None or initial.get("campaign_id") is not None:
        attempt_number = 1

    return attempt_number, is_retry


def build_workflow_run_payload(
    run: Any,
    *,
    workflow_name: str | None = None,
    public_access_token: str | None = None,
    include_logs_and_annotations: bool = False,
) -> dict[str, Any]:
    """Serialize a WorkflowRunModel into a canonical WorkflowRunResponseSchema dict."""
    initial = _parse_optional_dict(getattr(run, "initial_context", None))
    gathered = _parse_optional_dict(getattr(run, "gathered_context", None))
    raw_usage = getattr(run, "usage_info", None)
    raw_cost = getattr(run, "cost_info", None)
    extra = getattr(run, "extra", None)

    token = (
        public_access_token
        if public_access_token is not None
        else getattr(run, "public_access_token", None)
    )
    has_user_rec = has_recording_track(extra, "user")
    has_bot_rec = has_recording_track(extra, "bot")

    transcript_public_url = artifact_url(
        token,
        "transcript",
        fallback=gathered.get("Transcript URL") if isinstance(gathered.get("Transcript URL"), str) else None,
    )
    recording_public_url = artifact_url(
        token,
        "recording",
        fallback=gathered.get("Recording URL") if isinstance(gathered.get("Recording URL"), str) else None,
    )

    usage_payload = format_public_usage_info(raw_usage, raw_cost)
    cost_payload = format_public_cost_info(raw_cost, raw_usage)
    duration_seconds = resolve_call_duration_seconds(raw_usage, raw_cost)
    disposition = (
        gathered.get("mapped_call_disposition")
        or gathered.get("call_disposition")
        or None
    )
    phone_number = (
        initial.get("phone_number")
        or initial.get("called_number")
        or initial.get("phone")
        or None
    )
    campaign_id = getattr(run, "campaign_id", None)
    attempt_number, is_retry = _resolve_attempt_metadata(initial, campaign_id)
    lead_id = initial.get("source_uuid") or None

    payload: dict[str, Any] = {
        "id": run.id,
        "workflow_id": run.workflow_id,
        "name": run.name,
        "mode": run.mode,
        "created_at": run.created_at,
        "is_completed": run.is_completed,
        "transcript_url": run.transcript_url,
        "recording_url": run.recording_url,
        "user_recording_url": get_recording_storage_key(extra, "user"),
        "bot_recording_url": get_recording_storage_key(extra, "bot"),
        "transcript_public_url": transcript_public_url,
        "recording_public_url": recording_public_url,
        "user_recording_public_url": (
            artifact_url(token, "user_recording") if has_user_rec else None
        ),
        "bot_recording_public_url": (
            artifact_url(token, "bot_recording") if has_bot_rec else None
        ),
        "public_access_token": token,
        "cost_info": cost_payload,
        "usage_info": usage_payload,
        "definition_id": run.definition_id,
        "initial_context": run.initial_context,
        "gathered_context": run.gathered_context,
        "call_type": run.call_type,
        "extracted_data": extract_public_extracted_data(
            getattr(run, "extracted_data", None),
            getattr(run, "gathered_context", None),
        ),
        "duration_seconds": duration_seconds,
        "disposition": str(disposition) if disposition is not None else None,
        "phone_number": str(phone_number) if phone_number is not None else None,
        "attempt_number": attempt_number,
        "is_retry": is_retry,
        "lead_id": str(lead_id) if lead_id is not None else None,
    }
    if workflow_name is not None:
        payload["workflow_name"] = workflow_name
    if include_logs_and_annotations:
        payload["logs"] = getattr(run, "logs", None)
        payload["annotations"] = getattr(run, "annotations", None)
    return payload
