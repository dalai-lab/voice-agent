"use client";

import { useState } from "react";
import { Check, X, PhoneCall, ArrowRight, Hotel, Stethoscope, Briefcase, Wrench } from "lucide-react";
import Link from "next/link";
import { initiateDemoCall } from "@/app/actions/demoCall";

export function DemoCallForm() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [useCase, setUseCase] = useState("hotel");
    const [callingState, setCallingState] = useState<"idle" | "calling" | "connected" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleInitiateCall = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCallingState("calling");
        setErrorMessage("");

        const formData = new FormData(e.currentTarget);
        formData.set("useCase", useCase);

        try {
            const result = await initiateDemoCall(null, formData);
            if (!result?.success) {
                setCallingState("error");
                setErrorMessage(result?.error || "Failed to connect to the voice agent.");
                return;
            }
            setCallingState("connected");
        } catch (error) {
            setCallingState("error");
            setErrorMessage("An unexpected error occurred.");
        }
    };

    const handleReset = () => {
        setCallingState("idle");
        setErrorMessage("");
    };

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

    if (callingState === "calling" || callingState === "connected") {
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
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center relative shadow-lg text-emerald-500">
                            <Check className="w-6 h-6" />
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                        {callingState === "calling" ? "Initiating Call..." : "Call Connected"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                        +91 {phone || "98765 43210"}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 w-full space-y-1">
                    <p className="font-semibold text-white">
                        {callingState === "calling" ? "Connecting call to your mobile..." : "Your phone should be ringing!"}
                    </p>
                </div>

                {callingState === "connected" && (
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

    const businessOptions = [
        { id: "hotel", label: "Hotels & Stays", icon: Hotel, available: true },
        { id: "medical", label: "Healthcare", icon: Stethoscope, available: false },
        { id: "sales", label: "Sales & Leads", icon: Briefcase, available: false },
        { id: "service", label: "Home Services", icon: Wrench, available: false },
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
                                    className={`h-9 px-2.5 rounded-lg text-[11px] font-medium border text-left flex items-center justify-between gap-1.5 transition-all ${isSelected
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
