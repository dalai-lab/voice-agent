"use client";

import {
    ArrowRight,
    Check,
    Copy,
    Globe,
    Phone,
    PhoneCall,
    PhoneIncoming,
    PhoneOutgoing,
    User,
    Bot,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/clipboard";

export interface CallRoutingBannerProps {
    callerNumber: string | null;
    calledNumber: string | null;
    callType?: string | null;
    mode?: string | null;
    agentName?: string | null;
}

export function CallRoutingBanner({
    callerNumber,
    calledNumber,
    callType,
    mode,
    agentName,
}: CallRoutingBannerProps) {
    const [copiedCaller, setCopiedCaller] = useState(false);
    const [copiedCalled, setCopiedCalled] = useState(false);

    const isOutbound = callType === "outbound";
    const isInbound = callType === "inbound";
    const isWeb = mode === "web" || mode === "webrtc" || mode === "smallwebrtc" || (!callerNumber && !calledNumber);

    const handleCopy = async (val: string, type: "caller" | "called") => {
        try {
            await copyTextToClipboard(val);
            if (type === "caller") {
                setCopiedCaller(true);
                setTimeout(() => setCopiedCaller(false), 2000);
            } else {
                setCopiedCalled(true);
                setTimeout(() => setCopiedCalled(false), 2000);
            }
            toast.success(`Copied ${val} to clipboard`);
        } catch {
            toast.error("Failed to copy phone number");
        }
    };

    // Label determination
    const callerLabel = isOutbound
        ? "Agent Line (From)"
        : isInbound
        ? "Customer (From)"
        : "Caller";

    const calledLabel = isOutbound
        ? "Customer (To)"
        : isInbound
        ? "Agent Line (To)"
        : "Destination";

    return (
        <div className="w-full rounded-2xl border border-border/80 bg-gradient-to-br from-card/90 via-card/50 to-muted/20 backdrop-blur-md p-4 sm:p-5 shadow-xs text-left transition-all">
            {/* Header / Direction Badge Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                    {isOutbound ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <PhoneOutgoing className="h-3.5 w-3.5" />
                            Outbound Call
                        </span>
                    ) : isInbound ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <PhoneIncoming className="h-3.5 w-3.5" />
                            Inbound Call
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <Globe className="h-3.5 w-3.5" />
                            WebRTC Session
                        </span>
                    )}

                    <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                        {isOutbound
                            ? "Voice agent initiated call to customer"
                            : isInbound
                            ? "Customer dialed inbound agent line"
                            : "Interactive web testing session"}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/80">
                    <span className="uppercase tracking-wider text-[10px]">Routing:</span>
                    <span className="font-mono text-foreground font-bold">
                        {isOutbound ? "Agent → Contact" : isInbound ? "Contact → Agent" : "Browser → Agent"}
                    </span>
                </div>
            </div>

            {/* Visual Call Flow: Caller ──(Called)──> Destination */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 sm:gap-4 items-center pt-3.5">
                {/* Caller / From Card (Col 5) */}
                <div className="md:col-span-5 rounded-xl border border-border/60 bg-background/80 p-3.5 sm:p-4 space-y-1.5 shadow-2xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            {isInbound ? (
                                <User className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                                <Bot className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            <span>{callerLabel}</span>
                        </div>
                        {callerNumber && (
                            <button
                                type="button"
                                onClick={() => handleCopy(callerNumber, "caller")}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                                title="Copy Caller Number"
                            >
                                {copiedCaller ? (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {callerNumber ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <PhoneCall className="h-4 w-4" />
                                </span>
                                <span className="font-mono text-base sm:text-lg font-bold text-foreground tracking-tight select-all truncate">
                                    {callerNumber}
                                </span>
                            </div>
                        ) : isWeb ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                                    <Globe className="h-4 w-4" />
                                </span>
                                <span className="font-medium text-sm sm:text-base text-foreground">
                                    Web Browser Client
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground italic">— No Caller ID —</span>
                        )}
                    </div>
                </div>

                {/* Flow Arrow Divider (Col 1) */}
                <div className="md:col-span-1 flex flex-col items-center justify-center py-1 md:py-0">
                    <div className="hidden md:flex flex-col items-center gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
                            Called
                        </span>
                        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted/60 border border-border/80 text-primary shadow-2xs">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="flex md:hidden items-center justify-center gap-2 w-full py-1 text-muted-foreground/60 text-xs font-bold uppercase tracking-wider">
                        <span>Called ↓</span>
                    </div>
                </div>

                {/* Destination / To Card (Col 5) */}
                <div className="md:col-span-5 rounded-xl border border-border/60 bg-background/80 p-3.5 sm:p-4 space-y-1.5 shadow-2xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            {isOutbound ? (
                                <User className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                                <Bot className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            <span>{calledLabel}</span>
                        </div>
                        {calledNumber && (
                            <button
                                type="button"
                                onClick={() => handleCopy(calledNumber, "called")}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                                title="Copy Called Number"
                            >
                                {copiedCalled ? (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {calledNumber ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Phone className="h-4 w-4" />
                                </span>
                                <span className="font-mono text-base sm:text-lg font-bold text-foreground tracking-tight select-all truncate">
                                    {calledNumber}
                                </span>
                            </div>
                        ) : isWeb ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                                    <Bot className="h-4 w-4" />
                                </span>
                                <span className="font-medium text-sm sm:text-base text-foreground truncate">
                                    {agentName || "Voice Agent Service"}
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground italic">— Unknown Destination —</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

