from unittest.mock import AsyncMock, MagicMock, patch, call
import pytest
from api.db.campaign_client import CampaignClient
from api.services.campaign.sources.csv import CSVSyncService


@pytest.mark.asyncio
async def test_bulk_create_queued_runs_chunks_and_uses_on_conflict():
    """Verify bulk_create_queued_runs executes in batches with ON CONFLICT DO NOTHING."""
    client = CampaignClient()
    mock_session = AsyncMock()
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_session
    mock_session_ctx.__aexit__.return_value = None
    client.async_session = MagicMock(return_value=mock_session_ctx)

    # 4,500 test items with batch_size=2,000 should result in 3 chunks: 2000, 2000, 500
    test_data = [
        {
            "campaign_id": 10,
            "source_uuid": f"uuid-{i}",
            "context_variables": {"phone_number": f"+1555000{i:04d}"},
            "state": "queued",
        }
        for i in range(4500)
    ]

    await client.bulk_create_queued_runs(test_data, batch_size=2000)

    # 3 execute calls and 3 commit calls
    assert mock_session.execute.await_count == 3
    assert mock_session.commit.await_count == 3

    # Inspect the compiled SQL statement of the first call
    executed_stmt = mock_session.execute.await_args_list[0].args[0]
    compiled_sql = str(executed_stmt)
    assert "INSERT INTO queued_runs" in compiled_sql
    assert "ON CONFLICT (campaign_id, source_uuid, retry_count) DO NOTHING" in compiled_sql


@pytest.mark.asyncio
async def test_bulk_create_queued_runs_idempotent_on_retry():
    """Verify bulk_create_queued_runs uses on_conflict_do_nothing so retries do not raise IntegrityError."""
    client = CampaignClient()
    mock_session = AsyncMock()
    mock_session_ctx = AsyncMock()
    mock_session_ctx.__aenter__.return_value = mock_session
    mock_session_ctx.__aexit__.return_value = None
    client.async_session = MagicMock(return_value=mock_session_ctx)

    duplicate_rows = [
        {"campaign_id": 1, "source_uuid": "lead_1", "context_variables": {}, "state": "queued"},
        {"campaign_id": 1, "source_uuid": "lead_1", "context_variables": {}, "state": "queued"},
    ]

    await client.bulk_create_queued_runs(duplicate_rows)
    executed_stmt = mock_session.execute.await_args_list[0].args[0]
    assert "ON CONFLICT (campaign_id, source_uuid, retry_count) DO NOTHING" in str(executed_stmt)


@pytest.mark.asyncio
async def test_bulk_create_queued_runs_empty_data():
    """Verify bulk_create_queued_runs returns immediately on empty data."""
    client = CampaignClient()
    mock_session_ctx = MagicMock()
    client.async_session = mock_session_ctx

    await client.bulk_create_queued_runs([])
    mock_session_ctx.assert_not_called()


@pytest.mark.asyncio
async def test_csv_sync_source_data_chunks_ingestion():
    """Verify CSVSyncService flushes queued runs in batches of 2000 instead of a monolithic array."""
    service = CSVSyncService()
    campaign_id = 99

    # Generate 4,500 CSV rows
    header = ["Name", "phone_number", "City"]
    rows = [header] + [[f"User {i}", f"+1555{i:06d}", "Testville"] for i in range(1, 4501)]

    with (
        patch("api.services.campaign.sources.csv.db_client") as mock_db,
        patch.object(service, "_fetch_csv_data", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_db.get_campaign_by_id = AsyncMock(
            return_value=MagicMock(id=campaign_id, source_id="campaign_leads.csv")
        )
        mock_db.bulk_create_queued_runs = AsyncMock()
        mock_db.update_campaign = AsyncMock()
        mock_fetch.return_value = rows

        total_synced = await service.sync_source_data(campaign_id)

        assert total_synced == 4500
        # 4,500 rows should flush in 3 batches: 2000, 2000, 500
        assert mock_db.bulk_create_queued_runs.await_count == 3
        first_call = mock_db.bulk_create_queued_runs.await_args_list[0]
        second_call = mock_db.bulk_create_queued_runs.await_args_list[1]
        third_call = mock_db.bulk_create_queued_runs.await_args_list[2]

        assert len(first_call.args[0]) == 2000
        assert len(second_call.args[0]) == 2000
        assert len(third_call.args[0]) == 500

        mock_db.update_campaign.assert_awaited_once_with(
            campaign_id=campaign_id,
            total_rows=4500,
            source_sync_status="completed",
        )
