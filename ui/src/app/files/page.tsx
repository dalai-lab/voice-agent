"use client";

import { ExternalLink, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

import DocumentList from "./DocumentList";
import DocumentUpload from "./DocumentUpload";

export default function FilesPage() {
    const { user, redirectToLogin, loading } = useAuth();
    const [refreshKey, setRefreshKey] = useState(0);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    const handleUploadSuccess = () => {
        setRefreshKey(prev => prev + 1);
        setIsUploadOpen(false);
    };

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
                    <h1 className="text-xl font-bold tracking-tight text-foreground">Knowledge Base Files</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Upload and manage documents for your voice agents to reference.{" "}
                        <a href="https://docs.dograh.com/voice-agent/knowledge-base" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline font-semibold text-foreground">
                            Learn more <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)} className="h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-xs font-semibold text-xs cursor-pointer">
                    <Upload className="w-4 h-4 mr-1.5" />
                    Upload Document
                </Button>
            </div>

            {/* Document list render */}
            <DocumentList refreshTrigger={refreshKey} />

            {/* Upload Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-bold text-foreground">Upload Document</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Upload a PDF or document file to add to your knowledge base
                        </DialogDescription>
                    </DialogHeader>
                    <div className="pt-2">
                        <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
