"use client";

import { Cpu, Mic, Volume2, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── helpers ─────────────────────────────────────────────────────────────────

function num(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseFloat(v) || 0;
    return 0;
}

function fmt(n: number, decimals = 0): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toFixed(decimals);
}

// ─── types ────────────────────────────────────────────────────────────────────

interface UsageInfo {
    /** Standard pipeline: LLM token counts */
    llm?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        cached_tokens?: number;
        model?: string;
        provider?: string;
    };
    /** Standard pipeline: STT seconds */
    stt?: {
        audio_seconds?: number;
        model?: string;
        provider?: string;
    };
    /** Standard pipeline: TTS character count */
    tts?: {
        characters?: number;
        model?: string;
        provider?: string;
    };
    call_duration_seconds?: number;
    [key: string]: unknown;
}

interface StsModality {
    tokens?: number;
}

interface StsSection {
    text?: StsModality;
    audio?: StsModality;
    image?: StsModality;
    video?: StsModality;
    thinking?: StsModality;
    /** legacy flat aggregate */
    tokens?: number;
}

interface StsMetadata {
    schemaVersion?: number;
    input?: StsSection;
    output?: StsSection;
    cached?: StsSection;
}

interface CostInfo {
    /** Realtime / STS pipelines store modality-level usage here */
    sts_usage_metadata?: StsMetadata;
    /** Flat token counts from Paygent collector snapshot */
    llm_prompt_tokens?: number;
    llm_completion_tokens?: number;
    llm_cached_tokens?: number;
    /** STT from Paygent collector snapshot */
    stt_audio_seconds?: number;
    /** TTS from Paygent collector snapshot */
    tts_characters?: number;
    call_duration_seconds?: number;
    total_cost_usd?: number;
    dograh_token_usage?: number;
    /** Provider / model slug info from Paygent snapshot */
    stt_provider?: string;
    stt_model?: string;
    llm_provider?: string;
    llm_model?: string;
    tts_provider?: string;
    tts_model?: string;
    sts_provider?: string;
    sts_model?: string;
    is_realtime?: boolean;
    [key: string]: unknown;
}

// ─── extraction ───────────────────────────────────────────────────────────────

interface Extracted {
    /** Standard pipeline values */
    sttSecs: number;
    sttProvider: string;

    llmPrompt: number;
    llmCompletion: number;
    llmCached: number;
    llmProvider: string;

    ttsChars: number;
    ttsProvider: string;

    /** Realtime / STS pipeline */
    isRealtime: boolean;
    stsTextIn: number;
    stsAudioIn: number;
    stsTextOut: number;
    stsAudioOut: number;
    stsThinking: number;
    stsCached: number;
    stsProvider: string;

    hasAny: boolean;
}

function sectionTokens(s: StsSection | undefined): {
    text: number;
    audio: number;
    thinking: number;
    flat: number;
} {
    if (!s) return { text: 0, audio: 0, thinking: 0, flat: 0 };
    return {
        text: num(s.text?.tokens),
        audio: num(s.audio?.tokens),
        thinking: num(s.thinking?.tokens),
        flat: num(s.tokens),
    };
}

function extractUsage(
    usageInfo: Record<string, unknown> | null | undefined,
    costInfo: Record<string, unknown> | null | undefined,
): Extracted {
    const ui = usageInfo as UsageInfo | null | undefined;
    const ci = costInfo as CostInfo | null | undefined;

    // ── Realtime / STS check ──────────────────────────────────────────────────
    const stsRaw = ci?.sts_usage_metadata ?? (ui?.sts_usage_metadata as StsMetadata | undefined);
    const isRealtime = !!(ci?.is_realtime ?? (stsRaw && Object.keys(stsRaw).length > 1));

    if (isRealtime && stsRaw) {
        const inp = sectionTokens(stsRaw.input);
        const out = sectionTokens(stsRaw.output);
        const cch = sectionTokens(stsRaw.cached);

        const textIn = inp.text || inp.flat;
        const audioIn = inp.audio;
        const textOut = out.text || out.flat;
        const audioOut = out.audio;
        const thinking = out.thinking;
        const cached = cch.text + cch.audio + cch.flat;
        const provider = ci?.sts_provider ?? ci?.llm_provider ?? (ui?.sts_provider as string) ?? "";

        const hasAny = !!(textIn || audioIn || textOut || audioOut || thinking || cached);
        return {
            sttSecs: 0, sttProvider: "",
            llmPrompt: 0, llmCompletion: 0, llmCached: 0, llmProvider: "",
            ttsChars: 0, ttsProvider: "",
            isRealtime: true,
            stsTextIn: textIn, stsAudioIn: audioIn,
            stsTextOut: textOut, stsAudioOut: audioOut,
            stsThinking: thinking, stsCached: cached,
            stsProvider: provider,
            hasAny,
        };
    }

    // ── Standard pipeline ─────────────────────────────────────────────────────
    // Try usage_info.llm / stt / tts first (structured), then fall back to
    // the Paygent collector snapshot fields on cost_info / usage_info.
    const sttSecs =
        num(ui?.stt?.audio_seconds) ||
        num(ci?.stt_audio_seconds) ||
        num((ui as CostInfo)?.stt_audio_seconds);

    const llmPrompt =
        num(ui?.llm?.prompt_tokens) ||
        num(ci?.llm_prompt_tokens) ||
        num((ui as CostInfo)?.llm_prompt_tokens);

    const llmCompletion =
        num(ui?.llm?.completion_tokens) ||
        num(ci?.llm_completion_tokens) ||
        num((ui as CostInfo)?.llm_completion_tokens);

    const llmCached =
        num(ui?.llm?.cached_tokens) ||
        num(ci?.llm_cached_tokens) ||
        num((ui as CostInfo)?.llm_cached_tokens);

    const ttsChars =
        num(ui?.tts?.characters) ||
        num(ci?.tts_characters) ||
        num((ui as CostInfo)?.tts_characters);

    const llmProvider = (ui?.llm?.provider ?? ui?.llm?.model ?? ci?.llm_provider ?? ci?.llm_model ?? "") as string;
    const sttProvider = (ui?.stt?.provider ?? ui?.stt?.model ?? ci?.stt_provider ?? ci?.stt_model ?? "") as string;
    const ttsProvider = (ui?.tts?.provider ?? ui?.tts?.model ?? ci?.tts_provider ?? ci?.tts_model ?? "") as string;

    const hasAny = !!(sttSecs || llmPrompt || llmCompletion || ttsChars);
    return {
        sttSecs, sttProvider,
        llmPrompt, llmCompletion, llmCached, llmProvider,
        ttsChars, ttsProvider,
        isRealtime: false,
        stsTextIn: 0, stsAudioIn: 0, stsTextOut: 0, stsAudioOut: 0,
        stsThinking: 0, stsCached: 0, stsProvider: "",
        hasAny,
    };
}

// ─── Pill component ───────────────────────────────────────────────────────────

function Pill({
    icon,
    label,
    value,
    tooltip,
    className,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tooltip: string;
    className?: string;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-default select-none whitespace-nowrap ${className ?? "bg-muted/50 border-border/50 text-muted-foreground"}`}
                >
                    {icon}
                    <span className="font-semibold text-foreground">{value}</span>
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
                <p className="font-semibold mb-0.5">{label}</p>
                <p className="text-muted-foreground">{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface RunUsagePillsProps {
    usageInfo?: Record<string, unknown> | null;
    costInfo?: Record<string, unknown> | null;
    /** If true, show "—" instead of nothing when no data is available */
    showEmpty?: boolean;
    className?: string;
}

export function RunUsagePills({
    usageInfo,
    costInfo,
    showEmpty = false,
    className,
}: RunUsagePillsProps) {
    const d = extractUsage(usageInfo, costInfo);

    if (!d.hasAny) {
        if (showEmpty) return <span className="text-[10px] text-muted-foreground/40 font-mono">—</span>;
        return null;
    }

    // ── Realtime / STS layout ─────────────────────────────────────────────────
    if (d.isRealtime) {
        const providerLabel = d.stsProvider
            ? ` · ${d.stsProvider}`
            : "";

        return (
            <TooltipProvider delayDuration={150}>
                <div className={`flex flex-wrap gap-1 ${className ?? ""}`}>
                    {(d.stsTextIn > 0 || d.stsAudioIn > 0) && (
                        <Pill
                            icon={<Zap className="h-2.5 w-2.5 opacity-60" />}
                            label={`Realtime IN${providerLabel}`}
                            value={[
                                d.stsTextIn > 0 && `${fmt(d.stsTextIn)} txt`,
                                d.stsAudioIn > 0 && `${fmt(d.stsAudioIn)} aud`,
                            ].filter(Boolean).join(" + ")}
                            tooltip={[
                                d.stsTextIn > 0 && `Text input: ${d.stsTextIn.toLocaleString()} tokens`,
                                d.stsAudioIn > 0 && `Audio input: ${d.stsAudioIn.toLocaleString()} tokens`,
                            ].filter(Boolean).join("\n")}
                            className="bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
                        />
                    )}
                    {(d.stsTextOut > 0 || d.stsAudioOut > 0) && (
                        <Pill
                            icon={<Zap className="h-2.5 w-2.5 opacity-60" />}
                            label={`Realtime OUT${providerLabel}`}
                            value={[
                                d.stsTextOut > 0 && `${fmt(d.stsTextOut)} txt`,
                                d.stsAudioOut > 0 && `${fmt(d.stsAudioOut)} aud`,
                            ].filter(Boolean).join(" + ")}
                            tooltip={[
                                d.stsTextOut > 0 && `Text output: ${d.stsTextOut.toLocaleString()} tokens`,
                                d.stsAudioOut > 0 && `Audio output: ${d.stsAudioOut.toLocaleString()} tokens`,
                            ].filter(Boolean).join("\n")}
                            className="bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
                        />
                    )}
                    {d.stsThinking > 0 && (
                        <Pill
                            icon={<Cpu className="h-2.5 w-2.5 opacity-60" />}
                            label="Thinking tokens"
                            value={`${fmt(d.stsThinking)} think`}
                            tooltip={`Thinking / reasoning tokens: ${d.stsThinking.toLocaleString()}`}
                            className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        />
                    )}
                    {d.stsCached > 0 && (
                        <Pill
                            icon={<Zap className="h-2.5 w-2.5 opacity-40" />}
                            label="Cached tokens"
                            value={`${fmt(d.stsCached)} cache`}
                            tooltip={`Cached tokens: ${d.stsCached.toLocaleString()}`}
                            className="bg-muted/50 border-border/40 text-muted-foreground"
                        />
                    )}
                </div>
            </TooltipProvider>
        );
    }

    // ── Standard pipeline layout ──────────────────────────────────────────────
    return (
        <TooltipProvider delayDuration={150}>
            <div className={`flex flex-wrap gap-1 ${className ?? ""}`}>
                {d.sttSecs > 0 && (
                    <Pill
                        icon={<Mic className="h-2.5 w-2.5 opacity-60" />}
                        label={`STT${d.sttProvider ? ` · ${d.sttProvider}` : ""}`}
                        value={`${d.sttSecs.toFixed(1)}s`}
                        tooltip={`Speech-to-text: ${d.sttSecs.toFixed(2)} seconds of audio transcribed`}
                        className="bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400"
                    />
                )}
                {(d.llmPrompt > 0 || d.llmCompletion > 0) && (
                    <Pill
                        icon={<Cpu className="h-2.5 w-2.5 opacity-60" />}
                        label={`LLM${d.llmProvider ? ` · ${d.llmProvider}` : ""}`}
                        value={`${fmt(d.llmPrompt)}↑ ${fmt(d.llmCompletion)}↓`}
                        tooltip={[
                            `Prompt tokens: ${d.llmPrompt.toLocaleString()}`,
                            `Completion tokens: ${d.llmCompletion.toLocaleString()}`,
                            d.llmCached > 0 && `Cached tokens: ${d.llmCached.toLocaleString()}`,
                        ].filter(Boolean).join("\n")}
                        className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    />
                )}
                {d.ttsChars > 0 && (
                    <Pill
                        icon={<Volume2 className="h-2.5 w-2.5 opacity-60" />}
                        label={`TTS${d.ttsProvider ? ` · ${d.ttsProvider}` : ""}`}
                        value={`${fmt(d.ttsChars)} ch`}
                        tooltip={`Text-to-speech: ${d.ttsChars.toLocaleString()} characters synthesized`}
                        className="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
