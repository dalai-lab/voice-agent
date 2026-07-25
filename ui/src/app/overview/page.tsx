"use client";

import Link from 'next/link';

import { GitHubStarBadge } from '@/components/layout/GitHubStarBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

export default function OverviewPage() {
    const { user, provider } = useAuth();
    const isOSSMode = provider !== 'stack';

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background text-foreground">
            {/* Header / Welcome section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {isOSSMode ? (
                            "Welcome to Nova"
                        ) : (
                            `Welcome${user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!`
                        )}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {isOSSMode ? (
                            "Build powerful voice AI workflows and configurations."
                        ) : (
                            "Get started with building voice AI workflows"
                        )}
                    </p>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs flex flex-col justify-between min-h-[140px]">
                    <div className="space-y-1">
                        <h2 className="text-sm font-bold text-foreground">Create and Manage your Voice Agents</h2>
                        <p className="text-xs text-muted-foreground">
                            Build powerful AI Voice Agents with our visual editor
                        </p>
                    </div>
                    <div className="mt-4">
                        <Button asChild className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
                            <Link href="/workflow">
                                Go to Agents
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs flex flex-col justify-between min-h-[140px]">
                    <div className="space-y-1">
                        <h2 className="text-sm font-bold text-foreground">Configure Services</h2>
                        <p className="text-xs text-muted-foreground">
                            Set up your AI services like LLM, TTS, and STT providers
                        </p>
                    </div>
                    <div className="mt-4">
                        <Button asChild variant="outline" className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer">
                            <Link href="/model-configurations">
                                Configure Models
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Resources Section */}
            <div className="space-y-4 pt-4">
                <div className="border-b border-border/40 pb-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Resources</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Get help and learn more about Dograh</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button asChild variant="outline" className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer">
                        <a
                            href="https://docs.dograh.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Documentation
                        </a>
                    </Button>
                    <Button asChild variant="outline" className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer">
                        <a
                            href="https://github.com/dograh-hq/dograh/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Report an Issue
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
