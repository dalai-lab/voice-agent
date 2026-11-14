"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import SpinLoader from "@/components/SpinLoader";

/**
 * Backward compatibility redirect:
 * Intelligence data has been merged directly into the Runs console.
 * Redirects legacy /workflow/[workflowId]/intelligence visits to /workflow/[workflowId]/runs.
 */
export default function IntelligenceDashboardRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const workflowId = params.workflowId as string;

    useEffect(() => {
        if (workflowId) {
            router.replace(`/workflow/${workflowId}/runs`);
        }
    }, [workflowId, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <SpinLoader />
                <p className="text-xs text-muted-foreground">Redirecting to Call History...</p>
            </div>
        </div>
    );
}
