from datetime import UTC, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from api.constants import ENABLE_SIGNUP, DEPLOYMENT_MODE, TALKAR_SERVICE_URL
from api.db import db_client
from api.db.models import UserModel
from api.enums import OrganizationConfigurationKey, PostHogEvent
from api.schemas.auth import (
    AuthResponse,
    LoginRequest,
    SignupRequest,
    UserResponse,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ChangeSignupEmailRequest,
    SendCodeRequest,
    LoginWithCodeRequest,
)
from api.utils.email_validation import (
    normalize_email,
    is_disposable_email,
    validate_domain_mx,
)
from api.services.auth.depends import (
    create_user_configuration_with_mps_key,
    get_user,
    require_local_auth,
)
from api.services.configuration.ai_model_configuration import (
    convert_legacy_ai_model_configuration_to_v2,
)
from api.services.posthog_client import capture_event
from api.utils.auth import (
    create_jwt_token,
    generate_otp_code,
    hash_otp_code,
    hash_password,
    verify_otp_code,
    verify_password,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


async def _dispatch_verification_email(to_email: str, otp_code: str) -> bool:
    """Dispatch verification OTP to Talkar notification service."""
    from api.constants import DEPLOYMENT_MODE, TALKAR_SERVICE_URL, TALKAR_BILLING_API_TOKEN
    if DEPLOYMENT_MODE == "talkar":
        import httpx
        try:
            headers = {}
            if TALKAR_BILLING_API_TOKEN:
                headers["Authorization"] = f"Bearer {TALKAR_BILLING_API_TOKEN}"
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{TALKAR_SERVICE_URL}/notifications/send-verification-email",
                    headers=headers,
                    json={"to_email": to_email, "otp_code": otp_code},
                    timeout=5.0
                )
                return res.status_code == 200
        except Exception as e:
            logger.warning(f"Failed to dispatch verification email via Talkar: {e}")
            return False
    else:
        logger.info(f"[OSS Mode] Verification code for {to_email}: {otp_code}")
        return True


async def _activate_user_and_provision_workspace(
    user: UserModel, normalized_email: str
) -> AuthResponse:
    # 1. Mark verified and clear verification code
    await db_client.mark_user_email_verified(user.id)

    # 2. Provision organization if not already provisioned
    organization = None
    if not user.selected_organization_id:
        org_provider_id = f"org_{user.provider_id}"
        organization, _ = await db_client.get_or_create_organization_by_provider_id(
            org_provider_id=org_provider_id, user_id=user.id
        )
        await db_client.add_user_to_organization(user.id, organization.id)
        await db_client.update_user_selected_organization(user.id, organization.id)

        try:
            mps_config = await create_user_configuration_with_mps_key(
                user.id, organization.id, user.provider_id
            )
            if mps_config:
                await db_client.update_user_configuration(user.id, mps_config)
                model_config_v2 = convert_legacy_ai_model_configuration_to_v2(mps_config)
                await db_client.upsert_configuration(
                    organization.id,
                    OrganizationConfigurationKey.MODEL_CONFIGURATION_V2.value,
                    model_config_v2.model_dump(mode="json", exclude_none=True),
                )
        except Exception:
            logger.warning("Failed to create default configuration for user", exc_info=True)

        if DEPLOYMENT_MODE == "talkar":
            from api.constants import TALKAR_BILLING_API_TOKEN
            import httpx
            try:
                headers = {}
                if TALKAR_BILLING_API_TOKEN:
                    headers["Authorization"] = f"Bearer {TALKAR_BILLING_API_TOKEN}"
                async with httpx.AsyncClient() as client:
                    try:
                        res = await client.post(
                            f"{TALKAR_SERVICE_URL}/customers/",
                            headers=headers,
                            json={
                                "email": normalized_email,
                                "contact_name": user.email.split('@')[0],
                                "dograh_org_id": organization.id,
                                "dograh_user_id": user.id,
                            },
                            timeout=5.0,
                        )
                        res.raise_for_status()
                    except httpx.HTTPStatusError as e:
                        if e.response.status_code == 429:
                            logger.warning(
                                f"Rate limited creating Talkar customer for org {organization.id}; falling back to existing customer state"
                            )
                        else:
                            raise

                await db_client.upsert_configuration(
                    organization.id,
                    OrganizationConfigurationKey.TALKAR_ORG_TYPE.value,
                    "customer",
                )
            except Exception as e:
                response_text = e.response.text if hasattr(e, "response") else ""
                logger.error(
                    f"Failed to trigger Talkar signup webhook for user {user.id}: {e}. Response: {response_text}"
                )

    org_id = user.selected_organization_id or (organization.id if organization else None)

    capture_event(
        distinct_id=str(user.provider_id),
        event=PostHogEvent.SIGNED_UP,
        properties={
            "organization_id": org_id,
            "auth_provider": "local",
        },
    )

    # 3. Session Regeneration: issue full access JWT
    token = create_jwt_token(user.id, normalized_email, scope="authenticated")

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            organization_id=org_id,
            provider_id=user.provider_id,
            is_verified=True,
        ),
        is_verified=True,
        message="Email successfully verified.",
    )


async def _execute_code_verification(email: str, code: str) -> AuthResponse:
    normalized_email = normalize_email(email)
    user = await db_client.get_user_by_email(normalized_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if getattr(user, "is_verified", False):
        token = create_jwt_token(user.id, normalized_email, scope="authenticated")
        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user.id,
                email=user.email,
                organization_id=user.selected_organization_id,
                provider_id=user.provider_id,
                is_verified=True,
            ),
            is_verified=True,
            message="Email already verified.",
        )

    # 1. Check max attempts (Max 5)
    if (user.verification_attempts or 0) >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum verification attempts exceeded. Please request a new code.",
        )

    # 2. Check expiry with 30-second clock skew grace period
    if user.verification_code_expires_at:
        now = datetime.now(UTC)
        grace_expiry = user.verification_code_expires_at + timedelta(seconds=30)
        if now > grace_expiry:
            raise HTTPException(
                status_code=400,
                detail="Verification code has expired. Please request a new code.",
            )

    # 3. Constant-time OTP verification
    is_valid = verify_otp_code(code, user.verification_code_hash)
    if not is_valid:
        attempts = await db_client.increment_user_verification_attempts(user.id)
        remaining = max(0, 5 - attempts)
        if remaining == 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid code. Maximum attempts reached. Please request a new code.",
            )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempts remaining.",
        )

    # 4. Success! Activate & provision
    return await _activate_user_and_provision_workspace(user, normalized_email)


@router.post(
    "/signup",
    response_model=AuthResponse,
    dependencies=[Depends(require_local_auth)],
)
async def signup(request: SignupRequest):
    if not ENABLE_SIGNUP:
        raise HTTPException(status_code=403, detail="Signup is disabled")

    normalized_email = normalize_email(request.email)
    if is_disposable_email(normalized_email):
        raise HTTPException(
            status_code=400,
            detail="Disposable email addresses are not permitted.",
        )

    has_mx = await validate_domain_mx(normalized_email)
    if not has_mx:
        raise HTTPException(
            status_code=400,
            detail="Invalid email domain: no active mail server found.",
        )

    # Check if email is already taken
    existing_user = await db_client.get_user_by_email(normalized_email)
    if existing_user:
        if getattr(existing_user, "is_verified", True):
            raise HTTPException(status_code=409, detail="Email already registered")

        # Pre-Hijacking Protection / In-Flight Retry:
        # User signed up previously but never verified. Overwrite password and issue fresh OTP.
        otp_code = generate_otp_code()
        code_hash = hash_otp_code(otp_code)
        expires_at = datetime.now(UTC) + timedelta(minutes=15)
        hashed = hash_password(request.password)

        await db_client.update_user_verification_otp(
            user_id=existing_user.id,
            verification_code_hash=code_hash,
            verification_code_expires_at=expires_at,
            new_password_hash=hashed,
        )

        await _dispatch_verification_email(normalized_email, otp_code)
        token = create_jwt_token(existing_user.id, normalized_email, scope="unverified")

        return AuthResponse(
            token=token,
            user=UserResponse(
                id=existing_user.id,
                email=existing_user.email,
                name=request.name,
                is_verified=False,
            ),
            is_verified=False,
            message="Verification code sent to your email.",
        )

    # Brand new registration: create unverified user
    otp_code = generate_otp_code()
    code_hash = hash_otp_code(otp_code)
    expires_at = datetime.now(UTC) + timedelta(minutes=15)
    hashed = hash_password(request.password)

    user = await db_client.create_user_with_email(
        email=normalized_email,
        password_hash=hashed,
        name=request.name,
        is_verified=False,
        verification_code_hash=code_hash,
        verification_code_expires_at=expires_at,
    )

    await _dispatch_verification_email(normalized_email, otp_code)
    token = create_jwt_token(user.id, normalized_email, scope="unverified")

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=request.name,
            is_verified=False,
        ),
        is_verified=False,
        message="Verification code sent to your email.",
    )


@router.post(
    "/verify-email",
    response_model=AuthResponse,
    dependencies=[Depends(require_local_auth)],
)
async def verify_email(request: VerifyEmailRequest):
    return await _execute_code_verification(request.email, request.code)


@router.post(
    "/send-code",
    dependencies=[Depends(require_local_auth)],
)
async def send_code(request: SendCodeRequest):
    normalized_email = normalize_email(request.email)
    if is_disposable_email(normalized_email):
        raise HTTPException(
            status_code=400,
            detail="Disposable email addresses are not permitted.",
        )

    has_mx = await validate_domain_mx(normalized_email)
    if not has_mx:
        raise HTTPException(
            status_code=400,
            detail="Invalid email domain: no active mail server found.",
        )

    user = await db_client.get_user_by_email(normalized_email)
    now = datetime.now(UTC)

    if user:
        # Check 60-second cooldown
        if user.last_verification_sent_at:
            elapsed = (now - user.last_verification_sent_at).total_seconds()
            if elapsed < 60:
                remaining = int(60 - elapsed)
                raise HTTPException(
                    status_code=429,
                    detail=f"Please wait {remaining} seconds before requesting a new code.",
                )

        otp_code = generate_otp_code()
        code_hash = hash_otp_code(otp_code)
        expires_at = now + timedelta(minutes=15)

        await db_client.update_user_verification_otp(
            user_id=user.id,
            verification_code_hash=code_hash,
            verification_code_expires_at=expires_at,
        )
        await _dispatch_verification_email(normalized_email, otp_code)
        return {"success": True, "message": "Verification code dispatched to your email."}

    # Brand new email requesting code login (Pattern A: JIT Auto-Registration)
    if not ENABLE_SIGNUP:
        return {"success": True, "message": "If an account exists, a verification code was sent."}

    otp_code = generate_otp_code()
    code_hash = hash_otp_code(otp_code)
    expires_at = now + timedelta(minutes=15)

    await db_client.create_user_with_email(
        email=normalized_email,
        password_hash=None,
        name=None,
        is_verified=False,
        verification_code_hash=code_hash,
        verification_code_expires_at=expires_at,
    )

    await _dispatch_verification_email(normalized_email, otp_code)
    return {"success": True, "message": "Verification code dispatched to your email."}


@router.post(
    "/login-with-code",
    response_model=AuthResponse,
    dependencies=[Depends(require_local_auth)],
)
async def login_with_code(request: LoginWithCodeRequest):
    return await _execute_code_verification(request.email, request.code)


@router.post(
    "/resend-verification",
    dependencies=[Depends(require_local_auth)],
)
async def resend_verification(request: ResendVerificationRequest):
    normalized_email = normalize_email(request.email)
    user = await db_client.get_user_by_email(normalized_email)
    if not user:
        return {"success": True, "message": "If an unverified account exists, a new code has been sent."}

    if getattr(user, "is_verified", False):
        return {"success": True, "message": "Email is already verified. Please sign in."}

    # Check 60-second cooldown
    if user.last_verification_sent_at:
        elapsed = (datetime.now(UTC) - user.last_verification_sent_at).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting a new code.",
            )

    otp_code = generate_otp_code()
    code_hash = hash_otp_code(otp_code)
    expires_at = datetime.now(UTC) + timedelta(minutes=15)

    await db_client.update_user_verification_otp(
        user_id=user.id,
        verification_code_hash=code_hash,
        verification_code_expires_at=expires_at,
    )

    await _dispatch_verification_email(normalized_email, otp_code)
    return {"success": True, "message": "A new verification code has been dispatched."}


@router.post(
    "/change-signup-email",
    dependencies=[Depends(require_local_auth)],
)
async def change_signup_email(request: ChangeSignupEmailRequest):
    curr_email = normalize_email(request.current_email)
    new_email = normalize_email(request.new_email)

    if curr_email == new_email:
        raise HTTPException(status_code=400, detail="New email is identical to current email.")

    if is_disposable_email(new_email):
        raise HTTPException(
            status_code=400,
            detail="Disposable email addresses are not permitted.",
        )

    has_mx = await validate_domain_mx(new_email)
    if not has_mx:
        raise HTTPException(
            status_code=400,
            detail="Invalid email domain: no active mail server found.",
        )

    user = await db_client.get_user_by_email(curr_email)
    if not user or not user.password_hash:
        raise HTTPException(status_code=404, detail="Account not found.")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password.")

    if getattr(user, "is_verified", False):
        raise HTTPException(
            status_code=400,
            detail="Cannot change email of an already verified account via this method.",
        )

    # Check if new email is already taken
    existing_new = await db_client.get_user_by_email(new_email)
    if existing_new and getattr(existing_new, "is_verified", True):
        raise HTTPException(status_code=409, detail="The new email address is already in use.")

    otp_code = generate_otp_code()
    code_hash = hash_otp_code(otp_code)
    expires_at = datetime.now(UTC) + timedelta(minutes=15)

    await db_client.update_user_email(user.id, new_email)
    await db_client.update_user_verification_otp(
        user_id=user.id,
        verification_code_hash=code_hash,
        verification_code_expires_at=expires_at,
    )

    await _dispatch_verification_email(new_email, otp_code)
    new_token = create_jwt_token(user.id, new_email, scope="unverified")

    return {
        "success": True,
        "token": new_token,
        "new_email": new_email,
        "message": f"Verification code sent to {new_email}.",
    }


@router.get(
    "/verification-status",
    dependencies=[Depends(require_local_auth)],
)
async def check_verification_status(email: str = Query(...)):
    user = await db_client.get_user_by_email(normalize_email(email))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "email": user.email,
        "is_verified": getattr(user, "is_verified", True),
    }


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(require_local_auth)],
)
async def login(request: LoginRequest):
    normalized_email = normalize_email(request.email)
    # Look up user by email
    user = await db_client.get_user_by_email(normalized_email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="This account was created with email codes. Please sign in using code, or click 'Forgot Password' to set a password.",
        )

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Enforcement: Email verification gate
    if not getattr(user, "is_verified", True):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Please verify your email address to continue.",
                "email": user.email,
            },
        )

    # Create JWT token
    token = create_jwt_token(user.id, user.email, scope="authenticated")

    capture_event(
        distinct_id=str(user.provider_id),
        event=PostHogEvent.SIGNED_IN,
        properties={
            "organization_id": user.selected_organization_id,
            "auth_provider": "local",
        },
    )

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            organization_id=user.selected_organization_id,
            provider_id=user.provider_id,
            is_verified=True,
        ),
        is_verified=True,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(user: UserModel = Depends(get_user)):
    talkar_org_type = None
    if user.selected_organization_id:
        try:
            config = await db_client.get_configuration(
                user.selected_organization_id,
                OrganizationConfigurationKey.TALKAR_ORG_TYPE.value
            )
            if config:
                talkar_org_type = config.value
        except Exception:
            pass

    return UserResponse(
        id=user.id,
        email=user.email,
        organization_id=user.selected_organization_id,
        provider_id=user.provider_id,
        talkar_org_type=talkar_org_type,
        is_verified=getattr(user, "is_verified", True),
    )
