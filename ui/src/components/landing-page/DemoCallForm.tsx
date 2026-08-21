"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, PhoneCall, ArrowRight, Hotel, Stethoscope, Briefcase, Wrench, Star, BedDouble, Users, Calendar, Smile, Meh, Frown } from "lucide-react";
import Link from "next/link";
import { initiateDemoCall, pollDemoCallResult } from "@/app/actions/demoCall";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HotelExtractedData {
    caller_name?: string;
    wants_to_book?: boolean;
    inquiry_type?: string;
    check_in_date?: string;
    guests_count?: number;
    room_preference?: string;
    sentiment?: "Positive" | "Neutral" | "Negative";
    interest_score?: number;
}

// ---------------------------------------------------------------------------
// Hotel Demo Result Card
// ---------------------------------------------------------------------------

function SentimentBadge({ sentiment }: { sentiment?: string }) {
    if (!sentiment) return null;
    const map: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
        Positive: { icon: <Smile className="w-3.5 h-3.5" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
        Neutral:  { icon: <Meh  className="w-3.5 h-3.5" />, color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/30"  },
        Negative: { icon: <Frown className="w-3.5 h-3.5" />, color: "text-rose-400",   bg: "bg-rose-500/10   border-rose-500/30"   },
    };
    const s = map[sentiment] ?? map["Neutral"];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.color} ${s.bg}`}>
            {s.icon} {sentiment}
        </span>
    );
}

function InterestMeter({ score }: { score?: number }) {
    const pct = score != null ? Math.round((score / 10) * 100) : 0;
    const label = score == null ? "–" : score >= 8 ? "🔥 Very Interested" : score >= 5 ? "👀 Somewhat Interested" : "😐 Low Interest";
    const barColor = score == null ? "bg-gray-600" : score >= 8 ? "bg-gradient-to-r from-orange-500 to-rose-500" : score >= 5 ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gray-500";

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400 font-medium">Interest Level</span>
                <span className="text-white font-semibold">{score != null ? `${score}/10` : "–"}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[10px] text-gray-400">{label}</p>
        </div>
    );
}

function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | boolean | null }) {
    if (value == null || value === "" || value === false) return null;
    const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
    return (
        <div className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
            <span className="text-orange-400 mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0">
                <p className="text-[10px] text-gray-500 font-medium leading-none mb-0.5">{label}</p>
                <p className="text-xs text-white font-semibold truncate">{display}</p>
            </div>
        </div>
    );
}

function HotelResultCard({
    data,
    phone,
    onReset,
}: {
    data: HotelExtractedData;
    phone: string;
    onReset: () => void;
}) {
    return (
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 space-y-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#FF5500]/20 to-[#E11D48]/10 border border-orange-500/20 rounded-t-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5500] to-[#E11D48] flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
                    <Hotel className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-tight">The Grand Horizon</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Sarah · Virtual Receptionist · +91 {phone}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-semibold">Call Complete</span>
                </div>
            </div>

            {/* Body */}
            <div className="bg-[#16151E]/95 border-x border-white/10 p-4 space-y-3">
                {/* Caller + sentiment row */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-gray-500 font-medium">Caller</p>
                        <p className="text-sm text-white font-bold">{data.caller_name || "Guest"}</p>
                    </div>
                    <SentimentBadge sentiment={data.sentiment} />
                </div>

                <div className="h-px bg-white/5" />

                {/* Details */}
                <div>
                    <DataRow
                        icon={<Star className="w-3.5 h-3.5" />}
                        label="Reason for Call"
                        value={data.inquiry_type}
                    />
                    <DataRow
                        icon={<Check className="w-3.5 h-3.5" />}
                        label="Wants to Book"
                        value={data.wants_to_book}
                    />
                    <DataRow
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        label="Check-in Date"
                        value={data.check_in_date}
                    />
                    <DataRow
                        icon={<Users className="w-3.5 h-3.5" />}
                        label="Number of Guests"
                        value={data.guests_count}
                    />
                    <DataRow
                        icon={<BedDouble className="w-3.5 h-3.5" />}
                        label="Room Preference"
                        value={data.room_preference}
                    />
                </div>

                <div className="h-px bg-white/5" />

                {/* Interest meter */}
                <InterestMeter score={data.interest_score} />
            </div>

            {/* Footer */}
            <div className="bg-[#16151E]/95 border border-white/10 rounded-b-2xl p-4 flex gap-2">
                <Link
                    href="/auth/signup"
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                    Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                    onClick={onReset}
                    type="button"
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-gray-400"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DemoCallForm() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [useCase, setUseCase] = useState("hotel");
    const [callingState, setCallingState] = useState<"idle" | "calling" | "connected" | "polling" | "done" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [workflowRunId, setWorkflowRunId] = useState<number | null>(null);
    const [extractedData, setExtractedData] = useState<HotelExtractedData | null>(null);

    // Keep a ref to the interval so we can clear it safely
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // Safety cap: stop polling after 10 minutes
    const pollStartRef = useRef<number>(0);
    const MAX_POLL_MS = 10 * 60 * 1000;

    // Stop polling on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // Start polling whenever workflowRunId is set and we are in "connected" state
    useEffect(() => {
        if (!workflowRunId || callingState !== "connected") return;

        setCallingState("polling");
        pollStartRef.current = Date.now();

        pollIntervalRef.current = setInterval(async () => {
            // Safety cap
            if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
                clearInterval(pollIntervalRef.current!);
                return;
            }

            const result = await pollDemoCallResult(workflowRunId);

            if (result.ready) {
                clearInterval(pollIntervalRef.current!);
                setExtractedData((result.extractedData ?? {}) as HotelExtractedData);
                setCallingState("done");
            }
            // If error on individual poll, just keep polling — don't surface noise
        }, 5000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflowRunId, callingState === "connected"]);

    const handleInitiateCall = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCallingState("calling");
        setErrorMessage("");
        setWorkflowRunId(null);
        setExtractedData(null);

        const formData = new FormData(e.currentTarget);
        formData.set("useCase", useCase);

        try {
            const result = await initiateDemoCall(null, formData);
            if (!result?.success) {
                setCallingState("error");
                setErrorMessage(result?.error || "Failed to connect to the voice agent.");
                return;
            }
            // Store run ID — the polling effect kicks in once callingState → "connected"
            if (result.workflowRunId) setWorkflowRunId(result.workflowRunId);
            setCallingState("connected");
        } catch {
            setCallingState("error");
            setErrorMessage("An unexpected error occurred.");
        }
    };

    const handleReset = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setCallingState("idle");
        setErrorMessage("");
        setWorkflowRunId(null);
        setExtractedData(null);
    };

    // ── Error state ──────────────────────────────────────────────────────────
    if (callingState === "error") {
        return (
            <div className="py-6 px-4 space-y-4 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-md bg-[#16151E]/95 border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
                <div className="relative flex items-center justify-center my-2 text-rose-500">
                    <X className="w-12 h-12" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Call Request Failed</p>
                    <p className="text-xs text-gray-400">{errorMessage}</p>
                </div>
                <button
                    onClick={handleReset}
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white mt-2"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // ── Hotel result card (hotel only for now) ───────────────────────────────
    if (callingState === "done" && useCase === "hotel" && extractedData) {
        return <HotelResultCard data={extractedData} phone={phone} onReset={handleReset} />;
    }

    // ── Calling / connected / polling ────────────────────────────────────────
    if (callingState === "calling" || callingState === "connected" || callingState === "polling") {
        const isPolling = callingState === "polling";
        return (
            <div className="py-6 px-4 space-y-4 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-md bg-[#16151E]/95 border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
                <div className="relative flex items-center justify-center my-2">
                    {callingState === "calling" ? (
                        <>
                            <div className="w-14 h-14 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center animate-ping absolute inset-0 opacity-75" />
                            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white flex items-center justify-center relative shadow-lg">
                                <PhoneCall className="w-6 h-6 animate-pulse" />
                            </div>
                        </>
                    ) : isPolling ? (
                        <>
                            <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center animate-pulse absolute inset-0 opacity-75" />
                            <div className="w-14 h-14 rounded-full bg-[#1a1923] border-2 border-amber-500 text-amber-400 flex items-center justify-center relative shadow-lg">
                                <PhoneCall className="w-6 h-6" />
                            </div>
                        </>
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center relative shadow-lg text-emerald-500">
                            <Check className="w-6 h-6" />
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                        {callingState === "calling"
                            ? "Initiating Call..."
                            : isPolling
                            ? "Call in Progress…"
                            : "Call Connected"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">+91 {phone || "98765 43210"}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 w-full space-y-1">
                    <p className="font-semibold text-white">
                        {callingState === "calling"
                            ? "Connecting call to your mobile..."
                            : isPolling
                            ? "Talk to Sarah — we'll show your results when the call ends!"
                            : "Your phone should be ringing!"}
                    </p>
                </div>

                {(callingState === "connected" || isPolling) && (
                    <Link
                        href="/auth/signup"
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-white/10 bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-90 transition-all text-white shadow-sm flex items-center justify-center gap-2 mt-2"
                    >
                        Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>
        );
    }

    // ── Idle form ────────────────────────────────────────────────────────────
    const businessOptions = [
        { id: "hotel",   label: "Hotels & Stays",  icon: Hotel,       available: true },
        { id: "medical", label: "Healthcare",       icon: Stethoscope, available: true },
        { id: "sales",   label: "Sales & Leads",   icon: Briefcase,   available: true },
        { id: "service", label: "Home Services",   icon: Wrench,      available: true },
    ];

    return (
        <div className="w-full max-w-md bg-[#16151E]/95 border border-white/10 p-6 sm:p-8 flex flex-col gap-5 rounded-2xl shadow-2xl backdrop-blur-xl hover:border-orange-500/30 transition-all">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <div className="text-sm text-white font-bold tracking-tight">Try Live AI Demo</div>
                    <div className="text-xs text-gray-400 font-light mt-0.5">Receive an instant test call from Talkar</div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs text-emerald-400 font-medium">Ready</span>
                </div>
            </div>

            <form onSubmit={handleInitiateCall} className="space-y-3.5 text-xs text-white">
                <div className="space-y-1 text-left">
                    <label className="text-[11px] font-semibold text-white/90 block">Your Name</label>
                    <input
                        type="text"
                        required
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className="w-full h-9.5 px-3 py-3 rounded-lg border border-white/10 bg-[#0F0E14] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                    />
                </div>

                <div className="space-y-1 text-left">
                    <label className="text-[11px] font-semibold text-white/90 block">Mobile Number</label>
                    <div className="flex gap-2">
                        <span className="h-9.5 px-3 py-3 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-semibold flex items-center font-mono shrink-0 gap-1.5">
                            <span className="text-sm leading-none">🇮🇳</span> +91
                        </span>
                        <input
                            type="tel"
                            required
                            name="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="98765 43210"
                            className="w-full h-9.5 px-3 py-3 rounded-lg border border-white/10 bg-[#0F0E14] text-white text-xs font-mono placeholder:text-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1 text-left">
                    <label className="text-[11px] font-semibold text-white/90 block">Select Business Type</label>
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
                                    className={`h-9 px-2.5 rounded-lg text-[11px] font-medium border text-left flex items-center justify-between gap-1.5 transition-all ${
                                        isSelected
                                            ? "bg-orange-500/20 border-orange-500 text-orange-500 font-semibold shadow-xs"
                                            : item.available
                                            ? "border-white/10 bg-[#0F0E14] hover:bg-white/5 text-gray-300"
                                            : "border-white/5 bg-white/5 text-gray-600 cursor-not-allowed"
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-orange-500" : "text-gray-500"}`} />
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    {!item.available && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-sans uppercase font-semibold shrink-0">
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
                    className="w-full mt-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white hover:opacity-95 transition-all shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 group py-3.5"
                >
                    <PhoneCall className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    Receive Demo Call
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}
