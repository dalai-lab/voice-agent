"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Calendar, Check, CheckCircle2, ChevronRight, Clock, ConciergeBell, DollarSign, Globe, Hotel, Key, MessageSquare, Mic, Phone, PhoneCall, PhoneIncoming, Radio, Shield, Sparkles, Star, TrendingUp, Users, Utensils, Volume2, Wifi, Workflow, XCircle } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeSwitcher";

const HOTEL_SIMULATION_STEPS = [
    {
        stage: "01. Direct Room Reservation Call",
        callerId: "Inbound Phone Call • Guest Line",
        duration: "00:24",
        speaker: "Guest",
        message: "Hi! Do you have any ocean view suites available this Friday for 2 nights?",
        agentResponse: "I have 2 Luxury Ocean Suites open for Feb 6th-8th starting at $340/night. Shall I lock in your reservation with complimentary breakfast?",
        action: "Direct Room Reserved • 0% Commission Lost"
    },
    {
        stage: "02. VIP Concierge & Late Check-in Phone Inquiry",
        callerId: "Inbound Phone Call • Suite 402 Guest Line",
        duration: "00:18",
        speaker: "Guest",
        message: "We'll be arriving around 11:30 PM. Is late check-in possible?",
        agentResponse: "Absolutely. I've flagged your reservation for express late arrival. Your room key code will be sent to your phone 1 hour before arrival.",
        action: "VIP Arrival Confirmed • Room Key Sent"
    },
    {
        stage: "03. In-Room Phone Order (Champagne & Towels)",
        callerId: "In-Room Landline • Room 402 Extension",
        duration: "00:12",
        speaker: "Guest",
        message: "Can we order champagne and extra towels to Suite 402?",
        agentResponse: "Done! Moët & Chandon champagne and extra plush towels are sent to Suite 402. Estimated delivery in 12 minutes.",
        action: "Room Service Sent • 12-Min Delivery"
    }
];

const COMPARISON_ROWS = [
    {
        metric: "Monthly Payroll Cost",
        traditional: "$3,500 – $5,000 / month (Desk Staff Salaries)",
        talkar: "Starting at $149 / month (Flat Service Rate)",
        winner: "talkar"
    },
    {
        metric: "Phone Call Answer Rate",
        traditional: "Misses 30%+ of calls during busy check-in hours",
        talkar: "100% Pickup Rate on 1st Ring (Day & Night)",
        winner: "talkar"
    },
    {
        metric: "Languages Spoken",
        traditional: "Usually 1 or 2 local languages",
        talkar: "30+ Languages with clear human speech",
        winner: "talkar"
    },
    {
        metric: "Simultaneous Callers",
        traditional: "1 caller at a time (Others put on hold)",
        talkar: "Unlimited simultaneous callers (Zero hold time)",
        winner: "talkar"
    },
    {
        metric: "Direct Revenue Kept",
        traditional: "18% – 25% Lost to Third-Party Travel Sites",
        talkar: "100% Direct Hotel Revenue (Zero Middleman Fees)",
        winner: "talkar"
    }
];

const HOTEL_TESTIMONIALS = [
    {
        quote: "Talkar answers our hotel main phone line day and night. It captured $42,000 in direct room booking phone calls in our first 30 days without our front desk staff ever touching the phone.",
        author: "Marcus Vance",
        role: "General Manager",
        property: "The Coastal Palm Resort & Spa (140 Rooms)"
    },
    {
        quote: "Our front desk staff used to be overwhelmed by phone calls during check-in rush hours. Talkar handles 100% of room service and room availability calls automatically.",
        author: "Elena Rostova",
        role: "Director of Hospitality Operations",
        property: "Apex Boutique Hotel Collection"
    },
    {
        quote: "Guests love how natural Talkar sounds over the phone. It handles late check-in requests and room service orders instantly.",
        author: "Julian Sterling",
        role: "VP of Revenue Management",
        property: "Grand Luxe Hotels"
    }
];

export default function HotelUseCasePage() {
    const [activeTab, setActiveTab] = useState(0);
    const [roomsCount, setRoomsCount] = useState(80);
    const [avgRoomRate, setAvgRoomRate] = useState(320);

    // Dynamic Business ROI Math
    const estimatedMissedCallsPerMonth = Math.round(roomsCount * 0.4);
    const monthlyLostRevenue = estimatedMissedCallsPerMonth * avgRoomRate * 0.35;
    const annualTalkarSavings = Math.round(monthlyLostRevenue * 12);

    return (
        <div className="w-full min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background overflow-x-clip">
            
            {/* ------------------------------------------------------------- */}
            {/* TWO-COLUMN EDGE-TO-EDGE SPLIT HERO */}
            {/* ------------------------------------------------------------- */}
            <section className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 border-b border-border/40 bg-background text-foreground">
                
                {/* Left Hero Column */}
                <div className="lg:col-span-7 p-8 lg:p-16 flex flex-col justify-between space-y-10 bg-background relative z-10">
                    
                    {/* Top Brand Nav Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BrandLogo className="text-xl font-bold tracking-tight text-foreground" />
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium">
                            <Link href="/" className="hover:text-foreground/80 transition-colors">Home</Link>
                            <Link href="/#use-cases" className="hover:text-foreground/80 transition-colors">Use Cases</Link>
                            <Link href="/#pricing" className="hover:text-foreground/80 transition-colors">Pricing</Link>
                            <ThemeToggle variant="ghost" size="icon" className="h-8 w-8 rounded-full text-foreground hover:bg-muted" />
                        </div>
                    </div>

                    {/* Center Hero Copy */}
                    <div className="space-y-6 my-auto py-8 max-w-xl text-left flex flex-col items-start">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-500" /> Phone Concierge for Hotels
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.06]">
                            Your Hotel Front Desk, Open 24 Hours — Zero Extra Payroll.
                        </h1>

                        <p className="text-base text-muted-foreground leading-relaxed">
                            Never miss a direct room reservation call again. Talkar answers your hotel phone on the 1st ring, locks in direct room bookings, dispatches room service, and answers guest questions in 30+ languages.
                        </p>

                        {/* Primary CTA Buttons */}
                        <div className="flex flex-wrap items-center gap-3.5 pt-2">
                            <Link
                                href="/auth/signup?industry=hotel"
                                className="inline-flex items-center justify-center h-11 px-7 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                            >
                                <Phone className="w-4 h-4" />
                                Try Hotel Demo Call
                            </Link>
                            <a
                                href="#call-flow"
                                className="inline-flex items-center justify-center h-11 px-6 rounded-full text-xs font-semibold border border-border bg-card/80 backdrop-blur-md hover:bg-muted/60 transition-all text-foreground"
                            >
                                See How It Works
                            </a>
                        </div>
                    </div>

                    {/* Bottom KPI Metrics Strip */}
                    <div className="pt-8 border-t border-border/60">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <h4 className="text-2xl font-bold text-foreground">1st Ring</h4>
                                <p className="text-xs text-muted-foreground">Instant Phone Pickup</p>
                            </div>
                            <div>
                                <h4 className="text-2xl font-bold text-emerald-500">30+ Languages</h4>
                                <p className="text-xs text-muted-foreground">Human-Sounding Voice</p>
                            </div>
                            <div>
                                <h4 className="text-2xl font-bold text-foreground">0% Middleman</h4>
                                <p className="text-xs text-muted-foreground">Direct Hotel Profit Kept</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Full-Height Vertical Photo with Minimal Tasteful Phone Call Card */}
                <div className="lg:col-span-5 relative flex flex-col justify-between p-6 lg:p-10 min-h-[500px] lg:min-h-screen overflow-hidden">
                    
                    {/* Vertical Photo Background */}
                    <div
                        className="absolute inset-0 bg-cover bg-top lg:bg-center"
                        style={{
                            backgroundImage: `url('/images/hotel-hero.jpg')`
                        }}
                    />
                    
                    {/* Minimal Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/50 dark:from-zinc-950 dark:via-zinc-950/40 dark:to-zinc-950/50" />

                    {/* Top Call Active Indicator */}
                    <div className="relative z-10 flex items-center justify-between p-3 px-5 rounded-2xl bg-background/90 text-foreground backdrop-blur-md border border-border shadow-md max-w-md mx-auto w-full text-xs font-medium">
                        <span className="flex items-center gap-2 font-semibold">
                            <PhoneIncoming className="w-4 h-4 text-emerald-500" />
                            Inbound Call to Grand Horizon Front Desk
                        </span>
                        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">1st Ring Answer</span>
                    </div>

                    {/* Elegant Luxury Hotel Call Dialogue Card */}
                    <div className="relative z-10 p-6 rounded-2xl bg-card/95 text-foreground backdrop-blur-xl border border-border shadow-2xl max-w-md mx-auto w-full space-y-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground">Guest Phone Reservation Line</p>
                                    <p className="text-[10px] text-muted-foreground">Direct Hotel Booking</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                                0% Middleman Fees
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-xl bg-muted/60 border border-border/40 space-y-1">
                                <p className="text-[10px] font-mono text-muted-foreground font-semibold">GUEST</p>
                                <p className="text-foreground font-medium">"Do you have an Ocean View Suite available this Friday for 2 nights?"</p>
                            </div>
                            <div className="p-3 rounded-xl bg-cta/10 border border-cta/20 text-cta space-y-1">
                                <p className="text-[10px] font-mono font-semibold">TALKAR HOTEL PHONE ASSISTANT</p>
                                <p className="font-medium text-foreground">"Yes! I have 2 Luxury Ocean Suites open starting at $340/night. I can reserve your room right now with complimentary breakfast."</p>
                            </div>
                        </div>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* HOW IT WORKS: 3-STEP GUEST CALL PROCESS */}
            {/* ------------------------------------------------------------- */}
            <section id="call-flow" className="max-w-7xl mx-auto px-6 lg:px-12 py-20 border-b border-border/40 space-y-12">
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Radio className="w-3.5 h-3.5" /> Simple 3-Step Process
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        How Talkar Handles Incoming Calls for Your Hotel
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                        No apps or downloads needed for guests. They simply call your hotel phone number as usual.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    
                    {/* Step 1 */}
                    <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs relative">
                        <div className="w-12 h-12 rounded-2xl bg-cta/10 border border-cta/20 flex items-center justify-center text-cta font-bold text-lg">
                            <PhoneIncoming className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-cta uppercase">Step 01</span>
                        <h3 className="text-lg font-bold text-foreground">Guest Dials Your Hotel</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            A guest calls your main hotel phone number from their phone or room landline.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 shadow-xs relative">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 font-bold text-lg">
                            <Mic className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase">Step 02</span>
                        <h3 className="text-lg font-bold text-foreground">Talkar Answers on 1st Ring</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Talkar answers immediately in clear human speech, checks room availability, and answers guest questions.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-xs relative">
                        <div className="w-12 h-12 rounded-2xl bg-cta/10 border border-cta/20 flex items-center justify-center text-cta font-bold text-lg">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-cta uppercase">Step 03</span>
                        <h3 className="text-lg font-bold text-foreground">Direct Booking Confirmed</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Reservation is locked in directly with zero third-party commission fees. Text confirmation is sent instantly.
                        </p>
                    </div>

                </div>
            </section>


            {/* ------------------------------------------------------------- */}
            {/* INTERACTIVE HOTEL ROI & MISSED CALL CALCULATOR */}
            {/* ------------------------------------------------------------- */}
            <section id="calculator" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <TrendingUp className="w-3.5 h-3.5" /> Direct Revenue Recovery Calculator
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        How much revenue do unanswered phone calls cost your hotel?
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl mx-auto">
                        Busy front desks miss over 30% of incoming phone calls during busy hours. Calculate how much direct profit Talkar recovers for your hotel.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
                    
                    {/* Interactive Inputs */}
                    <div className="lg:col-span-6 p-8 rounded-2xl border border-border bg-card shadow-xl space-y-6">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-cta" /> Hotel Details
                        </h3>

                        {/* Room Count Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-muted-foreground">Total Hotel Rooms</span>
                                <span className="text-foreground font-bold">{roomsCount} Rooms</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="400"
                                step="10"
                                value={roomsCount}
                                onChange={(e) => setRoomsCount(Number(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cta"
                            />
                        </div>

                        {/* Average Nightly Rate Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-muted-foreground">Average Room Rate</span>
                                <span className="text-foreground font-bold">${avgRoomRate} / night</span>
                            </div>
                            <input
                                type="range"
                                min="100"
                                max="1000"
                                step="20"
                                value={avgRoomRate}
                                onChange={(e) => setAvgRoomRate(Number(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cta"
                            />
                        </div>

                        <div className="p-4 rounded-xl bg-muted/60 text-xs text-muted-foreground space-y-1 border border-border/40">
                            <p className="font-semibold text-foreground">Estimated Unanswered Phone Calls:</p>
                            <p>~{estimatedMissedCallsPerMonth} incoming phone calls per month missed during front-desk rush hours.</p>
                        </div>
                    </div>

                    {/* Calculated Output Box */}
                    <div className="lg:col-span-6 p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-2xl space-y-6 text-center lg:text-left">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
                            ANNUAL REVENUE RECOVERY
                        </span>

                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Projected Annual Savings with Talkar</p>
                            <h3 className="text-4xl sm:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                +${annualTalkarSavings.toLocaleString()} / yr
                            </h3>
                        </div>

                        <div className="space-y-3 pt-2 text-xs border-t border-border/60">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Recovered Monthly Direct Bookings</span>
                                <span className="font-bold text-foreground">+${Math.round(monthlyLostRevenue).toLocaleString()} / mo</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Third-Party Booking Fees Saved</span>
                                <span className="font-bold text-emerald-500">+${Math.round(monthlyLostRevenue * 0.2).toLocaleString()} / mo</span>
                            </div>
                        </div>

                        <Link
                            href="/auth/signup?industry=hotel"
                            className="inline-flex items-center justify-center w-full h-11 rounded-xl text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            Claim Your Hotel Revenue Now <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* GUEST JOURNEY EXPERIENCE SIMULATOR */}
            {/* ------------------------------------------------------------- */}
            <section id="journey" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Workflow className="w-3.5 h-3.5" /> End-to-End Guest Experience
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Every phone call answered with 5-star precision.
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        From pre-arrival room reservations to late check-out phone requests, Talkar delivers flawless hospitality over the phone.
                    </p>
                </div>

                {/* Journey Stage Switcher */}
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-border/60 pb-4">
                        {HOTEL_SIMULATION_STEPS.map((step, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === idx
                                        ? "bg-cta text-cta-foreground shadow-xs"
                                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                            >
                                <PhoneCall className="w-3.5 h-3.5" />
                                {step.stage}
                            </button>
                        ))}
                    </div>

                    {/* Active Journey Card */}
                    <div className="p-8 rounded-3xl border border-border bg-card shadow-2xl space-y-8">
                        
                        {/* PHONE CALL HEADER */}
                        <div className="p-4 rounded-2xl bg-zinc-950 text-white flex items-center justify-between border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                    <PhoneCall className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white">{HOTEL_SIMULATION_STEPS[activeTab].stage}</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    </div>
                                    <p className="text-[10px] font-mono text-zinc-400">{HOTEL_SIMULATION_STEPS[activeTab].callerId}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-emerald-400">{HOTEL_SIMULATION_STEPS[activeTab].duration}</span>
                                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {HOTEL_SIMULATION_STEPS[activeTab].action}
                                </span>
                            </div>
                        </div>

                        {/* STAGE 01: Direct Room Reservation Call */}
                        {activeTab === 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                {/* Left: Call Audio Transcript Stream */}
                                <div className="lg:col-span-6 space-y-4 text-xs">
                                    <div className="p-4.5 rounded-2xl bg-muted/80 border border-border/60 space-y-1.5 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                                <PhoneCall className="w-3.5 h-3.5 text-muted-foreground" /> Guest Voice Line
                                            </span>
                                            <span className="text-[10px] font-mono text-muted-foreground">Inbound Call</span>
                                        </div>
                                        <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                                            "{HOTEL_SIMULATION_STEPS[0].message}"
                                        </p>
                                    </div>

                                    <div className="p-4.5 rounded-2xl bg-cta text-cta-foreground space-y-1.5 shadow-md">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5" /> Talkar Phone Assistant
                                            </span>
                                            <span className="text-[10px] font-mono opacity-80">Answered on 1st Ring</span>
                                        </div>
                                        <p className="font-medium text-sm leading-relaxed">
                                            "{HOTEL_SIMULATION_STEPS[0].agentResponse}"
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Financial Revenue Protection Meter */}
                                <div className="lg:col-span-6 p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-card to-card space-y-5">
                                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Hotel className="w-4 h-4 text-emerald-500" /> Revenue Kept Breakdown
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                                            100% DIRECT PROFIT
                                        </span>
                                    </div>

                                    {/* Financial Bar Visual */}
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span className="text-foreground">Direct Room Revenue</span>
                                                <span className="text-emerald-500 font-extrabold">$680.00</span>
                                            </div>
                                            <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                                                <div className="h-full bg-emerald-500 rounded-full w-full" />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span className="text-muted-foreground">Third-Party Booking Commission Paid</span>
                                                <span className="text-muted-foreground font-mono">$0.00</span>
                                            </div>
                                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-cta rounded-full w-0" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Total Middleman Fees Saved</span>
                                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">+$136.00 Kept</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STAGE 02: VIP Late Arrival Phone Call */}
                        {activeTab === 1 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 space-y-1">
                                        <p className="font-bold text-foreground">Guest Phone Stream:</p>
                                        <p className="text-muted-foreground font-medium">"{HOTEL_SIMULATION_STEPS[1].message}"</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-cta text-cta-foreground space-y-1">
                                        <p className="font-bold flex items-center gap-1">
                                            <Sparkles className="w-3.5 h-3.5" /> Talkar Phone Assistant Response:
                                        </p>
                                        <p className="font-medium">"{HOTEL_SIMULATION_STEPS[1].agentResponse}"</p>
                                    </div>
                                </div>

                                {/* VIP Mobile Pass */}
                                <div className="max-w-2xl mx-auto p-7 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white border border-amber-400/30 shadow-2xl space-y-6 relative overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                        <div>
                                            <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Grand Horizon Resort & Spa</p>
                                            <p className="text-base font-extrabold text-white">VIP Guest Access Pass</p>
                                        </div>
                                        <Key className="w-6 h-6 text-amber-400" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-center py-2">
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-[9px] text-zinc-400 uppercase">Assigned Room</p>
                                            <p className="text-lg font-extrabold text-white">Suite 402</p>
                                        </div>
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-[9px] text-zinc-400 uppercase">Door Access Code</p>
                                            <p className="text-lg font-mono font-extrabold text-amber-400">#402-VIP</p>
                                        </div>
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-[9px] text-zinc-400 uppercase">Arrival Time</p>
                                            <p className="text-xs font-bold text-emerald-400 mt-1">11:30 PM (Late)</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-white/10">
                                        <span className="flex items-center gap-1.5 text-white">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Room Key Sent via Text Message
                                        </span>
                                        <span className="text-amber-400 font-bold">Zero Front Desk Line</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STAGE 03: Room Service Phone Order */}
                        {activeTab === 2 && (
                            <div className="space-y-8">
                                <div className="text-center space-y-1">
                                    <h4 className="text-lg font-bold text-foreground">In-Room Phone Order Dispatch</h4>
                                    <p className="text-xs text-muted-foreground">Automated staff notification triggered from guest room phone call</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 rounded-2xl bg-card border border-border space-y-3 relative">
                                        <div className="flex items-center justify-between">
                                            <span className="w-7 h-7 rounded-full bg-cta/10 text-cta font-bold text-xs flex items-center justify-center border border-cta/20">1</span>
                                            <span className="text-[10px] font-mono text-muted-foreground">11:42 PM</span>
                                        </div>
                                        <h5 className="text-xs font-bold text-foreground">Guest Calls from Room Line</h5>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Guest orders champagne & extra towels over the room phone.
                                        </p>
                                        <span className="inline-block text-[10px] font-bold text-emerald-500">Answered on 1st Ring</span>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-card border border-border space-y-3 relative">
                                        <div className="flex items-center justify-between">
                                            <span className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center justify-center border border-amber-500/20">2</span>
                                            <span className="text-[10px] font-mono text-muted-foreground">11:43 PM</span>
                                        </div>
                                        <h5 className="text-xs font-bold text-foreground">Kitchen Staff Notified</h5>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Kitchen prepares champagne service while Housekeeping retrieves towels.
                                        </p>
                                        <span className="inline-block text-[10px] font-bold text-amber-500">Order Ticket Sent</span>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 relative">
                                        <div className="flex items-center justify-between">
                                            <span className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">3</span>
                                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">11:55 PM</span>
                                        </div>
                                        <h5 className="text-xs font-bold text-foreground">Delivered to Room</h5>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Order delivered to guest room in under 12 minutes.
                                        </p>
                                        <span className="inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">12-Min Delivery Complete</span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* COMPARISON TABLE: TRADITIONAL FRONT DESK VS TALKAR AI */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 text-cta border border-cta/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <BarChart3 className="w-3.5 h-3.5" /> Executive Cost Comparison
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Traditional Front Desk Staff vs. Talkar Phone Assistant
                    </h2>
                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                        Compare phone call pickup rates, labor costs, and direct booking profit side-by-side.
                    </p>
                </div>

                {/* Comparison Matrix Table */}
                <div className="max-w-5xl mx-auto overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                    <div className="grid grid-cols-12 bg-muted/60 p-4 font-bold text-xs border-b border-border text-foreground">
                        <div className="col-span-4">Operational Feature</div>
                        <div className="col-span-4 text-muted-foreground">Traditional Desk Staff</div>
                        <div className="col-span-4 text-cta flex items-center gap-1.5">
                            <PhoneCall className="w-4 h-4" /> Talkar Phone Assistant
                        </div>
                    </div>

                    <div className="divide-y divide-border/60 text-xs">
                        {COMPARISON_ROWS.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-12 p-4 items-center hover:bg-muted/30 transition-colors">
                                <div className="col-span-4 font-semibold text-foreground">{row.metric}</div>
                                <div className="col-span-4 text-muted-foreground flex items-center gap-1.5">
                                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                    {row.traditional}
                                </div>
                                <div className="col-span-4 font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    {row.talkar}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* GENERAL MANAGER & EXECUTIVE TESTIMONIALS */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-mono font-semibold uppercase tracking-wider">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Hospitality Executive Reviews
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Trusted by GMs at Boutique Hotels & Luxury Resorts
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        See how hotel leaders eliminate phone hold times while keeping 100% of direct room profits.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {HOTEL_TESTIMONIALS.map((t, idx) => (
                        <div key={idx} className="p-7 rounded-2xl border border-border bg-card space-y-6 shadow-xs flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                    "{t.quote}"
                                </p>
                            </div>

                            <div className="pt-4 border-t border-border/60">
                                <h4 className="text-sm font-bold text-foreground">{t.author}</h4>
                                <p className="text-xs text-cta font-medium">{t.role}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{t.property}</p>
                            </div>
                        </div>
                    ))}
                </div>

            </section>


            {/* ------------------------------------------------------------- */}
            {/* FEATURE GALLERY CARDS WITH BUSINESS FOCUS */}
            {/* ------------------------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 border-b border-border/40 space-y-16">
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Your Hotel Phone Line, Answered 24 Hours a Day
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Automated direct room reservations, room service dispatch, and spa scheduling over the phone.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Feature 1: Direct Bookings */}
                    <div className="group relative rounded-2xl overflow-hidden border border-border/80 bg-card min-h-[380px] flex flex-col justify-end p-7 transition-all duration-300 hover:border-cta/60 hover:shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800&auto=format&fit=crop"
                            alt="Luxury Suite Interior"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.7] contrast-[1.05] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-2">
                                <PhoneCall className="w-5 h-5 text-amber-300" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Zero Commission Lost</span>
                            <h3 className="text-xl font-bold text-white leading-snug">Direct Phone Room Bookings</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Bypass 18%-25% third-party booking fees by capturing room reservations directly over your hotel's main phone line.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2: Room Service */}
                    <div className="group relative rounded-2xl overflow-hidden border border-border/80 bg-card min-h-[380px] flex flex-col justify-end p-7 transition-all duration-300 hover:border-cta/60 hover:shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop"
                            alt="Hotel Fine Dining"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.7] contrast-[1.05] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-2">
                                <Utensils className="w-5 h-5 text-amber-300" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">12-Min Delivery Guarantee</span>
                            <h3 className="text-xl font-bold text-white leading-snug">Automated In-Room Service</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Guests call from room landlines or mobile to order breakfast, champagne, or restaurant reservations with automatic staff notifications.
                            </p>
                        </div>
                    </div>

                    {/* Feature 3: Resort Spa */}
                    <div className="group relative rounded-2xl overflow-hidden border border-border/80 bg-card min-h-[380px] flex flex-col justify-end p-7 transition-all duration-300 hover:border-cta/60 hover:shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop"
                            alt="Resort Spa & Pool"
                            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.7] contrast-[1.05] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                        
                        <div className="relative z-10 space-y-2 text-white">
                            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-2">
                                <Sparkles className="w-5 h-5 text-amber-300" />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider">Fully Booked Spa Schedule</span>
                            <h3 className="text-xl font-bold text-white leading-snug">Resort Spa Phone Booking</h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                Lock in massage treatments, pool cabana rentals, and golf tee times directly into your resort calendar over natural phone conversation.
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
                        <PhoneCall className="w-3.5 h-3.5" />
                        Ready to Capture 100% of Your Hotel's Direct Phone Reservations?
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
                        Launch your hotel's phone assistant in under 10 minutes.
                    </h2>

                    <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        Join luxury hotels and resorts capturing 100% of direct room reservation phone calls without adding front-desk payroll headcount.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Link
                            href="/auth/signup?industry=hotel"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full text-xs font-bold bg-cta text-cta-foreground hover:bg-cta/90 transition-all shadow-md gap-2"
                        >
                            <Phone className="w-4 h-4" />
                            Try Hotel Demo Call Now
                        </Link>
                    </div>

                    <div className="pt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 10-Minute Setup
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancel Anytime
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Keep 100% of Revenue
                        </span>
                    </div>
                </div>
            </section>
        </div>
    );
}
