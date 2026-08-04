"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, AlertCircle, ArrowRight, Building2, Calendar, Check, CheckCircle2, ChevronRight, Clock, Database, Heart, HeartPulse, Hospital, Key, Layers, Lock, MessageSquare, Mic, Phone, PhoneCall, PhoneIncoming, Radio, Shield, ShieldCheck, Sparkles, Star, Stethoscope, UserCheck, Users, Workflow, XCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

export default function MedicalUseCasePage() {
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
                            href="/auth/signup?industry=medical"
                            className="h-8 px-4 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                            Deploy Medical Agent <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: TOP/BOTTOM SPLIT HERO (UNIQUE MEDICAL FORMAT) */}
            {/* ------------------------------------------------------------- */}
            <section className="relative pt-16 pb-12 px-6 lg:px-12 border-b border-border/40 bg-gradient-to-b from-background via-muted/20 to-background text-center">
                
                {/* Top Half: Massive Typography */}
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-500" /> HIPAA-Compliant Phone Agent for Healthcare
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05] max-w-4xl mx-auto">
                        Your Front Desk Is Overwhelmed. Your Patients Are on Hold.
                    </h1>

                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                        Nova answers every incoming patient phone call on the 1st ring, schedules appointments into your EMR, and handles reschedules 24/7 — fully HIPAA compliant.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=medical"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Stethoscope className="w-4 h-4" />
                            Automate Patient Intake
                        </Link>
                        <a
                            href="#compliance"
                            className="inline-flex items-center justify-center h-12 px-7 rounded-full text-xs font-semibold border border-border bg-card/80 backdrop-blur-md hover:bg-muted/60 transition-all text-foreground"
                        >
                            See HIPAA & BAA Details
                        </a>
                    </div>
                </div>

                {/* Bottom Half: Full-Width Cinematic Clinic Photo with Patient Intake Overlay */}
                <div className="max-w-6xl mx-auto mt-14 relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card min-h-[460px] lg:min-h-[520px] flex items-end p-6 sm:p-10">
                    
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center filter brightness-[0.75] contrast-[1.05]"
                        style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop')`
                        }}
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                    {/* Centered Overlay Card: Static Patient Dialogue & Intake */}
                    <div className="relative z-10 w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-zinc-950/90 text-white backdrop-blur-xl border border-white/15 shadow-2xl space-y-4 text-left">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Patient Intake & Scheduling</p>
                                    <p className="text-[10px] text-zinc-400">Direct EMR Appointment Lock</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> HIPAA SECURED
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <p className="text-[10px] font-mono text-zinc-400 font-semibold">PATIENT</p>
                                <p className="text-zinc-200 font-medium">"Hi, I need to schedule a routine dental checkup and cleaning for next week."</p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-200 space-y-1">
                                <p className="text-[10px] font-mono font-semibold text-teal-400">NOVA MEDICAL AGENT</p>
                                <p className="font-medium text-white">"I can schedule that for you right now. Dr. Miller has an opening next Thursday at 2:00 PM. Would that work for your schedule?"</p>
                            </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/10">
                            <span className="flex items-center gap-1.5 text-white">
                                <CheckCircle2 className="w-4 h-4 text-teal-400" /> Patient Record & EMR Calendar Updated Instantly
                            </span>
                        </div>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: THE "PATIENT LIFETIME VALUE" WATERFALL */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5" /> The Cost of Unanswered Calls
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        A Missed Call Isn't Just a Missed Phone Ring. It's a Lost Patient.
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        Patients calling a medical office rarely leave voicemails. They simply hang up and call the next clinic down the street.
                    </p>
                </div>

                {/* Step-Down LTV Waterfall Visual */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    
                    <div className="p-7 rounded-3xl border border-rose-500/20 bg-rose-500/5 space-y-4">
                        <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">STAGE 01 • THE CALL</span>
                        <h3 className="text-lg font-bold text-foreground">Phone Rings Unanswered</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Front desk staff is busy checking in a patient. The phone rings 5 times and goes to voicemail.
                        </p>
                        <p className="text-xs font-bold text-rose-500 pt-2 border-t border-rose-500/20">
                            68% of patients do not leave voicemails.
                        </p>
                    </div>

                    <div className="p-7 rounded-3xl border border-rose-500/20 bg-rose-500/5 space-y-4">
                        <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">STAGE 02 • THE DEFLECTION</span>
                        <h3 className="text-lg font-bold text-foreground">Patient Calls Next Practice</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            The prospective patient searches Google for the next available clinic and books elsewhere immediately.
                        </p>
                        <p className="text-xs font-bold text-rose-500 pt-2 border-t border-rose-500/20">
                            Immediate lost acquisition cost.
                        </p>
                    </div>

                    <div className="p-7 rounded-3xl border border-teal-500/40 bg-teal-500/10 space-y-4 shadow-lg">
                        <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">STAGE 03 • THE SOLUTION</span>
                        <h3 className="text-lg font-bold text-foreground">Nova Captures 100% of Calls</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Nova answers on the 1st ring, collects basic info, and locks the appointment directly into your calendar.
                        </p>
                        <p className="text-xs font-bold text-teal-600 dark:text-teal-400 pt-2 border-t border-teal-500/30">
                            +$4,500 Saved in Patient Lifetime Value (LTV).
                        </p>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: TRI-PANEL VERTICAL "PATIENT JOURNEY" CARDS */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <HeartPulse className="w-3.5 h-3.5" /> Patient Experience
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Three Core Call Flows Handled Flawlessly
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        Designed specifically for private practices, dental clinics, and specialty medical centers.
                    </p>
                </div>

                {/* 3 Tall Vertical Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    
                    {/* Card 1 */}
                    <div className="p-8 rounded-3xl border border-border bg-card space-y-6 flex flex-col justify-between shadow-xs">
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-teal-500 uppercase tracking-widest">FLOW 01</span>
                            <h3 className="text-xl font-bold text-foreground">New Patient Intake & Scheduling</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Nova answers new patient calls, collects contact details, verifies general insurance coverage, and books an initial consultation.
                            </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-muted/60 text-[11px] text-muted-foreground font-medium border border-border/40">
                            "Books appointments directly into EMR scheduling slots."
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="p-8 rounded-3xl border border-border bg-card space-y-6 flex flex-col justify-between shadow-xs">
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-cta/10 text-cta border border-cta/20 flex items-center justify-center font-bold">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-cta uppercase tracking-widest">FLOW 02</span>
                            <h3 className="text-xl font-bold text-foreground">Reschedules & Cancellation Fills</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                When a patient calls to cancel, Nova instantly offers the newly opened appointment slot to waiting patients on the schedule list.
                            </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-muted/60 text-[11px] text-muted-foreground font-medium border border-border/40">
                            "Prevents empty chair time and lost clinical revenue."
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="p-8 rounded-3xl border border-border bg-card space-y-6 flex flex-col justify-between shadow-xs">
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
                                <Stethoscope className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">FLOW 03</span>
                            <h3 className="text-xl font-bold text-foreground">Urgent Care Triage & Escalation</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Nova detects urgent medical keywords during calls and immediately transfers the caller to your on-call triage nurse or doctor.
                            </p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-muted/60 text-[11px] text-muted-foreground font-medium border border-border/40">
                            "Priority emergency routing based on practice rules."
                        </div>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 4: THE HIPAA COMPLIANCE & SECURITY VAULT */}
            {/* ------------------------------------------------------------- */}
            <section id="compliance" className="bg-zinc-950 text-white py-24 px-6 lg:px-12 border-b border-border/40">
                <div className="max-w-6xl mx-auto space-y-16">
                    
                    <div className="max-w-3xl mx-auto text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono font-semibold uppercase tracking-wider">
                            <Shield className="w-3.5 h-3.5 text-teal-400" /> Enterprise Health Security
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
                            HIPAA Compliant. Built for Patient Privacy.
                        </h2>
                        <p className="text-base text-zinc-400 max-w-lg mx-auto">
                            Strict data isolation and security standards designed specifically for medical covered entities.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <Lock className="w-6 h-6 text-teal-400" />
                            <h4 className="text-sm font-bold text-white">HIPAA Compliant</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Fully aligned with HIPAA Privacy and Security rules for handling Protected Health Information (PHI).
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <ShieldCheck className="w-6 h-6 text-teal-400" />
                            <h4 className="text-sm font-bold text-white">BAA Agreement Included</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                We execute Business Associate Agreements (BAAs) for all medical practices and health systems.
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <Key className="w-6 h-6 text-teal-400" />
                            <h4 className="text-sm font-bold text-white">End-to-End Encryption</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Encrypted in transit and at rest using AES-256 standards with zero local edge retention.
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <Database className="w-6 h-6 text-teal-400" />
                            <h4 className="text-sm font-bold text-white">Zero Data Mining</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Patient call audio and transcripts are strictly private and never used for public AI training.
                            </p>
                        </div>

                    </div>

                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 5: EMR & SCHEDULING ECOSYSTEM MAP */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5" /> EMR Systems
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Direct Sync with Your Practice EMR
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        Nova integrates with leading Electronic Medical Record and scheduling platforms.
                    </p>
                </div>

                {/* EMR Grid */}
                <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-card border border-border shadow-xl grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-1">
                        <Hospital className="w-5 h-5 text-teal-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Epic</h4>
                        <p className="text-[10px] text-muted-foreground">Direct Scheduling</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-1">
                        <Activity className="w-5 h-5 text-teal-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Athenahealth</h4>
                        <p className="text-[10px] text-muted-foreground">Patient Sync</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-1">
                        <Stethoscope className="w-5 h-5 text-teal-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Cerner</h4>
                        <p className="text-[10px] text-muted-foreground">Appointment Lock</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-1">
                        <HeartPulse className="w-5 h-5 text-teal-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Dentrix</h4>
                        <p className="text-[10px] text-muted-foreground">Dental Scheduling</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-1 col-span-2 md:col-span-1">
                        <Calendar className="w-5 h-5 text-teal-500 mx-auto" />
                        <h4 className="text-xs font-bold text-foreground">Jane App</h4>
                        <p className="text-[10px] text-muted-foreground">Clinic Calendar</p>
                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 6: CHAOS VS CALM EDITORIAL SPLIT */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Bring Calm to Your Waiting Room
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Let your front desk staff focus on the patients standing right in front of them.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    
                    {/* Left: Overwhelmed Front Desk */}
                    <div className="p-8 rounded-3xl bg-muted/40 border border-border space-y-6">
                        <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">TRADITIONAL PRACTICE PHONES</span>
                        <h3 className="text-xl font-bold text-foreground">Ringing Phones & Stressed Staff</h3>
                        
                        <ul className="space-y-3 text-xs text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>Front desk staff split between in-person patient check-in and ringing phones.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>Long hold times cause frustrated patients to hang up and call competitors.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>Uncovered lunch hours and after-hours lead to zero patient bookings.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Right: Nova Medical Agent */}
                    <div className="p-8 rounded-3xl bg-foreground text-background space-y-6 shadow-2xl">
                        <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest">NOVA MEDICAL PHONE AGENT</span>
                        <h3 className="text-xl font-bold text-background">Quiet Reception & 100% Booking Rate</h3>
                        
                        <ul className="space-y-3 text-xs text-background/80">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                                <span>Nova handles 100% of phone intake and scheduling in the background.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                                <span>Zero hold times for calling patients with instant 1st-ring answers.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                                <span>24/7/365 availability with full HIPAA compliance & EMR integration.</span>
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
                        Bring calm to your waiting room today.
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        Deploy your HIPAA-compliant Nova phone agent and capture every prospective patient call.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=medical"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Stethoscope className="w-4 h-4" />
                            Automate Patient Intake Now
                        </Link>
                    </div>

                    <div className="pt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-500" /> HIPAA Compliant</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-500" /> BAA Included</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-500" /> 24/7 EMR Sync</span>
                    </div>
                </div>
            </section>

        </div>
    );
}
