"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { signupApiV1AuthSignupPost } from "@/client/sdk.gen";
import { AuthEnterpriseCTA } from "@/components/auth/AuthEnterpriseCTA";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await signupApiV1AuthSignupPost({
        body: { email, password },
      });

      if (res.error || !res.data) {
        const detail = (res.error as { detail?: string })?.detail;
        toast.error(detail || "Signup failed");
        return;
      }

      // Set httpOnly cookies via server route
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: res.data.token, user: res.data.user }),
      });

      window.location.href = "/after-sign-in";
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight font-sans">Get started</h1>
        <p className="text-sm text-muted-foreground">Create an account to build your voice workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg h-10 border-border/80 bg-background/50 focus-visible:ring-cta/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-lg h-10 border-border/80 bg-background/50 focus-visible:ring-cta/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-lg h-10 border-border/80 bg-background/50 focus-visible:ring-cta/20"
          />
        </div>
        <Button type="submit" className="w-full h-10 rounded-lg font-medium text-sm transition-all bg-cta hover:bg-cta/90 text-cta-foreground cursor-pointer shadow-sm" disabled={loading}>
          {loading ? "Creating account..." : "Continue"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground/80 pt-2">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-foreground underline-offset-4 hover:underline hover:text-cta transition-colors">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
