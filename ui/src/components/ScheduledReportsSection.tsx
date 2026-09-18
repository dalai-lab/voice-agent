"use client";

import React, { useEffect, useState } from "react";
import { 
  Mail, 
  Send, 
  Check, 
  X, 
  Plus, 
  Calendar, 
  Clock, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScheduledReportsSectionProps {
  dograhOrgId?: number | null;
}

export function ScheduledReportsSection({ dograhOrgId }: ScheduledReportsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);

  // Button loading states
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testSentMsg, setTestSentMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!dograhOrgId) return;
    fetch(`/api/talkar/customers/by-org/${dograhOrgId}/report-settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setEnabled(!!data.enabled);
          if (data.frequency) setFrequency(data.frequency);
          if (Array.isArray(data.recipients)) setRecipients(data.recipients);
          if (data.last_sent_at) setLastSentAt(data.last_sent_at);
          if (data.next_due_at) setNextDueAt(data.next_due_at);
        }
      })
      .catch((e) => console.error("Failed to load report settings:", e))
      .finally(() => setLoading(false));
  }, [dograhOrgId]);

  const handleAddEmail = () => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (recipients.includes(trimmed)) {
      setEmailError("This email is already in the recipient list.");
      return;
    }
    setRecipients([...recipients, trimmed]);
    setNewEmail("");
    setEmailError("");
  };

  const handleRemoveEmail = (target: string) => {
    setRecipients(recipients.filter((r) => r !== target));
  };

  const handleSave = async () => {
    if (!dograhOrgId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/talkar/customers/by-org/${dograhOrgId}/report-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          frequency,
          recipients
        })
      });
      if (res.ok) {
        const data = await res.json();
        setNextDueAt(data.next_due_at || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert("Failed to save report preferences.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error saving report preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    if (!dograhOrgId) return;
    setSendingTest(true);
    setTestSentMsg(null);
    try {
      const res = await fetch(`/api/talkar/customers/by-org/${dograhOrgId}/send-test-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency,
          recipients: recipients.length > 0 ? recipients : undefined
        })
      });
      if (res.ok) {
        setTestSentMsg("Preview report delivered to your inbox!");
        setTimeout(() => setTestSentMsg(null), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to send test report: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Network error sending test report.");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-border bg-card rounded-xl p-5 shadow-xs animate-pulse space-y-4">
        <div className="h-5 w-48 bg-muted rounded"></div>
        <div className="h-10 w-full bg-muted/60 rounded"></div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card rounded-xl p-5 hover:bg-card/90 transition-all shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-cta" />
            <h2 className="text-sm font-bold text-foreground">Scheduled Performance & Account Reports</h2>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] px-2 py-0.2 font-semibold",
                enabled 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" 
                  : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            Receive automated, high-fidelity email digests summarizing call volumes, talk time, completion rates, and wallet deductions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-foreground">
            {enabled ? "Reports Enabled" : "Reports Disabled"}
          </span>
          <Switch checked={enabled} onCheckedChange={setEnabled} className="cursor-pointer" />
        </div>
      </div>

      {enabled && (
        <div className="space-y-5 pt-1">
          {/* Frequency Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-cta" /> Delivery Frequency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "daily",
                  title: "Daily Digest",
                  desc: "Every morning at 8:00 AM IST with yesterday's calls",
                },
                {
                  id: "weekly",
                  title: "Weekly Digest (Recommended)",
                  desc: "Every Monday at 8:00 AM IST with past 7 days summary",
                },
                {
                  id: "monthly",
                  title: "Monthly Digest",
                  desc: "1st of every month at 8:00 AM IST with full monthly review",
                },
              ].map((opt) => {
                const isSelected = frequency === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFrequency(opt.id as any)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-cta bg-cta/5 dark:bg-cta/10 shadow-xs"
                        : "border-border bg-card hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-bold", isSelected ? "text-cta" : "text-foreground")}>
                        {opt.title}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-cta" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Recipients Manager */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Email Recipients
            </label>
            <p className="text-[11px] text-muted-foreground mb-2.5">
              Enter email addresses of team members who should receive this report.
            </p>

            {/* Recipient Chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {recipients.length === 0 ? (
                <span className="text-xs text-muted-foreground/60 italic py-1">
                  No custom recipients set (will default to your primary account email).
                </span>
              ) : (
                recipients.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="px-2.5 py-1 text-xs bg-muted/80 hover:bg-muted text-foreground flex items-center gap-1.5 font-mono"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            {/* Add Recipient Input */}
            <div className="flex gap-2 max-w-md">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
                className="h-8 text-xs font-mono bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmail}
                className="h-8 text-xs px-3 shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {emailError && <p className="text-[11px] text-destructive mt-1">{emailError}</p>}
          </div>

          {/* Schedule Status & Next Due Banner */}
          {nextDueAt && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-cta shrink-0" />
              <span>
                Next automated delivery scheduled for:{" "}
                <strong className="text-foreground">
                  {new Date(nextDueAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })} (IST)
                </strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendTestReport}
            disabled={sendingTest}
            className="h-8 text-xs text-foreground cursor-pointer flex items-center gap-1.5"
          >
            <Send className="h-3 w-3" />
            {sendingTest ? "Dispatching..." : "Send Test Report Now"}
          </Button>

          {testSentMsg && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
              <Check className="h-3.5 w-3.5" /> {testSentMsg}
            </span>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "h-8 text-xs font-semibold px-4 cursor-pointer text-white transition-all",
            saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-cta hover:bg-cta/90 text-cta-foreground"
          )}
        >
          {saving ? "Saving..." : saved ? "✓ Preferences Saved!" : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
