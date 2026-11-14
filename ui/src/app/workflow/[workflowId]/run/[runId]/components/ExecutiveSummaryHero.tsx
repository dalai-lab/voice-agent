"use client";

import { Check, Copy, FileText, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getDispositionBadge } from "@/lib/dispositionLabels";

interface ExecutiveSummaryHeroProps {
    summary: string;
    callDisposition?: string | null;
    mappedDisposition?: string | null;
    isCompleted?: boolean;
}

export function ExecutiveSummaryHero({
    summary,
    callDisposition,
    mappedDisposition,
    isCompleted = true,
}: ExecutiveSummaryHeroProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await copyTextToClipboard(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fail silent
        }
    };

    const dispositionToUse = mappedDisposition || callDisposition;
    const dispBadge = dispositionToUse ? getDispositionBadge(dispositionToUse) : null;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.07] via-background to-background p-5 md:p-6 shadow-sm text-left">
            {/* Top Bar with Badge Indicators & Copy Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3.5 mb-3.5">
                <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-500/15 text-indigo-500 border border-indigo-500/30 shadow-2xs">
                        <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                            Executive Call Summary
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-normal">
                            Synthesized by the Intelligence LLM across all call turns
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {dispBadge && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap shadow-2xs ${dispBadge.className}`}>
                            {dispBadge.label}
                        </span>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="h-7 px-2.5 text-xs font-medium gap-1.5 rounded-lg border-border/70 hover:bg-muted shadow-2xs"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-600 font-semibold text-xs">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3 w-3 text-muted-foreground" />
                                <span>Copy Summary</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Summary Text Body */}
            <div className="relative pl-3 border-l-2 border-indigo-500/40">
                <p className="text-[13px] md:text-sm text-foreground/95 leading-relaxed font-normal whitespace-pre-wrap">
                    "{summary}"
                </p>
            </div>
        </div>
    );
}

