from fastmcp import FastMCP
from mcp.types import ToolAnnotations

from api.mcp_server.instructions import DOGRAH_MCP_INSTRUCTIONS, TALKAR_MCP_INSTRUCTIONS
from api.mcp_server.tools.call_logs import get_call_details, list_call_logs
from api.mcp_server.tools.campaigns import (
    get_campaign_status,
    list_campaigns,
    update_campaign_status,
)
from api.mcp_server.tools.catalog import (
    list_credentials,
    list_documents,
    list_recordings,
    list_tools,
)
from api.mcp_server.tools.create_workflow import create_workflow
from api.mcp_server.tools.docs_search import list_docs, read_doc, search_docs
from api.mcp_server.tools.get_workflow_code import get_workflow_code
from api.mcp_server.tools.node_types import get_node_type, list_node_types
from api.mcp_server.tools.save_workflow import save_workflow
from api.mcp_server.tools.telephony import (
    list_phone_numbers,
    update_phone_number_routing,
)
from api.mcp_server.tools.tool_creation import create_tool
from api.mcp_server.tools.voice_prompting_guide import get_voice_prompting_guide
from api.mcp_server.tools.wallet import get_wallet_balance, list_wallet_transactions
from api.mcp_server.tools.workflow_settings import (
    get_workflow_report,
    get_workflow_settings,
    update_workflow_settings,
)
from api.mcp_server.tools.workflows import get_workflow, list_workflows

mcp = FastMCP("talkar", instructions=TALKAR_MCP_INSTRUCTIONS)

_READ_ONLY_TOOL_ANNOTATIONS = ToolAnnotations(
    readOnlyHint=True,
    idempotentHint=True,
    destructiveHint=False,
    openWorldHint=False,
)

_MUTATING_TOOL_ANNOTATIONS = ToolAnnotations(
    readOnlyHint=False,
    idempotentHint=False,
    destructiveHint=False,
    openWorldHint=False,
)

# Read-only discovery, inspection, docs, telephony, billing, logs, campaigns, and settings tools
for _tool in (
    get_voice_prompting_guide,
    list_docs,
    read_doc,
    search_docs,
    list_node_types,
    get_node_type,
    list_workflows,
    get_workflow,
    get_workflow_code,
    list_credentials,
    list_documents,
    list_recordings,
    list_tools,
    list_phone_numbers,
    get_wallet_balance,
    list_wallet_transactions,
    list_call_logs,
    get_call_details,
    list_campaigns,
    get_campaign_status,
    get_workflow_settings,
    get_workflow_report,
):
    mcp.tool(_tool, annotations=_READ_ONLY_TOOL_ANNOTATIONS)

# Mutating workflow creation, tool management, routing, campaigns, and settings tools
for _tool in (
    create_workflow,
    save_workflow,
    create_tool,
    update_phone_number_routing,
    update_campaign_status,
    update_workflow_settings,
):
    mcp.tool(_tool, annotations=_MUTATING_TOOL_ANNOTATIONS)
