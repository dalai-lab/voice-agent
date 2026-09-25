"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Download,
  AlertCircle,
  Clock,
  PhoneCall,
  Zap,
  RefreshCw,
  Building2,
  ChevronRight,
  Sparkles
} from "lucide-react";

export default function WalletPage() {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const email = (user as any)?.primaryEmail ?? (user as any)?.email;
  const searchParams = useSearchParams();
  const isActivation = searchParams.get("activation") === "true";
  const plan = searchParams.get("plan") || "starter";
  const PLAN_MINIMUMS: Record<string, number> = { starter: 6000, growth: 6000, pro: 8000 };
  const TALKAR = "/api/talkar";

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  
  const [topupAmount, setTopupAmount] = useState<string>(String(PLAN_MINIMUMS[plan] ?? 6000));
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [threshold, setThreshold] = useState("1000");
  const [rechargeAmount, setRechargeAmount] = useState("5000");
  const [isSavingRecharge, setIsSavingRecharge] = useState(false);
  const [hasSavedCard, setHasSavedCard] = useState(false);
  const [isRequestingUpgrade, setIsRequestingUpgrade] = useState(false);
  const [selectedTierToSwitch, setSelectedTierToSwitch] = useState<string | null>(null);

  const [resolvedOrgId, setResolvedOrgId] = useState<number | null>(null);
  const [customerStatus, setCustomerStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (orgContext?.organization_id) {
      setResolvedOrgId(orgContext.organization_id);
      return;
    }

    if (email) {
      fetch(`${TALKAR}/customers/status?contact_email=${encodeURIComponent(email)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.dograh_org_id) {
            setResolvedOrgId(data.dograh_org_id);
          }
        })
        .catch(console.error);
    }
  }, [user, orgContext?.organization_id, email]);

  useEffect(() => {
    if (!resolvedOrgId) return;

    Promise.all([
      fetch(`${TALKAR}/billing/wallet/by-org/${resolvedOrgId}`).then(r => r.json()),
      fetch(`${TALKAR}/billing/subscription/by-org/${resolvedOrgId}`).then(r => r.json()),
      fetch(`${TALKAR}/billing/transactions/by-org/${resolvedOrgId}?limit=100`).then(r => r.json()),
      fetch(`${TALKAR}/billing/usage/by-org/${resolvedOrgId}`).then(r => r.json()),
      fetch(`${TALKAR}/customers/status?dograh_org_id=${resolvedOrgId}`).then(r => r.ok ? r.json() : null),
      fetch(`${TALKAR}/invoices/by-org/${resolvedOrgId}`).then(r => r.ok ? r.json() : { invoices: [] })
    ]).then(([walletData, subData, txnData, usageData, statusData, invoiceData]) => {
      setWallet(walletData);
      setSubscription(subData);
      setTransactions(txnData.transactions || []);
      setUsage(usageData);
      setInvoices(invoiceData.invoices || []);
      if (statusData?.status) setCustomerStatus(statusData.status);
      
      setAutoRechargeEnabled(walletData.auto_recharge_enabled);
      setThreshold(String((walletData.auto_recharge_threshold_paise || 100000) / 100));
      setRechargeAmount(String((walletData.auto_recharge_amount_paise || 500000) / 100));
      setHasSavedCard(walletData.has_saved_card);
    }).catch(console.error);
  }, [resolvedOrgId]);

  const currentPlan = subscription?.tier || plan || "starter";
  const isCustomPlan = subscription?.is_custom;

  useEffect(() => {
    if (subscription) {
      const isActivationNeeded = customerStatus === "pending_deposit" || customerStatus === "pending_plan_selection" || isActivation;
      if (isActivationNeeded) {
        const p = subscription.plan || "starter";
        const min = isCustomPlan
          ? (subscription.custom_activation_deposit_paise ?? 600000) / 100
          : (PLAN_MINIMUMS[p] ?? 6000);
        if (parseInt(topupAmount || "0") < min) {
          setTopupAmount(String(min));
        }
      }
    }
  }, [subscription, customerStatus, isCustomPlan]);

  const balancePaise = wallet && typeof wallet.balance_paise === 'number' ? wallet.balance_paise : 0;
  const balanceRupeesNumber = balancePaise / 100;
  const balanceRupees = balanceRupeesNumber.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isZero = balancePaise === 0;
  const isLow = balancePaise > 0 && balancePaise < 50000;

  const isActivationNeeded = customerStatus === "pending_deposit" || customerStatus === "pending_plan_selection" || isActivation;
  const minTopup = isActivationNeeded
    ? (isCustomPlan
        ? (subscription?.custom_activation_deposit_paise ?? 600000) / 100
        : PLAN_MINIMUMS[currentPlan] ?? 6000)
    : 500;

  const currentMinuteRate = subscription?.per_minute_rate_paise ? subscription.per_minute_rate_paise / 100 : (currentPlan === "pro" ? 4 : 6);
  const parsedTopupAmount = parseInt(topupAmount) || 0;
  const estimatedMinutes = parsedTopupAmount > 0 && currentMinuteRate > 0 ? Math.floor(parsedTopupAmount / currentMinuteRate) : 0;

  const handleTopup = async (isMock = false, isLiveTest = false) => {
    if (!resolvedOrgId) return;
    const dograhOrgId = resolvedOrgId;
    const amount = isLiveTest ? 1 : parseInt(topupAmount);
    if (!isLiveTest && amount < minTopup) {
      alert(`Minimum top-up is ₹${minTopup}`);
      return;
    }
    
    setIsProcessing(true);
    try {
      const orderRes = await fetch(`${TALKAR}/billing/topup/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dograh_org_id: dograhOrgId, amount_rupees: amount })
      });
      const order = await orderRes.json();
      
      if (!order.razorpay_order_id) {
        throw new Error(order.detail || "Failed to create order");
      }
      
      const statusRes = await fetch(`${TALKAR}/customers/status?dograh_org_id=${dograhOrgId}`);
      const statusData = await statusRes.json();
      const rzpKey = statusData.razorpay_key_id;

      const handleTopupSuccess = async (newBalance: number) => {
        setWallet((prev: any) => ({ ...prev, balance_paise: newBalance }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("talkar:wallet-updated"));
        }
        setTopupAmount("");
        setIsProcessing(false);
        alert(isMock ? "Test deposit completed." : "Funds added to wallet successfully.");
        
        if (isActivation && plan) {
          const activateRes = await fetch(`${TALKAR}/customers/by-org/${dograhOrgId}/select-tier`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: plan })
          });
          if (activateRes.ok) {
            const activateData = await activateRes.json();
            if (activateData.status === "active") {
              window.location.href = "/overview";
              return;
            }
          }
        }
        
        fetch(`${TALKAR}/billing/transactions/by-org/${dograhOrgId}?limit=100`)
          .then(r => r.json())
          .then(data => setTransactions(data.transactions || []));
      };

      if (isMock) {
        const confirmRes = await fetch(`${TALKAR}/billing/confirm-topup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: "mock_payment_id",
            razorpay_order_id: order.razorpay_order_id,
            razorpay_signature: "mock_signature",
            dograh_org_id: dograhOrgId,
            amount_paise: order.amount_paise,
          })
        });
        if (!confirmRes.ok) {
          const err = await confirmRes.json().catch(() => ({}));
          throw new Error(err.detail || "Mock confirmation failed.");
        }
        const result = await confirmRes.json();
        await handleTopupSuccess(result.new_balance_paise);
        return;
      }

      if (!rzpKey) {
        alert("Payment gateway configuration missing. Please verify Razorpay keys.");
        setIsProcessing(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: order.amount_paise,
        currency: order.currency,
        name: "Talkar AI Voice",
        description: `Wallet top-up of ₹${amount.toLocaleString()}`,
        order_id: order.razorpay_order_id,
        handler: async (response: any) => {
          const confirmRes = await fetch(`${TALKAR}/billing/confirm-topup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              dograh_org_id: dograhOrgId,
              amount_paise: order.amount_paise,
            })
          });
          if (!confirmRes.ok) {
            const err = await confirmRes.json().catch(() => ({}));
            throw new Error(err.detail || "Failed to confirm payment on server");
          }
          const result = await confirmRes.json();
          await handleTopupSuccess(result.new_balance_paise);
        },
        modal: {
          ondismiss: () => {
             setIsProcessing(false);
          }
        },
        prefill: {
          name: (user as any)?.name || (user as any)?.displayName,
          email: (user as any)?.email || (user as any)?.primaryEmail,
        }
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred");
      setIsProcessing(false);
    }
  };

  const handleSaveAutoRecharge = async () => {
    if (!resolvedOrgId) return;
    if (autoRechargeEnabled && !hasSavedCard) {
      alert("Please add and verify a card before enabling auto-recharge.");
      return;
    }
    const dograhOrgId = resolvedOrgId;
    setIsSavingRecharge(true);
    try {
      const res = await fetch(`${TALKAR}/billing/wallet/auto-recharge/by-org/${dograhOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: autoRechargeEnabled,
          threshold_paise: parseInt(threshold) * 100,
          amount_paise: parseInt(rechargeAmount) * 100,
        })
      });
      if (res.ok) {
        alert("Auto-recharge settings updated successfully.");
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to save settings");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setIsSavingRecharge(false);
    }
  };

  const handleAddCard = async (isMock = false) => {
    if (!resolvedOrgId) return;
    const dograhOrgId = resolvedOrgId;
    try {
      const custRes = await fetch(`${TALKAR}/billing/razorpay-customer/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          dograh_org_id: dograhOrgId, 
          name: (user as any)?.name || (user as any)?.displayName, 
          email: (user as any)?.email || (user as any)?.primaryEmail 
        })
      });
      const customer = await custRes.json();
      
      const sessionRes = await fetch(`${TALKAR}/billing/wallet/add-card/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dograh_org_id: dograhOrgId })
      });
      const session = await sessionRes.json();

      if (isMock) {
        const confirmRes = await fetch(`${TALKAR}/billing/confirm-add-card`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: "mock_payment_id",
            razorpay_signature: "mock_signature",
            razorpay_order_id: session.razorpay_order_id,
            dograh_org_id: dograhOrgId
          })
        });
        if (!confirmRes.ok) throw new Error("Mock failed");
        setHasSavedCard(true);
        alert("Test payment method verified.");
        return;
      }

      const statusRes = await fetch(`${TALKAR}/customers/status?dograh_org_id=${dograhOrgId}`);
      const statusData = await statusRes.json();
      const rzpKey = statusData.razorpay_key_id;

      if (!rzpKey) {
        alert("Payment gateway key missing.");
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: session.amount_paise,
        currency: "INR",
        name: "Verify Payment Method",
        description: "Zero-charge authorization for automated reloads",
        order_id: session.razorpay_order_id,
        customer_id: customer.razorpay_customer_id,
        recurring: "1",
        handler: async (response: any) => {
          const confirmRes = await fetch(`${TALKAR}/billing/confirm-add-card`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              razorpay_order_id: session.razorpay_order_id,
              dograh_org_id: dograhOrgId
            })
          });
          if (confirmRes.ok) {
            setHasSavedCard(true);
            alert("Card authorized successfully.");
          }
        },
        prefill: {
          name: (user as any)?.name || "",
          email: (user as any)?.email || "",
        }
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Failed to initiate card setup");
    }
  };

  const handleUpgradeRequest = async (requestedTier: string) => {
    if (!resolvedOrgId) return;
    const dograhOrgId = resolvedOrgId;
    
    setIsRequestingUpgrade(true);
    try {
      const orderRes = await fetch(`${TALKAR}/billing/upgrade/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dograh_org_id: dograhOrgId, requested_tier: requestedTier })
      });
      
      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to switch plan");
      }
      
      const order = await orderRes.json();
      
      if (order.status === "upgraded_from_wallet") {
        alert(`Plan switched to ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)}.`);
        fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during plan update");
    } finally {
      setIsRequestingUpgrade(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => filter === "all" || tx.type === filter);
  const itemsPerPage = 15;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const currentTransactions = filteredTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const quickPresets = [2000, 5000, 10000, 25000];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 bg-background text-foreground font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wallet & Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your call balance, voice tier rates, auto-reload settings, and invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {process.env.NODE_ENV !== "production" && (
            <Button
              onClick={() => handleTopup(true)}
              variant="outline"
              size="sm"
              className="text-xs font-medium border-border/80 text-muted-foreground hover:text-foreground"
            >
              Dev Test Deposit
            </Button>
          )}
          <Button
            onClick={() => {
              const el = document.getElementById("add-funds-card");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-medium bg-foreground text-background hover:bg-foreground/90 rounded-lg px-3.5 h-9 shadow-xs"
          >
            Add Funds
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {isActivation && (
        <div className="border border-border bg-card p-4 rounded-xl flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Activation Deposit Required</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Add at least ₹{minTopup.toLocaleString()} to initialize your voice lines and complete workspace onboarding.
            </p>
          </div>
        </div>
      )}

      {isZero && !isActivation && (
        <div className="border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 p-4 rounded-xl flex items-start gap-3.5 text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold">Zero Balance — Inbound & Outbound Calling Paused</h4>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
              Your wallet is empty. Add funds to immediately resume real-time agent call handling.
            </p>
          </div>
        </div>
      )}

      {isLow && !isZero && (
        <div className="border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-4 rounded-xl flex items-start gap-3.5 text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold">Low Balance Notice</h4>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
              Your balance is under ₹500. Maintain a healthy reserve to prevent sudden line suspensions during live peak volume.
            </p>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Balance */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Available Balance</span>
            <Wallet className="h-4 w-4 text-muted-foreground/80" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              <span className="text-sm font-normal text-muted-foreground mr-1">₹</span>
              {balanceRupees}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {balanceRupeesNumber >= 500 ? "Active for live calls" : "Min. ₹500 required"}
            </p>
          </div>
        </div>

        {/* Card 2: Voice Tier */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Plan</span>
            <PhoneCall className="h-4 w-4 text-muted-foreground/80" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground capitalize">
              {subscription?.tier === "custom" ? (subscription?.custom_plan_label || "Custom") : currentPlan}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ₹{currentMinuteRate.toFixed(2)}/min · {subscription?.tier === "pro" ? "10 lines" : "2 lines"}
            </p>
          </div>
        </div>

        {/* Card 3: Monthly Usage */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Current Month Usage</span>
            <Clock className="h-4 w-4 text-muted-foreground/80" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {usage?.total_minutes ?? 0} <span className="text-xs font-normal text-muted-foreground">mins</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ₹{((usage?.total_spend_paise ?? 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} spent
            </p>
          </div>
        </div>

        {/* Card 4: Auto-Reload */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Auto-Reload</span>
            <RefreshCw className="h-4 w-4 text-muted-foreground/80" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {autoRechargeEnabled ? "Enabled" : "Off"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {autoRechargeEnabled ? `Triggers at ₹${Number(threshold).toLocaleString()}` : "Manual reload only"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Add Funds & Auto-Recharge side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add Funds */}
        <div id="add-funds-card" className="lg:col-span-7 rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Add Funds</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top up your workspace balance using UPI, credit cards, or net banking.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Select Preset Amount</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickPresets.map((amt) => {
                const isSelected = topupAmount === String(amt);
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(String(amt))}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? "border-foreground bg-foreground text-background shadow-xs"
                        : "border-border/80 hover:border-foreground/40 bg-background text-foreground"
                    }`}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Or Enter Custom Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₹</span>
              <Input
                type="number"
                min={minTopup}
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder={`Minimum ₹${minTopup}`}
                className="pl-8 h-10 rounded-lg text-sm bg-background border-border"
              />
            </div>
          </div>

          {/* Estimated Talk Time Banner */}
          {estimatedMinutes > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border/50 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Estimated Call Capacity</span>
              <span className="font-semibold text-foreground">
                ~{estimatedMinutes.toLocaleString()} minutes <span className="text-muted-foreground font-normal">at ₹{currentMinuteRate}/min</span>
              </span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleTopup(false)}
              disabled={!topupAmount || parseInt(topupAmount) < minTopup || isProcessing}
              className="w-full sm:flex-1 h-10 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
            >
              {isProcessing ? "Opening Checkout..." : `Pay ₹${parsedTopupAmount > 0 ? parsedTopupAmount.toLocaleString() : "0"} Securely`}
            </Button>
          </div>
        </div>

        {/* Right: Auto-Recharge Settings */}
        <div className="lg:col-span-5 rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Auto-Reload</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically recharge your account when it falls below a threshold.
              </p>
            </div>
            <Switch
              checked={autoRechargeEnabled}
              onCheckedChange={setAutoRechargeEnabled}
            />
          </div>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Trigger when balance drops below</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  disabled={!autoRechargeEnabled}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="pl-7 h-9 text-xs rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount to recharge</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  disabled={!autoRechargeEnabled}
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="pl-7 h-9 text-xs rounded-lg bg-background"
                />
              </div>
            </div>

            {/* Saved Card Section */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Payment Method</span>
                {hasSavedCard ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="h-3 w-3" /> Card on file
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddCard(false)}
                    className="text-xs font-medium text-foreground hover:underline"
                  >
                    + Add Card
                  </button>
                )}
              </div>
            </div>

            <Button
              onClick={handleSaveAutoRecharge}
              disabled={isSavingRecharge || (autoRechargeEnabled && !hasSavedCard)}
              variant="outline"
              className="w-full h-9 rounded-lg text-xs font-medium border-border/80"
            >
              {isSavingRecharge ? "Saving..." : "Save Auto-Reload Settings"}
            </Button>
          </div>
        </div>
      </div>

      {/* Plan Selection Section */}
      {!isCustomPlan && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Calling Plans & Capacity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose the tier that matches your call volume and language requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Starter Plan */}
            <div
              className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                subscription?.tier === "starter"
                  ? "border-foreground bg-foreground/[0.02]"
                  : "border-border/70 bg-card hover:border-foreground/30"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Starter</h3>
                  {subscription?.tier === "starter" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/[0.08] text-foreground">
                      Current Plan
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">₹6 / min</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Best for initial inbound coverage, appointment booking, and qualifying leads.
                </p>
                <div className="pt-2 border-t border-border/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>2 concurrent calling channels</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>1 dedicated phone number</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>Standard English & Hindi</span>
                  </div>
                </div>
              </div>

              {subscription?.tier !== "starter" && (
                <Button
                  onClick={() => setSelectedTierToSwitch("starter")}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium rounded-lg"
                >
                  Switch to Starter
                </Button>
              )}
            </div>

            {/* Growth Plan */}
            <div
              className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                subscription?.tier === "growth"
                  ? "border-foreground bg-foreground/[0.02]"
                  : "border-border/70 bg-card hover:border-foreground/30"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Growth</h3>
                  {subscription?.tier === "growth" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/[0.08] text-foreground">
                      Current Plan
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">₹6 / min</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Engineered for Indian multilingual conversations with ultra-low voice latency.
                </p>
                <div className="pt-2 border-t border-border/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>2 concurrent calling channels</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>100+ Indian regional language accents</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>Instant interruption handling</span>
                  </div>
                </div>
              </div>

              {subscription?.tier !== "growth" && (
                <Button
                  onClick={() => setSelectedTierToSwitch("growth")}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium rounded-lg"
                >
                  Switch to Growth
                </Button>
              )}
            </div>

            {/* Pro Plan */}
            <div
              className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                subscription?.tier === "pro"
                  ? "border-foreground bg-foreground/[0.02]"
                  : "border-border/70 bg-card hover:border-foreground/30"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-foreground">Pro</h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-foreground text-background font-medium">
                      High Volume
                    </span>
                  </div>
                  {subscription?.tier === "pro" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/[0.08] text-foreground">
                      Current Plan
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹4 / min
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Best rates and high concurrent lines for scaled outbound or high-traffic inbound.
                </p>
                <div className="pt-2 border-t border-border/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>10 concurrent calling channels</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>2 premium phone numbers included</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-foreground" />
                    <span>Lowest calling rate (₹4/min)</span>
                  </div>
                </div>
              </div>

              {subscription?.tier !== "pro" && (
                <Button
                  onClick={() => setSelectedTierToSwitch("pro")}
                  size="sm"
                  className="w-full text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90"
                >
                  Switch to Pro
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity & Invoices Tabs */}
      <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xs space-y-5">
        <Tabs defaultValue="transactions">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
            <TabsList className="bg-muted/40 p-1 rounded-lg">
              <TabsTrigger value="transactions" className="rounded-md text-xs font-medium">
                Activity
              </TabsTrigger>
              <TabsTrigger value="invoices" className="rounded-md text-xs font-medium">
                Tax Invoices
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs text-foreground focus:outline-none"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Transactions</option>
                <option value="top_up">Deposits</option>
                <option value="call_deduction">Call Usage</option>
                <option value="refund">Refunds</option>
                <option value="grant">Promotional Grants</option>
              </select>
            </div>
          </div>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4 pt-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground py-3">Date</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground py-3">Description</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground py-3 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-muted/20">
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {new Date(tx.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground py-3">
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={`text-xs font-semibold text-right py-3 ${
                          tx.amount_paise > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {tx.amount_paise > 0 ? "+" : "-"}₹
                        {(Math.abs(tx.amount_paise) / 100).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {currentTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-8">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-7 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4 pt-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground py-3">Date</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground py-3">Invoice Number</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground py-3">Amount</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground py-3">Status</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground py-3 text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="border-border/30 hover:bg-muted/20">
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {new Date(inv.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-foreground py-3">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground py-3">
                        ₹{(inv.amount_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <a
                          href={`/invoice/${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                        No invoices generated yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Switch Plan Confirmation Modal */}
      {selectedTierToSwitch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Confirm Plan Switch</h3>
              <p className="text-xs text-muted-foreground">
                Switching to the <span className="font-semibold text-foreground capitalize">{selectedTierToSwitch}</span> plan updates your per-minute rate and concurrency limits immediately.
              </p>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-2 border border-border/40 text-muted-foreground">
              <div className="flex justify-between">
                <span>New Call Rate:</span>
                <span className="font-semibold text-foreground">
                  ₹{selectedTierToSwitch === "pro" ? "4.00" : "6.00"} / min
                </span>
              </div>
              <div className="flex justify-between">
                <span>Concurrent Channels:</span>
                <span className="font-semibold text-foreground">
                  {selectedTierToSwitch === "pro" ? "10 call lines" : "2 call lines"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Available Balance:</span>
                <span className="font-semibold text-foreground">₹{balanceRupees}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => setSelectedTierToSwitch(null)}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium rounded-lg"
                disabled={isRequestingUpgrade}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleUpgradeRequest(selectedTierToSwitch);
                  setSelectedTierToSwitch(null);
                }}
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90"
                disabled={isRequestingUpgrade}
              >
                {isRequestingUpgrade ? "Updating..." : "Confirm Switch"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
