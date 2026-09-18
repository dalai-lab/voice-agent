"use client";

import React, { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";

interface TalkarCustomerContextValue {
  isTalkarCustomer: boolean;
  isAdminBypass: boolean;
  talkarStatus: string | null;
}

const TalkarCustomerContext = createContext<TalkarCustomerContextValue>({
  isTalkarCustomer: false,
  isAdminBypass: false,
  talkarStatus: null,
});

export function TalkarCustomerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;

  const [isTalkarCustomer, setIsTalkarCustomer] = React.useState(false);
  const [isAdminBypass, setIsAdminBypass] = React.useState(false);
  const [talkarStatus, setTalkarStatus] = React.useState<string | null>(null);
  const lastCheckedOrgRef = useRef<number | null>(null);

  // Detect admin bypass cookie once on mount
  useEffect(() => {
    setIsAdminBypass(document.cookie.includes("talkar_admin_bypass=true"));
  }, []);

  useEffect(() => {
    if (!user || !dograhOrgId) return;
    if (isAdminBypass) return;
    // Only re-fetch when the org changes
    if (lastCheckedOrgRef.current === dograhOrgId) return;
    lastCheckedOrgRef.current = dograhOrgId;

    fetch(`/api/talkar/customers/status?dograh_org_id=${dograhOrgId}`)
      .then(async (r) => {
        if (!r.ok) return; // 404 or error — fail open, show full sidebar
        const data = await r.json();
        if (data?.status) {
          setTalkarStatus(data.status);
          setIsTalkarCustomer(true);
        }
      })
      .catch(() => {
        /* network failure — fail open, show full sidebar */
      });
  }, [user, dograhOrgId, isAdminBypass]);

  return (
    <TalkarCustomerContext.Provider value={{ isTalkarCustomer, isAdminBypass, talkarStatus }}>
      {children}
    </TalkarCustomerContext.Provider>
  );
}

export function useTalkarCustomer() {
  return useContext(TalkarCustomerContext);
}
