import sys

content = open('ui/src/app/tools/config.tsx', 'r', encoding='utf-8').read()

content = content.replace(
    '    TransferCallConfig,\n    TransferCallToolDefinition,\n} from "@/client/types.gen";',
    '    TransferCallConfig,\n    TransferCallToolDefinition,\n    WaitToolDefinition,\n} from "@/client/types.gen";'
)
content = content.replace(
    'export type ToolCategory = "http_api" | "end_call" | "transfer_call" | "calculator" | "native" | "integration" | "mcp";',
    'export type ToolCategory = "http_api" | "end_call" | "transfer_call" | "calculator" | "wait" | "native" | "integration" | "mcp";'
)
wait_block = '''    {
        value: "wait",
        label: "Dynamic Wait",
        description: "Built-in dynamic wait tool to pause the agent when the user asks to wait.",
        icon: Cog,
        iconName: "cog",
        iconColor: "#8B5CF6",
        autoFill: {
            name: "Wait",
            description: "Wait for a specified number of seconds when the user asks you to hold on.",
        },
    },'''
content = content.replace(
    '    {\n        value: "native",\n        label: "Native (Coming Soon)",',
    wait_block + '\n    {\n        value: "native",\n        label: "Native (Coming Soon)",'
)
content = content.replace(
    '        case "calculator":\n            return "Calculator Tool";\n        case "mcp":',
    '        case "calculator":\n            return "Calculator Tool";\n        case "wait":\n            return "Wait Tool";\n        case "mcp":'
)
content = content.replace(
    '    | TransferCallToolDefinition\n    | CalculatorToolDefinition\n    | McpToolDefinition;',
    '    | TransferCallToolDefinition\n    | CalculatorToolDefinition\n    | WaitToolDefinition\n    | McpToolDefinition;'
)
wait_def = '''export function createWaitDefinition(): WaitToolDefinition {
    return {
        type: "wait",
    };
}'''
content = content.replace(
    'export const MCP_URL_PATTERN',
    wait_def + '\n\nexport const MCP_URL_PATTERN'
)
content = content.replace(
    '        case "calculator":\n            return createCalculatorDefinition();\n        case "mcp":',
    '        case "calculator":\n            return createCalculatorDefinition();\n        case "wait":\n            return createWaitDefinition();\n        case "mcp":'
)
open('ui/src/app/tools/config.tsx', 'w', encoding='utf-8').write(content)
