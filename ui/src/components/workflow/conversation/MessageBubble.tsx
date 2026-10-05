"use client";

import { useState } from "react";
import { Brain, Zap, Activity, Mic, Wrench, ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LatencyBreakdown } from "./types";

interface MessageBubbleProps {
    role: "user" | "assistant";
    text: string;
    final?: boolean;
    tone?: "default" | "muted";
    reasoningDurationMs?: number;
    e2eLatencyMs?: number;
    latencyBreakdown?: LatencyBreakdown;
    containerClassName?: string;
}

export function MessageBubble({
    role,
    text,
    final = true,
    tone = "default",
    reasoningDurationMs,
    e2eLatencyMs,
    latencyBreakdown,
    containerClassName,
}: MessageBubbleProps) {
    const isUser = role === "user";
    const isMuted = tone === "muted";
    const [metricsExpanded, setMetricsExpanded] = useState(false);

    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start", containerClassName)}>
            <div className="flex max-w-[85%] flex-col gap-1">
                {!isUser && (reasoningDurationMs !== undefined || e2eLatencyMs !== undefined || latencyBreakdown !== undefined) ? (
                    <div className="flex flex-col gap-1 px-1 text-xs text-muted-foreground">
                        <button
                            onClick={() => setMetricsExpanded(!metricsExpanded)}
                            className="flex items-center gap-1.5 hover:text-foreground transition-colors w-fit select-none"
                        >
                            {metricsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <span>
                                ⏱️ Response Time:{" "}
                                {e2eLatencyMs !== undefined
                                    ? `${(e2eLatencyMs / 1000).toFixed(1)}s`
                                    : reasoningDurationMs !== undefined
                                      ? `${(reasoningDurationMs / 1000).toFixed(1)}s`
                                      : "Details"}
                            </span>
                        </button>

                        {metricsExpanded && (
                            <div className="flex flex-col gap-1 mt-1 border-l-2 border-border/50 pl-2 ml-1.5 mb-1 animate-in fade-in slide-in-from-top-1">
                                {(reasoningDurationMs !== undefined || e2eLatencyMs !== undefined) && latencyBreakdown === undefined && (
                                    <div className="flex flex-col gap-1">
                                        {reasoningDurationMs !== undefined && (
                                            <div className="flex items-center gap-1.5">
                                                <Brain className="h-3 w-3" />
                                                <span className="font-medium">Reasoning Delay:</span>
                                                <span>{Math.round(reasoningDurationMs)}ms</span>
                                            </div>
                                        )}
                                        {e2eLatencyMs !== undefined && (
                                            <div className="flex items-center gap-1.5">
                                                <Zap className="h-3 w-3" />
                                                <span className="font-medium">E2E:</span>
                                                <span>{Math.round(e2eLatencyMs)}ms</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {latencyBreakdown !== undefined && (
                                    <div className="flex flex-col gap-1 mt-1 border-t border-border/50 pt-2">
                                        {latencyBreakdown.user_turn_secs !== undefined && latencyBreakdown.user_turn_secs !== null && (
                                            <div className="flex items-center gap-1.5">
                                                <Mic className="h-3 w-3" />
                                                <span className="font-medium">VAD+STT:</span>
                                                <span>{Math.round(latencyBreakdown.user_turn_secs * 1000)}ms</span>
                                            </div>
                                        )}
                                        {latencyBreakdown.ttfb && latencyBreakdown.ttfb.length > 0 && latencyBreakdown.ttfb.map((t, i) => (
                                            <div key={i} className="flex items-center gap-1.5">
                                                <Brain className="h-3 w-3" />
                                                <span className="font-medium">TTFB ({t.processor.replace(/Service#\d+$/, "")}):</span>
                                                <span>{Math.round(t.duration_secs * 1000)}ms</span>
                                            </div>
                                        ))}
                                        {latencyBreakdown.text_aggregation_secs !== undefined && latencyBreakdown.text_aggregation_secs !== null && (
                                            <div className="flex items-center gap-1.5">
                                                <Activity className="h-3 w-3" />
                                                <span className="font-medium">TTS Aggregation:</span>
                                                <span>{Math.round(latencyBreakdown.text_aggregation_secs * 1000)}ms</span>
                                            </div>
                                        )}
                                        {latencyBreakdown.function_calls && latencyBreakdown.function_calls.length > 0 && latencyBreakdown.function_calls.map((f, i) => (
                                            <div key={i} className="flex items-center gap-1.5">
                                                <Wrench className="h-3 w-3" />
                                                <span className="font-medium">Tool ({f.name}):</span>
                                                <span>{Math.round(f.duration_secs * 1000)}ms</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
                <div
                    className={cn(
                        "whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        isUser
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : isMuted
                                ? "rounded-bl-md border border-dashed border-border bg-background text-muted-foreground"
                                : "rounded-bl-md border border-slate-200/80 bg-muted text-foreground",
                        !final && "opacity-70",
                    )}
                >
                    <div>{text}</div>
                    {!final ? (
                        <div
                            className={cn(
                                "mt-1 text-[10px] italic",
                                isUser ? "text-primary-foreground/70" : "text-muted-foreground",
                            )}
                        >
                            speaking...
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
