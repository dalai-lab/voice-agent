import json
from unittest.mock import AsyncMock, patch

import pytest
from api.services.telephony.providers.plivo.provider import PlivoProvider


class _Response:
    status = 201

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def text(self):
        return json.dumps({"request_uuid": "destination-request-uuid"})


class _Session:
    def __init__(self):
        self.post_calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    def post(self, endpoint, *, json, auth):
        self.post_calls.append((endpoint, json, auth))
        return _Response()


@pytest.mark.asyncio
async def test_transfer_call_dials_destination_with_answer_and_hangup_urls():
    provider = PlivoProvider(
        {
            "auth_id": "MA123",
            "auth_token": "secret",
            "from_numbers": ["+15551230001"],
        }
    )
    session = _Session()

    with (
        patch(
            "api.services.telephony.providers.plivo.provider.get_backend_endpoints",
            new=AsyncMock(return_value=("https://backend.test", "wss://backend.test")),
        ),
        patch(
            "api.services.telephony.providers.plivo.provider.aiohttp.ClientSession",
            return_value=session,
        ),
    ):
        result = await provider.transfer_call(
            destination="+15551230002",
            transfer_id="transfer-1",
            conference_name="conference-1",
            timeout=20,
        )

    payload = session.post_calls[0][1]
    assert payload == {
        "to": "+15551230002",
        "from": "15551230001",
        "answer_url": "https://backend.test/api/v1/telephony/plivo/transfer-xml/conference-1/transfer-1",
        "answer_method": "POST",
        "hangup_url": "https://backend.test/api/v1/telephony/plivo/transfer-result/transfer-1",
        "hangup_method": "POST",
        "ring_timeout": 20,
    }
    assert result["call_sid"] == "destination-request-uuid"


def test_plivo_amd_supports_and_params():
    provider_disabled = PlivoProvider(
        {
            "auth_id": "MA123",
            "auth_token": "secret",
            "from_numbers": ["+15551230001"],
            "amd_enabled": False,
        }
    )
    assert provider_disabled.supports_answering_machine_detection() is False
    params = {"to": "123", "from": "456"}
    res = provider_disabled.apply_answering_machine_detection_call_params(
        params,
        workflow_run_id=1,
        backend_endpoint="https://backend.test",
    )
    assert res == {"to": "123", "from": "456"}

    provider_enabled = PlivoProvider(
        {
            "auth_id": "MA123",
            "auth_token": "secret",
            "from_numbers": ["+15551230001"],
            "amd_enabled": True,
        }
    )
    assert provider_enabled.supports_answering_machine_detection() is True

    # Missing workflow_run_id or backend_endpoint returns unmodified data
    res_missing = provider_enabled.apply_answering_machine_detection_call_params(
        {"to": "123"},
        workflow_run_id=None,
        backend_endpoint="https://backend.test",
    )
    assert res_missing == {"to": "123"}

    res_injected = provider_enabled.apply_answering_machine_detection_call_params(
        {"to": "123"},
        workflow_run_id=99,
        backend_endpoint="https://backend.test",
    )
    assert res_injected == {
        "to": "123",
        "machine_detection": "true",
        "machine_detection_time": 5000,
        "machine_detection_url": "https://backend.test/api/v1/telephony/plivo/amd-callback/99",
        "machine_detection_method": "POST",
    }


def test_plivo_parse_amd_result():
    provider = PlivoProvider(
        {
            "auth_id": "MA123",
            "auth_token": "secret",
            "from_numbers": ["+15551230001"],
            "amd_enabled": True,
        }
    )

    # Machine true
    res_machine = provider.parse_answering_machine_detection_result(
        {"CallUUID": "call-1", "Machine": "true"}
    )
    assert res_machine is not None
    assert res_machine.call_id == "call-1"
    assert res_machine.answered_by == "machine_start"

    # Machine 1
    res_machine_1 = provider.parse_answering_machine_detection_result(
        {"CallUUID": "call-1b", "Machine": "1"}
    )
    assert res_machine_1 is not None
    assert res_machine_1.answered_by == "machine_start"

    # Human false
    res_human = provider.parse_answering_machine_detection_result(
        {"CallUUID": "call-2", "Machine": "false"}
    )
    assert res_human is not None
    assert res_human.call_id == "call-2"
    assert res_human.answered_by == "human"

    # Human 0
    res_human_0 = provider.parse_answering_machine_detection_result(
        {"CallUUID": "call-2b", "Machine": "0"}
    )
    assert res_human_0 is not None
    assert res_human_0.answered_by == "human"

    # Inconclusive / invalid
    assert provider.parse_answering_machine_detection_result({}) is None
    assert (
        provider.parse_answering_machine_detection_result(
            {"CallUUID": "call-3", "Machine": "unknown"}
        )
        is None
    )


@pytest.mark.asyncio
async def test_initiate_call_injects_amd_params_when_enabled():
    provider = PlivoProvider(
        {
            "auth_id": "MA123",
            "auth_token": "secret",
            "from_numbers": ["+15551230001"],
            "amd_enabled": True,
        }
    )
    session = _Session()

    with (
        patch(
            "api.services.telephony.providers.plivo.provider.get_backend_endpoints",
            new=AsyncMock(return_value=("https://backend.test", "wss://backend.test")),
        ),
        patch(
            "api.services.telephony.providers.plivo.provider.aiohttp.ClientSession",
            return_value=session,
        ),
    ):
        result = await provider.initiate_call(
            to_number="+15551239999",
            webhook_url="https://backend.test/webhook",
            workflow_run_id=456,
        )

    payload = session.post_calls[0][1]
    assert payload["machine_detection"] == "true"
    assert payload["machine_detection_time"] == 5000
    assert (
        payload["machine_detection_url"]
        == "https://backend.test/api/v1/telephony/plivo/amd-callback/456"
    )
    assert payload["machine_detection_method"] == "POST"
    assert result.call_id == "destination-request-uuid"
