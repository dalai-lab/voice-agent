from pydantic import BaseModel, EmailStr, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str | None
    name: str | None = None
    organization_id: int | None = None
    provider_id: str | None = None
    talkar_org_type: str | None = None
    is_verified: bool = True


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    is_verified: bool = True
    message: str | None = None


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ChangeSignupEmailRequest(BaseModel):
    current_email: EmailStr
    new_email: EmailStr
    password: str


class SendCodeRequest(BaseModel):
    email: EmailStr


class LoginWithCodeRequest(BaseModel):
    email: EmailStr
    code: str

