"use client";

import { StackProvider, useStackApp } from "@stackframe/stack";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStackClientApp } from "@/lib/auth/providers/StackProviderWrapper";

interface StackForgotPasswordFormProps {
  projectId: string;
  publishableClientKey: string;
}

function InnerForgotPasswordForm() {
  const app = useStackApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await app.sendForgotPasswordEmail(email);
      if (res.status === "error") {
        toast.error(res.error.message || "Failed to send reset email");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      toast.success("Password reset instructions sent!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reset email. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight font-sans text-foreground">
          Reset password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email to receive a password reset link
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">
              Check your email
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We&apos;ve sent a password reset link to{" "}
              <strong className="text-foreground">{email}</strong>. Please check your inbox
              and spam folder.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSubmitted(false)}
              className="text-xs cursor-pointer"
            >
              Try another email
            </Button>
            <Link
              href="/handler/sign-in"
              className="text-xs text-orange-500 hover:text-orange-400 font-medium py-1 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="reset-email"
              className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80"
            >
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              <Input
                id="reset-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="pl-9 h-10 rounded-lg border-border/80 bg-background/50 focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending link...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground/80 pt-1">
            Remember your password?{" "}
            <Link
              href="/handler/sign-in"
              className="font-semibold text-foreground underline-offset-4 hover:underline hover:text-orange-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export function StackForgotPasswordForm({
  projectId,
  publishableClientKey,
}: StackForgotPasswordFormProps) {
  const clientApp = getStackClientApp(projectId, publishableClientKey);

  return (
    <StackProvider app={clientApp}>
      <InnerForgotPasswordForm />
    </StackProvider>
  );
}
