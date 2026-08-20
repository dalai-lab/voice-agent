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
  const minTopup = isActivation ? 2000 : 500;
  const TALKAR = "/api/talkar";

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  
  const [topupAmount, setTopupAmount] = useState<string>(isActivation ? "2000" : "");
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
        setWallet((prev: any) => ({ ...prev, balance_paise: result.new_balance_paise }));
        setTopupAmount("");
        setIsProcessing(false);
        alert("Mock Top-Up Successful!");
        fetch(`${TALKAR}/billing/transactions/by-org/${dograhOrgId}?limit=100`)
          .then(r => r.json())
          .then(data => setTransactions(data.transactions || []));
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
          setWallet((prev: any) => ({ ...prev, balance_paise: result.new_balance_paise }));
          setTopupAmount("");
          setIsProcessing(false);
          alert("Wallet successfully topped up!");
          
          fetch(`${TALKAR}/billing/transactions/by-org/${dograhOrgId}?limit=100`)
            .then(r => r.json())
            .then(data => setTransactions(data.transactions || []));
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
    
    const minDeposits: Record<string, number> = { "pro": 10000, "elite": 25000 };
    const requiredAmount = minDeposits[requestedTier] || 0;
    
    if (requiredAmount > 0) {
      if (!confirm(`To unlock the ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)} tier, a minimum deposit of ₹${requiredAmount} is required. This entire amount will be added to your wallet for call usage. Proceed?`)) {
        return;
      }
    }

    setIsRequestingUpgrade(true);
    try {
      const orderRes = await fetch(`${TALKAR}/billing/upgrade/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dograh_org_id: dograhOrgId, requested_tier: requestedTier })
      });
      
      if (!orderRes.ok) {
        if (requestedTier === 'starter') {
          const res = await fetch(`${TALKAR}/customers/by-org/${dograhOrgId}/request-tier-upgrade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requested_tier: requestedTier })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Failed to switch to starter tier");
          }
          alert("Your tier has been successfully updated!");
          fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
          setIsRequestingUpgrade(false);
          return;
        }
        const err = await orderRes.json();
        throw new Error(err.detail || "Failed to create upgrade order");
      }
      
      const order = await orderRes.json();
      
      if (order.status === "upgraded_from_wallet") {
        alert(`Successfully upgraded to ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)} using your existing wallet balance!`);
        fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
        setIsRequestingUpgrade(false);
        return;
      }
      
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
            requested_tier: requestedTier
          })
        });
        if (!confirmRes.ok) {
            const err = await confirmRes.json().catch(() => ({}));
            throw new Error(err.detail || "Mock bypass failed.");
        }
        const result = await confirmRes.json();
        setWallet((prev: any) => ({ ...prev, balance_paise: result.new_balance_paise }));
        fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
        setIsRequestingUpgrade(false);
        alert(`Successfully deposited ₹${requiredAmount} and upgraded to ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)}!`);
        return;
      }

      const statusRes = await fetch(`${TALKAR}/customers/status?dograh_org_id=${dograhOrgId}`);
      const statusData = await statusRes.json();
      const rzpKey = statusData.razorpay_key_id;

      if (!rzpKey) {
        alert("Razorpay key missing. Please configure your environment or use the Dev bypass.");
        setIsRequestingUpgrade(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: order.amount_paise,
        currency: order.currency,
        name: `Talkar Upgrade — ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)}`,
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
              requested_tier: requestedTier
            })
          });
          if (confirmRes.ok) {
            const result = await confirmRes.json();
            setWallet((prev: any) => ({ ...prev, balance_paise: result.new_balance_paise }));
            fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
            alert(`Upgrade successful! Your account is now in ${requestedTier.toUpperCase()} tier.`);
          }
          setIsRequestingUpgrade(false);
        },
        modal: {
          ondismiss: () => {
             setIsRequestingUpgrade(false);
          }
        },
        prefill: {
          name: (user as any)?.name || "",
          email: (user as any)?.email || "",
        }
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during upgrade");
      setIsRequestingUpgrade(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => filter === "all" || tx.type === filter);
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const currentTransactions = filteredTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="dark min-h-screen bg-[#090A0F] text-zinc-100 relative overflow-x-hidden font-sans pb-12">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="absolute inset-0 hero-bg pointer-events-none -z-10" />
      <div className="absolute inset-0 hero-stripe-pattern pointer-events-none -z-10" />
      
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-6 pt-12 space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Wallet & Billing</h1>
            <p className="text-zinc-400 text-sm">Manage call balances, configuration plan levels, and view historical deductions.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/5 text-orange-400 text-[10px] font-semibold uppercase tracking-wider badge-glow">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Secure Payments
          </div>
        </div>

        {/* Warning Alerts (Restyled to Premium Glow Callouts) */}
        {isActivation && (
          <div className="border border-orange-500/30 bg-orange-500/10 p-5 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
            <ShieldCheck className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm">Workspace Activation Pending</h3>
              <p className="text-zinc-300 text-xs mt-1 leading-relaxed">
                Add at least ₹2,000 to your wallet to activate your workspace and choose your call tier.
              </p>
            </div>
          </div>
        )}

        {isZero && !isActivation && (
          <div className="border border-rose-500/30 bg-rose-500/10 p-5 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
            <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm">Zero Wallet Balance — Operations Blocked</h3>
              <p className="text-zinc-300 text-xs mt-1 leading-relaxed">
                Your wallet balance is empty. All call routing services are blocked. Top up immediately to reactivate your lines.
              </p>
            </div>
          </div>
        )}

        {isLow && !isZero && (
          <div className="border border-orange-500/20 bg-orange-500/5 p-5 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm">Low Balance Warning</h3>
              <p className="text-zinc-300 text-xs mt-1 leading-relaxed">
                Your wallet is running low (under ₹500). Top up soon or enable auto-recharge to prevent calling service interruptions.
              </p>
            </div>
          </div>
        )}

        {/* Top Grid: Balance Hero & Topup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Balance Display */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col justify-between backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                <CreditCard className="w-4 h-4 text-orange-500" />
                Current Balance
              </div>
              <div className="text-5xl font-extrabold text-white tracking-tight pt-2">
                ₹{balanceRupees}
              </div>
            </div>
            
            {usage && (
              <div className="text-xs text-zinc-400 border-t border-white/5 pt-4 mt-6 leading-relaxed">
                Current month: <span className="text-zinc-200 font-semibold">{usage.total_minutes} mins</span> spent (₹{(usage.total_spend_paise / 100).toFixed(2)})
              </div>
            )}
          </div>

          {/* Add Credits Panel */}
          <div className="md:col-span-2 bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Add Credits</h2>
              <p className="text-zinc-400 text-xs mt-1">Top up securely via cards, netbanking, or UPI payments.</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[2000, 5000, 10000].map(amt => (
                <button 
                  key={amt}
                  type="button"
                  onClick={() => setTopupAmount(amt.toString())}
                  className={`px-5 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                    topupAmount === amt.toString() 
                      ? "border-orange-500 bg-orange-500/10 text-orange-400 badge-glow" 
                      : "border-white/10 hover:border-white/20 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                <Input 
                  type="number" 
                  min={minTopup.toString()}
                  className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-8 text-sm transition-all" 
                  placeholder={`Custom amount (minimum ₹${minTopup})`}
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => handleTopup(false)} disabled={!topupAmount || parseInt(topupAmount) < minTopup || isProcessing} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-6 font-bold shadow-lg shadow-orange-500/10">
                  {isProcessing ? "Processing..." : "Add Credits"}
                </Button>
                {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                  <Button variant="outline" onClick={() => handleTopup(true)} disabled={!topupAmount || parseInt(topupAmount) < minTopup || isProcessing} className="border-white/10 hover:bg-white/5 text-zinc-300 rounded-xl h-12">
                    Bypass (Dev)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Grid: Auto-Recharge & Active Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Auto Recharge Card */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-orange-500 animate-pulse" />
                  Auto-Recharge
                </h2>
                <p className="text-zinc-400 text-xs mt-1">Keep calling services active when credits are low.</p>
              </div>
              <Switch checked={autoRechargeEnabled} onCheckedChange={setAutoRechargeEnabled} className="data-[state=checked]:bg-orange-500" />
            </div>

            {autoRechargeEnabled && (
              <div className="space-y-6 pt-6 border-t border-white/5 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Trigger threshold</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <Input type="number" className="h-10 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 px-6 text-xs" value={threshold} onChange={e => setThreshold(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top-up size</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <Input type="number" className="h-10 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 px-6 text-xs" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} />
                    </div>
                  </div>
                </div>

                {hasSavedCard ? (
                  <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-2">
                      <Check className="w-4 h-4" /> Card on File Enabled
                    </span>
                    <button type="button" onClick={() => handleAddCard(false)} className="text-[10px] text-zinc-400 hover:text-white uppercase tracking-wider font-bold">Update</button>
                  </div>
                ) : (
                  <div className="p-4 border border-orange-500/25 bg-orange-500/5 rounded-2xl flex items-center justify-between text-xs gap-4">
                    <span className="text-orange-400 font-semibold">Payment method required</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAddCard(false)} className="bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 text-[10px] font-bold rounded-lg px-3 py-1">Save Card</Button>
                      {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                        <Button size="sm" variant="ghost" onClick={() => handleAddCard(true)} className="text-zinc-500 text-[10px]">Dev Bypass</Button>
                      )}
                    </div>
                  </div>
                )}
                
                <Button className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl h-11 text-xs font-semibold" onClick={handleSaveAutoRecharge} disabled={isSavingRecharge}>
                   {isSavingRecharge ? "Saving Parameters..." : "Save Settings"}
                </Button>
              </div>
            )}
          </div>

          {/* Current Tier Info */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-orange-500" />
                Active Voice Tier
              </h2>
              <p className="text-zinc-400 text-xs">The current usage configuration plan active on your workspace.</p>
            </div>

            {subscription && subscription.status !== "not_provisioned" ? (
              <div className="space-y-4 border-t border-white/5 pt-6 mt-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">Active Engine</span>
                    <p className="text-lg font-bold text-white mt-0.5">
                      {subscription.tier === "pro" ? "NeuralVocal Pro" :
                       subscription.tier === "elite" ? "Apex Omni Prime" :
                       "Echo-Lite Engine"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 uppercase tracking-wider badge-glow">
                    {subscription.tier || "Starter"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Usage Rate</span>
                    <p className="font-bold text-zinc-200 mt-0.5">₹{subscription.per_minute_rate_paise ? (subscription.per_minute_rate_paise / 100).toFixed(2) : "25.00"} / min</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Active Channels</span>
                    <p className="font-bold text-zinc-200 mt-0.5">
                      {subscription.tier === "pro" ? "10 call lines" : subscription.tier === "elite" ? "50 call lines" : "2 call lines"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Plan routing credentials loaded.
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Plan Options */}
        <div className="bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-8">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-orange-500" />
              Change Call Tier
            </h2>
            <p className="text-zinc-400 text-xs mt-1">Upgrade your call rate and capacity configurations.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-base">NeuralVocal Pro Engine</h3>
                  <p className="text-xs text-orange-400 font-semibold mt-0.5">Recommended Engine</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/10 text-orange-400 font-mono">
                  ₹18 / min
                </span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">Emotive vocal structures designed for client calls, clinical routes, and outbound campaigns.</p>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>10 active concurrent call lines</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Includes 2 phone lines</span>
                </li>
              </ul>
            </div>

            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-base">Apex Omni Prime Engine</h3>
                  <p className="text-xs text-rose-400 font-semibold mt-0.5">Enterprise Tier</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-400 font-mono">
                  ₹12 / min
                </span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">Maximum call volumes running on isolated dedicated virtual compute clusters.</p>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>50 active concurrent call lines</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Custom brand voice cloning support</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end pt-6 border-t border-white/5">
            {subscription?.tier !== 'starter' && (
              <Button onClick={() => handleUpgradeRequest('starter')} disabled={isRequestingUpgrade} variant="outline" className="border-white/10 hover:bg-white/5 text-zinc-300 rounded-xl h-11 px-5 text-xs font-semibold">
                Switch to Starter
              </Button>
            )}
            {subscription?.tier !== 'pro' && (
              <>
                <Button onClick={() => handleUpgradeRequest('pro')} disabled={isRequestingUpgrade} className="bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl h-11 px-5 text-xs font-semibold">
                  Switch to Pro
                </Button>
                {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                  <Button onClick={() => handleUpgradeRequest('pro', true)} variant="ghost" size="sm" disabled={isRequestingUpgrade} className="text-zinc-500 text-[10px]">
                    Bypass Pro (Dev)
                  </Button>
                )}
              </>
            )}
            {subscription?.tier !== 'elite' && (
              <>
                <Button onClick={() => handleUpgradeRequest('elite')} disabled={isRequestingUpgrade} className="bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white rounded-xl h-11 px-6 text-xs font-bold shadow-lg shadow-orange-500/10">
                  Switch to Elite
                </Button>
                {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                  <Button onClick={() => handleUpgradeRequest('elite', true)} variant="ghost" size="sm" disabled={isRequestingUpgrade} className="text-zinc-500 text-[10px]">
                    Bypass Elite (Dev)
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Transaction History Card */}
        <div className="bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Deduction Ledger</h2>
              <p className="text-zinc-400 text-xs mt-1">Audit log of payments, deposits, and call deductions.</p>
            </div>
            <select 
              className="h-10 w-[200px] rounded-xl border border-white/10 bg-zinc-950/80 px-4 text-xs shadow-sm text-zinc-300 focus:outline-none focus:border-orange-500 transition-colors"
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

          <div className="overflow-hidden border border-white/5 rounded-2xl bg-black/20">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider py-4 px-6">Timestamp</TableHead>
                  <TableHead className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider py-4 px-6">Description</TableHead>
                  <TableHead className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider py-4 px-6 text-right">Transaction Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTransactions.map(tx => (
                  <TableRow key={tx.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                    <TableCell className="text-zinc-300 text-xs py-4 px-6">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-zinc-300 text-xs py-4 px-6">{tx.description}</TableCell>
                    <TableCell className={`text-right font-bold text-xs py-4 px-6 ${tx.amount_paise > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.amount_paise > 0 ? "+" : ""}₹{(Math.abs(tx.amount_paise) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {currentTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-zinc-500 text-xs py-10">
                      No records found matching the selection.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-white/10 text-zinc-300 hover:bg-white/5 rounded-lg text-xs"
              >
                Previous
              </Button>
              <div className="text-xs text-zinc-400 px-2">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="border-white/10 text-zinc-300 hover:bg-white/5 rounded-lg text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
