"""Tests for variable extraction token usage tracking in PipelineMetricsAggregator."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from pipecat.metrics.metrics import LLMTokenUsage
from pipecat.processors.aggregators.llm_context import LLMContext

from api.services.pipecat.pipeline_metrics_aggregator import PipelineMetricsAggregator
from api.services.workflow.pipecat_engine import PipecatEngine
from api.services.workflow.pipecat_engine_variable_extractor import (
    VariableExtractionManager,
)
from api.services.workflow.workflow_graph import WorkflowGraph


@pytest.mark.asyncio
async def test_variable_extraction_records_token_usage_in_aggregator(
    simple_workflow: WorkflowGraph,
):
    """Verify that variable extraction records prompt, completion, and cached tokens in PipelineMetricsAggregator."""
    pipeline_metrics_aggregator = PipelineMetricsAggregator()

    mock_token_usage = LLMTokenUsage(
        prompt_tokens=520,
        completion_tokens=42,
        total_tokens=562,
        cache_read_input_tokens=180,
    )

    extraction_llm = SimpleNamespace(
        run_inference_with_usage=AsyncMock(
            return_value=('{"user_intent": "order_inquiry"}', mock_token_usage)
        ),
        model_name="gpt-4.1-mini",
    )
    conversation_llm = SimpleNamespace(run_inference=AsyncMock())

    context = LLMContext(messages=[{"role": "user", "content": "I want to check my order"}])

    engine = PipecatEngine(
        llm=conversation_llm,
        variable_extraction_llm=extraction_llm,
        context=context,
        workflow=simple_workflow,
        call_context_vars={},
        workflow_run_id=101,
        pipeline_metrics_aggregator=pipeline_metrics_aggregator,
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

    # 1. Verify variable extracted correctly
    assert result == {"user_intent": "order_inquiry"}
    extraction_llm.run_inference_with_usage.assert_awaited_once()

    # 2. Verify pipeline_metrics_aggregator serialized metrics
    usage = pipeline_metrics_aggregator.get_all_usage_metrics_serialized()
    assert "llm" in usage, "Expected 'llm' key in aggregated usage metrics"

    expected_key = "variable_extraction:extraction|||gpt-4.1-mini"
    assert (
        expected_key in usage["llm"]
    ), f"Expected '{expected_key}' in usage['llm'], found: {list(usage['llm'].keys())}"

    extraction_metrics = usage["llm"][expected_key]
    assert extraction_metrics["prompt_tokens"] == 520
    assert extraction_metrics["completion_tokens"] == 42
    assert extraction_metrics["total_tokens"] == 562
    assert extraction_metrics["cache_read_input_tokens"] == 180


@pytest.mark.asyncio
async def test_variable_extraction_accumulates_across_multiple_nodes(
    simple_workflow: WorkflowGraph,
):
    """Verify that multiple extraction calls accumulate token metrics in PipelineMetricsAggregator."""
    pipeline_metrics_aggregator = PipelineMetricsAggregator()

    first_usage = LLMTokenUsage(
        prompt_tokens=400,
        completion_tokens=30,
        total_tokens=430,
        cache_read_input_tokens=100,
    )
    second_usage = LLMTokenUsage(
        prompt_tokens=500,
        completion_tokens=40,
        total_tokens=540,
        cache_read_input_tokens=150,
    )

    extraction_llm = SimpleNamespace(
        run_inference_with_usage=AsyncMock(
            side_effect=[
                ('{"user_intent": "order_inquiry"}', first_usage),
                ('{"user_intent": "support"}', second_usage),
            ]
        ),
        model_name="sarvam-105b",
    )
    conversation_llm = SimpleNamespace(run_inference=AsyncMock())
    context = LLMContext(messages=[{"role": "user", "content": "Hello"}])

    engine = PipecatEngine(
        llm=conversation_llm,
        variable_extraction_llm=extraction_llm,
        context=context,
        workflow=simple_workflow,
        call_context_vars={},
        workflow_run_id=102,
        pipeline_metrics_aggregator=pipeline_metrics_aggregator,
    )

    manager = VariableExtractionManager(engine)
    node = simple_workflow.nodes[simple_workflow.start_node_id]

    with patch(
        "api.services.workflow.pipecat_engine_variable_extractor.ensure_tracing",
        return_value=False,
    ):
        await manager._perform_extraction(
            node.extraction_variables,
            parent_ctx=None,
            extraction_prompt=node.extraction_prompt,
        )
        await manager._perform_extraction(
            node.extraction_variables,
            parent_ctx=None,
            extraction_prompt=node.extraction_prompt,
        )

    usage = pipeline_metrics_aggregator.get_all_usage_metrics_serialized()
    expected_key = "variable_extraction:extraction|||sarvam-105b"
    assert expected_key in usage["llm"]

    extraction_metrics = usage["llm"][expected_key]
    assert extraction_metrics["prompt_tokens"] == 400 + 500  # 900
    assert extraction_metrics["completion_tokens"] == 30 + 40  # 70
    assert extraction_metrics["total_tokens"] == 430 + 540  # 970
    assert extraction_metrics["cache_read_input_tokens"] == 100 + 150  # 250


@pytest.mark.asyncio
async def test_base_openai_llm_service_run_inference_with_usage():
    """Verify that BaseOpenAILLMService.run_inference_with_usage extracts prompt, completion, and cached tokens."""
    from pipecat.services.openai.llm import OpenAILLMService

    llm = OpenAILLMService(api_key="mock-key", model="gpt-4.1-mini")

    mock_response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content='{"status": "ok"}'))],
        usage=SimpleNamespace(
            prompt_tokens=350,
            completion_tokens=25,
            total_tokens=375,
            prompt_tokens_details=SimpleNamespace(cached_tokens=80),
            completion_tokens_details=SimpleNamespace(reasoning_tokens=None),
        ),
    )

    llm._client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=AsyncMock(return_value=mock_response))
        )
    )

    context = LLMContext(messages=[{"role": "user", "content": "hello"}])

    # 1. Test run_inference_with_usage
    content, usage = await llm.run_inference_with_usage(context)
    assert content == '{"status": "ok"}'
    assert usage is not None
    assert usage.prompt_tokens == 350
    assert usage.completion_tokens == 25
    assert usage.total_tokens == 375
    assert usage.cache_read_input_tokens == 80

    # 2. Test backwards compatibility of standard run_inference (returns string only by default)
    standard_content = await llm.run_inference(context)
    assert standard_content == '{"status": "ok"}'

