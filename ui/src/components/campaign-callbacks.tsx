"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { type CampaignCallbackItem,cancelCallbackApiV1CallbacksCallbackIdDelete, listCampaignCallbacksApiV1CampaignCampaignIdCallbacksGet } from "@/client";
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
import { useAuth } from "@/lib/auth";

export function CampaignCallbacks({ campaignId }: { campaignId: number }) {
    const { user, getAccessToken } = useAuth();
    const router = useRouter();
    const [callbacks, setCallbacks] = useState<CampaignCallbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const fetchCallbacks = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const accessToken = await getAccessToken();
            const response = await listCampaignCallbacksApiV1CampaignCampaignIdCallbacksGet({
                path: { campaign_id: campaignId },
                headers: { "Authorization": `Bearer ${accessToken}` },
            });

            if (response.data) {
                setCallbacks(response.data);
            } else if (response.error) {
                toast.error("Failed to load campaign callbacks");
            }
        } catch (error) {
            console.error("Failed to load campaign callbacks:", error);
            toast.error("An error occurred while loading callbacks");
        } finally {
            setIsLoading(false);
        }
    }, [user, getAccessToken, campaignId]);

    useEffect(() => {
        fetchCallbacks();
    }, [fetchCallbacks]);

    const handleCancelCallback = async (cb: CampaignCallbackItem) => {
        if (!user) return;
        if (!confirm("Are you sure you want to cancel this scheduled callback?")) return;

        setCancellingId(cb.queued_run_id);
        try {
            const accessToken = await getAccessToken();
            const response = await cancelCallbackApiV1CallbacksCallbackIdDelete({
                path: { callback_id: cb.queued_run_id },
                query: { source: "campaign" },
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

    const getOutcomeBadgeVariant = (status: string) => {
        if (status === "completed") return "default";
        if (status === "failed") return "destructive";
        return "secondary";
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

    if (isLoading && callbacks.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Callbacks</CardTitle>
                    <CardDescription>Scheduled and past callbacks for this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse py-12">
                        <div className="h-64 bg-muted rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Callbacks</CardTitle>
                <CardDescription>Scheduled and past callbacks for this campaign</CardDescription>
            </CardHeader>
            <CardContent>
                {callbacks.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/20">
                        <h3 className="text-lg font-medium text-muted-foreground">No callbacks found</h3>
                        <p className="text-sm text-muted-foreground">Callbacks scheduled by agents during this campaign will appear here.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Scheduled For</TableHead>
                                <TableHead>Fires In</TableHead>
                                <TableHead>To Number</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Outcome</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {callbacks.map((cb) => (
                                <TableRow key={cb.queued_run_id}>
                                    <TableCell>
                                        {cb.scheduled_for ? format(new Date(cb.scheduled_for), "MMM d, yyyy h:mm a") : "N/A"}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                        {cb.status === "pending" ? formatFiresIn(cb.fires_in_seconds) : "-"}
                                    </TableCell>
                                    <TableCell>{cb.to_number || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusBadgeVariant(cb.status)}>
                                            {cb.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {cb.outcome_run_id ? (
                                            <div className="flex flex-col gap-1 items-start">
                                                <Badge variant={getOutcomeBadgeVariant(cb.outcome_status || "")} className="text-xs font-normal">
                                                    {cb.outcome_disposition || cb.outcome_status}
                                                </Badge>
                                                <button
                                                    className="text-xs text-blue-600 hover:underline"
                                                    onClick={() => router.push(`/workflow-runs/${cb.outcome_run_id}`)}
                                                >
                                                    View run
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {cb.status === "pending" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleCancelCallback(cb)}
                                                disabled={cancellingId === cb.queued_run_id}
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
    );
}
