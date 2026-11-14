"""QA LLM service creation and token usage accumulation."""

from typing import Any

from api.db.models import WorkflowRunModel
from api.services.configuration.ai_model_configuration import (
    get_effective_ai_model_configuration_for_workflow,
)
from api.services.managed_model_services import get_mps_correlation_id
from api.services.pipecat.service_factory import (
    create_llm_service,
    create_llm_service_from_provider,
    create_llm_service_with_model_override,
)
from api.services.workflow.dto import QANodeData

QA_USAGE_CONTEXT = "qa_analysis"


async def create_qa_llm_service(
    qa_data: QANodeData | None = None, workflow_run: WorkflowRunModel | None = None
) -> tuple[Any, str] | None:
    """Create the LLM service used for QA analysis.

    If the QA node has its own LLM configuration (qa_use_workflow_llm=False),
    create the service from those explicit settings. Otherwise, resolve the
    workflow/org configuration and delegate service creation to the central factory.
    """
    correlation_id = get_mps_correlation_id(
        getattr(workflow_run, "initial_context", None)
    )

    if qa_data is not None and not qa_data.qa_use_workflow_llm:
        provider = qa_data.qa_provider or "openai"
        model = qa_data.qa_model or "default"
        api_key = qa_data.qa_api_key
        if not api_key:
            return None

        kwargs = {}
        if provider == "azure":
            kwargs["endpoint"] = qa_data.qa_endpoint or ""
        # Custom OpenAI-compatible endpoints are supported only when QA reuses
        # the workflow LLM; the QA-specific endpoint field is Azure-only.
        llm = create_llm_service_from_provider(
            provider,
            model,
            api_key,
            correlation_id=correlation_id,
            usage_context=QA_USAGE_CONTEXT,
            **kwargs,
        )
        return llm, model

    if workflow_run is None or workflow_run.workflow is None:
        return None

    if workflow_run.definition:
        workflow_configurations = workflow_run.definition.workflow_configurations or {}
    else:
        workflow_configurations = workflow_run.workflow.workflow_configurations or {}

    user_configuration = await get_effective_ai_model_configuration_for_workflow(
        organization_id=workflow_run.workflow.organization_id,
        workflow_configurations=workflow_configurations,
    )
    if user_configuration.llm is None and user_configuration.extraction_llm is None:
        return None

    # Always prefer the dedicated intelligence / extraction LLM for background post-call tasks
    if user_configuration.extraction_llm is not None:
        llm = create_llm_service(
            user_configuration.extraction_llm,
            correlation_id=correlation_id,
            usage_context=QA_USAGE_CONTEXT,
        )
        return llm, user_configuration.extraction_llm.model

    base_llm = user_configuration.llm
    if base_llm is None:
        return None

    model_override = (
        qa_data.qa_model if qa_data and qa_data.qa_model and qa_data.qa_model != "default" else None
    )
    model = model_override or base_llm.model
    config_for_override = (
        user_configuration
        if user_configuration.llm is not None
        else user_configuration.model_copy(update={"llm": user_configuration.extraction_llm})
    )
    llm = create_llm_service_with_model_override(
        config_for_override,
        model_override,
        correlation_id=correlation_id,
        usage_context=QA_USAGE_CONTEXT,
    )
    return llm, model


def accumulate_token_usage(total: dict, usage_or_response: Any) -> None:
    """Add token counts from an LLM response or LLMTokenUsage to the running total dict."""
    if not usage_or_response:
        return
    usage = getattr(usage_or_response, "usage", None) or usage_or_response
    if isinstance(usage, dict):
        p_tok = usage.get("prompt_tokens", 0) or 0
        c_tok = usage.get("completion_tokens", 0) or 0
        t_tok = usage.get("total_tokens", 0) or (p_tok + c_tok)
        cr_tok = usage.get("cache_read_input_tokens", 0) or 0
        cc_tok = usage.get("cache_creation_input_tokens", 0) or 0
    else:
        p_tok = getattr(usage, "prompt_tokens", 0) or 0
        c_tok = getattr(usage, "completion_tokens", 0) or 0
        t_tok = getattr(usage, "total_tokens", 0) or (p_tok + c_tok)
        cr_tok = getattr(usage, "cache_read_input_tokens", 0) or 0
        cc_tok = getattr(usage, "cache_creation_input_tokens", 0) or 0

    total["prompt_tokens"] = total.get("prompt_tokens", 0) + p_tok
    total["completion_tokens"] = total.get("completion_tokens", 0) + c_tok
    total["total_tokens"] = total.get("total_tokens", 0) + t_tok
    total["cache_read_input_tokens"] = total.get("cache_read_input_tokens", 0) + cr_tok
    if cc_tok:
        total["cache_creation_input_tokens"] = total.get("cache_creation_input_tokens", 0) + cc_tok
