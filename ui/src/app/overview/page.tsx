"use client";

import {
    ArrowUpRight,
    BookOpen,
    Cpu,
    Github,
    Layers,
    Phone
} from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth';

export default function OverviewPage() {
    const { user, provider } = useAuth();
    const isOSSMode = provider !== 'stack';

    return (
        <div className="container mx-auto px-6 py-10 max-w-4xl space-y-8 bg-background text-foreground">
            {/* Header Section */}
            <div className="space-y-1.5 pb-6 border-b border-border/40">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {isOSSMode ? (
                        "Welcome to Nova"
                    ) : (
                        `Welcome${user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}`
                    )}
                </h1>
                <p className="text-xs text-muted-foreground">
                    Build and manage your low-latency voice AI configurations.
                </p>
            </div>

            {/* Quick Actions Grid - Triple Minimal Rows */}
            <div className="space-y-4">
                {/* Voice Agents */}
                <Link
                    href="/workflow"
                    className="group flex items-start justify-between p-5 rounded-xl border border-border bg-card/30 hover:border-cta/25 hover:bg-card/50 transition-all duration-200 shadow-xs"
                >
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-cta/5 flex items-center justify-center text-cta shrink-0 border border-cta/10">
                            <Layers className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xs font-bold text-foreground group-hover:text-cta transition-colors">
                                Voice Agents
                            </h2>
                            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xl">
                                Orchestrate customer conversations, business logic, and action routing using the visual node canvas.
                            </p>
                        </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-cta group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </Link>

                {/* AI Services */}
                <Link
                    href="/model-configurations"
                    className="group flex items-start justify-between p-5 rounded-xl border border-border bg-card/30 hover:border-foreground/20 hover:bg-card/50 transition-all duration-200 shadow-xs"
                >
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                            <Cpu className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xs font-bold text-foreground">
                                Services & LLMs
                            </h2>
                            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xl">
                                Configure provider endpoints and credential settings for LLMs, Text-to-Speech, and Speech-to-Text services.
                            </p>
                        </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </Link>

                {/* Telephony Configurations */}
                <Link
                    href="/telephony-configurations"
                    className="group flex items-start justify-between p-5 rounded-xl border border-border bg-card/30 hover:border-foreground/20 hover:bg-card/50 transition-all duration-200 shadow-xs"
                >
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                            <Phone className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xs font-bold text-foreground">
                                Telephony Connections
                            </h2>
                            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xl">
                                Manage phone lines, hook up inbound/outbound providers, and route phone calls directly to your active workflows.
                            </p>
                        </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </Link>
            </div>

            {/* Resources Footer Section */}
            <div className="pt-6 border-t border-border/40 space-y-3.5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resources</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <a
                        href="https://docs.dograh.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card/20 hover:bg-muted/40 transition-colors shadow-xs"
                    >
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">Documentation</span>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                    <a
                        href="https://github.com/dograh-hq/dograh/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card/20 hover:bg-muted/40 transition-colors shadow-xs"
                    >
                        <div className="flex items-center gap-2">
                            <Github className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">Report an Issue</span>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>
            </div>
        </div>
    );
}
