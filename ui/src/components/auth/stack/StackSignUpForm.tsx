"use client";

import { StackProvider, useStackApp } from "@stackframe/stack";
import { Check, Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStackClientApp } from "@/lib/auth/providers/StackProviderWrapper";

interface StackSignUpFormProps {
  projectId: string;
  publishableClientKey: string;
}

function InnerSignUpForm() {
  const app = useStackApp();
  const user = app.useUser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await app.signUpWithCredential({ email, password });
      if (res.status === "error") {
        toast.error(res.error.message || "Sign up failed. Please try again.");
        setLoading(false);
        return;
      }

      toast.success("Account created successfully!");
      // Stack automatically redirects to afterSignUp / verification callback,
      // but we add a safety timeout
      setTimeout(() => {
        window.location.href = "/after-sign-in";
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      toast.error(message);
      setLoading(false);
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

  const hasMinLength = password.length >= 8;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight font-sans text-foreground">
          Create an account
        </h1>
        <p className="text-xs text-muted-foreground">
          Get started with Talkar phone operations
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
                  Sign up with{" "}
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
              or sign up with email
            </span>
          </div>
        </div>
      )}

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="signup-email"
            className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80"
          >
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              id="signup-email"
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
          <Label
            htmlFor="signup-password"
            className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80"
          >
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
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
          <div className="flex items-center gap-1.5 pt-0.5">
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
                hasMinLength
                  ? "bg-emerald-500/20 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {hasMinLength ? <Check className="h-2.5 w-2.5" /> : "•"}
            </span>
            <span
              className={`text-[11px] transition-colors ${
                hasMinLength ? "text-emerald-500" : "text-muted-foreground"
              }`}
            >
              At least 8 characters
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="signup-confirm-password"
            className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80"
          >
            Confirm password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              id="signup-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="pl-9 pr-10 h-10 rounded-lg border-border/80 bg-background/50 focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-colors"
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          By signing up, you agree to our{" "}
          <Link
            href="/terms-of-service"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <Button
          type="submit"
          disabled={loading || !!oauthLoading}
          className="w-full h-10 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating your workspace...
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Footer link to Sign In */}
      <p className="text-center text-sm text-muted-foreground/80 pt-1">
        Already have an account?{" "}
        <Link
          href="/handler/sign-in"
          className="font-semibold text-foreground underline-offset-4 hover:underline hover:text-orange-500 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function StackSignUpForm({
  projectId,
  publishableClientKey,
}: StackSignUpFormProps) {
  const clientApp = getStackClientApp(projectId, publishableClientKey);

  return (
    <StackProvider app={clientApp}>
      <InnerSignUpForm />
    </StackProvider>
  );
}
