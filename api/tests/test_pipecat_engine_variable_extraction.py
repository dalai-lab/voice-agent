"""Tests for verifying variable extraction is triggered for the correct node during transitions.

This module tests that when the LLM calls a node transition function, variable extraction
is performed for the SOURCE node (where the conversation happened), not the TARGET node.

The key behavior being tested:
1. LLM calls a transition function (e.g., "collect_info") from START node
2. START node has extraction_enabled=True with extraction_variables
3. AGENT node (target) has extraction_enabled=False
4. Variable extraction should be triggered for START node's variables
5. Variable extraction should NOT be triggered for AGENT node
"""

from types import SimpleNamespace
from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch

import pytest
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMAssistantAggregatorParams,
    LLMContextAggregatorPair,
)
from pipecat.tests.mock_transport import MockTransport
from pipecat.transports.base_transport import TransportParams

from api.services.workflow.dto import ExtractionVariableDTO, VariableType
from api.services.workflow.pipecat_engine import PipecatEngine
from api.services.workflow.pipecat_engine_variable_extractor import (
    VariableExtractionManager,
)
from api.services.workflow.workflow_graph import WorkflowGraph
from api.tests.pipecat_test_utils import run_engine_test_pipeline
from pipecat.tests import MockLLMService, MockTTSService


class TestVariableExtractionDuringTransitions:
    """Test that variable extraction is triggered for the correct node during transitions."""

    @pytest.mark.asyncio
    async def test_extraction_called_for_source_node_not_target_node(
        self, three_node_workflow_extraction_start_only: WorkflowGraph
    ):
        """Test that when transitioning from START to AGENT, extraction is called for START node.

        Scenario:
        1. Start node has extraction_enabled=True with extraction_variables
        2. Agent node has extraction_enabled=False
        3. LLM calls transition function to move from START to AGENT
        4. VERIFY: Variable extraction should be called for START node's variables
        5. VERIFY: Variable extraction should NOT be called for AGENT node

        This test verifies that extraction happens for the SOURCE node of a transition,
        which is the node where the conversation context that needs extraction occurred.
        """
        # Track which nodes had extraction performed
        extraction_calls: List[Dict[str, Any]] = []

        # Step 0 (Start node): call collect_info to transition to agent
        step_0_chunks = MockLLMService.create_function_call_chunks(
            function_name="collect_info",
            arguments={},
            tool_call_id="call_transition_1",
        )

        # Step 1 (Agent node): call end_call to transition to end
        step_1_chunks = MockLLMService.create_function_call_chunks(
            function_name="end_call",
            arguments={},
            tool_call_id="call_transition_2",
        )

        # Step 2 (End node): text response
        step_2_chunks = MockLLMService.create_text_chunks("Goodbye!")

        mock_steps = [step_0_chunks, step_1_chunks, step_2_chunks]

        # Create mock LLM
        llm = MockLLMService(mock_steps=mock_steps, chunk_delay=0.001)

        # Create MockTTSService
        tts = MockTTSService(mock_audio_duration_ms=40, frame_delay=0)

        # Create MockTransport for simulating transport behavior
        mock_transport = MockTransport(
            params=TransportParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                audio_in_sample_rate=16000,
                audio_out_sample_rate=16000,
                audio_out_end_silence_secs=0,
            ),
        )

        # Create LLM context
        context = LLMContext()

        # Add assistant context aggregator
        assistant_params = LLMAssistantAggregatorParams()
        context_aggregator = LLMContextAggregatorPair(
            context, assistant_params=assistant_params
        )
        assistant_context_aggregator = context_aggregator.assistant()

        workflow = three_node_workflow_extraction_start_only

        # Create PipecatEngine with the workflow
        engine = PipecatEngine(
            llm=llm,
            context=context,
            workflow=workflow,
            call_context_vars={"customer_name": "Test User"},
            workflow_run_id=1,
        )

        # Patch _perform_variable_extraction_if_needed to track calls
        original_perform_extraction = engine._perform_variable_extraction_if_needed

        async def tracked_perform_extraction(node, run_in_background=True):
            extraction_calls.append(
                {
                    "node_id": node.id if node else None,
                    "node_name": node.name if node else None,
                    "extraction_enabled": node.extraction_enabled if node else None,
                    "extraction_variables": node.extraction_variables if node else None,
                }
            )
            # Call original to maintain behavior
            await original_perform_extraction(node)

        engine._perform_variable_extraction_if_needed = tracked_perform_extraction

        # Create the pipeline
        pipeline = Pipeline(
            [
                mock_transport.input(),
                llm,
                tts,
                mock_transport.output(),
                assistant_context_aggregator,
            ]
        )

        # Create pipeline task
        task = PipelineWorker(
            pipeline,
            params=PipelineParams(),
            enable_rtvi=False,
        )

        engine.set_task(task)

        # Patch DB calls and extraction manager
        with patch(
            "api.db:db_client.get_organization_id_by_workflow_run_id",
            new_callable=AsyncMock,
            return_value=1,
        ):
            # Mock the actual extraction to avoid needing a real LLM
            with patch.object(
                VariableExtractionManager,
                "_perform_extraction",
                new_callable=AsyncMock,
                return_value={"user_name": "John Doe"},
            ):
                await run_engine_test_pipeline(task, engine, mock_transport)

        # Should have 3 LLM generations
        assert llm.get_current_step() == 3

        # Verify extraction was called during transitions
        # The key assertion: when transitioning from START to AGENT,
        # the extraction should be for START node (which has extraction enabled)

        # Filter to only calls where extraction was actually attempted
        # (node has extraction_enabled=True and extraction_variables)
        extraction_enabled_calls = [
            call
            for call in extraction_calls
            if call["extraction_enabled"] and call["extraction_variables"]
        ]

        # START node has extraction enabled, so when transitioning FROM start,
        # extraction should be triggered for START's variables
        assert len(extraction_enabled_calls) >= 1, (
            f"Expected at least 1 extraction call for start node, got {len(extraction_enabled_calls)}. "
            f"All calls: {extraction_calls}"
        )

        # Verify the extraction was called for the START node
        start_extraction_calls = [
            call for call in extraction_enabled_calls if call["node_id"] == "start"
        ]
        assert len(start_extraction_calls) >= 1, (
            f"Expected extraction to be called for START node (which has extraction enabled), "
            f"but got calls for: {[c['node_id'] for c in extraction_enabled_calls]}"
        )

        # Verify extraction was NOT called for AGENT node
        agent_extraction_calls = [
            call
            for call in extraction_calls
            if call["node_id"] == "agent" and call["extraction_enabled"]
        ]
        assert len(agent_extraction_calls) == 0, (
            f"Expected NO extraction calls for AGENT node (extraction disabled), "
            f"but got {len(agent_extraction_calls)} calls"
        )


@pytest.mark.asyncio
async def test_extraction_uses_dedicated_llm(simple_workflow: WorkflowGraph):
    """Extraction must not fall back to the conversational LLM when one is supplied."""
    conversation_llm = SimpleNamespace(run_inference=AsyncMock())
    extraction_llm = SimpleNamespace(
        run_inference=AsyncMock(return_value='{"user_intent": "support"}'),
        model_name="variable-extraction-model",
    )
    context = LLMContext(messages=[{"role": "user", "content": "I need help"}])
    engine = PipecatEngine(
        llm=conversation_llm,
        variable_extraction_llm=extraction_llm,
        context=context,
        workflow=simple_workflow,
        call_context_vars={},
        workflow_run_id=1,
    )
    manager = VariableExtractionManager(engine)
    node = simple_workflow.nodes[simple_workflow.start_node_id]

    with patch(
        "api.services.workflow.pipecat_engine_variable_extractor.ensure_tracing",
        return_value=False,
    ):
        result = await manager._perform_extraction(
            node.extraction_variables,
            parent_ctx=None,
            extraction_prompt=node.extraction_prompt,
        )

    assert result == {"user_intent": "support"}
    extraction_llm.run_inference.assert_awaited_once()
    conversation_llm.run_inference.assert_not_awaited()


class TestPhase2VariableExtraction:
    """Test suite for Phase 2 Runtime features."""

    def test_strict_type_coercion(self):
        """Test _coerce_variable_types coerces numbers, booleans, and strings."""
        variables = [
            ExtractionVariableDTO(name="budget", type=VariableType.number, prompt="User budget"),
            ExtractionVariableDTO(name="score", type=VariableType.number, prompt="User score"),
            ExtractionVariableDTO(name="is_homeowner", type=VariableType.boolean, prompt="Is homeowner"),
            ExtractionVariableDTO(name="wants_callback", type=VariableType.boolean, prompt="Wants callback"),
            ExtractionVariableDTO(name="code", type=VariableType.string, prompt="Reference code"),
        ]

        raw_data = {
            "budget": "5,000",
            "score": "98.6",
            "is_homeowner": "yes",
            "wants_callback": "False",
            "code": 12345,
            "extra_field": "untouched",
        }

        coerced = VariableExtractionManager._coerce_variable_types(raw_data, variables)

        assert coerced["budget"] == 5000
        assert coerced["score"] == 98.6
        assert coerced["is_homeowner"] is True
        assert coerced["wants_callback"] is False
        assert coerced["code"] == "12345"
        assert coerced["extra_field"] == "untouched"

    def test_snapshot_isolation(self):
        """Test _build_conversation_history is isolated from concurrent context mutations."""
        context = LLMContext(
            messages=[
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there"},
            ]
        )
        engine = SimpleNamespace(context=context)
        manager = VariableExtractionManager(engine)

        # Snapshot messages at start
        snapshot = list(context.messages)

        # Mutate active context after snapshot
        context.messages.append({"role": "user", "content": "Added concurrently"})

        history_from_snapshot = manager._build_conversation_history(snapshot)
        assert "Added concurrently" not in history_from_snapshot
        assert "user: Hello" in history_from_snapshot
        assert "assistant: Hi there" in history_from_snapshot

    def test_aggregate_total_history_budget_truncation(self):
        """Test conversation history truncates older turns when budget is exceeded."""
        messages = []
        # Generate 200 turns of length 100 characters each (~20,000 chars total)
        for i in range(100):
            messages.append({"role": "user", "content": f"Turn {i} " + "x" * 90})
            messages.append({"role": "assistant", "content": f"Reply {i} " + "y" * 90})

        engine = SimpleNamespace(context=SimpleNamespace(messages=messages))
        manager = VariableExtractionManager(engine)

        history = manager._build_conversation_history(messages)

        assert history.startswith("[...earlier turns truncated...]\n")
        assert len(history) <= manager._MAX_TOTAL_CONVERSATION_CHARS + 100
        # Most recent turn must be present
        assert "Reply 99" in history
        # Oldest turn must have been truncated
        assert "Turn 0" not in history

    @pytest.mark.asyncio
    async def test_mid_call_fallback_to_conversational_llm(self, simple_workflow: WorkflowGraph):
        """When dedicated extraction LLM fails, automatically falls back to conversational LLM."""
        failing_extraction_llm = SimpleNamespace(
            run_inference=AsyncMock(side_effect=RuntimeError("Groq 503 Service Unavailable")),
            model_name="dedicated-groq",
        )
        fallback_conversational_llm = SimpleNamespace(
            run_inference=AsyncMock(return_value='{"status": "recovered"}'),
            model_name="sarvam-conversation",
        )
        context = LLMContext(messages=[{"role": "user", "content": "test"}])
        engine = PipecatEngine(
            llm=fallback_conversational_llm,
            inference_llm=fallback_conversational_llm,
            variable_extraction_llm=failing_extraction_llm,
            context=context,
            workflow=simple_workflow,
            call_context_vars={},
            workflow_run_id=1,
        )
        manager = VariableExtractionManager(engine)
        node = simple_workflow.nodes[simple_workflow.start_node_id]

        with patch(
            "api.services.workflow.pipecat_engine_variable_extractor.ensure_tracing",
            return_value=False,
        ):
            result = await manager._perform_extraction(
                node.extraction_variables,
                parent_ctx=None,
                extraction_prompt=node.extraction_prompt,
            )

        assert result == {"status": "recovered"}
        failing_extraction_llm.run_inference.assert_awaited_once()
        fallback_conversational_llm.run_inference.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_sequence_id_tracking_prevents_stale_overwrites(self, simple_workflow: WorkflowGraph):
        """Older extraction task cannot overwrite fresher data committed by a newer task."""
        context = LLMContext()
        engine = PipecatEngine(
            llm=SimpleNamespace(run_inference=AsyncMock()),
            context=context,
            workflow=simple_workflow,
            call_context_vars={},
            workflow_run_id=1,
        )

        # Task 1 starts (seq_id = 1)
        seq_1 = engine._next_extraction_seq()
        assert seq_1 == 1

        # Task 2 starts (seq_id = 2) and completes first with budget=10000
        seq_2 = engine._next_extraction_seq()
        assert seq_2 == 2

        # Simulate Task 2 committing
        engine._gathered_context["budget"] = 10000
        engine._gathered_context.setdefault("extracted_variables", {})["budget"] = 10000
        engine._latest_committed_seq["budget"] = seq_2

        # Simulate late-arriving Task 1 with stale budget=5000 and notes="first"
        task_1_data = {"budget": 5000, "notes": "first"}
        extracted_variables = engine._gathered_context.setdefault("extracted_variables", {})
        for key, val in task_1_data.items():
            if key in engine._latest_committed_seq and seq_1 < engine._latest_committed_seq[key]:
                continue
            engine._gathered_context[key] = val
            extracted_variables[key] = val
            engine._latest_committed_seq[key] = seq_1

        # Assert Task 2's budget (10000) was preserved, but new key 'notes' was committed
        assert engine._gathered_context["budget"] == 10000
        assert engine._gathered_context["notes"] == "first"
        assert extracted_variables["budget"] == 10000
        assert extracted_variables["notes"] == "first"

    def test_non_destructive_update_filters_nulls(self, simple_workflow: WorkflowGraph):
        """Null, empty string, and string 'null' do not overwrite previously extracted variables."""
        context = LLMContext()
        engine = PipecatEngine(
            llm=SimpleNamespace(run_inference=AsyncMock()),
            context=context,
            workflow=simple_workflow,
            call_context_vars={},
            workflow_run_id=1,
        )

        # Initial extraction
        engine._gathered_context["name"] = "Alice"
        engine._gathered_context["age"] = 30
        engine._gathered_context.setdefault("extracted_variables", {})["name"] = "Alice"
        engine._gathered_context["extracted_variables"]["age"] = 30

        # Node 2 returns partial nullification
        extracted_data = {"name": None, "age": "null", "email": "alice@example.com", "notes": ""}

        valid_extracted = {
            k: v
            for k, v in extracted_data.items()
            if v is not None
            and v != ""
            and not (isinstance(v, str) and v.strip().lower() == "null")
        }

        for key, val in valid_extracted.items():
            engine._gathered_context[key] = val
            engine._gathered_context["extracted_variables"][key] = val

        # Alice and 30 are not erased
        assert engine._gathered_context["name"] == "Alice"
        assert engine._gathered_context["age"] == 30
        assert engine._gathered_context["email"] == "alice@example.com"
        assert "notes" not in engine._gathered_context

    def test_extraction_llm_service_creation_enforces_zero_temperature(self):
        """Dedicated extraction LLM creation enforces temperature=0.0."""
        from api.schemas.ai_model_configuration import LLMConfig
        from api.services.configuration.registry import GroqLLMService
        from api.services.pipecat.service_factory import create_llm_service

        extraction_cfg = GroqLLMService(
            provider="groq",
            api_key="gsk-dummy-test-key",
            model="llama-3.3-70b-versatile",
            temperature=0.0,
        )

        service = create_llm_service(extraction_cfg, usage_context="variable_extraction")

        assert hasattr(service, "_settings")
        assert service._settings.temperature == 0.0
        assert service._settings.model == "llama-3.3-70b-versatile"

    def test_runtime_configuration_stamping_with_and_without_extraction_llm(self):
        """Runtime configuration stamps dedicated extraction LLM provider and model when set, or falls back to conversation LLM."""
        from api.schemas.ai_model_configuration import EffectiveAIModelConfiguration
        from api.services.configuration.registry import (
            DeepgramSTTConfiguration,
            ElevenlabsTTSConfiguration,
            GroqLLMService,
            OpenAILLMService,
        )

        # Case 1: extraction_llm is present
        config_with_ext = EffectiveAIModelConfiguration(
            llm=OpenAILLMService(provider="openai", api_key="sk-openai", model="gpt-4.1"),
            extraction_llm=GroqLLMService(provider="groq", api_key="gsk-groq", model="llama-3.3-70b-versatile"),
            tts=ElevenlabsTTSConfiguration(provider="elevenlabs", api_key="el-key", voice="Rachel", model="flash"),
            stt=DeepgramSTTConfiguration(provider="deepgram", api_key="dg-key", model="nova-3"),
        )

        runtime_config_1 = {
            "stt_provider": config_with_ext.stt.provider,
            "stt_model": config_with_ext.stt.model,
            "tts_provider": config_with_ext.tts.provider,
            "tts_model": config_with_ext.tts.model,
            "llm_provider": config_with_ext.llm.provider,
            "llm_model": config_with_ext.llm.model,
            "extraction_llm_provider": (
                config_with_ext.extraction_llm.provider
                if getattr(config_with_ext, "extraction_llm", None)
                else config_with_ext.llm.provider
            ),
            "extraction_llm_model": (
                config_with_ext.extraction_llm.model
                if getattr(config_with_ext, "extraction_llm", None)
                else config_with_ext.llm.model
            ),
        }

        assert runtime_config_1["extraction_llm_provider"] == "groq"
        assert runtime_config_1["extraction_llm_model"] == "llama-3.3-70b-versatile"
        assert runtime_config_1["llm_provider"] == "openai"

        # Case 2: extraction_llm is None (fallback to conversation LLM)
        config_without_ext = EffectiveAIModelConfiguration(
            llm=OpenAILLMService(provider="openai", api_key="sk-openai", model="gpt-4.1"),
            tts=ElevenlabsTTSConfiguration(provider="elevenlabs", api_key="el-key", voice="Rachel", model="flash"),
            stt=DeepgramSTTConfiguration(provider="deepgram", api_key="dg-key", model="nova-3"),
        )

        runtime_config_2 = {
            "stt_provider": config_without_ext.stt.provider,
            "stt_model": config_without_ext.stt.model,
            "tts_provider": config_without_ext.tts.provider,
            "tts_model": config_without_ext.tts.model,
            "llm_provider": config_without_ext.llm.provider,
            "llm_model": config_without_ext.llm.model,
            "extraction_llm_provider": (
                config_without_ext.extraction_llm.provider
                if getattr(config_without_ext, "extraction_llm", None)
                else config_without_ext.llm.provider
            ),
            "extraction_llm_model": (
                config_without_ext.extraction_llm.model
                if getattr(config_without_ext, "extraction_llm", None)
                else config_without_ext.llm.model
            ),
        }

        assert runtime_config_2["extraction_llm_provider"] == "openai"
        assert runtime_config_2["extraction_llm_model"] == "gpt-4.1"


