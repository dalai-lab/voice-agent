"use client";

import {
    AlertCircle,
    CheckCircle2,
    ClipboardCheck,
    Code,
    Copy,
    FileCheck,
    HelpCircle,
    ListFilter,
    XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";

interface QaScorecardSectionProps {
    annotations: Record<string, unknown> | null | undefined;
}

export function QaScorecardSection({ annotations }: QaScorecardSectionProps) {
    const [viewMode, setViewMode] = useState<"cards" | "json">("cards");
    const [copied, setCopied] = useState(false);

    if (!annotations || Object.keys(annotations).length === 0) {
        return null;
    }

    const entries = Object.entries(annotations);

    const handleCopy = async () => {
        try {
            await copyTextToClipboard(JSON.stringify(annotations, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fail silent
        }
    };

    return (
        <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md p-5 shadow-xs space-y-4 text-left">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        QA & Compliance Evaluation
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border/50">
                        {entries.length} {entries.length === 1 ? "audit" : "audits"}
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
                            <ListFilter className="h-3 w-3" />
                            <span>Report</span>
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
                        onClick={handleCopy}
                        className="h-7 gap-1 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied" : "Copy"}
                    </Button>
                </div>
            </div>

            {/* QA Content */}
            {viewMode === "cards" ? (
                <div className="space-y-3">
                    {entries.map(([key, val]) => {
                        const isBool = typeof val === "boolean";
                        const isPassed = val === true || String(val).toLowerCase().includes("pass");
                        const isFailed = val === false || String(val).toLowerCase().includes("fail");

                        return (
                            <div
                                key={key}
                                className="rounded-xl border border-border/60 bg-background/60 p-3.5 space-y-2 shadow-2xs"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {isPassed ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        ) : isFailed ? (
                                            <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                        ) : (
                                            <FileCheck className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                        <span className="text-xs font-bold text-foreground">
                                            {key.replace(/_/g, " ")}
                                        </span>
                                    </div>

                                    {isBool && (
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                val
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                            }`}
                                        >
                                            {val ? "PASSED" : "FAILED"}
                                        </span>
                                    )}
                                </div>

                                {!isBool && (
                                    <div className="text-xs text-foreground/90 pl-6 leading-relaxed">
                                        {typeof val === "object" && val !== null ? (
                                            <pre className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 overflow-x-auto max-h-48">
                                                {JSON.stringify(val, null, 2)}
                                            </pre>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{String(val)}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <pre className="text-xs font-mono text-foreground bg-muted/30 p-4 rounded-xl border border-border/50 overflow-x-auto max-h-96">
                    {JSON.stringify(annotations, null, 2)}
                </pre>
            )}
        </div>
    );
}

