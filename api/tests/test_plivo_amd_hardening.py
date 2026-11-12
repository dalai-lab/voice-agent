"""Unit tests for Plivo AMD production-readiness hardening fixes."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.tests import MockLLMService
from pipecat.utils.enums import EndTaskReason

from api.services.workflow.dto import (
    EdgeDataDTO,
    EndCallNodeData,
    NodeType,
    Position,
    ReactFlowDTO,
    RFEdgeDTO,
    RFNodeDTO,
    StartCallNodeData,
)
from api.services.workflow.pipecat_engine import PipecatEngine
from api.services.workflow.post_call_intelligence import run_post_call_intelligence
from api.services.workflow.workflow_graph import WorkflowGraph
from api.tasks.run_integrations import _should_skip_qa


def _build_minimal_workflow() -> WorkflowGraph:
    dto = ReactFlowDTO(
        nodes=[
            RFNodeDTO(
                id="start",
                type=NodeType.startNode,
                position=Position(x=0, y=0),
                data=StartCallNodeData(
                    name="Start",
                    prompt="Hello",
                    is_start=True,
                ),
            ),
            RFNodeDTO(
                id="end",
                type=NodeType.endNode,
                position=Position(x=200, y=0),
                data=EndCallNodeData(
                    name="End",
                    prompt="Goodbye",
                    is_end=True,
                ),
            ),
        ],
        edges=[
            RFEdgeDTO(
                id="start-end",
                source="start",
                target="end",
                data=EdgeDataDTO(label="End", condition="End the call"),
            )
        ],
    )
    return WorkflowGraph(dto)


class TestPlivoAmdDispositionPreservation:
    """Verify Plivo AMD voicemail state survives pipeline disconnect teardown."""

    @pytest.mark.asyncio
    async def test_end_call_preserves_db_voicemail_on_user_hangup(self):
        engine = PipecatEngine(
            llm=MockLLMService(mock_steps=[]),
            context=LLMContext(),
            workflow=_build_minimal_workflow(),
            call_context_vars={},
            workflow_run_id=42,
        )
        engine.task = MagicMock()
        engine.task.queue_frame = AsyncMock()
        engine.perform_final_variable_extraction = AsyncMock()
        engine._gathered_context = {"call_tags": ["user_speech"]}

        db_run = SimpleNamespace(
            id=42,
            gathered_context={
                "answered_by": "machine_start",
                "call_disposition": "voicemail",
                "mapped_call_disposition": "voicemail",
                "call_tags": ["voicemail_detected", "telephony_voicemail"],
            },
        )

        with patch("api.services.workflow.pipecat_engine.db_client") as mock_db:
            mock_db.get_workflow_run_by_id = AsyncMock(return_value=db_run)
            mock_db.update_workflow_run = AsyncMock(return_value=db_run)

            await engine.end_call_with_reason(
                EndTaskReason.USER_HANGUP.value, abort_immediately=True
            )

        assert engine._gathered_context["call_disposition"] == "voicemail"
        assert engine._gathered_context["mapped_call_disposition"] == "voicemail"
        assert "voicemail_detected" in engine._gathered_context["call_tags"]
        assert "telephony_voicemail" in engine._gathered_context["call_tags"]
        assert "user_speech" in engine._gathered_context["call_tags"]
        assert "voicemail" in engine._gathered_context["call_tags"]
        mock_db.update_workflow_run.assert_awaited_once()
        persisted_ctx = mock_db.update_workflow_run.call_args.kwargs["gathered_context"]
        assert persisted_ctx["call_disposition"] == "voicemail"

    @pytest.mark.asyncio
    async def test_end_call_sets_user_hangup_when_db_not_voicemail(self):
        engine = PipecatEngine(
            llm=MockLLMService(mock_steps=[]),
            context=LLMContext(),
            workflow=_build_minimal_workflow(),
            call_context_vars={},
            workflow_run_id=43,
        )
        engine.task = MagicMock()
        engine.task.queue_frame = AsyncMock()
        engine.perform_final_variable_extraction = AsyncMock()
        engine._gathered_context = {}

        db_run = SimpleNamespace(
            id=43,
            gathered_context={"answered_by": "human"},
        )

        with patch("api.services.workflow.pipecat_engine.db_client") as mock_db:
            mock_db.get_workflow_run_by_id = AsyncMock(return_value=db_run)
            mock_db.update_workflow_run = AsyncMock(return_value=db_run)

            await engine.end_call_with_reason(
                EndTaskReason.USER_HANGUP.value, abort_immediately=True
            )

        assert engine._gathered_context["call_disposition"] == EndTaskReason.USER_HANGUP.value
        assert engine._gathered_context["mapped_call_disposition"] == EndTaskReason.USER_HANGUP.value


class TestVoicemailSkipInQaAndPci:
    """Verify both telephony 'voicemail' and LLM 'voicemail_detected' skip QA and PCI."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "gathered_context",
        [
            {"call_disposition": "voicemail", "call_tags": ["telephony_voicemail"]},
            {"call_disposition": "user_hangup", "call_tags": ["voicemail_detected"]},
            {"call_disposition": EndTaskReason.VOICEMAIL_DETECTED.value, "call_tags": []},
        ],
    )
    async def test_run_post_call_intelligence_skips_voicemail(self, gathered_context):
        workflow_run = SimpleNamespace(
            id=100,
            usage_info={"call_duration_seconds": 25},
            gathered_context=gathered_context,
            logs={"realtime_feedback_events": [{"text": "leave a message"}]},
        )

        result = await run_post_call_intelligence(
            workflow_run, [{"name": "summary", "type": "string"}]
        )
        assert result == {"_error": "skipped", "reason": "voicemail"}

    @pytest.mark.parametrize(
        "gathered_context",
        [
            {"call_disposition": "voicemail", "call_tags": ["telephony_voicemail"]},
            {"call_disposition": "user_hangup", "call_tags": ["voicemail_detected"]},
            {"call_disposition": EndTaskReason.VOICEMAIL_DETECTED.value, "call_tags": []},
        ],
    )
    def test_should_skip_qa_skips_voicemail(self, gathered_context):
        workflow_run = SimpleNamespace(
            id=101,
            usage_info={"call_duration_seconds": 25},
            gathered_context=gathered_context,
        )
        qa_data = SimpleNamespace(
            qa_min_call_duration=5,
            qa_voicemail_calls=False,
            qa_sample_rate=100,
        )

        reason = _should_skip_qa(qa_data, workflow_run)
        assert reason == "voicemail call and QA voicemail calls is disabled"
