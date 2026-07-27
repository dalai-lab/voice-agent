'use client';

import {
    Check,
    Clock,
    Copy,
    Download,
    ExternalLink,
    FileText,
    Loader2,
    Pause,
    Play,
    Video,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import WorkflowLayout from '@/app/workflow/WorkflowLayout';
import {
    getWorkflowApiV1WorkflowFetchWorkflowIdGet,
    getWorkflowRunApiV1WorkflowWorkflowIdRunsRunIdGet,
} from '@/client/sdk.gen';
import { MediaPreviewButton, MediaPreviewDialog } from '@/components/MediaPreviewDialog';
import { OnboardingTooltip } from '@/components/onboarding/OnboardingTooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConversationRailFrame, RealtimeFeedback, WorkflowRunLogs } from '@/components/workflow/conversation';
import { PostHogEvent } from '@/constants/posthog-events';
import { WORKFLOW_RUN_MODES } from '@/constants/workflowRunModes';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { useAuth } from '@/lib/auth';
import { copyTextToClipboard } from '@/lib/clipboard';
import { formatDateTime } from '@/lib/dateTime';
import { downloadFile, getSignedUrl } from '@/lib/files';
import { cn } from '@/lib/utils';

interface WorkflowRunResponse {
    mode: string;
    created_at: string | null;
    is_completed: boolean;
    transcript_url: string | null;
    recording_url: string | null;
    user_recording_url: string | null;
    bot_recording_url: string | null;
    cost_info: {
        dograh_token_usage?: number | null;
        call_duration_seconds?: number | null;
    } | null;
    initial_context: Record<string, string | number | boolean | object> | null;
    gathered_context: Record<string, string | number | boolean | object> | null;
    logs: WorkflowRunLogs | null;
    annotations: Record<string, unknown> | null;
}

const RUN_SHELL_HEIGHT_CLASS = "h-[calc(100svh-49px)] md:h-[100svh] min-h-[calc(100svh-49px)] md:min-h-[100svh] max-h-[calc(100svh-49px)] md:max-h-[100svh]";
const WAVEFORM_BAR_COUNT = 96;
type SplitTrackPlaybackMode = 'both' | 'user' | 'bot';

function formatDuration(seconds?: number | null) {
    if (seconds == null || Number.isNaN(seconds)) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

function getTranscriptMetrics(logs: WorkflowRunLogs | null, gatheredContext: Record<string, string | number | boolean | object> | null) {
    const events = logs?.realtime_feedback_events ?? [];
    const userTurns = events.filter((event) => event.type === 'rtf-user-transcription' && event.payload.final).length;
    const botTurns = events.filter((event) => event.type === 'rtf-bot-text').length;
    const toolCalls = events.filter((event) => event.type === 'rtf-function-call-end').length;
    const nodeNames = new Set(
        events
            .map((event) => event.payload.node_name)
            .filter((nodeName): nodeName is string => Boolean(nodeName))
    );
    const visitedNodes = Array.isArray(gatheredContext?.nodes_visited)
        ? gatheredContext.nodes_visited.length
        : nodeNames.size;

    return { userTurns, botTurns, toolCalls, visitedNodes };
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-secondary/20 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-lg font-black text-foreground">{value}</p>
        </div>
    );
}

function CopyDebugIdButton({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await copyTextToClipboard(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(`Failed to copy ${label}`);
        }
    };

    return (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-[10px] font-bold">
            <span className="text-muted-foreground uppercase tracking-wider">{label}:</span>
            <span className="font-mono text-foreground">{value}</span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                aria-label={`Copy ${label.toLowerCase()}`}
            >
                {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
            </Button>
        </div>
    );
}

function buildWaveformPeaks(audioBuffer: AudioBuffer) {
    const channel = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.max(1, Math.floor(channel.length / WAVEFORM_BAR_COUNT));

    return Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
        const start = index * samplesPerBar;
        const end = Math.min(start + samplesPerBar, channel.length);
        let sum = 0;

        for (let i = start; i < end; i += 1) {
            sum += channel[i] * channel[i];
        }

        const rms = Math.sqrt(sum / Math.max(1, end - start));
        return Math.max(0.08, Math.min(1, rms * 5));
    });
}

async function loadWaveformPeaks(url: string) {
    const response = await fetch(url);
    const audioData = await response.arrayBuffer();
    const AudioContextConstructor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

    if (!AudioContextConstructor) return null;

    const audioContext = new AudioContextConstructor();
    try {
        const decoded = await audioContext.decodeAudioData(audioData);
        return buildWaveformPeaks(decoded);
    } finally {
        void audioContext.close();
    }
}

function getAudioDuration(audio: HTMLAudioElement | null) {
    return audio && Number.isFinite(audio.duration) ? audio.duration : 0;
}

function getAudioTimelineState(audios: HTMLAudioElement[]) {
    const duration = Math.max(0, ...audios.map((audio) => getAudioDuration(audio)));
    const currentTime = Math.max(0, ...audios.map((audio) => audio.currentTime));

    return { duration, currentTime };
}

function syncAudioCurrentTime(audio: HTMLAudioElement, startTime: number) {
    const duration = getAudioDuration(audio);
    audio.currentTime = Math.min(startTime, duration || startTime);
}

function WaveformLane({
    peaks,
    track,
    position,
    isActive,
}: {
    peaks: number[] | null;
    track: 'user' | 'bot';
    position: 'top' | 'bottom';
    isActive: boolean;
}) {
    return (
        <div
            className={cn(
                'absolute left-3 right-3 flex gap-0.5',
                isActive ? 'opacity-85' : 'opacity-25',
                position === 'top' ? 'top-5 h-12 items-end' : 'bottom-5 h-12 items-start'
            )}
        >
            {peaks ? (
                peaks.map((peak, index) => (
                    <span
                        key={`${track}-${index}`}
                        className={cn(
                            'min-h-1 flex-1 rounded-full',
                            track === 'user' ? 'bg-sky-500' : 'bg-emerald-500'
                        )}
                        style={{ height: `${Math.round(peak * 100)}%` }}
                    />
                ))
            ) : (
                <div className="my-auto h-px w-full bg-border" />
            )}
        </div>
    );
}

function SplitTracksSection({
    userRecordingUrl,
    botRecordingUrl,
}: {
    userRecordingUrl: string;
    botRecordingUrl: string;
}) {
    const userAudioRef = useRef<HTMLAudioElement | null>(null);
    const botAudioRef = useRef<HTMLAudioElement | null>(null);
    const [signedUrls, setSignedUrls] = useState<{ user: string | null; bot: string | null }>({
        user: null,
        bot: null,
    });
    const [peaks, setPeaks] = useState<{ user: number[] | null; bot: number[] | null }>({
        user: null,
        bot: null,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [playbackMode, setPlaybackMode] = useState<SplitTrackPlaybackMode>('both');

    const getPlaybackAudios = (mode: SplitTrackPlaybackMode) => {
        const audios: HTMLAudioElement[] = [];

        if (mode !== 'bot' && userAudioRef.current) {
            audios.push(userAudioRef.current);
        }

        if (mode !== 'user' && botAudioRef.current) {
            audios.push(botAudioRef.current);
        }

        return audios;
    };

    useEffect(() => {
        let isActive = true;
        const userAudio = userAudioRef.current;
        const botAudio = botAudioRef.current;

        userAudio?.pause();
        botAudio?.pause();
        setSignedUrls({ user: null, bot: null });
        setPeaks({ user: null, bot: null });
        setIsPlaying(false);
        setProgress(0);
        setPlaybackMode('both');
        setIsLoading(true);

        async function loadTracks() {
            try {
                const [userUrl, botUrl] = await Promise.all([
                    getSignedUrl(userRecordingUrl, true),
                    getSignedUrl(botRecordingUrl, true),
                ]);
                if (!isActive) return;

                setSignedUrls({ user: userUrl, bot: botUrl });
                if (!userUrl || !botUrl) return;

                const [userPeaks, botPeaks] = await Promise.all([
                    loadWaveformPeaks(userUrl),
                    loadWaveformPeaks(botUrl),
                ]);

                if (isActive) {
                    setPeaks({ user: userPeaks, bot: botPeaks });
                }
            } catch (error) {
                console.error('Error loading split track waveforms:', error);
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        void loadTracks();

        return () => {
            isActive = false;
            userAudio?.pause();
            botAudio?.pause();
        };
    }, [userRecordingUrl, botRecordingUrl]);

    useEffect(() => {
        if (!isPlaying) return;

        let frameId: number;
        const updateProgress = () => {
            const activeAudios: HTMLAudioElement[] = [];

            if (playbackMode !== 'bot' && userAudioRef.current) {
                activeAudios.push(userAudioRef.current);
            }

            if (playbackMode !== 'user' && botAudioRef.current) {
                activeAudios.push(botAudioRef.current);
            }

            const { duration, currentTime } = getAudioTimelineState(activeAudios);

            setProgress(duration > 0 ? Math.min(1, currentTime / duration) : 0);
            frameId = window.requestAnimationFrame(updateProgress);
        };

        frameId = window.requestAnimationFrame(updateProgress);
        return () => window.cancelAnimationFrame(frameId);
    }, [isPlaying, playbackMode]);

    const pauseTracks = () => {
        userAudioRef.current?.pause();
        botAudioRef.current?.pause();
        setIsPlaying(false);
    };

    const handleTrackEnded = () => {
        const activeAudios = getPlaybackAudios(playbackMode);
        const activeTracksDone = activeAudios.length > 0 && activeAudios.every((audio) => audio.ended);

        if (activeTracksDone) {
            setIsPlaying(false);
            setProgress(1);
        }
    };

    const handlePlaybackModeChange = async (nextMode: SplitTrackPlaybackMode) => {
        if (nextMode === playbackMode) return;

        const { currentTime } = getAudioTimelineState(getPlaybackAudios(playbackMode));
        const nextAudios = getPlaybackAudios(nextMode);
        const { duration } = getAudioTimelineState(nextAudios);
        const startTime = duration > 0 && currentTime >= duration - 0.1 ? 0 : currentTime;

        userAudioRef.current?.pause();
        botAudioRef.current?.pause();
        nextAudios.forEach((audio) => syncAudioCurrentTime(audio, startTime));
        setPlaybackMode(nextMode);
        setProgress(duration > 0 ? Math.min(1, startTime / duration) : 0);

        if (!isPlaying) return;

        if (nextAudios.length === 0) {
            setIsPlaying(false);
            return;
        }

        try {
            await Promise.all(nextAudios.map((audio) => audio.play()));
            setIsPlaying(true);
        } catch (error) {
            pauseTracks();
            console.error('Error switching split track playback:', error);
        }
    };

    const handleTrackButtonClick = (track: 'user' | 'bot') => {
        const nextMode = playbackMode === track ? 'both' : track;
        void handlePlaybackModeChange(nextMode);
    };

    const togglePlayback = async () => {
        const playbackAudios = getPlaybackAudios(playbackMode);
        if (!canPlay || playbackAudios.length === 0) return;

        if (isPlaying) {
            pauseTracks();
            return;
        }

        const { duration, currentTime } = getAudioTimelineState(playbackAudios);
        const startTime = duration > 0 && currentTime >= duration - 0.1 ? 0 : currentTime;

        userAudioRef.current?.pause();
        botAudioRef.current?.pause();
        playbackAudios.forEach((audio) => syncAudioCurrentTime(audio, startTime));

        try {
            await Promise.all(playbackAudios.map((audio) => audio.play()));
            setIsPlaying(true);
        } catch (error) {
            pauseTracks();
            console.error('Error playing split tracks:', error);
        }
    };

    const canPlay =
        playbackMode === 'both'
            ? Boolean(signedUrls.user && signedUrls.bot)
            : playbackMode === 'user'
                ? Boolean(signedUrls.user)
                : Boolean(signedUrls.bot);
    const progressPercent = Math.round(progress * 1000) / 10;
    const userTrackActive = playbackMode !== 'bot';
    const botTrackActive = playbackMode !== 'user';
    const playbackTargetLabel = playbackMode === 'both' ? 'split tracks' : `${playbackMode} track`;

    return (
        <div className="border border-border bg-card/30 backdrop-blur-md rounded-xl p-5 shadow-xs space-y-4">
            <audio
                ref={userAudioRef}
                src={signedUrls.user ?? undefined}
                preload="metadata"
                className="hidden"
                onEnded={handleTrackEnded}
            />
            <audio
                ref={botAudioRef}
                src={signedUrls.bot ?? undefined}
                preload="metadata"
                className="hidden"
                onEnded={handleTrackEnded}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Audio Recording</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 border border-border bg-secondary/35 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => handleTrackButtonClick('user')}
                            className={cn(
                                'px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer',
                                userTrackActive ? 'bg-sky-500/10 text-sky-500' : 'text-muted-foreground'
                            )}
                        >
                            User
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTrackButtonClick('bot')}
                            className={cn(
                                'px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer',
                                botTrackActive ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground'
                            )}
                        >
                            Bot
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => downloadFile(userRecordingUrl)}
                            className="flex items-center gap-1 px-2.5 py-1 border border-border bg-secondary/20 hover:bg-muted text-[10px] font-semibold text-foreground rounded-lg transition-colors cursor-pointer"
                        >
                            <Download className="w-3 h-3 text-muted-foreground" /> User
                        </button>
                        <button
                            type="button"
                            onClick={() => downloadFile(botRecordingUrl)}
                            className="flex items-center gap-1 px-2.5 py-1 border border-border bg-secondary/20 hover:bg-muted text-[10px] font-semibold text-foreground rounded-lg transition-colors cursor-pointer"
                        >
                            <Download className="w-3 h-3 text-muted-foreground" /> Bot
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={togglePlayback}
                    disabled={!canPlay}
                    className={cn(
                        'h-9 w-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0',
                        isPlaying ? 'bg-cta text-cta-foreground border-cta' : 'bg-secondary/40 border-border hover:bg-muted text-foreground'
                    )}
                >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <div className="relative h-24 min-w-0 flex-1 overflow-hidden rounded-lg border border-border/75 bg-secondary/15">
                    <div className="absolute left-3 right-3 top-1/2 h-px bg-border/40" />
                    <WaveformLane peaks={peaks.user} track="user" position="top" isActive={userTrackActive} />
                    <WaveformLane peaks={peaks.bot} track="bot" position="bottom" isActive={botTrackActive} />
                    {canPlay && (
                        <div className="pointer-events-none absolute inset-x-3 inset-y-2">
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
                                style={{ left: `${progressPercent}%` }}
                            />
                        </div>
                    )}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs text-muted-foreground font-bold gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cta" /> Loading waveforms
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RunMetricsSection({
    costInfo,
    logs,
    gatheredContext,
}: {
    costInfo: WorkflowRunResponse['cost_info'];
    logs: WorkflowRunLogs | null;
    gatheredContext: Record<string, string | number | boolean | object> | null;
}) {
    const metrics = getTranscriptMetrics(logs, gatheredContext);

    return (
        <div className="border border-border bg-card/30 backdrop-blur-md rounded-xl p-5 shadow-xs space-y-4 text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Session Metrics</span>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Duration</div>
                    <div className="text-lg font-black text-foreground">{formatDuration(costInfo?.call_duration_seconds)}</div>
                </div>
                <div className="space-y-1 border-l border-border/40 pl-4">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">User Turns</div>
                    <div className="text-lg font-black text-foreground">{metrics.userTurns}</div>
                </div>
                <div className="space-y-1 border-l border-border/40 pl-4">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bot Turns</div>
                    <div className="text-lg font-black text-foreground">{metrics.botTurns}</div>
                </div>
                <div className="space-y-1 border-l border-border/40 pl-4">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tool Calls</div>
                    <div className="text-lg font-black text-foreground">{metrics.toolCalls}</div>
                </div>
                <div className="space-y-1 border-l border-border/40 pl-4">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Visited Nodes</div>
                    <div className="text-lg font-black text-foreground">{metrics.visitedNodes}</div>
                </div>
            </div>
        </div>
    );
}

function ContextDisplay({ title, context }: { title: string; context: Record<string, string | number | boolean | object> | null }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!context) return;
        try {
            await copyTextToClipboard(JSON.stringify(context, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy context');
        }
    };

    if (!context || Object.keys(context).length === 0) {
        return (
            <div className="border border-border bg-card/30 backdrop-blur-md rounded-xl p-5 shadow-xs space-y-2 text-left">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">No data available</p>
            </div>
        );
    }

    return (
        <div className="border border-border bg-card/30 backdrop-blur-md rounded-xl p-5 shadow-xs space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">{title}</h3>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 gap-1 px-2 text-[10px] font-bold">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
            <pre className="text-xs bg-secondary/35 border border-border p-3 rounded-lg overflow-auto max-h-64 font-mono text-muted-foreground leading-relaxed">
                {JSON.stringify(context, null, 2)}
            </pre>
        </div>
    );
}


export default function WorkflowRunPage() {
    const params = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const auth = useAuth();
    const organizationTimezone = useOrganizationTimezone();
    const [workflowRun, setWorkflowRun] = useState<WorkflowRunResponse | null>(null);
    const [workflowName, setWorkflowName] = useState<string | null>(null);
    const customizeButtonRef = useRef<HTMLButtonElement>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!auth.loading && !auth.isAuthenticated) {
            auth.redirectToLogin();
        }
    }, [auth]);

    const { openPreview, dialog } = MediaPreviewDialog();

    useEffect(() => {
        const fetchWorkflowRun = async () => {
            if (!auth.isAuthenticated || auth.loading) return;

            setIsLoading(true);
            setWorkflowName(null);
            const workflowId = Number(params.workflowId);
            const runId = Number(params.runId);

            try {
                const [runResponse, workflowResponse] = await Promise.all([
                    getWorkflowRunApiV1WorkflowWorkflowIdRunsRunIdGet({
                        path: {
                            workflow_id: workflowId,
                            run_id: runId,
                        },
                    }),
                    getWorkflowApiV1WorkflowFetchWorkflowIdGet({
                        path: {
                            workflow_id: workflowId,
                        },
                    }),
                ]);

                setWorkflowName(workflowResponse.data?.name ?? null);
                const runData = {
                    mode: runResponse.data?.mode ?? '',
                    created_at: runResponse.data?.created_at ?? null,
                    is_completed: runResponse.data?.is_completed ?? false,
                    transcript_url: runResponse.data?.transcript_url ?? null,
                    recording_url: runResponse.data?.recording_url ?? null,
                    user_recording_url: runResponse.data?.user_recording_url ?? null,
                    bot_recording_url: runResponse.data?.bot_recording_url ?? null,
                    cost_info: runResponse.data?.cost_info ?? null,
                    initial_context: runResponse.data?.initial_context as Record<string, string> | null ?? null,
                    gathered_context: runResponse.data?.gathered_context as Record<string, string> | null ?? null,
                    logs: runResponse.data?.logs as WorkflowRunLogs | null ?? null,
                    annotations: runResponse.data?.annotations as Record<string, unknown> | null ?? null,
                };
                setWorkflowRun(runData);
                posthog.capture(PostHogEvent.WORKFLOW_RUN_DETAILS_VIEWED, {
                    workflow_id: workflowId,
                    workflow_name: workflowResponse.data?.name ?? null,
                    run_id: runId,
                    is_completed: runData.is_completed,
                    has_recording: !!runData.recording_url,
                    has_split_recordings: !!runData.user_recording_url && !!runData.bot_recording_url,
                    has_transcript: !!runData.transcript_url,
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkflowRun();
    }, [params.workflowId, params.runId, auth]);

    let returnValue = null;
    const isTextChatRun = workflowRun?.mode === WORKFLOW_RUN_MODES.TEXTCHAT;
    const showRunDetailsView = Boolean(workflowRun?.is_completed || isTextChatRun);
    const userSplitRecordingUrl = workflowRun?.user_recording_url ?? null;
    const botSplitRecordingUrl = workflowRun?.bot_recording_url ?? null;
    const hasSplitTracks = Boolean(userSplitRecordingUrl && botSplitRecordingUrl);
    const workflowId = String(params.workflowId);
    const runId = String(params.runId);

    if (isLoading) {
        returnValue = (
            <div className="h-full flex items-center justify-center">
                <div className="w-full max-w-4xl p-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-48" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                        <CardFooter className="flex gap-4">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }
    else if (showRunDetailsView) {
        returnValue = (
            <div className={`flex ${RUN_SHELL_HEIGHT_CLASS} min-h-0 w-full overflow-hidden bg-background`}>
                <div className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
                        {/* Clean Typography Header Row */}
                        <div className="flex items-center justify-between border-b border-border/40 pb-5 text-left">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold tracking-tight text-foreground">{workflowName || "Voice Agent"}</h1>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isTextChatRun ? 'bg-sky-500/5 text-sky-500 border-sky-500/10' : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10'}`}>
                                        {isTextChatRun ? 'Text Chat' : 'Completed Call'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                    {workflowRun?.created_at && (
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                                            {formatDateTime(workflowRun.created_at, organizationTimezone)}
                                        </span>
                                    )}
                                    <span className="text-border/60">•</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-muted-foreground/60 uppercase text-[9px] font-bold">Agent ID:</span>
                                        <span className="font-mono font-bold text-foreground/80">{workflowId}</span>
                                    </span>
                                    <span className="text-border/60">•</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-muted-foreground/60 uppercase text-[9px] font-bold">Run ID:</span>
                                        <span className="font-mono font-bold text-foreground/80">{runId}</span>
                                    </span>
                                </div>
                            </div>
                            <Link href={`/workflow/${params.workflowId}`}>
                                <Button
                                    ref={customizeButtonRef}
                                    className="h-8 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-bold text-xs cursor-pointer gap-1.5"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Customize Agent
                                </Button>
                            </Link>
                        </div>

                        {/* Session Actions Toolbar */}
                        <div className="flex flex-wrap items-center gap-3 text-left">
                            {!isTextChatRun && (
                                <>
                                    <MediaPreviewButton
                                        recordingUrl={workflowRun?.recording_url}
                                        transcriptUrl={workflowRun?.transcript_url}
                                        runId={Number(params.runId)}
                                        onOpenPreview={openPreview}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => downloadFile(workflowRun?.transcript_url ?? null)}
                                        disabled={!workflowRun?.transcript_url || !auth.isAuthenticated}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card/30 hover:bg-muted text-xs font-semibold text-foreground rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                        Transcript
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => downloadFile(workflowRun?.recording_url ?? null)}
                                        disabled={!workflowRun?.recording_url || !auth.isAuthenticated}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card/30 hover:bg-muted text-xs font-semibold text-foreground rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <Video className="w-3.5 h-3.5 text-muted-foreground" />
                                        Full Recording
                                    </button>
                                </>
                            )}
                            {workflowRun?.gathered_context?.trace_url && (
                                <a
                                    href={String(workflowRun.gathered_context.trace_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card/30 hover:bg-muted text-xs font-semibold text-foreground rounded-lg transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                    View Trace
                                </a>
                            )}
                        </div>

                        {/* Audio visualizer section or custom loader */}
                        {!isTextChatRun && hasSplitTracks && (
                            <SplitTracksSection
                                userRecordingUrl={userSplitRecordingUrl as string}
                                botRecordingUrl={botSplitRecordingUrl as string}
                            />
                        )}

                        <RunMetricsSection
                            costInfo={workflowRun?.cost_info ?? null}
                            logs={workflowRun?.logs ?? null}
                            gatheredContext={workflowRun?.gathered_context ?? null}
                        />

                        <div className="grid gap-6 md:grid-cols-2">
                            <ContextDisplay
                                title="Initial Context"
                                context={workflowRun?.initial_context ?? null}
                            />
                            <ContextDisplay
                                title="Gathered Context"
                                context={workflowRun?.gathered_context ?? null}
                            />
                        </div>

                        {workflowRun?.annotations && Object.keys(workflowRun.annotations).length > 0 && (
                            <ContextDisplay
                                title="QA Results"
                                context={workflowRun.annotations as Record<string, string | number | boolean | object>}
                            />
                        )}
                    </div>
                </div>

                <div className="h-full min-h-0 w-[420px] shrink-0 border-l border-border bg-background p-5">
                    <ConversationRailFrame className="h-full">
                        <RealtimeFeedback mode="historical" logs={workflowRun?.logs ?? null} />
                    </ConversationRailFrame>
                </div>
            </div>
        );
    }
    else {
        returnValue = (
            <div className="flex h-full items-center justify-center p-6">
                <Card className="w-full max-w-xl border-border">
                    <CardHeader className="space-y-2">
                        <CardTitle className="text-2xl">Run Details Unavailable</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            This run does not have a details view yet. Go back to the workflow to continue testing or make changes.
                        </p>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild className="gap-2">
                            <Link href={`/workflow/${params.workflowId}`}>
                                Customize Agent
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <WorkflowLayout>
            {returnValue}
            {dialog}

            {/* Onboarding Tooltip for Customize Workflow */}
            {showRunDetailsView && (
                <OnboardingTooltip
                    tooltipKey="customize_workflow"
                    title='Customize Your Workflow'
                    targetRef={customizeButtonRef}
                    message="Edit your workflow to adjust the voice agent's behavior, add new steps, or modify the conversation flow."
                    showNext={false}
                />
            )}
        </WorkflowLayout>
    );
}
