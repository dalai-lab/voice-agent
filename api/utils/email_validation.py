import asyncio
import time
import unicodedata
from collections import defaultdict
from loguru import logger
import dns.resolver

DISPOSABLE_DOMAINS = {
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "tempmail.com",
    "throwawaymail.com",
    "yopmail.com",
    "sharklasers.com",
    "guerrillamail.info",
    "grr.la",
    "guerrillamail.biz",
    "guerrillamail.de",
    "guerrillamail.net",
    "guerrillamail.org",
    "fakeinbox.com",
    "trashmail.com",
    "dispostable.com",
    "mailnull.com",
    "temp-mail.org",
    "maildrop.cc",
    "burnermail.io",
}

# In-memory sliding window cache for hourly rate limiting: {canonical_email: [timestamps]}
_HOURLY_WINDOW_CACHE: dict[str, list[float]] = defaultdict(list)


def normalize_email(email: str) -> str:
    """Normalize email using Unicode NFKC, strip leading/trailing whitespace, and lowercase."""
    if not email:
        return ""
    normalized = unicodedata.normalize("NFKC", email.strip())
    return normalized.lower()


def get_canonical_email(email: str) -> str:
    """
    Compute canonical representation of an email for rate-limiting and anti-abuse.
    Strips sub-addressing (+alias) and standardizes domain (e.g. googlemail -> gmail).
    """
    normalized = normalize_email(email)
    if not normalized or "@" not in normalized:
        return normalized

    local, domain = normalized.split("@", 1)
    if "+" in local:
        local = local.split("+", 1)[0]

    if domain in {"googlemail.com"}:
        domain = "gmail.com"

    return f"{local}@{domain}"


def is_disposable_email(email: str) -> bool:
    """Check if the email domain belongs to a known disposable/burner email service."""
    if not email or "@" not in email:
        return False
    domain = email.split("@")[1].strip().lower()
    return domain in DISPOSABLE_DOMAINS


def _sync_check_mx(domain: str) -> bool:
    try:
        resolver = dns.resolver.Resolver()
        resolver.lifetime = 3.0
        resolver.timeout = 2.0
        # Try MX query first
        try:
            resolver.resolve(domain, "MX")
            return True
        except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
            pass
        # Fallback to A record (RFC 5321 Section 5.1 fallback)
        try:
            resolver.resolve(domain, "A")
            return True
        except Exception:
            return False
    except Exception:
        return False


async def validate_domain_mx(email: str) -> bool:
    """
    Validate that the domain of the given email has valid MX or A DNS records.
    Returns True if valid or if domain is an exempt test domain (e.g. example.com, test.com), False otherwise.
    """
    if not email or "@" not in email:
        return False
    domain = email.split("@")[1].strip().lower()
    if domain in {"example.com", "example.org", "test.com", "localhost"}:
        return True

    return await asyncio.to_thread(_sync_check_mx, domain)


async def check_and_increment_hourly_verification_rate_limit(
    email: str, max_requests: int = 5, window_seconds: int = 3600
) -> tuple[bool, int]:
    """
    Enforce max 5 verification/resend requests per rolling hour per canonical email address.
    Returns:
        (allowed: bool, retry_after_seconds: int)
    """
    canonical = get_canonical_email(email)
    now = time.time()

    # 1. Attempt Redis-based rate limiting if available
    try:
        from api.constants import REDIS_URL
        import redis.asyncio as aioredis
        client = await aioredis.from_url(REDIS_URL, decode_responses=True)
        try:
            key = f"email_verify_rate:{canonical}"
            # Clean elements older than rolling hour
            await client.zremrangebyscore(key, 0, now - window_seconds)
            current_count = await client.zcard(key)

            if current_count >= max_requests:
                # Find oldest entry to calculate precise retry-after
                oldest_entries = await client.zrange(key, 0, 0, withscores=True)
                if oldest_entries:
                    oldest_ts = oldest_entries[0][1]
                    retry_after = max(1, int(window_seconds - (now - oldest_ts)))
                else:
                    retry_after = window_seconds
                return False, retry_after

            # Record this attempt
            await client.zadd(key, {str(now): now})
            await client.expire(key, window_seconds + 60)
            return True, 0
        finally:
            await client.aclose()
    except Exception:
        # Fallback to in-memory sliding window cache
        timestamps = _HOURLY_WINDOW_CACHE[canonical]
        # Purge entries older than rolling hour
        _HOURLY_WINDOW_CACHE[canonical] = [ts for ts in timestamps if now - ts < window_seconds]
        active_timestamps = _HOURLY_WINDOW_CACHE[canonical]

        if len(active_timestamps) >= max_requests:
            oldest_ts = active_timestamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest_ts)))
            return False, retry_after

        _HOURLY_WINDOW_CACHE[canonical].append(now)
        return True, 0
