"use client";

import { StackProvider, useStackApp } from "@stackframe/stack";
import { ArrowLeft, Edit2, Eye, EyeOff, Loader2, Lock, Mail, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStackClientApp } from "@/lib/auth/providers/StackProviderWrapper";

import { OtpInput } from "./OtpInput";

interface StackSignInFormProps {
  projectId: string;
  publishableClientKey: string;
  signupEnabled?: boolean;
}

function InnerSignInForm({ signupEnabled = true }: { signupEnabled?: boolean }) {
  const app = useStackApp();
  const user = app.useUser();
  const router = useRouter();

  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Magic link + OTP state
  const [nonce, setNonce] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [oauthProviders, setOauthProviders] = useState<Array<{ id: string }>>([]);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // If already logged in, redirect to overview
  useEffect(() => {
    if (user) {
      router.push("/overview");
    }
  }, [user, router]);

  // Query project config on client for OAuth providers
  useEffect(() => {
    let isMounted = true;
    app
      .getProject()
      .then((project) => {
        if (isMounted && project?.config?.oauthProviders) {
          setOauthProviders(project.config.oauthProviders);
        }
      })
      .catch(() => {
        // Fallback gracefully if offline or project query fails
      });
    return () => {
      isMounted = false;
    };
  }, [app]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await app.signInWithCredential({ email, password });
      if (res.status === "error") {
        toast.error(res.error.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      toast.success("Signing you in...");
      setTimeout(() => {
        window.location.href = "/after-sign-in";
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      toast.error(message);
      setLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await app.sendMagicLinkEmail(email);
      if (res.status === "error") {
        toast.error(res.error.message || "Failed to send magic link");
        setLoading(false);
        return;
      }

      setNonce(res.data.nonce);
      setOtp("");
      setResendCooldown(30);
      toast.success("Verification code sent! Check your inbox.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send magic link.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otp).trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Please enter the complete 6-character code");
      return;
    }

    if (!nonce) {
      toast.error("Session expired. Please request a new code.");
      return;
    }

    setVerifying(true);
    try {
      const res = await app.signInWithMagicLink(code + nonce);
      if (res.status === "error") {
        toast.error(res.error.message || "Invalid or expired code");
        setVerifying(false);
        return;
      }

      toast.success("Code verified! Signing you in...");
      setTimeout(() => {
        window.location.href = "/after-sign-in";
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed. Please try again.";
      toast.error(message);
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await app.sendMagicLinkEmail(email);
      if (res.status === "error") {
        toast.error(res.error.message || "Failed to resend code");
        return;
      }
      setNonce(res.data.nonce);
      setOtp("");
      setResendCooldown(30);
      toast.success("New code sent to your email!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend code";
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  const handleOAuthSignIn = async (providerId: string) => {
    setOauthLoading(providerId);
    try {
      await app.signInWithOAuth(providerId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OAuth sign-in failed.";
      toast.error(message);
      setOauthLoading(null);
    }
  };

  // If in OTP entry step of magic link
  if (mode === "magic-link" && nonce) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight font-sans text-foreground">
            Enter verification code
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            We sent a 6-character code and a login link to{" "}
            <span className="font-medium text-foreground block mt-0.5">{email}</span>
          </p>
        </div>

        {/* OTP Input */}
        <div className="space-y-4">
          <OtpInput
            length={6}
            value={otp}
            disabled={verifying}
            onChange={setOtp}
            onComplete={(fullCode) => handleVerifyOtp(fullCode)}
          />

          <Button
            type="button"
            disabled={verifying || otp.length !== 6}
            onClick={() => handleVerifyOtp()}
            className="w-full h-10 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying code...
              </span>
            ) : (
              "Verify & Sign in"
            )}
          </Button>

          {/* Resend and change email actions */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              type="button"
              disabled={resendCooldown > 0 || resending}
              onClick={handleResendOtp}
              className="text-orange-500 hover:text-orange-400 disabled:text-muted-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
              <span>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNonce(null);
                setOtp("");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Change email</span>
            </button>
          </div>
        </div>

        {/* Back to password */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setNonce(null);
              setOtp("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Sign in with password instead</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight font-sans text-foreground">
          Welcome back
        </h1>
        <p className="text-xs text-muted-foreground">
          Sign in to your Talkar account
        </p>
      </div>

      {/* OAuth Providers (if configured in Stack console) */}
      {oauthProviders.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2.5">
            {oauthProviders.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                disabled={loading || !!oauthLoading}
                onClick={() => handleOAuthSignIn(provider.id)}
                className="w-full h-10 rounded-lg border-border/80 bg-background/60 hover:bg-accent hover:text-accent-foreground font-medium text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                {oauthLoading === provider.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : provider.id === "google" ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                    />
                  </svg>
                ) : provider.id === "github" ? (
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                ) : (
                  <Sparkles className="h-4 w-4 text-orange-500" />
                )}
                <span>
                  Continue with{" "}
                  {provider.id.charAt(0).toUpperCase() + provider.id.slice(1)}
                </span>
              </Button>
            ))}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <span className="relative bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
              or continue with email
            </span>
          </div>
        </div>
      )}

      {/* Mode toggle (Password vs Magic Link) */}
      <div className="flex p-1 bg-muted/50 rounded-lg border border-border/40">
        <button
          type="button"
          onClick={() => {
            setMode("password");
            setNonce(null);
            setOtp("");
          }}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
            mode === "password"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("magic-link");
            setNonce(null);
            setOtp("");
          }}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
            mode === "magic-link"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Email Code / Link
        </button>
      </div>

      {/* Forms */}
      {mode === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80"
            >
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              <Input
                id="email"
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80"
              >
                Password
              </Label>
              <Link
                href="/handler/forgot-password"
                className="text-xs text-orange-500 hover:text-orange-400 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pl-9 pr-10 h-10 rounded-lg border-border/80 bg-background/50 focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !!oauthLoading}
            className="w-full h-10 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign in to Talkar"
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="magic-email"
              className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80"
            >
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              <Input
                id="magic-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="pl-9 h-10 rounded-lg border-border/80 bg-background/50 focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-colors"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              We&apos;ll send a 6-character code and a magic link to sign in instantly.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !!oauthLoading}
            className="w-full h-10 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending code & link...
              </span>
            ) : (
              "Send Code & Magic Link"
            )}
          </Button>
        </form>
      )}

      {/* Footer link to Sign Up */}
      {signupEnabled && (
        <p className="text-center text-sm text-muted-foreground/80 pt-1">
          Don&apos;t have an account?{" "}
          <Link
            href="/handler/sign-up"
            className="font-semibold text-foreground underline-offset-4 hover:underline hover:text-orange-500 transition-colors"
          >
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}

export function StackSignInForm({
  projectId,
  publishableClientKey,
  signupEnabled = true,
}: StackSignInFormProps) {
  const clientApp = getStackClientApp(projectId, publishableClientKey);

  return (
    <StackProvider app={clientApp}>
      <InnerSignInForm signupEnabled={signupEnabled} />
    </StackProvider>
  );
}
