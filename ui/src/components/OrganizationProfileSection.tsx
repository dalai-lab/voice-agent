"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProfileData {
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
}

export function OrganizationProfileSection({
  dograhOrgId,
}: {
  dograhOrgId?: number | null;
}) {
  const { user, loading: authLoading } = useAuth();
  const hasFetched = useRef(false);

  const [profile, setProfile] = useState<ProfileData>({
    company_name: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !dograhOrgId || hasFetched.current) return;
    hasFetched.current = true;

    fetch(`/api/talkar/customers/by-org/${dograhOrgId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfile({
            company_name: data.company_name || "",
            contact_name: data.contact_name || "",
            contact_phone: data.contact_phone || "",
            contact_email: data.contact_email || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user, dograhOrgId]);

  function validate(): boolean {
    const errs: Partial<Record<keyof ProfileData, string>> = {};
    if (profile.company_name.trim().length < 2)
      errs.company_name = "Company name must be at least 2 characters.";
    if (profile.contact_name.trim().length < 2)
      errs.contact_name = "Contact name must be at least 2 characters.";
    const phone = profile.contact_phone.trim();
    if (phone && !/^\+?\d{10,15}$/.test(phone))
      errs.contact_phone =
        "Enter a valid phone number (e.g. +919876543210 or 9876543210).";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dograhOrgId || !validate()) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/talkar/customers/by-org/${dograhOrgId}/profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_name: profile.company_name.trim(),
            contact_name: profile.contact_name.trim(),
            contact_phone: profile.contact_phone.trim() || null,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => ({ ...p, ...data }));
        toast.success("Profile saved.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to save profile.");
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
    <form onSubmit={handleSave} className="space-y-4 pt-1">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Company Name */}
        <div className="space-y-2">
          <Label
            htmlFor="profile-company-name"
            className="text-xs font-bold text-foreground"
          >
            Company Name
          </Label>
          <Input
            id="profile-company-name"
            value={profile.company_name}
            onChange={(e) => {
              setProfile({ ...profile, company_name: e.target.value });
              if (errors.company_name)
                setErrors({ ...errors, company_name: undefined });
            }}
            placeholder="Acme Corp"
            className="h-9 rounded-lg border-border bg-background text-xs"
          />
          {errors.company_name && (
            <p className="text-[10px] text-destructive">{errors.company_name}</p>
          )}
        </div>

        {/* Contact Name */}
        <div className="space-y-2">
          <Label
            htmlFor="profile-contact-name"
            className="text-xs font-bold text-foreground"
          >
            Contact Name
          </Label>
          <Input
            id="profile-contact-name"
            value={profile.contact_name}
            onChange={(e) => {
              setProfile({ ...profile, contact_name: e.target.value });
              if (errors.contact_name)
                setErrors({ ...errors, contact_name: undefined });
            }}
            placeholder="Jane Doe"
            className="h-9 rounded-lg border-border bg-background text-xs"
          />
          {errors.contact_name && (
            <p className="text-[10px] text-destructive">{errors.contact_name}</p>
          )}
        </div>

        {/* Contact Phone */}
        <div className="space-y-2">
          <Label
            htmlFor="profile-contact-phone"
            className="text-xs font-bold text-foreground"
          >
            Contact Phone{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="profile-contact-phone"
            value={profile.contact_phone}
            onChange={(e) => {
              setProfile({ ...profile, contact_phone: e.target.value });
              if (errors.contact_phone)
                setErrors({ ...errors, contact_phone: undefined });
            }}
            placeholder="+919876543210"
            className="h-9 rounded-lg border-border bg-background text-xs"
          />
          {errors.contact_phone && (
            <p className="text-[10px] text-destructive">{errors.contact_phone}</p>
          )}
        </div>

        {/* Email — read-only */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            Email Address
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">
                Your email is your login identity and cannot be changed here.
                Contact support if you need to update it.
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            value={profile.contact_email}
            readOnly
            disabled
            className="h-9 rounded-lg border-border bg-muted/40 text-xs text-muted-foreground cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-border/40">
        <Button
          type="submit"
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
