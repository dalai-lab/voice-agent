"use client";

import React, { createContext, useContext, useEffect, useRef, ReactNode, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";

export interface TalkarCustomerContextValue {
  isTalkarCustomer: boolean;
  isAdminBypass: boolean;
  talkarStatus: string | null;
  suspensionReason: string | null;
  hasOnboardingForm: boolean;
  isSubOrg: boolean;
  isLoading: boolean;
  isServiceDown: boolean;
  checkHealth: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

const TalkarCustomerContext = createContext<TalkarCustomerContextValue>({
  isTalkarCustomer: false,
  isAdminBypass: false,
  talkarStatus: null,
  suspensionReason: null,
  hasOnboardingForm: false,
  isSubOrg: false,
  isLoading: true,
  isServiceDown: false,
  checkHealth: async () => true,
  refreshStatus: async () => {},
});

export function TalkarCustomerProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { orgContext, loading: orgLoading } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const email = (user as any)?.primaryEmail ?? (user as any)?.email;

  const [isAdminBypass, setIsAdminBypass] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.cookie.includes("talkar_admin_bypass=true");
  });

  const [isTalkarCustomer, setIsTalkarCustomer] = useState<boolean>(false);
  const [talkarStatus, setTalkarStatus] = useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
  const [hasOnboardingForm, setHasOnboardingForm] = useState<boolean>(false);
  const [isSubOrg, setIsSubOrg] = useState<boolean>(false);
  const [isServiceDown, setIsServiceDown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const lastCheckedKeyRef = useRef<string | null>(null);

  // Re-check admin bypass cookie on mount
  useEffect(() => {
    const hasBypass = document.cookie.includes("talkar_admin_bypass=true");
    setIsAdminBypass(hasBypass);
    if (hasBypass) {
      setIsLoading(false);
    }
  }, []);

  const fetchCustomerStatus = useCallback(async (forcedOrgId?: number) => {
    const targetOrgId = forcedOrgId ?? dograhOrgId;
    const query = targetOrgId
      ? `dograh_org_id=${targetOrgId}`
      : email
      ? `contact_email=${encodeURIComponent(email)}`
      : "";

    if (!query) {
      setIsLoading(false);
      return;
    }

    const checkKey = `${targetOrgId || email}`;
    lastCheckedKeyRef.current = checkKey;
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const r = await fetch(`/api/talkar/customers/status?${query}`, {
        signal: controller.signal,
      });

      if (r.status === 502 || r.status === 503 || r.status === 504) {
        setIsServiceDown(true);
        return;
      }

      if (r.status === 404) {
        setIsServiceDown(false);
        setIsTalkarCustomer(true);
        setTalkarStatus("not_onboarded");
        setHasOnboardingForm(false);
        setIsSubOrg(false);
        if (targetOrgId) {
          document.cookie = `talkar_customer_${targetOrgId}=; path=/; max-age=0`;
        }
        document.cookie = "talkar_customer=; path=/; max-age=0";
        return;
      }

      if (!r.ok) {
        setIsServiceDown(true);
        return;
      }

      const data = await r.json();
      if (data?.error === "Talkar service unreachable") {
        setIsServiceDown(true);
        return;
      }

      setIsServiceDown(false);
      if (data?.status) {
        setTalkarStatus(data.status);
        setSuspensionReason(data.suspension_reason || null);
        setHasOnboardingForm(Boolean(data.has_onboarding_form));
        setIsSubOrg(Boolean(data.is_sub_org));
        setIsTalkarCustomer(true);
        if (targetOrgId) {
          document.cookie = `talkar_customer_${targetOrgId}=true; path=/; max-age=86400; SameSite=Lax`;
        }
        document.cookie = "talkar_customer=true; path=/; max-age=86400; SameSite=Lax";
      } else {
        setTalkarStatus("not_onboarded");
        setIsTalkarCustomer(true);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setIsServiceDown(true);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [dograhOrgId, email]);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/talkar/health", { cache: "no-store" });
      if (res.ok) {
        setIsServiceDown(false);
        await fetchCustomerStatus();
        return true;
      }
      setIsServiceDown(true);
      return false;
    } catch {
      setIsServiceDown(true);
      return false;
    }
  }, [fetchCustomerStatus]);

  const refreshStatus = useCallback(async () => {
    lastCheckedKeyRef.current = null;
    await fetchCustomerStatus();
  }, [fetchCustomerStatus]);

  // Listen for explicit status invalidation event fired on successful payment or onboarding action
  useEffect(() => {
    const handleInvalidate = () => {
      refreshStatus();
    };
    window.addEventListener("talkar-status-invalidate", handleInvalidate);
    return () => window.removeEventListener("talkar-status-invalidate", handleInvalidate);
  }, [refreshStatus]);

  // Trigger status check whenever user or org settles
  useEffect(() => {
    if (authLoading || orgLoading) return;
    if (!user) {
      setIsLoading(false);
      setTalkarStatus(null);
      setIsTalkarCustomer(false);
      return;
    }

    if ("primaryEmailVerified" in user && !user.primaryEmailVerified) {
      setIsLoading(false);
      setTalkarStatus(null);
      setIsTalkarCustomer(false);
      return;
    }

    const checkKey = `${dograhOrgId || email}`;
    if (!dograhOrgId && !email) {
      setIsLoading(false);
      return;
    }

    if (lastCheckedKeyRef.current === checkKey) {
      setIsLoading(false);
      return;
    }

    fetchCustomerStatus();
  }, [user, authLoading, dograhOrgId, orgLoading, email, fetchCustomerStatus]);

  // Event-driven check on tab focus (debounced to avoid heartbeat spam)
  useEffect(() => {
    let lastChecked = Date.now();
    const onFocus = () => {
      const now = Date.now();
      if (isServiceDown || now - lastChecked > 60000) {
        lastChecked = now;
        checkHealth();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [isServiceDown, checkHealth]);

  return (
    <TalkarCustomerContext.Provider
      value={{
        isTalkarCustomer,
        isAdminBypass,
        talkarStatus,
        suspensionReason,
        hasOnboardingForm,
        isSubOrg,
        isLoading,
        isServiceDown,
        checkHealth,
        refreshStatus,
      }}
    >
      {children}
    </TalkarCustomerContext.Provider>
  );
}

export function useTalkarCustomer() {
  return useContext(TalkarCustomerContext);
}
