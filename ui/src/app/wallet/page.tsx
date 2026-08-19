"use client";

import React, { useState, useEffect } from "react";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { AlertTriangle, Plus, CreditCard, ReceiptText, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { LocalUser } from "@/lib/auth/types";
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

    // Use the Dograh numeric org ID from OrgConfigContext (authoritative source)
    if (orgContext?.organization_id) {
      setResolvedOrgId(orgContext.organization_id);
      return;
    }

    // Legacy email fallback for users without an org_id
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
      // 1. Create top-up order
      const orderRes = await fetch(`${TALKAR}/billing/topup/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dograh_org_id: dograhOrgId, amount_rupees: amount })
      });
      const order = await orderRes.json();
      
      if (!order.razorpay_order_id) {
        throw new Error(order.detail || "Failed to create order");
      }
      
      // 2. Get Razorpay key
      const statusRes = await fetch(`${TALKAR}/customers/status?dograh_org_id=${dograhOrgId}`);
      const statusData = await statusRes.json();
      const rzpKey = statusData.razorpay_key_id;

      // MOCK MODE: Manual bypass
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
          throw new Error(err.detail || "Mock bypass failed. (Are you on production with a Razorpay Secret set?)");
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

      // 3. Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: order.amount_paise,
        currency: order.currency,
        name: "Talkar Wallet Top-Up",
        order_id: order.razorpay_order_id,
        handler: async (response: any) => {
          // 4. Confirm payment
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
          // Update state smoothly
          setWallet((prev: any) => ({ ...prev, balance_paise: result.new_balance_paise }));
          setTopupAmount("");
          setIsProcessing(false);
          alert("Wallet successfully topped up!");
          
          // Refresh transactions
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
      // 1. Create Razorpay customer
      const custRes = await fetch(`${TALKAR}/billing/razorpay-customer/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          dograh_org_id: dograhOrgId, 
          name: (user as any)?.name || (user as any)?.displayName, 
          email: (user as any)?.email || (user as any)?.primaryEmail 
        })
      });
      const { razorpay_customer_id } = await custRes.json();
      
      // 2. Get Razorpay key
      const statusRes = await fetch(`${TALKAR}/customers/status?dograh_org_id=${dograhOrgId}`);
      const statusData = await statusRes.json();
      const rzpKey = statusData.razorpay_key_id;

      // MOCK MODE: Manual bypass
      if (isMock) {
        const saveRes = await fetch(`${TALKAR}/billing/save-card`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dograh_org_id: dograhOrgId,
            razorpay_payment_method_id: "mock_payment_method_id",
          })
        });
        if (saveRes.ok) {
          setHasSavedCard(true);
          alert("Mock Card successfully saved for auto-recharge!");
        } else {
          alert("Failed to save mock card token.");
        }
        return;
      }

      if (!rzpKey) {
        alert("Razorpay key missing. Please configure your environment or use the Dev bypass.");
        return;
      }

      // 3. Open Razorpay checkout in recurring mode
      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: 100,  // ₹1 authorization — Razorpay does not support amount:0 for checkout. Refundable.
        currency: "INR",
        name: "Talkar — Save Card for Auto-Recharge",
        customer_id: razorpay_customer_id,
        recurring: "1",
        handler: async (response: any) => {
          try {
            const saveRes = await fetch(`${TALKAR}/billing/save-card`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dograh_org_id: dograhOrgId,
                razorpay_payment_method_id: response.razorpay_payment_id,
              })
            });
            if (saveRes.ok) {
              setHasSavedCard(true);
              alert("Card successfully saved for auto-recharge!");
            } else {
              alert("Failed to save card token.");
            }
          } catch (e) {
            alert("Card save failed. Please try again.");
          }
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
      // 1. Create upgrade order
      const orderRes = await fetch(`${TALKAR}/billing/upgrade/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dograh_org_id: dograhOrgId, requested_tier: requestedTier })
      });
      
      if (!orderRes.ok) {
        // If it's starter, we just use the old instant request flow since there's no deposit
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
      
      // If the user already had enough wallet balance, the server processed it instantly
      if (order.status === "upgraded_from_wallet") {
        alert(`Successfully upgraded to ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)} using your existing wallet balance!`);
        fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
        setIsRequestingUpgrade(false);
        return;
      }
      
      // MOCK MODE BYPASS
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
            throw new Error(err.detail || "Mock bypass failed. (Are you on production with a Razorpay Secret set?)");
        }
        const result = await confirmRes.json();
        setWallet((prev: any) => ({ ...prev, balance_paise: result.new_balance_paise }));
        fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
        setIsRequestingUpgrade(false);
        alert(`Successfully deposited ₹${requiredAmount} and upgraded to ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)}!`);
        return;
      }

      // 2. Get Razorpay key
      const statusRes = await fetch(`${TALKAR}/customers/status?dograh_org_id=${dograhOrgId}`);
      const statusData = await statusRes.json();
      const rzpKey = statusData.razorpay_key_id;

      if (!rzpKey) {
        alert("Razorpay key missing. Please configure your environment or use the Dev bypass.");
        setIsRequestingUpgrade(false);
        return;
      }

      // 3. Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: order.amount_paise,
        currency: order.currency,
        name: `Talkar Upgrade — ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)}`,
        order_id: order.razorpay_order_id,
        handler: async (response: any) => {
          // 4. Confirm payment & apply upgrade
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
          if (!confirmRes.ok) {
            const err = await confirmRes.json().catch(() => ({}));
            throw new Error(err.detail || "Failed to confirm upgrade on server");
          }
          const result = await confirmRes.json();
          setWallet((prev: any) => ({ ...prev, balance_paise: result.new_balance_paise }));
          
          fetch(`${TALKAR}/billing/subscription/by-org/${dograhOrgId}`).then(r => r.json()).then(setSubscription);
          setIsRequestingUpgrade(false);
          alert(`Successfully deposited ₹${requiredAmount} and upgraded to ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)}!`);
        },
        modal: {
          ondismiss: () => {
             setIsRequestingUpgrade(false);
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
      alert(err.message || "Failed to switch tier");
      setIsRequestingUpgrade(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => filter === "all" || tx.type === filter);
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const currentTransactions = filteredTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Wallet & Credits</h1>
        <p className="text-muted-foreground mt-2">Manage your Talkar balance, auto-recharge, and billing history.</p>
      </div>

      {isActivation && (
        <div className="bg-blue-500/15 border border-blue-500/50 rounded-lg p-4 flex items-start gap-4 mb-6">
          <ShieldCheck className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-600 dark:text-blue-400">Activate Your Agent</h3>
            <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1">
              Add a minimum of ₹2000 to your wallet to activate your agent and select a usage tier.
            </p>
          </div>
        </div>
      )}

      {isZero && !isActivation && (
        <div className="bg-red-500/15 border border-red-500/50 rounded-lg p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-600 dark:text-red-400">Zero Balance — Calls Blocked</h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
              Your wallet balance is ₹0. All inbound and outbound calls are currently blocked. Please add credits immediately to resume service.
            </p>
          </div>
        </div>
      )}

      {isLow && !isZero && (
        <div className="bg-yellow-500/15 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">Low Balance Warning</h3>
            <p className="text-sm text-yellow-700/80 dark:text-yellow-400/80 mt-1">
              Your wallet balance is below ₹500. We recommend topping up to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Balance Hero Card */}
        <Card className="col-span-1 md:col-span-1 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-foreground">
              ₹{balanceRupees}
            </div>
            {usage && (
               <div className="mt-4 text-sm text-muted-foreground">
                 Usage this month: {usage.total_minutes} mins (₹{(usage.total_spend_paise / 100).toFixed(2)})
               </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Top-up Panel */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Add Credits</CardTitle>
            <CardDescription>Top up your wallet via UPI, Card, or Netbanking.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              {[2000, 5000, 10000].map(amt => (
                <Button 
                  key={amt} 
                  variant={topupAmount === amt.toString() ? "default" : "outline"}
                  onClick={() => setTopupAmount(amt.toString())}
                >
                  ₹{amt.toLocaleString()}
                </Button>
              ))}
            </div>
            <div className="flex gap-4 max-w-md">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input 
                  type="number" 
                  min={minTopup.toString()}
                  className="pl-8" 
                  placeholder={`Custom amount (min ${minTopup})`}
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={() => handleTopup(false)} disabled={!topupAmount || parseInt(topupAmount) < minTopup || isProcessing}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isProcessing ? "Processing..." : "Add Credits"}
                </Button>
                <Button variant="secondary" onClick={() => handleTopup(true)} disabled={!topupAmount || parseInt(topupAmount) < minTopup || isProcessing}>
                  Bypass (Dev)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Auto-recharge Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Auto-Recharge
            </CardTitle>
            <CardDescription>Never run out of balance unexpectedly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Auto-Recharge</p>
                <p className="text-sm text-muted-foreground">Automatically add credits when balance drops.</p>
              </div>
              <Switch checked={autoRechargeEnabled} onCheckedChange={setAutoRechargeEnabled} />
            </div>

            {autoRechargeEnabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recharge when below</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input type="number" className="pl-8" value={threshold} onChange={e => setThreshold(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Add amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input type="number" className="pl-8" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} />
                    </div>
                  </div>
                </div>
                {hasSavedCard ? (
                  <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium">Card on File (Active)</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleAddCard(false)}>Update Card</Button>
                      {process.env.NODE_ENV !== 'production' && (
                        <Button variant="ghost" size="sm" onClick={() => handleAddCard(true)}>Bypass (Dev)</Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">No card saved</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" onClick={() => handleAddCard(false)}>Add Card</Button>
                      {process.env.NODE_ENV !== 'production' && (
                        <Button variant="secondary" size="sm" onClick={() => handleAddCard(true)}>Bypass (Dev)</Button>
                      )}
                    </div>
                  </div>
                )}
                <Button className="w-full" onClick={handleSaveAutoRecharge} disabled={isSavingRecharge}>
                   {isSavingRecharge ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Current Tier Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-purple-400" />
              Active AI Voice Engine
            </CardTitle>
            <CardDescription>Your account's assigned neural model architecture.</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription && subscription.status !== "not_provisioned" ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Current Engine</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">
                      {subscription.tier === "pro" ? "Talkar NeuralVocal Pro v2" :
                       subscription.tier === "elite" ? "Talkar Apex Omni Prime" :
                       "Talkar Echo-Lite 1.0"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase tracking-wider">
                    {subscription.tier || "Starter"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Per-Minute Rate</p>
                    <p className="font-semibold text-foreground">₹{subscription.per_minute_rate_paise ? (subscription.per_minute_rate_paise / 100).toFixed(2) : "25.00"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Concurrency</p>
                    <p className="font-semibold text-foreground">
                      {subscription.tier === "pro" ? "10 Calls" : subscription.tier === "elite" ? "50 Calls" : "2 Calls"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>Tier information unavailable or setup in progress.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Upgrade Tier Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5" />
            Upgrade Tier
          </CardTitle>
          <CardDescription>Request an upgrade to access better rates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 border border-purple-500/30 bg-purple-500/5 rounded-lg space-y-3 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Talkar NeuralVocal Pro v2</h3>
                  <p className="text-xs text-purple-400 font-medium">Pro Tier Engine</p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  ₹18 / min
                </span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">Human-grade emotive voice synthesis with ~250ms latency & 10 channels.</p>
              <ul className="space-y-1.5 text-xs text-foreground/90">
                <li>• <b>ElevenLabs Flash v2.5</b> + GPT-4o</li>
                <li>• 10 Concurrent Call Channels</li>
                <li>• 2 Free Phone Numbers Included</li>
              </ul>
            </div>
            <div className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg space-y-3 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Talkar Apex Omni Prime</h3>
                  <p className="text-xs text-amber-400 font-medium">Elite Tier Engine</p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  ₹12 / min
                </span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">Enterprise low-latency cluster with custom voice clone & 50 channels.</p>
              <ul className="space-y-1.5 text-xs text-foreground/90">
                <li>• <b>Dedicated Compute Instance</b> (~180ms latency)</li>
                <li>• 50 Concurrent Call Capacity</li>
                <li>• 5 Free Phone Numbers + Voice Cloning</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {subscription?.tier !== 'starter' && (
              <Button onClick={() => handleUpgradeRequest('starter')} disabled={isRequestingUpgrade} variant="outline">
                Switch to Starter
              </Button>
            )}
            {subscription?.tier !== 'pro' && (
              <>
                <Button onClick={() => handleUpgradeRequest('pro')} disabled={isRequestingUpgrade} variant={subscription?.tier === 'elite' ? "outline" : "secondary"}>
                  Switch to Pro
                </Button>
                {process.env.NODE_ENV !== 'production' && (
                  <Button onClick={() => handleUpgradeRequest('pro', true)} variant="ghost" size="sm" disabled={isRequestingUpgrade}>
                    Dev Bypass (Pro)
                  </Button>
                )}
              </>
            )}
            {subscription?.tier !== 'elite' && (
              <>
                <Button onClick={() => handleUpgradeRequest('elite')} disabled={isRequestingUpgrade}>
                  Switch to Elite
                </Button>
                {process.env.NODE_ENV !== 'production' && (
                  <Button onClick={() => handleUpgradeRequest('elite', true)} variant="ghost" size="sm" disabled={isRequestingUpgrade}>
                    Dev Bypass (Elite)
                  </Button>
                )}
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* 4. Transaction History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Recent wallet activity and call deductions.</CardDescription>
          </div>
          <div className="flex gap-2">
            <select 
              className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Transactions</option>
              <option value="top_up">Top-ups</option>
              <option value="call_deduction">Call Deductions</option>
              <option value="refund">Refunds</option>
              <option value="grant">Grants</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell className={`text-right ${tx.amount_paise > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {tx.amount_paise > 0 ? "+" : ""}₹{(Math.abs(tx.amount_paise) / 100).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {currentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
