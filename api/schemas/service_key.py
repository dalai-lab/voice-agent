from datetime import datetime

from pydantic import BaseModel


class ServiceKeyBase(BaseModel):
    name: str


class CreateServiceKeyRequest(ServiceKeyBase):
    expires_in_days: int | None = 90


class ServiceKeyResponse(ServiceKeyBase):
    id: int  # Database stores as int
    key_prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    archived_at: datetime | None = None
    created_by: str | None = None  # provider_id from auth

    class Config:
        from_attributes = True


class CreateServiceKeyResponse(BaseModel):
    id: int  # Database stores as int
    name: str
    service_key: str  # Only returned on creation
    key_prefix: str
    expires_at: datetime | None = None

    class Config:
        from_attributes = True
