"use client";

import React, { useState, useEffect } from "react";
import { Check, ArrowRight, Mic2, Cpu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrgConfig } from "@/context/OrgConfigContext";
import Link from "next/link";
import { toast } from "sonner";

interface ModelEngine {
  id: string;
  tierKey: string;
  name: string;
  subtitle: string;
  rateRupees: string;
  description: string;
  benefits: string[];
}

const AI_MODELS: ModelEngine[] = [
  {
    id: "echo-lite",
    tierKey: "starter",
    name: "Starter Engine",
    subtitle: "Standard transactional routing",
    rateRupees: "6.00",
    description: "A fast, lightweight agent optimized for direct customer interactions, routing calls, and responding to common transactional questions.",
    benefits: [
      "2 parallel call channels",
      "Standard response speed",
      "Includes 1 phone line"
    ]
  },
  {
    id: "neural-vocal-pro",
    tierKey: "pro",
    name: "Pro Engine",
    subtitle: "Natural speech & emotive client interactions",
    rateRupees: "4.00",
    description: "Combines deep conversational understanding with high-fidelity, emotional voice tones. Speaks with natural human cadence.",
    benefits: [
      "10 parallel active calls",
      "Near-instant response times",
      "Includes 2 premium phone lines"
    ]
  }
];

const VOICE_CATALOG = {
  starter: {
    provider: "deepgram",
    label: "Standard Voices",
    voices: [
      { id: "aura-asteria-en", name: "Asteria", gender: "Female" },
      { id: "aura-luna-en", name: "Luna", gender: "Female" },
      { id: "aura-stella-en", name: "Stella", gender: "Female" },
      { id: "aura-orion-en", name: "Orion", gender: "Male" },
      { id: "aura-arcas-en", name: "Arcas", gender: "Male" },
    ]
  },
  premium: {
    provider: "elevenlabs",
    label: "Premium Voices",
    voices: [
      { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "Female" },
      { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "Male" },
      { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", gender: "Female" },
      { id: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "Male" },
      { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "Female" },
      { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "Male" },
    ]
  }
};

export default function ModelsPage() {
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const [activeTier, setActiveTier] = useState<string>("starter");
  const [activeVoiceId, setActiveVoiceId] = useState<string>("");
  const [isProvisioned, setIsProvisioned] = useState<boolean>(false);
  const [customerStatus, setCustomerStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingVoice, setUpdatingVoice] = useState<string | null>(null);

  useEffect(() => {
    if (!dograhOrgId) {
      setLoading(false);
      return;
    }

    fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(statusData => {
        if (statusData) {
          if (statusData.plan) setActiveTier(statusData.plan.toLowerCase());
          if (statusData.voice_id) setActiveVoiceId(statusData.voice_id);
          setIsProvisioned(statusData.is_provisioned === true);
          setCustomerStatus(statusData.status || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dograhOrgId]);

  const handleVoiceChange = async (voiceId: string, provider: string) => {
    if (!dograhOrgId) return;
    setUpdatingVoice(voiceId);
    try {
      const res = await fetch(`/api/talkar/customers/by-org/${dograhOrgId}/voice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voiceId, provider })
      });
      if (res.ok) {
        setActiveVoiceId(voiceId);
        toast.success("Voice updated successfully.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to update voice.");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setUpdatingVoice(null);
    }
  };

  const isPremium = activeTier === "pro";
  const isPendingDeposit = customerStatus === "pending_deposit";

  const getActiveVoiceName = () => {
    const std = VOICE_CATALOG.starter.voices.find(v => v.id === activeVoiceId);
    if (std) return `${std.name} (${std.gender})`;
    const prem = VOICE_CATALOG.premium.voices.find(v => v.id === activeVoiceId);
    if (prem) return `${prem.name} (${prem.gender})`;
    return activeVoiceId ? "Custom Voice" : "Default";
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12 bg-background text-foreground">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure active voice identity and choose computational engines.
          </p>
        </div>

        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Active Voice</span>
            <span className="font-medium text-foreground">{getActiveVoiceName()}</span>
          </div>
          <div className="w-px bg-border self-stretch" />
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Engine Tier</span>
            <span className="font-medium text-foreground uppercase">{activeTier}</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: VOICE CONFIGURATION ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Voice Settings
          </h2>
        </div>

        {!isProvisioned ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-border bg-card/20 text-center gap-2">
            <Mic2 className="w-5 h-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground font-semibold">Agent not yet configured</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Your voice identity settings will be available as soon as your agent build is completed.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Show Starter Catalog ONLY if not on Premium plan */}
            {!isPremium && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    {VOICE_CATALOG.starter.label}
                  </h3>
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold">
                    <Link href="/wallet">Unlock Premium Voices</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {VOICE_CATALOG.starter.voices.map(voice => {
                    const isActive = activeVoiceId === voice.id;
                    return (
                      <div 
                        key={voice.id}
                        onClick={() => handleVoiceChange(voice.id, VOICE_CATALOG.starter.provider)}
                        className={`relative flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                          isActive 
                            ? "bg-foreground/[0.02] border-foreground/80 shadow-xs" 
                            : "bg-card border-border/70 hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{voice.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{voice.gender}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-foreground shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show Premium Catalog ONLY if on Premium plan */}
            {isPremium && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  {VOICE_CATALOG.premium.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {VOICE_CATALOG.premium.voices.map(voice => {
                    const isActive = activeVoiceId === voice.id;
                    return (
                      <div 
                        key={voice.id}
                        onClick={() => handleVoiceChange(voice.id, VOICE_CATALOG.premium.provider)}
                        className={`relative flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                          isActive 
                            ? "bg-foreground/[0.02] border-foreground/80 shadow-xs" 
                            : "bg-card border-border/70 hover:border-foreground/30"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{voice.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{voice.gender}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-foreground shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </section>

      {/* ── SECTION 2: COMPUTATIONAL ENGINES ── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Engine Configuration
          </h2>
        </div>

        {isPendingDeposit && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs">
            <span className="text-base">💰</span>
            <div>
              <span className="font-semibold">Activation pending — </span>
              your agent is configured on the <span className="font-bold uppercase">{activeTier}</span> plan but calls are blocked until you fund your wallet.
              <Link href="/wallet" className="ml-2 underline font-semibold">Add credits →</Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {AI_MODELS.map((model) => {
            const isActive = activeTier === model.tierKey;
            const isHigherTier = activeTier === "starter" && model.tierKey === "pro";

            return (
              <div 
                key={model.id}
                className={`relative flex flex-col justify-between rounded-lg border p-6 bg-card transition-all duration-200 ${
                  isActive ? "border-foreground/85 shadow-xs" : "border-border hover:border-foreground/20"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {model.subtitle}
                    </span>
                    {isActive && !isPendingDeposit && (
                      <Badge className="bg-foreground/5 text-foreground hover:bg-foreground/5 border border-foreground/10 text-[10px] font-bold rounded-sm">
                        ACTIVE
                      </Badge>
                    )}
                    {isActive && isPendingDeposit && (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold rounded-sm">
                        PENDING
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{model.name}</h3>
                  </div>

                  <div className="py-2 border-b border-border/50">
                    <span className="text-2xl font-extrabold text-foreground">₹{model.rateRupees}</span>
                    <span className="text-xs text-muted-foreground font-medium"> / min</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {model.description}
                  </p>

                  <ul className="space-y-2 pt-2 text-xs">
                    {model.benefits.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-foreground/90">
                        <Check className="w-3.5 h-3.5 text-foreground/80 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50">
                  {isActive && !isPendingDeposit ? (
                    <Button disabled className="w-full bg-foreground/5 text-foreground/80 border border-foreground/10 cursor-default h-9 text-xs font-medium">
                      Current Active Engine
                    </Button>
                  ) : isActive && isPendingDeposit ? (
                    <Button asChild className="w-full bg-amber-500 text-white hover:bg-amber-600 h-9 text-xs font-bold shadow-xs">
                      <Link href="/wallet" className="flex items-center justify-center gap-1">
                        Fund Wallet to Activate <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  ) : isHigherTier ? (
                    <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/90 h-9 text-xs font-bold shadow-xs">
                      <Link href="/wallet" className="flex items-center justify-center gap-1">
                        Upgrade Engine <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full border-border hover:bg-accent h-9 text-xs font-medium text-foreground">
                      <Link href="/wallet">
                        Change Tier Settings
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
