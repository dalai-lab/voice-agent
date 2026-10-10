import type {
    AmbientNoiseConfigurationDefaults,
    OrganizationAiModelConfigurationV2,
    WorkflowConfigurationDefaults as GeneratedWorkflowConfigurationDefaults,
} from "@/client/types.gen";

export type WorkflowConfigurationDefaults = GeneratedWorkflowConfigurationDefaults;

export type AmbientNoiseConfiguration = Omit<
    AmbientNoiseConfigurationDefaults,
    "enabled" | "volume"
> & {
    enabled: boolean;
    volume: number;
    storage_key?: string;
    storage_backend?: string;
    original_filename?: string;
};

export type TurnStopStrategy = NonNullable<GeneratedWorkflowConfigurationDefaults["turn_stop_strategy"]>;
export type TurnStartStrategy = NonNullable<GeneratedWorkflowConfigurationDefaults["turn_start_strategy"]>;
export const DEFAULT_TURN_START_MIN_WORDS = 3;
export const DEFAULT_PROVISIONAL_VAD_PAUSE_SECS = 1.5;

export const DEFAULT_VAD_MIN_VOLUME = 0.20;
export const DEFAULT_VAD_CONFIDENCE = 0.50;
export const DEFAULT_VAD_STOP_SECS = 0.25;
export const DEFAULT_USER_TURN_STOP_TIMEOUT = 3.5;
export const DEFAULT_TURN_SILENCE_TIMEOUT_SECS = 0.8;

export type VoiceSensitivityPreset = "sensitive" | "balanced" | "noisy" | "custom";

export interface VoiceSensitivityPresetConfig {
    label: string;
    description: string;
    badge: string;
    vad_min_volume: number;
    vad_confidence: number;
    turn_silence_timeout_secs: number;
    user_turn_stop_timeout: number;
}

export const VOICE_SENSITIVITY_PRESETS: Record<Exclude<VoiceSensitivityPreset, "custom">, VoiceSensitivityPresetConfig> = {
    sensitive: {
        label: "High Sensitivity",
        description: "Catches soft whispers, quiet 'yes/no' answers, and phone murmurs. Best for surveys and quick confirmations.",
        badge: "Recommended",
        vad_min_volume: 0.20,
        vad_confidence: 0.50,
        turn_silence_timeout_secs: 0.7,
        user_turn_stop_timeout: 3.5,
    },
    balanced: {
        label: "Balanced",
        description: "Standard conversational flow for quiet offices and indoor phone calls.",
        badge: "Default",
        vad_min_volume: 0.35,
        vad_confidence: 0.65,
        turn_silence_timeout_secs: 0.9,
        user_turn_stop_timeout: 4.5,
    },
    noisy: {
        label: "Noisy Room",
        description: "Filters office chatter, street traffic, and background noise. Requires louder, clearer speech.",
        badge: "Noise Shield",
        vad_min_volume: 0.55,
        vad_confidence: 0.75,
        turn_silence_timeout_secs: 1.2,
        user_turn_stop_timeout: 5.0,
    },
};

export function detectVoiceSensitivityPreset(
    vadMinVolume?: number,
    vadConfidence?: number,
    turnSilenceTimeoutSecs?: number,
    userTurnStopTimeout?: number
): VoiceSensitivityPreset {
    if (
        vadMinVolume === undefined ||
        vadConfidence === undefined ||
        turnSilenceTimeoutSecs === undefined ||
        userTurnStopTimeout === undefined
    ) {
        return "sensitive";
    }

    for (const [key, preset] of Object.entries(VOICE_SENSITIVITY_PRESETS) as [Exclude<VoiceSensitivityPreset, "custom">, VoiceSensitivityPresetConfig][]) {
        if (
            Math.abs(preset.vad_min_volume - vadMinVolume) < 0.001 &&
            Math.abs(preset.vad_confidence - vadConfidence) < 0.001 &&
            Math.abs(preset.turn_silence_timeout_secs - turnSilenceTimeoutSecs) < 0.001 &&
            Math.abs(preset.user_turn_stop_timeout - userTurnStopTimeout) < 0.001
        ) {
            return key;
        }
    }

    if (
        Math.abs(0.20 - vadMinVolume) < 0.001 &&
        Math.abs(0.50 - vadConfidence) < 0.001 &&
        Math.abs(3.5 - userTurnStopTimeout) < 0.001
    ) {
        return "sensitive";
    }

    return "custom";
}

export function getPacingLabel(secs: number): string {
    if (secs <= 0.5) return "Very Fast";
    if (secs <= 0.75) return "Snappy";
    if (secs <= 1.0) return "Natural";
    if (secs <= 1.5) return "Deliberate";
    return "Relaxed";
}

export const TURN_START_STRATEGY_OPTIONS: Array<{
    value: TurnStartStrategy;
    label: string;
    description: string;
}> = [
    {
        value: 'default',
        label: 'Default',
        description: 'Use the platform default: external STT turn signals when available, otherwise local VAD.',
    },
    {
        value: 'min_words',
        label: 'Minimum words',
        description: 'Wait for a minimum number of transcribed words before interrupting bot speech.',
    },
    {
        value: 'provisional_vad',
        label: 'Provisional VAD',
        description: 'Pause bot audio on voice activity, then confirm the interruption with transcription.',
    },
];

export interface VoicemailDetectionConfiguration {
    enabled: boolean;
    use_workflow_llm: boolean;
    provider?: string;
    model?: string;
    api_key?: string;
    system_prompt?: string;
    long_speech_timeout: number;  // seconds cutoff for long speech detection
}

export const DEFAULT_VOICEMAIL_DETECTION_CONFIGURATION: VoicemailDetectionConfiguration = {
    enabled: false,
    use_workflow_llm: true,
    long_speech_timeout: 8.0,
};

export interface TranscriptConfiguration {
    include_end_timestamps: boolean;
}

export interface ExternalPBXFieldMapping {
    context_path: string;
    destination_field: string;
}

export const DEFAULT_TRANSCRIPT_CONFIGURATION: TranscriptConfiguration = {
    include_end_timestamps: false,
};

export interface ModelOverrides {
    llm?: {
        provider?: string;
        model?: string;
        api_key?: string;
        [key: string]: unknown;
    };
    tts?: {
        provider?: string;
        model?: string;
        voice?: string;
        api_key?: string;
        [key: string]: unknown;
    };
    stt?: {
        provider?: string;
        model?: string;
        api_key?: string;
        [key: string]: unknown;
    };
    realtime?: {
        provider?: string;
        model?: string;
        voice?: string;
        api_key?: string;
        [key: string]: unknown;
    };
    is_realtime?: boolean;
}

type WorkflowConfigurationBase = Omit<
    GeneratedWorkflowConfigurationDefaults,
    | "ambient_noise_configuration"
    | "max_call_duration"
    | "max_user_idle_timeout"
    | "smart_turn_stop_secs"
    | "turn_start_strategy"
    | "turn_start_min_words"
    | "provisional_vad_pause_secs"
    | "turn_stop_strategy"
    | "dictionary"
    | "context_compaction_enabled"
    | "text_chat_inactivity_timeout_seconds"
    | "external_pbx_field_mappings"
    | "vad_min_volume"
    | "vad_confidence"
    | "vad_stop_secs"
    | "user_turn_stop_timeout"
    | "turn_silence_timeout_secs"
    | "boost_affirmations"
>;

export type WorkflowConfigurations = WorkflowConfigurationBase & {
    ambient_noise_configuration: AmbientNoiseConfiguration;
    max_call_duration: number;  // Maximum call duration in seconds
    max_user_idle_timeout: number;  // Maximum user idle time in seconds
    smart_turn_stop_secs: number;  // Timeout in seconds for incomplete turn detection
    turn_start_strategy: TurnStartStrategy;  // Strategy for detecting start of user turn/interruption
    turn_start_min_words: number;  // Minimum transcribed words required for minimum-word interruptions
    provisional_vad_pause_secs: number;  // Seconds to pause bot output while awaiting transcript confirmation
    turn_stop_strategy: TurnStopStrategy;  // Strategy for detecting end of user turn
    dictionary?: string;  // Comma-separated words for voice agent to listen for
    voicemail_detection?: VoicemailDetectionConfiguration;
    transcript_configuration: TranscriptConfiguration;
    context_compaction_enabled: boolean;  // Summarize context on node transitions to remove stale tool calls
    cross_node_variable_injection_enabled: boolean;
    llm_connection_warmup_enabled: boolean;
    text_chat_inactivity_timeout_seconds?: number;  // End inactive text chats after this many seconds
    external_pbx_field_mappings: ExternalPBXFieldMapping[];
    model_overrides?: ModelOverrides;  // Per-workflow model configuration overrides
    model_configuration_v2_override?: OrganizationAiModelConfigurationV2;  // Full v2 model configuration override
    vad_min_volume: number;              // Audio loudness threshold (0.05 to 0.80)
    vad_confidence: number;              // Silero VAD speech probability (0.30 to 0.90)
    vad_stop_secs: number;                // Silence stop seconds before VAD marks end (0.10 to 1.00)
    user_turn_stop_timeout: number;      // Safety turn watchdog timeout (1.0 to 15.0 seconds)
    turn_silence_timeout_secs: number;   // Post-speech pause before bot responds (0.3 to 3.0 seconds)
    boost_affirmations: boolean;         // Bias STT towards short confirmations ('yes', 'no', etc.)
    [key: string]: unknown;  // Allow additional properties for future configurations
};

const FALLBACK_WORKFLOW_CONFIGURATIONS: WorkflowConfigurations = {
    ambient_noise_configuration: {
        enabled: false,
        volume: 0.3
    },
    max_call_duration: 300,
    max_user_idle_timeout: 10,  // 10 seconds
    smart_turn_stop_secs: 2,  // 2 seconds
    turn_start_strategy: 'default',  // Default to platform-chosen user turn start detection
    turn_start_min_words: DEFAULT_TURN_START_MIN_WORDS,
    provisional_vad_pause_secs: DEFAULT_PROVISIONAL_VAD_PAUSE_SECS,
    turn_stop_strategy: 'transcription',  // Default to transcription-based detection
    dictionary: '',
    transcript_configuration: DEFAULT_TRANSCRIPT_CONFIGURATION,
    context_compaction_enabled: false,
    cross_node_variable_injection_enabled: false,
    llm_connection_warmup_enabled: true,
    external_pbx_field_mappings: [],
    vad_min_volume: DEFAULT_VAD_MIN_VOLUME,
    vad_confidence: DEFAULT_VAD_CONFIDENCE,
    vad_stop_secs: DEFAULT_VAD_STOP_SECS,
    user_turn_stop_timeout: DEFAULT_USER_TURN_STOP_TIMEOUT,
    turn_silence_timeout_secs: DEFAULT_TURN_SILENCE_TIMEOUT_SECS,
    boost_affirmations: true,
};

export function resolveWorkflowConfigurations(
    configurations?: Partial<WorkflowConfigurations> | null,
    defaults?: WorkflowConfigurationDefaults | null,
): WorkflowConfigurations {
    return {
        ...FALLBACK_WORKFLOW_CONFIGURATIONS,
        ...defaults,
        ...configurations,
        ambient_noise_configuration: {
            ...FALLBACK_WORKFLOW_CONFIGURATIONS.ambient_noise_configuration,
            ...defaults?.ambient_noise_configuration,
            ...configurations?.ambient_noise_configuration,
        },
        max_call_duration:
            configurations?.max_call_duration
            ?? defaults?.max_call_duration
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.max_call_duration,
        max_user_idle_timeout:
            configurations?.max_user_idle_timeout
            ?? defaults?.max_user_idle_timeout
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.max_user_idle_timeout,
        smart_turn_stop_secs:
            configurations?.smart_turn_stop_secs
            ?? defaults?.smart_turn_stop_secs
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.smart_turn_stop_secs,
        turn_start_strategy:
            configurations?.turn_start_strategy
            ?? defaults?.turn_start_strategy
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.turn_start_strategy,
        turn_start_min_words:
            configurations?.turn_start_min_words
            ?? defaults?.turn_start_min_words
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.turn_start_min_words,
        provisional_vad_pause_secs:
            configurations?.provisional_vad_pause_secs
            ?? defaults?.provisional_vad_pause_secs
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.provisional_vad_pause_secs,
        turn_stop_strategy:
            configurations?.turn_stop_strategy
            ?? defaults?.turn_stop_strategy
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.turn_stop_strategy,
        dictionary:
            configurations?.dictionary
            ?? defaults?.dictionary
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.dictionary,
        context_compaction_enabled:
            configurations?.context_compaction_enabled
            ?? defaults?.context_compaction_enabled
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.context_compaction_enabled,
        cross_node_variable_injection_enabled:
            configurations?.cross_node_variable_injection_enabled
            ?? (defaults as any)?.cross_node_variable_injection_enabled
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.cross_node_variable_injection_enabled,
        llm_connection_warmup_enabled:
            configurations?.llm_connection_warmup_enabled
            ?? (defaults as any)?.llm_connection_warmup_enabled
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.llm_connection_warmup_enabled,
        text_chat_inactivity_timeout_seconds:
            configurations?.text_chat_inactivity_timeout_seconds
            ?? defaults?.text_chat_inactivity_timeout_seconds,
        external_pbx_field_mappings:
            configurations?.external_pbx_field_mappings
            ?? defaults?.external_pbx_field_mappings
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.external_pbx_field_mappings,
        vad_min_volume:
            configurations?.vad_min_volume
            ?? (defaults as any)?.vad_min_volume
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.vad_min_volume,
        vad_confidence:
            configurations?.vad_confidence
            ?? (defaults as any)?.vad_confidence
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.vad_confidence,
        vad_stop_secs:
            configurations?.vad_stop_secs
            ?? (defaults as any)?.vad_stop_secs
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.vad_stop_secs,
        user_turn_stop_timeout:
            configurations?.user_turn_stop_timeout
            ?? (defaults as any)?.user_turn_stop_timeout
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.user_turn_stop_timeout,
        turn_silence_timeout_secs:
            configurations?.turn_silence_timeout_secs
            ?? (defaults as any)?.turn_silence_timeout_secs
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.turn_silence_timeout_secs,
        boost_affirmations:
            configurations?.boost_affirmations
            ?? (defaults as any)?.boost_affirmations
            ?? FALLBACK_WORKFLOW_CONFIGURATIONS.boost_affirmations,
        transcript_configuration: {
            ...DEFAULT_TRANSCRIPT_CONFIGURATION,
            ...(defaults?.transcript_configuration as Partial<TranscriptConfiguration> | undefined),
            ...(configurations?.transcript_configuration as Partial<TranscriptConfiguration> | undefined),
        },
    };
}
