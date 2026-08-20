"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, Sparkles, Check, ArrowRight, Volume2, Users, Play, Pause, Mic2, Lock, ShieldCheck, Activity, Cpu, Sliders
} from "lucide-react";
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
  badge: string;
  badgeColor: string;
  rateRupees: string;
  latencyLevel: string;
  latencyValue: number; // For progress bar/meter
  voiceNaturalness: string;
  concurrencyLimit: number;
  cognitiveLevel: string;
  vocalHardware: string;
  description: string;
  benefits: string[];
  bestUse: string;
  isPopular?: boolean;
}

const AI_MODELS: ModelEngine[] = [
  {
    id: "echo-lite",
    tierKey: "starter",
    name: "Echo-Lite Engine",
    subtitle: "Transactional routing & standard workflows",
    badge: "Starter Tier",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    rateRupees: "25.00",
    latencyLevel: "Ultra-Responsive (~400ms)",
    latencyValue: 60,
    voiceNaturalness: "Professional & Clear",
    concurrencyLimit: 2,
    cognitiveLevel: "Standard Reasoning",
    vocalHardware: "Synthesized Articulation",
    description: "A fast, lightweight agent optimized for direct customer interactions, routing calls, and responding to common transactional questions.",
    benefits: [
      "Handles 2 parallel call channels",
      "Responds instantly to customer voice interruptions",
      "Configurable conversational logic",
      "Includes 1 phone line"
    ],
    bestUse: "Local shops, simple booking, and basic FAQ routing."
  },
  {
    id: "neural-vocal-pro",
    tierKey: "pro",
    name: "NeuralVocal Pro Engine",
    subtitle: "Emotive speech for premium client interactions",
    badge: "Recommended Engine",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    rateRupees: "18.00",
    latencyLevel: "Near-Instantaneous (~250ms)",
    latencyValue: 85,
    voiceNaturalness: "Studio-Grade Emotive Inflection",
    concurrencyLimit: 10,
    cognitiveLevel: "Advanced Conceptual Reasoning",
    vocalHardware: "Human-Realistic Inflection Cluster",
    description: "Our most popular engine. Combines deep conversational understanding with high-fidelity, emotional voice tones. Speaks with natural human cadence.",
    benefits: [
      "Supports 10 parallel active calls",
      "Maintains context over long discussions",
      "Emotive, friendly vocal tones",
      "Includes 2 premium phone lines",
      "Reduced rate for higher volumes"
    ],
    bestUse: "Customer support desks, active sales campaigns, and clinical appointments.",
    isPopular: true
  },
  {
    id: "apex-omni-prime",
    tierKey: "elite",
    name: "Apex Omni Prime Engine",
    subtitle: "Maximum call capacity on private dedicated hardware",
    badge: "Enterprise Tier",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    rateRupees: "12.00",
    latencyLevel: "Instant response (~180ms)",
    latencyValue: 98,
    voiceNaturalness: "Indistinguishable from Human",
    concurrencyLimit: 50,
    cognitiveLevel: "Elite Reasoning & Analysis",
    vocalHardware: "Dedicated Neural Array",
    description: "Built for massive call volumes. Operates on isolated server clusters to guarantee near-zero lag and offers the lowest rates for large scale teams.",
    benefits: [
      "Dedicated capacity for 50 concurrent calls",
      "Support for cloning your custom brand voice",
      "Highest speech fidelity available",
      "Includes 5 premium phone lines",
      "52% cost reduction compared to Starter"
    ],
    bestUse: "Enterprise help desks, high-throughput outbound call centers, and custom brand voices."
  }
];

const VOICE_CATALOG = {
  starter: {
    provider: "deepgram",
    label: "Standard Voices",
    description: "Synthetic, ultra-low latency voices.",
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
    description: "High-fidelity, emotive conversational voices.",
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
        toast.success("Voice successfully updated!", {
          description: "Your agent will use this voice on the next call."
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Failed to update voice", {
          description: err.detail || res.statusText
        });
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setUpdatingVoice(null);
    }
  };

  const isPremiumUnlocked = activeTier === "pro" || activeTier === "elite";
  const isStandardUnlocked = activeTier === "starter";

  const getActiveVoiceName = () => {
    const std = VOICE_CATALOG.starter.voices.find(v => v.id === activeVoiceId);
    if (std) return `${std.name} (${std.gender})`;
    const prem = VOICE_CATALOG.premium.voices.find(v => v.id === activeVoiceId);
    if (prem) return `${prem.name} (${prem.gender})`;
    return activeVoiceId ? "Custom Voice" : "Not Set";
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12 bg-background text-foreground transition-all duration-300">
      
      {/* ── HEADER & INTEGRATED CONTROL MODULE ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-xl p-8 shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase">
              <Sliders className="w-3.5 h-3.5 animate-pulse" /> Voice Engine Workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Vocal Identity Suite
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Control the linguistic cognition, tone fidelity, and latency configurations of your AI Agent in real-time.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-md">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Active System Voice</span>
                <span className="text-sm font-semibold text-foreground">{getActiveVoiceName()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-md">
              <Cpu className="w-5 h-5 text-primary" />
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Current Engine Tier</span>
                <span className="text-sm font-semibold text-foreground uppercase">{activeTier}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: IDENTITY PERSONALIZATION (CUSTOMIZE YOUR VOICE) ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-primary" /> 1. Vocal Customization
            </h2>
            <p className="text-xs text-muted-foreground">
              Select standard or premium high-fidelity voices to align with your brand persona.
            </p>
          </div>
        </div>

        {/* Pending state — agent config not yet injected */}
        {!isProvisioned ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/80 bg-muted/10 text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center border border-border/50 animate-pulse">
              <Mic2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-base font-bold text-foreground">Awaiting Agent Configuration</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your voice identity module will unlock as soon as our integration team finishes building your agent.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Standard Catalog */}
            <div className={`relative flex flex-col justify-between rounded-xl border p-6 bg-card/40 backdrop-blur-xs transition-all duration-300 ${
              isStandardUnlocked ? "border-border/50" : "border-transparent bg-muted/10 opacity-70"
            }`}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {VOICE_CATALOG.starter.label}
                      {!isStandardUnlocked && <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground">Starter Tier Only</Badge>}
                    </h3>
                    <p className="text-xs text-muted-foreground">{VOICE_CATALOG.starter.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                  {VOICE_CATALOG.starter.voices.map(voice => {
                    const isActive = activeVoiceId === voice.id;
                    return (
                      <div 
                        key={voice.id}
                        onClick={() => isStandardUnlocked && handleVoiceChange(voice.id, VOICE_CATALOG.starter.provider)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          !isStandardUnlocked 
                            ? "cursor-not-allowed opacity-50 bg-muted/20 border-transparent" 
                            : isActive 
                              ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/40" 
                              : "bg-card border-border/60 hover:border-border hover:shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                            {voice.name}
                            {!isStandardUnlocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{voice.gender}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            isStandardUnlocked && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-primary">
                                Apply
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Premium Catalog */}
            <div className={`relative flex flex-col justify-between rounded-xl border p-6 bg-card/40 backdrop-blur-xs transition-all duration-300 ${
              isPremiumUnlocked ? "border-border/50" : "border-transparent bg-muted/10 opacity-70"
            }`}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {VOICE_CATALOG.premium.label}
                      {!isPremiumUnlocked && <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground">Pro / Elite Required</Badge>}
                    </h3>
                    <p className="text-xs text-muted-foreground">{VOICE_CATALOG.premium.description}</p>
                  </div>
                  {!isPremiumUnlocked && (
                    <Button asChild size="sm" className="h-8 text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white border-0">
                      <Link href="/wallet">Unlock Premium</Link>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                  {VOICE_CATALOG.premium.voices.map(voice => {
                    const isActive = activeVoiceId === voice.id;
                    return (
                      <div 
                        key={voice.id}
                        onClick={() => isPremiumUnlocked && handleVoiceChange(voice.id, VOICE_CATALOG.premium.provider)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          !isPremiumUnlocked 
                            ? "cursor-not-allowed opacity-50 bg-muted/20 border-transparent" 
                            : isActive 
                              ? "bg-orange-500/10 border-orange-500/40 ring-1 ring-orange-500/40" 
                              : "bg-card border-border/60 hover:border-border hover:shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                            {voice.name}
                            {!isPremiumUnlocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{voice.gender}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            isPremiumUnlocked && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-primary">
                                Apply
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ── SECTION 2: CONVERSATIONAL ENGINE TIERS (MODELS SHOWCASE) ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> 2. Computational Engines
            </h2>
            <p className="text-xs text-muted-foreground">
              Evaluate hardware configuration modules, latency scores, and subscription plans.
            </p>
          </div>
        </div>

        {/* Engine Modules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {AI_MODELS.map((model) => {
            const isActive = activeTier === model.tierKey;
            const isHigherTier = 
              (activeTier === "starter" && (model.tierKey === "pro" || model.tierKey === "elite")) ||
              (activeTier === "pro" && model.tierKey === "elite");

            return (
              <div 
                key={model.id}
                className={`relative flex flex-col justify-between rounded-xl border p-6 bg-gradient-to-b from-card to-card/50 transition-all duration-300 hover:shadow-md ${
                  model.isPopular 
                    ? "border-orange-500/30 shadow-xs" 
                    : "border-border/50 hover:border-border"
                } ${isActive ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-emerald-500/[0.01]" : ""}`}
              >
                {model.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-bold px-3 py-1 rounded-full tracking-wider uppercase shadow-xs">
                    MOST POPULAR
                  </div>
                )}

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] font-mono tracking-wider uppercase rounded-full px-2.5 py-0.5 ${model.badgeColor}`}>
                      {model.badge}
                    </Badge>
                    {isActive && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1 rounded-full px-2 py-0.5">
                        <Check className="w-3 h-3" /> ACTIVE ENGINE
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{model.name}</h3>
                    <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{model.subtitle}</p>
                  </div>

                  {/* Price Block */}
                  <div className="flex items-baseline gap-1 bg-muted/20 p-3 rounded-lg border border-border/40">
                    <span className="text-2xl font-extrabold text-foreground tracking-tight">₹{model.rateRupees}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ billing minute</span>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {model.description}
                  </p>

                  {/* Dynamic Hardware & Latency Meter metrics */}
                  <div className="space-y-4 pt-3 border-t border-border/30">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-muted-foreground">
                        <span>Latency Benchmark</span>
                        <span className="text-foreground">{model.latencyLevel}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500" 
                          style={{ width: `${model.latencyValue}%` }} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Cognition</span>
                        <span className="font-semibold text-foreground block mt-0.5 truncate">{model.cognitiveLevel}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Capacity</span>
                        <span className="font-semibold text-foreground block mt-0.5 truncate">{model.concurrencyLimit} Lines</span>
                      </div>
                    </div>
                  </div>

                  {/* Feature check list */}
                  <div className="space-y-2 pt-3 border-t border-border/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Included System Limits</span>
                    <ul className="space-y-1.5">
                      {model.benefits.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-foreground/90">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/30">
                  {isActive ? (
                    <Button disabled className="w-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 opacity-100 cursor-default rounded-md h-9 text-xs font-semibold">
                      Currently Running Engine
                    </Button>
                  ) : isHigherTier ? (
                    <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md h-9 text-xs font-bold shadow-xs">
                      <Link href="/wallet" className="flex items-center justify-center gap-1.5">
                        Upgrade Workspace <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full border-border/80 hover:bg-accent rounded-md h-9 text-xs font-semibold text-foreground">
                      <Link href="/wallet" className="flex items-center justify-center gap-1.5">
                        Switch Tier Tones
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
