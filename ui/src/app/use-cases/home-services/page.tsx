"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, Calendar, CheckCircle2, Clock, Database, HardHat, Home, Key, Layers, Lock, MapPin, MessageSquare, Phone, PhoneCall, PhoneIncoming, Radio, Shield, ShieldCheck, Sparkles, Star, Truck, UserCheck, Users, Wrench, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

export default function HomeServicesUseCasePage() {
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
                            href="/auth/signup?industry=home-services"
                            className="h-8 px-4 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                            Deploy Dispatch Agent <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: EMERGENCY DISPATCH COVER HERO (PICTURE HEAVY) */}
            {/* ------------------------------------------------------------- */}
            <section className="relative min-h-[90vh] flex flex-col justify-between p-6 lg:p-16 border-b border-border/40 overflow-hidden bg-zinc-950">
                
                {/* Full-Screen Trade Background Photo */}
                <div
                    className="absolute inset-0 bg-cover bg-center filter brightness-[0.5] contrast-[1.1]"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1600&auto=format&fit=crop')`
                    }}
                />
                
                {/* Gradient Overlay Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/80" />

                {/* Hero Header Content */}
                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 pt-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Wrench className="w-3.5 h-3.5 text-amber-400" /> 24/7 Dispatch Phone Agent for Contractors
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
                        When a Pipe Bursts at 11 PM, the First Contractor Who Answers Gets the Job.
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                        Nova answers every emergency service call on the 1st ring, logs job locations, dispatches on-call technicians, and locks service windows 24/7.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=home-services"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Truck className="w-4 h-4" />
                            Stop Losing Emergency Jobs
                        </Link>
                        <a
                            href="#software"
                            className="inline-flex items-center justify-center h-12 px-7 rounded-full text-xs font-semibold border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all text-white"
                        >
                            See Software Sync
                        </a>
                    </div>
                </div>

                {/* Floating Glassmorphism Emergency Dispatch Card */}
                <div className="relative z-10 max-w-2xl mx-auto w-full mt-12 p-6 rounded-3xl bg-zinc-950/85 text-white backdrop-blur-xl border border-white/15 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                                <PhoneCall className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">Emergency Dispatch Call</p>
                                <p className="text-[10px] text-zinc-400">After-Hours HVAC & Plumbing Line</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> TECH DISPATCHED
                        </span>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                            <p className="text-[10px] font-mono text-zinc-400 font-semibold">CALLER (HOMEOWNER)</p>
                            <p className="text-zinc-200 font-medium">"My central AC unit completely stopped working and it's 92 degrees in the house."</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 space-y-1">
                            <p className="text-[10px] font-mono font-semibold text-amber-400">NOVA DISPATCH AGENT</p>
                            <p className="font-medium text-white">"I have logged your address and booked an emergency arrival window for tomorrow between 8:00 AM and 10:00 AM. Our on-call technician has been alerted."</p>
                        </div>
                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: THE 4-TRADE PORTFOLIO GRID (PICTURE HEAVY) */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <HardHat className="w-3.5 h-3.5" /> Tailored for Contractors
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Built for Every Field Service Trade
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        High-value emergency handling and job estimate booking customized to your trade business.
                    </p>
                </div>

                {/* 4-Card Picture Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    
                    {/* Card 1: Emergency Plumbing */}
                    <div className="group relative rounded-3xl overflow-hidden border border-border/80 min-h-[320px] flex flex-col justify-end p-8 shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=800&auto=format&fit=crop"
                            alt="Plumber Working"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white uppercase tracking-wider">
                                PLUMBING & WATER LEAKS
                            </span>
                            <h3 className="text-2xl font-bold text-white">Emergency Plumbing Dispatch</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Burst pipes, main line clogs, and water heater failures. Nova captures address info and alerts your on-call plumber instantly.
                            </p>
                        </div>
                    </div>

                    {/* Card 2: HVAC & Climate Control */}
                    <div className="group relative rounded-3xl overflow-hidden border border-border/80 min-h-[320px] flex flex-col justify-end p-8 shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop"
                            alt="HVAC Technician"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-500 text-white uppercase tracking-wider">
                                HVAC & HEATING / COOLING
                            </span>
                            <h3 className="text-2xl font-bold text-white">AC & Furnace Repair Scheduling</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Summer heatwaves and winter freeze emergencies. Nova schedules arrival windows directly into your dispatcher calendar.
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Electrical Services */}
                    <div className="group relative rounded-3xl overflow-hidden border border-border/80 min-h-[320px] flex flex-col justify-end p-8 shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=800&auto=format&fit=crop"
                            alt="Electrician at Work"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-white uppercase tracking-wider">
                                ELECTRICAL & POWER
                            </span>
                            <h3 className="text-2xl font-bold text-white">Electrical & Panel Upgrades</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Outages, panel upgrades, and EV charger installations. Nova qualifies homeowner scope and schedules on-site estimates.
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Roofing & Contracting */}
                    <div className="group relative rounded-3xl overflow-hidden border border-border/80 min-h-[320px] flex flex-col justify-end p-8 shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?q=80&w=800&auto=format&fit=crop"
                            alt="Roofing Contractor"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white uppercase tracking-wider">
                                ROOFING & CONTRACTING
                            </span>
                            <h3 className="text-2xl font-bold text-white">Storm Damage & Roof Estimates</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Storm restoration calls and roof replacement inquiries. Nova locks in site inspection appointments before callers reach competitors.
                            </p>
                        </div>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: THE "3-MINUTE RULE" DISPATCH SPEED STRIP */}
            {/* ------------------------------------------------------------- */}
            <section className="bg-foreground text-background py-24 px-6 lg:px-12 border-b border-border/40 text-center">
                <div className="max-w-4xl mx-auto space-y-8">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">THE SPEED-TO-DISPATCH ADVANTAGE</span>

                    <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
                        "Average Homeowner Wait Time Before Calling the Next Contractor on Google: 3 Minutes."
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-background/20 text-center">
                        <div>
                            <h3 className="text-4xl font-extrabold text-amber-400">$1,200 – $8,500</h3>
                            <p className="text-xs text-background/80 mt-1">Average Home Service Job Value</p>
                        </div>
                        <div>
                            <h3 className="text-4xl font-extrabold text-amber-400">100%</h3>
                            <p className="text-xs text-background/80 mt-1">1st-Ring Pickup (24/7/365)</p>
                        </div>
                        <div>
                            <h3 className="text-4xl font-extrabold text-amber-400">&lt; 60 Secs</h3>
                            <p className="text-xs text-background/80 mt-1">Job Details & Arrival Window Lock</p>
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 4: THE 4-STEP CALL-TO-DISPATCH WORKFLOW */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Wrench className="w-3.5 h-3.5" /> Automated Dispatch Sequence
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        From Customer Call to On-Call Tech Alert
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        How Nova captures job requests and alerts your field crew in four seamless steps.
                    </p>
                </div>

                {/* Horizontal Step Flow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    
                    <div className="p-6 rounded-3xl border border-border bg-card space-y-3 relative shadow-xs">
                        <span className="w-8 h-8 rounded-full bg-cta/10 text-cta font-bold text-xs flex items-center justify-center border border-cta/20">1</span>
                        <h3 className="text-sm font-bold text-foreground">1st Ring Emergency Pickup</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Nova picks up instantly with your business name and customized trade greeting.
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl border border-border bg-card space-y-3 relative shadow-xs">
                        <span className="w-8 h-8 rounded-full bg-cta/10 text-cta font-bold text-xs flex items-center justify-center border border-cta/20">2</span>
                        <h3 className="text-sm font-bold text-foreground">Job & Address Capture</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Collects caller name, service address, job description, and urgency level.
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl border border-border bg-card space-y-3 relative shadow-xs">
                        <span className="w-8 h-8 rounded-full bg-cta/10 text-cta font-bold text-xs flex items-center justify-center border border-cta/20">3</span>
                        <h3 className="text-sm font-bold text-foreground">Arrival Window Lock</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Schedules a morning or afternoon technician visit directly into your calendar.
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 space-y-3 relative shadow-md">
                        <span className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">4</span>
                        <h3 className="text-sm font-bold text-foreground">Software & Tech Dispatch</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Alerts your on-call tech via SMS and logs the new job directly into ServiceTitan or Jobber.
                        </p>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 5: FIELD SERVICE SOFTWARE ECOSYSTEM MAP */}
            {/* ------------------------------------------------------------- */}
            <section id="software" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5" /> Field Service Integrations
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Direct Sync with Your Field Service Software
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        Nova logs new jobs, caller details, and arrival windows straight into the software your team uses daily.
                    </p>
                </div>

                {/* Integration Cards Grid */}
                <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-card border border-border shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="p-5 rounded-2xl bg-muted/50 border border-border/60 space-y-1.5">
                        <Truck className="w-6 h-6 text-amber-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">ServiceTitan</h4>
                        <p className="text-[10px] text-muted-foreground">Auto Job & Booking Creation</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-muted/50 border border-border/60 space-y-1.5">
                        <Home className="w-6 h-6 text-amber-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Housecall Pro</h4>
                        <p className="text-[10px] text-muted-foreground">Estimate & Schedule Sync</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-muted/50 border border-border/60 space-y-1.5">
                        <Wrench className="w-6 h-6 text-amber-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Jobber</h4>
                        <p className="text-[10px] text-muted-foreground">Client & Job Logging</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-muted/50 border border-border/60 space-y-1.5">
                        <Calendar className="w-6 h-6 text-amber-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Workiz & Google</h4>
                        <p className="text-[10px] text-muted-foreground">Technician Calendar Lock</p>
                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 6: FLEET-BACKED CLOSING CTA (PICTURE HEAVY) */}
            {/* ------------------------------------------------------------- */}
            <section className="relative py-32 px-6 lg:px-12 text-center overflow-hidden border-t border-border/40">
                
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center filter brightness-[0.4] contrast-[1.15]"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop')`
                    }}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/80" />

                <div className="max-w-4xl mx-auto space-y-8 relative z-10 text-white">
                    <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                        Never lose another high-value emergency job to voicemail.
                    </h2>
                    
                    <p className="text-base text-zinc-300 max-w-xl mx-auto">
                        Deploy your 24/7 phone dispatch agent in under 10 minutes and start securing emergency jobs around the clock.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=home-services"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Truck className="w-4 h-4" />
                            Deploy Dispatch Phone Agent Now
                        </Link>
                    </div>

                    <div className="pt-4 flex items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-400" /> ServiceTitan Sync</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-400" /> On-Call Tech SMS Alerts</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Cancel Anytime</span>
                    </div>
                </div>

            </section>

        </div>
    );
}
