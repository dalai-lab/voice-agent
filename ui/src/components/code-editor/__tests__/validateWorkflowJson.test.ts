import { describe, expect, it } from "vitest";

import type { NodeSpec } from "@/client/types.gen";

import {
  transitionToolName,
  validateWorkflowJson,
} from "../validateWorkflowJson";

describe("validateWorkflowJson", () => {
  const cleanWorkflow = JSON.stringify({
    nodes: [
      { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
      { id: "a", type: "agentNode", position: { x: 200, y: 0 }, data: { name: "Agent" } },
      { id: "e", type: "endCall", position: { x: 400, y: 0 }, data: { name: "End" } },
    ],
    edges: [
      { id: "s-a", source: "s", target: "a", data: { label: "start to agent" } },
      { id: "a-e", source: "a", target: "e", data: { label: "agent to end" } },
    ],
  });

  it("validates clean startCall -> agentNode -> endCall workflow", () => {
    const res = validateWorkflowJson(cleanWorkflow);
    expect(res.isValid).toBe(true);
    expect(res.syntaxError).toBeNull();
    expect(res.parsedWorkflow?.nodes).toHaveLength(3);
    expect(res.parsedWorkflow?.edges).toHaveLength(2);
  });

  it("validates start_only workflow (startCall with no edges)", () => {
    const json = JSON.stringify({
      nodes: [{ id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } }],
      edges: [],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(true);
    expect(res.parsedWorkflow?.nodes).toHaveLength(1);
  });

  it("supports dual schema with wrapped workflow_definition and name", () => {
    const wrapped = JSON.stringify({
      name: "Outbound Qualification",
      workflow_definition: {
        nodes: [{ id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } }],
        edges: [],
        viewport: { x: 10, y: 20, zoom: 1 },
      },
    });
    const res = validateWorkflowJson(wrapped);
    expect(res.isValid).toBe(true);
    expect(res.parsedWorkflow?.name).toBe("Outbound Qualification");
    expect(res.parsedWorkflow?.viewport).toEqual({ x: 10, y: 20, zoom: 1 });
  });

  it("rejects invalid JSON syntax with detailed line/column diagnosis", () => {
    const broken = '{\n  "nodes": [\n    {"id": "s"\n  ]\n}';
    const res = validateWorkflowJson(broken);
    expect(res.isValid).toBe(false);
    expect(res.syntaxError).not.toBeNull();
    expect(res.syntaxLine).toBeGreaterThan(0);
    expect(res.issues[0].kind).toBe("syntax");
  });

  it("rejects missing startCall node", () => {
    const json = JSON.stringify({
      nodes: [{ id: "a", type: "agentNode", position: { x: 0, y: 0 }, data: { name: "Agent" } }],
      edges: [],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("at least one Start Call"))).toBe(true);
  });

  it("rejects multiple startCall nodes", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s1", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start 1" } },
        { id: "s2", type: "startCall", position: { x: 100, y: 0 }, data: { name: "Start 2" } },
      ],
      edges: [],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("at most one Start Call"))).toBe(true);
  });

  it("rejects multiple globalNode nodes", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "g1", type: "globalNode", position: { x: 0, y: 100 }, data: { name: "G1" } },
        { id: "g2", type: "globalNode", position: { x: 0, y: 200 }, data: { name: "G2" } },
      ],
      edges: [],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("at most one Global Node"))).toBe(true);
  });

  it("rejects multiple trigger nodes", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "t1", type: "trigger", position: { x: 0, y: 100 }, data: { name: "T1" } },
        { id: "t2", type: "trigger", position: { x: 0, y: 200 }, data: { name: "T2" } },
      ],
      edges: [],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("at most one API Trigger"))).toBe(true);
  });

  it("rejects incoming edge into startCall", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "a", type: "agentNode", position: { x: 100, y: 0 }, data: { name: "Agent" } },
      ],
      edges: [{ id: "e1", source: "a", target: "s" }],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("Start Call cannot have incoming edges"))).toBe(true);
  });

  it("rejects outgoing edge from globalNode", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "g", type: "globalNode", position: { x: 0, y: 100 }, data: { name: "G" } },
        { id: "a", type: "agentNode", position: { x: 100, y: 0 }, data: { name: "Agent" } },
      ],
      edges: [{ id: "e1", source: "g", target: "a" }],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("Global Node cannot have outgoing edges"))).toBe(true);
  });

  it("rejects incoming edge into globalNode", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "g", type: "globalNode", position: { x: 0, y: 100 }, data: { name: "G" } },
      ],
      edges: [{ id: "e1", source: "s", target: "g" }],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("Global Node cannot have incoming edges"))).toBe(true);
  });

  it("rejects incoming and outgoing edges for webhook", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "w", type: "webhook", position: { x: 0, y: 100 }, data: { name: "Webhook" } },
      ],
      edges: [
        { id: "e1", source: "s", target: "w" },
        { id: "e2", source: "w", target: "s" },
      ],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("Webhook cannot have incoming edges"))).toBe(true);
    expect(res.issues.some((i) => i.message.includes("Webhook cannot have outgoing edges"))).toBe(true);
  });

  it("rejects edges referencing missing source or target nodes", () => {
    const json = JSON.stringify({
      nodes: [{ id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } }],
      edges: [
        { id: "e1", source: "missing_src", target: "s" },
        { id: "e2", source: "s", target: "missing_target" },
      ],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("references non-existent source node 'missing_src'"))).toBe(true);
    expect(res.issues.some((i) => i.message.includes("references non-existent target node 'missing_target'"))).toBe(true);
  });

  it("rejects duplicate node IDs", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "node-1", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "node-1", type: "agentNode", position: { x: 100, y: 0 }, data: { name: "Agent" } },
      ],
      edges: [],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes("Duplicate node ID 'node-1'"))).toBe(true);
  });

  it("detects transition tool name collisions from the same node", () => {
    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "a1", type: "agentNode", position: { x: 100, y: 0 }, data: { name: "A1" } },
        { id: "a2", type: "agentNode", position: { x: 100, y: 100 }, data: { name: "A2" } },
      ],
      edges: [
        { id: "e1", source: "s", target: "a1", data: { label: "User is interested" } },
        { id: "e2", source: "s", target: "a2", data: { label: "user_is_interested" } },
      ],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(false);
    expect(
      res.issues.some((i) =>
        i.message.includes('Transition tool name "user_is_interested" is duplicated')
      )
    ).toBe(true);
  });

  it("slugifies transition tool names correctly", () => {
    expect(transitionToolName("User is Interested!")).toBe("user_is_interested_");
    expect(transitionToolName("callback-requested")).toBe("callback_requested");
  });

  it("surfaces non-fatal warning when node lacks position coordinates", () => {
    const json = JSON.stringify({
      nodes: [{ id: "s", type: "startCall", data: { name: "Start" } }],
      edges: [],
    });
    const res = validateWorkflowJson(json);
    expect(res.isValid).toBe(true); // Still valid because missing coords can be auto-laid out!
    expect(res.issues.some((i) => i.severity === "warning" && i.field === "position")).toBe(true);
  });

  it("enforces max_instances from dynamic specs", () => {
    const customSpecs: NodeSpec[] = [
      {
        name: "paygent",
        display_name: "Paygent Integration",
        description: "Payment collection",
        category: "integration" as NodeSpec["category"],
        icon: "credit-card",
        properties: [],
        graph_constraints: { max_instances: 1 },
      },
    ];

    const json = JSON.stringify({
      nodes: [
        { id: "s", type: "startCall", position: { x: 0, y: 0 }, data: { name: "Start" } },
        { id: "p1", type: "paygent", position: { x: 100, y: 0 }, data: { name: "Pay 1" } },
        { id: "p2", type: "paygent", position: { x: 100, y: 100 }, data: { name: "Pay 2" } },
      ],
      edges: [],
    });

    const res = validateWorkflowJson(json, customSpecs);
    expect(res.isValid).toBe(false);
    expect(
      res.issues.some((i) => i.message.includes("Paygent Integration limit reached (1 allowed, found 2)"))
    ).toBe(true);
  });
});
