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
  plan: string;
  planTier: string;
  planStatus: string;
  isCustomPlan: boolean;
  refresh: () => Promise<void>;
}

export function useRealtimeWallet(): RealtimeWalletState {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const [resolvedOrgId, setResolvedOrgId] = useState<number | null>(null);
  const [balancePaise, setBalancePaise] = useState<number | null>(null);
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [planTier, setPlanTier] = useState<string>("starter");
  const [planName, setPlanName] = useState<string>("Starter");
  const [planStatus, setPlanStatus] = useState<string>("active");
  const [isCustomPlan, setIsCustomPlan] = useState<boolean>(false);
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

  // 2. Fetch Wallet & Subscription Plan Data
  const fetchWallet = useCallback(async () => {
    if (!resolvedOrgId || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const [walletRes, subRes] = await Promise.all([
        fetch(`/api/talkar/billing/wallet/by-org/${resolvedOrgId}`),
        fetch(`/api/talkar/billing/subscription/by-org/${resolvedOrgId}`),
      ]);

      if (walletRes.ok) {
        const data = await walletRes.json();
        if (typeof data?.balance_paise === "number") {
          setBalancePaise(data.balance_paise);
        }
        setAutoRechargeEnabled(!!data?.auto_recharge_enabled);

        if (data?.plan) {
          const rawTier = String(data.plan).toLowerCase();
          setPlanTier(rawTier);
          const isCustom = rawTier === "custom" || !!data?.custom_plan_label;
          setIsCustomPlan(isCustom);
          setPlanName(isCustom ? (data.custom_plan_label || "Custom") : (rawTier.charAt(0).toUpperCase() + rawTier.slice(1)));
        }
        if (data?.plan_status) {
          setPlanStatus(data.plan_status);
        }
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData?.tier) {
          const rawTier = String(subData.tier).toLowerCase();
          setPlanTier(rawTier);
          const isCustom = subData.is_custom || rawTier === "custom";
          setIsCustomPlan(isCustom);
          setPlanName(isCustom ? (subData.custom_plan_label || "Custom") : (rawTier.charAt(0).toUpperCase() + rawTier.slice(1)));
        }
        if (subData?.status) {
          setPlanStatus(subData.status);
        }
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
    window.addEventListener("talkar:plan-updated", onCustomUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("talkar:wallet-updated", onCustomUpdate);
      window.removeEventListener("talkar:plan-updated", onCustomUpdate);
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
    plan: planName,
    planTier,
    planStatus,
    isCustomPlan,
    refresh: fetchWallet,
  };
}
