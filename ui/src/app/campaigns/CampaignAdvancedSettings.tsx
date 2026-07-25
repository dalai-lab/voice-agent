"use client";

import { Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';
import TimezoneSelect, { type ITimezoneOption } from 'react-timezone-select';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export type TimeSlot = { day_of_week: number; start_time: string; end_time: string };

export interface CampaignAdvancedSettingsProps {
    // Concurrency
    maxConcurrency: string;
    onMaxConcurrencyChange: (value: string) => void;
    effectiveLimit: number;
    orgConcurrentLimit: number;
    fromNumbersCount: number;
    // Retry config
    retryEnabled: boolean;
    onRetryEnabledChange: (value: boolean) => void;
    maxRetries: string;
    onMaxRetriesChange: (value: string) => void;
    retryDelaySeconds: string;
    onRetryDelaySecondsChange: (value: string) => void;
    retryOnBusy: boolean;
    onRetryOnBusyChange: (value: boolean) => void;
    retryOnNoAnswer: boolean;
    onRetryOnNoAnswerChange: (value: boolean) => void;
    retryOnVoicemail: boolean;
    onRetryOnVoicemailChange: (value: boolean) => void;
    // Schedule config
    scheduleEnabled: boolean;
    onScheduleEnabledChange: (value: boolean) => void;
    scheduleTimezone: ITimezoneOption | string;
    onScheduleTimezoneChange: (value: ITimezoneOption | string) => void;
    timeSlots: TimeSlot[];
    onTimeSlotsChange: (value: TimeSlot[]) => void;
    // Circuit breaker config
    circuitBreakerEnabled: boolean;
    onCircuitBreakerEnabledChange: (value: boolean) => void;
    circuitBreakerFailureThreshold: string;
    onCircuitBreakerFailureThresholdChange: (value: string) => void;
    circuitBreakerWindowSeconds: string;
    onCircuitBreakerWindowSecondsChange: (value: string) => void;
    circuitBreakerMinCalls: string;
    onCircuitBreakerMinCallsChange: (value: string) => void;
    // Callback config
    callbackEnabled: boolean;
    onCallbackEnabledChange: (value: boolean) => void;
    callbackSociableHoursStart: string;
    onCallbackSociableHoursStartChange: (value: string) => void;
    callbackSociableHoursEnd: string;
    onCallbackSociableHoursEndChange: (value: string) => void;
    callbackSociableHoursTimezone: ITimezoneOption | string;
    onCallbackSociableHoursTimezoneChange: (value: ITimezoneOption | string) => void;
    callbackHonorCampaignWindowForLongCallbacks: boolean;
    onCallbackHonorCampaignWindowForLongCallbacksChange: (value: boolean) => void;
    callbackLongCallbackThresholdMinutes: string;
    onCallbackLongCallbackThresholdMinutesChange: (value: string) => void;
}

/** Extract the string timezone value from ITimezoneOption | string */
export function getTimezoneValue(tz: ITimezoneOption | string): string {
    const val = typeof tz === 'string' ? tz : tz.value;

    // Map common deprecated IANA timezones to modern equivalents
    // to prevent Python ZoneInfo validation errors on the backend
    const tzMap: Record<string, string> = {
        'Asia/Calcutta': 'Asia/Kolkata',
        'Asia/Katmandu': 'Asia/Kathmandu',
        'Asia/Saigon': 'Asia/Ho_Chi_Minh',
        'Asia/Rangoon': 'Asia/Yangon',
        'Asia/Macao': 'Asia/Macau',
        'Europe/Kiev': 'Europe/Kyiv',
    };

    return tzMap[val] || val;
}

const timezoneSelectStyles = {
    control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
        ...base,
        minHeight: '36px',
        fontSize: '14px',
        backgroundColor: 'var(--background)',
        borderColor: state.isFocused ? 'var(--ring)' : 'var(--border)',
        boxShadow: state.isFocused ? '0 0 0 2px color-mix(in srgb, var(--ring) 20%, transparent)' : 'none',
        '&:hover': { borderColor: 'var(--border)' },
    }),
    menu: (base: Record<string, unknown>) => ({
        ...base,
        zIndex: 9999,
        backgroundColor: 'var(--popover)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    }),
    menuList: (base: Record<string, unknown>) => ({
        ...base,
        backgroundColor: 'var(--popover)',
        padding: 0,
    }),
    option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
        ...base,
        backgroundColor: state.isSelected ? 'var(--accent)' : state.isFocused ? 'var(--accent)' : 'var(--popover)',
        color: 'var(--foreground)',
        cursor: 'pointer',
        '&:active': { backgroundColor: 'var(--accent)' },
    }),
    singleValue: (base: Record<string, unknown>) => ({ ...base, color: 'var(--foreground)' }),
    input: (base: Record<string, unknown>) => ({ ...base, color: 'var(--foreground)' }),
    placeholder: (base: Record<string, unknown>) => ({ ...base, color: 'var(--muted-foreground)' }),
    indicatorSeparator: (base: Record<string, unknown>) => ({ ...base, backgroundColor: 'var(--border)' }),
    dropdownIndicator: (base: Record<string, unknown>) => ({
        ...base,
        color: 'var(--muted-foreground)',
        '&:hover': { color: 'var(--foreground)' },
    }),
};

export default function CampaignAdvancedSettings({
    maxConcurrency, onMaxConcurrencyChange, effectiveLimit, orgConcurrentLimit, fromNumbersCount,
    retryEnabled, onRetryEnabledChange, maxRetries, onMaxRetriesChange,
    retryDelaySeconds, onRetryDelaySecondsChange,
    retryOnBusy, onRetryOnBusyChange, retryOnNoAnswer, onRetryOnNoAnswerChange,
    retryOnVoicemail, onRetryOnVoicemailChange,
    scheduleEnabled, onScheduleEnabledChange, scheduleTimezone, onScheduleTimezoneChange,
    timeSlots, onTimeSlotsChange,
    circuitBreakerEnabled, onCircuitBreakerEnabledChange,
    circuitBreakerFailureThreshold, onCircuitBreakerFailureThresholdChange,
    circuitBreakerWindowSeconds,
    onCircuitBreakerWindowSecondsChange,
    circuitBreakerMinCalls,
    onCircuitBreakerMinCallsChange,
    callbackEnabled,
    onCallbackEnabledChange,
    callbackSociableHoursStart,
    onCallbackSociableHoursStartChange,
    callbackSociableHoursEnd,
    onCallbackSociableHoursEndChange,
    callbackSociableHoursTimezone,
    onCallbackSociableHoursTimezoneChange,
    callbackHonorCampaignWindowForLongCallbacks,
    onCallbackHonorCampaignWindowForLongCallbacksChange,
    callbackLongCallbackThresholdMinutes,
    onCallbackLongCallbackThresholdMinutesChange,
}: CampaignAdvancedSettingsProps) {
    const timezoneSelectId = useId();

    return (
        <div className="space-y-4">
            {/* Max Concurrent Calls */}
            <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-3">
                <Label htmlFor="max-concurrency" className="text-xs font-bold text-foreground">Max Concurrent Calls</Label>
                <Input
                    id="max-concurrency"
                    type="number"
                    placeholder={`Default: ${effectiveLimit}`}
                    value={maxConcurrency}
                    onChange={(e) => onMaxConcurrencyChange(e.target.value)}
                    min={1}
                    max={effectiveLimit}
                    className="h-9 rounded-lg border-border bg-background text-xs"
                />
                <div className="space-y-1 text-[10px] text-muted-foreground/60 leading-relaxed font-semibold">
                    <p>
                        Maximum number of simultaneous calls. Leave empty to use {effectiveLimit}.
                        {fromNumbersCount > 0 && ` You have ${fromNumbersCount} CLI${fromNumbersCount !== 1 ? 's' : ''} and an org limit of ${orgConcurrentLimit}.`}
                    </p>
                    {fromNumbersCount > 0 && fromNumbersCount < orgConcurrentLimit && (
                        <p className="text-amber-600 dark:text-amber-400">
                            Concurrency is limited to {fromNumbersCount} by your configured phone numbers. To use the full org limit of {orgConcurrentLimit}, add more CLIs in <Link href="/telephony-configurations" className="underline font-bold">Telephony Configuration</Link>.
                        </p>
                    )}
                    {fromNumbersCount === 0 && (
                        <p className="text-amber-600 dark:text-amber-400 font-bold">
                            No phone numbers configured. Add CLIs in <Link href="/telephony-configurations" className="underline font-bold">Telephony Configuration</Link> before running the campaign.
                        </p>
                    )}
                </div>
            </div>

            {/* Retry Configuration */}
            <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="retry-enabled" className="text-xs font-bold text-foreground">Enable Retries</Label>
                        <p className="text-[10px] text-muted-foreground/60 font-semibold">
                            Automatically retry failed calls
                        </p>
                    </div>
                    <Switch
                        id="retry-enabled"
                        checked={retryEnabled}
                        onCheckedChange={onRetryEnabledChange}
                    />
                </div>

                {retryEnabled && (
                    <div className="space-y-4 pt-3 border-t border-border/40">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="max-retries" className="text-xs font-bold text-foreground">Max Retries</Label>
                                <Input
                                    id="max-retries"
                                    type="number"
                                    value={maxRetries}
                                    onChange={(e) => onMaxRetriesChange(e.target.value)}
                                    min={0}
                                    max={10}
                                    className="h-9 rounded-lg border-border bg-background text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="retry-delay" className="text-xs font-bold text-foreground">Retry Delay (seconds)</Label>
                                <Input
                                    id="retry-delay"
                                    type="number"
                                    value={retryDelaySeconds}
                                    onChange={(e) => onRetryDelaySecondsChange(e.target.value)}
                                    min={30}
                                    max={3600}
                                    className="h-9 rounded-lg border-border bg-background text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-foreground">Retry On</Label>
                            <div className="space-y-2 bg-muted/30 border border-border/50 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Busy Signal</span>
                                    <Switch checked={retryOnBusy} onCheckedChange={onRetryOnBusyChange} />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                    <span className="text-xs font-semibold text-foreground">No Answer</span>
                                    <Switch checked={retryOnNoAnswer} onCheckedChange={onRetryOnNoAnswerChange} />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                    <span className="text-xs font-semibold text-foreground">Voicemail</span>
                                    <Switch checked={retryOnVoicemail} onCheckedChange={onRetryOnVoicemailChange} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Call Schedule */}
            <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="schedule-enabled" className="text-xs font-bold text-foreground">Call Schedule</Label>
                        <p className="text-[10px] text-muted-foreground/60 font-semibold">
                            Restrict when calls are made
                        </p>
                    </div>
                    <Switch
                        id="schedule-enabled"
                        checked={scheduleEnabled}
                        onCheckedChange={onScheduleEnabledChange}
                    />
                </div>

                {scheduleEnabled && (
                    <div className="space-y-4 pt-3 border-t border-border/40">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground">Timezone</Label>
                            <TimezoneSelect
                                instanceId={timezoneSelectId}
                                value={scheduleTimezone}
                                onChange={onScheduleTimezoneChange}
                                styles={timezoneSelectStyles}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-foreground">Time Slots</Label>
                            <div className="space-y-2">
                                {timeSlots.map((slot, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Select
                                            value={String(slot.day_of_week)}
                                            onValueChange={(val) => {
                                                const updated = [...timeSlots];
                                                updated[index] = { ...updated[index], day_of_week: parseInt(val) };
                                                onTimeSlotsChange(updated);
                                            }}
                                        >
                                            <SelectTrigger className="w-[120px] h-9 rounded-lg text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                                    <SelectItem key={i} value={String(i)} className="text-xs">{day}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="time"
                                            value={slot.start_time}
                                            onChange={(e) => {
                                                const updated = [...timeSlots];
                                                updated[index] = { ...updated[index], start_time: e.target.value };
                                                onTimeSlotsChange(updated);
                                            }}
                                            className="w-[130px] h-9 rounded-lg text-xs"
                                        />
                                        <span className="text-xs text-muted-foreground">to</span>
                                        <Input
                                            type="time"
                                            value={slot.end_time}
                                            onChange={(e) => {
                                                const updated = [...timeSlots];
                                                updated[index] = { ...updated[index], end_time: e.target.value };
                                                onTimeSlotsChange(updated);
                                            }}
                                            className="w-[130px] h-9 rounded-lg text-xs"
                                        />
                                        {timeSlots.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onTimeSlotsChange(timeSlots.filter((_, i) => i !== index))}
                                                className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onTimeSlotsChange([...timeSlots, { day_of_week: 0, start_time: '09:00', end_time: '17:00' }])}
                                className="h-8 rounded-lg text-xs font-semibold"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add Time Slot
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Circuit Breaker */}
            <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="circuit-breaker-enabled" className="text-xs font-bold text-foreground">Circuit Breaker</Label>
                        <p className="text-[10px] text-muted-foreground/60 font-semibold">
                            Auto-pause campaign on high failure rates
                        </p>
                    </div>
                    <Switch
                        id="circuit-breaker-enabled"
                        checked={circuitBreakerEnabled}
                        onCheckedChange={onCircuitBreakerEnabledChange}
                    />
                </div>

                {circuitBreakerEnabled && (
                    <div className="space-y-4 pt-3 border-t border-border/40">
                        <div className="space-y-2">
                            <Label htmlFor="cb-failure-threshold" className="text-xs font-bold text-foreground">Failure Threshold (%)</Label>
                            <Input
                                id="cb-failure-threshold"
                                type="number"
                                value={circuitBreakerFailureThreshold}
                                onChange={(e) => onCircuitBreakerFailureThresholdChange(e.target.value)}
                                min={1}
                                max={100}
                                className="h-9 rounded-lg border-border bg-background text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground/60 font-semibold">
                                Pause when failure rate exceeds this percentage
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cb-window" className="text-xs font-bold text-foreground">Window (seconds)</Label>
                                <Input
                                    id="cb-window"
                                    type="number"
                                    value={circuitBreakerWindowSeconds}
                                    onChange={(e) => onCircuitBreakerWindowSecondsChange(e.target.value)}
                                    min={30}
                                    max={600}
                                    className="h-9 rounded-lg border-border bg-background text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cb-min-calls" className="text-xs font-bold text-foreground">Min Calls in Window</Label>
                                <Input
                                    id="cb-min-calls"
                                    type="number"
                                    value={circuitBreakerMinCalls}
                                    onChange={(e) => onCircuitBreakerMinCallsChange(e.target.value)}
                                    min={1}
                                    max={100}
                                    className="h-9 rounded-lg border-border bg-background text-xs"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Callback Settings */}
            <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="callback-enabled" className="text-xs font-bold text-foreground">Callback Settings</Label>
                        <p className="text-[10px] text-muted-foreground/60 font-semibold">
                            Configure callback handling for this campaign
                        </p>
                    </div>
                    <Switch
                        id="callback-enabled"
                        checked={callbackEnabled}
                        onCheckedChange={onCallbackEnabledChange}
                    />
                </div>

                {callbackEnabled && (
                    <div className="space-y-4 pt-3 border-t border-border/40">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cb-sociable-start" className="text-xs font-bold text-foreground">Sociable Hours Start</Label>
                                <Input
                                    id="cb-sociable-start"
                                    type="time"
                                    value={callbackSociableHoursStart}
                                    onChange={(e) => onCallbackSociableHoursStartChange(e.target.value)}
                                    className="h-9 rounded-lg border-border bg-background text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cb-sociable-end" className="text-xs font-bold text-foreground">Sociable Hours End</Label>
                                <Input
                                    id="cb-sociable-end"
                                    type="time"
                                    value={callbackSociableHoursEnd}
                                    onChange={(e) => onCallbackSociableHoursEndChange(e.target.value)}
                                    className="h-9 rounded-lg border-border bg-background text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cb-sociable-timezone" className="text-xs font-bold text-foreground">Sociable Hours Timezone</Label>
                            <TimezoneSelect
                                id="cb-sociable-timezone"
                                value={callbackSociableHoursTimezone}
                                onChange={onCallbackSociableHoursTimezoneChange}
                                styles={timezoneSelectStyles}
                            />
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                            <div className="space-y-0.5">
                                <Label htmlFor="cb-honor-campaign" className="text-xs font-bold text-foreground">Honor Campaign Window for Long Callbacks</Label>
                                <p className="text-[10px] text-muted-foreground/60 font-semibold">
                                    Hold long callbacks until the next schedule window opens
                                </p>
                            </div>
                            <Switch
                                id="cb-honor-campaign"
                                checked={callbackHonorCampaignWindowForLongCallbacks}
                                onCheckedChange={onCallbackHonorCampaignWindowForLongCallbacksChange}
                            />
                        </div>

                        {callbackHonorCampaignWindowForLongCallbacks && (
                            <div className="space-y-2 mt-2 pt-2 border-t border-border/40">
                                <Label htmlFor="cb-long-threshold" className="text-xs font-bold text-foreground">Long Callback Threshold (minutes)</Label>
                                <Input
                                    id="cb-long-threshold"
                                    type="number"
                                    value={callbackLongCallbackThresholdMinutes}
                                    onChange={(e) => onCallbackLongCallbackThresholdMinutesChange(e.target.value)}
                                    min={0}
                                    className="h-9 rounded-lg border-border bg-background text-xs"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
