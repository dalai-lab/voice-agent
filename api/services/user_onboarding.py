from api.constants import DEPLOYMENT_MODE, TALKAR_SERVICE_URL
from api.db.models import UserModel
from api.db import db_client
from api.enums import UserConfigurationKey
from api.schemas.onboarding_state import OnboardingState, OnboardingStateUpdate
from loguru import logger
from pydantic import ValidationError
import httpx


async def get_onboarding_state(user_id: int) -> OnboardingState:
    value = await db_client.get_user_configuration_value(
        user_id, UserConfigurationKey.ONBOARDING.value
    )
    return _parse_state(value, user_id)


async def update_onboarding_state(
    user: UserModel, update: OnboardingStateUpdate
) -> OnboardingState:
    state = update.apply_to(await get_onboarding_state(user.id))
    await db_client.upsert_user_configuration_value(
        user.id,
        UserConfigurationKey.ONBOARDING.value,
        state.model_dump(mode="json", exclude_none=True),
    )
    
    if DEPLOYMENT_MODE == "talkar" and update.onboarding_form_data and user.selected_organization_id:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{TALKAR_SERVICE_URL}/customers/by-org/{user.selected_organization_id}/onboarding",
                    json={"form": update.onboarding_form_data, "documents": []}
                )
                resp.raise_for_status()
                logger.info(f"Forwarded onboarding form for org {user.selected_organization_id} to Talkar")
        except Exception as e:
            logger.error(f"Failed to forward onboarding form to Talkar: {e}")

    return state


def _parse_state(value, user_id: int) -> OnboardingState:
    if not value or not isinstance(value, dict):
        return OnboardingState()
    try:
        return OnboardingState.model_validate(value)
    except ValidationError as exc:
        logger.warning(
            f"Invalid onboarding state for user {user_id}: {exc}. Returning defaults."
        )
        return OnboardingState()
