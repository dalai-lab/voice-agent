"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Wallet, AlertCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useAppConfig } from "@/context/AppConfigContext";


interface WalletData {
  balance_paise: number;
  auto_recharge_enabled: boolean;
}

export default function TalkarBillingPage() {
  const { user } = useAuth();
  const { config } = useAppConfig();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(1000); // Default ₹1000

  // The organization_id is how Talkar links to this Dograh customer
  const orgId = (user as any)?.organizationId || (user as any)?.organization_id;

  useEffect(() => {
    if (!orgId) return;
    
    // Fetch wallet info from Talkar backend
    const fetchWallet = async () => {
      try {
        const res = await fetch(`http://localhost:8001/billing/wallet/by-org/${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setWallet(data);
        }
      } catch (err) {
        console.error("Failed to fetch Talkar wallet", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, [orgId]);

  const handleTopUp = async () => {
    try {
      const res = await fetch(`http://localhost:8001/billing/topup/by-org/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dograh_org_id: orgId, amount_rupees: amount })
      });
      const data = await res.json();
      
      const options = {
        key: "rzp_test_12345", // Talkar Razorpay Key
        amount: data.amount_paise,
        currency: "INR",
        name: "Talkar Wallet Top-Up",
        order_id: data.razorpay_order_id,
        handler: function (response: any) {
          // On success, refresh wallet
          window.location.reload();
        },
      };
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();
    } catch (err) {
      console.error("Top up failed", err);
    }
  };

  if (loading) return <div className="p-8">Loading wallet...</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Billing & Wallet</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prepaid Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              ₹{wallet ? (wallet.balance_paise / 100).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Available credits for voice calls.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4 md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Add Credits</CardTitle>
          <CardDescription>Top up your wallet to ensure uninterrupted service.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <span className="text-xl">₹</span>
            <input 
              type="number" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="500"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Minimum amount is ₹500.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleTopUp} className="w-full">
            <CreditCard className="mr-2 h-4 w-4" /> Top Up Now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
