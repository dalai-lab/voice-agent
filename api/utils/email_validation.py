import asyncio
import unicodedata
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


def normalize_email(email: str) -> str:
    """Normalize email using Unicode NFKC, strip leading/trailing whitespace, and lowercase."""
    if not email:
        return ""
    normalized = unicodedata.normalize("NFKC", email.strip())
    return normalized.lower()


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
