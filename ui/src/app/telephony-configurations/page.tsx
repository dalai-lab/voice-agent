"use client";

import {
  AlertTriangle,
  ChevronRight,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  deleteTelephonyConfigurationApiV1OrganizationsTelephonyConfigsConfigIdDelete,
  getTelephonyConfigurationByIdApiV1OrganizationsTelephonyConfigsConfigIdGet,
  listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet,
  setDefaultOutboundApiV1OrganizationsTelephonyConfigsConfigIdSetDefaultOutboundPost,
} from "@/client/sdk.gen";
import type {
  TelephonyConfigurationDetail,
  TelephonyConfigurationListItem,
} from "@/client/types.gen";
import { ConfigFormDialog } from "@/components/telephony/ConfigFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelephonyConfigWarnings } from "@/context/TelephonyConfigWarningsContext";
import { detailFromError } from "@/lib/apiError";
import { useAuth } from "@/lib/auth";

export default function TelephonyConfigurationsPage() {
  const { user, getAccessToken, loading: authLoading } = useAuth();
  const {
    telnyxMissingWebhookPublicKeyCount,
    vonageMissingSignatureSecretCount,
    refresh: refreshWarnings,
  } = useTelephonyConfigWarnings();
  const [items, setItems] = useState<TelephonyConfigurationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TelephonyConfigurationDetail | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<TelephonyConfigurationListItem | null>(null);

  const fetchItems = useCallback(async () => {
    if (authLoading || !user) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet(
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.error) throw new Error(detailFromError(res.error));
      setItems(res.data?.configurations ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load configurations");
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, getAccessToken]);

  // After a save (create/update), webhook-verification warning state may have
  // changed — refresh the cached warning state so the page banner and nav badge
  // update without a manual reload.
  const onSaved = useCallback(async () => {
    await fetchItems();
    await refreshWarnings();
  }, [fetchItems, refreshWarnings]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onEdit = async (item: TelephonyConfigurationListItem) => {
    try {
      const token = await getAccessToken();
      const res = await getTelephonyConfigurationByIdApiV1OrganizationsTelephonyConfigsConfigIdGet(
        {
          headers: { Authorization: `Bearer ${token}` },
          path: { config_id: item.id },
        },
      );
      if (res.error) throw new Error(detailFromError(res.error));
      setEditTarget(res.data ?? null);
      setEditOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load configuration");
    }
  };

  const onSetDefault = async (item: TelephonyConfigurationListItem) => {
    try {
      const token = await getAccessToken();
      const res = await setDefaultOutboundApiV1OrganizationsTelephonyConfigsConfigIdSetDefaultOutboundPost(
        {
          headers: { Authorization: `Bearer ${token}` },
          path: { config_id: item.id },
        },
      );
      if (res.error) throw new Error(detailFromError(res.error));
      toast.success(`${item.name} is now the default outbound configuration`);
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set default");
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = await getAccessToken();
      const res = await deleteTelephonyConfigurationApiV1OrganizationsTelephonyConfigsConfigIdDelete(
        {
          headers: { Authorization: `Bearer ${token}` },
          path: { config_id: deleteTarget.id },
        },
      );
      if (res.error) throw new Error(detailFromError(res.error));
      toast.success("Configuration deleted");
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete configuration");
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6 bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Telephony configurations</h1>
          <p className="text-xs text-muted-foreground">
            Connect one or more telephony provider accounts. Each campaign uses one
            configuration; inbound calls are routed to the right one by account ID.{" "}
            <a
              href="https://docs.dograh.com/integrations/telephony/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline font-semibold text-foreground"
            >
              Learn more <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-9 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
          <Plus className="h-4 w-4 mr-1.5" /> Add configuration
        </Button>
      </div>

      {/* Warning Banners */}
      {telnyxMissingWebhookPublicKeyCount > 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold">Webhook public key not configured</p>
              <p className="leading-relaxed">
                {telnyxMissingWebhookPublicKeyCount === 1
                  ? "1 Telnyx configuration is"
                  : `${telnyxMissingWebhookPublicKeyCount} Telnyx configurations are`}{" "}
                missing a webhook public key. Without it, Telnyx call status
                updates and inbound calls are being rejected. Copy your
                public key from{" "}
                <span className="font-semibold">
                  Mission Control Portal → Keys &amp; Credentials → Public Key
                </span>{" "}
                and paste it into the affected Telnyx configuration below.
              </p>
            </div>
          </div>
        </div>
      )}

      {vonageMissingSignatureSecretCount > 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold">Signature secret not configured</p>
              <p className="leading-relaxed">
                {vonageMissingSignatureSecretCount === 1
                  ? "1 Vonage configuration is"
                  : `${vonageMissingSignatureSecretCount} Vonage configurations are`}{" "}
                missing a signature secret. Without it, Vonage signed webhooks
                are rejected, so inbound calls and call status updates will not
                work. Copy the signature secret from your Vonage account and
                paste it into the affected Vonage configuration below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center w-full py-12">
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 max-w-sm w-full border border-border bg-card rounded-xl shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground mb-4">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="text-xs font-bold text-foreground tracking-tight mb-2 uppercase">No telephony configurations yet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">Add one to enable outbound calls and receive inbound calls.</p>
            <Button onClick={() => setCreateOpen(true)} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs transition-all cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" /> Add configuration
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 p-5 border border-border bg-card hover:bg-card/90 transition-all rounded-xl shadow-xs sm:flex-row sm:items-center sm:justify-between group">
              <Link
                href={`/telephony-configurations/${item.id}`}
                className="flex-1 min-w-0"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground group-hover:text-cta transition-colors truncate">{item.name}</span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md border-border/60 bg-muted/40">{item.provider}</Badge>
                    {item.is_default_outbound && (
                      <Badge className="gap-1 text-[9px] uppercase tracking-wider py-0.5 font-bold rounded-md bg-cta text-cta-foreground">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.phone_number_count} phone{" "}
                    {item.phone_number_count === 1 ? "number" : "numbers"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigator.clipboard
                        .writeText(String(item.id))
                        .then(() => toast.success("Configuration ID copied"))
                        .catch(() => toast.error("Failed to copy ID"));
                    }}
                    title="Click to copy"
                    className="inline-flex items-center gap-1 self-start rounded font-mono text-[10px] text-muted-foreground/60 hover:text-foreground"
                  >
                    <span className="truncate">ID: {item.id}</span>
                    <Copy className="h-2.5 w-2.5 shrink-0" />
                  </button>
                </div>
              </Link>
              <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:flex-nowrap pt-2 border-t border-border/40 sm:pt-0 sm:border-t-0">
                {!item.is_default_outbound && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => onSetDefault(item)}
                    title="Set as default outbound"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => onEdit(item)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setDeleteTarget(item)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg" asChild>
                  <Link
                    href={`/telephony-configurations/${item.id}`}
                    aria-label={`Manage phone numbers for ${item.name}`}
                  >
                    Manage Numbers
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfigFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existing={null}
        onSaved={onSaved}
      />
      <ConfigFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={editTarget}
        onSaved={onSaved}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} and all of its phone numbers will be removed. Any
              campaigns that reference this configuration will block the deletion until
              they are reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
