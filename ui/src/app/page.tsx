"use client";

import { ArrowRight, Cpu, Shield, Terminal, PhoneCall, Megaphone, CheckCircle2, Mic, Volume2, Sparkles, Layers, Activity, Bot, Zap, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";
import { useAuth } from "@/lib/auth";

const REALISTIC_VOICE_DEMO = [
    { speaker: "agent", text: "Hi! How can I help your business today?" },
    { speaker: "customer", text: "Hi, I need to change the delivery address for order #12345." },
    { speaker: "agent", text: "Of course. Please tell me the new delivery address." },
    { speaker: "customer", text: "742 Evergreen Terrace, Springfield." },
    { speaker: "agent", text: "Updated! Your order is now routed to 742 Evergreen Terrace." }
];

export default function LandingPage() {
    const { isAuthenticated, loading } = useAuth();
    const [turnIndex, setTurnIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState("");

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
                }, 2200);
                return () => clearTimeout(nextTimeout);
            }
        }, 30);

        return () => clearInterval(timer);
    }, [turnIndex]);

    return (
        <div className="w-full min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background transition-colors duration-150 overflow-x-hidden">
            {/* ------------------------------------------------------------- */}
            {/* HERO SECTION (HERO PRESERVED EXACTLY AS IS) */}
            {/* ------------------------------------------------------------- */}
            <section className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 border-b border-border/40">

                {/* Left Hero Column */}
                <div className="lg:col-span-6 p-8 lg:p-16 flex flex-col justify-between space-y-10 bg-background relative">
                    {/* Top Brand & Badge */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BrandLogo className="text-xl font-bold tracking-tight" />
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-border/60 bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            #1 Voice AI Infrastructure
                        </div>
                    </div>

                    {/* Center Hero Copy */}
                    <div className="space-y-6 my-auto py-12 max-w-xl mx-auto text-center flex flex-col items-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.06] text-center max-w-lg">
                            Give your product a voice that closes deals
                        </h1>

                        <p className="text-base text-muted-foreground max-w-md text-center leading-relaxed">
                            Deploy real-time voice AI agents in minutes — native telephony, Plivo & Twilio integration, no complex call center setup.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                            {!loading && isAuthenticated ? (
                                <Link
                                    href="/overview"
                                    className="inline-flex items-center justify-center h-11 px-7 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                                >
                                    Try Live Console
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/signup"
                                        className="inline-flex items-center justify-center h-11 px-7 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                                    >
                                        Try Live Console
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href="/auth/login"
                                        className="inline-flex items-center justify-center h-11 px-7 rounded-full text-xs font-semibold border border-border/80 bg-background hover:bg-muted/50 transition-all text-foreground"
                                    >
                                        Book a call
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bottom Trusted Logos Strip */}
                    <div className="pt-8 border-t border-border/40 space-y-3 text-center">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/60 text-center">
                            TRUSTED BY VOICE ENGINEERING TEAMS GLOBALLY
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all text-xs font-mono text-muted-foreground">
                            <span className="font-bold tracking-widest uppercase text-sm">AMAZON</span>
                            <span className="font-bold tracking-widest uppercase text-sm">ADOBE</span>
                            <span className="font-bold tracking-widest uppercase text-sm">INTEL</span>
                            <span className="font-bold tracking-widest uppercase text-sm">GOOGLE</span>
                            <span className="font-bold tracking-widest uppercase text-sm">SONY</span>
                        </div>
                    </div>
                </div>

                {/* Right Column - Edge-to-Edge Unsplash Background Photo */}
                <div className="lg:col-span-6 relative flex flex-col justify-between p-8 lg:p-12 min-h-[600px] lg:min-h-screen overflow-hidden">
                    {/* Unsplash Photo Background */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.02]"
                        style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1461696114087-397271a7aedc?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`
                        }}
                    />
                    {/* Subtle Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/45 backdrop-blur-[1px]" />

                    {/* Floating Top Nav Bar inside Right Screen */}
                    <div className="relative z-10 flex items-center justify-between gap-3 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white max-w-xl mx-auto w-full">
                        <div className="flex items-center gap-5 text-xs font-medium px-4">
                            <Link href="#features" className="hover:text-white/80 transition-colors">Platform</Link>
                            <Link href="#process" className="hover:text-white/80 transition-colors">Process</Link>
                            <Link href="/billing" className="hover:text-white/80 transition-colors">Pricing</Link>
                            <a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition-colors">Docs</a>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white hover:bg-white/20" />
                            <Link
                                href="/auth/signup"
                                className="h-7 px-3.5 rounded-full text-[11px] font-semibold bg-white text-black hover:bg-white/90 transition-all flex items-center gap-1 shadow-sm"
                            >
                                Get started <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>

                    {/* Floating Glassmorphism Assistant Widget */}
                    <div className="relative z-10 max-w-sm mx-auto w-full my-auto py-8">
                        <div className="rounded-2xl p-6 border border-white/30 bg-white/10 dark:bg-black/35 backdrop-blur-xl shadow-2xl text-white space-y-4">
                            {/* Glass Header */}
                            <div className="flex items-center justify-between border-b border-white/20 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                                        <Volume2 className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold leading-none">Dograh Voice AI</p>
                                        <p className="text-[10px] text-white/70 mt-0.5">Telephony Assistant</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                                    online now
                                </span>
                            </div>

                            {/* Chat Bubbles */}
                            <div className="space-y-3 text-xs">
                                <div className="bg-white/15 p-3.5 rounded-2xl rounded-tl-xs max-w-[85%] border border-white/10 shadow-xs">
                                    <p className="font-medium text-white/90">Hi! How can I help your business today?</p>
                                    <span className="text-[9px] text-white/50 block mt-1">9:31 AM</span>
                                </div>

                                {REALISTIC_VOICE_DEMO[turnIndex].speaker === "customer" && (
                                    <div className="bg-blue-600/60 p-3.5 rounded-2xl rounded-tr-xs max-w-[85%] ml-auto border border-blue-400/20 shadow-xs">
                                        <p className="font-medium text-white">{displayedText}</p>
                                        <span className="text-[9px] text-white/70 block mt-1">9:31 AM</span>
                                    </div>
                                )}

                                {REALISTIC_VOICE_DEMO[turnIndex].speaker === "agent" && (
                                    <div className="bg-white/15 p-3.5 rounded-2xl rounded-tl-xs max-w-[85%] border border-white/10 shadow-xs">
                                        <p className="font-medium text-white/90">{displayedText}</p>
                                        <span className="text-[9px] text-white/50 block mt-1">9:31 AM</span>
                                    </div>
                                )}
                            </div>

                            {/* Live Status Bar inside Glass Widget */}
                            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-white/80">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    <span className="font-medium">Listening...</span>
                                </div>
                                <span className="font-mono text-white/60 text-[10px]">00:10</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Caption Overlay */}
                    <div className="relative z-10 text-center space-y-1 text-white">
                        <h3 className="text-base font-bold tracking-tight">Real-time transcription</h3>
                        <p className="text-xs text-white/70">Every word captured as it happens with ~140ms latency</p>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: ALTERNATING STORY A (LEFT COPY + RIGHT PICTURE) */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-28 border-b border-border/40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                    <div className="lg:col-span-6 space-y-6">
                        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                            IVR & CHATBOTS
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                            Why legacy IVR & traditional chatbots fail
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Old IVR menus and rule-based chatbots break under real-world customer requests. They frustrate callers with rigid phone keypads and zero memory of past interactions.
                        </p>

                        <div className="space-y-4 pt-4 border-t border-border/30">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                    Understands Intent & Context
                                </p>
                                <p className="text-xs text-muted-foreground pl-3.5">
                                    Handles complex customer phrasing, mid-sentence interruptions, and multi-turn context effortlessly.
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Human-Like Cadence & Tone
                                </p>
                                <p className="text-xs text-muted-foreground pl-3.5">
                                    Speaks with natural pace and tone without awkward robotic delays.
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Link href="/auth/signup" className="inline-flex items-center h-10 px-5 rounded-lg text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-all gap-2">
                                Get Started <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-6">
                        <div className="relative rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm h-[440px]">
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.02]"
                                style={{
                                    backgroundImage: `url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1600&auto=format&fit=crop')`
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent p-8 flex items-end">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Legacy Systems vs Dograh</span>
                                    <p className="text-sm font-bold text-foreground">Replace frustrating phone trees with fluid conversations</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: ALTERNATING STORY B (LEFT PICTURE + RIGHT COPY) */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-28 border-b border-border/40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                    <div className="lg:col-span-6 order-2 lg:order-1">
                        <div className="relative rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm h-[440px]">
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.02]"
                                style={{
                                    backgroundImage: `url('https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop')`
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent p-8 flex items-end">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Real-Time Execution</span>
                                    <p className="text-sm font-bold text-foreground">Live database queries and calendar updates during the call</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
                        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            PRODUCTION READY
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                            AI voice that actually works in production
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Voice agents don't just follow scripts—they listen, comprehend intent, look up relevant customer details, and take real action during the call.
                        </p>

                        <div className="space-y-4 pt-4 border-t border-border/30">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Real-Time Data Integration
                                </p>
                                <p className="text-xs text-muted-foreground pl-3.5">
                                    Pulls customer records, checks calendar availability, and updates CRM systems mid-conversation.
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Enterprise Telephony Connections
                                </p>
                                <p className="text-xs text-muted-foreground pl-3.5">
                                    Connects directly to your existing Plivo, Twilio, or phone infrastructure with zero hassle.
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Link href="/auth/signup" className="inline-flex items-center h-10 px-5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted/40 transition-all gap-2">
                                Explore Capabilities <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: DARK CONTRAST SECTION ("HOW AI VOICE WORKS IN FOUR STEPS") */}
            {/* ------------------------------------------------------------- */}
            <section id="process" className="w-full bg-zinc-950 text-white dark:bg-card border-b border-border/40 py-28 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
                        <div className="space-y-2">
                            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                PROCESS
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                                How AI voice agents work in four steps
                            </h2>
                        </div>
                        <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                            A seamless conversation engine designed for continuous clarity and execution.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-4 hover:border-white/20 transition-all">
                            <div className="text-xs font-mono text-blue-400 font-bold">01</div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Mic className="w-4 h-4 text-blue-400" />
                                Understand
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Natural language processing captures exact intent, context, and sentiment from every customer sentence.
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-4 hover:border-white/20 transition-all">
                            <div className="text-xs font-mono text-indigo-400 font-bold">02</div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-indigo-400" />
                                Decide
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Evaluates optimal actions based on business guidelines, customer history, and conversation context.
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-4 hover:border-white/20 transition-all">
                            <div className="text-xs font-mono text-emerald-400 font-bold">03</div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-emerald-400" />
                                Act
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Queries systems, updates CRM records, triggers workflows, or seamlessly routes to human agents.
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-4 hover:border-white/20 transition-all">
                            <div className="text-xs font-mono text-amber-400 font-bold">04</div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Volume2 className="w-4 h-4 text-amber-400" />
                                Learn
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Continuous feedback loops log outcome metrics, uncover patterns, and optimize future interactions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 4: WHAT THE PLATFORM DELIVERS (4 COLORFUL CARDS GRID) */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-28 border-b border-border/40 space-y-12">
                <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        CORE CAPABILITIES
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        What the platform delivers
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4 shadow-2xs hover:border-border/80 transition-all">
                        <div className="p-2.5 w-fit rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                            <Bot className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-sm text-foreground">Voice Agents</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Conversational AI that understands intent, handles complexity, and responds naturally across every interaction.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4 shadow-2xs hover:border-border/80 transition-all">
                        <div className="p-2.5 w-fit rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <PhoneCall className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">Omnichannel Support</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Seamless handoff between automated voice, messaging, and human call center team members.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4 shadow-2xs hover:border-border/80 transition-all">
                        <div className="p-2.5 w-fit rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">Enterprise Integrations</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Connect directly to your CRM, scheduling platforms, and internal database systems in minutes.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4 shadow-2xs hover:border-border/80 transition-all">
                        <div className="p-2.5 w-fit rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">Learning & Insights</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Every conversation generates clear call outcome dispositions, resolution stats, and transcript records.
                        </p>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 5: BENTO BOXED FEATURES GRID ("BUILT FOR ENTERPRISE SCALE") */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-28 border-b border-border/40 space-y-12">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                    <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        INDUSTRIES
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Built for enterprise scale
                    </h2>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column Stack */}
                    <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
                        <div className="p-6 rounded-xl border border-border/40 bg-card space-y-3 shadow-2xs hover:border-border/80 transition-all flex-1">
                            <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-sm text-foreground">Customer Support & Service</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Reduce wait times and resolve routine inquiries instantly while keeping customers satisfied.
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-card space-y-3 shadow-2xs hover:border-border/80 transition-all flex-1">
                            <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                <PhoneCall className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-sm text-foreground">Contact Centers & Operations</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Handle volume spikes in demand without expanding staff headcount or sacrificing quality.
                            </p>
                        </div>
                    </div>

                    {/* Right Featured Bento Card with Photo */}
                    <div className="lg:col-span-7">
                        <div className="relative rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm min-h-[380px] flex flex-col justify-between p-8 text-white">
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.02]"
                                style={{
                                    backgroundImage: `url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop')`
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />

                            <div className="relative z-10 space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-white/70">Enterprise Operations</span>
                                <h3 className="text-xl font-bold">High-Volume Service Operations</h3>
                            </div>

                            <div className="relative z-10 space-y-2">
                                <p className="text-xs text-white/80 max-w-md leading-relaxed">
                                    Automate routine customer calls at scale while maintaining human warmth, reliability, and full conversational context.
                                </p>
                                <div className="flex items-center gap-2 pt-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-mono text-white/70">Enterprise Service Dialer Ready</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 6: DARK BACKGROUND "WHY THIS PLATFORM" SECTION */}
            {/* ------------------------------------------------------------- */}
            <section className="w-full bg-zinc-950 text-white dark:bg-card border-b border-border/40 py-28 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
                        <div className="space-y-2">
                            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                WHY THIS PLATFORM
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                                Why enterprises choose Dograh
                            </h2>
                        </div>
                        <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                            Designed for high availability, security, and full platform ownership.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                Operational Reliability
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                High availability with automatic redundancy across telephony providers and speech services.
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Shield className="w-4 h-4 text-blue-400" />
                                Security & Compliance
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Complete data privacy with encrypted voice streams and local perimeter deployment options.
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Terminal className="w-4 h-4 text-indigo-400" />
                                Full Platform Control
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Open-source foundation giving your engineering team complete freedom over workflows and integrations.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* SECTION 7: FULL ENTERPRISE FOOTER */}
            {/* ------------------------------------------------------------- */}
            <footer className="border-t border-border/40 py-16 px-6 lg:px-12 bg-background">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 border-b border-border/40 pb-12">
                    <div className="md:col-span-5 space-y-4">
                        <BrandLogo className="text-xl font-bold tracking-tight" />
                        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                            Dograh is an open-source voice AI platform for building, running, and scaling natural conversational phone workflows.
                        </p>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
                        <div className="space-y-3">
                            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">Platform</p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><Link href="/workflow" className="hover:text-foreground transition-colors">Voice Agents</Link></li>
                                <li><Link href="/campaigns" className="hover:text-foreground transition-colors">Outbound Campaigns</Link></li>
                                <li><Link href="/runs" className="hover:text-foreground transition-colors">Call History</Link></li>
                                <li><Link href="/telephony-configurations" className="hover:text-foreground transition-colors">Telephony</Link></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">Developers</p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Documentation</a></li>
                                <li><Link href="/tools" className="hover:text-foreground transition-colors">Tools & Integrations</Link></li>
                                <li><Link href="/api-keys" className="hover:text-foreground transition-colors">API Keys</Link></li>
                                <li><a href="https://github.com/dalai-lab/dograh" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub Repository</a></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">Account</p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                                <li><Link href="/auth/signup" className="hover:text-foreground transition-colors">Create Account</Link></li>
                                <li><Link href="/settings" className="hover:text-foreground transition-colors">Platform Settings</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <p className="text-[11px]">© {new Date().getFullYear()} Dograh Inc. All rights reserved.</p>
                    <div className="flex gap-6 text-[11px]">
                        <a href="https://docs.dograh.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Docs</a>
                        <a href="https://github.com/dalai-lab/dograh" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Open Source</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
