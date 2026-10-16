"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { getCampaignRunsApiV1CampaignCampaignIdRunsGet } from "@/client/sdk.gen";
import { CampaignResponse } from "@/client/types.gen";
import { useAuth } from "@/lib/auth";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface CampaignAnalyticsProps {
    campaignId: number;
    campaign?: CampaignResponse | null;
}

export function CampaignAnalytics({ campaignId, campaign }: CampaignAnalyticsProps) {
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [runs, setRuns] = useState<any[]>([]);

    const campaignState = campaign?.state;

    const fetchRuns = useCallback(async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            const res = await getCampaignRunsApiV1CampaignCampaignIdRunsGet({
                path: { campaign_id: campaignId },
                query: { limit: 100 }
            });
            
            if (res.data?.runs) {
                setRuns(res.data.runs);
            }
        } catch (error) {
            console.error("Failed to fetch campaign runs for analytics", error);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [campaignId]);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchRuns(false);
    }, [isAuthenticated, campaignId, fetchRuns]);

    useEffect(() => {
        if (!isAuthenticated || campaignState !== 'running') return;
        const interval = setInterval(() => {
            fetchRuns(true);
        }, 4000);
        return () => clearInterval(interval);
    }, [isAuthenticated, campaignId, campaignState, fetchRuns]);

    const { kpis, dispositionData } = useMemo(() => {
        let totalDuration = 0;
        let sampleCallsWithDuration = 0;
        let sampleCompletedCalls = 0;
        const dispMap: Record<string, number> = {};

        runs.forEach(run => {
            const duration = (run as any).cost_info?.call_duration_seconds 
                          ?? (run as any).usage_info?.call_duration_seconds 
                          ?? (run as any).call_duration_seconds 
                          ?? 0;
            const durNum = Number(duration) || 0;
            totalDuration += durNum;
            if (durNum > 0) {
                sampleCallsWithDuration++;
            }
            
            // Map disposition from gathered_context or fallback to disposition
            let disp = (run.gathered_context as any)?.mapped_call_disposition;
            if (!disp && run.disposition) {
                disp = run.disposition;
            }
            if (!disp) disp = "Unknown";
            
            dispMap[disp] = (dispMap[disp] || 0) + 1;
            
            if (run.state === 'completed' || run.is_completed) {
                sampleCompletedCalls++;
            }
        });

        const sortedDispositions = Object.entries(dispMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const totalCalls = campaign?.total_queued_count ?? (campaign?.total_rows ?? runs.length);
        const completedCalls = campaign?.completed_calls_count ?? sampleCompletedCalls;
        const durationDivisor = sampleCallsWithDuration > 0 ? sampleCallsWithDuration : (runs.length > 0 ? runs.length : 1);
        const avgDuration = runs.length > 0 ? Math.round(totalDuration / durationDivisor) : 0;

        return {
            kpis: {
                totalCalls,
                completedCalls,
                avgDuration,
                sampleSize: runs.length,
            },
            dispositionData: sortedDispositions
        };
    }, [runs, campaign]);

    if (loading) {
        return <div className="animate-pulse h-48 bg-muted/20 rounded-xl border border-border"></div>;
    }

    if (runs.length === 0) {
        return null;
    }

    return (
        <div className="border border-border bg-card rounded-xl p-5 shadow-xs space-y-4">
            <div>
                <h2 className="text-sm font-bold text-foreground">Campaign Analytics</h2>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Disposition breakdown (latest {runs.length} runs) and campaign performance metrics
                </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/40">
                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Calls</p>
                    <p className="text-2xl font-bold text-foreground">{kpis.totalCalls}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-bold text-foreground">{kpis.completedCalls}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card/30 shadow-xs space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Avg Duration (Sample: {kpis.sampleSize})
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                        {Math.floor(kpis.avgDuration / 60)}m {kpis.avgDuration % 60}s
                    </p>
                </div>
            </div>

            {dispositionData.length > 0 && (
                <div className="pt-4 h-[250px] w-full">
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
                            <Bar dataKey="value" name="Calls" radius={[0, 4, 4, 0]} maxBarSize={32}>
                                {dispositionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
