import { FlowNode, FlowEdge } from "@/components/flow/types";

export interface ContextVarInfo {
    mergedVars: Record<string, string>;
    scannedKeys: string[];
    savedKeys: string[];
}

// System-reserved namespaces — never surface these as user-settable vars
const SYSTEM_NAMESPACES = ["gathered_context", "initial_context", "current_time", "current_weekday"];

export function scanAndMergeInitialContextVars(
    nodes: FlowNode[],
    edges: FlowEdge[],
    savedVars?: Record<string, string> | null
): ContextVarInfo {
    const scannedKeysSet = new Set<string>();

    // Match both:
    //   {{initial_context.key}}  →  strip prefix, surface "key"
    //   {{variable_name}}        →  surface bare "variable_name"
    // Supports optional fallback pipes: {{name | fallback}}
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)(?:\s*\|[^}]*)?\s*\}\}/g;

    const scanString = (str: string) => {
        let match;
        while ((match = regex.exec(str)) !== null) {
            const full = match[1].trim();

            // Skip system-namespaced vars (gathered_context.x, current_time, etc.)
            const topLevel = full.split(".")[0];
            if (SYSTEM_NAMESPACES.includes(topLevel)) continue;

            // {{initial_context.customer_name}} → surface as "customer_name"
            if (full.startsWith("initial_context.")) {
                const key = full.slice("initial_context.".length);
                if (key) scannedKeysSet.add(key);
            } else if (!full.includes(".")) {
                // bare {{variable_name}} — the standard Dograh template var format
                scannedKeysSet.add(full);
            }
            // dotted non-initial_context vars (e.g. some.obj.path) — skip
        }
    };

    // Scan node data
    nodes.forEach(node => {
        if (node.data) {
            scanString(JSON.stringify(node.data));
        }
    });

    // Scan edge data
    edges.forEach(edge => {
        if (edge.data) {
            scanString(JSON.stringify(edge.data));
        }
    });

    const scannedKeys = Array.from(scannedKeysSet).sort();
    const savedKeys = Object.keys(savedVars || {}).sort();

    // Saved vars from settings take precedence (they already have a value)
    const mergedVars: Record<string, string> = { ...(savedVars || {}) };

    // Scanned keys not already in saved vars default to empty string
    scannedKeys.forEach(key => {
        if (!(key in mergedVars)) {
            mergedVars[key] = "";
        }
    });

    return {
        mergedVars,
        scannedKeys,
        savedKeys,
    };
}
