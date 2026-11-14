"use client";

import {
    ArrowRight,
    Check,
    Code,
    Compass,
    Copy,
    GitCommit,
    Layers,
    Tag,
} from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getDispositionBadge } from "@/lib/dispositionLabels";

interface NodeJourneySectionProps {
    gatheredContext: Record<string, unknown> | null | undefined;
}

export function NodeJourneySection({ gatheredContext }: NodeJourneySectionProps) {
    const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
    const [copied, setCopied] = useState(false);

    if (!gatheredContext || Object.keys(gatheredContext).length === 0) {
        return null;
    }

    // Extract visited nodes
    const rawNodes = gatheredContext.nodes_visited;
    const nodesVisited: string[] = Array.isArray(rawNodes)
        ? rawNodes.map(String)
        : [];

    // Extract dispositions
    const rawDisp =
        (gatheredContext.mapped_call_disposition as string | undefined) ||
        (gatheredContext.call_disposition as string | undefined) ||
        (gatheredContext.disposition as string | undefined);
    const dispBadge = rawDisp ? getDispositionBadge(rawDisp) : null;

    // Extract tags
    const rawTags = gatheredContext.call_tags;
    const callTags: string[] = Array.isArray(rawTags) ? rawTags.map(String) : [];

    // Other in-call context variables
    const otherContextEntries = Object.entries(gatheredContext).filter(([key, val]) => {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (
            cleanKey.includes("nodesvisited") ||
            cleanKey.includes("calldisposition") ||
            cleanKey.includes("mappedcalldisposition") ||
            cleanKey.includes("calltags") ||
            cleanKey.includes("traceurl") ||
            cleanKey === "extractedvariables" ||
            cleanKey === "extracteddata"
        ) {
            return false;
        }
        if (val && typeof val === "object" && !Array.isArray(val)) {
            const childKeys = Object.keys(val);
            if (childKeys.length > 0 && childKeys.some(ck => ck in (gatheredContext as any))) {
                return false;
            }
        }
        return true;
    });

    const handleCopy = async () => {
        try {
            await copyTextToClipboard(JSON.stringify(gatheredContext, null, 2));
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
                    <span className="flex items-center justify-center h-6 w-6 rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/20">
                        <Compass className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        In-Call Traversal & Context
                    </h3>
                    {nodesVisited.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border/50">
                            {nodesVisited.length} {nodesVisited.length === 1 ? "node" : "nodes"} visited
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher: Visual vs JSON */}
                    <div className="flex items-center gap-1 border border-border bg-secondary/40 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode("visual")}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${viewMode === "visual"
                                    ? "bg-background text-foreground shadow-2xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Layers className="h-3 w-3" />
                            <span>Visual Path</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("json")}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${viewMode === "json"
                                    ? "bg-background text-foreground shadow-2xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Code className="h-3 w-3" />
                            <span>Raw Context</span>
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-7 gap-1 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied" : "Copy"}
                    </Button>
                </div>
            </div>

            {viewMode === "visual" ? (
                <div className="space-y-4">
                    {/* Visited Nodes Stepper Journey */}
                    {nodesVisited.length > 0 && (
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Conversation Flow Journey
                            </span>
                            <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-border/60 bg-background/60">
                                {nodesVisited.map((node, idx) => (
                                    <React.Fragment key={idx}>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/40 border border-border/50 text-foreground">
                                            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                                {idx + 1}
                                            </span>
                                            <span>{node}</span>
                                        </div>
                                        {idx < nodesVisited.length - 1 && (
                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Disposition and Tags Row */}
                    {(dispBadge || callTags.length > 0) && (
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            {dispBadge && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Disposition:
                                    </span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${dispBadge.className}`}>
                                        {dispBadge.label}
                                    </span>
                                </div>
                            )}

                            {callTags.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        Tags:
                                    </span>
                                    {callTags.map((tag, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/50">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Turn-Level Variables Grid */}
                    {otherContextEntries.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/30">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Turn Variables Collected
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {otherContextEntries.map(([key, val]) => (
                                    <div key={key} className="p-2.5 rounded-xl border border-border/50 bg-background/50 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                                            {key.replace(/_/g, " ")}
                                        </span>
                                        <div className="text-xs font-medium text-foreground truncate" title={String(val)}>
                                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <pre className="text-xs font-mono text-foreground bg-muted/30 p-4 rounded-xl border border-border/50 overflow-x-auto max-h-96">
                    {JSON.stringify(gatheredContext, null, 2)}
                </pre>
            )}
        </div>
    );
}

