"use client";

import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    title = "Workflow Run History",
    subtitle,
    showFilters = true,
    emptyMessage = "No workflow runs found",
}: WorkflowRunsTableProps) {
    const router = useRouter();
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
    const organizationTimezone = useOrganizationTimezone();

    // Media preview dialog
    const mediaPreview = MediaPreviewDialog();

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

    // Compute dynamic custom columns from the first run's gathered_context
    const SYSTEM_KEYS = new Set(['mapped_call_disposition', 'customer_phone_number', 'call_id', 'call_tags']);
    const dynamicColumns = runs.length > 0 && runs[0].gathered_context
        ? Object.keys(runs[0].gathered_context).filter(k => !SYSTEM_KEYS.has(k)).slice(0, 3)
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
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
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
                    {/* Flat Table Container */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs w-full">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 border-b border-border/80">
                                    <TableHead className="font-bold text-xs text-foreground py-3">ID</TableHead>
                                    {!workflowId && <TableHead className="font-bold text-xs text-foreground py-3">Agent</TableHead>}
                                    <TableHead className="font-bold text-xs text-foreground py-3">Status</TableHead>
                                    <TableHead className="font-bold text-xs text-foreground py-3">Created At</TableHead>
                                    <TableHead className="font-bold text-xs text-foreground py-3">Call Type</TableHead>
                                    <TableHead
                                        className="font-bold text-xs text-foreground py-3 cursor-pointer hover:bg-muted/50 select-none"
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
                                    <TableHead className="font-bold text-xs text-foreground py-3">Disposition</TableHead>
                                    {dynamicColumns.map(col => (
                                        <TableHead key={col} className="font-bold text-xs text-foreground py-3 uppercase truncate max-w-[120px]" title={col.replace(/_/g, ' ')}>
                                            {col.replace(/_/g, ' ')}
                                        </TableHead>
                                    ))}
                                    <TableHead className="font-bold text-xs text-foreground py-3 text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {runs.map((run) => (
                                    <TableRow
                                        key={run.id}
                                        className={`cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/50 ${selectedRowId === run.id ? "bg-muted/50" : ""}`}
                                        onClick={() => handleRowClick(run.id, run.workflow_id)}
                                    >
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{run.id}</TableCell>
                                        {!workflowId && (
                                            <TableCell className="text-xs font-bold text-foreground">{(run as any).workflow_name || `Agent #${run.workflow_id}`}</TableCell>
                                        )}
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md ${run.is_completed ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                                                {run.is_completed ? "Completed" : "In Progress"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatDateTime(run.created_at, organizationTimezone)}
                                        </TableCell>
                                        <TableCell>
                                            <CallTypeCell mode={run.mode} callType={run.call_type} />
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-foreground">
                                            {typeof run.cost_info?.call_duration_seconds === 'number'
                                                ? `${run.cost_info.call_duration_seconds.toFixed(1)}s`
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {run.gathered_context?.mapped_call_disposition ? (
                                                <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40 text-foreground">
                                                    {run.gathered_context.mapped_call_disposition as string}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/60">-</span>
                                            )}
                                        </TableCell>
                                        {dynamicColumns.map(col => (
                                            <TableCell key={col} className="text-xs text-foreground max-w-[150px] truncate" title={run.gathered_context?.[col] ? String(run.gathered_context[col]) : ""}>
                                                {run.gathered_context?.[col] ? String(run.gathered_context[col]) : <span className="text-muted-foreground/40">-</span>}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                            <div className="inline-flex items-center gap-1.5">
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
                                                    className="h-8 w-8 rounded-lg"
                                                    onClick={() => router.push(`/workflow/${run.workflow_id}/run/${run.id}`)}
                                                >
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
