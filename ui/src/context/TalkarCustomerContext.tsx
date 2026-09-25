"use client";

import React, { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";

interface TalkarCustomerContextValue {
  isTalkarCustomer: boolean;
  isAdminBypass: boolean;
  talkarStatus: string | null;
  isLoading: boolean;
  isServiceDown: boolean;
  checkHealth: () => Promise<boolean>;
}

const TalkarCustomerContext = createContext<TalkarCustomerContextValue>({
  isTalkarCustomer: false,
  isAdminBypass: false,
  talkarStatus: null,
  isLoading: true,
  isServiceDown: false,
  checkHealth: async () => true,
});

export function TalkarCustomerProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { orgContext, loading: orgLoading } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;

  const [isAdminBypass, setIsAdminBypass] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return document.cookie.includes("talkar_admin_bypass=true");
  });

  const [isTalkarCustomer, setIsTalkarCustomer] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.cookie.includes("talkar_customer=true") && !document.cookie.includes("talkar_admin_bypass=true");
  });

  const [talkarStatus, setTalkarStatus] = React.useState<string | null>(null);
  const [isServiceDown, setIsServiceDown] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const lastCheckedOrgRef = useRef<number | null>(null);

  // Health check: probes lightweight /api/talkar/health without polling spam
  const checkHealth = React.useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/talkar/health", { cache: "no-store" });
      if (res.ok) {
        setIsServiceDown(false);
        if (dograhOrgId) {
          fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.status) {
                setTalkarStatus(data.status);
                setIsTalkarCustomer(true);
              }
            })
            .catch(() => {});
        }
        return true;
      }
      setIsServiceDown(true);
      return false;
    } catch {
      setIsServiceDown(true);
      return false;
    }
  }, [dograhOrgId]);

  // Re-check admin bypass cookie on mount
  useEffect(() => {
    const hasBypass = document.cookie.includes("talkar_admin_bypass=true");
    setIsAdminBypass(hasBypass);
    if (hasBypass) {
      setIsLoading(false);
    }
  }, []);

  // Event-driven check on tab focus (debounced to avoid heartbeat spam)
  useEffect(() => {
    let lastChecked = Date.now();
    const onFocus = () => {
      const now = Date.now();
      // Only verify if currently down, or if at least 60s passed since last interaction
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

  useEffect(() => {
    // If auth or org context is still resolving, keep waiting
    if (authLoading || orgLoading) {
      return;
    }

    // If user is not logged in or has no org, we are done
    if (!user || !dograhOrgId) {
      setIsLoading(false);
      return;
    }

    // Only re-fetch when the org changes
    if (lastCheckedOrgRef.current === dograhOrgId) {
      setIsLoading(false);
      return;
    }
    lastCheckedOrgRef.current = dograhOrgId;
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`, { signal: controller.signal })
      .then(async (r) => {
        // Upstream gateway failures indicate Talkar billing service is offline
        if (r.status === 502 || r.status === 503 || r.status === 504) {
          setIsServiceDown(true);
          return;
        }

        if (r.status === 404) {
          // New workspace: service is up, customer just hasn't completed onboarding
          setIsServiceDown(false);
          setIsTalkarCustomer(false);
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
          setIsTalkarCustomer(true);
          document.cookie = "talkar_customer=true; path=/; max-age=86400; SameSite=Lax";
        } else {
          setIsTalkarCustomer(false);
          document.cookie = "talkar_customer=; path=/; max-age=0";
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setIsServiceDown(true);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setIsLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user, authLoading, dograhOrgId, orgLoading]);

  return (
    <TalkarCustomerContext.Provider
      value={{
        isTalkarCustomer,
        isAdminBypass,
        talkarStatus,
        isLoading,
        isServiceDown,
        checkHealth
      }}
    >
      {children}
    </TalkarCustomerContext.Provider>
  );
}

export function useTalkarCustomer() {
  return useContext(TalkarCustomerContext);
}
