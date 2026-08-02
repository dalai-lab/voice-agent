"""Pydantic schemas for workflow recording operations."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RecordingUploadResponseSchema(BaseModel):
    """Response schema with presigned upload URL."""

    upload_url: str = Field(..., description="Presigned URL for uploading the audio")
    recording_id: str = Field(..., description="Short unique recording ID")
    storage_key: str = Field(..., description="Storage key where file will be uploaded")


class FileDescriptor(BaseModel):
    """Descriptor for a single file in a batch upload request."""

    filename: str = Field(..., description="Original filename of the audio file")
    mime_type: str = Field(
        default="audio/wav", description="MIME type of the audio file"
    )
    file_size: int = Field(
        ...,
        gt=0,
        le=5_242_880,
        description="File size in bytes (max 5MB)",
    )


class BatchRecordingUploadRequestSchema(BaseModel):
    """Request schema for getting presigned upload URLs for one or more files."""

    files: list[FileDescriptor] = Field(
        ..., min_length=1, max_length=20, description="List of files to upload"
    )


class BatchRecordingUploadResponseSchema(BaseModel):
    """Response schema with presigned upload URLs."""

    items: list[RecordingUploadResponseSchema] = Field(
        ..., description="Upload URLs for each file"
    )


class RecordingCreateRequestSchema(BaseModel):
    """Request schema for creating a recording record after upload."""

    recording_id: str = Field(..., description="Short recording ID from upload step")
    tts_provider: str | None = Field(
        default=None, description="TTS provider (e.g. elevenlabs)"
    )
    tts_model: str | None = Field(default=None, description="TTS model name")
    tts_voice_id: str | None = Field(
        default=None, description="TTS voice identifier"
    )
    transcript: str = Field(
        ..., description="User-provided transcript of the recording"
    )
    storage_key: str = Field(..., description="Storage key from upload step")
    metadata: dict[str, Any] | None = Field(
        default=None, description="Optional metadata (file_size, duration, etc.)"
    )


class RecordingResponseSchema(BaseModel):
    """Response schema for a single recording."""

    id: int
    recording_id: str
    workflow_id: int | None = None
    organization_id: int
    tts_provider: str | None = None
    tts_model: str | None = None
    tts_voice_id: str | None = None
    transcript: str
    storage_key: str
    storage_backend: str
    metadata: dict[str, Any]
    created_by: int
    created_at: datetime
    is_active: bool


class BatchRecordingCreateRequestSchema(BaseModel):
    """Request schema for creating one or more recording records after upload."""

    recordings: list[RecordingCreateRequestSchema] = Field(
        ..., min_length=1, max_length=20, description="List of recordings to create"
    )


class BatchRecordingCreateResponseSchema(BaseModel):
    """Response schema for recording creation."""

    recordings: list[RecordingResponseSchema] = Field(
        ..., description="Created recording records"
    )


class RecordingUpdateRequestSchema(BaseModel):
    """Request schema for updating a recording's ID."""

    recording_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="New descriptive recording ID (letters, numbers, hyphens, underscores only)",
    )


class RecordingListResponseSchema(BaseModel):
    """Response schema for list of recordings."""

    recordings: list[RecordingResponseSchema]
    total: int
