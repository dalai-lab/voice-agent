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
