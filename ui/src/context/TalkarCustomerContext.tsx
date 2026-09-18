"use client";

import React, { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";

interface TalkarCustomerContextValue {
  isTalkarCustomer: boolean;
  isAdminBypass: boolean;
  talkarStatus: string | null;
  isLoading: boolean;
}

const TalkarCustomerContext = createContext<TalkarCustomerContextValue>({
  isTalkarCustomer: false,
  isAdminBypass: false,
  talkarStatus: null,
  isLoading: true,
});

export function TalkarCustomerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
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
  const [isLoading, setIsLoading] = React.useState(true);
  const lastCheckedOrgRef = useRef<number | null>(null);

  // Re-check admin bypass cookie on mount
  useEffect(() => {
    const hasBypass = document.cookie.includes("talkar_admin_bypass=true");
    setIsAdminBypass(hasBypass);
    if (hasBypass) {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !dograhOrgId) {
      setIsLoading(false);
      return;
    }
    if (isAdminBypass) {
      setIsLoading(false);
      return;
    }
    // Only re-fetch when the org changes
    if (lastCheckedOrgRef.current === dograhOrgId) return;
    lastCheckedOrgRef.current = dograhOrgId;

    fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
      .then(async (r) => {
        if (!r.ok) {
          setIsTalkarCustomer(false);
          document.cookie = "talkar_customer=; path=/; max-age=0";
          return;
        }
        const data = await r.json();
        if (data?.status) {
          setTalkarStatus(data.status);
          setIsTalkarCustomer(true);
          document.cookie = "talkar_customer=true; path=/; max-age=86400; SameSite=Lax";
        } else {
          setIsTalkarCustomer(false);
          document.cookie = "talkar_customer=; path=/; max-age=0";
        }
      })
      .catch(() => {
        /* network failure — fail open */
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, dograhOrgId, isAdminBypass]);

  return (
    <TalkarCustomerContext.Provider value={{ isTalkarCustomer, isAdminBypass, talkarStatus, isLoading }}>
      {children}
    </TalkarCustomerContext.Provider>
  );
}

export function useTalkarCustomer() {
  return useContext(TalkarCustomerContext);
}
