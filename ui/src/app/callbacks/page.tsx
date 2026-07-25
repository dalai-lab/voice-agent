"use client";

import { format } from "date-fns";
import { Bot,Briefcase, Phone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cancelCallbackApiV1CallbacksCallbackIdDelete, listCallbacksApiV1CallbacksGet, type UnifiedCallbackItem } from "@/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

export default function PendingCallbacksPage() {
    const { user, getAccessToken, redirectToLogin, loading } = useAuth();
    const [callbacks, setCallbacks] = useState<UnifiedCallbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [sourceTab, setSourceTab] = useState<"all" | "standalone" | "campaign">("all");

    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    const fetchCallbacks = useCallback(async (source: "all" | "standalone" | "campaign" = sourceTab) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const accessToken = await getAccessToken();
            const response = await listCallbacksApiV1CallbacksGet({
                query: { source },
                headers: { "Authorization": `Bearer ${accessToken}` },
            });

            if (response.data) {
                setCallbacks(response.data.items || []);
            } else if (response.error) {
                toast.error("Failed to load callbacks");
            }
        } catch (error) {
            console.error("Failed to load callbacks:", error);
            toast.error("An error occurred while loading callbacks");
        } finally {
            setIsLoading(false);
        }
    }, [user, getAccessToken, sourceTab]);

    useEffect(() => {
        fetchCallbacks(sourceTab);
    }, [fetchCallbacks, sourceTab]);

    const handleCancelCallback = async (cb: UnifiedCallbackItem) => {
        if (!user) return;
        if (!confirm("Are you sure you want to cancel this scheduled callback?")) return;

        setCancellingId(cb.id);
        try {
            const accessToken = await getAccessToken();
            const response = await cancelCallbackApiV1CallbacksCallbackIdDelete({
                path: { callback_id: cb.id },
                query: { source: cb.source },
                headers: { "Authorization": `Bearer ${accessToken}` },
            });

            if (response.error) {
                toast.error("Failed to cancel callback");
            } else {
                toast.success("Callback cancelled successfully");
                await fetchCallbacks();
            }
        } catch (error) {
            console.error("Failed to cancel callback:", error);
            toast.error("An error occurred while cancelling the callback");
        } finally {
            setCancellingId(null);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case "pending": return "default";
            case "completed": return "secondary";
            case "failed": return "destructive";
            case "cancelled": return "outline";
            default: return "outline";
        }
    };

    const formatFiresIn = (seconds: number | undefined | null) => {
        if (seconds === undefined || seconds === null) return "N/A";
        if (seconds <= 0) return "Due Now";

        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 60) {
            const h = Math.floor(m / 60);
            const rm = m % 60;
            return `${h}h ${rm}m`;
        }
        return `${m}m ${s}s`;
    };

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Scheduled Callbacks</h1>
                    <p className="text-xs text-muted-foreground">Monitor and manage scheduled callbacks from your workflows and campaigns</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <Tabs defaultValue="all" value={sourceTab} onValueChange={(val) => setSourceTab(val as any)} className="space-y-6">
                <TabsList className="h-8 rounded-lg bg-muted/60 p-0.5 border border-border/60">
                    <TabsTrigger value="all" className="h-7 text-xs px-4 rounded-md font-semibold cursor-pointer">All Callbacks</TabsTrigger>
                    <TabsTrigger value="standalone" className="h-7 text-xs px-4 rounded-md font-semibold cursor-pointer">Standalone</TabsTrigger>
                    <TabsTrigger value="campaign" className="h-7 text-xs px-4 rounded-md font-semibold cursor-pointer">Campaigns</TabsTrigger>
                </TabsList>

                <TabsContent value={sourceTab} className="focus-visible:outline-none">
                    {/* Content Section */}
                    {isLoading && callbacks.length === 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
                            ))}
                        </div>
                    ) : callbacks.length === 0 ? (
                        <div className="flex items-center justify-center w-full py-12">
                            <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm w-full border border-border bg-card rounded-xl shadow-xs">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
                                    <Phone className="h-6 w-6" />
                                </div>
                                <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No callbacks found</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">When an agent schedules a callback task, it will be listed here.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-border bg-card rounded-xl overflow-hidden shadow-xs">
                            <Table>
                                <TableHeader className="bg-muted/35">
                                    <TableRow className="border-border/80 hover:bg-transparent">
                                        <TableHead className="text-xs font-bold text-muted-foreground/80 py-3">Type</TableHead>
                                        <TableHead className="text-xs font-bold text-muted-foreground/80 py-3">Scheduled For</TableHead>
                                        <TableHead className="text-xs font-bold text-muted-foreground/80 py-3">Fires In</TableHead>
                                        <TableHead className="text-xs font-bold text-muted-foreground/80 py-3">To Number</TableHead>
                                        <TableHead className="text-xs font-bold text-muted-foreground/80 py-3">Agent / Campaign</TableHead>
                                        <TableHead className="text-xs font-bold text-muted-foreground/80 py-3">Status</TableHead>
                                        <TableHead className="text-xs font-bold text-muted-foreground/80 py-3 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {callbacks.map((cb) => (
                                        <TableRow key={`${cb.source}-${cb.id}`} className="border-border/60 hover:bg-muted/30 transition-colors">
                                            <TableCell className="py-3">
                                                {cb.source === "campaign" ? (
                                                    <Badge variant="outline" className="flex items-center w-max gap-1 text-[10px] uppercase font-bold tracking-wider py-0.5 rounded-md border-border/60 bg-muted/40">
                                                        <Briefcase className="w-2.5 h-2.5"/> Campaign
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="flex items-center w-max gap-1 text-[10px] uppercase font-bold tracking-wider py-0.5 rounded-md border-border/60 bg-muted/40">
                                                        <Phone className="w-2.5 h-2.5"/> Standalone
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium py-3">
                                                {cb.scheduled_for ? format(new Date(cb.scheduled_for), "MMM d, yyyy h:mm a") : "N/A"}
                                            </TableCell>
                                            <TableCell className="font-mono text-[11px] text-muted-foreground py-3">
                                                {cb.status === "pending" ? formatFiresIn(cb.fires_in_seconds) : "-"}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold py-3">{cb.to_number || "-"}</TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center text-xs font-bold text-foreground">
                                                        <Bot className="w-3.5 h-3.5 mr-1 text-muted-foreground/80"/> {cb.workflow_name || `#${cb.workflow_id}`}
                                                    </div>
                                                    {cb.campaign_id && (
                                                        <div className="flex items-center text-[10px] text-muted-foreground/80 font-medium">
                                                            <Briefcase className="w-3 h-3 mr-1 text-muted-foreground/60"/> {cb.campaign_name || `#${cb.campaign_id}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge variant={getStatusBadgeVariant(cb.status)} className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md">
                                                    {cb.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right py-3">
                                                {cb.status === "pending" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg font-semibold"
                                                        onClick={() => handleCancelCallback(cb)}
                                                        disabled={cancellingId === cb.id}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                                        Cancel
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
