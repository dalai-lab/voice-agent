from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import pytest

from api.tasks.workflow_completion import process_workflow_completion


@pytest.mark.asyncio
async def test_process_workflow_completion_sends_mode_to_talkar(monkeypatch):
    workflow_run = SimpleNamespace(
        id=123,
        mode="webrtc",
        usage_info={"call_duration_seconds": 45.2},
        workflow=SimpleNamespace(id=777, organization_id=99),
    )

    import api.tasks.workflow_completion as wc_mod

    monkeypatch.setattr(wc_mod, "DEPLOYMENT_MODE", "talkar")
    monkeypatch.setattr(wc_mod, "TALKAR_SERVICE_URL", "http://talkar.test")

    captured_payload = {}

    class MockAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        async def post(self, url, json=None, headers=None, timeout=None):
            captured_payload["url"] = url
            captured_payload["json"] = json
            res = AsyncMock()
            res.raise_for_status = AsyncMock()
            return res

    from api.db import db_client
    with (
        patch("api.tasks.workflow_completion.run_integrations_post_workflow_run", AsyncMock()),
        patch.object(db_client, "get_workflow_run_by_id", AsyncMock(return_value=workflow_run)),
        patch("httpx.AsyncClient", return_value=MockAsyncClient()),
    ):
        await process_workflow_completion(None, 123)

        assert captured_payload["url"] == "http://talkar.test/billing/deduct"
        assert captured_payload["json"] == {
            "workflow_run_id": 123,
            "duration_seconds": 46,
            "organization_id": 99,
            "mode": "webrtc",
            "workflow_id": 777,
        }


@pytest.mark.asyncio
async def test_process_workflow_completion_unconnected_zero_duration_sends_to_talkar(monkeypatch):
    """Verify unconnected calls (call_duration_seconds=0) immediately notify Talkar /billing/deduct in real time."""
    workflow_run = SimpleNamespace(
        id=456,
        mode="telephony_plivo",
        usage_info={"call_duration_seconds": 0},
        workflow=None,
        workflow_id=888,
    )

    import api.tasks.workflow_completion as wc_mod

    monkeypatch.setattr(wc_mod, "DEPLOYMENT_MODE", "talkar")
    monkeypatch.setattr(wc_mod, "TALKAR_SERVICE_URL", "http://talkar.test")

    captured_payload = {}

    class MockAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        async def post(self, url, json=None, headers=None, timeout=None):
            captured_payload["url"] = url
            captured_payload["json"] = json
            res = AsyncMock()
            res.raise_for_status = AsyncMock()
            return res

    from api.db import db_client
    with (
        patch("api.tasks.workflow_completion.run_integrations_post_workflow_run", AsyncMock()),
        patch.object(db_client, "get_workflow_run_by_id", AsyncMock(return_value=workflow_run)),
        patch.object(db_client, "get_workflow_organization_id", AsyncMock(return_value=55)),
        patch("httpx.AsyncClient", return_value=MockAsyncClient()),
    ):
        await process_workflow_completion(None, 456)

        assert captured_payload["url"] == "http://talkar.test/billing/deduct"
        assert captured_payload["json"] == {
            "workflow_run_id": 456,
            "duration_seconds": 0,
            "organization_id": 55,
            "mode": "telephony_plivo",
            "workflow_id": 888,
        }


@pytest.mark.asyncio
async def test_process_workflow_completion_retries_on_failure(monkeypatch):
    """Verify that when Talkar service is unreachable, process_workflow_completion re-enqueues with backoff."""
    workflow_run = SimpleNamespace(
        id=789,
        mode="telephony_plivo",
        usage_info={"call_duration_seconds": 30},
        workflow=SimpleNamespace(id=11, organization_id=22),
    )

    import api.tasks.workflow_completion as wc_mod

    monkeypatch.setattr(wc_mod, "DEPLOYMENT_MODE", "talkar")
    monkeypatch.setattr(wc_mod, "TALKAR_SERVICE_URL", "http://talkar.test")

    mock_enqueue = AsyncMock()
    from api.db import db_client
    with (
        patch("api.tasks.workflow_completion.run_integrations_post_workflow_run", AsyncMock()),
        patch.object(db_client, "get_workflow_run_by_id", AsyncMock(return_value=workflow_run)),
        patch("httpx.AsyncClient.post", AsyncMock(side_effect=Exception("Connection refused"))),
        patch("asyncio.sleep", AsyncMock()),
        patch("api.tasks.arq.enqueue_job", mock_enqueue),
    ):
        await process_workflow_completion(None, 789, attempt=1)

        mock_enqueue.assert_awaited_once()
        args, kwargs = mock_enqueue.await_args
        assert args[0] == "process_workflow_completion"
        assert args[1] == 789
        assert args[2] == 2  # next attempt
        assert kwargs["_defer_by"] == 15  # 15s backoff


@pytest.mark.asyncio
async def test_process_workflow_completion_parks_in_dlq_after_max_attempts(monkeypatch):
    """Verify that after exhausting all retries, the failed deduction is parked in Redis DLQ."""
    workflow_run = SimpleNamespace(
        id=999,
        mode="telephony_plivo",
        usage_info={"call_duration_seconds": 60},
        workflow=SimpleNamespace(id=11, organization_id=22),
    )

    import api.tasks.workflow_completion as wc_mod

    monkeypatch.setattr(wc_mod, "DEPLOYMENT_MODE", "talkar")
    monkeypatch.setattr(wc_mod, "TALKAR_SERVICE_URL", "http://talkar.test")

    mock_redis = AsyncMock()
    mock_redis.rpush = AsyncMock()
    from api.db import db_client
    with (
        patch("api.tasks.workflow_completion.run_integrations_post_workflow_run", AsyncMock()),
        patch.object(db_client, "get_workflow_run_by_id", AsyncMock(return_value=workflow_run)),
        patch("httpx.AsyncClient.post", AsyncMock(side_effect=Exception("503 Service Unavailable"))),
        patch("asyncio.sleep", AsyncMock()),
        patch("api.tasks.arq.get_arq_redis", AsyncMock(return_value=mock_redis)),
    ):
        await process_workflow_completion(None, 999, attempt=5)

        mock_redis.rpush.assert_awaited_once()
        args, _ = mock_redis.rpush.await_args
        assert args[0] == "talkar:billing:dlq"
        import json
        recorded = json.loads(args[1])
        assert recorded["workflow_run_id"] == 999
        assert recorded["attempts"] == 5
        assert "503 Service Unavailable" in recorded["error"]

