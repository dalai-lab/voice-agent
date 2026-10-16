import csv
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.db.campaign_client import CampaignClient, ReportRunRow
from api.db.models import CampaignModel, QueuedRunModel, WorkflowRunModel
from api.services.reports.run_report import build_run_report_csv, generate_campaign_report_csv


class DummyRow:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


def test_build_run_report_csv_with_preflight_failure():
    # 1 normal completed run
    completed_run = DummyRow(
        id=101,
        campaign_id=1,
        workflow_id=5,
        definition_id=10,
        created_at=datetime(2026, 10, 16, 12, 0, 0, tzinfo=UTC),
        initial_context={"phone_number": "+1234567890", "first_name": "Alice"},
        gathered_context={
            "mapped_call_disposition": "completed",
            "call_tags": ["answered"],
            "extracted_variables": {"interest": "high"},
        },
        cost_info={},
        usage_info={"call_duration_seconds": 45},
        public_access_token="tok-1",
    )

    # 1 orphaned failed queued run (preflight failure)
    failed_queued_row = ReportRunRow(
        id=None,
        workflow_id=5,
        definition_id=None,
        campaign_id=1,
        created_at=datetime(2026, 10, 16, 12, 5, 0, tzinfo=UTC),
        initial_context={"phone_number": "+1987654321", "first_name": "Bob"},
        gathered_context={
            "mapped_call_disposition": "failed",
            "call_tags": ["preflight_failed", "carrier_pool_exhausted"],
            "extracted_variables": {"interest": ""},
        },
        cost_info={},
        usage_info={"call_duration_seconds": 0},
        public_access_token=None,
    )

    csv_output = build_run_report_csv([completed_run, failed_queued_row])
    reader = list(csv.reader(csv_output.getvalue().splitlines()))

    # Headers check
    headers = reader[0]
    assert headers[:8] == [
        "Run ID",
        "Campaign ID",
        "Agent ID",
        "Agent Definition ID",
        "Created At",
        "Phone Number",
        "Call Disposition",
        "Call Duration (s)",
    ]
    assert "interest" in headers
    assert headers[-3:] == ["Call Tags", "Transcript URL", "Recording URL"]

    # 2 data rows
    assert len(reader) == 3

    # Row 1 (completed)
    r1 = reader[1]
    assert r1[0] == "101"
    assert r1[1] == "1"
    assert r1[5] == "+1234567890"
    assert r1[6] == "completed"
    assert r1[7] == "45"

    # Row 2 (failed preflight)
    r2 = reader[2]
    assert r2[0] == ""  # Run ID is empty
    assert r2[1] == "1"
    assert r2[2] == "5"  # Agent ID from campaign workflow_id
    assert r2[5] == "+1987654321"  # Phone number preserved
    assert r2[6] == "failed"  # Call Disposition
    assert r2[7] == "0"  # Call Duration 0
    assert "preflight_failed" in r2[-3]  # Call Tags


@pytest.mark.asyncio
async def test_get_completed_runs_for_report_includes_orphaned_failed_runs():
    client = CampaignClient()

    # Mock session
    mock_session = AsyncMock()
    mock_campaign = CampaignModel(id=1, workflow_id=5, name="Test Campaign")
    mock_session.get.return_value = mock_campaign

    # Mock completed workflow run result
    mock_wf_row = DummyRow(
        id=200,
        workflow_id=5,
        definition_id=1,
        campaign_id=1,
        created_at=datetime(2026, 10, 16, 10, 0, tzinfo=UTC),
        initial_context={"phone_number": "+111"},
        gathered_context={"mapped_call_disposition": "completed"},
        cost_info={},
        usage_info={"call_duration_seconds": 60},
        public_access_token=None,
    )

    mock_wf_result = MagicMock()
    mock_wf_result.all.return_value = [mock_wf_row]

    # Mock orphaned failed queued run
    mock_queued = QueuedRunModel(
        id=15,
        campaign_id=1,
        source_uuid="csv_row_2",
        context_variables={"phone_number": "+222", "lead_name": "Charlie"},
        state="failed",
        created_at=datetime(2026, 10, 16, 10, 5, tzinfo=UTC),
        processed_at=datetime(2026, 10, 16, 10, 6, tzinfo=UTC),
        retry_reason="invalid_phone_number",
    )
    mock_queued_result = MagicMock()
    mock_queued_result.scalars.return_value.all.return_value = [mock_queued]

    # session.execute returns mock_wf_result on 1st call, mock_queued_result on 2nd call
    mock_session.execute = AsyncMock(side_effect=[mock_wf_result, mock_queued_result])

    with patch.object(client, "async_session") as mock_ctx:
        mock_ctx.return_value.__aenter__.return_value = mock_session
        runs = await client.get_completed_runs_for_report(campaign_id=1)

    assert len(runs) == 2
    # Verify both completed and orphaned failed are present
    dispositions = [r.gathered_context["mapped_call_disposition"] for r in runs]
    assert "completed" in dispositions
    assert "failed" in dispositions

    failed_item = next(r for r in runs if r.gathered_context["mapped_call_disposition"] == "failed")
    assert failed_item.initial_context["phone_number"] == "+222"
    assert "invalid_phone_number" in failed_item.gathered_context["call_tags"]
