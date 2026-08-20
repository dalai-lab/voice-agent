"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, Sparkles, Check, ArrowRight, Volume2, Users, Play, Pause, Mic2, Lock
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
    subtitle: "Ideal for basic transactional queries & standard workflows",
    badge: "Starter Tier",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    rateRupees: "25.00",
    latencyLevel: "Ultra-Responsive (~400ms)",
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
    subtitle: "Emotive, natural speech for high-end client interactions",
    badge: "Recommended Engine",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    rateRupees: "18.00",
    latencyLevel: "Near-Instantaneous (~250ms)",
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

    // GET /status now returns plan, voice_id, and is_provisioned in one call.
    // The old /billing/subscription/by-org endpoint doesn't exist and always returned null.
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-12 bg-background text-foreground">
      
      {/* ── SECTION 1: ENGINES ── */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/40">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400 text-[10px] font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-orange-500" /> Talkar Intelligence Suite
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Conversational Voice Engines
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose the neural configuration that matches your brand voice. All engines integrate real-time hearing, cognitive reasoning, and vocal articulation.
            </p>
          </div>
        </div>

        {/* Model Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {AI_MODELS.map((model) => {
            const isActive = activeTier === model.tierKey;
            const isHigherTier = 
              (activeTier === "starter" && (model.tierKey === "pro" || model.tierKey === "elite")) ||
              (activeTier === "pro" && model.tierKey === "elite");

            return (
              <div 
                key={model.id}
                className={`relative flex flex-col justify-between rounded-lg border p-6 bg-card transition-all duration-300 ${
                  model.isPopular 
                    ? "border-orange-500/40 shadow-xs ring-1 ring-orange-500/20" 
                    : "border-border/50 hover:border-border"
                } ${isActive ? "ring-2 ring-emerald-500/50 border-emerald-500/40" : ""}`}
              >
                {model.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-bold px-3 py-1 rounded-full tracking-wider uppercase shadow-xs">
                    MOST POPULAR
                  </div>
                )}

                <div className="space-y-5">
                  {/* Header info */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[9px] font-mono tracking-wider uppercase rounded-full px-2 py-0.5 ${model.badgeColor}`}>
                      {model.badge}
                    </Badge>
                    {isActive && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-semibold flex items-center gap-1 rounded-full px-2">
                        <Check className="w-3 h-3" /> ACTIVE
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{model.name}</h3>
                    <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{model.subtitle}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground tracking-tight">₹{model.rateRupees}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ billing minute</span>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed border-t border-border/30 pt-4">
                    {model.description}
                  </p>

                  {/* Core Experience Benchmarks */}
                  <div className="space-y-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Brain className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Comprehension</span>
                        <span className="text-xs font-semibold text-foreground">{model.cognitiveLevel}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Volume2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Articulation</span>
                        <span className="text-xs font-semibold text-foreground">{model.voiceNaturalness}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block uppercase font-semibold">Channels Capacity</span>
                        <span className="text-xs font-semibold text-foreground">{model.concurrencyLimit} active lines</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits checklist */}
                  <div className="space-y-2 pt-3 border-t border-border/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Key Features</span>
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
                      Current Live Engine
                    </Button>
                  ) : isHigherTier ? (
                    <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md h-9 text-xs font-bold shadow-xs">
                      <Link href="/wallet" className="flex items-center justify-center gap-1.5">
                        Upgrade Engine <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full border-border/80 hover:bg-accent rounded-md h-9 text-xs font-semibold text-foreground">
                      <Link href="/wallet" className="flex items-center justify-center gap-1.5">
                        Switch Engine Tier
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 2: VOICES ── */}
      <section className="space-y-8 pt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/40">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mb-2">
              <Mic2 className="w-3 h-3 text-emerald-500" /> Identity Personalization
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Customize Your Voice
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select the vocal identity that best represents your brand. Changes apply instantly to your next call.
            </p>
          </div>
        </div>

        {/* Pending state — agent config not yet injected */}
        {!isProvisioned ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border/60 bg-muted/20 text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-semibold text-foreground">Voice selection isn't available yet</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your agent is still being configured by our team. Once it goes live, you'll be able to pick your voice here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Starter Catalog */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">{VOICE_CATALOG.starter.label}</h3>
                  <p className="text-xs text-muted-foreground">{VOICE_CATALOG.starter.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VOICE_CATALOG.starter.voices.map(voice => (
                  <div 
                    key={voice.id}
                    className={`relative flex items-center justify-between p-3 rounded-lg border transition-all ${
                      activeVoiceId === voice.id 
                        ? "bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/40" 
                        : "bg-card border-border hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{voice.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{voice.gender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeVoiceId === voice.id ? (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-[9px] px-1.5 py-0 shadow-none">Active</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="h-7 text-xs px-3"
                          disabled={updatingVoice !== null}
                          onClick={() => handleVoiceChange(voice.id, VOICE_CATALOG.starter.provider)}
                        >
                          {updatingVoice === voice.id ? "Applying..." : "Select"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Catalog */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    {VOICE_CATALOG.premium.label}
                    {!isPremiumUnlocked && <Badge variant="outline" className="text-[9px] bg-muted/50">Pro Required</Badge>}
                  </h3>
                  <p className="text-xs text-muted-foreground">{VOICE_CATALOG.premium.description}</p>
                </div>
                {!isPremiumUnlocked && (
                  <Button asChild size="sm" className="h-7 text-xs px-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 border-0 text-white">
                    <Link href="/wallet">Upgrade to Unlock</Link>
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VOICE_CATALOG.premium.voices.map(voice => (
                  <div 
                    key={voice.id}
                    className={`relative flex items-center justify-between p-3 rounded-lg border transition-all ${
                      !isPremiumUnlocked 
                        ? "opacity-50 grayscale bg-muted/30 border-transparent" 
                        : activeVoiceId === voice.id 
                          ? "bg-orange-500/5 border-orange-500/40 ring-1 ring-orange-500/40" 
                          : "bg-card border-border hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold flex items-center gap-1.5">
                        {voice.name}
                        {!isPremiumUnlocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{voice.gender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeVoiceId === voice.id ? (
                        <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-[9px] px-1.5 py-0 shadow-none">Active</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="h-7 text-xs px-3"
                          disabled={!isPremiumUnlocked || updatingVoice !== null}
                          onClick={() => handleVoiceChange(voice.id, VOICE_CATALOG.premium.provider)}
                        >
                          {updatingVoice === voice.id ? "Applying..." : "Select"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}


