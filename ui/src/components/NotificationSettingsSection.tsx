"use client";

import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";

interface NotificationSettings {
  low_balance_alert_paise: number;
  cc_email: string | null;
  email_notifications_enabled: boolean;
}

export function NotificationSettingsSection({
  dograhOrgId,
}: {
  dograhOrgId?: number | null;
}) {
  const { user, loading: authLoading } = useAuth();
  const hasFetched = useRef(false);

  const [settings, setSettings] = useState<NotificationSettings>({
    low_balance_alert_paise: 150000,
    cc_email: "",
    email_notifications_enabled: true,
  });
  
  // UI state derived from paise to rupees
  const [thresholdRs, setThresholdRs] = useState<string>("1500");
  const [ccEmail, setCcEmail] = useState<string>("");
  
  const [errors, setErrors] = useState<{ cc_email?: string; threshold?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !dograhOrgId || hasFetched.current) return;
    hasFetched.current = true;

    fetch(`/api/talkar/customers/by-org/${dograhOrgId}/notification-settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings({
            low_balance_alert_paise: data.low_balance_alert_paise,
            cc_email: data.cc_email,
            email_notifications_enabled: data.email_notifications_enabled,
          });
          setThresholdRs(Math.floor(data.low_balance_alert_paise / 100).toString());
          setCcEmail(data.cc_email || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user, dograhOrgId]);

  function validate(): boolean {
    const errs: { cc_email?: string; threshold?: string } = {};
    
    const thresVal = parseInt(thresholdRs || "0");
    if (thresVal < 500) {
      errs.threshold = "Minimum threshold is ₹500.";
    } else if (thresVal > 50000) {
      errs.threshold = "Maximum threshold is ₹50,000.";
    }

    const cc = ccEmail.trim();
    if (cc && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cc)) {
      errs.cc_email = "Enter a valid email address.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dograhOrgId || !validate()) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/talkar/customers/by-org/${dograhOrgId}/notification-settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            low_balance_alert_paise: parseInt(thresholdRs) * 100,
            cc_email: ccEmail.trim() || "",
            email_notifications_enabled: settings.email_notifications_enabled,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSettings({
          low_balance_alert_paise: data.low_balance_alert_paise,
          cc_email: data.cc_email,
          email_notifications_enabled: data.email_notifications_enabled,
        });
        setThresholdRs(Math.floor(data.low_balance_alert_paise / 100).toString());
        setCcEmail(data.cc_email || "");
        toast.success("Notification settings saved.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to save settings.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pt-1">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Low Balance Alert */}
        <div className="space-y-2">
          <Label
            htmlFor="notif-low-balance"
            className="text-xs font-bold text-foreground"
          >
            Low Balance Alert (₹)
          </Label>
          <p className="text-[10px] text-muted-foreground">
            You'll be notified via email when your wallet drops below this amount. Calls are paused below ₹500.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
            <Input
              id="notif-low-balance"
              type="number"
              min="500"
              max="50000"
              value={thresholdRs}
              onChange={(e) => {
                setThresholdRs(e.target.value);
                if (errors.threshold) setErrors({ ...errors, threshold: undefined });
              }}
              className="h-9 pl-6 rounded-lg border-border bg-background text-xs"
            />
          </div>
          {errors.threshold && (
            <p className="text-[10px] text-destructive">{errors.threshold}</p>
          )}
        </div>

        {/* CC Email */}
        <div className="space-y-2">
          <Label
            htmlFor="notif-cc-email"
            className="text-xs font-bold text-foreground"
          >
            CC Email (Billing Alerts)
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Low balance and payment confirmation emails will be CC'd to this address.
          </p>
          <Input
            id="notif-cc-email"
            type="email"
            value={ccEmail}
            onChange={(e) => {
              setCcEmail(e.target.value);
              if (errors.cc_email) setErrors({ ...errors, cc_email: undefined });
            }}
            placeholder="finance@acmecorp.com"
            className="h-9 rounded-lg border-border bg-background text-xs"
          />
          {errors.cc_email && (
            <p className="text-[10px] text-destructive">{errors.cc_email}</p>
          )}
        </div>
      </div>

      {/* Email Alerts Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
        <div className="space-y-1">
          <Label className="text-sm font-semibold text-foreground">
            Non-Critical Email Alerts
          </Label>
          <p className="text-xs text-muted-foreground">
            Receive emails for low balance, credits, and tier changes. Disabling this does not mute critical alerts like service suspension.
          </p>
        </div>
        <Switch
          checked={settings.email_notifications_enabled}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, email_notifications_enabled: checked })
          }
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-border/40">
        <Button
          type="submit"
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
