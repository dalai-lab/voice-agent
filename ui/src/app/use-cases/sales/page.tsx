"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Calendar, Check, CheckCircle2, ChevronRight, Clock, Database, DollarSign, Globe, Layers, MessageSquare, Mic, Phone, PhoneCall, PhoneIncoming, Radio, Shield, Sparkles, Star, TrendingUp, UserCheck, Users, Workflow, XCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

// ROI Matrix Data for 4 Team Profiles
const ROI_TEAMS = [
    {
        id: "agency",
        name: "Boutique Agency",
        sub: "1–5 Reps • ~50 Calls/mo",
        missed: "15 Leads",
        demos: "+10 Demos/mo",
        recovered: "$36,000 / yr",
        avgDeal: "$3,600"
    },
    {
        id: "midmarket",
        name: "Mid-Market SaaS",
        sub: "6–20 Reps • ~200 Calls/mo",
        missed: "60 Leads",
        demos: "+42 Demos/mo",
        recovered: "$180,000 / yr",
        avgDeal: "$4,200"
    },
    {
        id: "enterprise",
        name: "Enterprise Sales",
        sub: "20+ Reps • ~600 Calls/mo",
        missed: "180 Leads",
        demos: "+125 Demos/mo",
        recovered: "$750,000 / yr",
        avgDeal: "$6,000"
    },
    {
        id: "b2c",
        name: "High-Volume B2C",
        sub: "Consumer Services • ~1,000 Calls/mo",
        missed: "320 Leads",
        demos: "+210 Appointments/mo",
        recovered: "$420,000 / yr",
        avgDeal: "$2,000"
    }
];

export default function SalesUseCasePage() {
    const [selectedRoi, setSelectedRoi] = useState(ROI_TEAMS[1]); // Default Mid-Market

    return (
        <div className="w-full min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background overflow-x-clip">
            
            {/* ------------------------------------------------------------- */}
            {/* TOP NAVIGATION HEADER */}
            {/* ------------------------------------------------------------- */}
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
                    <BrandLogo className="text-xl font-bold tracking-tight text-foreground" />
                    <div className="flex items-center gap-6 text-xs font-medium">
                        <Link href="/" className="hover:text-foreground/80 transition-colors">Home</Link>
                        <Link href="/#use-cases" className="hover:text-foreground/80 transition-colors">All Use Cases</Link>
                        <Link href="/#pricing" className="hover:text-foreground/80 transition-colors">Pricing</Link>
                        <ThemeToggle variant="ghost" size="icon" className="h-8 w-8 rounded-full text-foreground hover:bg-muted" />
                        <Link
                            href="/auth/signup?industry=sales"
                            className="h-8 px-4 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                            Deploy Sales Agent <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: CENTERED CINEMATIC HERO (UNIQUE ARCHITECTURE) */}
            {/* ------------------------------------------------------------- */}
            <section className="relative pt-16 pb-20 px-6 lg:px-12 border-b border-border/40 bg-gradient-to-b from-background via-muted/20 to-background text-center">
                <div className="max-w-4xl mx-auto space-y-6">
                    
                    {/* Centered Pill */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <PhoneCall className="w-3.5 h-3.5 text-sky-500" /> Phone Sales Agent for Revenue Teams
                    </div>

                    {/* Massive Centered Headline */}
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05] max-w-3xl mx-auto">
                        The 5-Minute Lead Rule Just Became Irrelevant.
                    </h1>

                    {/* Subhead */}
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                        Nova answers inbound sales phone calls on the 1st ring, qualifies buyer intent and budget, and locks meetings on your calendar. Zero missed leads. Zero delay.
                    </p>

                    {/* Centered Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=sales"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Phone className="w-4 h-4" />
                            Start Capturing Leads
                        </Link>
                        <a
                            href="#pipeline-leak"
                            className="inline-flex items-center justify-center h-12 px-7 rounded-full text-xs font-semibold border border-border bg-card/80 backdrop-blur-md hover:bg-muted/60 transition-all text-foreground"
                        >
                            Explore Pipeline Impact
                        </a>
                    </div>
                </div>

                {/* Ultra-Wide Cinematic Image with Overlaid Static UI Cards */}
                <div className="max-w-6xl mx-auto mt-14 relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card min-h-[460px] lg:min-h-[540px] flex items-end p-6 sm:p-10">
                    
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center filter brightness-[0.7] contrast-[1.05]"
                        style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop')`
                        }}
                    />
                    
                    {/* Subtle Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                    {/* Floating Static Overlay Cards Layout (Grid of 3 minimal cards) */}
                    <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        
                        {/* Card 1: Static Dialogue Snippet */}
                        <div className="p-4 rounded-2xl bg-zinc-950/90 text-white backdrop-blur-md border border-white/10 space-y-2 text-xs shadow-lg">
                            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold">
                                <span>INBOUND CALL</span>
                                <span>1ST RING PICKUP</span>
                            </div>
                            <p className="text-zinc-300 font-medium leading-relaxed">
                                <strong className="text-white">Prospect:</strong> "We need 50 seats for our sales team next month."
                            </p>
                            <p className="text-emerald-300 font-medium leading-relaxed">
                                <strong className="text-white">Nova:</strong> "I've locked in a demo with our VP of Sales for tomorrow at 10 AM."
                            </p>
                        </div>

                        {/* Card 2: Qualification Scorecard */}
                        <div className="p-4 rounded-2xl bg-zinc-950/90 text-white backdrop-blur-md border border-white/10 space-y-2 text-xs shadow-lg">
                            <div className="flex items-center justify-between text-[10px] font-mono text-sky-400 font-bold">
                                <span>BUYER QUALIFIED</span>
                                <span>100% SCORE</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-zinc-300">
                                <div className="flex justify-between"><span>Budget ($15k+):</span> <span className="text-emerald-400 font-bold">✓ Verified</span></div>
                                <div className="flex justify-between"><span>Timeline:</span> <span className="text-white font-bold">Immediate</span></div>
                                <div className="flex justify-between"><span>Decision Maker:</span> <span className="text-white font-bold">Yes (VP RevOps)</span></div>
                            </div>
                        </div>

                        {/* Card 3: Calendar Confirmation */}
                        <div className="p-4 rounded-2xl bg-zinc-950/90 text-white backdrop-blur-md border border-white/10 space-y-2 text-xs shadow-lg">
                            <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold">
                                <span>CALENDAR LOCKED</span>
                                <span>AUTO-SYNCED</span>
                            </div>
                            <p className="text-white font-bold text-sm">Demo Confirmed</p>
                            <p className="text-zinc-400 text-[11px]">Tomorrow @ 10:00 AM • Account Executive Calendar</p>
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Zoom Invite Dispatched
                            </span>
                        </div>

                    </div>

                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: THE "PIPELINE LEAK" VISUALIZER */}
            {/* ------------------------------------------------------------- */}
            <section id="pipeline-leak" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <XCircle className="w-3.5 h-3.5" /> Where Revenue Dies
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        The Anatomy of a Missed Sales Call
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        Inbound phone leads drop off rapidly at three critical friction points. Nova eliminates all three.
                    </p>
                </div>

                {/* Horizontal Leak Flow Visualizer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    
                    {/* Leak Point 1 */}
                    <div className="p-7 rounded-3xl border border-rose-500/20 bg-rose-500/5 space-y-4 relative">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 font-bold text-sm">
                            01
                        </div>
                        <h3 className="text-lg font-bold text-foreground">After-Hours Inquiries</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Prospects calling after 5 PM or on weekends hit voicemail. 84% never leave a message and call a competitor instead.
                        </p>
                        <div className="pt-2 border-t border-rose-500/20 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Result: Lost to Competitor
                        </div>
                    </div>

                    {/* Leak Point 2 */}
                    <div className="p-7 rounded-3xl border border-rose-500/20 bg-rose-500/5 space-y-4 relative">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 font-bold text-sm">
                            02
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Peak Capacity Busy Signal</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            During team meetings or demo hours, inbound phone calls go unanswered. High-intent buyers don't wait for callbacks.
                        </p>
                        <div className="pt-2 border-t border-rose-500/20 text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Result: Cold Callback
                        </div>
                    </div>

                    {/* Solution Point 3 (Nova) */}
                    <div className="p-7 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 space-y-4 relative shadow-lg">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 font-bold text-sm">
                            ✓
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Nova Instant 1st-Ring Answer</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Nova handles unlimited simultaneous calls 24/7, qualifies the buyer in 60 seconds, and locks the meeting.
                        </p>
                        <div className="pt-2 border-t border-emerald-500/30 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Result: Demo Booked Instantly
                        </div>
                    </div>

                </div>

                {/* Bold Typographic Callout */}
                <div className="p-8 rounded-3xl bg-foreground text-background max-w-4xl mx-auto text-center space-y-3 shadow-2xl">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">THE STAT THAT MATTERS</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        "78% of B2B & B2C buyers purchase from the vendor that responds to their call first."
                    </h3>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: VERTICAL "24-HOUR SALES CYCLE" TIMELINE */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" /> 24-Hour Sales Automation
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        A Day in the Life of Nova Phone Sales
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        See how Nova manages lead flow across a full 24-hour cycle without human intervention.
                    </p>
                </div>

                {/* Vertical Timeline */}
                <div className="max-w-3xl mx-auto space-y-12 relative before:absolute before:inset-0 before:left-6 sm:before:left-1/2 before:-translate-x-px before:w-0.5 before:bg-border/60">
                    
                    {/* Time Block 1 */}
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pl-14 sm:pl-0">
                        <div className="absolute left-3.5 sm:left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background border-4 border-sky-500 z-10" />
                        <div className="sm:w-[45%] sm:text-right space-y-1">
                            <span className="text-xs font-mono font-bold text-sky-500">02:15 AM • Night Shift</span>
                            <h4 className="text-base font-bold text-foreground">Overseas Inbound Buyer Inquiry</h4>
                            <p className="text-xs text-muted-foreground">Prospect calls from another timezone asking about enterprise pricing.</p>
                        </div>
                        <div className="sm:w-[45%] p-4 rounded-2xl bg-card border border-border text-xs space-y-1.5 shadow-xs">
                            <p className="font-bold text-foreground">Nova Action:</p>
                            <p className="text-muted-foreground">"Answers call, confirms 50-seat budget fit, and books 10 AM morning demo on AE calendar."</p>
                        </div>
                    </div>

                    {/* Time Block 2 */}
                    <div className="relative flex flex-col sm:flex-row-reverse items-start sm:items-center justify-between gap-6 pl-14 sm:pl-0">
                        <div className="absolute left-3.5 sm:left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background border-4 border-emerald-500 z-10" />
                        <div className="sm:w-[45%] sm:text-left space-y-1">
                            <span className="text-xs font-mono font-bold text-emerald-500">08:30 AM • Morning Rush</span>
                            <h4 className="text-base font-bold text-foreground">AE Wakes Up to 3 New Booked Demos</h4>
                            <p className="text-xs text-muted-foreground">Calendar fully populated with pre-qualified discovery meetings before reps log in.</p>
                        </div>
                        <div className="sm:w-[45%] p-4 rounded-2xl bg-card border border-border text-xs space-y-1.5 shadow-xs">
                            <p className="font-bold text-foreground">System Action:</p>
                            <p className="text-muted-foreground">"Calendar invites and qualification summaries automatically synced to CRM."</p>
                        </div>
                    </div>

                    {/* Time Block 3 */}
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pl-14 sm:pl-0">
                        <div className="absolute left-3.5 sm:left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background border-4 border-amber-500 z-10" />
                        <div className="sm:w-[45%] sm:text-right space-y-1">
                            <span className="text-xs font-mono font-bold text-amber-500">01:45 PM • Peak Capacity Overflow</span>
                            <h4 className="text-base font-bold text-foreground">Entire Sales Team on Demo Calls</h4>
                            <p className="text-xs text-muted-foreground">High volume phone campaign generates 12 concurrent inbound calls simultaneously.</p>
                        </div>
                        <div className="sm:w-[45%] p-4 rounded-2xl bg-card border border-border text-xs space-y-1.5 shadow-xs">
                            <p className="font-bold text-foreground">Nova Action:</p>
                            <p className="text-muted-foreground">"Nova handles all 12 calls concurrently with 0 wait time, qualifying every single caller."</p>
                        </div>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 4: INTERACTIVE ROI MATRIX (GRID SELECTION) */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <TrendingUp className="w-3.5 h-3.5" /> Team Profile Impact
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Select Your Sales Team Profile
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        See real projected revenue recovery numbers tailored to your company scale.
                    </p>
                </div>

                {/* 2x2 Grid Selection */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                    {ROI_TEAMS.map((team) => (
                        <button
                            key={team.id}
                            onClick={() => setSelectedRoi(team)}
                            className={`p-6 rounded-2xl border text-left transition-all ${
                                selectedRoi.id === team.id
                                    ? "border-cta bg-cta/10 shadow-md ring-2 ring-cta/30"
                                    : "border-border bg-card hover:bg-muted/40"
                            }`}
                        >
                            <p className="text-xs font-bold text-foreground">{team.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{team.sub}</p>
                        </button>
                    ))}
                </div>

                {/* Selected ROI Scorecard Display */}
                <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-card border border-emerald-500/30 shadow-2xl grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                    <div className="space-y-1">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Captured Missed Leads</p>
                        <p className="text-3xl font-extrabold text-foreground">{selectedRoi.missed}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Additional Demos Booked</p>
                        <p className="text-3xl font-extrabold text-emerald-500">{selectedRoi.demos}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recovered Pipeline</p>
                        <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{selectedRoi.recovered}</p>
                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 5: CRM & ECOSYSTEM BLOCK (STATIC MINIMAL VISUAL) */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5" /> Workflow Integration
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Direct to Your CRM. Direct to Your Calendar.
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        Nova logs call recordings, buyer scores, and calendar invites straight into your existing stack.
                    </p>
                </div>

                {/* Static Integration Block */}
                <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-card border border-border shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="p-6 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
                        <Database className="w-6 h-6 text-cta mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Salesforce</h4>
                        <p className="text-[10px] text-muted-foreground">Auto-created leads & call logs</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
                        <Workflow className="w-6 h-6 text-emerald-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">HubSpot</h4>
                        <p className="text-[10px] text-muted-foreground">Instant deal stage updates</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
                        <Calendar className="w-6 h-6 text-sky-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Google Calendar</h4>
                        <p className="text-[10px] text-muted-foreground">AE demo lock & Zoom link</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
                        <MessageSquare className="w-6 h-6 text-amber-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Slack & Teams</h4>
                        <p className="text-[10px] text-muted-foreground">Instant hot lead alerts</p>
                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 6: EDITORIAL 50/50 COMPARISON SPLIT */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        The Executive Decision
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Why modern revenue teams are replacing traditional SDR cold-calling scripts with Nova phone agents.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    
                    {/* Left: Traditional SDR Model */}
                    <div className="p-8 rounded-3xl bg-muted/40 border border-border space-y-6">
                        <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">TRADITIONAL SDR MODEL</span>
                        <h3 className="text-xl font-bold text-foreground">High Cost, Inconsistent Callback Times</h3>
                        
                        <ul className="space-y-3 text-xs text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>$5,000 – $9,000 monthly cost per rep (salary, commissions, tools).</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>Inbound calls hit voicemail after business hours or during peak demo shifts.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>High turnover and rep-to-rep qualification variance.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Right: Nova Phone Sales Agent */}
                    <div className="p-8 rounded-3xl bg-foreground text-background space-y-6 shadow-2xl">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">NOVA PHONE SALES AGENT</span>
                        <h3 className="text-xl font-bold text-background">Instant 1st-Ring Answer, Flat Pricing</h3>
                        
                        <ul className="space-y-3 text-xs text-background/80">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span>Starts at $149/mo flat rate with zero commission overhead.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span>Answers every inbound call on the 1st ring 24/7/365.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span>100% qualification consistency with direct calendar booking.</span>
                            </li>
                        </ul>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 7: MINIMALIST CLOSING CTA */}
            {/* ------------------------------------------------------------- */}
            <section className="py-24 px-6 lg:px-12 bg-background text-center relative">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                        Stop letting your best leads go to voicemail.
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        Deploy your Nova phone sales agent today and start capturing every inbound lead on the first ring.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=sales"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Phone className="w-4 h-4" />
                            Start Capturing Leads Now
                        </Link>
                    </div>

                    <div className="pt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 10-Minute Setup</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancel Anytime</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited Inbound Calls</span>
                    </div>
                </div>
            </section>

        </div>
    );
}
