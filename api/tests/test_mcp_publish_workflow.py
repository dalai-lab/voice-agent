from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
import pytest

from api.mcp_server.tools.publish_workflow import publish_workflow


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.id = 123
    user.provider_id = "user_abc"
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_publish_workflow_not_found(authed_user: MagicMock):
    with (
        patch("api.mcp_server.tools.publish_workflow.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.publish_workflow.db_client.get_workflow", AsyncMock(return_value=None)),
    ):
        result = await publish_workflow(workflow_id=999)

    assert result["published"] is False
    assert result["error_code"] == "not_found"


@pytest.mark.asyncio
async def test_publish_workflow_archived(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(
        id=7,
        name="Archived Agent",
        status="archived",
    )

    with (
        patch("api.mcp_server.tools.publish_workflow.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.publish_workflow.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
    ):
        result = await publish_workflow(workflow_id=7)

    assert result["published"] is False
    assert result["error_code"] == "workflow_archived"


@pytest.mark.asyncio
async def test_publish_workflow_no_draft(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(
        id=7,
        name="Live Agent",
        status="active",
    )

    with (
        patch("api.mcp_server.tools.publish_workflow.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.publish_workflow.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.publish_workflow.db_client.get_draft_version", AsyncMock(return_value=None)),
    ):
        result = await publish_workflow(workflow_id=7)

    assert result["published"] is False
    assert result["error_code"] == "no_draft"


@pytest.mark.asyncio
async def test_publish_workflow_success(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(
        id=7,
        name="Support Agent",
        status="active",
    )
    mock_draft = SimpleNamespace(
        id=101,
        workflow_id=7,
        version_number=2,
        status="draft",
        workflow_json={
            "nodes": [
                {
                    "id": "1",
                    "type": "startCall",
                    "position": {"x": 0, "y": 0},
                    "data": {"name": "Start", "prompt": "Hello"},
                },
                {
                    "id": "2",
                    "type": "endCall",
                    "position": {"x": 100, "y": 0},
                    "data": {"name": "End", "prompt": "Goodbye"},
                },
            ],
            "edges": [
                {
                    "id": "e1-2",
                    "source": "1",
                    "target": "2",
                    "data": {"label": "done", "condition": "done"},
                }
            ],
        },
    )
    mock_published = SimpleNamespace(
        id=101,
        workflow_id=7,
        version_number=2,
        status="published",
        published_at=None,
    )

    with (
        patch("api.mcp_server.tools.publish_workflow.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.publish_workflow.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.publish_workflow.db_client.get_draft_version", AsyncMock(return_value=mock_draft)),
        patch("api.mcp_server.tools.publish_workflow.validate_workflow_tool_name_collisions", AsyncMock(return_value=[])),
        patch("api.mcp_server.tools.publish_workflow.db_client.check_trigger_path_conflicts", AsyncMock(return_value=[])),
        patch("api.mcp_server.tools.publish_workflow.db_client.publish_workflow_draft", AsyncMock(return_value=mock_published)),
        patch("api.mcp_server.tools.publish_workflow.capture_event", MagicMock()),
    ):
        result = await publish_workflow(workflow_id=7)

    assert result["published"] is True
    assert result["workflow_id"] == 7
    assert result["version_number"] == 2
    assert result["status"] == "published"
