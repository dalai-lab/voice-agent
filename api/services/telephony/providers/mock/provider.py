"""Mock telephony provider implementation for overnight campaign soak testing."""

import json
import random
import uuid
from datetime import timedelta
from typing import TYPE_CHECKING, Any

import redis.asyncio as aioredis
from fastapi import Response
from loguru import logger

from api.constants import REDIS_URL
from api.db import db_client
from api.enums import TelephonyCallStatus, WorkflowRunMode
from api.services.telephony.base import (
    CallInitiationResult,
    NormalizedInboundData,
    ProviderSyncResult,
    TelephonyProvider,
)
from api.tasks.function_names import FunctionNames

if TYPE_CHECKING:
    from fastapi import WebSocket


def resolve_simulation_parameters(
    contact_context: dict[str, Any],
    campaign_meta: dict[str, Any],
    telephony_config: dict[str, Any],
    live_redis_config: dict[str, Any] | None = None,
) -> tuple[int, str, dict[str, Any]]:
    """Resolves (duration_seconds, outcome, callback_params) via 4-tier hierarchy:

    1. Per-contact context override (CSV context variables)
    2. Live runtime Redis override (mock_telephony:config:{org_id})
    3. Campaign orchestrator metadata (simulation_config)
    4. Telephony provider configuration DB defaults
    """
    # 1. Contact-level override (highest precedence)
    if "simulated_duration" in contact_context or "simulated_outcome" in contact_context:
        duration = int(contact_context.get("simulated_duration", 30))
        outcome = str(contact_context.get("simulated_outcome", "completed")).lower()
        cb_params = {
            "delay_minutes": int(contact_context.get("callback_delay_minutes", 15)),
            "summary": contact_context.get(
                "callback_summary", "Simulated contact requested appointment callback"
            ),
            "fast_forward": bool(contact_context.get("callback_fast_forward", False)),
        }
        return duration, outcome, cb_params

    # 2. Hierarchy fallback (Live Redis > Campaign Metadata > Telephony Config)
    active_cfg = (
        live_redis_config
        or campaign_meta.get("simulation_config")
        or telephony_config.get("config", {})
        or telephony_config
    )

    min_dur = int(active_cfg.get("min_duration_seconds", 10))
    max_dur = int(active_cfg.get("max_duration_seconds", 600))
    low = min(min_dur, max_dur)
    high = max(min_dur, max_dur)
    duration = random.randint(low, high)

    # Outcome weighted roll
    weights = active_cfg.get(
        "outcomes",
        {
            "completed": 70,
            "busy": 10,
            "no_answer": 10,
            "carrier_error": 5,
            "callback": 5,
        },
    )
    outcome = random.choices(
        population=list(weights.keys()),
        weights=list(weights.values()),
        k=1,
    )[0]

    cb_params = {
        "delay_minutes": int(active_cfg.get("callback_delay_minutes", 15)),
        "summary": "Simulated contact requested callback",
        "fast_forward": bool(active_cfg.get("fast_forward_callbacks", False)),
    }

    return duration, outcome, cb_params


class MockTelephonyProvider(TelephonyProvider):
    """Zero-cost mock telephony provider for campaign stress and soak testing."""

    PROVIDER_NAME = WorkflowRunMode.MOCK.value
    WEBHOOK_ENDPOINT = "mock/status-callback"

    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.from_numbers = config.get(
            "from_numbers", ["+19990000001", "+19990000002"]
        )
        if isinstance(self.from_numbers, str):
            self.from_numbers = [self.from_numbers]
        self.default_from_number = config.get(
            "default_from_number", self.from_numbers[0] if self.from_numbers else "+19990000001"
        )

    def validate_config(self) -> bool:
        return bool(self.from_numbers)

    def get_from_numbers(self) -> list[str]:
        return self.from_numbers

    def select_from_number(self, requested_number: str | None = None) -> str:
        if requested_number and requested_number in self.from_numbers:
            return requested_number
        return self.default_from_number

    async def _get_live_redis_config(
        self, organization_id: int
    ) -> dict[str, Any] | None:
        try:
            client = await aioredis.from_url(REDIS_URL, decode_responses=True)
            raw = await client.get(f"mock_telephony:config:{organization_id}")
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.debug(
                f"[MOCK TELEPHONY] Failed to fetch redis override for org {organization_id}: {e}"
            )
        return None

    async def initiate_call(
        self,
        to_number: str,
        webhook_url: str,
        workflow_run_id: int | None = None,
        from_number: str | None = None,
        **kwargs: Any,
    ) -> CallInitiationResult:
        if not workflow_run_id:
            raise ValueError("workflow_run_id is required for mock telephony simulation")

        selected_from = self.select_from_number(from_number)
        call_id = f"mock_{uuid.uuid4().hex[:12]}"

        # Load context and campaign metadata from DB without touching caller signatures
        run = await db_client.get_workflow_run_by_id(workflow_run_id)
        contact_context = getattr(run, "initial_context", None) or {}
        campaign_meta: dict[str, Any] = {}
        org_id = (
            getattr(run, "organization_id", None)
            or kwargs.get("organization_id")
            or 0
        )

        if run and run.campaign_id:
            campaign = await db_client.get_campaign_by_id(run.campaign_id)
            if campaign and campaign.orchestrator_metadata:
                campaign_meta = campaign.orchestrator_metadata
            if not org_id and campaign:
                org_id = campaign.organization_id

        live_redis_config = (
            await self._get_live_redis_config(org_id) if org_id else None
        )

        duration, outcome, cb_params = resolve_simulation_parameters(
            contact_context=contact_context,
            campaign_meta=campaign_meta,
            telephony_config=self.config,
            live_redis_config=live_redis_config,
        )

        logger.info(
            f"[MOCK TELEPHONY] Dispatched run {workflow_run_id} to {to_number} from {selected_from} | "
            f"simulated_duration={duration}s, outcome={outcome}"
        )

        # Enqueue delayed completion worker into Redis via Arq
        from api.tasks.arq import enqueue_job

        await enqueue_job(
            FunctionNames.SIMULATE_MOCK_CALL_COMPLETION,
            workflow_run_id=workflow_run_id,
            call_id=call_id,
            duration=duration,
            outcome=outcome,
            to_number=to_number,
            from_number=selected_from,
            callback_params=cb_params,
            _defer_by=timedelta(seconds=duration),
        )

        return CallInitiationResult(
            call_id=call_id,
            status="initiated",
            caller_number=selected_from,
            provider_metadata={
                "provider": self.PROVIDER_NAME,
                "call_id": call_id,
                "simulated_duration": duration,
                "simulated_outcome": outcome,
                "callback_params": cb_params if outcome == "callback" else None,
            },
        )

    async def get_call_status(self, call_id: str) -> dict[str, Any]:
        return {
            "call_id": call_id,
            "status": "in-progress",
            "provider": self.PROVIDER_NAME,
        }

    async def get_available_phone_numbers(self) -> list[str]:
        return self.from_numbers

    async def verify_webhook_signature(
        self, url: str, params: dict[str, Any], signature: str
    ) -> bool:
        return True

    async def get_webhook_response(
        self, workflow_id: int, organization_id: int, workflow_run_id: int
    ) -> str:
        return json.dumps({"status": "mock_response", "workflow_run_id": workflow_run_id})

    async def get_call_cost(self, call_id: str) -> dict[str, Any]:
        return {
            "cost_usd": 0.0,
            "duration": 0,
            "status": "completed",
        }

    def parse_status_callback(self, data: dict[str, Any]) -> dict[str, Any]:
        return {
            "call_id": data.get("call_id", ""),
            "status": data.get("status", TelephonyCallStatus.COMPLETED),
            "from_number": data.get("from_number"),
            "to_number": data.get("to_number"),
            "duration": data.get("duration"),
            "extra": data,
        }

    async def handle_websocket(
        self,
        websocket: "WebSocket",
        workflow_id: int,
        organization_id: int,
        workflow_run_id: int,
    ) -> None:
        """Mock provider does not process audio WebSockets."""
        logger.info(
            f"[MOCK TELEPHONY] WebSocket connection opened for run {workflow_run_id} (no-op)"
        )

    @classmethod
    def can_handle_webhook(
        cls, webhook_data: dict[str, Any], headers: dict[str, str]
    ) -> bool:
        return False

    @staticmethod
    def parse_inbound_webhook(webhook_data: dict[str, Any]) -> NormalizedInboundData:
        return NormalizedInboundData(
            provider="mock",
            call_id=str(uuid.uuid4()),
            from_number="",
            to_number="",
            direction="inbound",
            call_status="completed",
            account_id=None,
            raw_data=webhook_data,
        )

    @staticmethod
    def validate_account_id(config_data: dict, webhook_account_id: str) -> bool:
        return True

    async def verify_inbound_signature(
        self,
        url: str,
        webhook_data: dict[str, Any],
        headers: dict[str, str],
        body: str = "",
    ) -> bool:
        return True

    async def start_inbound_stream(
        self,
        *,
        websocket_url: str,
        workflow_run_id: int,
        normalized_data: NormalizedInboundData,
        backend_endpoint: str,
    ) -> Any:
        return Response(content="", status_code=204)

    async def validate_phone_number(self, address: str) -> ProviderSyncResult:
        """Simulated phone numbers in mock pool always pass validation."""
        return ProviderSyncResult(ok=True)

    @staticmethod
    def generate_error_response(error_type: str, message: str) -> tuple:
        """Generate standardized error response for mock provider."""
        resp = Response(
            content=json.dumps({"error": error_type, "message": message}),
            media_type="application/json",
            status_code=400,
        )
        return (resp, "application/json")

    def supports_transfers(self) -> bool:
        return False

    async def transfer_call(
        self,
        destination: str,
        transfer_id: str,
        conference_name: str,
        timeout: int = 30,
        **kwargs: Any,
    ) -> dict[str, Any]:
        raise NotImplementedError("Mock telephony provider does not support live call transfers")

