"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";

export default function SupportPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = (user as any)?.primaryEmail || (user as any)?.email;

  useEffect(() => {
    if (email) fetchRequests();
  }, [email]);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/talkar/customers/support-requests?contact_email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !subject || !description || !email) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/talkar/customers/support-requests?contact_email=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject, description })
      });
      if (res.ok) {
        setType("");
        setSubject("");
        setDescription("");
        alert("Support request submitted successfully.");
        fetchRequests();
      } else {
        alert("Failed to submit request.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Requests</h1>
        <p className="text-muted-foreground mt-2">Submit a request to build a new agent, add phone numbers, or get help.</p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">New Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_agent">Build New Agent</SelectItem>
                <SelectItem value="modify_agent">Modify Existing Agent</SelectItem>
                <SelectItem value="add_phone">Add/Assign Phone Number</SelectItem>
                <SelectItem value="billing">Billing Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Provide details about what you need..." 
              rows={5} 
              required 
            />
          </div>
          <Button type="submit" disabled={isSubmitting || !type || !subject || !description}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Requests</h2>
        {loading ? (
          <p>Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-muted-foreground border p-8 text-center rounded-lg bg-muted/20">No support requests yet.</p>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="border p-4 rounded-lg bg-card">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{req.subject}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    req.status === 'resolved' || req.status === 'closed' ? 'bg-green-100 text-green-800' :
                    req.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {req.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Type: {req.type.replace('_', ' ')} • {new Date(req.created_at).toLocaleDateString()}</p>
                <p className="text-sm whitespace-pre-wrap">{req.description}</p>
                {req.admin_note && (
                  <div className="mt-4 p-3 bg-muted rounded-md border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Note:</p>
                    <p className="text-sm">{req.admin_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
