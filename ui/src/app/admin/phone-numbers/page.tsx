"use client";

import React, { useState, useEffect } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminPhoneNumbersPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [assignedNumber, setAssignedNumber] = useState("");
  const [fulfilling, setFulfilling] = useState(false);

  const TALKAR_API = "/api/talkar";

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // GET /admin/phone-number-requests returns all requests
      const res = await fetch(`${TALKAR_API}/admin/phone-number-requests`);
      if (res.ok) {
        const data = await res.json();
        // Backend returns a plain array of PhoneNumberRequest rows
        setRequests(Array.isArray(data) ? data.filter((r: any) => r.status === 'pending') : []);
      }
    } catch (err) {
      console.error("Failed to fetch phone number requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleFulfill = async () => {
    if (!selectedRequest || !assignedNumber.trim()) {
      alert("Please enter the assigned phone number.");
      return;
    }
    
    setFulfilling(true);
    try {
      // PATCH /admin/phone-number-requests/{id}/approve with { numbers: [assignedNumber] }
      const res = await fetch(`${TALKAR_API}/admin/phone-number-requests/${selectedRequest.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: [assignedNumber.trim()] })
      });
      if (res.ok) {
        alert("Request fulfilled successfully!");
        setSelectedRequest(null);
        setAssignedNumber("");
        fetchRequests();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Fulfillment failed: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error fulfilling request.");
    } finally {
      setFulfilling(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone Number Requests</h1>
          <p className="text-muted-foreground mt-2">Manage customer requests for dedicated phone numbers.</p>
        </div>
        <Button onClick={fetchRequests} variant="outline">Refresh</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Org ID</TableHead>
                <TableHead>Requested Count</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Loading requests...</TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No pending requests found.</TableCell>
                </TableRow>
              ) : (
                requests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.dograh_org_id}</TableCell>
                    <TableCell>{req.requested_count}</TableCell>
                    <TableCell className="capitalize">{req.number_type}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {req.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedRequest(req)}>
                        Fulfill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fulfillment Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null);
          setAssignedNumber("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Phone Number Request</DialogTitle>
            <DialogDescription>
              Provision a number in your provider (e.g. Twilio/Vonage) and assign it to this customer's organization.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div><span className="font-semibold text-muted-foreground">Org ID:</span> <br/>{selectedRequest.dograh_org_id}</div>
                <div><span className="font-semibold text-muted-foreground">Type:</span> <br/><span className="capitalize">{selectedRequest.number_type}</span></div>
                <div><span className="font-semibold text-muted-foreground">Requested Count:</span> <br/>{selectedRequest.requested_count}</div>
                <div><span className="font-semibold text-muted-foreground">Request Date:</span> <br/>{new Date(selectedRequest.created_at).toLocaleDateString()}</div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Assigned Phone Number</Label>
                <Input 
                  type="text" 
                  value={assignedNumber} 
                  onChange={e => setAssignedNumber(e.target.value)} 
                  placeholder="e.g. +1234567890"
                />
                <p className="text-xs text-muted-foreground">Enter the full E.164 formatted number you provisioned for them.</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setAssignedNumber("");
            }}>Cancel</Button>
            <Button onClick={handleFulfill} disabled={!assignedNumber.trim() || fulfilling}>
              {fulfilling ? "Fulfilling..." : "Complete Fulfillment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
