"use client";

import {
    ArrowRight,
    Check,
    Copy,
    FileText,
    Headphones,
    Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { WorkflowRunResponseSchema } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { UniversalPciCell } from "./UniversalPciCell";

interface PciRowDrawerProps {
    run: WorkflowRunResponseSchema;
    schema?: Array<{ name: string; type?: string; description?: string }> | null;
}

export function PciRowDrawer({ run, schema }: PciRowDrawerProps) {
    const router = useRouter();
    const [copiedSummary, setCopiedSummary] = useState(false);

    const extracted = run.extracted_data as Record<string, unknown> | null | undefined;
    if (!extracted || Object.keys(extracted).length === 0) {
        return (
            <div className="p-4 bg-muted/20 border-b border-border/50 text-xs text-muted-foreground flex items-center justify-between">
                <span>No Post-Call Intelligence extracted for this call yet.</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => router.push(`/workflow/${run.workflow_id}/run/${run.id}`)}
                >
                    View Call Dossier <ArrowRight className="h-3 w-3" />
                </Button>
            </div>
        );
    }

    // Detect summary field
    const summaryKey = Object.keys(extracted).find(
        (k) =>
            k.toLowerCase().includes("summary") ||
            k.toLowerCase().includes("overview") ||
            k.toLowerCase().includes("notes")
    );
    const summaryText = summaryKey && typeof extracted[summaryKey] === "string" ? String(extracted[summaryKey]) : null;

    // Remaining business variables
    const otherEntries = Object.entries(extracted).filter(
        ([key]) => key !== summaryKey && !key.toLowerCase().includes("node")
    );

    const handleCopySummary = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!summaryText) return;
        try {
            await copyTextToClipboard(summaryText);
            setCopiedSummary(true);
            setTimeout(() => setCopiedSummary(false), 2000);
        } catch {
            // fail silent
        }
    };

    return (
        <div className="bg-muted/15 border-b border-border/60 p-4 md:p-5 space-y-4 text-left transition-all animate-in fade-in-50 duration-200">
            {/* Header & Quick Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Call Intelligence & Summary
                    </h4>
                    <span className="text-[11px] font-mono text-muted-foreground">
                        Run #{run.id}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {run.recording_url && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border/50">
                            <Headphones className="h-3 w-3 text-primary" />
                            Audio Available
                        </span>
                    )}
                    <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs font-semibold gap-1.5 rounded-lg shadow-2xs"
                        onClick={() => router.push(`/workflow/${run.workflow_id}/run/${run.id}`)}
                    >
                        <span>Full Call Dossier</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Executive Call Summary (Col 7) */}
                {summaryText && (
                    <div className="lg:col-span-7 rounded-xl border border-border/60 bg-background/80 p-3.5 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-indigo-500" />
                                Executive Call Summary
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopySummary}
                                className="h-6 px-2 text-[10px] font-medium gap-1 text-muted-foreground hover:text-foreground"
                            >
                                {copiedSummary ? (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-500" />
                                        <span>Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-2.5 w-2.5" />
                                        <span>Copy</span>
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed font-normal italic">
                            "{summaryText}"
                        </p>
                    </div>
                )}

                {/* Structured Key-Value Grid (Col 5) */}
                <div className={`${summaryText ? "lg:col-span-5" : "lg:col-span-12"} rounded-xl border border-border/60 bg-background/80 p-3.5 shadow-2xs space-y-2.5`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Extracted Business Data
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {otherEntries.map(([key, val]) => {
                            const fieldDef = schema?.find((s) => s.name === key);
                            return (
                                <div key={key} className="p-2 rounded-lg border border-border/40 bg-muted/20 space-y-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                                        {key.replace(/_/g, " ")}
                                    </span>
                                    <div>
                                        <UniversalPciCell fieldKey={key} value={val} fieldType={fieldDef?.type} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

