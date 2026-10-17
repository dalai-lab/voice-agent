"use client";

import { StackProvider, useStackApp } from "@stackframe/stack";
import { CheckCircle2, Loader2, LogOut, Mail, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getStackClientApp } from "@/lib/auth/providers/StackProviderWrapper";

interface StackVerifyEmailViewProps {
  projectId: string;
  publishableClientKey: string;
}

function InnerVerifyEmailView() {
  const app = useStackApp();
  const user = app.useUser({ includeRestricted: true });
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerified, setIsVerified] = useState(false);

  // If user is already verified, forward to after-sign-in
  useEffect(() => {
    if (user && user.primaryEmailVerified) {
      setIsVerified(true);
      const timer = setTimeout(() => {
        router.push("/after-sign-in");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Polling & focus auto-refresh to detect verification in background
  useEffect(() => {
    if (user && user.primaryEmailVerified) return;

    const checkVerification = async () => {
      try {
        const updatedUser = await app.getUser({ includeRestricted: true });
        if (updatedUser?.primaryEmailVerified) {
          setIsVerified(true);
        }
      } catch {
        // Silently ignore check errors
      }
    };

    // Check on window focus (when user switches back from email tab)
    window.addEventListener("focus", checkVerification);

    // Poll every 3.5 seconds
    const pollInterval = setInterval(checkVerification, 3500);

    return () => {
      window.removeEventListener("focus", checkVerification);
      clearInterval(pollInterval);
    };
  }, [user, app]);

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;

    setResending(true);
    try {
      if (user) {
        await user.sendVerificationEmail();
      } else {
        const freshUser = await app.getUser({ includeRestricted: true });
        if (freshUser) {
          await freshUser.sendVerificationEmail();
        } else {
          throw new Error("Unable to identify account. Please check your inbox or sign in again.");
        }
      }
      toast.success("Verification link sent! Check your inbox.");
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend verification email.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await app.signOut();
    } catch {
      // Fallback
    }
    window.location.href = "/handler/sign-in";
  };

  const displayEmail = user?.primaryEmail || emailParam || "your email address";

  if (isVerified) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground font-sans">
            Email verified!
          </h1>
          <p className="text-sm text-muted-foreground">
            Setting up your workspace...
          </p>
        </div>
        <div className="flex justify-center pt-2">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center py-2">
      {/* Animated Icon */}
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 ring-8 ring-orange-500/5">
        <Mail className="h-7 w-7 animate-pulse text-orange-500" />
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground font-sans">
          Check your inbox
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We sent an account verification link to
        </p>
        <div className="inline-block rounded-full bg-muted/80 px-3.5 py-1 text-xs font-semibold text-foreground border border-border/80">
          {displayEmail}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground/90 leading-relaxed px-2">
        Click the link in the email to activate your account. You can leave this page open — it will update automatically as soon as you verify.
      </p>

      {/* Live status listener pill */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/70 bg-muted/30 py-1.5 px-3 rounded-md w-fit mx-auto border border-border/40">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        <span>Waiting for email confirmation...</span>
      </div>

      {/* Resend Action */}
      <div className="space-y-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={resending || resendCooldown > 0}
          onClick={handleResend}
          className="w-full h-10 rounded-lg border-border/80 hover:bg-accent font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
          <span>
            {resendCooldown > 0
              ? `Resend link in ${resendCooldown}s`
              : "Resend verification link"}
          </span>
        </Button>

        {/* Sign out / switch account */}
        <div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="h-3 w-3" />
            <span>Use a different account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function StackVerifyEmailView({
  projectId,
  publishableClientKey,
}: StackVerifyEmailViewProps) {
  const clientApp = getStackClientApp(projectId, publishableClientKey);

  return (
    <StackProvider app={clientApp}>
      <Suspense fallback={null}>
        <InnerVerifyEmailView />
      </Suspense>
    </StackProvider>
  );
}
