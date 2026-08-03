"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis} from "recharts";

import { getWorkflowRunsApiV1WorkflowWorkflowIdRunsGet } from "@/client/sdk.gen";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AgentAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const workflowId = parseInt(params.workflowId as string);

    const [loading, setLoading] = useState(true);
    const [runs, setRuns] = useState<any[]>([]);

    useEffect(() => {
        if (!isAuthenticated || isNaN(workflowId)) return;

        async function fetchRuns() {
            try {
                setLoading(true);
                const res = await getWorkflowRunsApiV1WorkflowWorkflowIdRunsGet({
                    path: { workflow_id: workflowId },
                    query: { limit: 100 }
                });

                if (res.data?.runs) {
                    setRuns(res.data.runs);
                }
            } catch (error) {
                console.error("Failed to fetch workflow runs for analytics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchRuns();
    }, [isAuthenticated, workflowId]);

    const { kpis, dispositionData, timelineData } = useMemo(() => {
        const totalCalls = runs.length;
        let totalDuration = 0;
        let completedCalls = 0;
        const dispMap: Record<string, number> = {};
        const timelineMap: Record<string, number> = {};

        runs.forEach(run => {
            totalDuration += run.call_duration_seconds || 0;

            // Map disposition from gathered_context or fallback to disposition
            let disp = (run.gathered_context as any)?.mapped_call_disposition;
            if (!disp && run.disposition) {
                disp = run.disposition;
            }
            if (!disp) disp = "Unknown";

            dispMap[disp] = (dispMap[disp] || 0) + 1;

            if (run.state === 'completed' || run.is_completed) {
                completedCalls++;
            }

            // Timeline (group by day)
            if (run.created_at) {
                const date = new Date(run.created_at);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1;
            }
        });

        const sortedDispositions = Object.entries(dispMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const sortedTimeline = Object.entries(timelineMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            kpis: {
                totalCalls,
                completedCalls,
                avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
            },
            dispositionData: sortedDispositions,
            timelineData: sortedTimeline
        };
    }, [runs]);

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="flex items-center gap-3 h-14 px-4 bg-background border-b border-border shrink-0">
                <button
                    onClick={() => router.push(`/workflow/${workflowId}`)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-foreground/[0.03] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <h1 className="text-sm font-semibold text-foreground tracking-tight">Agent Analytics</h1>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Agent Performance Overview</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Analyze call volume, outcomes, and durations for this specific agent over its last 100 runs.
                        </p>
                    </div>

                    {loading ? (
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-card border border-border animate-pulse" />)}
                            </div>
                            <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-20 px-6 border border-border bg-card rounded-xl shadow-xs">
                            <p className="text-sm font-semibold text-foreground">No run data available yet.</p>
                            <p className="text-xs text-muted-foreground mt-1">Make some test calls to see analytics.</p>
                            <Button className="mt-4" onClick={() => router.push(`/workflow/${workflowId}`)}>
                                Go back to Editor
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Calls</p>
                                    <p className="text-2xl font-bold text-foreground">{kpis.totalCalls}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed Runs</p>
                                    <p className="text-2xl font-bold text-foreground">{kpis.completedCalls}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Duration</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {Math.floor(kpis.avgDuration / 60)}m {kpis.avgDuration % 60}s
                                    </p>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Disposition Chart */}
                                <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
                                    <h3 className="text-sm font-bold text-foreground mb-4">Call Outcomes (Disposition)</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={dispositionData}
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                                                <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    tick={{ fontSize: 11, fill: '#ccc' }}
                                                    width={100}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', fontSize: '12px', borderRadius: '8px' }}
                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                />
                                                <Bar dataKey="value" name="Calls" radius={[0, 4, 4, 0]} maxBarSize={40}>
                                                    {dispositionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Timeline Chart */}
                                <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
                                    <h3 className="text-sm font-bold text-foreground mb-4">Call Volume Over Time</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={timelineData}
                                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 10, fill: '#888' }}
                                                    tickMargin={10}
                                                />
                                                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', fontSize: '12px', borderRadius: '8px' }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="count"
                                                    name="Calls"
                                                    stroke="#0088FE"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: '#0088FE', strokeWidth: 0 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
