"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
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
import { Badge } from "@/components/ui/badge";
import { cancelCallbackApiV1CallbacksCallbackIdDelete, listCallbacksApiV1CallbacksGet } from "@/client";

type CallbackStatus = "pending" | "completed" | "failed" | "cancelled";

interface PendingCallback {
    id: number;
    organization_id: number;
    workflow_id: number;
    original_run_id: number;
    status: CallbackStatus;
    scheduled_for: string;
    to_number: string;
    from_number: string;
    conversation_summary: string;
    callback_chain_depth: number;
    created_at: string;
}

export default function PendingCallbacksPage() {
    const { user, getAccessToken, redirectToLogin } = useAuth();
    const [callbacks, setCallbacks] = useState<PendingCallback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    useEffect(() => {
        if (!user) {
            redirectToLogin();
        }
    }, [user, redirectToLogin]);

    const fetchCallbacks = useCallback(async () => {
        if (!user) return;
        try {
            const accessToken = await getAccessToken();
            const response = await listCallbacksApiV1CallbacksGet({
                query: { organization_id: user.selected_organization_id },
                headers: { "Authorization": `Bearer ${accessToken}` },
            });
            
            if (response.data) {
                setCallbacks(response.data as unknown as PendingCallback[]);
            } else if (response.error) {
                toast.error("Failed to load callbacks");
            }
        } catch (error) {
            console.error("Failed to load callbacks:", error);
            toast.error("An error occurred while loading callbacks");
        } finally {
            setIsLoading(false);
        }
    }, [user, getAccessToken]);

    useEffect(() => {
        fetchCallbacks();
    }, [fetchCallbacks]);

    const handleCancelCallback = async (id: number) => {
        if (!user) return;
        if (!confirm("Are you sure you want to cancel this scheduled callback?")) return;
        
        setCancellingId(id);
        try {
            const accessToken = await getAccessToken();
            const response = await cancelCallbackApiV1CallbacksCallbackIdDelete({
                path: { callback_id: id },
                query: { organization_id: user.selected_organization_id },
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

    const getStatusBadgeVariant = (status: CallbackStatus) => {
        switch (status) {
            case "pending": return "default";
            case "completed": return "secondary";
            case "failed": return "destructive";
            case "cancelled": return "outline";
            default: return "outline";
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
                    <div className="h-64 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Scheduled Callbacks</h1>
                <p className="text-muted-foreground">Monitor and manage scheduled callbacks from your workflows.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Callbacks</CardTitle>
                    <CardDescription>View all pending and past callbacks</CardDescription>
                </CardHeader>
                <CardContent>
                    {callbacks.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/20">
                            <h3 className="text-lg font-medium text-muted-foreground">No callbacks found</h3>
                            <p className="text-sm text-muted-foreground">When an agent schedules a callback, it will appear here.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Scheduled For</TableHead>
                                    <TableHead>To Number</TableHead>
                                    <TableHead>Workflow ID</TableHead>
                                    <TableHead>Summary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {callbacks.map((cb) => (
                                    <TableRow key={cb.id}>
                                        <TableCell>
                                            {cb.scheduled_for ? format(new Date(cb.scheduled_for), "MMM d, yyyy h:mm a") : "N/A"}
                                        </TableCell>
                                        <TableCell>{cb.to_number}</TableCell>
                                        <TableCell>#{cb.workflow_id}</TableCell>
                                        <TableCell className="max-w-[250px] truncate" title={cb.conversation_summary}>
                                            {cb.conversation_summary || "-"}
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
                                                    onClick={() => handleCancelCallback(cb.id)}
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
        </div>
    );
}
