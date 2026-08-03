"use client";

import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { Phone, Clock, Bot, ArrowRight, Megaphone, Calendar, PhoneForwarded, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";

import {
    getCampaignsApiV1CampaignGet,
    getCurrentPeriodUsageApiV1OrganizationsUsageCurrentPeriodGet,
    getDailyUsageBreakdownApiV1OrganizationsUsageDailyBreakdownGet,
    getUsageHistoryApiV1OrganizationsUsageRunsGet,
    getWorkflowsSummaryApiV1WorkflowSummaryGet,
    listCallbacksApiV1CallbacksGet,
} from "@/client/sdk.gen";
import { useUserConfig } from "@/context/UserConfigContext";
import { useAuth } from "@/lib/auth";
import { formatDispositionLabel, getDispositionBadge, formatContactOrigin } from "@/lib/dispositionLabels";

const CHART_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#64748b', // slate
];

export function OverviewAnalytics() {
    const { isAuthenticated } = useAuth();
    const { organizationPricing } = useUserConfig();

    const [kpiData, setKpiData] = useState<{
        duration: number;
        calls: number;
        avgDuration: number;
        activeAgents: number;
        transferRate: number;
        resolutionRate: number;
        talkTimeFormatted: string;
    } | null>(null);

    const [dailyData, setDailyData] = useState<any[]>([]);
    const [dispositionData, setDispositionData] = useState<any[]>([]);
    const [recentRuns, setRecentRuns] = useState<any[]>([]);
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [pendingCallbacks, setPendingCallbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;

        async function fetchAnalytics() {
            try {
                setLoading(true);

                // 1. Fetch Workflow Summary for active agents count
                let activeAgentsCount = 0;
                try {
                    const summaryRes = await getWorkflowsSummaryApiV1WorkflowSummaryGet();
                    if (summaryRes.data) {
                        activeAgentsCount = (summaryRes.data as any).active_count ?? (summaryRes.data as any).total_count ?? 0;
                    }
                } catch (e) {
                    console.error("Failed to fetch workflow summary:", e);
                }

                // 2. Fetch Active Campaigns
                try {
                    const campaignRes = await getCampaignsApiV1CampaignGet();
                    if (campaignRes.data) {
                        const campaigns = (campaignRes.data as any).campaigns || campaignRes.data || [];
                        setActiveCampaigns(campaigns.slice(0, 3));
                    }
                } catch (e) {
                    console.error("Failed to fetch campaigns:", e);
                }

                // 3. Fetch Scheduled Callbacks
                try {
                    const callbackRes = await listCallbacksApiV1CallbacksGet();
                    if (callbackRes.data) {
                        const callbacks = (callbackRes.data as any).items || callbackRes.data || [];
                        setPendingCallbacks(callbacks.filter((c: any) => c.status === "scheduled" || c.status === "pending"));
                    }
                } catch (e) {
                    console.error("Failed to fetch callbacks:", e);
                }

                // 4. Fetch Period Usage & Daily Breakdown
                const periodRes = await getCurrentPeriodUsageApiV1OrganizationsUsageCurrentPeriodGet();
                const period = periodRes.data;

                let totalCallsFromDaily = 0;
                try {
                    const dailyRes = await getDailyUsageBreakdownApiV1OrganizationsUsageDailyBreakdownGet({
                        query: { days: 14 }
                    });
                    if (dailyRes.data?.breakdown) {
                        const formattedDaily = dailyRes.data.breakdown.map(day => {
                            totalCallsFromDaily += day.call_count || 0;
                            return {
                                date: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                Calls: day.call_count,
                                Minutes: Math.round(day.minutes * 10) / 10
                            };
                        }).reverse();
                        setDailyData(formattedDaily);
                    }
                } catch (e) {
                    console.error("Failed to fetch daily breakdown:", e);
                }

                // 5. Fetch Usage History for Dispositions, Transfer Rate, Resolution & Recent Runs
                const usageRes = await getUsageHistoryApiV1OrganizationsUsageRunsGet({
                    query: { limit: 50 }
                });

                if (usageRes.data) {
                    const runs = usageRes.data.runs || [];
                    const totalCount = usageRes.data.total_count || runs.length;
                    setRecentRuns(runs.slice(0, 5));

                    // Fallback: If daily usage endpoint was empty or errored, aggregate daily trend from runs
                    if (dailyData.length === 0 && runs.length > 0) {
                        const dailyMap: Record<string, { calls: number; minutes: number }> = {};
                        runs.forEach(r => {
                            if (r.created_at) {
                                const dStr = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                if (!dailyMap[dStr]) dailyMap[dStr] = { calls: 0, minutes: 0 };
                                dailyMap[dStr].calls += 1;
                                dailyMap[dStr].minutes += (r.call_duration_seconds || 0) / 60;
                            }
                        });
                        const fallbackDaily = Object.entries(dailyMap).map(([date, stats]) => ({
                            date,
                            Calls: stats.calls,
                            Minutes: Math.round(stats.minutes * 10) / 10
                        }));
                        setDailyData(fallbackDaily);
                    }

                    let runsDuration = 0;
                    let xferCount = 0;
                    let productiveCount = 0;

                    const str = (val: any) => (val ? String(val).toLowerCase() : "");

                    runs.forEach(r => {
                        runsDuration += r.call_duration_seconds || 0;
                        const disp = str((r.gathered_context as any)?.mapped_call_disposition || (r as any).disposition || "");

                        if (disp === "xfer" || disp === "transfer_call" || disp === "call_transferred") {
                            xferCount++;
                        }

                        if (["transfer_call", "xfer", "call_transferred", "end_call_tool", "user_qualified", "completed", "answered"].includes(disp)) {
                            productiveCount++;
                        }
                    });

                    const duration = (period?.used_dograh_tokens || period?.total_duration_seconds || 0) || runsDuration;
                    const calls = Math.max(totalCallsFromDaily, totalCount);
                    const transferRate = calls > 0 ? (xferCount / Math.min(runs.length, calls)) * 100 : 0;
                    const resolutionRate = runs.length > 0 ? (productiveCount / runs.length) * 100 : 0;

                    let talkTimeFormatted = "0m";
                    if (duration >= 3600) {
                        talkTimeFormatted = `${(duration / 3600).toFixed(1)}h`;
                    } else {
                        talkTimeFormatted = `${Math.floor(duration / 60)}m`;
                    }

                    setKpiData({
                        duration,
                        calls,
                        avgDuration: duration > 0 && calls > 0 ? duration / calls : 0,
                        activeAgents: activeAgentsCount,
                        transferRate: Math.round(transferRate * 10) / 10,
                        resolutionRate: Math.round(resolutionRate * 10) / 10,
                        talkTimeFormatted,
                    });

                    const dispMap: Record<string, number> = {};
                    runs.forEach(run => {
                        const rawDisp = (run.gathered_context as any)?.mapped_call_disposition || "completed";
                        const formattedLabel = formatDispositionLabel(rawDisp);
                        dispMap[formattedLabel] = (dispMap[formattedLabel] || 0) + 1;
                    });

                    const formattedDisp = Object.entries(dispMap)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 5);

                    setDispositionData(formattedDisp);
                }

            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, [isAuthenticated, organizationPricing]);

    if (loading) {
        return (
            <div className="h-44 flex items-center justify-center rounded-lg border border-border/40 bg-card/30 text-muted-foreground text-xs font-medium">
                <Clock className="w-4 h-4 mr-2 animate-spin text-muted-foreground" />
                Loading operational metrics...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Minimal KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-lg border border-border/50 bg-card flex items-center justify-between shadow-2xs">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Total Calls</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{kpiData?.calls || 0}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                        <Phone className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-4 rounded-lg border border-border/50 bg-card flex items-center justify-between shadow-2xs">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Total Talk Time</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{kpiData?.talkTimeFormatted || "0m"}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Clock className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-4 rounded-lg border border-border/50 bg-card flex items-center justify-between shadow-2xs">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Resolution Rate</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{kpiData?.resolutionRate || 0}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-4 rounded-lg border border-border/50 bg-card flex items-center justify-between shadow-2xs">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Transfer Rate</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{kpiData?.transferRate || 0}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <PhoneForwarded className="w-4 h-4" />
                    </div>
                </div>

                <div className="p-4 rounded-lg border border-border/50 bg-card flex items-center justify-between shadow-2xs sm:col-span-2 lg:col-span-1">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Active Agents</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{kpiData?.activeAgents || 0}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Bot className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Charts Section - Clean & Minimalist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 14-Day Call Activity Trend Chart */}
                <div className="p-5 rounded-lg border border-border/50 bg-card shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-border/30 pb-3">
                        <h3 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            Call Volume Trend (Last 14 Days)
                        </h3>
                    </div>
                    <div className="h-52 flex items-center justify-center">
                        {dailyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="callTrendGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--border)" opacity={0.4} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--popover)',
                                            borderColor: 'var(--border)',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            color: 'var(--popover-foreground)',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="Calls" stroke="var(--primary)" strokeWidth={1.5} fillOpacity={1} fill="url(#callTrendGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center space-y-1">
                                <Clock className="w-4 h-4 mx-auto text-muted-foreground/50" />
                                <p className="text-xs font-medium text-foreground">No call trend data available</p>
                                <p className="text-[11px] text-muted-foreground">Daily activity trends will appear as calls occur.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Outcomes Breakdown Chart */}
                {dispositionData.length > 0 ? (
                    <div className="p-5 rounded-lg border border-border/50 bg-card shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border/30 pb-3">
                            <h3 className="text-xs font-semibold text-foreground tracking-wide">
                                Top Call Outcomes
                            </h3>
                        </div>
                        <div className="h-52 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dispositionData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={50}
                                        outerRadius={72}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="var(--card)"
                                        strokeWidth={2}
                                    >
                                        {dispositionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--popover)',
                                            borderColor: 'var(--border)',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            color: 'var(--popover-foreground)',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 rounded-lg border border-border/50 bg-card shadow-2xs flex flex-col items-center justify-center text-center space-y-1.5 py-12">
                        <Phone className="w-5 h-5 text-muted-foreground/40" />
                        <p className="text-xs font-medium text-foreground">No call outcomes recorded yet</p>
                        <p className="text-[11px] text-muted-foreground">Initiate calls to view live outcome distributions.</p>
                    </div>
                )}
            </div>

            {/* Recent Activity Table & Queues */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Recent Call Activity Table */}
                <div className="lg:col-span-2 p-5 rounded-lg border border-border/50 bg-card shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-border/30 pb-3">
                        <h3 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Recent Call Activity
                        </h3>
                        <Link href="/runs" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            View all calls <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {recentRuns.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-border/40 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
                                        <th className="pb-2.5 px-2">Phone / Contact</th>
                                        <th className="pb-2.5 px-2">Disposition</th>
                                        <th className="pb-2.5 px-2">Duration</th>
                                        <th className="pb-2.5 px-2">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {recentRuns.map((run) => {
                                        const rawPhone = (run.gathered_context as any)?.customer_phone_number || (run.initial_context as any)?.phone_number || "Direct Web";
                                        const phone = formatContactOrigin(rawPhone);
                                        const rawDisp = (run.gathered_context as any)?.mapped_call_disposition || "completed";
                                        const { label: dispLabel, className: dispClass } = getDispositionBadge(rawDisp);
                                        const duration = run.call_duration_seconds ? `${Math.floor(run.call_duration_seconds)}s` : "0s";
                                        const dateStr = run.created_at ? new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently";

                                        return (
                                            <tr key={run.id || run.run_id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-2.5 px-2 font-medium text-foreground">{phone}</td>
                                                <td className="py-2.5 px-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${dispClass}`}>
                                                        {dispLabel}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-2 text-muted-foreground">{duration}</td>
                                                <td className="py-2.5 px-2 text-muted-foreground text-[11px]">{dateStr}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center space-y-1.5 py-12">
                            <Clock className="w-5 h-5 text-muted-foreground/40" />
                            <p className="text-xs font-medium text-foreground">No recent calls recorded</p>
                            <p className="text-[11px] text-muted-foreground">Calls will show up here automatically when agents interact with customers.</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Outbound Campaigns & Pending Callbacks */}
                <div className="space-y-4">
                    {/* Active Campaigns Progress */}
                    <div className="p-5 rounded-lg border border-border/50 bg-card shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border/30 pb-3">
                            <h3 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-2">
                                <Megaphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                Outbound Campaigns
                            </h3>
                            <Link href="/campaigns" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                                Manage <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {activeCampaigns.length > 0 ? (
                            <div className="space-y-2.5">
                                {activeCampaigns.map((camp: any) => {
                                    const total = camp.total_contacts || camp.contacts_count || 1;
                                    const dialed = camp.dialed_count || camp.completed_count || 0;
                                    const pct = Math.min(100, Math.round((dialed / total) * 100));

                                    return (
                                        <Link
                                            key={camp.id || camp.campaign_id}
                                            href={`/campaigns/${camp.id || camp.campaign_id}`}
                                            className="p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors space-y-2 block group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-foreground group-hover:underline truncate">{camp.name || "Campaign"}</span>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border/40 capitalize">
                                                    {camp.status || "active"}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                                    <span>Progress ({dialed}/{total})</span>
                                                    <span>{pct}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-[11px] text-muted-foreground text-center py-4">No active campaigns running.</p>
                        )}
                    </div>

                    {/* Pending Callbacks Card */}
                    <div className="p-4 rounded-lg border border-border/50 bg-card shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">Scheduled Callbacks</span>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border/40">
                                {pendingCallbacks.length} Pending
                            </span>
                        </div>
                        <Link href="/callbacks" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-end gap-1 pt-1">
                            View Queue <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
