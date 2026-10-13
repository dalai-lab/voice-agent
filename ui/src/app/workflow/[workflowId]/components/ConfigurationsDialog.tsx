import { ChevronRight, HelpCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrgConfig } from "@/context/OrgConfigContext";
import { cn } from "@/lib/utils";
import {
    type AmbientNoiseConfiguration,
    DEFAULT_PROVISIONAL_VAD_PAUSE_SECS,
    DEFAULT_TURN_SILENCE_TIMEOUT_SECS,
    DEFAULT_TURN_START_MIN_WORDS,
    DEFAULT_USER_TURN_STOP_TIMEOUT,
    DEFAULT_VAD_CONFIDENCE,
    DEFAULT_VAD_MIN_VOLUME,
    DEFAULT_VAD_STOP_SECS,
    detectVoiceSensitivityPreset,
    type ExternalPBXFieldMapping,
    getPacingLabel,
    resolveWorkflowConfigurations,
    TURN_START_STRATEGY_OPTIONS,
    type TurnStartStrategy,
    type TurnStopStrategy,
    VOICE_SENSITIVITY_PRESETS,
    type VoiceSensitivityPreset,
    type WorkflowConfigurations,
} from "@/types/workflow-configurations";

interface ConfigurationsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowConfigurations: WorkflowConfigurations | null;
    workflowName: string;
    onSave: (configurations: WorkflowConfigurations, workflowName: string) => Promise<void>;
}

export const ConfigurationsDialog = ({
    open,
    onOpenChange,
    workflowConfigurations,
    workflowName,
    onSave
}: ConfigurationsDialogProps) => {
    const { externalPbxIntegrationsEnabled } = useOrgConfig();
    const resolvedWorkflowConfigurations = resolveWorkflowConfigurations(workflowConfigurations);
    const [name, setName] = useState<string>(workflowName);
    const [ambientNoiseConfig, setAmbientNoiseConfig] = useState<AmbientNoiseConfiguration>(
        resolvedWorkflowConfigurations.ambient_noise_configuration
    );
    const [maxCallDuration, setMaxCallDuration] = useState<number>(
        resolvedWorkflowConfigurations.max_call_duration
    );
    const [maxUserIdleTimeout, setMaxUserIdleTimeout] = useState<number>(
        resolvedWorkflowConfigurations.max_user_idle_timeout
    );
    const [smartTurnStopSecs, setSmartTurnStopSecs] = useState<number>(
        resolvedWorkflowConfigurations.smart_turn_stop_secs
    );
    const [turnStartStrategy, setTurnStartStrategy] = useState<TurnStartStrategy>(
        resolvedWorkflowConfigurations.turn_start_strategy
    );
    const [turnStartMinWords, setTurnStartMinWords] = useState<number>(
        resolvedWorkflowConfigurations.turn_start_min_words
    );
    const [provisionalVadPauseSecs, setProvisionalVadPauseSecs] = useState<number>(
        resolvedWorkflowConfigurations.provisional_vad_pause_secs
    );
    const [turnStopStrategy, setTurnStopStrategy] = useState<TurnStopStrategy>(
        resolvedWorkflowConfigurations.turn_stop_strategy
    );
    const [vadMinVolume, setVadMinVolume] = useState<number>(
        resolvedWorkflowConfigurations.vad_min_volume
    );
    const [vadConfidence, setVadConfidence] = useState<number>(
        resolvedWorkflowConfigurations.vad_confidence
    );
    const [vadStopSecs, setVadStopSecs] = useState<number>(
        resolvedWorkflowConfigurations.vad_stop_secs
    );
    const [userTurnStopTimeout, setUserTurnStopTimeout] = useState<number>(
        resolvedWorkflowConfigurations.user_turn_stop_timeout
    );
    const [turnSilenceTimeoutSecs, setTurnSilenceTimeoutSecs] = useState<number>(
        resolvedWorkflowConfigurations.turn_silence_timeout_secs
    );
    const [boostAffirmations, setBoostAffirmations] = useState<boolean>(
        resolvedWorkflowConfigurations.boost_affirmations
    );
    const [advancedAcousticsOpen, setAdvancedAcousticsOpen] = useState(false);
    const [sensitivityPreset, setSensitivityPreset] = useState<VoiceSensitivityPreset>(() =>
        detectVoiceSensitivityPreset(
            resolvedWorkflowConfigurations.vad_min_volume,
            resolvedWorkflowConfigurations.vad_confidence,
            resolvedWorkflowConfigurations.turn_silence_timeout_secs,
            resolvedWorkflowConfigurations.user_turn_stop_timeout
        )
    );
    const [contextCompactionEnabled, setContextCompactionEnabled] = useState<boolean>(
        resolvedWorkflowConfigurations.context_compaction_enabled
    );
    const [crossNodeVariableInjectionEnabled, setCrossNodeVariableInjectionEnabled] = useState<boolean>(
        resolvedWorkflowConfigurations.cross_node_variable_injection_enabled
    );
    const [llmConnectionWarmupEnabled, setLlmConnectionWarmupEnabled] = useState<boolean>(
        resolvedWorkflowConfigurations.llm_connection_warmup_enabled
    );
    const [externalPbxFieldMappings, setExternalPbxFieldMappings] = useState<ExternalPBXFieldMapping[]>(
        resolvedWorkflowConfigurations.external_pbx_field_mappings
    );
    const [isSaving, setIsSaving] = useState(false);
    const selectedTurnStartStrategy = TURN_START_STRATEGY_OPTIONS.find(
        (option) => option.value === turnStartStrategy
    );
    const externalPbxFieldMappingsValid = externalPbxFieldMappings.every(
        (mapping) =>
            Boolean(mapping.context_path.trim()) &&
            /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(mapping.destination_field.trim())
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                ...resolvedWorkflowConfigurations,
                ambient_noise_configuration: ambientNoiseConfig,
                max_call_duration: maxCallDuration,
                max_user_idle_timeout: maxUserIdleTimeout,
                smart_turn_stop_secs: smartTurnStopSecs,
                turn_start_strategy: turnStartStrategy,
                turn_start_min_words: turnStartMinWords,
                provisional_vad_pause_secs: provisionalVadPauseSecs,
                turn_stop_strategy: turnStopStrategy,
                vad_min_volume: vadMinVolume,
                vad_confidence: vadConfidence,
                vad_stop_secs: vadStopSecs,
                user_turn_stop_timeout: userTurnStopTimeout,
                turn_silence_timeout_secs: turnSilenceTimeoutSecs,
                boost_affirmations: boostAffirmations,
                transcript_configuration: resolvedWorkflowConfigurations.transcript_configuration,
                context_compaction_enabled: contextCompactionEnabled,
                cross_node_variable_injection_enabled: crossNodeVariableInjectionEnabled,
                llm_connection_warmup_enabled: llmConnectionWarmupEnabled,
                external_pbx_field_mappings: externalPbxFieldMappings,
            }, name);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save configurations:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Sync state with props when dialog opens
    useEffect(() => {
        if (open) {
            const nextWorkflowConfigurations = resolveWorkflowConfigurations(workflowConfigurations);
            setName(workflowName);
            setAmbientNoiseConfig(nextWorkflowConfigurations.ambient_noise_configuration);
            setMaxCallDuration(nextWorkflowConfigurations.max_call_duration);
            setMaxUserIdleTimeout(nextWorkflowConfigurations.max_user_idle_timeout);
            setSmartTurnStopSecs(nextWorkflowConfigurations.smart_turn_stop_secs);
            setTurnStartStrategy(nextWorkflowConfigurations.turn_start_strategy);
            setTurnStartMinWords(nextWorkflowConfigurations.turn_start_min_words);
            setProvisionalVadPauseSecs(nextWorkflowConfigurations.provisional_vad_pause_secs);
            setTurnStopStrategy(nextWorkflowConfigurations.turn_stop_strategy);
            setVadMinVolume(nextWorkflowConfigurations.vad_min_volume);
            setVadConfidence(nextWorkflowConfigurations.vad_confidence);
            setVadStopSecs(nextWorkflowConfigurations.vad_stop_secs);
            setUserTurnStopTimeout(nextWorkflowConfigurations.user_turn_stop_timeout);
            setTurnSilenceTimeoutSecs(nextWorkflowConfigurations.turn_silence_timeout_secs);
            setBoostAffirmations(nextWorkflowConfigurations.boost_affirmations);
            setSensitivityPreset(
                detectVoiceSensitivityPreset(
                    nextWorkflowConfigurations.vad_min_volume,
                    nextWorkflowConfigurations.vad_confidence,
                    nextWorkflowConfigurations.turn_silence_timeout_secs,
                    nextWorkflowConfigurations.user_turn_stop_timeout
                )
            );
            setContextCompactionEnabled(nextWorkflowConfigurations.context_compaction_enabled);
            setCrossNodeVariableInjectionEnabled(nextWorkflowConfigurations.cross_node_variable_injection_enabled);
            setLlmConnectionWarmupEnabled(nextWorkflowConfigurations.llm_connection_warmup_enabled);
            setExternalPbxFieldMappings(nextWorkflowConfigurations.external_pbx_field_mappings);
        }
    }, [open, workflowName, workflowConfigurations]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configurations</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Workflow Name Section */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Agent Name</h3>
                            <p className="text-xs text-muted-foreground">
                                The name of your agent
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="workflow_name" className="text-xs">
                                Name
                            </Label>
                            <Input
                                id="workflow_name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter Agent name"
                            />
                        </div>
                    </div>

                    {/* Ambient Noise Section */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Ambient Noise</h3>
                            <p className="text-xs text-muted-foreground">
                                Add background office ambient noise to make the conversation sound more natural.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="ambient-noise-enabled" className="text-sm">
                                    Use Ambient Noise
                                </Label>
                                <Switch
                                    id="ambient-noise-enabled"
                                    checked={ambientNoiseConfig.enabled}
                                    onCheckedChange={(checked) =>
                                        setAmbientNoiseConfig(prev => ({ ...prev, enabled: checked }))
                                    }
                                />
                            </div>

                            {ambientNoiseConfig.enabled && (
                                <div className="space-y-2">
                                    <Label htmlFor="ambient-volume" className="text-xs">
                                        Volume
                                    </Label>
                                    <Input
                                        id="ambient-volume"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="1"
                                        value={ambientNoiseConfig.volume}
                                        onChange={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value)) {
                                                setAmbientNoiseConfig(prev => ({ ...prev, volume: value }));
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Turn Detection Section */}
                    <div className="space-y-5">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Turn Detection</h3>
                            <p className="text-xs text-muted-foreground">
                                Configure voice sensitivity, conversational pacing, and speech end detection.
                            </p>
                        </div>

                        {/* Presets */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium flex items-center gap-1.5">
                                    Voice Sensitivity & Pacing Presets
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            Quickly configure voice detection sensitivity and pause timeouts for common phone call environments.
                                        </TooltipContent>
                                    </Tooltip>
                                </Label>
                                {sensitivityPreset === "custom" && (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                                        Custom Tuned
                                    </Badge>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {(Object.entries(VOICE_SENSITIVITY_PRESETS) as [Exclude<VoiceSensitivityPreset, "custom">, typeof VOICE_SENSITIVITY_PRESETS[keyof typeof VOICE_SENSITIVITY_PRESETS]][]).map(([key, preset]) => {
                                    const isSelected = sensitivityPreset === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setSensitivityPreset(key);
                                                setVadMinVolume(preset.vad_min_volume);
                                                setVadConfidence(preset.vad_confidence);
                                                setTurnSilenceTimeoutSecs(preset.turn_silence_timeout_secs);
                                                setUserTurnStopTimeout(preset.user_turn_stop_timeout);
                                            }}
                                            className={cn(
                                                "flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs cursor-pointer",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                                                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <span className="font-semibold text-xs text-foreground">{preset.label}</span>
                                                <Badge
                                                    variant={key === "sensitive" ? "success" : key === "balanced" ? "secondary" : "outline"}
                                                    className="text-[10px] px-1.5 py-0 h-4"
                                                >
                                                    {preset.badge}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                {preset.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conversational Pacing Slider */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="dialog_turn_silence_timeout_secs" className="text-xs font-medium flex items-center gap-1.5">
                                    Silence Before Responding
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            How long the agent pauses after speech before answering. Shorter pauses feel snappier, while longer pauses allow callers who pause mid-sentence to keep speaking.
                                        </TooltipContent>
                                    </Tooltip>
                                </Label>
                                <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    {turnSilenceTimeoutSecs.toFixed(2)}s ({getPacingLabel(turnSilenceTimeoutSecs)})
                                </span>
                            </div>
                            <input
                                id="dialog_turn_silence_timeout_secs"
                                type="range"
                                min="0.3"
                                max="2.5"
                                step="0.05"
                                value={turnSilenceTimeoutSecs}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setTurnSilenceTimeoutSecs(val);
                                    setSensitivityPreset("custom");
                                }}
                                className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                                <span>0.3s (Snappy)</span>
                                <span>0.8s (Natural)</span>
                                <span>2.5s (Relaxed)</span>
                            </div>
                        </div>

                        {/* Safety Watchdog Timeout & Detection Strategy */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="dialog_user_turn_stop_timeout" className="text-xs font-medium flex items-center gap-1.5">
                                        Safety Watchdog Timeout
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                Hard ceiling timeout (seconds). Forces the agent to reply if the speech recognizer hangs or fails to emit an end-of-speech token (e.g. on quiet 1-word responses or line static).
                                            </TooltipContent>
                                        </Tooltip>
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="dialog_user_turn_stop_timeout"
                                        type="number"
                                        step="0.5"
                                        min="1.0"
                                        max="15.0"
                                        value={userTurnStopTimeout}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val >= 1.0 && val <= 15.0) {
                                                setUserTurnStopTimeout(val);
                                                setSensitivityPreset("custom");
                                            }
                                        }}
                                    />
                                    <span className="text-xs text-muted-foreground shrink-0">sec</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Prevents dead air when callers say short words (1.0s–15.0s).
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dialog_turn_stop_strategy" className="text-xs font-medium">Detection Strategy</Label>
                                <Select
                                    value={turnStopStrategy}
                                    onValueChange={(value: TurnStopStrategy) => setTurnStopStrategy(value)}
                                >
                                    <SelectTrigger id="dialog_turn_stop_strategy">
                                        <SelectValue placeholder="Select strategy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="transcription">Transcription-based</SelectItem>
                                        <SelectItem value="turn_analyzer">Smart Turn Analyzer</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                    {turnStopStrategy === "transcription"
                                        ? "Ends turn when transcription indicates completion."
                                        : "Uses ML model to detect semantic end of turn."}
                                </p>
                            </div>
                        </div>

                        {turnStopStrategy === 'turn_analyzer' && (
                            <div className="space-y-2">
                                <Label htmlFor="dialog_smart_turn_stop_secs" className="text-xs">
                                    Incomplete Turn Timeout (seconds)
                                </Label>
                                <Input
                                    id="dialog_smart_turn_stop_secs"
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    max="10"
                                    value={smartTurnStopSecs}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value) && value >= 0.5) {
                                            setSmartTurnStopSecs(value);
                                        }
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Max silence duration before ending an incomplete turn. Default: 2 seconds
                                </p>
                            </div>
                        )}

                        {/* Boost Short Affirmations Switch */}
                        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
                            <div className="space-y-0.5 pr-4">
                                <div className="flex items-center gap-1.5">
                                    <Label htmlFor="dialog_boost_affirmations" className="text-xs font-medium cursor-pointer">
                                        Boost Short Affirmations
                                    </Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            Acoustically biases recognition for short single-word answers ("Yes", "No", "Yeah", "Sure", "Okay") so callers answering quickly are never ignored.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Biases speech models to prioritize short conversational confirmations.
                                </p>
                            </div>
                            <Switch
                                id="dialog_boost_affirmations"
                                checked={boostAffirmations}
                                onCheckedChange={(checked) => setBoostAffirmations(checked)}
                            />
                        </div>

                        {/* Collapsible Advanced Acoustic Controls */}
                        <Collapsible open={advancedAcousticsOpen} onOpenChange={setAdvancedAcousticsOpen} className="border rounded-lg p-3 bg-muted/10 space-y-3">
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center justify-between w-full text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <ChevronRight className={cn("h-4 w-4 transition-transform text-muted-foreground", advancedAcousticsOpen && "rotate-90")} />
                                        Advanced Acoustic Controls (Silero VAD)
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {advancedAcousticsOpen ? "Hide" : "Customize"}
                                    </span>
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-2">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="dialog_vad_min_volume" className="text-xs">
                                                Volume Floor
                                            </Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    RMS volume threshold (0.05 – 0.80). Lower values detect quiet speech and soft whispers over PSTN telephone connections.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Input
                                            id="dialog_vad_min_volume"
                                            type="number"
                                            step="0.05"
                                            min="0.05"
                                            max="0.80"
                                            value={vadMinVolume}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val)) {
                                                    setVadMinVolume(val);
                                                    setSensitivityPreset("custom");
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Min loudness (0.05–0.80)</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="dialog_vad_confidence" className="text-xs">
                                                Neural Confidence
                                            </Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    Silero ML probability threshold (0.30 – 0.90). Lower catches faint voice; higher rejects background babble.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Input
                                            id="dialog_vad_confidence"
                                            type="number"
                                            step="0.05"
                                            min="0.30"
                                            max="0.90"
                                            value={vadConfidence}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val)) {
                                                    setVadConfidence(val);
                                                    setSensitivityPreset("custom");
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground">VAD probability (0.30–0.90)</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="dialog_vad_stop_secs" className="text-xs">
                                                VAD Silence Hold
                                            </Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    Silence duration before VAD marks speech ended (0.10s – 1.00s). Default: 0.25s.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Input
                                            id="dialog_vad_stop_secs"
                                            type="number"
                                            step="0.05"
                                            min="0.10"
                                            max="1.00"
                                            value={vadStopSecs}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val)) {
                                                    setVadStopSecs(val);
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Silence hold (0.10–1.00s)</p>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    {/* Interruption Section */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Interruption</h3>
                            <p className="text-xs text-muted-foreground">
                                Configure when user speech should interrupt the agent while it is speaking.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="turn_start_strategy" className="text-xs">
                                Interruption Strategy
                            </Label>
                            <Select
                                value={turnStartStrategy}
                                onValueChange={(value: TurnStartStrategy) => setTurnStartStrategy(value)}
                            >
                                <SelectTrigger id="turn_start_strategy">
                                    <SelectValue placeholder="Select strategy" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TURN_START_STRATEGY_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {selectedTurnStartStrategy?.description}
                            </p>
                        </div>

                        {turnStartStrategy === 'min_words' && (
                            <div className="space-y-2">
                                <Label htmlFor="turn_start_min_words" className="text-xs">
                                    Minimum Words Before Interruption
                                </Label>
                                <Input
                                    id="turn_start_min_words"
                                    type="number"
                                    step="1"
                                    min="1"
                                    max="10"
                                    value={turnStartMinWords}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value >= 1) {
                                            setTurnStartMinWords(value);
                                        }
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Number of transcribed words needed to interrupt while the bot is speaking. Default: {DEFAULT_TURN_START_MIN_WORDS}
                                </p>
                            </div>
                        )}

                        {turnStartStrategy === 'provisional_vad' && (
                            <div className="space-y-2">
                                <Label htmlFor="provisional_vad_pause_secs" className="text-xs">
                                    Provisional Pause (seconds)
                                </Label>
                                <Input
                                    id="provisional_vad_pause_secs"
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="5"
                                    value={provisionalVadPauseSecs}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value) && value >= 0.1) {
                                            setProvisionalVadPauseSecs(value);
                                        }
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Seconds to pause bot audio while waiting for transcript confirmation. Default: {DEFAULT_PROVISIONAL_VAD_PAUSE_SECS}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Context Management Section */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Context Compaction</h3>
                            <p className="text-xs text-muted-foreground">
                                Automatically summarize conversation context when transitioning between nodes. Removes stale tool calls and keeps the context clean for the new node.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="context-compaction-enabled" className="text-sm">
                                Enable Context Compaction
                            </Label>
                            <Switch
                                id="context-compaction-enabled"
                                checked={contextCompactionEnabled}
                                onCheckedChange={setContextCompactionEnabled}
                            />
                        </div>
                    </div>

                    {/* Cross-Node Variable Injection Section */}
                    <div className="space-y-4 border-t pt-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Cross-Node Variable Injection</h3>
                            <p className="text-xs text-muted-foreground">
                                Allow later nodes to read variables extracted by earlier nodes using{" "}
                                <code className="font-mono text-xs">{"{{gathered_context.variable_name}}"}</code>.
                                When enabled, the agent waits for in-progress extraction to complete before
                                starting the next node — this may add a brief delay on transitions.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="cross-node-variable-injection-enabled" className="text-sm">
                                Enable Cross-Node Variable Injection
                            </Label>
                            <Switch
                                id="cross-node-variable-injection-enabled"
                                checked={crossNodeVariableInjectionEnabled}
                                onCheckedChange={setCrossNodeVariableInjectionEnabled}
                            />
                        </div>

                        {crossNodeVariableInjectionEnabled && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                ⚠ Enabled — node transitions may be slightly delayed while extraction
                                from the previous node completes.
                            </p>
                        )}
                    </div>


                    {/* LLM Connection Warmup Section */}
                    <div className="space-y-4 border-t pt-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">LLM Connection Warmup</h3>
                            <p className="text-xs text-muted-foreground">
                                Pre-warms the LLM provider's HTTP/TLS connection during the greeting,
                                eliminating the ~800ms cold-start delay on the first user turn.
                                Disable only if your provider bills per-request or applies strict
                                rate limits on idle connections.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="llm-connection-warmup-enabled" className="text-sm font-medium">
                                Enable LLM Connection Warmup
                            </Label>
                            <Switch
                                id="llm-connection-warmup-enabled"
                                checked={llmConnectionWarmupEnabled}
                                onCheckedChange={setLlmConnectionWarmupEnabled}
                            />
                        </div>

                        {!llmConnectionWarmupEnabled && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                ⚠ Disabled — the first user turn may experience an additional ~800ms
                                delay while the LLM connection is established.
                            </p>
                        )}
                    </div>

                    {/* Call Management Section */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Call Management</h3>
                            <p className="text-xs text-muted-foreground">
                                Configure call duration limits and idle timeout settings.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="max_call_duration" className="text-xs">
                                    Max Call Duration (seconds)
                                </Label>
                                <Input
                                    id="max_call_duration"
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={maxCallDuration}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value > 0) {
                                            setMaxCallDuration(value);
                                        }
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">Default: 600 (10 minutes)</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max_user_idle_timeout" className="text-xs">
                                    Max User Idle Timeout (seconds)
                                </Label>
                                <Input
                                    id="max_user_idle_timeout"
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={maxUserIdleTimeout}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value > 0) {
                                            setMaxUserIdleTimeout(value);
                                        }
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">Default: 10 seconds</p>
                            </div>
                        </div>
                    </div>

                    {externalPbxIntegrationsEnabled && (
                        <div className="space-y-4 border-t pt-4">
                            <div>
                                <h3 className="text-sm font-semibold mb-1">External PBX Field Updates</h3>
                                <p className="text-xs text-muted-foreground">
                                    Optionally copy final gathered-context values into provider-native fields before transfer or hangup.
                                </p>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Field Mappings</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExternalPbxFieldMappings((current) => [
                                        ...current,
                                        { context_path: "", destination_field: "" },
                                    ])}
                                >
                                    <Plus className="mr-1 h-4 w-4" /> Add mapping
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {externalPbxFieldMappings.map((mapping, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                        <Input
                                            aria-label={`Gathered context field ${index + 1}`}
                                            value={mapping.context_path}
                                            onChange={(event) => setExternalPbxFieldMappings((current) =>
                                                current.map((item, itemIndex) =>
                                                    itemIndex === index
                                                        ? { ...item, context_path: event.target.value }
                                                        : item
                                                )
                                            )}
                                            placeholder="qualified"
                                        />
                                        <Input
                                            aria-label={`External PBX destination field ${index + 1}`}
                                            value={mapping.destination_field}
                                            onChange={(event) => setExternalPbxFieldMappings((current) =>
                                                current.map((item, itemIndex) =>
                                                    itemIndex === index
                                                        ? { ...item, destination_field: event.target.value }
                                                        : item
                                                )
                                            )}
                                            placeholder="address3"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Remove external PBX field mapping ${index + 1}`}
                                            onClick={() => setExternalPbxFieldMappings((current) =>
                                                current.filter((_, itemIndex) => itemIndex !== index)
                                            )}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {externalPbxFieldMappings.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No external fields will be updated. Context names may be direct extracted-variable names or paths such as extracted_variables.qualified.
                                    </p>
                                )}
                                {!externalPbxFieldMappingsValid && (
                                    <p className="text-xs text-destructive">
                                        Each mapping needs a context field and a destination field containing only letters, numbers, and underscores.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || (externalPbxIntegrationsEnabled && !externalPbxFieldMappingsValid)}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
