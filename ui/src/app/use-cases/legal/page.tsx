"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, Calendar, CheckCircle2, Clock, Database, FileText, Gavel, Globe, Key, Layers, Lock, MessageSquare, Phone, PhoneCall, PhoneIncoming, Radio, Scale, Shield, ShieldCheck, Sparkles, Star, UserCheck, Users, Workflow, XCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

export default function LegalUseCasePage() {
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
                            href="/auth/signup?industry=legal"
                            className="h-8 px-4 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                            Deploy Legal Agent <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: FULL-SCREEN CINEMATIC COVER HERO (PICTURE HEAVY) */}
            {/* ------------------------------------------------------------- */}
            <section className="relative min-h-[90vh] flex flex-col justify-between p-6 lg:p-16 border-b border-border/40 overflow-hidden">
                
                {/* Full-Screen Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center filter brightness-[0.55] contrast-[1.1]"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop')`
                    }}
                />
                
                {/* Gradient Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-zinc-950/70" />

                {/* Hero Header Content (Centered Top-Middle) */}
                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 pt-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Scale className="w-3.5 h-3.5 text-amber-400" /> Phone Agent for Law Firms & Legal Practice Groups
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
                        The Highest-Grossing Law Firms Don't Send Clients to Voicemail.
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                        Talkar answers every call on the 1st ring, gathers essential case details, checks conflicts, and locks high-value retainers on your calendar 24/7.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=legal"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Gavel className="w-4 h-4" />
                            Protect Your Retainers
                        </Link>
                        <a
                            href="#flow"
                            className="inline-flex items-center justify-center h-12 px-7 rounded-full text-xs font-semibold border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all text-white"
                        >
                            See Intake Flow
                        </a>
                    </div>
                </div>

                {/* Floating Glassmorphism Legal Intake Card (Anchored Bottom Center) */}
                <div className="relative z-10 max-w-2xl mx-auto w-full mt-12 p-6 rounded-3xl bg-zinc-950/85 text-white backdrop-blur-xl border border-white/15 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                                <PhoneCall className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Confidential Client Intake</p>
                                <p className="text-[10px] text-zinc-400">Personal Injury & Emergency Line</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            HIGH-VALUE INTAKE
                        </span>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                            <p className="text-[10px] font-mono text-zinc-400 font-semibold">CALLER (NEW CLIENT)</p>
                            <p className="text-zinc-200 font-medium">"I was just involved in a severe highway collision and need representation immediately."</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-1">
                            <p className="text-[10px] font-mono font-semibold text-amber-400">TALKAR LEGAL AGENT</p>
                            <p className="font-medium text-white">"I am so sorry to hear that. I have captured your incident details and am paging our senior personal injury partner right now to lock in your consultation."</p>
                        </div>
                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: HIGH-STAKES MASONRY IMAGE GRID (PICTURE HEAVY) */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Gavel className="w-3.5 h-3.5" /> High-Stakes Coverage
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Built for Every Legal Practice Area
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        Whether it's a 2:00 AM crisis or a corporate retainer inquiry, Talkar delivers flawless legal phone intake.
                    </p>
                </div>

                {/* Masonry Image Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-6xl mx-auto">
                    
                    {/* Tall Image Left (7 cols) */}
                    <div className="md:col-span-7 group relative rounded-3xl overflow-hidden border border-border/80 min-h-[420px] flex flex-col justify-end p-8 shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=900&auto=format&fit=crop"
                            alt="Legal Gavel and Books"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white uppercase tracking-wider">
                                24/7 CRISIS RESPONSE
                            </span>
                            <h3 className="text-2xl font-bold text-white">Criminal & DUI Defense Emergencies</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed max-w-md">
                                When a client calls from jail or an accident scene at 2:00 AM, Talkar answers immediately, gathers location info, and triggers an urgent partner alert.
                            </p>
                        </div>
                    </div>

                    {/* Right Stack (5 cols) */}
                    <div className="md:col-span-5 space-y-8 flex flex-col justify-between">
                        
                        {/* Top Card Right */}
                        <div className="group relative rounded-3xl overflow-hidden border border-border/80 min-h-[200px] flex flex-col justify-end p-6 shadow-md">
                            <img
                                src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop"
                                alt="Legal Consultation"
                                className="absolute inset-0 w-full h-full object-cover filter brightness-[0.65] group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                            
                            <div className="relative z-10 space-y-1 text-white">
                                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">EMPATHETIC INTAKE</span>
                                <h4 className="text-lg font-bold text-white">Personal Injury Intake</h4>
                                <p className="text-xs text-zinc-300">Detailed fact-gathering for high-value claims.</p>
                            </div>
                        </div>

                        {/* Bottom Card Right */}
                        <div className="group relative rounded-3xl overflow-hidden border border-border/80 min-h-[200px] flex flex-col justify-end p-6 shadow-md">
                            <img
                                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop"
                                alt="Modern Law Firm Office"
                                className="absolute inset-0 w-full h-full object-cover filter brightness-[0.65] group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                            
                            <div className="relative z-10 space-y-1 text-white">
                                <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">CONSULTATION LOCK</span>
                                <h4 className="text-lg font-bold text-white">Corporate & Estate Law</h4>
                                <p className="text-xs text-zinc-300">Securing paid retainers and calendar appointments.</p>
                            </div>
                        </div>

                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: THE "COST OF A RETAINER" TYPOGRAPHIC BREAK */}
            {/* ------------------------------------------------------------- */}
            <section className="bg-foreground text-background py-24 px-6 lg:px-12 border-b border-border/40 text-center">
                <div className="max-w-4xl mx-auto space-y-8">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">THE REAL COST OF A MISSED CALL</span>

                    <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
                        "One missed phone call at 2:00 AM isn't just a missed message. It's a $25,000 retainer walking to your competitor."
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-background/20 text-center">
                        <div>
                            <h3 className="text-4xl font-extrabold text-amber-400">$25,000+</h3>
                            <p className="text-xs text-background/80 mt-1">Average Lost Case Retainer Value</p>
                        </div>
                        <div>
                            <h3 className="text-4xl font-extrabold text-amber-400">100%</h3>
                            <p className="text-xs text-background/80 mt-1">1st-Ring Answer Rate (Day or Night)</p>
                        </div>
                        <div>
                            <h3 className="text-4xl font-extrabold text-amber-400">&lt; 3 Mins</h3>
                            <p className="text-xs text-background/80 mt-1">Emergency Attorney Paging Speed</p>
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 4: THE HORIZONTAL LEGAL INTAKE FLOW */}
            {/* ------------------------------------------------------------- */}
            <section id="flow" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Workflow className="w-3.5 h-3.5" /> Structured Intake
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        How Talkar Manages Every Legal Call
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        From initial ring to conflict checking and partner dispatch in four structured steps.
                    </p>
                </div>

                {/* Horizontal Step Flow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    
                    {/* Step 1 */}
                    <div className="p-6 rounded-3xl border border-border bg-card space-y-3 relative shadow-xs">
                        <span className="w-8 h-8 rounded-full bg-cta/10 text-cta font-bold text-xs flex items-center justify-center border border-cta/20">1</span>
                        <h3 className="text-sm font-bold text-foreground">1st Ring Pickup</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                             Talkar greets the caller professionally with your firm's customized legal intake script.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="p-6 rounded-3xl border border-border bg-card space-y-3 relative shadow-xs">
                        <span className="w-8 h-8 rounded-full bg-cta/10 text-cta font-bold text-xs flex items-center justify-center border border-cta/20">2</span>
                        <h3 className="text-sm font-bold text-foreground">Practice Area Routing</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Determines if the call is Personal Injury, Criminal Defense, Family Law, or Commercial.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-6 rounded-3xl border border-border bg-card space-y-3 relative shadow-xs">
                        <span className="w-8 h-8 rounded-full bg-cta/10 text-cta font-bold text-xs flex items-center justify-center border border-cta/20">3</span>
                        <h3 className="text-sm font-bold text-foreground">Conflict Fact Capture</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Collects caller name, opposing party, and incident date for initial conflict evaluation.
                        </p>
                    </div>

                    {/* Step 4 */}
                    <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 space-y-3 relative shadow-md">
                        <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">4</span>
                        <h3 className="text-sm font-bold text-foreground">Retainer / Consultation Lock</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Schedules consultation on attorney calendar or triggers an emergency partner page.
                        </p>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 5: CONFIDENTIALITY & PRIVACY VAULT (LEGAL FOCUS) */}
            {/* ------------------------------------------------------------- */}
            <section className="bg-zinc-950 text-white py-24 px-6 lg:px-12 border-b border-border/40">
                <div className="max-w-6xl mx-auto space-y-16">
                    
                    <div className="max-w-3xl mx-auto text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold uppercase tracking-wider">
                            <Lock className="w-3.5 h-3.5 text-amber-400" /> Confidentiality Standard
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
                            Protected Confidentiality & Legal Ecosystem Sync
                        </h2>
                        <p className="text-base text-zinc-400 max-w-lg mx-auto">
                            Strict data encryption, zero training on private client calls, and native legal CRM integration.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        
                        <div className="p-7 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                            <ShieldCheck className="w-7 h-7 text-amber-400" />
                            <h4 className="text-base font-bold text-white">Privilege Protection</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Audio recordings and intake notes are strictly isolated. No data is ever retained for public model training.
                            </p>
                        </div>

                        <div className="p-7 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                            <Key className="w-7 h-7 text-amber-400" />
                            <h4 className="text-base font-bold text-white">AES-256 Encryption</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Enterprise-grade encryption standards protecting client communication in transit and at rest.
                            </p>
                        </div>

                        <div className="p-7 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                            <Database className="w-7 h-7 text-amber-400" />
                            <h4 className="text-base font-bold text-white">Clio & MyCase Integration</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Automatically creates new matter drafts and syncs intake transcripts into Clio, MyCase, or Filevine.
                            </p>
                        </div>

                    </div>

                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 6: IMAGE-BACKED CLOSING CTA (PICTURE HEAVY) */}
            {/* ------------------------------------------------------------- */}
            <section className="relative py-32 px-6 lg:px-12 text-center overflow-hidden border-t border-border/40">
                
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center filter brightness-[0.4] contrast-[1.15]"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop')`
                    }}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/80" />

                <div className="max-w-4xl mx-auto space-y-8 relative z-10 text-white">
                    <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                        Stop losing high-value cases to the firm that picks up first.
                    </h2>
                    
                    <p className="text-base text-zinc-300 max-w-xl mx-auto">
                        Deploy your firm's custom legal phone agent in under 10 minutes and protect every incoming retainer.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=legal"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Gavel className="w-4 h-4" />
                            Deploy Legal Phone Agent Now
                        </Link>
                    </div>

                    <div className="pt-4 flex items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Clio / MyCase Sync</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-400" /> 24/7 Crisis Paging</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Cancel Anytime</span>
                    </div>
                </div>

            </section>

        </div>
    );
}
