"use client";

import { format } from 'date-fns';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CalendarIcon,
    Check,
    CheckCircle2,
    Clock,
    Download,
    Info,
    Layers,
    Pause,
    Pencil,
    Phone,
    Play,
    Radio,
    RefreshCw,
    Users,
    X,
    Zap,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { CampaignAnalytics } from '@/components/analytics/CampaignAnalytics';
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
    const fetchCampaign = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setIsLoadingCampaign(true);
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
            if (!silent) toast.error('Failed to load campaign details');
        } finally {
            if (!silent) setIsLoadingCampaign(false);
        }
    }, [user, getAccessToken, campaignId]);

    // Initial load
    useEffect(() => {
        fetchCampaign();
    }, [fetchCampaign]);

    // Live auto-polling every 3s when running or syncing
    useEffect(() => {
        if (!campaign || !['running', 'syncing'].includes(campaign.state)) return;
        const interval = setInterval(() => {
            fetchCampaign(true);
        }, 3000);
        return () => clearInterval(interval);
    }, [campaign?.state, fetchCampaign]);

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
                toast.success('Campaign / Event started');
            } else if (response.error) {
                // Extract error message from response
                let errorMsg = 'Failed to start campaign / event';
                if (typeof response.error === 'string') {
                    errorMsg = response.error;
                } else if (response.error && typeof response.error === 'object') {
                    errorMsg = (response.error as unknown as { detail?: string }).detail || JSON.stringify(response.error);
                }
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Failed to start campaign / event:', error);
            toast.error('Failed to start campaign / event');
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
                toast.success('Campaign / Event resumed');
            } else if (response.error) {
                // Extract error message from response
                let errorMsg = 'Failed to resume campaign / event';
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
                toast.success('Campaign / Event paused');
            }
        } catch (error) {
            console.error('Failed to pause campaign / event:', error);
            toast.error('Failed to pause campaign / event');
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

    const getLogIcon = (level: string, event?: string) => {
        if (event === 'lead_retry_scheduled') {
            return <RefreshCw className="h-4 w-4 text-amber-500 animate-spin-reverse" />;
        }
        if (event === 'lead_retries_exhausted') {
            return <AlertCircle className="h-4 w-4 text-destructive" />;
        }
        if (event?.includes('schedule')) {
            return <Clock className="h-4 w-4 text-purple-500" />;
        }
        if (event === 'campaign_completed') {
            return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        }
        if (event?.includes('started') || event?.includes('resumed')) {
            return <Play className="h-4 w-4 text-emerald-500" />;
        }
        switch (level) {
            case 'error':
                return <AlertCircle className="h-4 w-4 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getLogBadgeVariant = (level: string, event?: string): 'destructive' | 'secondary' | 'outline' => {
        if (event === 'lead_retries_exhausted') return 'destructive';
        if (event === 'lead_retry_scheduled') return 'outline';
        switch (level) {
            case 'error':
                return 'destructive';
            case 'warning':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getEventBadge = (event: string) => {
        switch (event) {
            case 'lead_retry_scheduled':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 uppercase">
                        RETRY SCHEDULED
                    </span>
                );
            case 'lead_retries_exhausted':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 uppercase">
                        RETRIES EXHAUSTED
                    </span>
                );
            case 'schedule_window_opened':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase">
                        SCHEDULE OPENED
                    </span>
                );
            case 'schedule_window_closed':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 uppercase">
                        OUTSIDE SCHEDULE
                    </span>
                );
            case 'campaign_completed':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase">
                        COMPLETED
                    </span>
                );
            case 'campaign_started':
            case 'campaign_resumed_manual':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 uppercase">
                        ACTIVE
                    </span>
                );
            case 'campaign_paused_manual':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 uppercase">
                        PAUSED
                    </span>
                );
            case 'circuit_breaker_tripped':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 uppercase">
                        CIRCUIT BREAKER
                    </span>
                );
            default:
                return null;
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
                Edit Campaign / Event
            </Button>
        ) : null;

        switch (campaign.state) {
            case 'created':
                return (
                    <div className="flex items-center gap-2">
                        {editButton}
                        <Button onClick={handleStart} disabled={isExecutingAction}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Campaign / Event
                        </Button>
                    </div>
                );
            case 'running':
                return (
                    <div className="flex items-center gap-2">
                        {editButton}
                        <Button onClick={handlePause} disabled={isExecutingAction}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Campaign / Event
                        </Button>
                    </div>
                );
            case 'paused':
                return (
                    <div className="flex items-center gap-2">
                        {editButton}
                        <Button onClick={handleResume} disabled={isExecutingAction}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resume Campaign / Event
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
                        Redial Campaign / Event
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
                    <p className="text-xs text-muted-foreground">Campaign / Event not found</p>
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
                            aria-label="Back to Campaigns / Events"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
                    </div>
                    <div className="flex items-center gap-3 pl-10 text-[10px] text-muted-foreground/60 font-semibold">
                        <Badge variant={getStateBadgeVariant(campaign.state)} className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                            {campaign.state}
                        </Badge>
                        {campaign.state === 'running' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                LIVE DISPATCHING
                            </span>
                        )}
                        {campaign.state === 'syncing' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                SYNCING CONTACTS
                            </span>
                        )}
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

            {/* Live Queue & Dispatch Monitor */}
            <div className="border border-border bg-card rounded-xl p-5 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/40">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-cta" />
                            <h2 className="text-sm font-bold text-foreground">Live Dispatch & Queue Monitor</h2>
                            {campaign.state === 'running' ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    LIVE AUTO-DISPATCH
                                </span>
                            ) : campaign.state === 'syncing' ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                    SYNCING AUDIENCE
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border/60">
                                    {campaign.state.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Real-time breakdown of unique leads, active telephony channels, and scheduled redial delays
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Clock className="h-3 w-3" />
                        <span>Live auto-sync every 3s</span>
                    </div>
                </div>

                {/* 4 KPI Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Active In-Flight */}
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Active In-Flight</span>
                            <Phone className={`h-4 w-4 ${(campaign.active_count ?? 0) > 0 ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground/50'}`} />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-foreground tabular-nums">
                                    {campaign.active_count ?? 0}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">
                                    / {campaign.max_concurrency ? `${campaign.max_concurrency} lines` : 'auto'}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {(campaign.active_count ?? 0) > 0 ? 'Dialing & connected now' : 'Idle channel capacity'}
                            </p>
                        </div>
                    </div>

                    {/* Ready to Dial */}
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Ready in Queue</span>
                            <Play className="h-4 w-4 text-sky-500" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-foreground tabular-nums">
                                    {campaign.pending_count ?? 0}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">queued</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Awaiting available telephony line
                            </p>
                        </div>
                    </div>

                    {/* Scheduled Retries */}
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Scheduled Retries</span>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                    {campaign.scheduled_retries_count ?? 0}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">in cool-down</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                In backoff before next retry attempt
                            </p>
                        </div>
                    </div>

                    {/* Total Call Dials Placed */}
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total Call Dials</span>
                            <RefreshCw className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-foreground tabular-nums">
                                    {campaign.total_queued_count ?? 0}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold">dials</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1 text-muted-foreground font-medium">
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{campaign.completed_calls_count ?? 0} connected</span>
                                <span>•</span>
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">{campaign.failed_calls_count ?? 0} failed</span>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">{campaign.unanswered_calls_count ?? 0} unanswered</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground/75 mt-1">
                                {campaign.retry_attempts_count ?? 0} redials • {Math.max(0, (campaign.total_queued_count ?? 0) - (campaign.retry_attempts_count ?? 0))} initial
                            </p>
                        </div>
                    </div>
                </div>

                {/* Multi-Segment Audience Progress Bar */}
                {(() => {
                    const totalAudience = campaign.total_rows && campaign.total_rows > 0 ? campaign.total_rows : 0;
                    const dispatchedRows = campaign.processed_rows ?? 0;
                    const failedRows = campaign.failed_rows ?? 0;
                    const completedRows = campaign.completed_calls_count !== undefined && campaign.completed_calls_count > 0
                        ? campaign.completed_calls_count
                        : Math.max(0, dispatchedRows - failedRows);
                    const resolvedRows = Math.min(totalAudience, Math.max(dispatchedRows, completedRows + failedRows));
                    const totalPercent = totalAudience > 0 ? Math.min(100, Math.round((resolvedRows / totalAudience) * 100)) : 0;
                    const completedPercent = totalAudience > 0 ? Math.min(100, (completedRows / totalAudience) * 100) : 0;
                    const failedPercent = totalAudience > 0 ? Math.min(100 - completedPercent, (failedRows / totalAudience) * 100) : 0;
                    const remainingRows = Math.max(0, totalAudience - resolvedRows);

                    return (
                        <div className="space-y-2.5 pt-3 border-t border-border/40">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">Unique Contacts / Leads Reached</span>
                                    <span className="text-muted-foreground font-normal">
                                        ({resolvedRows} of {totalAudience} unique contacts finished)
                                    </span>
                                </div>
                                <span className="font-bold tabular-nums text-foreground">
                                    {totalPercent}%
                                </span>
                            </div>

                            {/* Segmented Progress Bar */}
                            <div className="w-full h-3 rounded-full overflow-hidden bg-muted/60 flex border border-border/20">
                                {completedPercent > 0 && (
                                    <div
                                        className="bg-emerald-500 h-full transition-all duration-300"
                                        style={{ width: `${completedPercent}%` }}
                                        title={`Completed Leads: ${completedRows}`}
                                    />
                                )}
                                {failedPercent > 0 && (
                                    <div
                                        className="bg-rose-500 h-full transition-all duration-300"
                                        style={{ width: `${failedPercent}%` }}
                                        title={`Permanently Failed: ${failedRows}`}
                                    />
                                )}
                            </div>

                            {/* Progress Bar Legend */}
                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    <span className="font-semibold text-foreground">{completedRows}</span>
                                    <span>Completed Leads</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                    <span className="font-semibold text-foreground">{failedRows}</span>
                                    <span>Exhausted / Failed</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                                    <span className="font-semibold text-foreground">{remainingRows}</span>
                                    <span>Remaining Leads</span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-auto font-mono text-[10px]">
                                    <span className="text-muted-foreground">Original Audience:</span>
                                    <span className="font-bold text-foreground">{totalAudience} leads</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Content Split: Details & Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campaign Details */}
                <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-4">
                    <div>
                        <h2 className="text-sm font-bold text-foreground">Campaign / Event Details</h2>
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
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Contacts Progress</dt>
                            <dd className="mt-1 text-xs font-bold text-foreground">
                                {(() => {
                                    const totalAudience = campaign.total_rows && campaign.total_rows > 0 ? campaign.total_rows : 0;
                                    const dispatched = campaign.processed_rows ?? 0;
                                    const failed = campaign.failed_rows ?? 0;
                                    const completed = campaign.completed_calls_count !== undefined && campaign.completed_calls_count > 0
                                        ? campaign.completed_calls_count
                                        : Math.max(0, dispatched - failed);
                                    const resolved = Math.min(totalAudience, Math.max(dispatched, completed + failed));
                                    const pct = totalAudience > 0 ? Math.min(100, Math.round((resolved / totalAudience) * 100)) : 0;
                                    return `${resolved} / ${totalAudience} leads (${pct}%)`;
                                })()}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Total Call Dials</dt>
                            <dd className="mt-1 text-xs font-semibold text-foreground">
                                {campaign.total_queued_count ?? 0} dials ({campaign.retry_attempts_count ?? 0} retries)
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
                                        Campaign / Event #{campaign.parent_campaign_id}
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
                                        Campaign / Event #{campaign.redialed_campaign_id}
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
                        <h2 className="text-sm font-bold text-foreground">Campaign / Event Settings</h2>
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

            {/* Campaign Analytics */}
            <CampaignAnalytics campaignId={campaignId} campaign={campaign} />

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
                                    <div className="mt-0.5 shrink-0">{getLogIcon(entry.level, entry.event)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={getLogBadgeVariant(entry.level, entry.event)} className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                                {entry.level}
                                            </Badge>
                                            {getEventBadge(entry.event)}
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

            {/* Workflow Runs */}
            <div className="w-full">
                <CampaignRuns
                    campaignId={campaignId}
                    workflowId={campaign.workflow_id}
                    searchParams={searchParams}
                    campaignState={campaign.state}
                />
            </div>

            <Dialog open={isRedialDialogOpen} onOpenChange={setIsRedialDialogOpen}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">Redial Campaign / Event</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Creates a new campaign / event that re-dials unique subscribers whose
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
                                placeholder="Campaign / event name"
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
                            {isRedialing ? 'Creating...' : 'Create Redial Campaign / Event'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
