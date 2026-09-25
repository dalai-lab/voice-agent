"use client";

import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Globe,
    Phone,
    RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { WorkflowRunResponseSchema } from "@/client/types.gen";
import { CallTypeCell } from "@/components/CallTypeCell";
import { FilterBuilder } from "@/components/filters/FilterBuilder";
import { MediaPreviewButton, MediaPreviewDialog } from "@/components/MediaPreviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getDispositionBadge, formatContactOrigin } from "@/lib/dispositionLabels";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { formatDateTime } from "@/lib/dateTime";
import { ActiveFilter, FilterAttribute } from "@/types/filters";
import { RunUsagePills } from "@/components/RunUsagePills";
import { useTalkarCustomer } from "@/context/TalkarCustomerContext";

export interface WorkflowRunsTableProps {
    // Data
    runs: WorkflowRunResponseSchema[];
    loading: boolean;
    error: string | null;

    // Pagination
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;

    // Filters
    availableAttributes: FilterAttribute[];
    activeFilters: ActiveFilter[];
    onFiltersChange: (filters: ActiveFilter[]) => void;
    onApplyFilters: () => void;
    onClearFilters: () => void;
    isExecutingFilters: boolean;
    hasAppliedFilters?: boolean;

    // Sorting
    sortBy?: string | null;
    sortOrder?: 'asc' | 'desc';
    onSort?: (field: string) => void;

    // Navigation & Actions
    workflowId?: number;

    // Reload
    onReload?: () => void;

    // Optional customization
    title?: string;
    subtitle?: string;
    showFilters?: boolean;
    emptyMessage?: string;
    /**
     * Controls visibility of the Usage column.
     * Defaulted to false per design preference: HIDE USAGE COLUMN DONT REMOVE.
     */
    showUsageColumn?: boolean;
    /**
     * Admin override. If omitted, resolved automatically via talkar customer & admin bypass state.
     */
    isAdmin?: boolean;
}

/**
 * Extracts the caller / from phone number.
 */
function getCallerNumber(run: WorkflowRunResponseSchema): string | null {
    const isOutbound = run.call_type === 'outbound';
    let val: any =
        (run as any).caller_number ||
        run.initial_context?.caller_number ||
        run.initial_context?.from_number ||
        (run as any).context_variables?.caller_number ||
        (run as any).context_variables?.from_number;

    if (!val && !isOutbound) {
        val =
            run.gathered_context?.customer_phone_number ||
            run.gathered_context?.caller_number ||
            (run as any).phone_number;
    }

    if (!val) {
        val = (run as any).phone_number;
    }

    return val && typeof val === 'string' && val.trim() ? val.trim() : null;
}

/**
 * Extracts the called / destination phone number.
 */
function getCalledNumber(run: WorkflowRunResponseSchema): string | null {
    const isOutbound = run.call_type === 'outbound';
    let val: any =
        (run as any).called_number ||
        run.initial_context?.called_number ||
        run.initial_context?.to_number ||
        (run as any).context_variables?.called_number ||
        (run as any).context_variables?.to_number;

    if (!val && isOutbound) {
        val =
            run.gathered_context?.customer_phone_number ||
            run.gathered_context?.called_number;
    }

    return val && typeof val === 'string' && val.trim() ? val.trim() : null;
}

/**
 * Resolves call duration in seconds across available fields.
 */
function getCallDuration(run: WorkflowRunResponseSchema): number | null {
    if (typeof run.cost_info?.call_duration_seconds === 'number') {
        return run.cost_info.call_duration_seconds;
    }
    if (typeof (run as any).call_duration_seconds === 'number') {
        return (run as any).call_duration_seconds;
    }
    if (typeof (run as any).duration === 'number') {
        return (run as any).duration;
    }
    return null;
}

/**
 * Clean human-readable duration format (e.g. 42s, 1m 15s).
 */
function formatCallDuration(seconds: number | null): string {
    if (seconds === null || isNaN(seconds)) return "—";
    if (seconds <= 0) return "0s";
    const total = Math.round(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export function WorkflowRunsTable({
    runs,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    onPageChange,
    availableAttributes,
    activeFilters,
    onFiltersChange,
    onApplyFilters,
    onClearFilters,
    isExecutingFilters,
    hasAppliedFilters = false,
    sortBy,
    sortOrder = 'desc',
    onSort,
    workflowId,
    onReload,
    title = "Call History",
    subtitle,
    showFilters = true,
    emptyMessage = "No workflow runs found",
    showUsageColumn = false,
    isAdmin: isAdminProp,
}: WorkflowRunsTableProps) {
    const router = useRouter();
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'in_progress' | 'telephony' | 'web'>('all');
    const organizationTimezone = useOrganizationTimezone();

    // Determine admin status: bypass active OR not a customer
    const { isTalkarCustomer, isAdminBypass } = useTalkarCustomer();
    const isAdmin = typeof isAdminProp === 'boolean'
        ? isAdminProp
        : (isAdminBypass || (typeof window !== 'undefined' && document.cookie.includes('talkar_admin_bypass=true')) || (!isTalkarCustomer && !(typeof window !== 'undefined' && document.cookie.includes('talkar_customer=true'))));

    // Media preview dialog
    const mediaPreview = MediaPreviewDialog();

    // Reset web tab filter for non-admins if active
    React.useEffect(() => {
        if (!isAdmin && (activeTab === 'web' || activeTab === 'telephony')) {
            setActiveTab('all');
        }
    }, [isAdmin, activeTab]);

    const isWebCall = (run: WorkflowRunResponseSchema): boolean => {
        const mode = (run.mode || '').toLowerCase();
        return mode === 'web' || mode === 'webrtc' || mode === 'smallwebrtc';
    };

    // Non-admins: hide all webcalls completely. Keep for admin.
    const visibleRuns = React.useMemo(() => {
        if (isAdmin) return runs;
        return runs.filter(run => !isWebCall(run));
    }, [runs, isAdmin]);

    const formatSectionDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const isSameDay = (d1: Date, d2: Date) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        if (isSameDay(date, today)) {
            return `Today, ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        }
        if (isSameDay(date, yesterday)) {
            return `Yesterday, ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        }
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTimeOnly = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const filteredRuns = React.useMemo(() => {
        return visibleRuns.filter((run) => {
            if (activeTab === 'completed') return run.is_completed;
            if (activeTab === 'in_progress') return !run.is_completed;
            if (activeTab === 'web') return isWebCall(run);
            if (activeTab === 'telephony') return !isWebCall(run);
            return true;
        });
    }, [visibleRuns, activeTab]);

    const groupedRuns = (() => {
        const groups: { dateSection: string; items: typeof visibleRuns }[] = [];
        filteredRuns.forEach((run) => {
            const section = formatSectionDate(run.created_at);
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.dateSection === section) {
                lastGroup.items.push(run);
            } else {
                groups.push({ dateSection: section, items: [run] });
            }
        });
        return groups;
    })();

    const handleRowClick = (runId: number, runWorkflowId: number) => {
        router.push(`/workflow/${runWorkflowId}/run/${runId}`);
    };

    return (
        <div className="space-y-6">
            {/* Title and Filters */}
            {showFilters && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/80 text-muted-foreground tabular-nums">
                                    {(isAdmin ? totalCount : visibleRuns.length).toLocaleString()} {(isAdmin ? totalCount : visibleRuns.length) === 1 ? 'call' : 'calls'}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {subtitle || (isAdmin
                                    ? `Showing ${runs.length} of ${totalCount} total calls across all active agents`
                                    : `Showing ${visibleRuns.length} calls across active agents`)}
                            </p>
                        </div>
                        {onReload && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8.5 px-3 rounded-lg border-border/70 hover:bg-muted/80 gap-2 text-xs font-medium shadow-2xs transition-colors self-start sm:self-auto"
                                onClick={onReload}
                                disabled={loading}
                                title="Refresh Call Records"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </Button>
                        )}
                    </div>
                    <FilterBuilder
                        availableAttributes={availableAttributes}
                        activeFilters={activeFilters}
                        onFiltersChange={onFiltersChange}
                        onApplyFilters={onApplyFilters}
                        onClearFilters={onClearFilters}
                        isExecuting={isExecutingFilters}
                        hasAppliedFilters={hasAppliedFilters}
                    />
                </div>
            )}

            {/* Loading / Error States */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-14 rounded-xl bg-card border border-border/60 animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive font-medium">
                    {error}
                </div>
            ) : visibleRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm mx-auto border border-border/60 bg-card rounded-xl shadow-xs">
                    <Phone className="h-8 w-8 text-muted-foreground/30 stroke-1 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No call logs found</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{emptyMessage}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Quick Filter Segmented Control Bar */}
                    <div className="flex items-center gap-1.5 p-1 bg-muted/30 border border-border/60 rounded-xl overflow-x-auto w-fit max-w-full">
                        {(
                            [
                                { id: 'all' as const, label: 'All Calls', count: visibleRuns.length },
                                { id: 'completed' as const, label: 'Completed', count: visibleRuns.filter(r => r.is_completed).length },
                                { id: 'in_progress' as const, label: 'In Progress', count: visibleRuns.filter(r => !r.is_completed).length },
                                ...(isAdmin ? [
                                    { id: 'telephony' as const, label: 'Telephony', count: visibleRuns.filter(r => !isWebCall(r)).length },
                                    { id: 'web' as const, label: 'Web Calls', count: visibleRuns.filter(r => isWebCall(r)).length },
                                ] : []),
                            ]
                        ).map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? "bg-background text-foreground font-semibold shadow-xs border border-border/70"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium tabular-nums ${
                                        isActive
                                            ? "bg-muted text-foreground font-semibold"
                                            : "bg-muted/60 text-muted-foreground"
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Framed Modern Table Container */}
                    <div className="w-full rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 border-b border-border/70 hover:bg-transparent">
                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 w-14">ID</TableHead>
                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 whitespace-nowrap min-w-[130px]">
                                            Phone Number
                                        </TableHead>
                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 whitespace-nowrap min-w-[130px]">
                                            Called Number
                                        </TableHead>
                                        {!workflowId && (
                                            <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 min-w-[160px]">
                                                Agent
                                            </TableHead>
                                        )}
                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 w-28">Status</TableHead>
                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 whitespace-nowrap min-w-[100px]">Time</TableHead>
                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 w-24">Type</TableHead>
                                        <TableHead
                                            className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 cursor-pointer hover:bg-accent/40 select-none whitespace-nowrap w-24"
                                            onClick={() => onSort?.('duration')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Duration
                                                {sortBy === 'duration' ? (
                                                    sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                                                ) : (
                                                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 whitespace-nowrap min-w-[140px]">Disposition</TableHead>

                                        {/* Usage Column: Hidden per user preference (DO NOT REMOVE) */}
                                        <TableHead className={showUsageColumn ? "font-semibold text-xs text-muted-foreground py-3.5 px-3.5 whitespace-nowrap min-w-[180px]" : "hidden"}>
                                            Usage
                                        </TableHead>

                                        <TableHead className="font-semibold text-xs text-muted-foreground py-3.5 px-3.5 text-right pr-4 w-24 whitespace-nowrap">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRuns.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={20} className="py-16 text-center">
                                                <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                                                    <Phone className="h-7 w-7 text-muted-foreground/30 stroke-1" />
                                                    <p className="text-sm font-medium text-foreground">No calls match this filter</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Try selecting another filter tab or clearing search criteria.
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        groupedRuns.map((group) => (
                                            <React.Fragment key={group.dateSection}>
                                                <TableRow className="bg-muted/20 hover:bg-muted/20 border-y border-border/50">
                                                    <TableCell colSpan={20} className="py-2.5 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                            <span className="font-semibold text-xs text-foreground/90">
                                                                {group.dateSection}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground/70 tabular-nums font-normal">
                                                                • {group.items.length} {group.items.length === 1 ? 'call' : 'calls'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {group.items.map((run) => {
                                                    const callerNumber = getCallerNumber(run);
                                                    const calledNumber = getCalledNumber(run);
                                                    const durationSecs = getCallDuration(run);
                                                    const isWebMode = run.mode === 'web' || run.mode === 'webrtc' || run.mode === 'smallwebrtc';

                                                    return (
                                                        <TableRow
                                                            key={run.id}
                                                            className={`cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/40 last:border-none ${selectedRowId === run.id ? "bg-muted/50" : ""}`}
                                                            onClick={() => handleRowClick(run.id, run.workflow_id)}
                                                        >
                                                            {/* ID */}
                                                            <TableCell className="text-xs text-muted-foreground/80 hover:text-foreground font-normal py-3 px-3.5 tabular-nums">
                                                                #{run.id}
                                                            </TableCell>

                                                            {/* Phone Number (Caller / From) */}
                                                            <TableCell className="py-3 px-3.5 whitespace-nowrap">
                                                                {callerNumber ? (
                                                                    <span className="text-[13px] font-medium text-foreground tabular-nums select-all">
                                                                        {callerNumber}
                                                                    </span>
                                                                ) : isWebMode ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border/40">
                                                                        <Globe className="h-3 w-3 text-sky-500" />
                                                                        Web User
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground/40 font-normal">—</span>
                                                                )}
                                                            </TableCell>

                                                            {/* Called Number (Destination / To) */}
                                                            <TableCell className="py-3 px-3.5 whitespace-nowrap">
                                                                {calledNumber ? (
                                                                    <span className="text-[13px] font-normal text-muted-foreground tabular-nums select-all">
                                                                        {calledNumber}
                                                                    </span>
                                                                ) : isWebMode ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/30 text-muted-foreground/80 border border-border/30">
                                                                        <Globe className="h-3 w-3 text-muted-foreground/60" />
                                                                        Web Agent
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground/40 font-normal">—</span>
                                                                )}
                                                            </TableCell>

                                                            {/* Agent Name */}
                                                            {!workflowId && (
                                                                <TableCell className="py-3 px-3.5 max-w-[220px]">
                                                                    <span
                                                                        className="text-[13px] font-medium text-foreground truncate block hover:text-primary transition-colors"
                                                                        title={(run as any).workflow_name || `Agent #${run.workflow_id}`}
                                                                    >
                                                                        {(run as any).workflow_name || `Agent #${run.workflow_id}`}
                                                                    </span>
                                                                </TableCell>
                                                            )}

                                                            {/* Status */}
                                                            <TableCell className="py-3 px-3.5 whitespace-nowrap">
                                                                {run.is_completed ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                                        Completed
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                                                                        In Progress
                                                                    </span>
                                                                )}
                                                            </TableCell>

                                                            {/* Time */}
                                                            <TableCell
                                                                className="text-[13px] text-muted-foreground whitespace-nowrap py-3 px-3.5 tabular-nums"
                                                                title={formatDateTime(run.created_at, organizationTimezone)}
                                                            >
                                                                {formatTimeOnly(run.created_at)}
                                                            </TableCell>

                                                            {/* Call Type */}
                                                            <TableCell className="py-3 px-3.5 whitespace-nowrap">
                                                                <CallTypeCell mode={run.mode} callType={run.call_type} />
                                                            </TableCell>

                                                            {/* Duration */}
                                                            <TableCell className="text-[13px] font-medium text-foreground whitespace-nowrap py-3 px-3.5 tabular-nums">
                                                                {formatCallDuration(durationSecs)}
                                                            </TableCell>

                                                            {/* Disposition */}
                                                            <TableCell className="py-3 px-3.5 whitespace-nowrap">
                                                                {(() => {
                                                                    const rawDisp =
                                                                        (run.gathered_context?.mapped_call_disposition as string | undefined) ||
                                                                        ((run as any).disposition as string | undefined) ||
                                                                        (run.gathered_context?.call_disposition as string | undefined) ||
                                                                        (run.gathered_context?.disposition as string | undefined);
                                                                    if (rawDisp) {
                                                                        const { label: dispLabel, className: dispClass } = getDispositionBadge(rawDisp);
                                                                        return (
                                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap shadow-2xs ${dispClass}`}>
                                                                                {dispLabel}
                                                                            </span>
                                                                        );
                                                                    }
                                                                    return <span className="text-xs text-muted-foreground/40 font-normal">—</span>;
                                                                })()}
                                                            </TableCell>

                                                            {/* Usage Cell: Hidden per user preference (DO NOT REMOVE) */}
                                                            <TableCell className={showUsageColumn ? "py-3 px-3.5" : "hidden"}>
                                                                <RunUsagePills
                                                                    usageInfo={run.usage_info}
                                                                    costInfo={run.cost_info}
                                                                    logs={(run as any).logs}
                                                                    showEmpty
                                                                />
                                                            </TableCell>

                                                            {/* Actions */}
                                                            <TableCell className="text-right pr-4 py-3 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                <div className="inline-flex items-center gap-1 justify-end">
                                                                    <MediaPreviewButton
                                                                        recordingUrl={run.recording_url}
                                                                        transcriptUrl={run.transcript_url}
                                                                        runId={run.id}
                                                                        onOpenPreview={mediaPreview.openPreview}
                                                                        onSelect={setSelectedRowId}
                                                                    />
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                                                                        onClick={() => router.push(`/workflow/${run.workflow_id}/run/${run.id}`)}
                                                                        title="View Call Details"
                                                                    >
                                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 px-1">
                            <p className="text-xs text-muted-foreground">
                                Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                                <span className="font-semibold text-foreground">{totalPages}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-medium rounded-lg border-border/70 gap-1.5 shadow-2xs"
                                    onClick={() => onPageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-medium rounded-lg border-border/70 gap-1.5 shadow-2xs"
                                    onClick={() => onPageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Media Preview Dialog */}
            {mediaPreview.dialog}
        </div>
    );
}
