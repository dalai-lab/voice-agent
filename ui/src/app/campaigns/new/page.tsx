"use client";

import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ITimezoneOption } from 'react-timezone-select';
import { toast } from 'sonner';

import {
    createCampaignApiV1CampaignCreatePost,
    getCampaignDefaultsApiV1OrganizationsCampaignDefaultsGet,
    getWorkflowsSummaryApiV1WorkflowSummaryGet,
    listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet
} from '@/client/sdk.gen';
import type { TelephonyConfigurationListItem, WorkflowSummaryResponse } from '@/client/types.gen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';

import CampaignAdvancedSettings, { getTimezoneValue, type TimeSlot } from '../CampaignAdvancedSettings';
import CsvUploadSelector from '../CsvUploadSelector';

export default function NewCampaignPage() {
    const { user, getAccessToken, redirectToLogin, loading } = useAuth();
    const router = useRouter();

    // Form state
    const [activeTab, setActiveTab] = useState("details");
    const [campaignName, setCampaignName] = useState('');
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
    const [sourceType, setSourceType] = useState<'csv'>('csv');
    const [sourceId, setSourceId] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Workflows state
    const [workflows, setWorkflows] = useState<WorkflowSummaryResponse[]>([]);
    const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);

    // Telephony configurations state
    const [telephonyConfigs, setTelephonyConfigs] = useState<TelephonyConfigurationListItem[]>([]);
    const [selectedTelephonyConfigId, setSelectedTelephonyConfigId] = useState<string>('');
    const [isLoadingTelephonyConfigs, setIsLoadingTelephonyConfigs] = useState(true);

    // Advanced settings state
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [orgConcurrentLimit, setOrgConcurrentLimit] = useState<number>(2);
    const [fromNumbersCount, setFromNumbersCount] = useState<number>(0);
    const [maxConcurrency, setMaxConcurrency] = useState<string>('');
    // Retry config state
    const [retryEnabled, setRetryEnabled] = useState(true);
    const [maxRetries, setMaxRetries] = useState<string>('2');
    const [retryDelaySeconds, setRetryDelaySeconds] = useState<string>('120');
    const [retryOnBusy, setRetryOnBusy] = useState(true);
    const [retryOnNoAnswer, setRetryOnNoAnswer] = useState(true);
    const [retryOnVoicemail, setRetryOnVoicemail] = useState(true);
    // Schedule config state
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleTimezone, setScheduleTimezone] = useState<ITimezoneOption | string>(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return 'UTC';
        }
    });
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
        { day_of_week: 0, start_time: '09:00', end_time: '17:00' },
    ]);
    // Circuit breaker config state
    const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState(true);
    const [circuitBreakerFailureThreshold, setCircuitBreakerFailureThreshold] = useState<string>('50');
    const [circuitBreakerWindowSeconds, setCircuitBreakerWindowSeconds] = useState<string>('120');
    const [circuitBreakerMinCalls, setCircuitBreakerMinCalls] = useState<string>('5');
    // Callback config state
    const [callbackEnabled, setCallbackEnabled] = useState(true);
    const [callbackSociableHoursStart, setCallbackSociableHoursStart] = useState<string>('08:00');
    const [callbackSociableHoursEnd, setCallbackSociableHoursEnd] = useState<string>('21:00');
    const [callbackSociableHoursTimezone, setCallbackSociableHoursTimezone] = useState<ITimezoneOption | string>(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return 'UTC';
        }
    });
    const [callbackHonorCampaignWindowForLongCallbacks, setCallbackHonorCampaignWindowForLongCallbacks] = useState(true);
    const [callbackLongCallbackThresholdMinutes, setCallbackLongCallbackThresholdMinutes] = useState<string>('120');

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    // Fetch workflows
    const fetchWorkflows = useCallback(async () => {
        if (!user) return;
        try {
            const accessToken = await getAccessToken();
            const response = await getWorkflowsSummaryApiV1WorkflowSummaryGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                query: {
                    status: 'active',
                },
            });

            if (response.data) {
                setWorkflows(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
            toast.error('Failed to load workflows');
        } finally {
            setIsLoadingWorkflows(false);
        }
    }, [user, getAccessToken]);

    // Fetch telephony configurations
    const fetchTelephonyConfigs = useCallback(async () => {
        if (!user) return;
        try {
            const accessToken = await getAccessToken();
            const response = await listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                const configs = response.data.configurations ?? [];
                setTelephonyConfigs(configs);
                const defaultConfig = configs.find((c) => c.is_default_outbound) ?? configs[0];
                if (defaultConfig) {
                    setSelectedTelephonyConfigId(String(defaultConfig.id));
                }
            }
        } catch (error) {
            console.error('Failed to fetch telephony configurations:', error);
            toast.error('Failed to load telephony configurations');
        } finally {
            setIsLoadingTelephonyConfigs(false);
        }
    }, [user, getAccessToken]);

    // Fetch campaign limits
    const fetchCampaignDefaults = useCallback(async () => {
        if (!user) return;
        try {
            const accessToken = await getAccessToken();
            const response = await getCampaignDefaultsApiV1OrganizationsCampaignDefaultsGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setOrgConcurrentLimit(response.data.concurrent_call_limit);
                setFromNumbersCount(response.data.from_numbers_count);

                const last = (response.data as { last_campaign_settings?: {
                    retry_config?: { enabled: boolean; max_retries: number; retry_delay_seconds: number; retry_on_busy: boolean; retry_on_no_answer: boolean; retry_on_voicemail: boolean };
                    max_concurrency?: number | null;
                    schedule_config?: { enabled: boolean; timezone: string; slots: TimeSlot[] } | null;
                    circuit_breaker?: { enabled: boolean; failure_threshold: number; window_seconds: number; min_calls_in_window: number } | null;
                } | null }).last_campaign_settings;

                if (last) {
                    // Pre-populate from last campaign
                    if (last.retry_config) {
                        setRetryEnabled(last.retry_config.enabled);
                        setMaxRetries(String(last.retry_config.max_retries));
                        setRetryDelaySeconds(String(last.retry_config.retry_delay_seconds));
                        setRetryOnBusy(last.retry_config.retry_on_busy);
                        setRetryOnNoAnswer(last.retry_config.retry_on_no_answer);
                        setRetryOnVoicemail(last.retry_config.retry_on_voicemail);
                    } else {
                        const retryConfig = response.data.default_retry_config;
                        setRetryEnabled(retryConfig.enabled);
                        setMaxRetries(String(retryConfig.max_retries));
                        setRetryDelaySeconds(String(retryConfig.retry_delay_seconds));
                        setRetryOnBusy(retryConfig.retry_on_busy);
                        setRetryOnNoAnswer(retryConfig.retry_on_no_answer);
                        setRetryOnVoicemail(retryConfig.retry_on_voicemail);
                    }
                    if (last.max_concurrency) {
                        setMaxConcurrency(String(last.max_concurrency));
                    }
                    if (last.schedule_config) {
                        setScheduleEnabled(last.schedule_config.enabled);
                        setScheduleTimezone(last.schedule_config.timezone);
                        setTimeSlots(last.schedule_config.slots);
                    }
                    if (last.circuit_breaker) {
                        setCircuitBreakerEnabled(last.circuit_breaker.enabled);
                        setCircuitBreakerFailureThreshold(String(Math.round(last.circuit_breaker.failure_threshold * 100)));
                        setCircuitBreakerWindowSeconds(String(last.circuit_breaker.window_seconds));
                        setCircuitBreakerMinCalls(String(last.circuit_breaker.min_calls_in_window));
                    }
                } else {
                    // No previous campaign — use defaults
                    const retryConfig = response.data.default_retry_config;
                    setRetryEnabled(retryConfig.enabled);
                    setMaxRetries(String(retryConfig.max_retries));
                    setRetryDelaySeconds(String(retryConfig.retry_delay_seconds));
                    setRetryOnBusy(retryConfig.retry_on_busy);
                    setRetryOnNoAnswer(retryConfig.retry_on_no_answer);
                    setRetryOnVoicemail(retryConfig.retry_on_voicemail);
                }
            }
        } catch (error) {
            console.error('Failed to fetch campaign limits:', error);
        }
    }, [user, getAccessToken]);

    // Initial load
    useEffect(() => {
        if (user) {
            fetchWorkflows();
            fetchCampaignDefaults();
            fetchTelephonyConfigs();
        }
    }, [fetchWorkflows, fetchCampaignDefaults, fetchTelephonyConfigs, user]);

    // Phone-number count for the selected telephony config drives concurrency
    // bounds. Falls back to the campaign-defaults endpoint's count (org default
    // config) until the configs list resolves.
    const selectedTelephonyConfig = telephonyConfigs.find(
        (c) => String(c.id) === selectedTelephonyConfigId,
    );
    const availableFromNumbersCount = selectedTelephonyConfig?.phone_number_count ?? fromNumbersCount;

    // Effective concurrency limit considering both org limit and available CLIs
    const effectiveLimit = availableFromNumbersCount > 0
        ? Math.min(orgConcurrentLimit, availableFromNumbersCount)
        : orgConcurrentLimit;

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);

        if (!campaignName || !selectedWorkflowId || !sourceId || !selectedTelephonyConfigId) {
            toast.error('Please fill in all fields');
            return;
        }

        // Validate max_concurrency if provided
        const maxConcurrencyValue = maxConcurrency ? parseInt(maxConcurrency) : null;
        if (maxConcurrencyValue !== null) {
            if (isNaN(maxConcurrencyValue) || maxConcurrencyValue < 1 || maxConcurrencyValue > 100) {
                toast.error('Max concurrent calls must be between 1 and 100');
                return;
            }
            if (maxConcurrencyValue > effectiveLimit) {
                if (availableFromNumbersCount > 0 && availableFromNumbersCount < orgConcurrentLimit) {
                    toast.error(`Max concurrent calls cannot exceed ${effectiveLimit}. The selected configuration has ${availableFromNumbersCount} phone number(s) - add more CLIs to increase concurrency.`);
                } else {
                    toast.error(`Max concurrent calls cannot exceed organization limit (${effectiveLimit})`);
                }
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const accessToken = await getAccessToken();

            const retryConfig = {
                enabled: retryEnabled,
                max_retries: parseInt(maxRetries) || 2,
                retry_delay_seconds: parseInt(retryDelaySeconds) || 120,
                retry_on_busy: retryOnBusy,
                retry_on_no_answer: retryOnNoAnswer,
                retry_on_voicemail: retryOnVoicemail,
            };

            // Build schedule_config if enabled
            const timezoneValue = getTimezoneValue(scheduleTimezone);
            const scheduleConfig = scheduleEnabled && timeSlots.length > 0
                ? {
                    enabled: true,
                    timezone: timezoneValue,
                    slots: timeSlots,
                }
                : undefined;

            // Build circuit_breaker config
            const circuitBreakerConfig = {
                enabled: circuitBreakerEnabled,
                failure_threshold: (parseInt(circuitBreakerFailureThreshold) || 50) / 100,
                window_seconds: parseInt(circuitBreakerWindowSeconds) || 120,
                min_calls_in_window: parseInt(circuitBreakerMinCalls) || 5,
            };

            // Build callback_config
            const callbackConfig = {
                enabled: callbackEnabled,
                sociable_hours_start: callbackSociableHoursStart,
                sociable_hours_end: callbackSociableHoursEnd,
                sociable_hours_timezone: getTimezoneValue(callbackSociableHoursTimezone),
                honor_campaign_window_for_long_callbacks: callbackHonorCampaignWindowForLongCallbacks,
                long_callback_threshold_minutes: parseInt(callbackLongCallbackThresholdMinutes) || 120,
            };

            const response = await createCampaignApiV1CampaignCreatePost({
                body: {
                    name: campaignName,
                    workflow_id: parseInt(selectedWorkflowId),
                    source_type: sourceType,
                    source_id: sourceId,
                    telephony_configuration_id: parseInt(selectedTelephonyConfigId),
                    retry_config: retryConfig,
                    max_concurrency: maxConcurrencyValue,
                    schedule_config: scheduleConfig,
                    circuit_breaker: circuitBreakerConfig,
                    callback_config: callbackConfig,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.error) {
                // Extract error message from API response
                let errorDetail = (response.error as any)?.detail;
                if (Array.isArray(errorDetail)) {
                    errorDetail = errorDetail.map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`).join(', ');
                } else if (typeof errorDetail === 'object' && errorDetail !== null) {
                    errorDetail = JSON.stringify(errorDetail);
                }
                const errorMessage = typeof errorDetail === 'string' ? errorDetail : 'Failed to create campaign';
                setCreateError(errorMessage);
                toast.error(errorMessage);
                return;
            }

            if (response.data) {
                toast.success('Campaign created successfully');
                router.push(`/campaigns/${response.data.id}`);
            }
        } catch (error: unknown) {
            console.error('Failed to create campaign:', error);
            const errorMessage = 'Failed to create campaign';
            setCreateError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle back navigation
    const handleBack = () => {
        router.push('/campaigns');
    };

    // Handle CSV file upload
    const handleFileUploaded = (fileKey: string, fileName: string) => {
        setSourceId(fileKey);
        setSelectedFileName(fileName);
        setCreateError(null);
    };

    const CREATION_TABS = [
        { id: "details", label: "Campaign Details" },
        { id: "source", label: "Data Source (CSV)" },
        { id: "advanced", label: "Advanced Settings" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-6 py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8 rounded-lg"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Campaigns</p>
                    <h1 className="text-sm font-bold text-foreground tracking-tight">Create New Campaign</h1>
                </div>
            </header>

            {/* Left Nav + Content Form Column */}
            <div className="mx-auto flex max-w-5xl w-full gap-8 px-6 py-8 flex-1">
                {/* Left Tabs Sidebar */}
                <aside className="w-48 shrink-0">
                    <div className="sticky top-24 space-y-1">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 pl-2.5">
                            Steps
                        </p>
                        {CREATION_TABS.map((tab) => {
                            // Check if fields are complete in that tab for visual feedback
                            let isComplete = false;
                            if (tab.id === "details") {
                                isComplete = !!campaignName && !!selectedWorkflowId && !!selectedTelephonyConfigId;
                            } else if (tab.id === "source") {
                                isComplete = !!sourceId;
                            } else if (tab.id === "advanced") {
                                isComplete = true; // Advanced has defaults
                            }

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                        activeTab === tab.id
                                            ? "bg-foreground/[0.04] text-foreground dark:bg-foreground/[0.06]"
                                            : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.01]"
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {isComplete && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-xs" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Right Form Panels */}
                <div className="min-w-0 flex-1">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
                            {activeTab === "details" && (
                                <div className="space-y-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border pb-2">Campaign Details</h3>
                                    
                                    {/* Campaign Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="campaign-name" className="text-xs font-bold text-foreground">Campaign Name</Label>
                                        <Input
                                            id="campaign-name"
                                            placeholder="Enter campaign name"
                                            value={campaignName}
                                            onChange={(e) => setCampaignName(e.target.value)}
                                            maxLength={255}
                                            required
                                            className="h-9 rounded-lg border-border bg-background text-xs"
                                        />
                                        <p className="text-[10px] text-muted-foreground/60">
                                            Choose a descriptive name for your campaign.
                                        </p>
                                    </div>

                                    {/* Workflow Select */}
                                    <div className="space-y-2">
                                        <Label htmlFor="workflow" className="text-xs font-bold text-foreground">Workflow</Label>
                                        <Select
                                            value={selectedWorkflowId}
                                            onValueChange={setSelectedWorkflowId}
                                            required
                                        >
                                            <SelectTrigger id="workflow" className="h-9 rounded-lg border-border bg-background text-xs">
                                                <SelectValue placeholder="Select a workflow" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-lg text-xs">
                                                {isLoadingWorkflows ? (
                                                    <SelectItem value="loading" disabled>
                                                        Loading workflows...
                                                    </SelectItem>
                                                ) : workflows.length === 0 ? (
                                                    <SelectItem value="none" disabled>
                                                        No workflows found
                                                    </SelectItem>
                                                ) : (
                                                    workflows.map((workflow) => (
                                                        <SelectItem
                                                            key={workflow.id}
                                                            value={workflow.id.toString()}
                                                            className="text-xs"
                                                        >
                                                            {workflow.name} (#{workflow.id})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground/60">
                                            Select the workflow to execute for each row in the data source.
                                        </p>
                                    </div>

                                    {/* Telephony config */}
                                    <div className="space-y-2">
                                        <Label htmlFor="telephony-config" className="text-xs font-bold text-foreground">Telephony Configuration</Label>
                                        {!isLoadingTelephonyConfigs && telephonyConfigs.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground bg-muted/20">
                                                No telephony configurations yet.{' '}
                                                <Link
                                                    href="/telephony-configurations"
                                                    className="underline text-foreground font-semibold"
                                                >
                                                    Add one
                                                </Link>{' '}
                                                to create a campaign.
                                            </div>
                                        ) : (
                                            <Select
                                                value={selectedTelephonyConfigId}
                                                onValueChange={setSelectedTelephonyConfigId}
                                                required
                                            >
                                                <SelectTrigger id="telephony-config" className="h-9 rounded-lg border-border bg-background text-xs">
                                                    <SelectValue placeholder="Select a telephony configuration" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg text-xs">
                                                    {isLoadingTelephonyConfigs ? (
                                                        <SelectItem value="loading" disabled>
                                                            Loading configurations...
                                                        </SelectItem>
                                                    ) : (
                                                        telephonyConfigs.map((config) => (
                                                            <SelectItem
                                                                key={config.id}
                                                                value={config.id.toString()}
                                                                className="text-xs"
                                                            >
                                                                {config.name} ({config.provider})
                                                                {config.is_default_outbound ? ' - default' : ''}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60">
                                            Outbound calls for this campaign will use this configuration&apos;s caller IDs.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === "source" && (
                                <div className="space-y-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border pb-2">Data Source (CSV)</h3>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="source-type" className="text-xs font-bold text-foreground">Data Source Type</Label>
                                        <Select
                                            value={sourceType}
                                            onValueChange={(value) => {
                                                setSourceType(value as 'csv');
                                                setSourceId('');
                                                setSelectedFileName('');
                                            }}
                                            required
                                        >
                                            <SelectTrigger id="source-type" className="h-9 rounded-lg border-border bg-background text-xs">
                                                <SelectValue placeholder="Select source type" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-lg text-xs">
                                                <SelectItem value="csv" className="text-xs">CSV File</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground/60">
                                            Choose where your contact data is stored.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <CsvUploadSelector
                                            onFileUploaded={handleFileUploaded}
                                            selectedFileName={selectedFileName}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === "advanced" && (
                                <div className="space-y-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border pb-2">Advanced Configuration</h3>
                                    <div className="max-h-[420px] overflow-y-auto pr-2">
                                        <CampaignAdvancedSettings
                                            maxConcurrency={maxConcurrency}
                                            onMaxConcurrencyChange={setMaxConcurrency}
                                            effectiveLimit={effectiveLimit}
                                            orgConcurrentLimit={orgConcurrentLimit}
                                            fromNumbersCount={fromNumbersCount}
                                            retryEnabled={retryEnabled}
                                            onRetryEnabledChange={setRetryEnabled}
                                            maxRetries={maxRetries}
                                            onMaxRetriesChange={setMaxRetries}
                                            retryDelaySeconds={retryDelaySeconds}
                                            onRetryDelaySecondsChange={setRetryDelaySeconds}
                                            retryOnBusy={retryOnBusy}
                                            onRetryOnBusyChange={setRetryOnBusy}
                                            retryOnNoAnswer={retryOnNoAnswer}
                                            onRetryOnNoAnswerChange={setRetryOnNoAnswer}
                                            retryOnVoicemail={retryOnVoicemail}
                                            onRetryOnVoicemailChange={setRetryOnVoicemail}
                                            scheduleEnabled={scheduleEnabled}
                                            onScheduleEnabledChange={setScheduleEnabled}
                                            scheduleTimezone={scheduleTimezone}
                                            onScheduleTimezoneChange={setScheduleTimezone}
                                            timeSlots={timeSlots}
                                            onTimeSlotsChange={setTimeSlots}
                                            circuitBreakerEnabled={circuitBreakerEnabled}
                                            onCircuitBreakerEnabledChange={setCircuitBreakerEnabled}
                                            circuitBreakerFailureThreshold={circuitBreakerFailureThreshold}
                                            onCircuitBreakerFailureThresholdChange={setCircuitBreakerFailureThreshold}
                                            circuitBreakerWindowSeconds={circuitBreakerWindowSeconds}
                                            onCircuitBreakerWindowSecondsChange={setCircuitBreakerWindowSeconds}
                                            circuitBreakerMinCalls={circuitBreakerMinCalls}
                                            onCircuitBreakerMinCallsChange={setCircuitBreakerMinCalls}
                                            callbackEnabled={callbackEnabled}
                                            onCallbackEnabledChange={setCallbackEnabled}
                                            callbackSociableHoursStart={callbackSociableHoursStart}
                                            onCallbackSociableHoursStartChange={setCallbackSociableHoursStart}
                                            callbackSociableHoursEnd={callbackSociableHoursEnd}
                                            onCallbackSociableHoursEndChange={setCallbackSociableHoursEnd}
                                            callbackSociableHoursTimezone={callbackSociableHoursTimezone}
                                            onCallbackSociableHoursTimezoneChange={setCallbackSociableHoursTimezone}
                                            callbackHonorCampaignWindowForLongCallbacks={callbackHonorCampaignWindowForLongCallbacks}
                                            onCallbackHonorCampaignWindowForLongCallbacksChange={setCallbackHonorCampaignWindowForLongCallbacks}
                                            callbackLongCallbackThresholdMinutes={callbackLongCallbackThresholdMinutes}
                                            onCallbackLongCallbackThresholdMinutesChange={setCallbackLongCallbackThresholdMinutes}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {createError && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                                {createError}
                            </div>
                        )}

                        {/* Submit CTAs */}
                        <div className="flex items-center gap-3 pt-4 border-t border-border mt-6">
                            <Button
                                type="submit"
                                disabled={isSubmitting || !campaignName || !selectedWorkflowId || !sourceId || !selectedTelephonyConfigId}
                                className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Campaign'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={isSubmitting}
                                className="h-9 px-4 rounded-lg text-xs font-semibold"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
