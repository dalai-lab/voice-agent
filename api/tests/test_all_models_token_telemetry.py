"""Comprehensive tests for universal LLM token metering and telemetry across all models.

Verifies:
1. AnthropicLLMService.run_inference_with_usage (prompt, completion, cache read/creation)
2. GoogleLLMService.run_inference_with_usage (prompt, completion, cached)
3. Context compaction token recording in PipelineMetricsAggregator
4. Post-call intelligence & QA token updates in run_integrations
5. Multi-model token accumulation in QA analysis
"""

import sys
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from pipecat.metrics.metrics import LLMTokenUsage
from pipecat.processors.aggregators.llm_context import LLMContext

from api.services.pipecat.pipeline_metrics_aggregator import PipelineMetricsAggregator
from api.services.workflow.pipecat_engine_context_summarizer import ContextSummarizationManager
from api.services.workflow.qa.llm_config import accumulate_token_usage
from api.tasks.run_integrations import (
    _update_usage_info_with_pci_tokens,
    _update_usage_info_with_qa_tokens,
)


def _ensure_mock_anthropic_module():
    """Ensure mock anthropic module exists if the anthropic package is not installed."""
    if "anthropic" not in sys.modules:
        from pipecat.services.settings import NOT_GIVEN as _NOT_GIVEN, _NotGiven

        mock_anthropic = ModuleType("anthropic")
        mock_anthropic.NOT_GIVEN = _NOT_GIVEN
        mock_anthropic.NotGiven = _NotGiven
        mock_anthropic.AsyncAnthropic = MagicMock()
        mock_anthropic.APITimeoutError = Exception

        mock_types = ModuleType("anthropic.types")
        mock_msg_param = ModuleType("anthropic.types.message_param")
        mock_msg_param.MessageParam = dict
        mock_tool_param = ModuleType("anthropic.types.tool_union_param")
        mock_tool_param.ToolUnionParam = dict

        sys.modules["anthropic"] = mock_anthropic
        sys.modules["anthropic.types"] = mock_types
        sys.modules["anthropic.types.message_param"] = mock_msg_param
        sys.modules["anthropic.types.tool_union_param"] = mock_tool_param


@pytest.mark.asyncio
async def test_anthropic_run_inference_with_usage():
    """Verify AnthropicLLMService extracts prompt, completion, cache_read, and cache_creation tokens."""
    _ensure_mock_anthropic_module()
    from pipecat.services.anthropic.llm import AnthropicLLMService

    llm = AnthropicLLMService(
        api_key="mock-anthropic-key",
        settings=AnthropicLLMService.Settings(model="claude-3-5-sonnet-20241022"),
    )

    mock_response = SimpleNamespace(
        content=[SimpleNamespace(text='{"result": "anthropic_ok"}')],
        usage=SimpleNamespace(
            input_tokens=1200,
            output_tokens=150,
            cache_read_input_tokens=800,
            cache_creation_input_tokens=250,
        ),
    )

    llm._client = SimpleNamespace(
        beta=SimpleNamespace(
            messages=SimpleNamespace(create=AsyncMock(return_value=mock_response))
        )
    )

    context = LLMContext(messages=[{"role": "user", "content": "analyze this"}])

    # 1. Test run_inference_with_usage returns normalized LLMTokenUsage
    content, usage = await llm.run_inference_with_usage(context)
    assert content == '{"result": "anthropic_ok"}'
    assert usage is not None
    assert usage.prompt_tokens == 1200
    assert usage.completion_tokens == 150
    assert usage.total_tokens == 1350
    assert usage.cache_read_input_tokens == 800
    assert usage.cache_creation_input_tokens == 250

    # 2. Test backwards compatibility of standard run_inference
    standard_content = await llm.run_inference(context)
    assert standard_content == '{"result": "anthropic_ok"}'


@pytest.mark.asyncio
async def test_google_run_inference_with_usage():
    """Verify GoogleLLMService extracts prompt, completion, and cached tokens from usage_metadata."""
    from pipecat.services.google.llm import GoogleLLMService

    llm = GoogleLLMService(
        api_key="mock-google-key",
        settings=GoogleLLMService.Settings(model="gemini-1.5-flash"),
    )

    mock_response = SimpleNamespace(
        candidates=[
            SimpleNamespace(
                content=SimpleNamespace(
                    parts=[SimpleNamespace(text='{"status": "gemini_ok"}')]
                )
            )
        ],
        usage_metadata=SimpleNamespace(
            prompt_token_count=650,
            candidates_token_count=45,
            total_token_count=695,
            cached_content_token_count=300,
        ),
    )

    llm._client = SimpleNamespace(
        aio=SimpleNamespace(
            models=SimpleNamespace(generate_content=AsyncMock(return_value=mock_response))
        )
    )

    context = LLMContext(messages=[{"role": "user", "content": "hello gemini"}])

    # 1. Test run_inference_with_usage
    content, usage = await llm.run_inference_with_usage(context)
    assert content == '{"status": "gemini_ok"}'
    assert usage is not None
    assert usage.prompt_tokens == 650
    assert usage.completion_tokens == 45
    assert usage.total_tokens == 695
    assert usage.cache_read_input_tokens == 300

    # 2. Test backwards compatibility of standard run_inference
    standard_content = await llm.run_inference(context)
    assert standard_content == '{"status": "gemini_ok"}'


@pytest.mark.asyncio
async def test_context_compaction_records_tokens_in_aggregator():
    """Verify ContextSummarizationManager records compaction tokens under context_compaction:compaction|||<model>."""
    pipeline_metrics_aggregator = PipelineMetricsAggregator()

    compaction_usage = LLMTokenUsage(
        prompt_tokens=1800,
        completion_tokens=90,
        total_tokens=1890,
        cache_read_input_tokens=1200,
    )

    mock_llm = SimpleNamespace(
        model_name="gpt-4o-mini",
        _generate_summary=AsyncMock(return_value=("Summary of first 5 turns", 4)),
        _last_summary_token_usage=compaction_usage,
    )

    context = LLMContext(
        messages=[
            {"role": "system", "content": "System prompt"},
            {"role": "user", "content": "1"},
            {"role": "assistant", "content": "2"},
            {"role": "user", "content": "3"},
            {"role": "assistant", "content": "4"},
            {"role": "user", "content": "5"},
            {"role": "assistant", "content": "6"},
        ]
    )

    mock_engine = SimpleNamespace(
        llm=mock_llm,
        variable_extraction_llm=None,
        context=context,
        _current_node=SimpleNamespace(id="node_1", name="Goal Discovery"),
        _pipeline_metrics_aggregator=pipeline_metrics_aggregator,
    )

    manager = ContextSummarizationManager(mock_engine)

    with patch(
        "api.services.workflow.pipecat_engine_context_summarizer.ensure_tracing",
        return_value=False,
    ):
        await manager._summarize_context_in_background()

    # Verify context was compacted
    assert len(context.messages) == 4
    assert "Summary of first 5 turns" in context.messages[1]["content"]

    # Verify pipeline_metrics_aggregator recorded compaction tokens
    usage = pipeline_metrics_aggregator.get_all_usage_metrics_serialized()
    assert "llm" in usage
    expected_key = "context_compaction:compaction|||gpt-4o-mini"
    assert expected_key in usage["llm"]

    metrics = usage["llm"][expected_key]
    assert metrics["prompt_tokens"] == 1800
    assert metrics["completion_tokens"] == 90
    assert metrics["total_tokens"] == 1890
    assert metrics["cache_read_input_tokens"] == 1200


def test_accumulate_token_usage_multi_type_support():
    """Verify accumulate_token_usage handles LLMTokenUsage, dicts, and objects with usage attribute."""
    total = {}

    # 1. Accumulate from LLMTokenUsage
    usage_obj = LLMTokenUsage(
        prompt_tokens=100,
        completion_tokens=20,
        total_tokens=120,
        cache_read_input_tokens=50,
        cache_creation_input_tokens=10,
    )
    accumulate_token_usage(total, usage_obj)
    assert total["prompt_tokens"] == 100
    assert total["completion_tokens"] == 20
    assert total["total_tokens"] == 120
    assert total["cache_read_input_tokens"] == 50
    assert total["cache_creation_input_tokens"] == 10

    # 2. Accumulate from dict
    usage_dict = {
        "prompt_tokens": 200,
        "completion_tokens": 30,
        "total_tokens": 230,
        "cache_read_input_tokens": 40,
    }
    accumulate_token_usage(total, usage_dict)
    assert total["prompt_tokens"] == 300
    assert total["completion_tokens"] == 50
    assert total["total_tokens"] == 350
    assert total["cache_read_input_tokens"] == 90
    assert total["cache_creation_input_tokens"] == 10

    # 3. Accumulate from object with .usage
    resp_obj = SimpleNamespace(
        usage=SimpleNamespace(
            prompt_tokens=50,
            completion_tokens=10,
            total_tokens=60,
            cache_read_input_tokens=0,
        )
    )
    accumulate_token_usage(total, resp_obj)
    assert total["prompt_tokens"] == 350
    assert total["completion_tokens"] == 60
    assert total["total_tokens"] == 410


@pytest.mark.asyncio
async def test_update_usage_info_with_qa_and_pci_tokens():
    """Verify run_integrations updates usage_info with QAAnalysis and PostCallIntelligence keys."""
    workflow_run_id = 42
    mock_run = SimpleNamespace(
        id=workflow_run_id,
        usage_info={
            "llm": {
                "OpenAILLMService#0": {
                    "prompt_tokens": 1500,
                    "completion_tokens": 200,
                    "total_tokens": 1700,
                }
            }
        },
    )

    mock_db_client = SimpleNamespace(
        get_workflow_run_with_context=AsyncMock(return_value=(mock_run, None)),
        update_workflow_run=AsyncMock(),
    )

    with patch("api.tasks.run_integrations.db_client", mock_db_client):
        # 1. Update QA tokens
        qa_results = {
            "qa_node_1": {
                "token_usage": {
                    "prompt_tokens": 800,
                    "completion_tokens": 120,
                    "total_tokens": 920,
                    "cache_read_input_tokens": 400,
                },
                "model": "claude-3-5-sonnet",
            }
        }
        await _update_usage_info_with_qa_tokens(workflow_run_id, mock_run, qa_results)

        mock_db_client.update_workflow_run.assert_awaited()
        updated_usage = mock_db_client.update_workflow_run.call_args[1]["usage_info"]
        assert "QAAnalysis|||claude-3-5-sonnet" in updated_usage["llm"]
        qa_metrics = updated_usage["llm"]["QAAnalysis|||claude-3-5-sonnet"]
        assert qa_metrics["prompt_tokens"] == 800
        assert qa_metrics["completion_tokens"] == 120
        assert qa_metrics["total_tokens"] == 920
        assert qa_metrics["cache_read_input_tokens"] == 400

        # Update mock_run with new usage for sequential call
        mock_run.usage_info = updated_usage

        # 2. Update PCI tokens
        pci_tokens = {
            "prompt_tokens": 600,
            "completion_tokens": 80,
            "total_tokens": 680,
            "cache_read_input_tokens": 200,
        }
        await _update_usage_info_with_pci_tokens(
            workflow_run_id, mock_run, pci_tokens, model="gemini-1.5-flash"
        )

        pci_call_args = mock_db_client.update_workflow_run.call_args[1]["usage_info"]
        assert "PostCallIntelligence|||gemini-1.5-flash" in pci_call_args["llm"]
        pci_metrics = pci_call_args["llm"]["PostCallIntelligence|||gemini-1.5-flash"]
        assert pci_metrics["prompt_tokens"] == 600
        assert pci_metrics["completion_tokens"] == 80
        assert pci_metrics["total_tokens"] == 680
        assert pci_metrics["cache_read_input_tokens"] == 200

        # Original conversation LLM preserved
        assert "OpenAILLMService#0" in pci_call_args["llm"]
