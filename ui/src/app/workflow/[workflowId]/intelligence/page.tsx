"use client";

import { ArrowLeft, Brain } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getWorkflowApiV1WorkflowFetchWorkflowIdGet, getWorkflowRunsApiV1WorkflowWorkflowIdRunsGet } from "@/client/sdk.gen";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dateTime";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";

export default function IntelligenceDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const organizationTimezone = useOrganizationTimezone();
    const workflowId = parseInt(params.workflowId as string);

    const [loading, setLoading] = useState(true);
    const [runs, setRuns] = useState<any[]>([]);
    const [schema, setSchema] = useState<any[] | null>(null);

    useEffect(() => {
        if (!isAuthenticated || isNaN(workflowId)) return;

        async function fetchData() {
            try {
                setLoading(true);
                const workflowRes = await getWorkflowApiV1WorkflowFetchWorkflowIdGet({
                    path: { workflow_id: workflowId }
                });
                
                if (workflowRes.data?.post_call_schema) {
                    setSchema(workflowRes.data.post_call_schema as any[]);
                }

                const runsRes = await getWorkflowRunsApiV1WorkflowWorkflowIdRunsGet({
                    path: { workflow_id: workflowId },
                    query: { limit: 100 }
                });
                
                if (runsRes.data?.runs) {
                    setRuns(runsRes.data.runs);
                }
            } catch (error) {
                console.error("Failed to fetch data for intelligence dashboard", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [isAuthenticated, workflowId]);

    const extractedKeys = schema ? schema.map(s => s.name) : [];
    
    // Fallback dynamic columns if no schema
    const dynamicExtractedColumns = runs.length > 0 && runs[0].extracted_data && !schema
        ? Object.keys(runs[0].extracted_data)
        : [];
        
    const columnsToRender = extractedKeys.length > 0 ? extractedKeys : dynamicExtractedColumns;

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
                <Button variant="ghost" size="icon" onClick={() => router.push(`/workflow/${workflowId}`)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <h1 className="text-sm font-semibold text-foreground tracking-tight">Intelligence Dashboard</h1>
                </div>
            </header>

            <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Post-Call Intelligence Data</h2>
                    <p className="text-sm text-muted-foreground">
                        Structured data extracted by the LLM from recent calls.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : runs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-16 border rounded-xl bg-card">
                        <Brain className="h-10 w-10 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium text-foreground">No intelligence data</h3>
                        <p className="text-sm text-muted-foreground mt-1">Make some calls with post-call intelligence enabled.</p>
                    </div>
                ) : (
                    <div className="border rounded-xl overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24">Run ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    {columnsToRender.map(col => (
                                        <TableHead key={col} className="uppercase text-xs font-bold text-blue-600/80">
                                            {col.replace(/_/g, ' ')}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {runs.map(run => (
                                    <TableRow 
                                        key={run.id}
                                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                                        onClick={() => router.push(`/workflow/${workflowId}/run/${run.id}`)}
                                    >
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{run.id}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatDateTime(run.created_at, organizationTimezone)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md ${run.is_completed ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                                                {run.is_completed ? "Completed" : "In Progress"}
                                            </Badge>
                                        </TableCell>
                                        {columnsToRender.map(col => (
                                            <TableCell key={col} className="text-xs max-w-[200px] truncate" title={run.extracted_data?.[col] ? String(run.extracted_data[col]) : ""}>
                                                {run.extracted_data?.[col] ? (
                                                    <span className="font-medium text-foreground">
                                                        {String(run.extracted_data[col])}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/40">-</span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </main>
        </div>
    );
}
