"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Mail,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

import { AuthEnterpriseCTA } from "@/components/auth/AuthEnterpriseCTA";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeSignupEmailApi,
  checkVerificationStatusApi,
  resendVerificationApi,
  verifyEmailApi,
} from "@/lib/authVerification";

const COOLDOWN_SECONDS = 60;
const CHANNEL_NAME = "talkar_email_verification_sync";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [isOffline, setIsOffline] = useState(false);

  // Change email dialog states
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changePassword, setChangePassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize email from URL or local storage
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Online/Offline detection
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Multi-Tab Cooldown Synchronization via BroadcastChannel and localStorage
  const startCooldown = useCallback((seconds: number = COOLDOWN_SECONDS) => {
    const expireTime = Date.now() + seconds * 1000;
    localStorage.setItem("email_verify_cooldown_until", expireTime.toString());
    setCooldown(seconds);

    if (channelRef.current) {
      channelRef.current.postMessage({ type: "COOLDOWN_RESET", expireTime });
    }
  }, []);

  useEffect(() => {
    // Check initial cooldown from localStorage
    const savedUntil = localStorage.getItem("email_verify_cooldown_until");
    if (savedUntil) {
      const remaining = Math.max(0, Math.ceil((parseInt(savedUntil, 10) - Date.now()) / 1000));
      setCooldown(remaining);
    } else {
      startCooldown(COOLDOWN_SECONDS);
    }

    // Set up BroadcastChannel
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === "COOLDOWN_RESET" && event.data?.expireTime) {
          const remaining = Math.max(0, Math.ceil((event.data.expireTime - Date.now()) / 1000));
          setCooldown(remaining);
        }
      };
    } catch {
      // Fallback if BroadcastChannel is unsupported
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [startCooldown]);

  // Cooldown interval ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Cross-Device Polling & Window Focus Detection
  const checkStatus = useCallback(async () => {
    if (!email) return;
    const { is_verified } = await checkVerificationStatusApi(email);
    if (is_verified) {
      toast.success("Email verified! Redirecting to dashboard...");
      window.location.href = "/after-sign-in";
    }
  }, [email]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hasFocus()) {
        checkStatus();
      }
    }, 4000);

    const onFocus = () => {
      checkStatus();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkStatus]);

  // Focus the first empty slot on mount
  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => d === "");
    const targetIdx = firstEmpty === -1 ? 0 : firstEmpty;
    inputRefs.current[targetIdx]?.focus();
  }, []);

  const handleVerify = async (codeToSubmit: string) => {
    if (codeToSubmit.length !== 6) {
      toast.error("Please enter all 6 digits of your verification code.");
      return;
    }

    if (!email) {
      toast.error("Email address missing. Please go back to signup.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmailApi(email, codeToSubmit);
      if (res.error || !res.data) {
        toast.error(res.error || "Verification failed");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Save verified session tokens in httpOnly cookies
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: res.data.token, user: res.data.user }),
      });

      toast.success(res.data.message || "Email verified successfully!");
      window.location.href = "/after-sign-in";
    } catch {
      toast.error("An error occurred during verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    // Take the last entered character
    const char = clean.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all digits are entered, auto-submit
    if (index === 5 && nextDigits.every((d) => d.length === 1)) {
      handleVerify(nextDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index] === "" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasteData[i] || "";
    }
    setDigits(nextDigits);

    const focusIdx = Math.min(pasteData.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pasteData.length === 6) {
      handleVerify(pasteData);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email) return;

    setResending(true);
    try {
      const res = await resendVerificationApi(email);
      if (res.success) {
        toast.success("A fresh 6-digit verification code has been dispatched.");
        startCooldown(COOLDOWN_SECONDS);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        toast.error(res.error || "Failed to resend verification code.");
      }
    } catch {
      toast.error("Network error while requesting code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !changePassword) {
      toast.error("Please provide both your new email and account password.");
      return;
    }

    setChangingEmail(true);
    try {
      const res = await changeSignupEmailApi(email, newEmail, changePassword);
      if (res.success && res.newEmail) {
        toast.success(`Verification code sent to ${res.newEmail}.`);
        setEmail(res.newEmail);
        router.replace(`/auth/verify-email?email=${encodeURIComponent(res.newEmail)}`);
        startCooldown(COOLDOWN_SECONDS);
        setDigits(["", "", "", "", "", ""]);
        setChangeEmailOpen(false);
        setNewEmail("");
        setChangePassword("");
        inputRefs.current[0]?.focus();
      } else {
        toast.error(res.error || "Failed to change email.");
      }
    } catch {
      toast.error("An error occurred while updating email.");
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <AuthShell enterpriseSlot={<AuthEnterpriseCTA />}>
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-xs">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-sans">
          Verify your email
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          We sent a 6-digit confirmation code to:
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs font-medium text-foreground">
          <Mail className="w-3.5 h-3.5 text-orange-500" />
          <span className="truncate max-w-[220px]">{email || "your email"}</span>
        </div>
      </div>

      {isOffline && (
        <div className="my-3 flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Network connection lost. Entered digits are preserved.</span>
        </div>
      )}

      {/* 6-Slot Segmented OTP Input */}
      <div className="my-6">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={loading}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`h-12 w-10 sm:h-14 sm:w-12 rounded-xl text-center text-xl sm:text-2xl font-bold font-mono tracking-widest border transition-all duration-150 outline-none
                ${
                  digit
                    ? "border-orange-500 bg-orange-500/5 text-foreground ring-2 ring-orange-500/20"
                    : "border-border/80 bg-background/50 hover:border-border text-foreground focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                }`}
            />
          ))}
        </div>
      </div>

      <Button
        onClick={() => handleVerify(digits.join(""))}
        disabled={loading || digits.some((d) => d === "")}
        className="w-full h-11 rounded-xl font-medium text-sm transition-all bg-cta hover:bg-cta/90 text-cta-foreground cursor-pointer shadow-sm disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Verifying code...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Verify and continue
          </span>
        )}
      </Button>

      {/* Resend Cooldown Section */}
      <div className="pt-2 text-center text-xs text-muted-foreground/90 space-y-2">
        <div>
          Didn&apos;t receive the code?{" "}
          {cooldown > 0 ? (
            <span className="font-semibold text-foreground">
              Resend in {Math.floor(cooldown / 60)}:
              {(cooldown % 60).toString().padStart(2, "0")}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
            >
              {resending ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend verification code"
              )}
            </button>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              setNewEmail(email);
              setChangeEmailOpen(true);
            }}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4 cursor-pointer transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            Wrong email? Change address
          </button>
        </div>
      </div>

      {/* Back to sign in */}
      <div className="pt-3 border-t border-border/40 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>

      {/* Change Email Modal */}
      <Dialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Correct your email address</DialogTitle>
            <DialogDescription>
              Enter your correct email address and your password to re-route your verification code.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangeEmailSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-email" className="text-xs text-muted-foreground uppercase font-semibold">
                Current typo address
              </Label>
              <Input id="current-email" value={email} disabled className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-xs text-muted-foreground uppercase font-semibold">
                Correct email address
              </Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="correct@domain.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-password" className="text-xs text-muted-foreground uppercase font-semibold">
                Account password
              </Label>
              <Input
                id="change-password"
                type="password"
                value={changePassword}
                onChange={(e) => setChangePassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangeEmailOpen(false)}
                disabled={changingEmail}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={changingEmail} className="bg-cta text-cta-foreground hover:bg-cta/90">
                {changingEmail ? "Updating..." : "Send code to new email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b]">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
