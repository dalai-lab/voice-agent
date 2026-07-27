"use client";

import { useEffect, useState } from "react";
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis} from "recharts";

import {
    getCurrentPeriodUsageApiV1OrganizationsUsageCurrentPeriodGet,
    getDailyUsageBreakdownApiV1OrganizationsUsageDailyBreakdownGet,
    getUsageHistoryApiV1OrganizationsUsageRunsGet
} from "@/client/sdk.gen";
import { useUserConfig } from "@/context/UserConfigContext";
import { useAuth } from "@/lib/auth";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function OverviewAnalytics() {
    const { isAuthenticated } = useAuth();
    const { organizationPricing } = useUserConfig();

    const [kpiData, setKpiData] = useState<{
        duration: number;
        calls: number;
        spend: number | null;
        avgDuration: number;
    } | null>(null);

    const [dailyData, setDailyData] = useState<any[]>([]);
    const [dispositionData, setDispositionData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;

        async function fetchAnalytics() {
            try {
                setLoading(true);

                // Fetch KPI Data
                const periodRes = await getCurrentPeriodUsageApiV1OrganizationsUsageCurrentPeriodGet();
                const period = periodRes.data;
                if (period) {
                    setKpiData({
                        duration: period.used_dograh_tokens || period.total_duration_seconds || 0,
                        calls: 0, // Will be computed or updated
                        spend: period.used_amount_usd ?? null,
                        avgDuration: 0,
                    });
                }

                // Fetch Daily Breakdown (if priced)
                let totalCallsFromDaily = 0;
                if (organizationPricing?.price_per_second_usd) {
                    const dailyRes = await getDailyUsageBreakdownApiV1OrganizationsUsageDailyBreakdownGet({
                        query: { days: 30 }
                    });
                    if (dailyRes.data?.breakdown) {
                        const formattedDaily = dailyRes.data.breakdown.map(day => {
                            totalCallsFromDaily += day.call_count || 0;
                            return {
                                date: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                calls: day.call_count,
                                duration: day.minutes * 60
                            };
                        }).reverse(); // API usually returns descending, we want ascending for chart
                        setDailyData(formattedDaily);
                    }
                }

                // Fetch Usage History for Dispositions & Call Count
                const usageRes = await getUsageHistoryApiV1OrganizationsUsageRunsGet({
                    query: { limit: 100 }
                });

                if (usageRes.data) {
                    const runs = usageRes.data.runs || [];
                    const totalCount = usageRes.data.total_count || runs.length;

                    let runsDuration = 0;
                    runs.forEach(r => { runsDuration += r.call_duration_seconds || 0; });

                    // Update KPI with total calls
                    setKpiData(prev => {
                        if (!prev) return null;
                        const duration = prev.duration > 0 ? prev.duration : runsDuration;
                        const calls = Math.max(totalCallsFromDaily, totalCount);
                        return {
                            ...prev,
                            duration,
                            calls,
                            avgDuration: duration > 0 && calls > 0 ? duration / calls : 0
                        };
                    });

                    // Group by disposition
                    const dispMap: Record<string, number> = {};
                    runs.forEach(run => {
                        const disp = (run.gathered_context as any)?.mapped_call_disposition || "Unknown";
                        dispMap[disp] = (dispMap[disp] || 0) + 1;
                    });

                    const formattedDisp = Object.entries(dispMap)
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 5); // Top 5

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

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    if (loading) {
        return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading metrics...</div>;
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Calls</p>
                    <p className="text-2xl font-bold text-foreground">{kpiData?.calls || 0}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Duration</p>
                    <p className="text-2xl font-bold text-foreground">{formatDuration(kpiData?.duration || 0)}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Duration</p>
                    <p className="text-2xl font-bold text-foreground">{formatDuration(kpiData?.avgDuration || 0)}</p>
                </div>
                {kpiData?.spend != null && (
                    <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Period Spend</p>
                        <p className="text-2xl font-bold text-foreground">${kpiData.spend.toFixed(2)}</p>
                    </div>
                )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dailyData.length > 0 && (
                    <div className="p-5 rounded-xl border border-border bg-card/30 shadow-xs">
                        <h3 className="text-sm font-semibold mb-4">Call Volume (30 Days)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#666" />
                                    <YAxis tick={{fontSize: 10}} stroke="#666" allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', fontSize: '12px' }}
                                    />
                                    <Line type="monotone" dataKey="calls" stroke="#00C49F" strokeWidth={2} dot={{r: 2}} activeDot={{r: 4}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {dispositionData.length > 0 && (
                    <div className="p-5 rounded-xl border border-border bg-card/30 shadow-xs">
                        <h3 className="text-sm font-semibold mb-4">Top Call Outcomes</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dispositionData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dispositionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
