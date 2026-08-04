"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Code2, Database, Filter, Globe, Layers, Lock, PhoneCall, Search, Shield, Sparkles, Terminal, Workflow, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

interface IntegrationItem {
    id: string;
    name: string;
    category: "voice" | "telephony" | "crm" | "automation";
    description: string;
    logoUrl: string;
    badge: string;
    badgeColor: string;
    features: string[];
    syncSpeed: string;
    protocols: string;
    docsUrl: string;
}

const INTEGRATIONS_DATA: IntegrationItem[] = [
    // Voice & Speech AI
    {
        id: "openai",
        name: "OpenAI Realtime Matrix",
        category: "voice",
        description: "Native Speech-to-Speech LLM model with sub-120ms latency and human natural tone.",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
        badge: "Realtime Speech LLM",
        badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        features: ["Sub-120ms Latency", "Native Interruption Handling", "Multi-turn Persona Prompting"],
        syncSpeed: "< 120ms",
        protocols: "WebSockets / gRPC",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "elevenlabs",
        name: "ElevenLabs Voice AI",
        category: "voice",
        description: "Expressive voice cloning, emotional tone inflection, and multi-accent voice synthesis.",
        logoUrl: "https://raw.githubusercontent.com/gilbarbara/logos/master/logos/elevenlabs.svg",
        badge: "Expressive TTS",
        badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        features: ["Custom Voice Cloning", "30+ Native Languages", "Zero Robotic Monotone"],
        syncSpeed: "~180ms",
        protocols: "Streaming PCM Audio",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "deepgram",
        name: "Deepgram Speech AI",
        category: "voice",
        description: "Enterprise automated speech recognition (STT) with active background noise filtering.",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Deepgram_Logo.png",
        badge: "High-Speed STT",
        badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        features: ["Background Noise Reduction", "Custom Vocabulary Models", "Real-Time Word Timestamps"],
        syncSpeed: "~90ms",
        protocols: "WebSocket Stream",
        docsUrl: "https://docs.dograh.com"
    },

    // Telephony Carriers
    {
        id: "twilio",
        name: "Twilio Telephony",
        category: "telephony",
        description: "Global phone number provisioning across 100+ countries with HD Voice routing.",
        logoUrl: "https://raw.githubusercontent.com/gilbarbara/logos/master/logos/twilio-icon.svg",
        badge: "Global Carrier",
        badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
        features: ["Instant Phone Number Buying", "Multi-Region Carrier Failover", "HD Voice Telephony"],
        syncSpeed: "Instant",
        protocols: "SIP / TwiML",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "plivo",
        name: "Plivo Telephony",
        category: "telephony",
        description: "High-volume outbound calling, local caller ID verification, and SIP trunking.",
        logoUrl: "https://cdn.worldvectorlogo.com/logos/plivo.svg",
        badge: "SIP Trunking",
        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        features: ["BYO Carrier SIP Trunks", "Caller ID Verification", "Low Latency Routing"],
        syncSpeed: "Instant",
        protocols: "SIP / WebSockets",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "telnyx",
        name: "Telnyx Carrier Network",
        category: "telephony",
        description: "Private IP communications network with enterprise SLA and toll-free number support.",
        logoUrl: "https://cdn.worldvectorlogo.com/logos/telnyx.svg",
        badge: "Private Fiber Network",
        badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        features: ["STIR/SHAKEN Spam Shield", "Global Local DID Numbers", "99.999% SLA Uptime"],
        syncSpeed: "Instant",
        protocols: "SIP Trunking",
        docsUrl: "https://docs.dograh.com"
    },

    // CRMs & Scheduling
    {
        id: "hubspot",
        name: "HubSpot CRM",
        category: "crm",
        description: "Automatic contact creation, full audio call transcripts, and sentiment tag sync.",
        logoUrl: "https://raw.githubusercontent.com/gilbarbara/logos/master/logos/hubspot.svg",
        badge: "2-Way CRM Sync",
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        features: ["Automated Deal Logging", "Caller Sentiment Scoring", "Custom Property Mapping"],
        syncSpeed: "Realtime",
        protocols: "REST API v3",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "salesforce",
        name: "Salesforce Enterprise",
        category: "crm",
        description: "Enterprise CRM deal logging, lead assignment rules, and custom object sync.",
        logoUrl: "https://raw.githubusercontent.com/gilbarbara/logos/master/logos/salesforce.svg",
        badge: "Enterprise CRM",
        badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        features: ["Lead Auto-Assignment", "Task & Call Object Sync", "Custom Flow Triggers"],
        syncSpeed: "Realtime",
        protocols: "Salesforce REST / OAuth",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "google-calendar",
        name: "Google Calendar",
        category: "crm",
        description: "Live 2-way calendar slot reservation during phone calls with instant invite dispatch.",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
        badge: "Live Scheduling",
        badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        features: ["Conflict-Free Slot Lock", "Google Meet Integration", "Instant Email Invites"],
        syncSpeed: "Instant",
        protocols: "Google Calendar API",
        docsUrl: "https://docs.dograh.com"
    },

    // Automation & Webhooks
    {
        id: "zapier",
        name: "Zapier Automation",
        category: "automation",
        description: "Connect Nova call events to 5,000+ business applications with zero code.",
        logoUrl: "https://raw.githubusercontent.com/gilbarbara/logos/master/logos/zapier-icon.svg",
        badge: "5,000+ App Flows",
        badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        features: ["Instant Call-End Triggers", "Multi-Step Zaps", "No-Code Workflow Builder"],
        syncSpeed: "Instant",
        protocols: "Webhook Triggers",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "make",
        name: "Make.com (Integromat)",
        category: "automation",
        description: "Visual scenario builder for complex multi-app data routing on post-call events.",
        logoUrl: "https://raw.githubusercontent.com/gilbarbara/logos/master/logos/make.svg",
        badge: "Visual Automation",
        badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        features: ["Advanced Data Transformation", "Conditional Branching", "Custom JSON Parser"],
        syncSpeed: "Instant",
        protocols: "REST / Webhooks",
        docsUrl: "https://docs.dograh.com"
    },
    {
        id: "webhooks",
        name: "Custom Realtime Webhooks",
        category: "automation",
        description: "Receive signed JSON webhooks on your server immediately after every phone call.",
        logoUrl: "https://raw.githubusercontent.com/npm/logos/master/openai/openai.svg",
        badge: "Developer API",
        badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        features: ["HMAC Signature Verification", "Full Raw Audio Recording URL", "Structured JSON Transcripts"],
        syncSpeed: "< 50ms",
        protocols: "HTTP POST / Webhooks",
        docsUrl: "https://docs.dograh.com"
    }
];

export default function IntegrationsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const filteredIntegrations = INTEGRATIONS_DATA.filter((item) => {
        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              item.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="w-full min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
            
            {/* Navigation Header */}
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
                    <BrandLogo className="text-xl font-bold tracking-tight text-foreground" />
                    <div className="flex items-center gap-6 text-xs font-medium">
                        <Link href="/" className="hover:text-foreground/80 transition-colors">Home</Link>
                        <Link href="/#use-cases" className="hover:text-foreground/80 transition-colors">Use Cases</Link>
                        <Link href="/#pricing" className="hover:text-foreground/80 transition-colors">Pricing</Link>
                        <ThemeToggle variant="ghost" size="icon" className="h-8 w-8 rounded-full text-foreground hover:bg-muted" />
                        <Link
                            href="/auth/signup"
                            className="h-8 px-4 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                            Get Started <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Page Hero */}
            <section className="border-b border-border/40 py-20 lg:py-24 bg-gradient-to-b from-background via-muted/20 to-background text-center">
                <div className="max-w-5xl mx-auto px-6 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Globe className="w-3.5 h-3.5" /> Native Integration Ecosystem
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08] max-w-4xl mx-auto">
                        Connected to your AI models, telephony carriers, and CRMs.
                    </h1>

                    <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Deploy production voice agents backed by industry-leading speech models, carrier-grade telephone lines, and two-way CRM sync — zero custom WebSockets or infrastructure code required.
                    </p>

                    {/* Search & Category Filter Controls Bar */}
                    <div className="pt-8 max-w-3xl mx-auto space-y-4">
                        
                        {/* Search Input Box */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search integrations (e.g. ElevenLabs, HubSpot, Twilio, Webhooks)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-full bg-card border border-border/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cta/50 transition-all shadow-sm"
                            />
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                    selectedCategory === "all"
                                        ? "bg-cta text-cta-foreground shadow-xs"
                                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                            >
                                All Ecosystem ({INTEGRATIONS_DATA.length})
                            </button>
                            <button
                                onClick={() => setSelectedCategory("voice")}
                                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                    selectedCategory === "voice"
                                        ? "bg-cta text-cta-foreground shadow-xs"
                                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                            >
                                Speech AI Models
                            </button>
                            <button
                                onClick={() => setSelectedCategory("telephony")}
                                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                    selectedCategory === "telephony"
                                        ? "bg-cta text-cta-foreground shadow-xs"
                                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                            >
                                Telephony & SIP
                            </button>
                            <button
                                onClick={() => setSelectedCategory("crm")}
                                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                    selectedCategory === "crm"
                                        ? "bg-cta text-cta-foreground shadow-xs"
                                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                            >
                                CRMs & Scheduling
                            </button>
                            <button
                                onClick={() => setSelectedCategory("automation")}
                                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                    selectedCategory === "automation"
                                        ? "bg-cta text-cta-foreground shadow-xs"
                                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                            >
                                Automation & Webhooks
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* Architecture Data Flow Diagram Banner */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 border-b border-border/40">
                <div className="p-8 sm:p-10 rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-border/60 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h3 className="text-sm font-bold text-foreground">Zero-Code Telephony Architecture</h3>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Sub-180ms End-to-End Pipeline</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
                        <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
                            <PhoneCall className="w-6 h-6 text-emerald-400 mx-auto" />
                            <h4 className="text-xs font-bold text-foreground">1. Carrier Inbound Line</h4>
                            <p className="text-[11px] text-muted-foreground">Twilio, Plivo, Telnyx, or BYO SIP Trunking</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-cta/15 border border-cta/30 space-y-2 relative">
                            <Sparkles className="w-6 h-6 text-cta mx-auto animate-pulse" />
                            <h4 className="text-xs font-bold text-foreground">2. Nova Realtime Matrix</h4>
                            <p className="text-[11px] text-muted-foreground">OpenAI Realtime / Deepgram + ElevenLabs</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
                            <Database className="w-6 h-6 text-amber-400 mx-auto" />
                            <h4 className="text-xs font-bold text-foreground">3. Enterprise CRM & Actions</h4>
                            <p className="text-[11px] text-muted-foreground">HubSpot, Salesforce, Google Calendar & Webhooks</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AAA Integration Cards Grid */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Integration Catalog</h2>
                        <p className="text-xs text-muted-foreground">Showing {filteredIntegrations.length} verified native integrations</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredIntegrations.map((item) => (
                        <div
                            key={item.id}
                            className="p-7 rounded-2xl border border-border/80 bg-card hover:border-cta/60 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xs group"
                        >
                            <div className="space-y-5">
                                {/* Logo & Badge Row */}
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/60 p-2.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                        <img
                                            src={item.logoUrl}
                                            alt={item.name}
                                            className="w-full h-full object-contain filter drop-shadow-xs"
                                            onError={(e) => {
                                                // Fallback if logo fails to load
                                                (e.target as HTMLElement).style.display = "none";
                                            }}
                                        />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-semibold border ${item.badgeColor}`}>
                                        {item.badge}
                                    </span>
                                </div>

                                {/* Name & Description */}
                                <div className="space-y-1.5">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-cta transition-colors">{item.name}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                                </div>

                                {/* Features List */}
                                <ul className="space-y-2 text-xs text-foreground pt-3 border-t border-border/60">
                                    {item.features.map((feat, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span className="text-[11px] font-medium text-muted-foreground">{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Card Footer: Metadata & Connect Action */}
                            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-mono text-muted-foreground block">Latency / Protocol</span>
                                    <span className="font-mono text-xs font-bold text-foreground">{item.syncSpeed} • {item.protocols}</span>
                                </div>
                                <a
                                    href={item.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-cta hover:text-cta/80 transition-colors"
                                >
                                    Docs <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Developer Webhook Payload Preview Drawer */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 border-t border-border/40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-5 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold">
                            <Terminal className="w-3.5 h-3.5" /> Developer Webhook Engine
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">
                            Clean JSON Call Payloads for Any Backend
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Receive structured call recordings, transcripts, user sentiment, and extracted booking parameters on your own API endpoint instantly after call completion.
                        </p>
                        <div className="pt-2">
                            <a
                                href="https://docs.dograh.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-bold text-foreground hover:text-cta transition-colors"
                            >
                                Read API & Webhook Specs <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-3 font-mono text-xs text-zinc-300 overflow-x-auto">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-zinc-500 text-[11px]">
                                <span>POST /webhooks/nova-call-completed</span>
                                <span>200 OK • 42ms</span>
                            </div>
                            <pre className="text-emerald-400 text-[11px] leading-relaxed">
{`{
  "event": "call.completed",
  "call_id": "call_9042_grand_horizon",
  "duration_seconds": 114,
  "caller": "+1 (800) 482-9012",
  "sentiment": "high_intent_booking",
  "extracted_slots": {
    "guest_name": "Sarah Jenkins",
    "nights": 2,
    "check_in": "2026-02-06",
    "pms_reservation_id": "GH-9042"
  },
  "recording_url": "https://s3.nova.ai/recordings/call_9042.mp3"
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA Banner */}
            <section className="border-t border-border/40 py-24 bg-gradient-to-b from-background via-muted/30 to-background text-center">
                <div className="max-w-3xl mx-auto px-6 space-y-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Ready to connect your enterprise stack?</h2>
                    <p className="text-sm text-muted-foreground">Configure your AI voice agent with native telephony, models, and CRMs in minutes.</p>
                    <Link
                        href="/auth/signup"
                        className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                    >
                        Get Started Free
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
