from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from api.routes.webrtc_signaling import SignalingManager
from api.services.call_concurrency import CallConcurrencyLimitError


class _FakeWebSocket:
    def __init__(self):
        self.send_json = AsyncMock()


class _FakePeerConnection:
    def __init__(self):
        self.renegotiate = AsyncMock()
        self._pc_id = "pc-1"
        self.pc_id = "pc-1"

    def get_answer(self):
        return {"sdp": "v=0\r\n", "type": "answer", "pc_id": "pc-1"}

    def event_handler(self, event_name):
        def decorator(fn):
            return fn

        return decorator


def _offer_payload(pc_id: str = "pc-1") -> dict:
    return {
        "pc_id": pc_id,
        "sdp": "v=0\r\n",
        "type": "offer",
    }


@pytest.mark.asyncio
async def test_public_embed_offer_rejects_when_org_concurrency_limit_reached():
    manager = SignalingManager()
    ws = _FakeWebSocket()
    user = SimpleNamespace(id=7)

    with (
        patch("api.routes.webrtc_signaling.db_client") as mock_db,
        patch(
            "api.routes.webrtc_signaling.authorize_workflow_run_start",
            new=AsyncMock(
                return_value=SimpleNamespace(has_quota=True, error_message="")
            ),
        ) as mock_authorize,
        patch("api.routes.webrtc_signaling.call_concurrency") as mock_concurrency,
    ):
        mock_db.get_workflow_organization_id = AsyncMock(return_value=11)
        mock_concurrency.acquire_org_slot = AsyncMock(
            side_effect=CallConcurrencyLimitError(
                organization_id=11,
                source="public_embed",
                wait_time=0,
                max_concurrent=2,
            )
        )
        mock_concurrency.bind_workflow_run = AsyncMock()

        await manager._handle_offer(
            ws,
            _offer_payload(),
            workflow_id=33,
            workflow_run_id=501,
            user=user,
            organization_id=11,
            connection_key="conn-1",
            enforce_call_concurrency=True,
            call_concurrency_source="public_embed",
        )

    ws.send_json.assert_awaited_once_with(
        {
            "type": "error",
            "payload": {
                "error_type": "concurrency_limit_exceeded",
                "message": "Concurrent call limit reached",
            },
        }
    )
    mock_concurrency.bind_workflow_run.assert_not_called()
    mock_authorize.assert_not_called()


@pytest.mark.asyncio
async def test_public_embed_renegotiation_does_not_acquire_another_slot():
    manager = SignalingManager()
    ws = _FakeWebSocket()
    user = SimpleNamespace(id=7)
    connection_key = "conn-1"
    pc = _FakePeerConnection()
    manager._peer_connections["pc-1"] = pc
    manager._peer_connection_owners["pc-1"] = connection_key

    with (
        patch("api.routes.webrtc_signaling.db_client") as mock_db,
        patch(
            "api.routes.webrtc_signaling.authorize_workflow_run_start",
            new=AsyncMock(
                return_value=SimpleNamespace(has_quota=True, error_message="")
            ),
        ) as mock_authorize,
        patch("api.routes.webrtc_signaling.call_concurrency") as mock_concurrency,
    ):
        mock_db.get_workflow_organization_id = AsyncMock(return_value=11)
        mock_concurrency.acquire_org_slot = AsyncMock()

        await manager._handle_offer(
            ws,
            _offer_payload(),
            workflow_id=33,
            workflow_run_id=501,
            user=user,
            organization_id=11,
            connection_key=connection_key,
            enforce_call_concurrency=True,
            call_concurrency_source="public_embed",
        )

    mock_concurrency.acquire_org_slot.assert_not_called()
    mock_authorize.assert_not_called()
    pc.renegotiate.assert_awaited_once()
    assert ws.send_json.await_args.args[0]["type"] == "answer"


@pytest.mark.asyncio
async def test_signaling_websocket_rejects_run_not_owned_by_workflow():
    """The URL workflow_id drives org/quota/concurrency accounting, so a
    workflow_id that doesn't own the run must be rejected before signaling."""
    from fastapi import HTTPException

    from api.routes.webrtc_signaling import signaling_websocket

    ws = _FakeWebSocket()
    user = SimpleNamespace(id=7, selected_organization_id=11)

    with (
        patch("api.routes.webrtc_signaling.db_client") as mock_db,
        patch("api.routes.webrtc_signaling.signaling_manager") as mock_manager,
    ):
        mock_db.get_workflow_run = AsyncMock(
            return_value=SimpleNamespace(id=501, workflow_id=99)
        )
        mock_manager.handle_websocket = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await signaling_websocket(
                ws, workflow_id=33, workflow_run_id=501, user=user
            )

    assert exc_info.value.status_code == 400
    mock_manager.handle_websocket.assert_not_called()


@pytest.mark.asyncio
async def test_signaling_websocket_accepts_matching_workflow_and_run():
    from api.routes.webrtc_signaling import signaling_websocket

    ws = _FakeWebSocket()
    user = SimpleNamespace(id=7, selected_organization_id=11)

    with (
        patch("api.routes.webrtc_signaling.db_client") as mock_db,
        patch("api.routes.webrtc_signaling.signaling_manager") as mock_manager,
    ):
        mock_db.get_workflow_run = AsyncMock(
            return_value=SimpleNamespace(id=501, workflow_id=33)
        )
        mock_manager.handle_websocket = AsyncMock()

        await signaling_websocket(ws, workflow_id=33, workflow_run_id=501, user=user)

    mock_manager.handle_websocket.assert_awaited_once()


@pytest.mark.asyncio
async def test_webrtc_lifecycle_order_slot_bound_before_quota_authorized():
    """Verify consistent ordering across transports: acquire slot -> bind run -> authorize quota."""
    manager = SignalingManager()
    ws = _FakeWebSocket()
    user = SimpleNamespace(id=7, provider_id="prov-1")
    call_order = []

    async def fake_acquire(*args, **kwargs):
        call_order.append("acquire")
        return "slot-token-123"

    async def fake_bind(slot, run_id):
        call_order.append(("bind", slot, run_id))

    async def fake_auth(**kwargs):
        call_order.append(("authorize", kwargs.get("workflow_run_id")))
        return SimpleNamespace(has_quota=True, error_code=None, error_message=None)

    fake_pc = _FakePeerConnection()
    fake_pc.initialize = AsyncMock()

    with (
        patch("api.routes.webrtc_signaling.call_concurrency") as mock_concurrency,
        patch("api.routes.webrtc_signaling.authorize_workflow_run_start", side_effect=fake_auth),
        patch("api.routes.webrtc_signaling.SmallWebRTCConnection", return_value=fake_pc),
        patch("api.routes.webrtc_signaling.get_ice_servers", return_value=[]),
        patch("api.routes.webrtc_signaling.run_pipeline_smallwebrtc", new=AsyncMock()),
    ):
        mock_concurrency.acquire_org_slot = AsyncMock(side_effect=fake_acquire)
        mock_concurrency.bind_workflow_run = AsyncMock(side_effect=fake_bind)
        mock_concurrency.release_workflow_run_slot = AsyncMock()

        await manager._handle_offer(
            ws,
            _offer_payload(),
            workflow_id=33,
            workflow_run_id=501,
            user=user,
            organization_id=11,
            connection_key="conn-1",
            enforce_call_concurrency=True,
            call_concurrency_source="webrtc",
        )

    assert call_order == [
        "acquire",
        ("bind", "slot-token-123", 501),
        ("authorize", 501),
    ]


@pytest.mark.asyncio
async def test_webrtc_offer_quota_exhausted_releases_bound_slot_and_marks_failed():
    """Verify that quota failure releases the acquired concurrency slot and marks the run failed."""
    manager = SignalingManager()
    ws = _FakeWebSocket()
    user = SimpleNamespace(id=7)

    with (
        patch("api.routes.webrtc_signaling.call_concurrency") as mock_concurrency,
        patch(
            "api.routes.webrtc_signaling.authorize_workflow_run_start",
            new=AsyncMock(
                return_value=SimpleNamespace(
                    has_quota=False,
                    error_code="INSUFFICIENT_CREDITS",
                    error_message="Wallet empty",
                )
            ),
        ),
        patch("api.routes.webrtc_signaling.mark_workflow_run_failed", new=AsyncMock()) as mock_mark_failed,
        patch("api.routes.webrtc_signaling.SmallWebRTCConnection") as mock_pc_cls,
    ):
        mock_concurrency.acquire_org_slot = AsyncMock(return_value="slot-token-123")
        mock_concurrency.bind_workflow_run = AsyncMock()
        mock_concurrency.release_workflow_run_slot = AsyncMock()

        await manager._handle_offer(
            ws,
            _offer_payload(),
            workflow_id=33,
            workflow_run_id=501,
            user=user,
            organization_id=11,
            connection_key="conn-1",
            enforce_call_concurrency=True,
            call_concurrency_source="webrtc",
        )

    # Concurrency was acquired and bound
    mock_concurrency.acquire_org_slot.assert_awaited_once_with(
        11, source="webrtc", timeout=0
    )
    mock_concurrency.bind_workflow_run.assert_awaited_once_with("slot-token-123", 501)

    # Quota check failed -> Slot released and run marked failed
    mock_concurrency.release_workflow_run_slot.assert_awaited_once_with(501)
    mock_mark_failed.assert_awaited_once_with(501, "Wallet empty")

    # Error message sent to websocket
    ws.send_json.assert_awaited_once_with(
        {
            "type": "error",
            "payload": {
                "error_type": "INSUFFICIENT_CREDITS",
                "message": "Wallet empty",
            },
        }
    )

    # Media / PC never initialized
    mock_pc_cls.assert_not_called()


@pytest.mark.asyncio
async def test_webrtc_offer_quota_exception_releases_bound_slot():
    """Verify that an unexpected error during quota check releases the bound slot."""
    manager = SignalingManager()
    ws = _FakeWebSocket()
    user = SimpleNamespace(id=7)

    with (
        patch("api.routes.webrtc_signaling.call_concurrency") as mock_concurrency,
        patch(
            "api.routes.webrtc_signaling.authorize_workflow_run_start",
            new=AsyncMock(side_effect=RuntimeError("Billing service unavailable")),
        ),
        patch("api.routes.webrtc_signaling.mark_workflow_run_failed", new=AsyncMock()),
    ):
        mock_concurrency.acquire_org_slot = AsyncMock(return_value="slot-token-123")
        mock_concurrency.bind_workflow_run = AsyncMock()
        mock_concurrency.release_workflow_run_slot = AsyncMock()

        with pytest.raises(RuntimeError, match="Billing service unavailable"):
            await manager._handle_offer(
                ws,
                _offer_payload(),
                workflow_id=33,
                workflow_run_id=501,
                user=user,
                organization_id=11,
                connection_key="conn-1",
                enforce_call_concurrency=True,
                call_concurrency_source="webrtc",
            )

    mock_concurrency.release_workflow_run_slot.assert_awaited_once_with(501)

