from fastmcp import FastMCP
from mcp.types import ToolAnnotations

from api.mcp_server.instructions import DOGRAH_MCP_INSTRUCTIONS, TALKAR_MCP_INSTRUCTIONS
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
from api.mcp_server.tools.tool_creation import create_tool
from api.mcp_server.tools.voice_prompting_guide import get_voice_prompting_guide
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

# Read-only discovery, inspection, docs, and prompting guide tools
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
):
    mcp.tool(_tool, annotations=_READ_ONLY_TOOL_ANNOTATIONS)

# Mutating workflow creation and tool management tools
for _tool in (
    create_workflow,
    save_workflow,
    create_tool,
):
    mcp.tool(_tool, annotations=_MUTATING_TOOL_ANNOTATIONS)
