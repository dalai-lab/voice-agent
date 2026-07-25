"use client";

import { format } from 'date-fns';
import { AlertCircle, AlertTriangle, ArrowLeft, CalendarIcon, Check, Clock, Download, Info, Pause, Pencil, Phone, Play, RefreshCw, X } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    downloadCampaignReportApiV1CampaignCampaignIdReportGet,
    getCampaignApiV1CampaignCampaignIdGet,
    getCampaignSourceDownloadUrlApiV1CampaignCampaignIdSourceDownloadUrlGet,
    pauseCampaignApiV1CampaignCampaignIdPausePost,
    redialCampaignApiV1CampaignCampaignIdRedialPost,
    resumeCampaignApiV1CampaignCampaignIdResumePost,
    startCampaignApiV1CampaignCampaignIdStartPost,
} from '@/client/sdk.gen';
import type { CampaignResponse } from '@/client/types.gen';
import { CampaignCallbacks } from '@/components/campaign-callbacks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignRuns } from '@/components/workflow-runs';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { useAuth } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/dateTime';

export default function CampaignDetailPage() {
    const { user, getAccessToken, redirectToLogin, loading } = useAuth();
    const organizationTimezone = useOrganizationTimezone();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const campaignId = parseInt(params.campaignId as string);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    // Campaign state
    const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
    const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);

    // Action state
    const [isExecutingAction, setIsExecutingAction] = useState(false);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);

    // Report date range state
    const [reportStartDate, setReportStartDate] = useState<Date | undefined>(undefined);
    const [reportStartTime, setReportStartTime] = useState('00:00');
    const [reportEndDate, setReportEndDate] = useState<Date | undefined>(undefined);
    const [reportEndTime, setReportEndTime] = useState('23:59');
    const [isReportPopoverOpen, setIsReportPopoverOpen] = useState(false);

    // Redial dialog state
    const [isRedialDialogOpen, setIsRedialDialogOpen] = useState(false);
    const [redialName, setRedialName] = useState('');
    const [redialOnVoicemail, setRedialOnVoicemail] = useState(true);
    const [redialOnNoAnswer, setRedialOnNoAnswer] = useState(true);
    const [redialOnBusy, setRedialOnBusy] = useState(true);
    const [isRedialing, setIsRedialing] = useState(false);

    // Fetch campaign details
    const fetchCampaign = useCallback(async () => {
        if (!user) return;
        setIsLoadingCampaign(true);
        try {
            const accessToken = await getAccessToken();
            const response = await getCampaignApiV1CampaignCampaignIdGet({
                path: {
                    campaign_id: campaignId,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setCampaign(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch campaign:', error);
            toast.error('Failed to load campaign details');
        } finally {
            setIsLoadingCampaign(false);
        }
    }, [user, getAccessToken, campaignId]);

    // Initial load
    useEffect(() => {
        fetchCampaign();
    }, [fetchCampaign]);

    // Handle back navigation
    const handleBack = () => {
        router.push('/campaigns');
    };

    // Handle workflow link click
    const handleWorkflowClick = () => {
        if (campaign) {
            router.push(`/workflow/${campaign.workflow_id}`);
        }
    };

    // Handle CSV download
    const handleDownloadCsv = async () => {
        if (!user || !campaign || campaign.source_type !== 'csv') return;

        try {
            const accessToken = await getAccessToken();
            const response = await getCampaignSourceDownloadUrlApiV1CampaignCampaignIdSourceDownloadUrlGet({
                path: {
                    campaign_id: campaignId,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data?.download_url) {
                // Open download URL in new tab
                window.open(response.data.download_url, '_blank');
            } else {
                toast.error('Failed to get download URL');
            }
        } catch (error) {
            console.error('Failed to download CSV:', error);
            toast.error('Failed to download CSV file');
        }
    };

    // Build ISO datetime string from date + time
    const buildDateTime = (date: Date | undefined, time: string): string | undefined => {
        if (!date) return undefined;
        const [hours, minutes] = time.split(':').map(Number);
        const combined = new Date(date);
        combined.setHours(hours, minutes, 0, 0);
        return combined.toISOString();
    };

    // Handle download report
    const handleDownloadReport = async () => {
        if (!user) return;
        setIsDownloadingReport(true);
        setIsReportPopoverOpen(false);
        try {
            const accessToken = await getAccessToken();
            const startDate = buildDateTime(reportStartDate, reportStartTime);
            const endDate = buildDateTime(reportEndDate, reportEndTime);

            const response = await downloadCampaignReportApiV1CampaignCampaignIdReportGet({
                path: {
                    campaign_id: campaignId,
                },
                query: {
                    start_date: startDate,
                    end_date: endDate,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                parseAs: 'blob',
            });

            if (response.data) {
                const blob = response.data as Blob;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `campaign_${campaignId}_report.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } else {
                toast.error('Failed to download report');
            }
        } catch (error) {
            console.error('Failed to download report:', error);
            toast.error('Failed to download report');
        } finally {
            setIsDownloadingReport(false);
        }
    };

    const handleClearDateRange = () => {
        setReportStartDate(undefined);
        setReportStartTime('00:00');
        setReportEndDate(undefined);
        setReportEndTime('23:59');
    };

    // Handle start campaign
    const handleStart = async () => {
        if (!user) return;
        setIsExecutingAction(true);
        try {
            const accessToken = await getAccessToken();
            const response = await startCampaignApiV1CampaignCampaignIdStartPost({
                path: {
                    campaign_id: campaignId,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setCampaign(response.data);
                toast.success('Campaign started');
            } else if (response.error) {
                // Extract error message from response
                let errorMsg = 'Failed to start campaign';
                if (typeof response.error === 'string') {
                    errorMsg = response.error;
                } else if (response.error && typeof response.error === 'object') {
                    errorMsg = (response.error as unknown as { detail?: string }).detail || JSON.stringify(response.error);
                }
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Failed to start campaign:', error);
            toast.error('Failed to start campaign');
        } finally {
            setIsExecutingAction(false);
        }
    };

    // Handle resume campaign
    const handleResume = async () => {
        if (!user) return;
        setIsExecutingAction(true);
        try {
            const accessToken = await getAccessToken();
            const response = await resumeCampaignApiV1CampaignCampaignIdResumePost({
                path: {
                    campaign_id: campaignId,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setCampaign(response.data);
                toast.success('Campaign resumed');
            } else if (response.error) {
                // Extract error message from response
                let errorMsg = 'Failed to resume campaign';
                if (typeof response.error === 'string') {
                    errorMsg = response.error;
                } else if (response.error && typeof response.error === 'object') {
                    errorMsg = (response.error as unknown as { detail?: string }).detail || JSON.stringify(response.error);
                }
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Failed to resume campaign:', error);
            toast.error('Failed to resume campaign');
        } finally {
            setIsExecutingAction(false);
        }
    };

    // Open redial dialog with default name
    const openRedialDialog = () => {
        if (!campaign) return;
        setRedialName(`${campaign.name} (Redial)`);
        setRedialOnVoicemail(true);
        setRedialOnNoAnswer(true);
        setRedialOnBusy(true);
        setIsRedialDialogOpen(true);
    };

    // Handle redial campaign
    const handleRedial = async () => {
        if (!user || !campaign) return;
        if (!redialOnVoicemail && !redialOnNoAnswer && !redialOnBusy) {
            toast.error('Select at least one reason to redial');
            return;
        }
        setIsRedialing(true);
        try {
            const accessToken = await getAccessToken();
            const response = await redialCampaignApiV1CampaignCampaignIdRedialPost({
                path: {
                    campaign_id: campaignId,
                },
                body: {
                    name: redialName || null,
                    retry_on_voicemail: redialOnVoicemail,
                    retry_on_no_answer: redialOnNoAnswer,
                    retry_on_busy: redialOnBusy,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                toast.success('Redial campaign created');
                setIsRedialDialogOpen(false);
                router.push(`/campaigns/${response.data.id}`);
            } else if (response.error) {
                let errorMsg = 'Failed to create redial campaign';
                if (typeof response.error === 'string') {
                    errorMsg = response.error;
                } else if (response.error && typeof response.error === 'object') {
                    errorMsg = (response.error as unknown as { detail?: string }).detail || JSON.stringify(response.error);
                }
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Failed to redial campaign:', error);
            toast.error('Failed to create redial campaign');
        } finally {
            setIsRedialing(false);
        }
    };

    // Handle pause campaign
    const handlePause = async () => {
        if (!user) return;
        setIsExecutingAction(true);
        try {
            const accessToken = await getAccessToken();
            const response = await pauseCampaignApiV1CampaignCampaignIdPausePost({
                path: {
                    campaign_id: campaignId,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            if (response.data) {
                setCampaign(response.data);
                toast.success('Campaign paused');
            }
        } catch (error) {
            console.error('Failed to pause campaign:', error);
            toast.error('Failed to pause campaign');
        } finally {
            setIsExecutingAction(false);
        }
    };

    // Get badge variant for state
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

    const canEdit = campaign && ['created', 'running', 'paused'].includes(campaign.state);

    // Newest entries first. The backend appends chronologically; the UI is more
    // useful when the most recent failure / pause is at the top.
    const sortedLogs = (campaign?.logs ?? []).slice().reverse();

    const getLogIcon = (level: string) => {
        switch (level) {
            case 'error':
                return <AlertCircle className="h-4 w-4 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getLogBadgeVariant = (level: string): 'destructive' | 'secondary' | 'outline' => {
        switch (level) {
            case 'error':
                return 'destructive';
            case 'warning':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const formatLogTimestamp = (ts: string) => {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        return formatDateTime(d, organizationTimezone);
    };

    // Render action button based on state
    const renderActionButton = () => {
        if (!campaign || isExecutingAction) return null;

        const editButton = canEdit ? (
            <Button variant="outline" onClick={() => router.push(`/campaigns/${campaignId}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Campaign
            </Button>
        ) : null;

        switch (campaign.state) {
            case 'created':
                return (
                    <div className="flex items-center gap-2">
                        {editButton}
                        <Button onClick={handleStart} disabled={isExecutingAction}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Campaign
                        </Button>
                    </div>
                );
            case 'running':
                return (
                    <div className="flex items-center gap-2">
                        {editButton}
                        <Button onClick={handlePause} disabled={isExecutingAction}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Campaign
                        </Button>
                    </div>
                );
            case 'paused':
                return (
                    <div className="flex items-center gap-2">
                        {editButton}
                        <Button onClick={handleResume} disabled={isExecutingAction}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resume Campaign
                        </Button>
                    </div>
                );
            case 'completed':
                if (campaign.redialed_campaign_id) {
                    return null;
                }
                return (
                    <Button onClick={openRedialDialog}>
                        <Phone className="h-4 w-4 mr-2" />
                        Redial Campaign
                    </Button>
                );
            default:
                return null;
        }
    };

    if (isLoadingCampaign) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background">
                <div className="space-y-4 animate-pulse">
                    <div className="h-8 bg-muted rounded-md w-1/4"></div>
                    <div className="h-64 bg-muted/40 rounded-xl border border-border/40"></div>
                </div>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background">
                <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm mx-auto border border-border bg-card rounded-xl shadow-xs">
                    <p className="text-xs text-muted-foreground">Campaign not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background text-foreground">
            {/* Header / Actions section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            className="h-8 w-8 rounded-lg p-0"
                            aria-label="Back to Campaigns"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
                    </div>
                    <div className="flex items-center gap-3 pl-10 text-[10px] text-muted-foreground/60 font-semibold">
                        <Badge variant={getStateBadgeVariant(campaign.state)} className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                            {campaign.state}
                        </Badge>
                        <span>•</span>
                        <span>Created {formatDate(campaign.created_at, organizationTimezone)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={isReportPopoverOpen} onOpenChange={setIsReportPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer" disabled={isDownloadingReport}>
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                Download Report
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4 rounded-xl border border-border shadow-lg" align="end">
                            <div className="space-y-4">
                                <div className="text-xs font-bold text-foreground">Filter by date range</div>
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase">From</Label>
                                        <div className="flex gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="w-[140px] h-8 rounded-lg justify-start text-left font-normal text-xs">
                                                        <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground" />
                                                        {reportStartDate ? format(reportStartDate, 'MMM dd, yyyy') : 'Start date'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 rounded-xl border border-border shadow-lg" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={reportStartDate}
                                                        onSelect={setReportStartDate}
                                                        disabled={(date) => reportEndDate ? date > reportEndDate : false}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Input
                                                type="time"
                                                value={reportStartTime}
                                                onChange={(e) => setReportStartTime(e.target.value)}
                                                className="w-[100px] h-8 rounded-lg text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase">To</Label>
                                        <div className="flex gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="w-[140px] h-8 rounded-lg justify-start text-left font-normal text-xs">
                                                        <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground" />
                                                        {reportEndDate ? format(reportEndDate, 'MMM dd, yyyy') : 'End date'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 rounded-xl border border-border shadow-lg" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={reportEndDate}
                                                        onSelect={setReportEndDate}
                                                        disabled={(date) => reportStartDate ? date < reportStartDate : false}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <Input
                                                type="time"
                                                value={reportEndTime}
                                                onChange={(e) => setReportEndTime(e.target.value)}
                                                className="w-[100px] h-8 rounded-lg text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <Button variant="ghost" size="sm" onClick={handleClearDateRange} className="h-8 text-xs">
                                        Clear
                                    </Button>
                                    <Button size="sm" onClick={handleDownloadReport} disabled={isDownloadingReport} className="h-8 rounded-lg text-xs">
                                        <Download className="h-3 w-3 mr-1" />
                                        {reportStartDate || reportEndDate ? 'Download Filtered' : 'Download All'}
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {renderActionButton()}
                </div>
            </div>

            {/* Content Split: Details & Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campaign Details */}
                <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Campaign Details</h2>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Configuration and source information</p>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Workflow</dt>
                            <dd className="mt-1 text-xs font-semibold">
                                <button
                                    onClick={handleWorkflowClick}
                                    className="text-cta hover:underline font-bold text-left"
                                >
                                    {campaign.workflow_name}
                                </button>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Source Type</dt>
                            <dd className="mt-1 text-xs font-semibold capitalize">{campaign.source_type.replace('-', ' ')}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                {campaign.source_type === 'csv' ? 'Source File' : 'Source Sheet'}
                            </dt>
                            <dd className="mt-1 text-xs font-semibold">
                                {campaign.source_type === 'csv' ? (
                                    <button
                                        onClick={handleDownloadCsv}
                                        className="text-cta hover:underline text-xs font-bold break-all text-left"
                                    >
                                        {campaign.source_id.split('/').pop()}
                                    </button>
                                ) : (
                                    <a
                                        href={campaign.source_id}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cta hover:underline text-xs font-bold break-all"
                                    >
                                        {campaign.source_id}
                                    </a>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Telephony Configuration</dt>
                            <dd className="mt-1 text-xs font-semibold">
                                {campaign.telephony_configuration_id ? (
                                    <button
                                        onClick={() => router.push(`/telephony-configurations/${campaign.telephony_configuration_id}`)}
                                        className="text-cta hover:underline font-bold text-left"
                                    >
                                        {campaign.telephony_configuration_name || `Configuration #${campaign.telephony_configuration_id}`}
                                    </button>
                                ) : (
                                    <span className="text-muted-foreground/60">Not assigned</span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">State</dt>
                            <dd className="mt-1 text-xs font-semibold capitalize">{campaign.state}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Progress</dt>
                            <dd className="mt-1 text-xs font-bold text-foreground">
                                {campaign.executed_count} / {campaign.total_queued_count}
                            </dd>
                        </div>
                        {campaign.parent_campaign_id && (
                            <div>
                                <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Redial Of</dt>
                                <dd className="mt-1 text-xs font-semibold">
                                    <button
                                        onClick={() => router.push(`/campaigns/${campaign.parent_campaign_id}`)}
                                        className="text-cta hover:underline font-bold text-left"
                                    >
                                        Campaign #{campaign.parent_campaign_id}
                                    </button>
                                </dd>
                            </div>
                        )}
                        {campaign.redialed_campaign_id && (
                            <div>
                                <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Redialed As</dt>
                                <dd className="mt-1 text-xs font-semibold">
                                    <button
                                        onClick={() => router.push(`/campaigns/${campaign.redialed_campaign_id}`)}
                                        className="text-cta hover:underline font-bold text-left"
                                    >
                                        Campaign #{campaign.redialed_campaign_id}
                                    </button>
                                </dd>
                            </div>
                        )}
                        {campaign.started_at && (
                            <div>
                                <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Started At</dt>
                                <dd className="mt-1 text-xs font-semibold">
                                    {formatDateTime(campaign.started_at, organizationTimezone)}
                                </dd>
                            </div>
                        )}
                        {campaign.completed_at && (
                            <div>
                                <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Completed At</dt>
                                <dd className="mt-1 text-xs font-semibold">
                                    {formatDateTime(campaign.completed_at, organizationTimezone)}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Campaign Settings */}
                <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Campaign Settings</h2>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Concurrency and retry configuration</p>
                    </div>
                    <div className="space-y-4 pt-2 border-t border-border/40">
                        {/* Concurrency Setting */}
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Max Concurrent Calls</dt>
                            <dd className="mt-1 text-xs font-semibold text-foreground">
                                {campaign.max_concurrency ? (
                                    <span>{campaign.max_concurrency}</span>
                                ) : (
                                    <span className="text-muted-foreground/60">Using organization default</span>
                                )}
                            </dd>
                        </div>

                        {/* Retry Configuration */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Retries Enabled</span>
                                {campaign.retry_config.enabled ? (
                                    <Badge variant="default" className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5">
                                        <Check className="h-2.5 w-2.5" />
                                        Enabled
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5">
                                        <X className="h-2.5 w-2.5" />
                                        Disabled
                                    </Badge>
                                )}
                            </div>

                            {campaign.retry_config.enabled && (
                                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 border border-border/50 rounded-xl mt-1.5">
                                    <div>
                                        <dt className="text-[9px] font-bold text-muted-foreground/50 uppercase">Max Retries</dt>
                                        <dd className="mt-0.5 text-xs font-bold text-foreground">{campaign.retry_config.max_retries}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[9px] font-bold text-muted-foreground/50 uppercase">Delay</dt>
                                        <dd className="mt-0.5 text-xs font-bold text-foreground">{campaign.retry_config.retry_delay_seconds}s</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[9px] font-bold text-muted-foreground/50 uppercase">Retry On</dt>
                                        <dd className="mt-0.5 flex flex-wrap gap-1">
                                            {campaign.retry_config.retry_on_busy && (
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold uppercase">Busy</Badge>
                                            )}
                                            {campaign.retry_config.retry_on_no_answer && (
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold uppercase">No Answer</Badge>
                                            )}
                                            {campaign.retry_config.retry_on_voicemail && (
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold uppercase">Voicemail</Badge>
                                            )}
                                        </dd>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Call Schedule */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Call Schedule</span>
                                <div className="flex items-center gap-2">
                                    {campaign.schedule_config?.enabled ? (
                                        <Badge variant="default" className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5">
                                            <Clock className="h-2.5 w-2.5" />
                                            Enabled
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5">
                                            <X className="h-2.5 w-2.5" />
                                            Not configured
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {campaign.schedule_config?.enabled && (
                                <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-2 mt-1.5">
                                    <div>
                                        <dt className="text-[9px] font-bold text-muted-foreground/50 uppercase">Timezone</dt>
                                        <dd className="mt-0.5 text-xs font-semibold text-foreground">{campaign.schedule_config.timezone.replace(/_/g, ' ')}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[9px] font-bold text-muted-foreground/50 uppercase">Time Slots</dt>
                                        <dd className="mt-1 flex flex-wrap gap-1.5">
                                            {campaign.schedule_config.slots.map((slot, index) => {
                                                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                                return (
                                                    <div key={index} className="flex items-center gap-1 text-xs">
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold uppercase">{dayNames[slot.day_of_week]}</Badge>
                                                        <span className="font-semibold">{slot.start_time} - {slot.end_time}</span>
                                                    </div>
                                                );
                                            })}
                                        </dd>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Log */}
            <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                <div>
                    <h2 className="text-sm font-bold text-foreground">Activity Log</h2>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Recent state transitions and failures. Newest first.</p>
                </div>
                <div className="pt-2 border-t border-border/40">
                    {sortedLogs.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 font-semibold py-4 text-center">No events recorded yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {sortedLogs.map((entry, idx) => (
                                <li
                                    key={`${entry.ts}-${idx}`}
                                    className="flex gap-3 border-b border-border/40 last:border-b-0 pb-3 last:pb-0"
                                >
                                    <div className="mt-0.5 shrink-0">{getLogIcon(entry.level)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={getLogBadgeVariant(entry.level)} className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                                {entry.level}
                                            </Badge>
                                            <code className="text-xs font-semibold text-muted-foreground font-mono">
                                                {entry.event}
                                            </code>
                                            <span className="text-[10px] text-muted-foreground/60 font-bold">
                                                {formatLogTimestamp(entry.ts)}
                                            </span>
                                        </div>
                                        <p className="text-xs mt-1 text-foreground font-medium leading-relaxed break-words">{entry.message}</p>
                                        {entry.details && Object.keys(entry.details).length > 0 && (
                                            <details className="mt-1.5">
                                                <summary className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider cursor-pointer hover:text-foreground">
                                                    Details
                                                </summary>
                                                <pre className="mt-1.5 text-xs bg-muted/65 border border-border/50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                                                    {JSON.stringify(entry.details, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Workflow Runs and Callbacks */}
            <Tabs defaultValue="runs" className="w-full">
                <TabsList className="mb-4 bg-muted/40 border border-border rounded-lg p-0.5">
                    <TabsTrigger value="runs" className="text-xs font-semibold rounded-md px-3 py-1.5">Runs</TabsTrigger>
                    <TabsTrigger value="callbacks" className="text-xs font-semibold rounded-md px-3 py-1.5">Callbacks</TabsTrigger>
                </TabsList>

                <TabsContent value="runs">
                    <CampaignRuns
                        campaignId={campaignId}
                        workflowId={campaign.workflow_id}
                        searchParams={searchParams}
                    />
                </TabsContent>

                <TabsContent value="callbacks">
                    <CampaignCallbacks campaignId={campaignId} />
                </TabsContent>
            </Tabs>

            <Dialog open={isRedialDialogOpen} onOpenChange={setIsRedialDialogOpen}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">Redial Campaign</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Creates a new campaign that re-dials unique subscribers whose
                            last call ended with one of the selected outcomes. Subscribers
                            who were successfully reached on a retry are skipped.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="redial-name" className="text-xs font-bold text-foreground">Name</Label>
                            <Input
                                id="redial-name"
                                value={redialName}
                                onChange={(e) => setRedialName(e.target.value)}
                                placeholder="Campaign name"
                                className="h-9 rounded-lg border-border bg-background text-xs"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-foreground">Redial when last call was</Label>
                            <div className="space-y-2 bg-muted/30 border border-border/50 rounded-xl p-4">
                                <div className="flex items-center gap-2.5">
                                    <Checkbox
                                        id="redial-voicemail"
                                        checked={redialOnVoicemail}
                                        onCheckedChange={(v) => setRedialOnVoicemail(v === true)}
                                    />
                                    <Label htmlFor="redial-voicemail" className="text-xs font-semibold text-foreground cursor-pointer">
                                        Voicemail
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
                                    <Checkbox
                                        id="redial-no-answer"
                                        checked={redialOnNoAnswer}
                                        onCheckedChange={(v) => setRedialOnNoAnswer(v === true)}
                                    />
                                    <Label htmlFor="redial-no-answer" className="text-xs font-semibold text-foreground cursor-pointer">
                                        No Answer
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
                                    <Checkbox
                                        id="redial-busy"
                                        checked={redialOnBusy}
                                        onCheckedChange={(v) => setRedialOnBusy(v === true)}
                                    />
                                    <Label htmlFor="redial-busy" className="text-xs font-semibold text-foreground cursor-pointer">
                                        Busy
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsRedialDialogOpen(false)}
                            disabled={isRedialing}
                            className="h-9 px-4 rounded-lg text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleRedial} disabled={isRedialing} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                            {isRedialing ? 'Creating...' : 'Create Redial Campaign'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
