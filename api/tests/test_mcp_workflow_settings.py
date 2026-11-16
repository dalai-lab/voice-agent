from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
import pytest

from api.mcp_server.tools.workflow_settings import (
    get_workflow_settings,
    update_workflow_settings,
    get_workflow_report,
)


@pytest.fixture
def authed_user() -> MagicMock:
    user = MagicMock()
    user.selected_organization_id = 42
    return user


@pytest.mark.asyncio
async def test_get_workflow_settings_not_found(authed_user: MagicMock):
    with (
        patch("api.mcp_server.tools.workflow_settings.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_workflow", AsyncMock(return_value=None)),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_workflow_settings(workflow_id=999)
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_workflow_settings_success(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(
        id=7,
        name="Support Agent",
        workflow_uuid="uuid-support-7",
        status="active",
        enable_dtmf=True,
        released_definition=None,
        workflow_configurations={
            "max_call_duration": 600,
            "max_user_idle_timeout": 12.0,
            "dictionary": "Talkar: tal-kar\nKubernetes: koo-ber-net-eez",
            "ambient_noise_configuration": {"type": "office", "volume": 0.2},
            "voicemail_detection": {"action": "hangup"},
            "embed": {"allowed_domains": ["talkar.io"]},
        },
        template_context_variables={"customer_name": "string"},
        post_call_schema=[{"name": "satisfied", "type": "boolean", "description": "Customer was satisfied"}],
    )

    with (
        patch("api.mcp_server.tools.workflow_settings.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_draft_version", AsyncMock(return_value=None)),
    ):
        result = await get_workflow_settings(workflow_id=7)

    assert result["workflow_id"] == 7
    assert result["agent_uuid"] == "uuid-support-7"
    assert result["status"] == "active"
    assert result["general"]["max_call_duration_seconds"] == 600
    assert result["general"]["enable_dtmf"] is True
    assert "Kubernetes" in result["dictionary"]
    assert len(result["post_call_intelligence"]) == 1
    assert result["post_call_intelligence"][0]["name"] == "satisfied"
    assert result["voicemail_detection"]["action"] == "hangup"
    assert result["website_embed"]["allowed_domains"] == ["talkar.io"]


@pytest.mark.asyncio
async def test_update_workflow_settings_schema_validation_error(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(
        id=7,
        name="Support Agent",
        workflow_uuid="uuid-support-7",
        status="active",
        enable_dtmf=False,
        released_definition=None,
        workflow_configurations={},
        template_context_variables={},
        post_call_schema=[],
    )

    with (
        patch("api.mcp_server.tools.workflow_settings.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_draft_version", AsyncMock(return_value=None)),
    ):
        # post_call_schema items must be dicts with 'name' and 'type'
        result = await update_workflow_settings(
            workflow_id=7,
            post_call_schema=["not-a-dict"],  # type: ignore
        )

    assert result["saved"] is False
    assert result["error_code"] == "invalid_pci_schema"


@pytest.mark.asyncio
async def test_update_workflow_settings_secret_preservation(authed_user: MagicMock):
    existing_configs = {
        "model_overrides": {
            "llm": {
                "provider": "openai",
                "api_key": "actual-super-secret-key-12345",
                "model": "gpt-4o",
            }
        }
    }
    mock_draft = SimpleNamespace(
        id=101,
        version_number=2,
        workflow_id=7,
        workflow_configurations=existing_configs,
        template_context_variables={},
    )
    mock_workflow = SimpleNamespace(
        id=7,
        name="Support Agent",
        workflow_uuid="uuid-support-7",
        status="active",
        enable_dtmf=False,
        released_definition=None,
        workflow_configurations=existing_configs,
        template_context_variables={},
    )

    saved_configs = None

    async def mock_update_wf(*args, **kwargs):
        nonlocal saved_configs
        saved_configs = kwargs.get("workflow_configurations")
        return SimpleNamespace(id=7, name="Support Agent")

    with (
        patch("api.mcp_server.tools.workflow_settings.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_draft_version", AsyncMock(return_value=mock_draft)),
        patch("api.mcp_server.tools.workflow_settings.db_client.update_workflow", side_effect=mock_update_wf),
    ):
        result = await update_workflow_settings(
            workflow_id=7,
            model_overrides={
                "llm": {
                    "provider": "openai",
                    "api_key": "******",
                    "model": "gpt-4o-mini",
                }
            },
        )

    assert result["saved"] is True
    assert saved_configs is not None
    # Secret must be preserved, not overwritten by "******"
    assert saved_configs["model_overrides"]["llm"]["api_key"] == "actual-super-secret-key-12345"
    assert saved_configs["model_overrides"]["llm"]["model"] == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_update_workflow_settings_v2_override_secret_preservation(authed_user: MagicMock):
    existing_v2_configs = {
        "model_configuration_v2_override": {
            "version": 2,
            "mode": "byok",
            "byok": {
                "mode": "pipeline",
                "pipeline": {
                    "llm": {
                        "provider": "sarvam",
                        "api_key": "actual-sarvam-key-99999",
                        "model": "sarvam-105b-conversations",
                    },
                    "tts": {
                        "provider": "smallest",
                        "api_key": "actual-smallest-key-88888",
                        "model": "lightning_v3.1_pro",
                        "voice": "rhea",
                    },
                    "stt": {
                        "provider": "sarvam",
                        "api_key": "actual-stt-key-77777",
                        "model": "saaras:v4",
                    },
                },
            },
        },
        "model_overrides": {"stale": "legacy_block"},
    }
    mock_draft = SimpleNamespace(
        id=101,
        version_number=2,
        workflow_id=7,
        workflow_configurations=existing_v2_configs,
        template_context_variables={},
    )
    mock_workflow = SimpleNamespace(
        id=7,
        name="Support Agent",
        workflow_uuid="uuid-support-7",
        status="active",
        enable_dtmf=False,
        released_definition=None,
        workflow_configurations=existing_v2_configs,
        template_context_variables={},
    )

    saved_configs = None

    async def mock_update_wf(*args, **kwargs):
        nonlocal saved_configs
        saved_configs = kwargs.get("workflow_configurations")
        return SimpleNamespace(id=7, name="Support Agent")

    with (
        patch("api.mcp_server.tools.workflow_settings.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_draft_version", AsyncMock(return_value=mock_draft)),
        patch("api.mcp_server.tools.workflow_settings.db_client.update_workflow", side_effect=mock_update_wf),
    ):
        result = await update_workflow_settings(
            workflow_id=7,
            model_overrides={
                "version": 2,
                "mode": "byok",
                "byok": {
                    "mode": "pipeline",
                    "pipeline": {
                        "llm": {
                            "provider": "sarvam",
                            "api_key": "******",
                            "model": "sarvam-105b-conversations",
                            "temperature": 0.5,
                        },
                        "tts": {
                            "provider": "smallest",
                            "api_key": "******",
                            "model": "lightning_v3.1_pro",
                            "voice": "rhea",
                        },
                        "stt": {
                            "provider": "sarvam",
                            "api_key": "******",
                            "model": "saaras:v4",
                        },
                    },
                },
            },
        )

    assert result["saved"] is True
    assert saved_configs is not None
    # Saved under model_configuration_v2_override
    assert "model_configuration_v2_override" in saved_configs
    # Stale model_overrides cleared
    assert "model_overrides" not in saved_configs
    # Secrets preserved
    pipeline = saved_configs["model_configuration_v2_override"]["byok"]["pipeline"]
    assert pipeline["llm"]["api_key"] == "actual-sarvam-key-99999"
    assert pipeline["llm"]["temperature"] == 0.5
    assert pipeline["tts"]["api_key"] == "actual-smallest-key-88888"
    assert pipeline["stt"]["api_key"] == "actual-stt-key-77777"


@pytest.mark.asyncio
async def test_update_workflow_settings_v1_override_clears_stale_v2(authed_user: MagicMock):
    existing_v2_configs = {
        "model_configuration_v2_override": {"old": "v2_override"},
    }
    mock_draft = SimpleNamespace(
        id=101,
        version_number=2,
        workflow_id=7,
        workflow_configurations=existing_v2_configs,
        template_context_variables={},
    )
    mock_workflow = SimpleNamespace(
        id=7,
        name="Support Agent",
        workflow_uuid="uuid-support-7",
        status="active",
        enable_dtmf=False,
        released_definition=None,
        workflow_configurations=existing_v2_configs,
        template_context_variables={},
    )

    saved_configs = None

    async def mock_update_wf(*args, **kwargs):
        nonlocal saved_configs
        saved_configs = kwargs.get("workflow_configurations")
        return SimpleNamespace(id=7, name="Support Agent")

    with (
        patch("api.mcp_server.tools.workflow_settings.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_draft_version", AsyncMock(return_value=mock_draft)),
        patch("api.mcp_server.tools.workflow_settings.db_client.update_workflow", side_effect=mock_update_wf),
    ):
        result = await update_workflow_settings(
            workflow_id=7,
            model_overrides={
                "llm": {
                    "provider": "openai",
                    "api_key": "actual-super-secret-key-12345",
                    "model": "gpt-4o-mini",
                }
            },
        )

    assert result["saved"] is True
    assert saved_configs is not None
    # Stale v2 override must be removed so it doesn't shadow the v1 settings
    assert "model_configuration_v2_override" not in saved_configs
    assert saved_configs["model_overrides"]["llm"]["model"] == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_get_workflow_report_success(authed_user: MagicMock):
    mock_workflow = SimpleNamespace(
        id=7,
        name="Support Agent",
        workflow_uuid="uuid-support-7",
    )
    mock_run = SimpleNamespace(
        id=1,
        is_completed=True,
        usage_info={"call_duration_seconds": 180},
        cost_info={},
        gathered_context={"call_disposition": "completed"},
        extracted_data={"issue_resolved": True},
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_run]
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_ctx = MagicMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_session)
    mock_ctx.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("api.mcp_server.tools.workflow_settings.authenticate_mcp_request", AsyncMock(return_value=authed_user)),
        patch("api.mcp_server.tools.workflow_settings.db_client.get_workflow", AsyncMock(return_value=mock_workflow)),
        patch("api.mcp_server.tools.workflow_settings.db_client.async_session", return_value=mock_ctx),
    ):
        result = await get_workflow_report(workflow_id=7)

    assert result["workflow_id"] == 7
    assert result["summary"]["total_calls"] == 1
    assert result["summary"]["completed_calls"] == 1
    assert result["summary"]["average_duration_seconds"] == 180.0
    assert result["dispositions"]["completed"] == 1
    assert result["intelligence_extraction_rate_percent"] == 100.0
