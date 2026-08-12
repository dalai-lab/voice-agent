"use client";

import React, { useState, useEffect, use } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const TALKAR_API = "/api/talkar";
  const customerId = resolvedParams.id;

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      // In a real app we'd fetch the specific customer. 
      // For now we'll fetch all and filter, or assume an endpoint exists.
      const res = await fetch(`${TALKAR_API}/admin/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
        if (data.subscription?.tier) {
          setSelectedTier(data.subscription.tier);
        }
      } else {
        // Fallback for demo if endpoint doesn't exist directly
        console.warn("Failed to fetch customer directly");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleUpdateTier = async () => {
    setUpdating(true);
    try {
      // PATCH /admin/customers/{id} with { tier: selectedTier }
      const res = await fetch(`${TALKAR_API}/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier })
      });
      if (res.ok) {
        alert("Tier updated successfully!");
        fetchCustomer();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update tier: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error updating tier.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
        <p className="text-muted-foreground mt-2">Manage settings and overrides for customer {customerId}.</p>
      </div>

      {loading ? (
        <Card className="py-12"><CardContent className="text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dograh Org ID</p>
                  <p className="font-medium">{customer?.dograh_org_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{customer?.status || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Tier Override</CardTitle>
              <CardDescription>Force a specific usage tier for this customer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label>Usage Tier</Label>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateTier} disabled={!selectedTier || updating || selectedTier === customer?.subscription?.tier}>
                {updating ? "Updating..." : "Update Tier"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
