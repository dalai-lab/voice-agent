"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, AlertCircle, ArrowRight, X } from "lucide-react";
import { useRealtimeWallet } from "@/hooks/useRealtimeWallet";
import { useTalkarCustomer } from "@/context/TalkarCustomerContext";

export function LowBalanceBanner() {
  const pathname = usePathname();
  const wallet = useRealtimeWallet();
  const { talkarStatus } = useTalkarCustomer();
  const [dismissed, setDismissed] = useState(false);

  // If balance drops lower than when dismissed, re-show warning
  const lastBalanceRef = useRef<number | null>(null);
  useEffect(() => {
    if (wallet.balancePaise !== null && lastBalanceRef.current !== null) {
      if (wallet.balancePaise < lastBalanceRef.current) {
        setDismissed(false);
      }
    }
    lastBalanceRef.current = wallet.balancePaise;
  }, [wallet.balancePaise]);

  // Don't show on wallet page (already managing funds) or onboarding/auth routes
  if (
    pathname === "/wallet" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/handler") ||
    pathname === "/"
  ) {
    return null;
  }

  // If another lifecycle gate banner is active (e.g. pending deposit or suspended), don't double banner
  if (talkarStatus === "suspended" || talkarStatus === "pending_deposit") {
    return null;
  }

  // Not loaded yet or wallet has >= ₹500 (50,000 paise)
  if (wallet.isLoading || wallet.balancePaise === null || wallet.balancePaise >= 50000) {
    return null;
  }

  if (dismissed) {
    return null;
  }

  const isEmpty = wallet.balancePaise <= 0;

  return (
    <div
      role="alert"
      className={`border-b text-xs transition-colors px-4 py-2.5 z-40 select-none ${
        isEmpty
          ? "border-rose-500/20 bg-rose-500/10 text-rose-900 dark:text-rose-200 dark:bg-rose-500/15"
          : "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 dark:bg-amber-500/15"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between gap-3 max-w-7xl">
        <div className="flex items-center gap-2.5 min-w-0">
          {isEmpty ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <p className="truncate">
            <span className="font-semibold">
              {isEmpty ? "Wallet empty:" : "Low balance warning:"}
            </span>{" "}
            {isEmpty ? (
              <span>Your balance is ₹0.00. Calling operations are currently paused.</span>
            ) : (
              <span>
                Your wallet is at <strong className="font-semibold">₹{wallet.balanceRupees}</strong>. A minimum of ₹500 is required to keep calling lines active.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/wallet"
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 hover:opacity-80 transition-opacity text-xs"
          >
            <span>Add funds</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
