"use client";

import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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
}: WorkflowRunsTableProps) {
    const router = useRouter();
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'in_progress' | 'web' | 'telephony'>('all');
    const organizationTimezone = useOrganizationTimezone();

    // Media preview dialog
    const mediaPreview = MediaPreviewDialog();

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

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

    const filteredRuns = runs.filter((run) => {
        if (activeTab === 'completed') return run.is_completed;
        if (activeTab === 'in_progress') return !run.is_completed;
        if (activeTab === 'web') return run.mode === 'web';
        if (activeTab === 'telephony') return run.mode === 'telephony';
        return true;
    });

    const groupedRuns = (() => {
        const groups: { dateSection: string; items: typeof runs }[] = [];
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

    // Compute dynamic custom columns from the first run's gathered_context
    const SYSTEM_KEYS = new Set(['mapped_call_disposition', 'call_disposition', 'disposition', 'customer_phone_number', 'call_id', 'call_tags', 'caller_number', 'called_number']);
    const dynamicGatheredColumns = runs.length > 0 && runs[0].gathered_context
        ? Object.keys(runs[0].gathered_context).filter(k => !SYSTEM_KEYS.has(k)).slice(0, 2)
        : [];
    const dynamicExtractedColumns = runs.length > 0 && runs[0].extracted_data
        ? Object.keys(runs[0].extracted_data).slice(0, 3)
        : [];

    const handleRowClick = (runId: number, runWorkflowId: number) => {
        router.push(`/workflow/${runWorkflowId}/run/${runId}`);
    };

    return (
        <div className="space-y-6">
            {/* Title and Filters */}
            {showFilters && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
                            <p className="text-xs text-muted-foreground">
                                {subtitle || `Showing ${runs.length} of ${totalCount} total runs`}
                            </p>
                        </div>
                        {onReload && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-lg"
                                onClick={onReload}
                                disabled={loading}
                                title="Reload"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                <div className="grid gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                    {error}
                </div>
            ) : runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm mx-auto border border-border bg-card rounded-xl shadow-xs">
                    <p className="text-xs text-muted-foreground leading-relaxed">{emptyMessage}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Quick Filter Segmented Tabs Bar */}
                    <div className="flex items-center gap-1.5 border-b border-border/60 pb-3 overflow-x-auto">
                        {(
                            [
                                { id: 'all', label: 'All', count: runs.length },
                                { id: 'completed', label: 'Completed', count: runs.filter(r => r.is_completed).length },
                                { id: 'in_progress', label: 'In Progress', count: runs.filter(r => !r.is_completed).length },
                                { id: 'web', label: 'Web', count: runs.filter(r => r.mode === 'web').length },
                                { id: 'telephony', label: 'Telephony', count: runs.filter(r => r.mode === 'telephony').length },
                            ] as const
                        ).map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? "bg-foreground text-background font-semibold shadow-xs"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                        isActive
                                            ? "bg-background/20 text-background"
                                            : "bg-muted text-muted-foreground"
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Frameless Table Container */}
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-border/80 hover:bg-transparent">
                                    <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 w-14">ID</TableHead>
                                    <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 whitespace-nowrap min-w-[140px]">Phone Number</TableHead>
                                    {!workflowId && <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 min-w-[180px]">Agent</TableHead>}
                                    <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 w-28">Status</TableHead>
                                    <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 whitespace-nowrap min-w-[120px]">Time</TableHead>
                                    <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 w-24">Call Type</TableHead>
                                    <TableHead
                                        className="font-semibold text-xs text-muted-foreground py-3 px-3 cursor-pointer hover:bg-accent/40 select-none whitespace-nowrap w-24"
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
                                    <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 whitespace-nowrap min-w-[140px]">Disposition</TableHead>

                                    {dynamicGatheredColumns.map(col => (
                                        <TableHead key={col} className="font-semibold text-xs text-muted-foreground py-3 px-3 uppercase whitespace-nowrap min-w-[140px]" title={col.replace(/_/g, ' ')}>
                                            {col.replace(/_/g, ' ')}
                                        </TableHead>
                                    ))}
                                    {dynamicExtractedColumns.map(col => (
                                        <TableHead key={`ext_${col}`} className="font-semibold text-xs text-blue-600/80 dark:text-blue-400/80 py-3 px-3 uppercase whitespace-nowrap min-w-[140px]" title={col.replace(/_/g, ' ')}>
                                            {col.replace(/_/g, ' ')}
                                        </TableHead>
                                    ))}
                                    <TableHead className="font-semibold text-xs text-muted-foreground py-3 px-3 text-right pr-4 w-24 whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRuns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={16} className="py-14 text-center text-xs text-muted-foreground">
                                            No runs match this tab filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groupedRuns.map((group) => (
                                        <React.Fragment key={group.dateSection}>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                                                <TableCell colSpan={16} className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider text-muted-foreground/90">
                                                    {group.dateSection}
                                                </TableCell>
                                            </TableRow>
                                            {group.items.map((run) => (
                                                <TableRow
                                                    key={run.id}
                                                    className={`cursor-pointer hover:bg-accent/30 transition-colors border-b border-border/40 ${selectedRowId === run.id ? "bg-accent/40" : ""}`}
                                                    onClick={() => handleRowClick(run.id, run.workflow_id)}
                                                >
                                                    <TableCell className="font-mono text-xs text-muted-foreground/80 py-3.5 px-3">#{run.id}</TableCell>
                                                    <TableCell className="text-xs font-mono text-foreground whitespace-nowrap py-3 px-4">
                                                        {(() => {
                                                            const phone =
                                                                (run.gathered_context?.customer_phone_number as string | undefined) ||
                                                                (run.initial_context?.caller_number as string | undefined) ||
                                                                (run.initial_context?.called_number as string | undefined);
                                                            if (phone) return phone;
                                                            if (run.mode === 'web') return <span className="text-muted-foreground font-sans text-xs">Web Browser</span>;
                                                            return <span className="text-muted-foreground/40">-</span>;
                                                        })()}
                                                    </TableCell>
                                                    {!workflowId && (
                                                        <TableCell className="text-xs font-semibold text-foreground max-w-[220px] truncate whitespace-nowrap py-3 px-4" title={(run as any).workflow_name || `Agent #${run.workflow_id}`}>
                                                            {(run as any).workflow_name || `Agent #${run.workflow_id}`}
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="py-3 px-4">
                                                        <Badge variant="outline" className={`text-[10px] tracking-wide py-0.5 px-2 font-medium rounded-md whitespace-nowrap ${run.is_completed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"}`}>
                                                            {run.is_completed ? "Completed" : "In Progress"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3 px-4" title={formatDateTime(run.created_at, organizationTimezone)}>
                                                        {formatTimeOnly(run.created_at)}
                                                    </TableCell>
                                                    <TableCell className="py-3 px-4">
                                                        <CallTypeCell mode={run.mode} callType={run.call_type} />
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-foreground whitespace-nowrap py-3 px-4">
                                                        {typeof run.cost_info?.call_duration_seconds === 'number'
                                                            ? `${run.cost_info.call_duration_seconds.toFixed(1)}s`
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="py-3 px-4">
                                                        {run.gathered_context?.mapped_call_disposition ? (() => {
                                                            const { label: dispLabel, className: dispClass } = getDispositionBadge(run.gathered_context.mapped_call_disposition as string);
                                                            return (
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${dispClass}`}>
                                                                    {dispLabel}
                                                                </span>
                                                            );
                                                        })() : (
                                                            <span className="text-xs text-muted-foreground/50">-</span>
                                                        )}
                                                    </TableCell>

                                                    {dynamicGatheredColumns.map(col => (
                                                        <TableCell key={col} className="text-xs text-foreground max-w-[180px] truncate whitespace-nowrap py-3 px-4" title={run.gathered_context?.[col] ? String(run.gathered_context[col]) : ""}>
                                                            {run.gathered_context?.[col] ? String(run.gathered_context[col]) : <span className="text-muted-foreground/30">-</span>}
                                                        </TableCell>
                                                    ))}
                                                    {dynamicExtractedColumns.map(col => (
                                                        <TableCell key={`ext_${col}`} className="text-xs text-blue-600/90 dark:text-blue-400 max-w-[180px] truncate whitespace-nowrap py-3 px-4" title={run.extracted_data?.[col] ? String(run.extracted_data[col]) : ""}>
                                                            {run.extracted_data?.[col] ? String(run.extracted_data[col]) : <span className="text-muted-foreground/30">-</span>}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-right pr-6 py-3 px-4" onClick={(e) => e.stopPropagation()}>
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
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                                                                onClick={() => router.push(`/workflow/${run.workflow_id}/run/${run.id}`)}
                                                            >
                                                                <ArrowRight className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <p className="text-xs text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold rounded-lg"
                                    onClick={() => onPageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold rounded-lg"
                                    onClick={() => onPageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
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
