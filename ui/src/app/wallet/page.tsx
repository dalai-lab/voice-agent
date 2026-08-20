"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { AlertTriangle, Plus, CreditCard, ReceiptText, ShieldCheck, Sparkles, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { useOrgConfig } from "@/context/OrgConfigContext";

export default function WalletPage() {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const email = (user as any)?.primaryEmail ?? (user as any)?.email;
  const searchParams = useSearchParams();
  const isActivation = searchParams.get("activation") === "true";
  const plan = searchParams.get("plan") || "starter";
  const PLAN_MINIMUMS: Record<string, number> = { starter: 6000, pro: 8000 };
  const minTopup = isActivation ? (PLAN_MINIMUMS[plan] ?? 6000) : 500;
  const TALKAR = "/api/talkar";

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  
  const [topupAmount, setTopupAmount] = useState<string>(isActivation ? String(PLAN_MINIMUMS[plan] ?? 6000) : "");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [threshold, setThreshold] = useState("1000");
  const [rechargeAmount, setRechargeAmount] = useState("5000");
  const [isSavingRecharge, setIsSavingRecharge] = useState(false);
  const [hasSavedCard, setHasSavedCard] = useState(false);
  const [isRequestingUpgrade, setIsRequestingUpgrade] = useState(false);

  const [resolvedOrgId, setResolvedOrgId] = useState<number | null>(null);

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
    ]).then(([walletData, subData, txnData, usageData]) => {
      setWallet(walletData);
      setSubscription(subData);
      setTransactions(txnData.transactions || []);
      setUsage(usageData);
      
      setAutoRechargeEnabled(walletData.auto_recharge_enabled);
      setThreshold(String((walletData.auto_recharge_threshold_paise || 100000) / 100));
      setRechargeAmount(String((walletData.auto_recharge_amount_paise || 500000) / 100));
      setHasSavedCard(walletData.has_saved_card);
    }).catch(console.error);
  }, [resolvedOrgId]);

  const balanceRupees = wallet && typeof wallet.balance_paise === 'number' ? (wallet.balance_paise / 100).toFixed(2) : "0.00";
  const isZero = !wallet || wallet.balance_paise === 0 || wallet.balance_paise === undefined;
  const isLow = wallet?.balance_paise > 0 && wallet?.balance_paise < 50000;

  const handleTopup = async (isMock = false) => {
    if (!resolvedOrgId) return;
    const dograhOrgId = resolvedOrgId;
    const amount = parseInt(topupAmount);
    if (amount < minTopup) {
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
        setTopupAmount("");
        setIsProcessing(false);
        alert(isMock ? "Mock Top-Up Successful!" : "Wallet successfully topped up!");
        
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
          throw new Error(err.detail || "Mock bypass failed.");
        }
        const result = await confirmRes.json();
        await handleTopupSuccess(result.new_balance_paise);
        return;
      }

      if (!rzpKey) {
        alert("Razorpay key missing. Please configure your environment or use the Dev bypass.");
        setIsProcessing(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: order.amount_paise,
        currency: order.currency,
        name: "Talkar Wallet Top-Up",
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
        alert("Auto-recharge settings saved!");
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
        alert("Mock Card Added!");
        return;
      }

      const statusRes = await fetch(`${TALKAR}/customers/status?dograh_org_id=${dograhOrgId}`);
      const statusData = await statusRes.json();
      const rzpKey = statusData.razorpay_key_id;

      if (!rzpKey) {
        alert("Razorpay key missing.");
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: session.amount_paise,
        currency: "INR",
        name: "Save Card",
        description: "Verify card registration (refunded automatically)",
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
            alert("Card successfully registered for auto-recharge!");
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

  const handleUpgradeRequest = async (requestedTier: string, isMock = false) => {
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
        throw new Error(err.detail || "Failed to create upgrade order");
      }
      
      const order = await orderRes.json();
      
      if (order.status === "upgraded_from_wallet") {
        alert(`Successfully upgraded to ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)}!`);
        fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during upgrade");
    } finally {
      setIsRequestingUpgrade(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => filter === "all" || tx.type === filter);
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const currentTransactions = filteredTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 bg-background text-foreground pb-12">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/40">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Wallet & Billing</h1>
          <p className="text-xs text-muted-foreground">Manage call balances, configuration plan levels, and view historical deductions.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400 text-[10px] font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Secure Payments
        </div>
      </div>

      {/* Warning Alerts (Theme-Compliant) */}
      {isActivation && (
        <div className="border border-orange-500/20 bg-orange-500/10 dark:bg-orange-500/5 p-4 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300 text-orange-800 dark:text-orange-400">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-xs">Workspace Activation Pending</h3>
            <p className="text-xs opacity-90 mt-0.5">
              Add at least ₹2,000 to your wallet to activate your workspace and choose your call tier.
            </p>
          </div>
        </div>
      )}

      {isZero && !isActivation && (
        <div className="border border-rose-500/20 bg-rose-500/10 dark:bg-rose-500/5 p-4 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-300 text-rose-800 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-xs">Zero Wallet Balance — Operations Blocked</h3>
            <p className="text-xs opacity-90 mt-0.5">
              Your wallet balance is empty. All call routing services are blocked. Top up immediately to reactivate your lines.
            </p>
          </div>
        </div>
      )}

      {isLow && !isZero && (
        <div className="border border-orange-500/20 bg-orange-500/10 dark:bg-orange-500/5 p-4 rounded-lg flex items-start gap-3 text-orange-800 dark:text-orange-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-xs">Low Balance Warning</h3>
            <p className="text-xs opacity-90 mt-0.5">
              Your wallet is running low (under ₹500). Top up soon or enable auto-recharge to prevent calling service interruptions.
            </p>
          </div>
        </div>
      )}

      {/* Top Grid: Balance Hero & Topup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Balance Display */}
        <div className="bg-card border border-border/50 rounded-lg p-5 flex flex-col justify-between shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Current Balance
            </div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight pt-1">
              ₹{balanceRupees}
            </div>
          </div>
          
          {usage && (
            <div className="text-xs text-muted-foreground border-t border-border/30 pt-3 mt-4 leading-relaxed">
              Current month: <span className="text-foreground font-semibold">{usage.total_minutes} mins</span> spent (₹{(usage.total_spend_paise / 100).toFixed(2)})
            </div>
          )}
        </div>

        {/* Add Credits Panel */}
        <div className="md:col-span-2 bg-card border border-border/50 rounded-lg p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Add Credits</h2>
            <p className="text-muted-foreground text-xs">Top up securely via cards, netbanking, or UPI payments.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[2000, 5000, 10000].map(amt => (
              <button 
                key={amt}
                type="button"
                onClick={() => setTopupAmount(amt.toString())}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                  topupAmount === amt.toString() 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border/80 hover:bg-accent text-foreground"
                }`}
              >
                ₹{amt.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
              <Input 
                type="number" 
                min={minTopup.toString()}
                className="h-10 bg-background border-border text-foreground rounded-md focus:border-primary px-6 text-xs transition-all w-full" 
                placeholder={`Custom amount (minimum ₹${minTopup})`}
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={() => handleTopup(false)} disabled={!topupAmount || parseInt(topupAmount) < minTopup || isProcessing} className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-md h-10 px-4 text-xs font-semibold shadow-xs">
                {isProcessing ? "Processing..." : "Add Credits"}
              </Button>
              {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                <Button variant="outline" onClick={() => handleTopup(true)} disabled={!topupAmount || parseInt(topupAmount) < minTopup || isProcessing} className="border-border/80 hover:bg-accent text-foreground rounded-md h-10 text-xs">
                  Bypass (Dev)
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Auto-Recharge & Active Plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Auto Recharge Card */}
        <div className="bg-card border border-border/50 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
                Auto-Recharge
              </h2>
              <p className="text-muted-foreground text-xs">Keep calling services active when credits are low.</p>
            </div>
            <Switch checked={autoRechargeEnabled} onCheckedChange={setAutoRechargeEnabled} />
          </div>

          {autoRechargeEnabled && (
            <div className="space-y-4 pt-4 border-t border-border/30 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trigger threshold</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                    <Input type="number" className="h-9 bg-background border-border text-foreground rounded-md focus:border-primary px-6 text-xs" value={threshold} onChange={e => setThreshold(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top-up size</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                    <Input type="number" className="h-9 bg-background border-border text-foreground rounded-md focus:border-primary px-6 text-xs" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} />
                  </div>
                </div>
              </div>

              {hasSavedCard ? (
                <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-lg flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Card on File Enabled
                  </span>
                  <button type="button" onClick={() => handleAddCard(false)} className="text-[9px] hover:underline uppercase tracking-wider font-bold">Update</button>
                </div>
              ) : (
                <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-lg flex items-center justify-between text-xs text-orange-700 dark:text-orange-400 gap-4">
                  <span className="font-semibold">Payment method required</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddCard(false)} className="bg-primary text-primary-foreground hover:bg-primary/95 text-[9px] font-bold rounded px-2.5 py-0.5">Save Card</Button>
                    {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                      <Button size="sm" variant="ghost" onClick={() => handleAddCard(true)} className="text-zinc-500 text-[9px] p-0 h-auto">Dev Bypass</Button>
                    )}
                  </div>
                </div>
              )}
              
              <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border/50 rounded-md h-9 text-xs font-semibold" onClick={handleSaveAutoRecharge} disabled={isSavingRecharge}>
                 {isSavingRecharge ? "Saving Parameters..." : "Save Settings"}
              </Button>
            </div>
          )}
        </div>

        {/* Current Tier Info */}
        <div className="bg-card border border-border/50 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <ReceiptText className="w-4 h-4 text-primary" />
              Active Voice Tier
            </h2>
            <p className="text-muted-foreground text-xs">The current usage configuration plan active on your workspace.</p>
          </div>

          {subscription && subscription.status !== "not_provisioned" ? (
            <div className="space-y-4 border-t border-border/30 pt-4 mt-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/30">
                <div>
                  <span className="text-[9px] text-muted-foreground block uppercase font-mono tracking-wider">Active Engine</span>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {subscription.tier === "pro" ? "NeuralVocal Pro" :
                     subscription.tier === "elite" ? "Apex Omni Prime" :
                     "Echo-Lite Engine"}
                  </p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  {subscription.tier || "Starter"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-semibold">Usage Rate</span>
                  <p className="font-bold text-foreground mt-0.5">₹{subscription.per_minute_rate_paise ? (subscription.per_minute_rate_paise / 100).toFixed(2) : "25.00"} / min</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-semibold">Active Channels</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {subscription.tier === "pro" ? "10 call lines" : subscription.tier === "elite" ? "50 call lines" : "2 call lines"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Plan routing credentials loaded.
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Plan Options */}
      <div className="bg-card border border-border/50 rounded-lg p-5 shadow-2xs space-y-6">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <ReceiptText className="w-4 h-4 text-primary" />
            Change Call Tier
          </h2>
          <p className="text-muted-foreground text-xs">Upgrade your call rate and capacity configurations.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border border-border/50 bg-background rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-foreground text-sm">NeuralVocal Pro Engine</h3>
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">Recommended Engine</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400 font-mono">
                ₹4 / min
              </span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">Emotive vocal structures designed for client calls, clinical routes, and outbound campaigns.</p>
            <ul className="space-y-1 text-xs text-foreground/90">
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>10 active concurrent call lines</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Includes 2 phone lines</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 justify-end pt-4 border-t border-border/30">
          {subscription?.tier !== 'starter' && (
            <Button onClick={() => handleUpgradeRequest('starter')} disabled={isRequestingUpgrade} variant="outline" className="border-border/80 hover:bg-accent text-foreground rounded-md h-9 px-4 text-xs font-semibold">
              Switch to Starter
            </Button>
          )}
          {subscription?.tier !== 'pro' && (
            <>
              <Button onClick={() => handleUpgradeRequest('pro')} disabled={isRequestingUpgrade} variant="secondary" className="rounded-md h-9 px-4 text-xs font-semibold">
                Switch to Pro
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Transaction History Card */}
      <div className="bg-card border border-border/50 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Deduction Ledger</h2>
            <p className="text-muted-foreground text-xs">Audit log of payments, deposits, and call deductions.</p>
          </div>
          <select 
            className="h-9 w-[180px] rounded-md border border-border bg-background px-3 py-1.5 text-xs shadow-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All Ledgers</option>
            <option value="top_up">Deposits</option>
            <option value="call_deduction">Call Usage</option>
            <option value="refund">Refunds</option>
            <option value="grant">Grants</option>
          </select>
        </div>

        <div className="overflow-hidden border border-border/40 rounded-lg bg-background">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider py-3 px-4">Timestamp</TableHead>
                <TableHead className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider py-3 px-4">Description</TableHead>
                <TableHead className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider py-3 px-4 text-right">Transaction Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.map(tx => (
                <TableRow key={tx.id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                  <TableCell className="text-foreground text-xs py-3 px-4">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-foreground text-xs py-3 px-4">{tx.description}</TableCell>
                  <TableCell className={`text-right font-bold text-xs py-3 px-4 ${tx.amount_paise > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {tx.amount_paise > 0 ? "+" : ""}₹{(Math.abs(tx.amount_paise) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              {currentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-8">
                    No records found matching the selection.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-border/80 hover:bg-accent text-foreground rounded text-xs"
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground px-2">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border-border/80 hover:bg-accent text-foreground rounded text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
