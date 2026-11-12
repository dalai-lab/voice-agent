from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.db.campaign_client import CampaignClient
from api.db.models import CampaignModel
from api.enums import CallType
from api.routes.campaign import _build_campaign_response
from api.schemas.workflow import WorkflowRunResponseSchema
from api.services.campaign.runner import CampaignRunnerService
from api.services.reports.run_report import build_run_report_csv
from api.services.workflow.run_usage_response import (
    build_workflow_run_payload,
    extract_public_extracted_data,
    format_public_usage_info,
)


class _DummyRun:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


def test_build_workflow_run_payload_backfills_usage_extracted_data_and_telemetry():
    run = _DummyRun(
        id=9093,
        workflow_id=103,
        name="Campaign Run",
        mode="plivo",
        created_at=datetime(2026, 11, 12, 5, 50, 55, tzinfo=UTC),
        is_completed=True,
        recording_url="recordings/9093.wav",
        transcript_url="transcripts/9093.txt",
        extra={},
        cost_info={"dograh_token_usage": 0, "call_duration_seconds": 297},
        usage_info=None,
        definition_id=816,
        campaign_id=89,
        public_access_token=None,
        call_type=CallType.OUTBOUND,
        extracted_data=None,
        initial_context={
            "phone_number": "+917666835257",
            "name": "Candidate A",
            "is_retry": True,
            "retry_attempt": 1,
            "source_uuid": "lead-row-42",
            "campaign_id": 89,
        },
        gathered_context={
            "call_tags": ["user_qualified", "user_speech"],
            "provider": "plivo",
            "call_id": "e2c45a74-e49f-4304-a773-b72a66842a23",
            "mapped_call_disposition": "user_qualified",
            "extracted_variables": {
                "ai_score": "20",
                "l1_recommendation": "Reject",
                "expected_ctc": "25000-35000",
            },
            "Recording URL": "https://talkar.in/api/v1/public/download/workflow/tok-xyz/recording",
            "Transcript URL": "https://talkar.in/api/v1/public/download/workflow/tok-xyz/transcript",
        },
    )

    payload = build_workflow_run_payload(run)
    validated = WorkflowRunResponseSchema.model_validate(payload)

    assert validated.duration_seconds == 297
    assert validated.usage_info == {
        "llm": {},
        "tts": {},
        "stt": {},
        "call_duration_seconds": 297,
    }
    assert validated.cost_info == {
        "dograh_token_usage": 0,
        "call_duration_seconds": 297,
    }
    assert validated.extracted_data == {
        "ai_score": "20",
        "l1_recommendation": "Reject",
        "expected_ctc": "25000-35000",
    }
    assert validated.disposition == "user_qualified"
    assert validated.phone_number == "+917666835257"
    assert validated.attempt_number == 2
    assert validated.is_retry is True
    assert validated.lead_id == "lead-row-42"
    assert (
        validated.recording_public_url
        == "https://talkar.in/api/v1/public/download/workflow/tok-xyz/recording"
    )
    assert (
        validated.transcript_public_url
        == "https://talkar.in/api/v1/public/download/workflow/tok-xyz/transcript"
    )


def test_extract_public_extracted_data_explicit_precedence_and_json_string():
    gathered = {
        "call_tags": ["user_qualified"],
        "extracted variables": '{"ai_score": "63", "expected_ctc": "40000"}',
    }
    explicit = {"expected_ctc": "45000", "reviewer_note": "Confirmed"}

    merged = extract_public_extracted_data(explicit, gathered)
    assert merged == {
        "ai_score": "63",
        "expected_ctc": "45000",
        "reviewer_note": "Confirmed",
    }
    assert format_public_usage_info(None, {"call_duration_seconds": 100}) == {
        "llm": {},
        "tts": {},
        "stt": {},
        "call_duration_seconds": 100,
    }


def test_build_run_report_csv_falls_back_to_cost_info_duration():
    run = _DummyRun(
        id=9093,
        campaign_id=89,
        workflow_id=103,
        definition_id=816,
        created_at=datetime(2026, 11, 12, 5, 50, 55, tzinfo=UTC),
        initial_context={"phone_number": "+917666835257"},
        gathered_context={
            "mapped_call_disposition": "user_qualified",
            "extracted_variables": {"l1_recommendation": "Reject"},
        },
        usage_info=None,
        cost_info={"call_duration_seconds": 297},
        public_access_token="tok-1",
    )
    csv_text = build_run_report_csv([run]).getvalue()
    lines = csv_text.strip().splitlines()
    assert len(lines) == 2
    assert ",user_qualified,297," in lines[1]


@pytest.mark.asyncio
async def test_get_queued_runs_stats_does_not_double_count_exhausted_retries():
    """Campaign #89 invariant: 28 connected + 40 unanswered = 68 executed, 0 failed calls."""
    client = CampaignClient()
    mock_session = AsyncMock()
    client.async_session = MagicMock(return_value=mock_session)
    mock_session.__aenter__.return_value = mock_session

    mock_queued_result = MagicMock()
    mock_queued_result.all.return_value = [
        (89, "processed", 0, 0, 58),
        (89, "failed", 0, 1, 10),
    ]
    mock_wf_result = MagicMock()
    mock_wf_result.all.return_value = [
        (89, 0, 0, 40, 28),
    ]
    mock_orphaned_result = MagicMock()
    mock_orphaned_result.all.return_value = []
    mock_lead_result = MagicMock()
    mock_lead_result.all.return_value = [(89, 28, 10, 38)]
    mock_dur_result = MagicMock()
    mock_dur_result.all.return_value = [(89, 2659.0, 28)]

    mock_session.execute.side_effect = [
        mock_queued_result,
        mock_wf_result,
        mock_orphaned_result,
        mock_lead_result,
        mock_dur_result,
    ]

    stats = await client.get_queued_runs_stats_for_campaigns([89])
    s = stats[89]
    assert s["executed"] == 68
    assert s["completed_calls"] == 28
    assert s["unanswered_calls"] == 40
    assert s["failed_calls"] == 0
    assert s["completed_calls"] + s["unanswered_calls"] + s["failed_calls"] + s["active"] == s["executed"]
    assert s["connected_leads"] == 28
    assert s["unreached_leads"] == 10
    assert s["total_duration_seconds"] == 2659
    assert s["avg_connected_duration_seconds"] == 95


def test_build_campaign_response_heals_inflated_lead_rows():
    """Campaign #82 invariant: 17 connected + 14 unreached = 31 total_rows (not 17 + 16 = 33)."""
    campaign = MagicMock(spec=CampaignModel)
    campaign.id = 82
    campaign.name = "Campaign 82"
    campaign.workflow_id = 103
    campaign.state = "completed"
    campaign.source_type = "csv"
    campaign.source_id = "leads.csv"
    campaign.total_rows = 31
    campaign.processed_rows = 30
    campaign.failed_rows = 16
    campaign.created_at = datetime.now(UTC)
    campaign.started_at = None
    campaign.completed_at = None
    campaign.retry_config = None
    campaign.orchestrator_metadata = {}
    campaign.telephony_configuration_id = None
    campaign.logs = []

    stats = {
        "total": 55,
        "executed": 55,
        "active": 0,
        "pending": 0,
        "scheduled_retries": 0,
        "retry_attempts": 24,
        "completed_calls": 17,
        "failed_calls": 9,
        "unanswered_calls": 29,
        "connected_leads": 17,
        "unreached_leads": 14,
        "processed_leads": 31,
        "total_duration_seconds": 1165,
        "avg_connected_duration_seconds": 69,
    }

    resp = _build_campaign_response(campaign, workflow_name="Agent", stats=stats)
    assert resp.processed_rows == 31
    assert resp.failed_rows == 14
    assert resp.connected_leads_count == 17
    assert resp.unreached_leads_count == 14
    assert resp.connected_leads_count + resp.unreached_leads_count == resp.total_rows
    assert (
        resp.completed_calls_count
        + resp.failed_calls_count
        + resp.unanswered_calls_count
        + resp.active_count
        == resp.executed_count
    )
    assert resp.total_duration_seconds == 1165
    assert resp.avg_connected_duration_seconds == 69


@pytest.mark.asyncio
async def test_get_campaign_status_prevents_100_percent_while_retries_scheduled():
    runner = CampaignRunnerService()
    mock_campaign = MagicMock(spec=CampaignModel)
    mock_campaign.id = 90
    mock_campaign.state = "running"
    mock_campaign.total_rows = 10
    mock_campaign.processed_rows = 10
    mock_campaign.failed_rows = 0
    mock_campaign.source_sync_status = "completed"
    mock_campaign.source_last_synced_at = None
    mock_campaign.source_sync_error = None
    mock_campaign.rate_limit_per_second = 1
    mock_campaign.started_at = None
    mock_campaign.completed_at = None

    with patch("api.services.campaign.runner.db_client") as mock_db:
        mock_db.get_campaign_by_id = AsyncMock(return_value=mock_campaign)
        mock_db.get_queued_runs_stats_for_campaigns = AsyncMock(
            return_value={
                90: {
                    "executed": 10,
                    "active": 0,
                    "pending": 0,
                    "scheduled_retries": 3,
                    "completed_calls": 7,
                    "unanswered_calls": 3,
                    "failed_calls": 0,
                    "connected_leads": 7,
                    "unreached_leads": 0,
                    "processed_leads": 10,
                }
            }
        )
        status = await runner.get_campaign_status(90)

    assert status["progress_percentage"] == 70.0
    assert status["scheduled_retries"] == 3
    assert status["failed_leads"] == 0
    assert status["failed_calls"] == 0

