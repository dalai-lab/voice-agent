"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createTelephonyConfigurationApiV1OrganizationsTelephonyConfigsPost,
  getTelephonyProvidersMetadataApiV1OrganizationsTelephonyProvidersMetadataGet,
  updateTelephonyConfigurationApiV1OrganizationsTelephonyConfigsConfigIdPut,
} from "@/client/sdk.gen";
import type {
  TelephonyConfigurationCreateRequest,
  TelephonyConfigurationDetail,
  TelephonyProviderMetadata,
} from "@/client/types.gen";

type TelephonyConfigPayload = TelephonyConfigurationCreateRequest["config"];
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { detailFromError } from "@/lib/apiError";
import { useAuth } from "@/lib/auth";
import { copyTextToClipboard } from "@/lib/clipboard";

interface ConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When provided, the dialog is in edit mode.
  existing?: TelephonyConfigurationDetail | null;
  onSaved: () => void;
}

type FieldValue = string | number | boolean | undefined;
type FieldValues = Record<string, FieldValue>;

function flattenValues(
  value: Record<string, unknown>,
  prefix = "",
): FieldValues {
  const flattened: FieldValues = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      Object.assign(flattened, flattenValues(child as Record<string, unknown>, path));
    } else if (
      child === undefined ||
      typeof child === "string" ||
      typeof child === "number" ||
      typeof child === "boolean"
    ) {
      flattened[path] = child;
    }
  }
  return flattened;
}

function nestValues(values: FieldValues): Record<string, unknown> {
  const nested: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(values)) {
    if (value === undefined || value === "") continue;
    const parts = path.split(".");
    let current = nested;
    for (const part of parts.slice(0, -1)) {
      const child = current[part];
      if (!child || typeof child !== "object" || Array.isArray(child)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return nested;
}

export function ConfigFormDialog({
  open,
  onOpenChange,
  existing,
  onSaved,
}: ConfigFormDialogProps) {
  const { user, getAccessToken } = useAuth();
  const [providers, setProviders] = useState<TelephonyProviderMetadata[]>([]);
  const [providerName, setProviderName] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [values, setValues] = useState<FieldValues>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isEdit = !!existing;
  const lockedProvider = isEdit;

  const currentProvider = useMemo(
    () => providers.find((p) => p.provider === providerName),
    [providers, providerName],
  );
  const visibleFields = useMemo(
    () =>
      currentProvider?.fields.filter(
        (field) =>
          !field.visible_when ||
          values[field.visible_when.field] === field.visible_when.equals,
      ) ?? [],
    [currentProvider, values],
  );

  // Fetch provider metadata once when the dialog opens.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      const res = await getTelephonyProvidersMetadataApiV1OrganizationsTelephonyProvidersMetadataGet(
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (cancelled) return;
      const list = res.data?.providers ?? [];
      setProviders(list);
      if (existing) {
        setProviderName(existing.provider);
        setName(existing.name);
        setIsDefault(existing.is_default_outbound);
        setValues(flattenValues(existing.credentials ?? {}));
      } else if (list.length > 0 && !providerName) {
        setProviderName(list[0].provider);
        setValues({});
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, user, getAccessToken]);

  // When provider changes during create, clear field values.
  useEffect(() => {
    if (!isEdit) setValues({});
  }, [providerName, isEdit]);

  const updateField = (fieldName: string, value: FieldValue) => {
    setValues((prev) => {
      const next = { ...prev, [fieldName]: value };
      if (value === undefined) {
        for (const field of currentProvider?.fields ?? []) {
          if (field.visible_when?.field === fieldName) delete next[field.name];
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!currentProvider) return;
    if (!isEdit && !name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();

      // Build the provider-discriminated config payload from collected values.
      const configPayload = {
        provider: providerName,
        ...nestValues(values),
      } as unknown as TelephonyConfigPayload;

      if (isEdit && existing) {
        const res = await updateTelephonyConfigurationApiV1OrganizationsTelephonyConfigsConfigIdPut(
          {
            headers: { Authorization: `Bearer ${token}` },
            path: { config_id: existing.id },
            body: { name: name || undefined, config: configPayload },
          },
        );
        if (res.error) throw new Error(detailFromError(res.error, "Failed to save configuration"));
        toast.success("Configuration updated");
      } else {
        const res = await createTelephonyConfigurationApiV1OrganizationsTelephonyConfigsPost(
          {
            headers: { Authorization: `Bearer ${token}` },
            body: {
              name: name.trim(),
              is_default_outbound: isDefault,
              config: configPayload,
            },
          },
        );
        if (res.error) throw new Error(detailFromError(res.error, "Failed to save configuration"));
        toast.success("Configuration created");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-xl bg-background border border-border shadow-lg p-6">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold text-foreground">
            {isEdit ? "Edit Telephony Configuration" : "Add Telephony Configuration"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {isEdit
              ? "Update credentials for this configuration. Phone numbers are managed separately."
              : "Connect a telephony provider account. Phone numbers are added after the configuration is created."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isEdit && existing && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Configuration ID</Label>
              <button
                type="button"
                onClick={() => {
                  copyTextToClipboard(String(existing.id))
                    .then(() => toast.success("Configuration ID copied"))
                    .catch(() => toast.error("Failed to copy ID"));
                }}
                title="Click to copy"
                className="group flex w-full items-center gap-2 rounded-lg border border-border bg-muted/20 p-2 text-left font-mono text-[10px] transition-colors hover:bg-muted/40"
              >
                <code className="flex-1 truncate">{existing.id}</code>
                <Copy className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cfg-name" className="text-xs font-bold text-foreground">Name</Label>
            <Input
              id="cfg-name"
              placeholder="e.g. Twilio US prod"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-lg border-border bg-background text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cfg-provider" className="text-xs font-bold text-foreground">Provider</Label>
            <Select
              value={providerName}
              onValueChange={setProviderName}
              disabled={lockedProvider || providers.length === 0}
            >
              <SelectTrigger id="cfg-provider" className="h-9 rounded-lg border-border bg-background text-xs">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent className="rounded-lg text-xs">
                {providers.map((p) => (
                  <SelectItem key={p.provider} value={p.provider} className="text-xs">
                    {p.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockedProvider && (
              <p className="text-[10px] text-muted-foreground/60">
                Provider cannot be changed after creation.
              </p>
            )}
            {currentProvider?.docs_url && (
              <a
                href={currentProvider.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground underline"
              >
                {currentProvider.display_name} docs <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>

          {!isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/10">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground">Set as default for outbound calls</Label>
                <p className="text-[10px] text-muted-foreground/60 leading-normal">
                  Used by test calls and campaigns when no specific config is selected.
                </p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          )}

          {currentProvider && (
            <div className="space-y-4 border-t border-border pt-4">
              {visibleFields.map((field, index) => (
                <div className="space-y-2" key={field.name}>
                  {field.section && field.section !== visibleFields[index - 1]?.section && (
                    <div className="pb-1 pt-2 border-b border-border/40">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{field.section}</h3>
                    </div>
                  )}
                  <Label htmlFor={`cfg-field-${field.name}`} className="text-xs font-bold text-foreground">
                    {field.label}
                    {!field.required && (
                      <span className="ml-1 text-[10px] text-muted-foreground/60 font-normal">
                        (optional)
                      </span>
                    )}
                  </Label>
                  <FieldInput
                    field={field}
                    value={values[field.name]}
                    onChange={(v) => updateField(field.name, v)}
                    isEdit={isEdit}
                  />
                  {field.description && (
                    <p className="text-[10px] text-muted-foreground/60 leading-normal">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="h-9 px-4 rounded-lg text-xs font-semibold">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !currentProvider} className="h-9 px-4 rounded-lg bg-cta text-cta-foreground hover:bg-cta/90 shadow-sm font-semibold text-xs cursor-pointer">
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldInputProps {
  field: TelephonyProviderMetadata["fields"][number];
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  isEdit: boolean;
}

// Skip from_numbers in the metadata-driven form — phone numbers are managed
// via the dedicated phone-numbers endpoints and a different UI.
function FieldInput({ field, value, onChange, isEdit }: FieldInputProps) {
  if (field.name === "from_numbers") {
    return (
      <p className="text-[10px] text-muted-foreground/60 font-medium">
        Phone numbers are managed separately on the configuration page.
      </p>
    );
  }

  const placeholder =
    field.placeholder ??
    (field.sensitive && isEdit ? "Leave masked to keep existing" : "");

  if (field.type === "textarea") {
    return (
      <Textarea
        id={`cfg-field-${field.name}`}
        placeholder={placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="min-h-[100px] rounded-lg border-border bg-background text-xs leading-relaxed font-mono resize-y"
      />
    );
  }
  if (field.type === "number") {
    return (
      <Input
        id={`cfg-field-${field.name}`}
        type="number"
        placeholder={placeholder}
        value={value as number | string | undefined ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="h-9 rounded-lg border-border bg-background text-xs"
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <Switch
        id={`cfg-field-${field.name}`}
        checked={Boolean(value)}
        onCheckedChange={onChange}
      />
    );
  }
  if (field.type === "select") {
    return (
      <Select
        value={value === undefined ? "__none__" : String(value)}
        onValueChange={(next) => onChange(next === "__none__" ? undefined : next)}
      >
        <SelectTrigger id={`cfg-field-${field.name}`} className="h-9 rounded-lg border-border bg-background text-xs">
          <SelectValue placeholder={placeholder || "Select an option"} />
        </SelectTrigger>
        <SelectContent className="rounded-lg text-xs">
          {!field.required && <SelectItem value="__none__" className="text-xs">Not configured</SelectItem>}
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      id={`cfg-field-${field.name}`}
      type={field.type === "password" || field.sensitive ? "password" : "text"}
      placeholder={placeholder}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={field.sensitive ? "current-password" : undefined}
      className="h-9 rounded-lg border-border bg-background text-xs"
    />
  );
}
