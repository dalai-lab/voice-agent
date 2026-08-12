"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Shield, Rocket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { LocalUser } from "@/lib/auth/types";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    icon: <Zap className="w-8 h-8 text-blue-500 mb-4" />,
    price: "₹12",
    priceUnit: "per minute",
    description: "Perfect for small businesses getting started with voice AI.",
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
    price: "₹18",
    priceUnit: "per minute",
    description: "For growing businesses needing higher volume and better AI.",
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
  {
    id: "elite",
    name: "Elite",
    icon: <Shield className="w-8 h-8 text-amber-500 mb-4" />,
    price: "₹25",
    priceUnit: "per minute",
    description: "Unlimited scale with enterprise-grade AI and dedicated support.",
    features: [
      "Unlimited Concurrent Calls",
      "Unlimited call duration",
      "Premium Voices (ElevenLabs)",
      "GPT-4o",
      "Dedicated Account Manager",
      "5 Free Phone Numbers",
    ],
    recommended: false,
  },
];

export default function SelectPlanPage() {
  const { user } = useAuth();
  const dograhOrgId = (user as any)?.organization_id || (user as LocalUser)?.organizationId;
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
        router.push("/overview");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to select tier: ${err.detail || res.statusText}`);
        setSubmitting(null);
      }
    } catch (err) {
      alert("An error occurred. Please try again.");
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground">
          Your wallet is funded and your agent is ready. Select a usage tier to go live instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8">
        {TIERS.map((tier) => (
          <Card 
            key={tier.id} 
            className={`relative flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              tier.recommended ? "border-primary shadow-md scale-105 z-10" : "border-border"
            }`}
          >
            {tier.recommended && (
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center">{tier.icon}</div>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription className="pt-2">{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow text-center space-y-6">
              <div className="mt-4">
                <span className="text-4xl font-extrabold">{tier.price}</span>
                <span className="text-muted-foreground ml-2">/ {tier.priceUnit}</span>
              </div>
              <ul className="space-y-3 text-sm text-left pt-4 border-t">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleSelectTier(tier.id)} 
                disabled={submitting !== null}
                className={`w-full ${tier.recommended ? "bg-primary" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                size="lg"
              >
                {submitting === tier.id ? "Activating..." : `Select ${tier.name}`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
