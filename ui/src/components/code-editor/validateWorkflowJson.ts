import type { NodeSpec } from "@/client/types.gen";
import type { FlowEdge, FlowNode } from "@/components/flow/types";

export type IssueSeverity = "fatal" | "warning";
export type IssueKind = "syntax" | "node" | "edge" | "workflow";

export interface ValidationIssue {
  severity: IssueSeverity;
  kind: IssueKind;
  id?: string;
  field?: string;
  line?: number;
  column?: number;
  message: string;
}

export interface ParsedWorkflow {
  name?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface ValidationResult {
  isValid: boolean;
  syntaxError: string | null;
  syntaxLine?: number;
  syntaxColumn?: number;
  issues: ValidationIssue[];
  parsedWorkflow: ParsedWorkflow | null;
}

/**
 * Returns the slugified LLM function tool name for a transition edge label,
 * matching api.services.workflow.workflow_graph.transition_tool_name.
 */
export function transitionToolName(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/**
 * Parses JSON and generates detailed diagnostic information with line and column numbers.
 */
export function parseJsonWithDiagnostics(raw: string): {
  valid: boolean;
  parsed?: unknown;
  error?: string;
  line?: number;
  column?: number;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: "Workflow JSON is empty",
      line: 1,
      column: 1,
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return { valid: true, parsed };
  } catch (err) {
    const rawError = err instanceof Error ? err.message : "Invalid JSON";
    let line: number | undefined;
    let column: number | undefined;

    const posMatch = rawError.match(/position\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const prefix = trimmed.substring(0, pos);
      const lines = prefix.split("\n");
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else {
      const lineColMatch = rawError.match(/line\s+(\d+)\s+column\s+(\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      }
    }

    let helpfulHint = rawError;
    if (/:\s*\{\{[^}]+\}\}/.test(trimmed)) {
      helpfulHint =
        "Template variables must be quoted strings. Use \"{{variable}}\" instead of {{variable}}";
    } else if (/,\s*[}\]]/.test(trimmed)) {
      helpfulHint = "Trailing comma detected before closing bracket";
    } else if (/"\s*\n\s*"/.test(trimmed)) {
      helpfulHint = "Missing comma between properties";
    } else if (/'[^']*'\s*:/.test(trimmed) || /:\s*'[^']*'/.test(trimmed)) {
      helpfulHint = "Single quotes detected. JSON requires double quotes";
    }

    const loc = line ? ` (line ${line}, col ${column ?? 1})` : "";
    return {
      valid: false,
      error: `Invalid JSON syntax${loc}: ${helpfulHint}`,
      line: line ?? 1,
      column: column ?? 1,
    };
  }
}

/**
 * Core Production Validator for Workflow JSON.
 * Enforces syntax, structural integrity, and the full Production Graph Constraint Matrix.
 */
export function validateWorkflowJson(
  rawJson: string,
  specs: NodeSpec[] = []
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Syntax parse
  const syntaxCheck = parseJsonWithDiagnostics(rawJson);
  if (!syntaxCheck.valid || !syntaxCheck.parsed) {
    const issue: ValidationIssue = {
      severity: "fatal",
      kind: "syntax",
      line: syntaxCheck.line,
      column: syntaxCheck.column,
      message: syntaxCheck.error || "Invalid JSON syntax",
    };
    return {
      isValid: false,
      syntaxError: syntaxCheck.error || "Invalid JSON syntax",
      syntaxLine: syntaxCheck.line,
      syntaxColumn: syntaxCheck.column,
      issues: [issue],
      parsedWorkflow: null,
    };
  }

  const rawParsed = syntaxCheck.parsed;
  if (!rawParsed || typeof rawParsed !== "object" || Array.isArray(rawParsed)) {
    const issue: ValidationIssue = {
      severity: "fatal",
      kind: "syntax",
      message: "Workflow JSON must be an object at the top level",
    };
    return {
      isValid: false,
      syntaxError: issue.message,
      issues: [issue],
      parsedWorkflow: null,
    };
  }

  // 2. Dual Schema Unwrapping
  let extractedNodes: unknown[] = [];
  let extractedEdges: unknown[] = [];
  let extractedViewport: { x: number; y: number; zoom: number } | undefined;
  let extractedName: string | undefined;

  const candidateObj = rawParsed as Record<string, unknown>;
  if (
    "workflow_definition" in candidateObj &&
    candidateObj.workflow_definition &&
    typeof candidateObj.workflow_definition === "object"
  ) {
    const def = candidateObj.workflow_definition as Record<string, unknown>;
    extractedNodes = Array.isArray(def.nodes) ? def.nodes : [];
    extractedEdges = Array.isArray(def.edges) ? def.edges : [];
    if (def.viewport && typeof def.viewport === "object") {
      extractedViewport = def.viewport as { x: number; y: number; zoom: number };
    }
    if (typeof candidateObj.name === "string" && candidateObj.name.trim()) {
      extractedName = candidateObj.name.trim();
    }
  } else if ("nodes" in candidateObj && Array.isArray(candidateObj.nodes)) {
    extractedNodes = candidateObj.nodes;
    extractedEdges = Array.isArray(candidateObj.edges) ? candidateObj.edges : [];
    if (candidateObj.viewport && typeof candidateObj.viewport === "object") {
      extractedViewport = candidateObj.viewport as { x: number; y: number; zoom: number };
    }
    if (typeof candidateObj.name === "string" && candidateObj.name.trim()) {
      extractedName = candidateObj.name.trim();
    }
  } else {
    const issue: ValidationIssue = {
      severity: "fatal",
      kind: "workflow",
      message: "Workflow JSON must contain a 'nodes' array",
    };
    return {
      isValid: false,
      syntaxError: null,
      issues: [issue],
      parsedWorkflow: null,
    };
  }

  const nodes = extractedNodes as FlowNode[];
  const edges = extractedEdges as FlowEdge[];

  const specMap = new Map<string, NodeSpec>();
  for (const s of specs) {
    if (s.name) specMap.set(s.name, s);
  }

  // 3. Node Validation
  const nodeIds = new Set<string>();
  const nodesById = new Map<string, FlowNode>();
  const typeCounts = new Map<string, number>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node || typeof node !== "object") {
      issues.push({
        severity: "fatal",
        kind: "node",
        message: `Node at index ${i} is not a valid object`,
      });
      continue;
    }

    const nodeId = typeof node.id === "string" ? node.id.trim() : "";
    if (!nodeId) {
      issues.push({
        severity: "fatal",
        kind: "node",
        field: "id",
        message: `Node at index ${i} is missing a required 'id'`,
      });
      continue;
    }

    if (nodeIds.has(nodeId)) {
      issues.push({
        severity: "fatal",
        kind: "node",
        id: nodeId,
        field: "id",
        message: `Duplicate node ID '${nodeId}'. All node IDs must be unique.`,
      });
    } else {
      nodeIds.add(nodeId);
      nodesById.set(nodeId, node);
    }

    const nodeType = node.type || "agentNode";
    typeCounts.set(nodeType, (typeCounts.get(nodeType) || 0) + 1);

    if (
      !node.position ||
      typeof node.position.x !== "number" ||
      typeof node.position.y !== "number"
    ) {
      issues.push({
        severity: "warning",
        kind: "node",
        id: nodeId,
        field: "position",
        message: `Node '${nodeId}' lacks numeric position coordinates. Layout will be auto-calculated.`,
      });
    }
  }

  // Instance constraint limits
  const startCount = typeCounts.get("startCall") || 0;
  if (startCount === 0) {
    issues.push({
      severity: "fatal",
      kind: "workflow",
      message: "Workflow must have at least one Start Call",
    });
  } else if (startCount > 1) {
    issues.push({
      severity: "fatal",
      kind: "workflow",
      message: `Workflow can have at most one Start Call (found ${startCount})`,
    });
  }

  const globalCount = typeCounts.get("globalNode") || 0;
  if (globalCount > 1) {
    issues.push({
      severity: "fatal",
      kind: "workflow",
      message: `Workflow can have at most one Global Node (found ${globalCount})`,
    });
  }

  const triggerCount = typeCounts.get("trigger") || 0;
  if (triggerCount > 1) {
    issues.push({
      severity: "fatal",
      kind: "workflow",
      message: `Workflow can have at most one API Trigger (found ${triggerCount})`,
    });
  }

  // Generic spec max_instances check
  for (const [typeName, count] of typeCounts.entries()) {
    const spec = specMap.get(typeName);
    const maxInst = spec?.graph_constraints?.max_instances;
    if (
      maxInst !== undefined &&
      maxInst !== null &&
      count > maxInst &&
      typeName !== "startCall" &&
      typeName !== "globalNode" &&
      typeName !== "trigger"
    ) {
      issues.push({
        severity: "fatal",
        kind: "workflow",
        message: `${spec?.display_name || typeName} limit reached (${maxInst} allowed, found ${count})`,
      });
    }
  }

  // 4. Edge Validation & Graph Constraints
  const edgeIds = new Set<string>();
  const outgoingTransitionsByNode = new Map<
    string,
    Array<{ edgeId: string; toolName: string; rawLabel: string }>
  >();

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!edge || typeof edge !== "object") {
      issues.push({
        severity: "fatal",
        kind: "edge",
        message: `Edge at index ${i} is not a valid object`,
      });
      continue;
    }

    const edgeId = typeof edge.id === "string" ? edge.id.trim() : `edge-${i}`;
    if (edgeIds.has(edgeId)) {
      issues.push({
        severity: "fatal",
        kind: "edge",
        id: edgeId,
        message: `Duplicate edge ID '${edgeId}'. All edge IDs must be unique.`,
      });
    } else {
      edgeIds.add(edgeId);
    }

    // Source existence
    const source = edge.source;
    if (!source || !nodesById.has(source)) {
      issues.push({
        severity: "fatal",
        kind: "edge",
        id: edgeId,
        field: "source",
        message: `Edge references non-existent source node '${source}'`,
      });
    } else {
      const sourceNode = nodesById.get(source)!;

      if (sourceNode.type === "globalNode") {
        issues.push({
          severity: "fatal",
          kind: "edge",
          id: edgeId,
          message: "Global Node cannot have outgoing edges",
        });
      }

      if (sourceNode.type === "webhook") {
        issues.push({
          severity: "fatal",
          kind: "edge",
          id: edgeId,
          message: "Webhook cannot have outgoing edges",
        });
      }

      const rawLabel = edge.data?.label || (edge as Record<string, unknown>).label || "";
      if (typeof rawLabel === "string" && rawLabel.trim()) {
        const toolName = transitionToolName(rawLabel);
        if (!outgoingTransitionsByNode.has(source)) {
          outgoingTransitionsByNode.set(source, []);
        }
        outgoingTransitionsByNode.get(source)!.push({
          edgeId,
          toolName,
          rawLabel,
        });
      }
    }

    // Target existence
    const target = edge.target;
    if (!target || !nodesById.has(target)) {
      issues.push({
        severity: "fatal",
        kind: "edge",
        id: edgeId,
        field: "target",
        message: `Edge references non-existent target node '${target}'`,
      });
    } else {
      const targetNode = nodesById.get(target)!;

      if (targetNode.type === "startCall") {
        issues.push({
          severity: "fatal",
          kind: "edge",
          id: edgeId,
          message: "Start Call cannot have incoming edges",
        });
      }

      if (targetNode.type === "globalNode") {
        issues.push({
          severity: "fatal",
          kind: "edge",
          id: edgeId,
          message: "Global Node cannot have incoming edges",
        });
      }

      if (targetNode.type === "webhook") {
        issues.push({
          severity: "fatal",
          kind: "edge",
          id: edgeId,
          message: "Webhook cannot have incoming edges",
        });
      }
    }
  }

  // 5. Duplicate transition tool name collision checks per source node
  for (const [sourceId, transitions] of outgoingTransitionsByNode.entries()) {
    const toolCounts = new Map<string, string[]>();
    for (const t of transitions) {
      if (!toolCounts.has(t.toolName)) {
        toolCounts.set(t.toolName, []);
      }
      toolCounts.get(t.toolName)!.push(t.edgeId);
    }

    for (const [toolName, edgeIdsList] of toolCounts.entries()) {
      if (edgeIdsList.length > 1) {
        const sourceNode = nodesById.get(sourceId);
        const nodeName = sourceNode?.data?.name || sourceId;
        for (const eId of edgeIdsList) {
          issues.push({
            severity: "fatal",
            kind: "edge",
            id: eId,
            field: "data.label",
            message: `Transition tool name "${toolName}" is duplicated for node "${nodeName}". Use a unique edge label.`,
          });
        }
      }
    }
  }

  const hasFatal = issues.some((iss) => iss.severity === "fatal");

  return {
    isValid: !hasFatal,
    syntaxError: null,
    issues,
    parsedWorkflow: hasFatal
      ? null
      : {
          name: extractedName,
          nodes,
          edges,
          viewport: extractedViewport,
        },
  };
}
