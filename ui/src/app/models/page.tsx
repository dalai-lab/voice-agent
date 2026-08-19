"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, Cpu, Zap, ShieldCheck, Sparkles, Check, ArrowRight, Activity, 
  Layers, Volume2, Clock, Gauge, BarChart3, HelpCircle, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
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
  latencyMs: number;
  realismScore: number;
  concurrencyLimit: number;
  llmBackbone: string;
  ttsEngine: string;
  description: string;
  features: string[];
  recommendedFor: string;
  isPopular?: boolean;
}

const AI_MODELS: ModelEngine[] = [
  {
    id: "echo-lite",
    tierKey: "starter",
    name: "Talkar Echo-Lite 1.0",
    subtitle: "High-Speed Standard Neural Model",
    badge: "STARTER ENGINE",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    rateRupees: "25.00",
    latencyMs: 400,
    realismScore: 94,
    concurrencyLimit: 2,
    llmBackbone: "GPT-4o Mini",
    ttsEngine: "Deepgram Aura-2",
    description: "Lightweight, ultra-responsive neural engine optimized for rapid transactional queries and standard automated assistant workflows.",
    features: [
      "Sub-400ms Turn Latency",
      "Standard Conversational Buffer",
      "2 Concurrent Call Channels",
      "Automatic Speech Interruption (Barge-in)",
      "1 Free Phone Number Included"
    ],
    recommendedFor: "Local businesses, simple IVR, and basic query bots."
  },
  {
    id: "neural-vocal-pro",
    tierKey: "pro",
    name: "Talkar NeuralVocal Pro v2",
    subtitle: "Human-Grade Ultra-Realistic Engine",
    badge: "MOST POPULAR",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    rateRupees: "18.00",
    latencyMs: 250,
    realismScore: 99.2,
    concurrencyLimit: 10,
    llmBackbone: "GPT-4o Enterprise Core",
    ttsEngine: "ElevenLabs Flash v2.5",
    description: "Next-gen emotive voice synthesis paired with deep reasoning. Delivers natural human inflection, zero audio jitter, and intelligent context handling.",
    features: [
      "Ultra-Fast 250ms Turn Latency",
      "Studio-Quality Emotional Inflection",
      "10 Concurrent Call Channels",
      "Advanced Dynamic Context Memory",
      "2 Free Phone Numbers Included",
      "28% Cost Reduction per Minute"
    ],
    recommendedFor: "High-conversion sales teams, healthcare booking, and customer support.",
    isPopular: true
  },
  {
    id: "apex-omni-prime",
    tierKey: "elite",
    name: "Talkar Apex Omni Prime",
    subtitle: "Enterprise Ultra-Low Latency Cluster",
    badge: "ENTERPRISE GRADE",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    rateRupees: "12.00",
    latencyMs: 180,
    realismScore: 99.9,
    concurrencyLimit: 50,
    llmBackbone: "GPT-4o High-Throughput Cluster",
    ttsEngine: "ElevenLabs Flash v2.5 (Priority Routing)",
    description: "Our flagship conversational AI engine running on dedicated compute infrastructure. Offers maximum throughput, custom voice cloning, and lowest rates.",
    features: [
      "Near-Instant 180ms Response Latency",
      "Human-Indistinguishable Audio Fidelity",
      "50 Concurrent Call Capacity",
      "Custom Brand Voice Cloning Support",
      "5 Free Phone Numbers Included",
      "52% Cost Reduction (Best Value)"
    ],
    recommendedFor: "Enterprise call centers, large-scale outbound campaigns, and high-volume operations."
  }
];

export default function ModelsPage() {
  const { user } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-4 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold tracking-wide uppercase shadow-sm backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Talkar AI Voice Model Architecture
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60">
          Neural Voice Engine Suite
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
          Talkar models integrate ultra-low-latency Speech-to-Text (STT), high-reasoning LLMs, and studio-grade Text-to-Speech (TTS) into unified, seamless conversational pipelines.
        </p>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {AI_MODELS.map((model) => {
          const isActive = activeTier === model.tierKey;
          const isHigherTier = 
            (activeTier === "starter" && (model.tierKey === "pro" || model.tierKey === "elite")) ||
            (activeTier === "pro" && model.tierKey === "elite");

          return (
            <Card 
              key={model.id}
              className={`relative flex flex-col justify-between overflow-hidden transition-all duration-300 border ${
                model.isPopular 
                  ? "border-purple-500/50 shadow-xl shadow-purple-500/5 bg-gradient-to-b from-purple-950/20 via-background to-background" 
                  : "border-border/80 bg-card hover:border-border"
              } ${isActive ? "ring-2 ring-emerald-500/80 border-emerald-500/50" : ""}`}
            >
              {model.isPopular && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase shadow-md">
                  RECOMMENDED
                </div>
              )}

              <div>
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] font-mono tracking-wider ${model.badgeColor}`}>
                      {model.badge}
                    </Badge>
                    {isActive && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> ACTIVE ENGINE
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <CardTitle className="text-xl font-bold">{model.name}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">{model.subtitle}</CardDescription>
                  </div>

                  <div className="pt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight">₹{model.rateRupees}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ minute</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 text-sm">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {model.description}
                  </p>

                  {/* Benchmark Performance Bars */}
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-blue-400" /> Turn Latency
                        </span>
                        <span className="font-mono font-bold text-foreground">{model.latencyMs} ms</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.max(20, 100 - (model.latencyMs / 500) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-400" /> Realism Score
                        </span>
                        <span className="font-mono font-bold text-foreground">{model.realismScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${model.realismScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stack Specs */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/40 p-2.5 rounded-lg border border-border/40">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">LLM Backbone</span>
                      <span className="font-semibold">{model.llmBackbone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">TTS Engine</span>
                      <span className="font-semibold truncate block">{model.ttsEngine}</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Capabilities</span>
                    <ul className="space-y-1.5">
                      {model.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-foreground/90">
                          <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </div>

              <CardFooter className="pt-4 border-t border-border/40">
                {isActive ? (
                  <Button disabled className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 opacity-100 cursor-default">
                    Currently Active Engine
                  </Button>
                ) : isHigherTier ? (
                  <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md">
                    <Link href="/wallet" className="flex items-center justify-center gap-2">
                      Upgrade Engine <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/wallet">Switch Engine Tier</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Deep Dive Specs Matrix Table */}
      <div className="pt-6">
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Technical Engine Specifications Comparison
            </CardTitle>
            <CardDescription className="text-xs">
              Detailed breakdown of pipeline architecture, latency targets, and concurrency limits across all models.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground uppercase font-mono text-[10px]">
                  <th className="py-3 px-4">Feature / Metric</th>
                  <th className="py-3 px-4">Talkar Echo-Lite 1.0</th>
                  <th className="py-3 px-4">Talkar NeuralVocal Pro v2</th>
                  <th className="py-3 px-4">Talkar Apex Omni Prime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground/90">
                <tr>
                  <td className="py-3 px-4 font-semibold text-muted-foreground">Per-Minute Rate</td>
                  <td className="py-3 px-4 font-mono font-bold">₹25.00</td>
                  <td className="py-3 px-4 font-mono font-bold text-purple-400">₹18.00</td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">₹12.00</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-muted-foreground">Response Latency</td>
                  <td className="py-3 px-4 font-mono">~400 ms</td>
                  <td className="py-3 px-4 font-mono font-semibold">~250 ms</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">~180 ms (Lowest)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-muted-foreground">Max Concurrency</td>
                  <td className="py-3 px-4">2 Calls</td>
                  <td className="py-3 px-4 font-semibold">10 Calls</td>
                  <td className="py-3 px-4 font-bold text-amber-400">50 Calls</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-muted-foreground">Speech Synthesizer (TTS)</td>
                  <td className="py-3 px-4">Deepgram Aura-2</td>
                  <td className="py-3 px-4">ElevenLabs Flash v2.5</td>
                  <td className="py-3 px-4">ElevenLabs Flash v2.5 (Dedicated)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-muted-foreground">Language Model (LLM)</td>
                  <td className="py-3 px-4">GPT-4o Mini</td>
                  <td className="py-3 px-4">GPT-4o Enterprise</td>
                  <td className="py-3 px-4">GPT-4o High-Throughput Cluster</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-muted-foreground">Custom Voice Cloning</td>
                  <td className="py-3 px-4 text-muted-foreground">—</td>
                  <td className="py-3 px-4 text-muted-foreground">—</td>
                  <td className="py-3 px-4 font-semibold text-emerald-400">Supported</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-muted-foreground">Included Free Phone Numbers</td>
                  <td className="py-3 px-4">1 Number</td>
                  <td className="py-3 px-4">2 Numbers</td>
                  <td className="py-3 px-4 font-bold">5 Numbers</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
