"use client";

import { ArrowRight, Check, X, Sparkles, PhoneCall, Shield, Cpu, Zap, Layers, Hotel, Building2, Stethoscope, Scale, Wrench, ChevronRight, Phone, PhoneOff, MessageSquare, CheckCircle2, Video, Calendar, Image as ImageIcon, Camera, Mail, FileText, ListChecks, Clock, Newspaper, Tv, Radio, AppWindow, Globe, Workflow, Database, Bot, Briefcase } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";
import { useAuth } from "@/lib/auth";

const REALISTIC_VOICE_DEMO = [
    { speaker: "agent", text: "Hi! Thanks for calling Talkar. How can I assist your business today?" },
    { speaker: "customer", text: "Hi, I need to check availability for a suite booking this Friday." },
    { speaker: "agent", text: "I have 2 luxury suites open for Friday starting at $220/night. Shall I reserve one?" },
    { speaker: "customer", text: "Yes please, confirm for 2 nights under Alex Johnson." },
    { speaker: "agent", text: "Confirmed! Booking #8940 is set. A SMS confirmation was sent to your line." }
];

export default function LandingPage() {
    const { isAuthenticated, loading } = useAuth();
    const [turnIndex, setTurnIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState("");
    const [activeOutcome, setActiveOutcome] = useState(0);

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "-30% 0px -40% 0px",
            threshold: 0.2,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (entry.target.id === "outcome-step-0") setActiveOutcome(0);
                    if (entry.target.id === "outcome-step-1") setActiveOutcome(1);
                    if (entry.target.id === "outcome-step-2") setActiveOutcome(2);
                }
            });
        }, observerOptions);

        const step0 = document.getElementById("outcome-step-0");
        const step1 = document.getElementById("outcome-step-1");
        const step2 = document.getElementById("outcome-step-2");

        if (step0) observer.observe(step0);
        if (step1) observer.observe(step1);
        if (step2) observer.observe(step2);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let index = 0;
        const text = REALISTIC_VOICE_DEMO[turnIndex].text;
        setDisplayedText("");

        const timer = setInterval(() => {
            index++;
            setDisplayedText(text.substring(0, index));
            if (index >= text.length) {
                clearInterval(timer);
                const nextTimeout = setTimeout(() => {
                    setTurnIndex((prev) => (prev + 1) % REALISTIC_VOICE_DEMO.length);
                }, 2400);
                return () => clearTimeout(nextTimeout);
            }
        }, 28);

        return () => clearInterval(timer);
    }, [turnIndex]);

    return (
        <div className="w-full min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background transition-colors duration-150 overflow-x-clip">

            {/* ------------------------------------------------------------- */}
            {/* HERO SECTION (THEME-ADAPTIVE: LIGHT & DARK MODE) */}
            {/* ------------------------------------------------------------- */}
            <section className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 border-b border-border/40 bg-background text-foreground transition-colors">

                {/* Left Hero Column */}
                <div className="lg:col-span-6 p-8 lg:p-16 flex flex-col justify-between space-y-10 bg-background relative">
                    {/* Top Brand & Badge */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BrandLogo size="xl" className="tracking-tight text-foreground" />
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            AI Business Phone System
                        </div>
                    </div>

                    {/* Center Hero Copy */}
                    <div className="space-y-6 my-auto py-12 max-w-xl mx-auto text-center flex flex-col items-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-semibold">
                            <Sparkles className="w-3.5 h-3.5" />
                            Turn Calls Into Revenue
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08] text-center max-w-lg">
                            Never miss a business phone call again
                        </h1>

                        <p className="text-base text-muted-foreground max-w-md text-center leading-relaxed">
                            Intelligent AI callers handle customer bookings, answer inquiries, and follow up instantly. Ready for your business in days.
                        </p>

                        {/* Primary CTA Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                            {!loading && isAuthenticated ? (
                                <Link
                                    href="/overview"
                                    className="inline-flex items-center justify-center h-11 px-7 rounded-xl text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                                >
                                    Open Dashboard
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/signup"
                                        className="inline-flex items-center justify-center h-11 px-7 rounded-xl text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                                    >
                                        Book a Demo
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href="#pricing"
                                        className="inline-flex items-center justify-center h-11 px-7 rounded-xl text-xs font-semibold border border-border bg-muted/40 hover:bg-muted/70 transition-all text-foreground"
                                    >
                                        View Pricing
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bottom Trusted Logos Strip */}
                    <div className="pt-8 border-t border-border/60 space-y-3 text-center">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/60 text-center">
                            POWERING AUTOMATED CALLING ACROSS LEADING INDUSTRIES
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 hover:opacity-100 transition-all text-xs font-semibold text-muted-foreground">
                            <span>HOSPITALITY</span>
                            <span>HEALTHCARE</span>
                            <span>SALES & LEADS</span>
                            <span>PROFESSIONAL SERVICES</span>
                        </div>
                    </div>
                </div>

                {/* Right Column - Edge-to-Edge Unsplash Background Photo */}
                <div className="lg:col-span-6 relative flex flex-col justify-between p-8 lg:p-12 min-h-[600px] lg:min-h-screen overflow-hidden">
                    {/* Unsplash Photo Background */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.01]"
                        style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1559065188-2537766d864b?q=80&w=1200&auto=format&fit=crop')`
                        }}
                    />
                    {/* Adaptive Background Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/60 dark:from-zinc-950 dark:via-zinc-950/40 dark:to-zinc-950/60 backdrop-blur-[1px]" />

                    {/* Floating Top Nav Bar inside Right Screen */}
                    <div className="relative z-10 flex items-center justify-between gap-3 p-2 rounded-xl bg-background/90 dark:bg-zinc-950/80 backdrop-blur-md border border-border text-foreground max-w-xl mx-auto w-full shadow-sm">
                        <div className="flex items-center gap-5 text-xs font-medium px-4">
                            <Link href="#use-cases" className="hover:text-foreground/80 transition-colors">Solutions</Link>
                            <Link href="#why-talkar" className="hover:text-foreground/80 transition-colors">Why Talkar</Link>
                            <Link href="#pricing" className="hover:text-foreground/80 transition-colors">Pricing</Link>
                            <a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/80 transition-colors">Docs</a>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-foreground hover:bg-muted" />
                            <Link
                                href="/auth/signup"
                                className="h-7 px-3.5 rounded-lg text-[11px] font-semibold bg-foreground text-background hover:opacity-90 transition-all flex items-center gap-1 shadow-xs"
                            >
                                Get Started <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>

                    {/* Demo Call Form Card */}
                    <div className="relative z-10 max-w-md mx-auto w-full my-auto py-8">
                        <div className="rounded-2xl p-6 border border-border/80 bg-card/95 dark:bg-zinc-950/90 backdrop-blur-xl shadow-2xl text-card-foreground space-y-5">
                            {/* Header */}
                            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                                <div className="w-9 h-9 rounded-xl bg-cta/15 border border-cta/30 flex items-center justify-center shadow-xs shrink-0">
                                    <PhoneCall className="w-4.5 h-4.5 text-cta" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-foreground">Test a Live Call</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Receive a demo call on your mobile</p>
                                </div>
                            </div>

                            {/* Demo Call Form UI */}
                            <DemoCallFormPlaceholder />
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* FEATURE HIGHLIGHT: CROPPED PHONE CALLING UI + BUSINESS SLOGAN */}
            {/* ------------------------------------------------------------- */}
            <section className="w-full border-b border-border/40 bg-muted/20 pt-20 pb-0 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* Left Column: Cropped Bottom Phone UI with Floating Call Banner & Home Screen Icons */}
                    <div className="lg:col-span-6 relative flex justify-center lg:justify-start">
                        {/* Outer Soft Glow */}
                        <div className="absolute inset-0 bg-cta/10 blur-3xl rounded-full -z-10 transform scale-75" />

                        {/* Smartphone Metallic Frame */}
                        <div className="w-full max-w-[350px] rounded-t-[36px] border-x-[6px] border-t-[6px] border-zinc-900 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col justify-between pt-2 px-2 pb-0 -mb-16 sm:-mb-24 border-b-0 h-[410px] sm:h-[450px] transition-all relative">

                            {/* Inner Screen Container */}
                            <div className="w-full h-full rounded-t-[28px] bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-3 pt-2.5 overflow-hidden relative flex flex-col justify-between shadow-inner">

                                {/* Top Floating Call Notification Banner */}
                                <div className="bg-black/90 text-white rounded-2xl p-2.5 px-3.5 shadow-2xl flex items-center justify-between z-20 border border-white/10 w-full mb-5">
                                    {/* Caller Avatar & Phone Number */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                                            <PhoneCall className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-zinc-400 font-medium leading-none">Incoming Customer Call</p>
                                            <h5 className="text-xs font-bold text-white tracking-tight mt-0.5">+1 (800) 482-9012</h5>
                                        </div>
                                    </div>

                                    {/* Action Circle Buttons */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md cursor-pointer transition-all">
                                            <PhoneOff className="w-3.5 h-3.5 text-white fill-current" />
                                        </div>
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md cursor-pointer transition-all">
                                            <Phone className="w-3.5 h-3.5 text-white fill-current" />
                                        </div>
                                    </div>
                                </div>

                                {/* Phone App Icons Grid */}
                                <div className="grid grid-cols-4 gap-y-4 gap-x-3 px-1 my-auto text-white">

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md text-white">
                                            <Video className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Calls</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-white text-black flex flex-col items-center justify-center shadow-md overflow-hidden">
                                            <span className="text-[8px] font-bold text-red-500 uppercase leading-none mt-0.5">MON</span>
                                            <span className="text-sm font-extrabold leading-none">6</span>
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Calendar</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-white text-zinc-900 flex items-center justify-center shadow-md">
                                            <ImageIcon className="w-5 h-5 text-pink-500" />
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Gallery</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-zinc-800 text-white flex items-center justify-center shadow-md border border-white/10">
                                            <Camera className="w-5 h-5 text-zinc-300" />
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Camera</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Mail</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-amber-400 text-black flex flex-col items-center justify-center shadow-md">
                                            <FileText className="w-5 h-5 text-zinc-900" />
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Notes</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-md">
                                            <ListChecks className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Tasks</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center shadow-md border border-white/15">
                                            <Clock className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <span className="text-[10px] font-medium text-white/90">Clock</span>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Business Slogan & Value Copy */}
                    <div className="lg:col-span-6 space-y-6 pb-16 lg:pb-24">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-semibold">
                            <Zap className="w-3.5 h-3.5" />
                            Zero Wait Time Guarantee
                        </div>

                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
                            Turn every phone ring into booked business on autopilot.
                        </h2>

                        <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                            Missed calls mean missed revenue. Talkar answers immediately, understands caller requests, schedules appointments, and sends instant confirmations.
                        </p>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Immediate First-Ring Pickup — no caller drop-offs</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Real-time Calendar & CRM synchronization</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Automated SMS follow-ups right after call completes</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Link
                                href="/auth/signup"
                                className="inline-flex items-center justify-center h-11 px-7 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 transition-all shadow-sm gap-2"
                            >
                                Start Free Trial
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: INDUSTRY USE-CASE GALLERY CARDS */}
            {/* ------------------------------------------------------------- */}
            <section id="use-cases" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-12">

                {/* Clean Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3 max-w-xl">
                        <p className="text-xs font-semibold text-cta tracking-wide uppercase">Industry Solutions</p>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                            Built for your business workflow
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Tailored automated call handling for hospitality, healthcare, sales, and service teams.
                        </p>
                    </div>
                    <div className="shrink-0">
                        <Link
                            href="/integrations"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-foreground hover:text-cta transition-colors py-2"
                        >
                            Explore phone & CRM integrations <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* 5 Industry Cards Grid - Clean Minimal Cards with Photo Thumbnails */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch">

                    {/* Card 1: Hospitality */}
                    <Link
                        href="/use-cases/hotel"
                        className="group rounded-xl border border-border/70 bg-card overflow-hidden flex flex-col justify-between transition-all duration-200 hover:border-foreground/30 hover:bg-muted/30 shadow-xs"
                    >
                        <div>
                            <div className="h-32 w-full relative overflow-hidden bg-muted">
                                <img
                                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop"
                                    alt="Hotels & Resorts"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="p-5 space-y-2">
                                <h3 className="text-base font-bold text-foreground">Hotels & Resorts</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Automate room bookings, check-in queries, and guest services 24/7.
                                </p>
                            </div>
                        </div>
                        <div className="p-5 pt-0 flex items-center gap-1 text-xs font-semibold text-foreground group-hover:text-cta transition-colors">
                            Learn more <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </Link>

                    {/* Card 2: Sales Ops (Coming Soon) */}
                    <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden flex flex-col justify-between shadow-xs relative opacity-85">
                        <div>
                            <div className="h-32 w-full relative overflow-hidden bg-muted">
                                <img
                                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop"
                                    alt="Sales & Lead Gen"
                                    className="w-full h-full object-cover grayscale opacity-75"
                                />
                                <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20 uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </div>
                            <div className="p-5 space-y-2">
                                <h3 className="text-base font-bold text-foreground">Sales & Lead Gen</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Qualify inbound leads instantly and book meetings straight to your calendar.
                                </p>
                            </div>
                        </div>
                        <div className="p-5 pt-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground/60">
                            Coming Soon
                        </div>
                    </div>

                    {/* Card 3: Healthcare (Coming Soon) */}
                    <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden flex flex-col justify-between shadow-xs relative opacity-85">
                        <div>
                            <div className="h-32 w-full relative overflow-hidden bg-muted">
                                <img
                                    src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop"
                                    alt="Medical Clinics"
                                    className="w-full h-full object-cover grayscale opacity-75"
                                />
                                <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20 uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </div>
                            <div className="p-5 space-y-2">
                                <h3 className="text-base font-bold text-foreground">Medical Clinics</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Handle patient appointments, reminders, and FAQ calls smoothly.
                                </p>
                            </div>
                        </div>
                        <div className="p-5 pt-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground/60">
                            Coming Soon
                        </div>
                    </div>

                    {/* Card 4: Legal Services (Coming Soon) */}
                    <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden flex flex-col justify-between shadow-xs relative opacity-85">
                        <div>
                            <div className="h-32 w-full relative overflow-hidden bg-muted">
                                <img
                                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop"
                                    alt="Law Firms"
                                    className="w-full h-full object-cover grayscale opacity-75"
                                />
                                <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20 uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </div>
                            <div className="p-5 space-y-2">
                                <h3 className="text-base font-bold text-foreground">Law Firms</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Screen client intake calls, schedule consultations, and log notes.
                                </p>
                            </div>
                        </div>
                        <div className="p-5 pt-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground/60">
                            Coming Soon
                        </div>
                    </div>

                    {/* Card 5: Home Services (Coming Soon) */}
                    <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden flex flex-col justify-between shadow-xs relative opacity-85">
                        <div>
                            <div className="h-32 w-full relative overflow-hidden bg-muted">
                                <img
                                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop"
                                    alt="Home Services"
                                    className="w-full h-full object-cover grayscale opacity-75"
                                />
                                <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20 uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            </div>
                            <div className="p-5 space-y-2">
                                <h3 className="text-base font-bold text-foreground">Home Services</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Dispatch service calls, capture emergency jobs, and text quotes.
                                </p>
                            </div>
                        </div>
                        <div className="p-5 pt-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground/60">
                            Coming Soon
                        </div>
                    </div>

                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: WHAT WE DO (MINIMAL MODERN FEATURE SHOWCASE) */}
            {/* ------------------------------------------------------------- */}
            <section id="what-we-do" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">

                {/* Header */}
                <div className="space-y-3 text-center max-w-2xl mx-auto">
                    <p className="text-xs font-semibold text-cta tracking-wide uppercase">Core Capabilities</p>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Everything your business phone line needs
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Handle customer calls, manage live calendar bookings, and automate follow-ups around the clock.
                    </p>
                </div>

                {/* Grid Feature Display */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Feature 1 */}
                    <div className="rounded-xl border border-border/70 bg-card overflow-hidden flex flex-col justify-between shadow-xs">
                        <div className="h-48 relative overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop"
                                alt="24/7 Call Answering"
                                className="w-full h-full object-cover filter brightness-[0.85]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                        </div>
                        <div className="p-6 space-y-2">
                            <span className="text-xs font-bold text-cta">01 / Instant Reception</span>
                            <h3 className="text-lg font-bold text-foreground">Answer Every Call 24/7</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                AI callers answer immediately on the first ring, handling high call volumes smoothly without placing customers on hold.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="rounded-xl border border-border/70 bg-card overflow-hidden flex flex-col justify-between shadow-xs">
                        <div className="h-48 relative overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop"
                                alt="Live Calendar Booking"
                                className="w-full h-full object-cover filter brightness-[0.85]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                        </div>
                        <div className="p-6 space-y-2">
                            <span className="text-xs font-bold text-cta">02 / Live Scheduling</span>
                            <h3 className="text-lg font-bold text-foreground">Book Appointments Live</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Assistants check live calendar availability during the call and lock in reservations directly with callers.
                            </p>
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="rounded-xl border border-border/70 bg-card overflow-hidden flex flex-col justify-between shadow-xs">
                        <div className="h-48 relative overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop"
                                alt="CRM & SMS Follow-up"
                                className="w-full h-full object-cover filter brightness-[0.85]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                        </div>
                        <div className="p-6 space-y-2">
                            <span className="text-xs font-bold text-cta">03 / Automated Follow-Up</span>
                            <h3 className="text-lg font-bold text-foreground">Sync CRM & Send Confirmation</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Complete transcripts and summaries are logged to your CRM, with immediate SMS confirmation texts sent to callers.
                            </p>
                        </div>
                    </div>

                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: UNIQUENESS / WHY TALKAR (EXECUTIVE COMPARISON) */}
            {/* ------------------------------------------------------------- */}
            <section id="why-talkar" className="w-full bg-background text-foreground border-b border-border/40 py-24 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="space-y-3 text-center max-w-2xl mx-auto">
                        <p className="text-xs font-semibold text-cta tracking-wide uppercase">Why Talkar</p>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                            Built for enterprise reliability
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Replace complex multi-tool setups with one seamless solution designed specifically for business voice operations.
                        </p>
                    </div>

                    {/* Side-by-Side AAA Comparison Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

                        {/* Traditional Setup */}
                        <div className="p-8 rounded-xl border border-border/70 bg-card/40 space-y-6 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-5 border-b border-border/60">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Traditional Approach</p>
                                        <h3 className="text-lg font-bold text-foreground mt-0.5">Multi-Vendor Assembly</h3>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                        High Complexity
                                    </span>
                                </div>

                                <ul className="space-y-4 text-xs text-muted-foreground">
                                    <li className="flex items-start gap-3">
                                        <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-foreground font-semibold">Multiple Monthly Subscriptions:</strong> Separate billing for carriers, voice engines, calendar tools, and SMS providers.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-foreground font-semibold">Noticeable Voice Latency:</strong> Callers wait through awkward silences between response turns.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-foreground font-semibold">Unstable Call Routing:</strong> Custom-coded bridges drop incoming customer calls during peak surges.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-foreground font-semibold">Heavy Engineering Maintenance:</strong> Requires dedicated developer hours to build and maintain integrations.
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Talkar Solution */}
                        <div className="p-8 rounded-xl border border-cta/50 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-emerald-500/10 dark:from-rose-950/40 dark:via-purple-950/30 dark:to-emerald-950/30 space-y-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                            {/* Subtle Metallic Corner Light Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/15 blur-3xl pointer-events-none" />

                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center justify-between pb-5 border-b border-border/80">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-cta">Talkar Platform</p>
                                        <h3 className="text-lg font-bold text-foreground mt-0.5 flex items-center gap-2">
                                            <BrandLogo className="text-base" /> All-In-One Voice System
                                        </h3>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-cta/10 text-cta border border-cta/20">
                                        Turnkey Ready
                                    </span>
                                </div>

                                <ul className="space-y-4 text-xs text-muted-foreground">
                                    <li className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-cta shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-semibold text-foreground">One Unified Product:</strong> Dedicated phone lines, voice AI, live scheduling, and CRM syncing in a single subscription.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-cta shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-semibold text-foreground">Real-Time Natural Cadence:</strong> Fluid, human-like speech with immediate responses so callers get fast help.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-cta shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-semibold text-foreground">High-Volume Reliability:</strong> Handles dozens of simultaneous phone calls with zero dropped calls.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <Check className="w-4 h-4 text-cta shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-semibold text-foreground">Launch in Days:</strong> Configure your phone agent business rules and deploy instantly without code.
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* PRICING (CLEAR, SELF-EXPLANATORY TIERS FOR BUSINESSES) */}
            {/* ------------------------------------------------------------- */}
            <section id="pricing" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-12">
                <div className="space-y-3 text-center max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <Zap className="w-3.5 h-3.5" /> Transparent Pricing
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Clear pricing for every scale
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        No hidden setup fees. Pick a plan matching your call volume and launch today.
                    </p>
                </div>

                {/* 3 Column Business Pricing Cards - Wrapped in a relative container with a Coming Soon overlay */}
                <div className="relative">
                    {/* Blurred pricing cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch filter blur-sm opacity-30 pointer-events-none select-none">

                        {/* Pricing Option 1: Starter */}
                        <div className="p-8 rounded-xl border border-border bg-card flex flex-col justify-between space-y-8 shadow-xs">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Starter Plan</h3>
                                    <p className="text-xs text-muted-foreground mt-1">For small teams automating front-desk calls and reminders.</p>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold tracking-tight text-foreground">$29</span>
                                    <span className="text-xs text-muted-foreground">/ month</span>
                                </div>
                                <ul className="space-y-3.5 text-xs text-muted-foreground pt-4 border-t border-border/60">
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 500 call minutes / month
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Natural Voice AI Assistant
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> 1 Dedicated Business Line
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Calendar & CRM Integration
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <Link
                                    href="/auth/signup?plan=starter"
                                    className="w-full inline-flex items-center justify-center h-11 px-6 rounded-xl text-xs font-bold border border-border bg-background hover:bg-muted/60 transition-all text-foreground"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>

                        {/* Pricing Option 2: Growth (Featured) */}
                        <div className="p-8 rounded-xl border-2 border-cta bg-card flex flex-col justify-between space-y-8 shadow-md relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cta text-cta-foreground text-[10px] font-bold tracking-wide uppercase">
                                MOST POPULAR
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Growth Plan</h3>
                                    <p className="text-xs text-muted-foreground mt-1">For growing businesses needing 24/7 reception & booking.</p>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold tracking-tight text-foreground">$149</span>
                                    <span className="text-xs text-muted-foreground">/ month</span>
                                </div>
                                <ul className="space-y-3.5 text-xs text-foreground pt-4 border-t border-border/60">
                                    <li className="flex items-center gap-2.5 font-medium">
                                        <Check className="w-4 h-4 text-cta shrink-0" /> Up to 3,000 call minutes / month
                                    </li>
                                    <li className="flex items-center gap-2.5 font-medium">
                                        <Check className="w-4 h-4 text-cta shrink-0" /> Advanced Conversational Engine
                                    </li>
                                    <li className="flex items-center gap-2.5 font-medium">
                                        <Check className="w-4 h-4 text-cta shrink-0" /> 5 Dedicated Business Lines
                                    </li>
                                    <li className="flex items-center gap-2.5 font-medium">
                                        <Check className="w-4 h-4 text-cta shrink-0" /> Full CRM & Automated SMS Sync
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <Link
                                    href="/auth/signup?plan=growth"
                                    className="w-full inline-flex items-center justify-center h-11 px-6 rounded-xl text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-xs"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>

                        {/* Pricing Option 3: Enterprise */}
                        <div className="p-8 rounded-xl border border-border bg-card flex flex-col justify-between space-y-8 shadow-xs">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Enterprise Plan</h3>
                                    <p className="text-xs text-muted-foreground mt-1">For multi-location brands needing custom volume & SLA.</p>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold tracking-tight text-foreground">Custom</span>
                                </div>
                                <ul className="space-y-3.5 text-xs text-muted-foreground pt-4 border-t border-border/60">
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> High-Volume Custom Packages
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited Phone Lines
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Custom System Integrations
                                    </li>
                                    <li className="flex items-center gap-2.5">
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Dedicated Account Manager & SLA
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <Link
                                    href="/auth/signup?plan=enterprise"
                                    className="w-full inline-flex items-center justify-center h-11 px-6 rounded-xl text-xs font-bold border border-border bg-background hover:bg-muted/60 transition-all text-foreground"
                                >
                                    Contact Sales
                                </Link>
                            </div>
                        </div>

                    </div>

                    {/* Coming Soon Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 p-6">
                        <div className="max-w-md p-8 rounded-2xl border border-border/80 bg-background/90 shadow-xl backdrop-blur-md space-y-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cta/15 text-cta text-xs font-bold uppercase tracking-wider">
                                Coming Soon
                            </span>
                            <h3 className="text-xl font-bold text-foreground">Pricing Plans Coming Soon</h3>
                            <p className="text-xs text-muted-foreground">
                                We are polishing our voice agent plans to offer the best value. Check back soon!
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ------------------------------------------------------------- */}
            {/* FINAL CLOSING CTA BANNER */}
            {/* ------------------------------------------------------------- */}
            <section className="border-t border-border/40 py-24 px-6 lg:px-12 bg-gradient-to-b from-background via-muted/30 to-background text-center relative overflow-hidden">
                <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        Ready to Transform Your Phone Operations?
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
                        Launch your AI business phone system today.
                    </h2>

                    <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        Join hotels, clinics, sales teams, and service providers automated by Talkar.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            Book a Demo
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="#pricing"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted/60 transition-all text-foreground"
                        >
                            View Pricing
                        </Link>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* FULL ENTERPRISE FOOTER */}
            {/* ------------------------------------------------------------- */}
            <footer className="border-t border-border/40 py-16 px-6 lg:px-12 bg-background">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 border-b border-border/40 pb-12">
                    <div className="md:col-span-5 space-y-4">
                        <BrandLogo className="text-xl font-bold tracking-tight" />
                        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                            Talkar is an all-in-one AI phone system for building, deploying, and managing automated business voice callers across industries.
                        </p>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
                        <div className="space-y-3">
                            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">Platform</p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><Link href="#use-cases" className="hover:text-foreground transition-colors">Solutions</Link></li>
                                <li><Link href="#why-talkar" className="hover:text-foreground transition-colors">Why Talkar</Link></li>
                                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                                <li><Link href="/integrations" className="hover:text-foreground transition-colors">Integrations</Link></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">Resources</p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Documentation</a></li>
                                <li><Link href="/tools" className="hover:text-foreground transition-colors">Integrations</Link></li>
                                <li><a href="https://github.com/dalai-lab/dograh" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub Repository</a></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">Account</p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                                <li><Link href="/auth/signup" className="hover:text-foreground transition-colors">Create Account</Link></li>
                                <li><Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <p className="text-[11px]">© {new Date().getFullYear()} Talkar AI Phone System. All rights reserved.</p>
                    <div className="flex gap-6 text-[11px]">
                        <a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Docs</a>
                        <a href="https://github.com/dalai-lab/dograh" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Open Source</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function DemoCallFormPlaceholder() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [useCase, setUseCase] = useState("hotel");
    const [callingState, setCallingState] = useState<"idle" | "calling" | "connected">("idle");

    const handleInitiateCall = (e: React.FormEvent) => {
        e.preventDefault();
        setCallingState("calling");
        setTimeout(() => {
            setCallingState("connected");
        }, 2000);
    };

    const handleReset = () => {
        setCallingState("idle");
    };

    if (callingState === "calling" || callingState === "connected") {
        return (
            <div className="py-6 px-4 space-y-4 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                <div className="relative flex items-center justify-center my-2">
                    <div className="w-14 h-14 rounded-full bg-cta/20 border-2 border-cta flex items-center justify-center animate-ping absolute inset-0 opacity-75" />
                    <div className="w-14 h-14 rounded-full bg-cta text-cta-foreground flex items-center justify-center relative shadow-lg">
                        <PhoneCall className="w-6 h-6 animate-pulse" />
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">
                        {callingState === "calling" ? "Initiating Call..." : "Call Connected"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                        +91 {phone || "98765 43210"}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground w-full space-y-1">
                    <p className="font-semibold text-foreground">
                        {callingState === "calling" ? "Connecting call to your mobile..." : "Ringing your mobile number..."}
                    </p>
                </div>

                <button
                    onClick={handleReset}
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-border bg-muted/40 hover:bg-muted/70 transition-all text-foreground"
                >
                    Call Again
                </button>
            </div>
        );
    }

    const businessOptions = [
        { id: "hotel", label: "Hotels & Stays", icon: Hotel, available: true },
        { id: "medical", label: "Healthcare", icon: Stethoscope, available: false },
        { id: "sales", label: "Sales & Leads", icon: Briefcase, available: false },
        { id: "service", label: "Home Services", icon: Wrench, available: false },
    ];

    return (
        <form onSubmit={handleInitiateCall} className="space-y-3.5 text-xs">
            <div className="space-y-1 text-left">
                <label className="text-[11px] font-semibold text-foreground/90 block">Your Name</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full h-9.5 px-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-cta/50 transition-all"
                />
            </div>

            <div className="space-y-1 text-left">
                <label className="text-[11px] font-semibold text-foreground/90 block">Mobile Number</label>
                <div className="flex gap-2">
                    <span className="h-9.5 px-3 rounded-lg border border-border bg-muted/50 text-foreground text-xs font-semibold flex items-center font-mono shrink-0 gap-1.5">
                        <span className="text-sm leading-none">🇮🇳</span> +91
                    </span>
                    <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full h-9.5 px-3 rounded-lg border border-border bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-cta/50 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1 text-left">
                <label className="text-[11px] font-semibold text-foreground/90 block">Select Business Type</label>
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {businessOptions.map((item) => {
                        const Icon = item.icon;
                        const isSelected = useCase === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                disabled={!item.available}
                                onClick={() => item.available && setUseCase(item.id)}
                                className={`h-9 px-2.5 rounded-lg text-[11px] font-medium border text-left flex items-center justify-between gap-1.5 transition-all ${isSelected
                                        ? "bg-cta/15 border-cta text-cta font-semibold shadow-xs"
                                        : item.available
                                            ? "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                                            : "border-border/50 bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                                    }`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cta" : "text-muted-foreground/50"}`} />
                                    <span className="truncate">{item.label}</span>
                                </div>
                                {!item.available && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground/70 font-sans uppercase font-semibold shrink-0">
                                        Soon
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <button
                type="submit"
                className="w-full h-10.5 mt-2 rounded-xl text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md flex items-center justify-center gap-2 group"
            >
                <PhoneCall className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                Receive Test Call Now
                <ArrowRight className="w-3.5 h-3.5" />
            </button>
        </form>
    );
}
