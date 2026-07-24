"use client";

import { format } from "date-fns";
import { Bot,Briefcase, Phone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cancelCallbackApiV1CallbacksCallbackIdDelete, listCallbacksApiV1CallbacksGet, type UnifiedCallbackItem } from "@/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Scheduled Callbacks</h1>
                <p className="text-muted-foreground">Monitor and manage scheduled callbacks from your workflows and campaigns.</p>
            </div>

            <Tabs defaultValue="all" value={sourceTab} onValueChange={(val) => setSourceTab(val as any)}>
                <TabsList className="mb-4">
                    <TabsTrigger value="all">All Callbacks</TabsTrigger>
                    <TabsTrigger value="standalone">Standalone</TabsTrigger>
                    <TabsTrigger value="campaign">Campaigns</TabsTrigger>
                </TabsList>

                <TabsContent value={sourceTab}>
                    <Card>
                    <CardHeader>
                        <CardTitle>
                            {sourceTab === "all" ? "All Callbacks" : sourceTab === "standalone" ? "Standalone Callbacks" : "Campaign Callbacks"}
                        </CardTitle>
                        <CardDescription>View all pending and past callbacks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading && callbacks.length === 0 ? (
                            <div className="animate-pulse py-12">
                                <div className="h-64 bg-muted rounded"></div>
                            </div>
                        ) : callbacks.length === 0 ? (
                            <div className="text-center py-12 border rounded-lg bg-muted/20">
                                <h3 className="text-lg font-medium text-muted-foreground">No callbacks found</h3>
                                <p className="text-sm text-muted-foreground">When an agent schedules a callback, it will appear here.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Scheduled For</TableHead>
                                        <TableHead>Fires In</TableHead>
                                        <TableHead>To Number</TableHead>
                                        <TableHead>Agent / Campaign</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {callbacks.map((cb) => (
                                        <TableRow key={`${cb.source}-${cb.id}`}>
                                            <TableCell>
                                                {cb.source === "campaign" ? (
                                                    <Badge variant="outline" className="flex items-center w-max"><Briefcase className="w-3 h-3 mr-1"/> Campaign</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="flex items-center w-max"><Phone className="w-3 h-3 mr-1"/> Standalone</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {cb.scheduled_for ? format(new Date(cb.scheduled_for), "MMM d, yyyy h:mm a") : "N/A"}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground">
                                                {cb.status === "pending" ? formatFiresIn(cb.fires_in_seconds) : "-"}
                                            </TableCell>
                                            <TableCell>{cb.to_number || "-"}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center text-sm font-medium">
                                                        <Bot className="w-3 h-3 mr-1 text-muted-foreground"/> {cb.workflow_name || `#${cb.workflow_id}`}
                                                    </div>
                                                    {cb.campaign_id && (
                                                        <div className="flex items-center text-xs text-muted-foreground">
                                                            <Briefcase className="w-3 h-3 mr-1"/> {cb.campaign_name || `#${cb.campaign_id}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadgeVariant(cb.status)}>
                                                    {cb.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {cb.status === "pending" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleCancelCallback(cb)}
                                                        disabled={cancellingId === cb.id}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Cancel
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
