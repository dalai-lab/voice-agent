"""MCP Tools for Knowledge Base Document Ingestion and Lifecycle Management."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from loguru import logger

from api.db import db_client
from api.mcp_server.auth import authenticate_mcp_request
from api.mcp_server.tracing import traced_tool
from api.services.storage import storage_fs
from api.tasks.arq import enqueue_job
from api.tasks.function_names import FunctionNames


def _error_result(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"created": False, "error_code": code, "error": message, **extra}


@traced_tool
async def create_knowledge_base_document(
    filename: str,
    content: str,
    retrieval_mode: Literal["chunked", "full_document"] = "chunked",
) -> dict[str, Any]:
    """Create and ingest a new Knowledge Base document from text or Markdown content.

    Automatically stores the file in object storage and enqueues background
    vector chunking and embedding. Use 'chunked' (splits into 128-token semantic
    chunks using configured embedding model) or 'full_document' (retains 100%
    verbatim text without requiring an embeddings API key).

    On success, returns created=True and document_uuid to be used in workflow
    node 'document_uuids'. On failure, returns created=False, a machine-readable
    error_code, and human-readable error. Possible error_code values:
    - organization_required — the user has no active organization selected.
    - file_too_large — document content exceeds the 5 MB maximum file limit.
    - storage_upload_failed — writing document bytes to object storage failed.
    - database_error — inserting document metadata record into database failed.
    - enqueue_failed — dispatching background processing worker job failed.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return _error_result(
            "organization_required", "The authenticated user has no selected organization."
        )

    content_bytes = content.encode("utf-8")
    if len(content_bytes) > 5 * 1024 * 1024:
        return _error_result(
            "file_too_large",
            f"Document content size ({len(content_bytes)} bytes) exceeds the 5 MB maximum limit.",
        )

    clean_filename = filename.strip().replace(" ", "_")
    if not any(clean_filename.endswith(ext) for ext in [".md", ".txt", ".json", ".csv", ".pdf"]):
        clean_filename += ".md"

    document_uuid = str(uuid.uuid4())
    s3_key = f"knowledge_base/{org_id}/{document_uuid}/{clean_filename}"

    try:
        await storage_fs.acreate_file_from_bytes(s3_key, content_bytes)
    except Exception as e:
        logger.error(f"Failed to upload KB document to storage: {e}")
        return _error_result(
            "storage_upload_failed",
            f"Failed to persist document to storage: {str(e)}",
        )

    try:
        document = await db_client.create_document(
            organization_id=org_id,
            created_by=user.id,
            filename=clean_filename,
            file_size_bytes=len(content_bytes),
            file_hash="",
            mime_type="text/markdown" if clean_filename.endswith(".md") else "text/plain",
            custom_metadata={"s3_key": s3_key, "source": "mcp"},
            document_uuid=document_uuid,
            retrieval_mode=retrieval_mode,
        )
    except Exception as e:
        logger.error(f"Failed to insert document record into DB: {e}")
        return _error_result(
            "database_error",
            f"Failed to create document record: {str(e)}",
        )

    try:
        await enqueue_job(
            FunctionNames.PROCESS_KNOWLEDGE_BASE_DOCUMENT,
            document.id,
            s3_key,
            org_id,
            str(user.provider_id),
            128,  # max_tokens per chunk
            retrieval_mode,
        )
    except Exception as e:
        logger.error(f"Failed to enqueue document processing job: {e}")
        return _error_result(
            "enqueue_failed",
            f"Failed to enqueue background processing job: {str(e)}",
        )

    logger.info(f"Ingested KB document {document_uuid} via MCP for org {org_id}")

    return {
        "created": True,
        "document_uuid": document_uuid,
        "filename": clean_filename,
        "retrieval_mode": retrieval_mode,
        "processing_status": "pending",
        "message": "Document created and background vector embedding enqueued successfully.",
    }


@traced_tool
async def get_document_status(document_uuid: str) -> dict[str, Any]:
    """Check processing status, total chunks, and metadata for a document.

    On success, returns found=True, processing_status ('pending', 'processing',
    'completed', 'failed'), retrieval_mode, and total_chunks. On failure, returns
    found=False, error_code, and error. Possible error_code values:
    - organization_required — the user has no active organization selected.
    - document_not_found — document_uuid not found in this organization.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return {
            "found": False,
            "error_code": "organization_required",
            "error": "The authenticated user has no selected organization.",
        }

    doc = await db_client.get_document_by_uuid(
        document_uuid=document_uuid,
        organization_id=org_id,
    )
    if not doc:
        return {
            "found": False,
            "error_code": "document_not_found",
            "error": f"Document '{document_uuid}' not found in this organization.",
        }

    return {
        "found": True,
        "document_uuid": doc.document_uuid,
        "filename": doc.filename,
        "processing_status": doc.processing_status,
        "processing_error": getattr(doc, "processing_error", None),
        "retrieval_mode": getattr(doc, "retrieval_mode", "chunked"),
        "total_chunks": doc.total_chunks,
        "file_size_bytes": doc.file_size_bytes,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@traced_tool
async def delete_knowledge_base_document(document_uuid: str) -> dict[str, Any]:
    """Soft-delete a Knowledge Base document and mark its vector chunks inactive.

    On success, returns deleted=True. On failure, returns deleted=False,
    error_code, and error. Possible error_code values:
    - organization_required — the user has no active organization selected.
    - document_not_found — document_uuid not found in this organization.
    """
    user = await authenticate_mcp_request()
    org_id = user.selected_organization_id
    if not org_id:
        return {
            "deleted": False,
            "error_code": "organization_required",
            "error": "The authenticated user has no selected organization.",
        }

    success = await db_client.delete_document(
        document_uuid=document_uuid,
        organization_id=org_id,
    )
    if not success:
        return {
            "deleted": False,
            "error_code": "document_not_found",
            "error": f"Document '{document_uuid}' not found in this organization.",
        }

    logger.info(f"Deleted KB document {document_uuid} via MCP for org {org_id}")

    return {
        "deleted": True,
        "document_uuid": document_uuid,
        "message": f"Document '{document_uuid}' deleted successfully.",
    }
