"use client";

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getCampaignsApiV1CampaignGet } from '@/client/sdk.gen';
import type { CampaignsResponse } from '@/client/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

    // Fetch campaigns once when user is ready
    useEffect(() => {
        if (loading || !user || hasFetched.current) {
            return;
        }
        hasFetched.current = true;

        const fetchCampaigns = async () => {
            setIsLoading(true);
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
                setIsLoading(false);
            }
        };

        fetchCampaigns();
    }, [loading, user, getAccessToken]);

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
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Campaigns</h1>
                    <p className="text-xs text-muted-foreground">Manage and track your bulk workflow execution campaigns</p>
                </div>
                <Button onClick={handleCreateCampaign} className="h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Campaign
                </Button>
            </div>

            {/* Content Loader */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
                    ))}
                </div>
            ) : campaignsData && campaignsData.campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaignsData.campaigns.map((campaign) => {
                        const totalQueued = campaign.total_queued_count ?? 0;
                        const executed = campaign.executed_count ?? 0;
                        const progressPercent = totalQueued > 0 
                            ? Math.min(100, Math.round((executed / totalQueued) * 100))
                            : 0;

                        return (
                            <div
                                key={campaign.id}
                                className="relative flex flex-col justify-between p-5 border border-border bg-card hover:bg-card/90 transition-all duration-200 group rounded-xl hover:shadow-sm cursor-pointer"
                                onClick={() => handleRowClick(campaign.id)}
                            >
                                <div className="space-y-3">
                                    {/* Top row: Name and Badge */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-0.5">
                                            <span className="font-bold tracking-tight text-foreground text-sm group-hover:text-cta transition-colors truncate block max-w-[160px]">
                                                {campaign.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-medium block">
                                                Workflow: {campaign.workflow_name}
                                            </span>
                                        </div>
                                        <Badge variant={getStateBadgeVariant(campaign.state)} className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md">
                                            {campaign.state}
                                        </Badge>
                                    </div>

                                    {/* Progress Area */}
                                    <div className="space-y-1.5 pt-2">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>Progress</span>
                                            <span className="font-semibold text-foreground">
                                                {executed} / {totalQueued} ({progressPercent}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden border border-border/10">
                                            <div 
                                                className="bg-cta h-full rounded-full transition-all duration-300"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Row */}
                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/60 text-[10px] text-muted-foreground">
                                    <div className="flex flex-col">
                                        <span>ID: {campaign.id}</span>
                                        <span>{formatDate(campaign.created_at, organizationTimezone)}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowClick(campaign.id);
                                        }}
                                        className="h-7 px-3 rounded-lg text-xs font-semibold"
                                    >
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex items-center justify-center w-full py-12">
                    <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm w-full border border-border bg-card rounded-xl shadow-xs">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
                            <Plus className="h-6 w-6" />
                        </div>
                        <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No campaigns found</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-6">Create your first bulk execution campaign to run workflows in parallel.</p>
                        <Button onClick={handleCreateCampaign} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer">
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Campaign
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
