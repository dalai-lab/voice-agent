"use client";

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getCampaignsApiV1CampaignGet } from '@/client/sdk.gen';
import type { CampaignsResponse } from '@/client/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/dateTime';

export default function CampaignsPage() {
    const { user, getAccessToken, redirectToLogin, loading } = useAuth();
    const organizationTimezone = useOrganizationTimezone();
    const router = useRouter();

    const [campaignsData, setCampaignsData] = useState<CampaignsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetched = useRef(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    const fetchCampaigns = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setIsLoading(true);
        try {
            const accessToken = await getAccessToken();
            const response = await getCampaignsApiV1CampaignGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setCampaignsData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [user, getAccessToken]);

    // Initial load
    useEffect(() => {
        if (loading || !user) return;
        fetchCampaigns();
    }, [loading, user, fetchCampaigns]);

    // Live auto-polling every 4 seconds if any campaign is active
    useEffect(() => {
        const hasActive = campaignsData?.campaigns.some(
            c => c.state === 'running' || c.state === 'syncing'
        );
        if (!hasActive) return;

        const interval = setInterval(() => {
            fetchCampaigns(true);
        }, 4000);
        return () => clearInterval(interval);
    }, [campaignsData, fetchCampaigns]);

    const handleRowClick = (campaignId: number) => {
        router.push(`/campaigns/${campaignId}`);
    };

    const handleCreateCampaign = () => {
        router.push('/campaigns/new');
    };

    const getStateBadgeVariant = (state: string) => {
        switch (state) {
            case 'created':
                return 'secondary';
            case 'running':
                return 'default';
            case 'paused':
                return 'outline';
            case 'completed':
                return 'secondary';
            case 'failed':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">Campaigns / Events</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage and track your bulk workflow execution campaigns / events</p>
                </div>
                <Button onClick={handleCreateCampaign} className="h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-xs font-semibold text-xs cursor-pointer">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Campaign / Event
                </Button>
            </div>

            {/* Content Loader */}
            {isLoading ? (
                <div className="border border-border bg-card rounded-xl overflow-hidden shadow-xs">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Workflow</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="min-w-[180px]">Progress</TableHead>
                                <TableHead className="w-[150px]">Created At</TableHead>
                                <TableHead className="w-[100px] text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-b border-border/50 hover:bg-transparent">
                                    <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell><div className="h-4 w-48 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                                            <div className="h-1.5 w-full bg-muted animate-pulse rounded" />
                                        </div>
                                    </TableCell>
                                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell><div className="h-7 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : campaignsData && campaignsData.campaigns.length > 0 ? (
                <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-border bg-muted/10 hover:bg-muted/10">
                                <TableHead className="font-semibold text-xs py-3 w-[80px]">ID</TableHead>
                                <TableHead className="font-semibold text-xs py-3">Name</TableHead>
                                <TableHead className="font-semibold text-xs py-3">Workflow</TableHead>
                                <TableHead className="font-semibold text-xs py-3 w-[120px]">Status</TableHead>
                                <TableHead className="font-semibold text-xs py-3 min-w-[200px]">Progress</TableHead>
                                <TableHead className="font-semibold text-xs py-3 w-[150px]">Created At</TableHead>
                                <TableHead className="w-[120px] text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaignsData.campaigns.map((campaign) => {
                                const totalContacts = campaign.total_rows ?? 0;
                                const dispatchedContacts = campaign.processed_rows ?? 0;
                                const failedContacts = campaign.failed_rows ?? 0;
                                const completedContacts = campaign.completed_calls_count !== undefined && campaign.completed_calls_count > 0
                                    ? campaign.completed_calls_count
                                    : Math.max(0, dispatchedContacts - failedContacts);
                                const resolvedContacts = Math.min(totalContacts, Math.max(dispatchedContacts, completedContacts + failedContacts));
                                const contactPercent = totalContacts > 0
                                    ? Math.min(100, Math.round((resolvedContacts / totalContacts) * 100))
                                    : (campaign.total_queued_count && campaign.total_queued_count > 0
                                        ? Math.min(100, Math.round(((campaign.executed_count ?? 0) / campaign.total_queued_count) * 100))
                                        : 0);

                                const totalDials = campaign.total_queued_count ?? 0;
                                const retriesCount = campaign.retry_attempts_count ?? 0;
                                const activeCount = campaign.active_count ?? 0;

                                return (
                                    <TableRow
                                        key={campaign.id}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
                                        onClick={() => handleRowClick(campaign.id)}
                                    >
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            #{campaign.id}
                                        </TableCell>
                                        <TableCell className="font-semibold text-foreground text-sm group-hover:text-cta transition-colors">
                                            {campaign.name}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {campaign.workflow_name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStateBadgeVariant(campaign.state)} className="text-[9px] uppercase tracking-wider py-0.5 px-1.5 font-bold rounded-md">
                                                {campaign.state}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5 max-w-[240px]">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-bold text-foreground tabular-nums">
                                                        {totalContacts > 0
                                                            ? `${resolvedContacts} / ${totalContacts} leads`
                                                            : `${campaign.executed_count ?? 0} / ${totalDials} dials`}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-semibold tabular-nums">
                                                        {contactPercent}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden border border-border/10">
                                                    <div
                                                        className="bg-cta h-full rounded-full transition-all duration-300"
                                                        style={{ width: `${contactPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[9px] text-muted-foreground/80">
                                                    <span>
                                                        {totalDials} dials{retriesCount > 0 ? ` (${retriesCount} retries)` : ''}
                                                        {campaign.failed_rows > 0 ? ` • ${campaign.failed_rows} failed` : ''}
                                                    </span>
                                                    {activeCount > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            {activeCount} active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDate(campaign.created_at, organizationTimezone)}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRowClick(campaign.id)}
                                                className="h-7 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="flex items-center justify-center w-full py-12">
                    <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm w-full border border-border bg-card rounded-xl shadow-xs">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
                            <Plus className="h-6 w-6" />
                        </div>
                        <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No campaigns / events found</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-6">Create your first bulk execution campaign or event to run workflows in parallel.</p>
                        <Button onClick={handleCreateCampaign} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer">
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Campaign / Event
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
