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
import { Textarea } from "@/components/ui/textarea";

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  
  // Approval state
  const [integrationFee, setIntegrationFee] = useState("0");
  const [integrationDescription, setIntegrationDescription] = useState("");
  
  // Rejection state
  const [rejectionReason, setRejectionReason] = useState("");
  const [reapplyDays, setReapplyDays] = useState("30");

  const TALKAR_API = "/api/talkar";

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // GET /admin/applications returns under_review customers as a plain array
      const res = await fetch(`${TALKAR_API}/admin/applications`, {
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        // Backend returns a plain array directly
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch applications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      const feePaise = parseInt(integrationFee) * 100;
      const res = await fetch(`${TALKAR_API}/admin/applications/${selectedApp.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          integration_fee_paise: feePaise,
          integration_description: integrationDescription 
        })
      });
      if (res.ok) {
        alert("Application approved!");
        setSelectedApp(null);
        fetchApplications();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Approval failed: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error approving application.");
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    try {
      const res = await fetch(`${TALKAR_API}/admin/applications/${selectedApp.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reason: rejectionReason,
          reapply_countdown_days: parseInt(reapplyDays)
        })
      });
      if (res.ok) {
        alert("Application rejected.");
        setSelectedApp(null);
        fetchApplications();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Rejection failed: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Error rejecting application.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Applications</h1>
          <p className="text-muted-foreground mt-2">Review and approve new Talkar customer applications.</p>
        </div>
        <Button onClick={fetchApplications} variant="outline">Refresh</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>API Integration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Loading applications...</TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No pending applications found.</TableCell>
                </TableRow>
              ) : (
                applications.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {app.onboarding_form?.businessName}
                      <div className="text-xs text-muted-foreground">{app.onboarding_form?.industry}</div>
                    </TableCell>
                    <TableCell>
                      {app.onboarding_form?.pocName}
                      <div className="text-xs text-muted-foreground">{app.onboarding_form?.pocPhone}</div>
                    </TableCell>
                    <TableCell>
                      {app.onboarding_form?.needsApiIntegration ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Requested
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {app.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedApp({ ...app, mode: 'view' })}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review details and quote a custom API integration fee if applicable.
            </DialogDescription>
          </DialogHeader>
          
          {selectedApp && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div><span className="font-semibold text-muted-foreground">Business:</span> <br/>{selectedApp.onboarding_form?.businessName}</div>
                <div><span className="font-semibold text-muted-foreground">Industry:</span> <br/>{selectedApp.onboarding_form?.industry}</div>
                <div><span className="font-semibold text-muted-foreground">GST:</span> <br/>{selectedApp.onboarding_form?.gstNumber}</div>
                <div><span className="font-semibold text-muted-foreground">Volume:</span> <br/>{selectedApp.onboarding_form?.callVolume} calls/mo</div>
                <div className="col-span-2"><span className="font-semibold text-muted-foreground">Use Case:</span> <br/>{selectedApp.onboarding_form?.useCaseDescription}</div>
                
                {selectedApp.onboarding_form?.needsApiIntegration && (
                  <div className="col-span-2 border-l-2 border-primary pl-4 mt-2">
                    <span className="font-semibold text-primary">Custom API Integration Requested:</span> <br/>
                    <div className="mt-1 bg-background p-2 rounded border">
                      {selectedApp.onboarding_form?.apiIntegrationDetails}
                    </div>
                  </div>
                )}
              </div>

              {selectedApp.mode === 'view' && (
                <div className="flex gap-4 pt-4 border-t">
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setSelectedApp({ ...selectedApp, mode: 'approve' })}>Approve Application</Button>
                  <Button className="w-full" variant="destructive" onClick={() => setSelectedApp({ ...selectedApp, mode: 'reject' })}>Reject Application</Button>
                </div>
              )}

              {selectedApp.mode === 'approve' && (
                <div className="space-y-4 pt-4 border-t animate-in fade-in">
                  <h3 className="font-bold text-lg">Approve & Quote Integration</h3>
                  <div className="space-y-2">
                    <Label>Custom Integration Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={integrationFee} 
                      onChange={e => setIntegrationFee(e.target.value)} 
                      placeholder="0 for no fee"
                    />
                    <p className="text-xs text-muted-foreground">If they requested custom API integration, quote the setup fee here. Otherwise leave as 0.</p>
                  </div>
                  {parseInt(integrationFee) > 0 && (
                    <div className="space-y-2">
                      <Label>Integration Description</Label>
                      <Textarea 
                        value={integrationDescription} 
                        onChange={e => setIntegrationDescription(e.target.value)} 
                        placeholder="E.g., HubSpot CRM webhook integration + Custom reporting pipeline..."
                      />
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleApprove}>Confirm Approval</Button>
                    <Button variant="outline" onClick={() => setSelectedApp({ ...selectedApp, mode: 'view' })}>Cancel</Button>
                  </div>
                </div>
              )}

              {selectedApp.mode === 'reject' && (
                <div className="space-y-4 pt-4 border-t animate-in fade-in">
                  <h3 className="font-bold text-lg text-red-600">Reject Application</h3>
                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <Textarea 
                      value={rejectionReason} 
                      onChange={e => setRejectionReason(e.target.value)} 
                      placeholder="E.g., Use case not supported at this time."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reapply Countdown (Days)</Label>
                    <Input 
                      type="number" 
                      value={reapplyDays} 
                      onChange={e => setReapplyDays(e.target.value)} 
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button className="w-full" variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
                    <Button variant="outline" onClick={() => setSelectedApp({ ...selectedApp, mode: 'view' })}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
