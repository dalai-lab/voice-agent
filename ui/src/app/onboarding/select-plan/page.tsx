"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Shield, Rocket, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";
import { SidebarTeamSwitcher } from "@/components/layout/SidebarTeamSwitcher";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    icon: <Zap className="w-8 h-8 text-blue-500 mb-4" />,
    price: "₹6",
    priceUnit: "per minute",
    description: "Perfect for small businesses getting started with voice AI.",
    depositRequired: "₹6,000 wallet minimum",
    features: [
      "2 Concurrent Calls",
      "Up to 15 min calls",
      "Standard Voices (Deepgram)",
      "GPT-4o Mini",
      "Email Support",
      "1 Free Phone Number",
    ],
    recommended: false,
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Rocket className="w-8 h-8 text-purple-500 mb-4" />,
    price: "₹4",
    priceUnit: "per minute",
    description: "For growing businesses needing higher volume and better AI.",
    depositRequired: "₹8,000 wallet minimum",
    features: [
      "10 Concurrent Calls",
      "Up to 30 min calls",
      "Premium Voices (ElevenLabs)",
      "GPT-4o",
      "Priority Support",
      "2 Free Phone Numbers",
    ],
    recommended: true,
  },
];

export default function SelectPlanPage() {
  const { user, logout } = useAuth();
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleSelectTier = async (tierId: string) => {
    if (!dograhOrgId) return;
    setSubmitting(tierId);
    try {
      const res = await fetch(`/api/talkar/customers/by-org/${dograhOrgId}/select-tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "pending_deposit" && data.redirect) {
          router.push(data.redirect);
        } else {
          router.push("/overview");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to select tier: ${err.detail || err.message || res.statusText}`);
        setSubmitting(null);
      }
    } catch (err) {
      alert("An error occurred. Please try again.");
      setSubmitting(null);
    }
  };

  return (
    <div className="dark min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col relative overflow-x-hidden font-sans">
      <div className="absolute inset-0 hero-bg pointer-events-none -z-10" />
      <div className="absolute inset-0 hero-stripe-pattern pointer-events-none -z-10" />
      
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Corporate Header */}
      <header className="w-full border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <span className="font-extrabold text-base font-sans">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Talkar</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-48">
              <SidebarTeamSwitcher />
            </div>
            <Button 
              variant="ghost" 
              onClick={() => void logout()} 
              className="text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg h-9 px-3 border border-white/5 cursor-pointer"
            >
              Sign Out
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/5 text-orange-400 text-[10px] font-semibold uppercase tracking-wider badge-glow">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Workspace Activation
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 z-10 w-full">
        <div className="text-center space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Choose Your Plan</h1>
          <p className="text-lg text-zinc-400">
            Your wallet is funded and your agent is ready. Select a usage tier to go live instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8">
          {TIERS.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-black/45 border-white/10 ${
                tier.recommended ? "border-orange-500/80 shadow-md scale-105 z-10" : "border-white/5"
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-md badge-glow">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center">{tier.icon}</div>
                <CardTitle className="text-2xl text-white">{tier.name}</CardTitle>
                <CardDescription className="pt-2 text-zinc-400">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow text-center space-y-6">
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                  <span className="text-zinc-500 ml-2">/ {tier.priceUnit}</span>
                  <p className="text-orange-400 text-xs font-medium mt-2">{tier.depositRequired}</p>
                </div>
                <ul className="space-y-3 text-sm text-left pt-4 border-t border-white/5">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start text-zinc-300">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-6">
                <Button 
                  onClick={() => handleSelectTier(tier.id)} 
                  disabled={submitting !== null}
                  className={`w-full h-11 rounded-xl font-bold text-sm ${
                    tier.recommended 
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 shadow-lg shadow-orange-500/10" 
                      : "bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                  }`}
                  size="lg"
                >
                  {submitting === tier.id ? "Activating..." : `Select ${tier.name}`}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
