"use client";

import { ExternalLink, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

import RecordingsList from "./RecordingsList";
import { RecordingsUploadDialog } from "./RecordingsUploadDialog";

export default function RecordingsPage() {
    const { user, redirectToLogin, loading } = useAuth();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    if (loading || !user) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-64 rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">Audio Library</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Manage pre-recorded audio clips for your organization. Use{" "}
                        <code className="rounded bg-muted/60 px-1 text-[10px] font-mono border border-border/40">@</code> in prompt fields to insert them,
                        or as instant transition messages in tool calls.{" "}
                        <a href="https://docs.dograh.com/voice-agent/pre-recorded-audio" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline font-semibold text-foreground">
                            Learn more <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)} className="h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-xs font-semibold text-xs cursor-pointer">
                    <Upload className="w-4 h-4 mr-1.5" />
                    Upload Recording
                </Button>
            </div>

            {/* Flat list body */}
            <RecordingsList refreshKey={refreshKey} />

            <RecordingsUploadDialog
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onUploadComplete={() => setRefreshKey((k) => k + 1)}
            />
        </div>
    );
}
