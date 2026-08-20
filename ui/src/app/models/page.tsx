"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, Sparkles, Check, ArrowRight, ShieldCheck, Cpu, Volume2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";
import Link from "next/link";

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
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
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
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/25 badge-glow",
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
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
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

export default function ModelsPage() {
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const [activeTier, setActiveTier] = useState<string>("starter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dograhOrgId) {
      setLoading(false);
      return;
    }

    fetch(`/api/talkar/billing/subscription/by-org/${dograhOrgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.plan) {
          setActiveTier(data.plan.toLowerCase());
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dograhOrgId]);

  return (
    <div className="dark min-h-screen bg-[#090A0F] text-zinc-100 relative overflow-x-hidden font-sans">
      <div className="absolute inset-0 hero-bg pointer-events-none -z-10" />
      <div className="absolute inset-0 hero-stripe-pattern pointer-events-none -z-10" />
      
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-orange-500/25 bg-orange-500/5 text-orange-400 text-[10px] font-semibold uppercase tracking-wider badge-glow">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Talkar Intelligence Suite
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Conversational Voice Engines
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Choose the neural configuration that matches your brand voice. All engines integrate real-time hearing, cognitive decision making, and vocal articulation.
          </p>
        </div>

        {/* Model Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {AI_MODELS.map((model) => {
            const isActive = activeTier === model.tierKey;
            const isHigherTier = 
              (activeTier === "starter" && (model.tierKey === "pro" || model.tierKey === "elite")) ||
              (activeTier === "pro" && model.tierKey === "elite");

            return (
              <div 
                key={model.id}
                className={`relative flex flex-col justify-between rounded-3xl border transition-all duration-300 p-8 bg-black/40 backdrop-blur-xl ${
                  model.isPopular 
                    ? "border-orange-500/40 shadow-2xl shadow-orange-500/[0.03] scale-102 lg:-translate-y-2" 
                    : "border-white/10 hover:border-white/20"
                } ${isActive ? "ring-2 ring-emerald-500/50 border-emerald-500/40" : ""}`}
              >
                {model.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full tracking-wider uppercase shadow-md badge-glow">
                    MOST POPULAR
                  </div>
                )}

                <div className="space-y-6">
                  {/* Header info */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] font-mono tracking-wider uppercase rounded-full px-2.5 py-0.5 ${model.badgeColor}`}>
                      {model.badge}
                    </Badge>
                    {isActive && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 rounded-full px-2.5">
                        <Check className="w-3.5 h-3.5" /> ACTIVE
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{model.name}</h3>
                    <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{model.subtitle}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-white tracking-tight">₹{model.rateRupees}</span>
                    <span className="text-xs text-zinc-500 font-medium">/ billing minute</span>
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed border-t border-white/5 pt-5">
                    {model.description}
                  </p>

                  {/* Core Experience Benchmarks (Simplified, No Tech Jargon) */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                        <Brain className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Cognitive Comprehension</span>
                        <span className="text-xs font-semibold text-zinc-200">{model.cognitiveLevel}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                        <Volume2 className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Speech Articulation</span>
                        <span className="text-xs font-semibold text-zinc-200">{model.voiceNaturalness}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Simultaneous Channels</span>
                        <span className="text-xs font-semibold text-zinc-200">{model.concurrencyLimit} active callers</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits checklist */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Key Features</span>
                    <ul className="space-y-2">
                      {model.benefits.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 text-xs text-zinc-300">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  {isActive ? (
                    <Button disabled className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 opacity-100 cursor-default rounded-xl h-11 text-xs font-semibold">
                      Current Live Engine
                    </Button>
                  ) : isHigherTier ? (
                    <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-11 text-xs font-bold shadow-lg shadow-orange-500/10">
                      <Link href="/wallet" className="flex items-center justify-center gap-2">
                        Upgrade Workspace Engine <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full border-white/10 hover:bg-white/5 rounded-xl h-11 text-xs font-semibold text-zinc-300">
                      <Link href="/wallet" className="flex items-center justify-center gap-2">
                        Switch Engine Tier
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
