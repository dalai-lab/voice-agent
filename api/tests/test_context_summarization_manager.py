import asyncio
from unittest.mock import AsyncMock, MagicMock
import pytest
from pipecat.processors.aggregators.llm_context import LLMContext
from api.services.workflow.pipecat_engine_context_summarizer import ContextSummarizationManager


@pytest.fixture
def mock_engine():
    engine = MagicMock()
    engine.context = LLMContext(messages=[])
    engine._current_node = MagicMock(id="node_2", name="Goal Discovery")
    engine._get_otel_context = MagicMock(return_value=None)
    
    # Mock LLMs
    engine.llm = MagicMock()
    engine.llm.model_name = "sarvam-105b"
    engine.llm._generate_summary = AsyncMock(return_value=("Summary of conversation", 4))
    
    engine.inference_llm = None
    engine.variable_extraction_llm = None
    return engine


@pytest.mark.asyncio
async def test_resolve_summarization_llm_hierarchy(mock_engine):
    manager = ContextSummarizationManager(mock_engine)
    
    # Case 1: Only primary llm exists
    assert manager._resolve_summarization_llm() == mock_engine.llm
    
    # Case 2: inference_llm is configured
    mock_inference_llm = MagicMock(name="inference_llm")
    mock_engine.inference_llm = mock_inference_llm
    assert manager._resolve_summarization_llm() == mock_inference_llm
    
    # Case 3: variable_extraction_llm is configured (UI Extraction LLM)
    mock_extraction_llm = MagicMock(name="variable_extraction_llm")
    mock_engine.variable_extraction_llm = mock_extraction_llm
    assert manager._resolve_summarization_llm() == mock_extraction_llm


@pytest.mark.asyncio
async def test_threshold_skips_small_context(mock_engine):
    mock_engine.context.set_messages([
        {"role": "system", "content": "You are Riya."},
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi"},
    ])
    
    manager = ContextSummarizationManager(mock_engine)
    await manager._summarize_context_in_background()
    
    # Should not call _generate_summary because len(messages) <= 6
    mock_engine.llm._generate_summary.assert_not_called()
    assert len(mock_engine.context.messages) == 3


@pytest.mark.asyncio
async def test_successful_compaction(mock_engine):
    mock_engine.context.set_messages([
        {"role": "system", "content": "You are Riya in Node 2."},
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi, good time to talk?"},
        {"role": "user", "content": "yes"},
        {"role": "assistant", "content": "great"},
        {"role": "user", "content": "I want to lose 10 kg"},
        {"role": "assistant", "content": "Roughly when?"},
    ])
    
    mock_engine.llm._generate_summary = AsyncMock(return_value=("User wants to lose 10kg.", 4))
    
    manager = ContextSummarizationManager(mock_engine)
    await manager._summarize_context_in_background()
    
    messages = mock_engine.context.messages
    # Message 0: Preserved current system prompt
    assert messages[0] == {"role": "system", "content": "You are Riya in Node 2."}
    # Message 1: Summary message
    assert messages[1]["role"] == "user"
    assert "User wants to lose 10kg." in messages[1]["content"]
    # Messages after index 4 are kept (indices 5, 6)
    assert messages[2] == {"role": "user", "content": "I want to lose 10 kg"}
    assert messages[3] == {"role": "assistant", "content": "Roughly when?"}
    assert len(messages) == 4


@pytest.mark.asyncio
async def test_race_condition_messages_added_during_summarization_preserved(mock_engine):
    mock_engine.context.set_messages([
        {"role": "system", "content": "System prompt"},
        {"role": "user", "content": "msg 1"},
        {"role": "assistant", "content": "msg 2"},
        {"role": "user", "content": "msg 3"},
        {"role": "assistant", "content": "msg 4"},
        {"role": "user", "content": "msg 5"},
        {"role": "assistant", "content": "msg 6"},
    ])
    
    # Simulate an async delay in _generate_summary, during which a new user turn arrives
    async def slow_summary(*args, **kwargs):
        await asyncio.sleep(0.01)
        # While summary is in-flight, a new user message arrives in context!
        mock_engine.context.add_message({"role": "user", "content": "msg 7 arrived mid-summary"})
        return ("Summary of 1 to 4", 4)

    mock_engine.llm._generate_summary = AsyncMock(side_effect=slow_summary)
    
    manager = ContextSummarizationManager(mock_engine)
    await manager._summarize_context_in_background()
    
    messages = mock_engine.context.messages
    # Verify msg 7 arrived and was preserved!
    contents = [m.get("content") for m in messages if isinstance(m, dict)]
    assert "msg 7 arrived mid-summary" in contents
    assert messages[-1] == {"role": "user", "content": "msg 7 arrived mid-summary"}


@pytest.mark.asyncio
async def test_orphaned_tool_response_sanitized(mock_engine):
    mock_engine.context.set_messages([
        {"role": "system", "content": "System prompt"},
        {"role": "user", "content": "msg 1"},
        {"role": "assistant", "content": "msg 2"},
        {"role": "user", "content": "msg 3"},
        {"role": "assistant", "content": "msg 4"},
        # Assume last_index was 4, but index 5 was an orphaned tool result
        {"role": "tool", "content": '{"status": "ok"}', "tool_call_id": "call_123"},
        {"role": "assistant", "content": "recent assistant message"},
    ])
    
    mock_engine.llm._generate_summary = AsyncMock(return_value=("Summary", 4))
    
    manager = ContextSummarizationManager(mock_engine)
    await manager._summarize_context_in_background()
    
    messages = mock_engine.context.messages
    # The orphaned tool role at index 5 should be purged so API doesn't 400
    roles = [m.get("role") for m in messages if isinstance(m, dict)]
    assert "tool" not in roles
    assert messages[-1] == {"role": "assistant", "content": "recent assistant message"}


@pytest.mark.asyncio
async def test_fail_open_on_timeout(mock_engine):
    mock_engine.context.set_messages([
        {"role": "system", "content": "System prompt"},
        {"role": "user", "content": "1"}, {"role": "assistant", "content": "2"},
        {"role": "user", "content": "3"}, {"role": "assistant", "content": "4"},
        {"role": "user", "content": "5"}, {"role": "assistant", "content": "6"},
    ])
    
    async def timeout_summary(*args, **kwargs):
        raise TimeoutError("LLM timed out")

    mock_engine.llm._generate_summary = AsyncMock(side_effect=timeout_summary)
    
    manager = ContextSummarizationManager(mock_engine)
    # Should not raise exception (fail-open)
    await manager._summarize_context_in_background()
    
    # Messages should be unchanged
    assert len(mock_engine.context.messages) == 7


@pytest.mark.asyncio
async def test_fail_open_on_exception(mock_engine):
    mock_engine.context.set_messages([
        {"role": "system", "content": "System prompt"},
        {"role": "user", "content": "1"}, {"role": "assistant", "content": "2"},
        {"role": "user", "content": "3"}, {"role": "assistant", "content": "4"},
        {"role": "user", "content": "5"}, {"role": "assistant", "content": "6"},
    ])
    
    mock_engine.llm._generate_summary = AsyncMock(side_effect=RuntimeError("Rate limit 429"))
    
    manager = ContextSummarizationManager(mock_engine)
    # Should not raise exception (fail-open)
    await manager._summarize_context_in_background()
    
    # Messages should be unchanged
    assert len(mock_engine.context.messages) == 7


@pytest.mark.asyncio
async def test_empty_summary_ignored(mock_engine):
    mock_engine.context.set_messages([
        {"role": "system", "content": "System prompt"},
        {"role": "user", "content": "1"}, {"role": "assistant", "content": "2"},
        {"role": "user", "content": "3"}, {"role": "assistant", "content": "4"},
        {"role": "user", "content": "5"}, {"role": "assistant", "content": "6"},
    ])
    
    # Return empty / whitespace summary
    mock_engine.llm._generate_summary = AsyncMock(return_value=("   ", 4))
    
    manager = ContextSummarizationManager(mock_engine)
    await manager._summarize_context_in_background()
    
    # Messages should be unchanged
    assert len(mock_engine.context.messages) == 7


@pytest.mark.asyncio
async def test_start_cancels_previous_task(mock_engine):
    # Give enough messages and a slow summary so tasks don't complete instantly
    mock_engine.context.set_messages([{"role": "user", "content": f"msg {i}"} for i in range(8)])
    async def slow_summary(*args, **kwargs):
        await asyncio.sleep(1.0)
        return ("Summary", 4)
    mock_engine.llm._generate_summary = AsyncMock(side_effect=slow_summary)

    manager = ContextSummarizationManager(mock_engine)
    
    # Start first task
    manager.start()
    task1 = manager._summarization_task
    assert task1 is not None
    assert not task1.done()
    
    # Start second task immediately (cancels first task)
    manager.start()
    task2 = manager._summarization_task
    assert task2 is not task1
    # Yield to let cancellation propagate
    await asyncio.sleep(0)
    assert task1.cancelled()
    
    # Cleanup cancels active task2
    await manager.cleanup()
    await asyncio.sleep(0)
    assert task2.cancelled()


@pytest.mark.asyncio
async def test_compaction_invokes_variable_extraction_llm_if_available(mock_engine):
    """Ensure background context summarization invokes the extraction LLM when configured."""
    mock_extraction_llm = MagicMock(name="variable_extraction_llm")
    mock_extraction_llm.model_name = "gpt-4.1-mini"
    mock_extraction_llm._generate_summary = AsyncMock(return_value=("GPT-4.1 summary", 4))
    mock_engine.variable_extraction_llm = mock_extraction_llm

    mock_engine.context.set_messages([
        {"role": "system", "content": "Prompt"},
        {"role": "user", "content": "1"}, {"role": "assistant", "content": "2"},
        {"role": "user", "content": "3"}, {"role": "assistant", "content": "4"},
        {"role": "user", "content": "5"}, {"role": "assistant", "content": "6"},
    ])

    manager = ContextSummarizationManager(mock_engine)
    await manager._summarize_context_in_background()

    # The dedicated extraction LLM should be invoked, NOT primary llm
    mock_extraction_llm._generate_summary.assert_awaited_once()
    mock_engine.llm._generate_summary.assert_not_called()
    assert mock_engine.context.messages[1]["content"] == "Conversation summary: GPT-4.1 summary"
