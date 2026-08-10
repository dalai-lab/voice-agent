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

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [subscription, setSubscription] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [threshold, setThreshold] = useState("1000");
  const [rechargeAmount, setRechargeAmount] = useState("5000");

  const TALKAR_API = process.env.NEXT_PUBLIC_TALKAR_API_URL || "http://localhost:8001";

  useEffect(() => {
    // In a real app, we'd fetch this from Talkar's API passing the dograh org id or user token
    // For now, setting up the UI structure as specified in Phase 5C
    setWallet({ balance_paise: 0 }); // Mock starting with 0
    setSubscription({ plan: "Pro", monthly_fee: 15000, rate: 14, limit: 10, next_billing: "2026-09-01" });
    setTransactions([
      { id: 1, date: "2026-08-10", type: "top_up", desc: "Razorpay Top-up", amount: 5000, balance: 5000 },
      { id: 2, date: "2026-08-11", type: "call_deduction", desc: "Call Cost (12m)", amount: -168, balance: 4832 }
    ]);
  }, []);

  const balanceRupees = wallet ? (wallet.balance_paise / 100).toFixed(2) : "0.00";
  const isZero = wallet?.balance_paise === 0;
  const isLow = wallet?.balance_paise > 0 && wallet?.balance_paise < 50000; // < 500 rupees

  const handleTopup = () => {
    const amount = parseInt(topupAmount);
    if (amount < 500) {
      alert("Minimum top-up is ₹500");
      return;
    }
    alert(`Initiating Razorpay checkout for ₹${amount}...`);
    // Hits POST /billing/topup/create-order
  };

  const filteredTransactions = transactions.filter(tx => filter === "all" || tx.type === filter);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Wallet & Credits</h1>
        <p className="text-muted-foreground mt-2">Manage your Talkar balance, auto-recharge, and billing history.</p>
      </div>

      {isZero && (
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
                  min="500"
                  className="pl-8" 
                  placeholder="Custom amount (min 500)"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                />
              </div>
              <Button onClick={handleTopup} disabled={!topupAmount || parseInt(topupAmount) < 500}>
                <Plus className="w-4 h-4 mr-2" />
                Add Credits
              </Button>
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
                <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-background rounded border flex items-center justify-center text-xs font-bold">VISA</div>
                    <span className="text-sm">Ending in 4242</span>
                  </div>
                  <Button variant="ghost" size="sm">Update Card</Button>
                </div>
                <Button className="w-full">Save Settings</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Current Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5" />
              Subscription Plan
            </CardTitle>
            <CardDescription>Your monthly Talkar plan details.</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-xl font-bold">{subscription.plan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Monthly Fee</p>
                    <p className="text-xl font-bold">₹{subscription.monthly_fee.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Per-Minute Rate</p>
                    <p className="font-medium">₹{subscription.rate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Concurrent Limit</p>
                    <p className="font-medium">{subscription.limit} active calls</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Next Billing Date</p>
                    <p className="font-medium">{subscription.next_billing}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.date}</TableCell>
                  <TableCell>{tx.desc}</TableCell>
                  <TableCell className={`text-right ${tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">₹{tx.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {currentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
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
