from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.mcp_server.tools.knowledge_base import (
    create_knowledge_base_document,
    delete_knowledge_base_document,
    get_document_status,
)


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.id = 101
    user.provider_id = "provider-user-123"
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_create_knowledge_base_document_success(authed_user: MagicMock):
    mock_doc = SimpleNamespace(id=999, document_uuid="test-uuid-123")

    with (
        patch(
            "api.mcp_server.tools.knowledge_base.authenticate_mcp_request",
            AsyncMock(return_value=authed_user),
        ),
        patch(
            "api.mcp_server.tools.knowledge_base.storage_fs.acreate_file_from_bytes",
            AsyncMock(return_value=True),
        ),
        patch(
            "api.mcp_server.tools.knowledge_base.db_client.create_document",
            AsyncMock(return_value=mock_doc),
        ),
        patch(
            "api.mcp_server.tools.knowledge_base.enqueue_job",
            AsyncMock(return_value=None),
        ),
    ):
        result = await create_knowledge_base_document(
            filename="faq.md",
            content="# FAQ\nThis is resort FAQ.",
            retrieval_mode="chunked",
        )

    assert result["created"] is True
    assert result["filename"] == "faq.md"
    assert result["retrieval_mode"] == "chunked"
    assert result["processing_status"] == "pending"
    assert "document_uuid" in result


@pytest.mark.asyncio
async def test_create_knowledge_base_document_no_org():
    user = MagicMock()
    user.selected_organization_id = None

    with patch(
        "api.mcp_server.tools.knowledge_base.authenticate_mcp_request",
        AsyncMock(return_value=user),
    ):
        result = await create_knowledge_base_document(
            filename="faq.md",
            content="Some text",
        )

    assert result["created"] is False
    assert result["error_code"] == "organization_required"


@pytest.mark.asyncio
async def test_create_knowledge_base_document_file_too_large(authed_user: MagicMock):
    large_content = "x" * (5 * 1024 * 1024 + 10)

    with patch(
        "api.mcp_server.tools.knowledge_base.authenticate_mcp_request",
        AsyncMock(return_value=authed_user),
    ):
        result = await create_knowledge_base_document(
            filename="big.txt",
            content=large_content,
        )

    assert result["created"] is False
    assert result["error_code"] == "file_too_large"


@pytest.mark.asyncio
async def test_get_document_status_success(authed_user: MagicMock):
    mock_doc = SimpleNamespace(
        document_uuid="doc-uuid-1",
        filename="policies.md",
        processing_status="completed",
        processing_error=None,
        retrieval_mode="chunked",
        total_chunks=8,
        file_size_bytes=1024,
        created_at=None,
    )

    with (
        patch(
            "api.mcp_server.tools.knowledge_base.authenticate_mcp_request",
            AsyncMock(return_value=authed_user),
        ),
        patch(
            "api.mcp_server.tools.knowledge_base.db_client.get_document_by_uuid",
            AsyncMock(return_value=mock_doc),
        ),
    ):
        result = await get_document_status("doc-uuid-1")

    assert result["found"] is True
    assert result["document_uuid"] == "doc-uuid-1"
    assert result["filename"] == "policies.md"
    assert result["processing_status"] == "completed"
    assert result["total_chunks"] == 8


@pytest.mark.asyncio
async def test_get_document_status_not_found(authed_user: MagicMock):
    with (
        patch(
            "api.mcp_server.tools.knowledge_base.authenticate_mcp_request",
            AsyncMock(return_value=authed_user),
        ),
        patch(
            "api.mcp_server.tools.knowledge_base.db_client.get_document_by_uuid",
            AsyncMock(return_value=None),
        ),
    ):
        result = await get_document_status("nonexistent-uuid")

    assert result["found"] is False
    assert result["error_code"] == "document_not_found"


@pytest.mark.asyncio
async def test_delete_knowledge_base_document_success(authed_user: MagicMock):
    with (
        patch(
            "api.mcp_server.tools.knowledge_base.authenticate_mcp_request",
            AsyncMock(return_value=authed_user),
        ),
        patch(
            "api.mcp_server.tools.knowledge_base.db_client.delete_document",
            AsyncMock(return_value=True),
        ),
    ):
        result = await delete_knowledge_base_document("doc-uuid-1")

    assert result["deleted"] is True
    assert result["document_uuid"] == "doc-uuid-1"


@pytest.mark.asyncio
async def test_delete_knowledge_base_document_not_found(authed_user: MagicMock):
    with (
        patch(
            "api.mcp_server.tools.knowledge_base.authenticate_mcp_request",
            AsyncMock(return_value=authed_user),
        ),
        patch(
            "api.mcp_server.tools.knowledge_base.db_client.delete_document",
            AsyncMock(return_value=False),
        ),
    ):
        result = await delete_knowledge_base_document("nonexistent-uuid")

    assert result["deleted"] is False
    assert result["error_code"] == "document_not_found"
