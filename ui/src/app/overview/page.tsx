"use client";

import { OverviewAnalytics } from '@/components/analytics/OverviewAnalytics';

export default function OverviewPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground">
            {/* Header Section */}
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        Overview
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Real-time operational summary & call analytics
                    </p>
                </div>
            </div>

            {/* Central Dashboard */}
            <OverviewAnalytics />
        </div>
    );
}
