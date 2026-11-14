"use client";

import {
    Brain,
    Check,
    CheckCheck,
    Code,
    Copy,
    LayoutGrid,
    Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { UniversalPciCell } from "@/components/workflow-runs/pci/UniversalPciCell";

interface UniversalIntelligenceGridProps {
    extractedData: Record<string, unknown> | null | undefined;
    schema?: Array<{ name: string; type?: string; description?: string }> | null;
    excludeSummary?: boolean;
}

export function UniversalIntelligenceGrid({
    extractedData,
    schema,
    excludeSummary = true,
}: UniversalIntelligenceGridProps) {
    const [viewMode, setViewMode] = useState<"cards" | "json">("cards");
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    if (!extractedData || Object.keys(extractedData).length === 0) {
        return (
            <div className="rounded-xl border border-border/70 bg-card/60 p-6 text-center space-y-2">
                <Brain className="h-7 w-7 text-muted-foreground/40 mx-auto" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    No Post-Call Intelligence
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Post-call intelligence has not extracted data for this call yet or is disabled in workflow settings.
                </p>
            </div>
        );
    }

    const filteredEntries = Object.entries(extractedData).filter(([key]) => {
        const lower = key.toLowerCase();
        if (lower.includes("node") || lower.includes("visited")) return false;
        if (excludeSummary && (lower.includes("summary") || lower.includes("overview") || lower.includes("notes"))) {
            return false;
        }
        return true;
    });

    const handleCopyAll = async () => {
        try {
            await copyTextToClipboard(JSON.stringify(extractedData, null, 2));
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        } catch {
            // fail silent
        }
    };

    const handleCopyValue = async (key: string, val: unknown) => {
        try {
            const textToCopy = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
            await copyTextToClipboard(textToCopy);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        } catch {
            // fail silent
        }
    };

    return (
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-xs space-y-4 text-left">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        <Brain className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Post-Call Intelligence
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border/50">
                        {filteredEntries.length} {filteredEntries.length === 1 ? "field" : "fields"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher: Cards vs JSON */}
                    <div className="flex items-center gap-1 border border-border bg-secondary/40 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                                viewMode === "cards"
                                    ? "bg-background text-foreground shadow-2xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <LayoutGrid className="h-3 w-3" />
                            <span>Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("json")}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                                viewMode === "json"
                                    ? "bg-background text-foreground shadow-2xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Code className="h-3 w-3" />
                            <span>Raw JSON</span>
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyAll}
                        className="h-7 gap-1 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copiedAll ? "Copied" : "Copy"}
                    </Button>
                </div>
            </div>

            {/* Content: Cards View vs Raw JSON */}
            {viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredEntries.map(([key, val]) => {
                        const fieldDef = schema?.find((s) => s.name === key);
                        const isCopied = copiedKey === key;

                        return (
                            <div
                                key={key}
                                className="group relative rounded-xl border border-border/60 bg-background/60 p-3 space-y-1.5 hover:border-border transition-colors shadow-2xs"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                                        {key.replace(/_/g, " ")}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyValue(key, val)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                        title={`Copy ${key.replace(/_/g, " ")}`}
                                    >
                                        {isCopied ? (
                                            <CheckCheck className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-3 w-3" />
                                        )}
                                    </button>
                                </div>

                                <div className="text-xs font-semibold text-foreground pt-0.5">
                                    <UniversalPciCell fieldKey={key} value={val} fieldType={fieldDef?.type} />
                                </div>

                                {fieldDef?.description && (
                                    <p className="text-[10px] text-muted-foreground/70 leading-tight pt-1 border-t border-border/30 truncate">
                                        {fieldDef.description}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <pre className="text-xs font-mono text-foreground bg-muted/30 p-4 rounded-xl border border-border/50 overflow-x-auto max-h-96">
                    {JSON.stringify(extractedData, null, 2)}
                </pre>
            )}
        </div>
    );
}

