from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import secrets
import bcrypt
import jwt
from api.constants import OSS_JWT_EXPIRY_HOURS, OSS_JWT_SECRET


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def generate_otp_code(length: int = 6) -> str:
    """Generate cryptographically secure N-digit numeric OTP."""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def hash_otp_code(code: str) -> str:
    """Compute SHA-256 hash of OTP code."""
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def verify_otp_code(code: str, stored_hash: str | None) -> bool:
    """Constant-time verification of OTP against stored SHA-256 hash."""
    if not stored_hash or not code:
        return False
    submitted_hash = hash_otp_code(code)
    return hmac.compare_digest(submitted_hash, stored_hash)


def create_jwt_token(user_id: int, email: str, scope: str = "authenticated") -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "scope": scope,
        "exp": datetime.now(UTC) + timedelta(hours=OSS_JWT_EXPIRY_HOURS),
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, OSS_JWT_SECRET, algorithm="HS256")


def decode_jwt_token(token: str) -> dict:
    return jwt.decode(token, OSS_JWT_SECRET, algorithms=["HS256"])
