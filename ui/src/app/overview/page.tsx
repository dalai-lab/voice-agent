"use client";

import { OverviewAnalytics } from '@/components/analytics/OverviewAnalytics';

export default function OverviewPage() {
    return (
        <div className="container mx-auto px-6 py-6 max-w-6xl space-y-6 bg-background text-foreground">
            {/* Header Section */}
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                    Overview
                </h1>
            </div>

            {/* Central Dashboard */}
            <OverviewAnalytics />
        </div>
    );
}
