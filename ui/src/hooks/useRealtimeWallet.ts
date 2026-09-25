"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";

export interface RealtimeWalletState {
  balancePaise: number | null;
  balanceRupees: string;
  autoRechargeEnabled: boolean;
  status: "active" | "low" | "empty" | "loading";
  statusLabel: string;
  statusColor: string;
  currency: string;
  isLoading: boolean;
  resolvedOrgId: number | null;
  refresh: () => Promise<void>;
}

export function useRealtimeWallet(): RealtimeWalletState {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const [resolvedOrgId, setResolvedOrgId] = useState<number | null>(null);
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

  // 1. Resolve Organization ID
  useEffect(() => {
    if (orgContext?.organization_id) {
      setResolvedOrgId(orgContext.organization_id);
      return;
    }

    const email = (user as any)?.email || (user as any)?.primaryEmail;
    if (!email) return;

    let isMounted = true;
    fetch(`/api/talkar/customers/by-email/${encodeURIComponent(email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (isMounted && data?.dograh_org_id) {
          setResolvedOrgId(data.dograh_org_id);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user, orgContext?.organization_id]);

  // 2. Fetch Wallet Data
  const fetchWallet = useCallback(async () => {
    if (!resolvedOrgId || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res = await fetch(`/api/talkar/billing/wallet/by-org/${resolvedOrgId}`);
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.balance_paise === "number") {
          setBalancePaise(data.balance_paise);
        }
        setAutoRechargeEnabled(!!data?.auto_recharge_enabled);
      }
    } catch {
      // Fallback silently if offline or network hiccup
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [resolvedOrgId]);

  // Initial fetch and real-time polling (every 20s)
  useEffect(() => {
    if (!resolvedOrgId) return;

    fetchWallet();
    const interval = setInterval(fetchWallet, 20000);

    const onFocus = () => fetchWallet();
    const onCustomUpdate = () => fetchWallet();

    window.addEventListener("focus", onFocus);
    window.addEventListener("talkar:wallet-updated", onCustomUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("talkar:wallet-updated", onCustomUpdate);
    };
  }, [resolvedOrgId, fetchWallet]);

  // Derived state
  const isZero = balancePaise === null || balancePaise <= 0;
  const isLow = balancePaise !== null && balancePaise > 0 && balancePaise < 50000; // < ₹500

  let status: "active" | "low" | "empty" | "loading" = "active";
  let statusLabel = "Active";
  let statusColor = "emerald";

  if (isLoading && balancePaise === null) {
    status = "loading";
    statusLabel = "Loading";
    statusColor = "zinc";
  } else if (isZero) {
    status = "empty";
    statusLabel = "Inactive";
    statusColor = "zinc";
  } else if (isLow) {
    status = "low";
    statusLabel = "Low";
    statusColor = "amber";
  }

  const balanceRupees =
    balancePaise !== null
      ? (balancePaise / 100).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";

  return {
    balancePaise,
    balanceRupees,
    autoRechargeEnabled,
    status,
    statusLabel,
    statusColor,
    currency: "₹",
    isLoading,
    resolvedOrgId,
    refresh: fetchWallet,
  };
}
