"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  deleteLangfuseCredentialsApiV1OrganizationsLangfuseCredentialsDelete,
  getLangfuseCredentialsApiV1OrganizationsLangfuseCredentialsGet,
  saveLangfuseCredentialsApiV1OrganizationsLangfuseCredentialsPost,
} from "@/client/sdk.gen";
import type { LangfuseCredentialsResponse } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export function TelemetrySection() {
  const { user, loading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState<LangfuseCredentialsResponse>({
    host: "",
    public_key: "",
    secret_key: "",
    configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (authLoading || !user || hasFetched.current) {
      return;
    }
    hasFetched.current = true;
    fetchCredentials();
  }, [authLoading, user]);

  async function fetchCredentials() {
    try {
      const { data } = await getLangfuseCredentialsApiV1OrganizationsLangfuseCredentialsGet();
      if (data) {
        setCredentials(data);
      }
    } catch {
      // No credentials configured yet — that's fine
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await saveLangfuseCredentialsApiV1OrganizationsLangfuseCredentialsPost({
        body: {
          host: credentials.host ?? "",
          public_key: credentials.public_key ?? "",
          secret_key: credentials.secret_key ?? "",
        },
      });
      if (error) {
        throw new Error("Failed to save");
      }
      toast.success("Telemetry credentials saved");
      await fetchCredentials();
    } catch {
      toast.error("Failed to save telemetry credentials");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteLangfuseCredentialsApiV1OrganizationsLangfuseCredentialsDelete();
      setCredentials({ host: "", public_key: "", secret_key: "", configured: false });
      toast.success("Telemetry credentials removed");
    } catch {
      toast.error("Failed to remove telemetry credentials");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 pt-1">
      <p className="text-[10px] text-muted-foreground/60 leading-normal">
        Connect your Langfuse project to receive call tracing data.
      </p>
      <div className="space-y-2">
        <Label htmlFor="langfuse-host" className="text-xs font-bold text-foreground">Host</Label>
        <Input
          id="langfuse-host"
          placeholder="https://cloud.langfuse.com"
          value={credentials.host}
          onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
          required
          className="h-9 rounded-lg border-border bg-background text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="langfuse-public-key" className="text-xs font-bold text-foreground">Public Key</Label>
        <Input
          id="langfuse-public-key"
          placeholder="pk-lf-..."
          value={credentials.public_key}
          onChange={(e) => setCredentials({ ...credentials, public_key: e.target.value })}
          required
          className="h-9 rounded-lg border-border bg-background text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="langfuse-secret-key" className="text-xs font-bold text-foreground">Secret Key</Label>
        <Input
          id="langfuse-secret-key"
          type="password"
          placeholder="sk-lf-..."
          value={credentials.secret_key}
          onChange={(e) => setCredentials({ ...credentials, secret_key: e.target.value })}
          required
          className="h-9 rounded-lg border-border bg-background text-xs"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
        {credentials.configured && (
          <Button type="button" variant="destructive" disabled={saving} onClick={handleDelete} className="h-9 px-4 rounded-lg text-xs font-semibold">
            Remove Credentials
          </Button>
        )}
        <Button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer">
          {saving ? "Saving..." : "Save Credentials"}
        </Button>
      </div>
    </form>
  );
}
