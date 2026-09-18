"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  LifeBuoy, 
  Lightbulb, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Mail, 
  MessageSquare, 
  Sparkles,
  Inbox,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";

interface SupportRequest {
  id: number;
  type: string;
  subject: string;
  description: string;
  status: string;
  admin_note?: string;
  resolved_by?: string;
  created_at?: string;
  resolved_at?: string;
}

function SupportContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;

  const [activeTab, setActiveTab] = useState<"support" | "feature" | "history">(
    initialType === "feature" ? "feature" : "support"
  );

  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Support Form State
  const [supportCategory, setSupportCategory] = useState("technical");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [supportPriority, setSupportPriority] = useState("medium");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Feature Form State
  const [featureCategory, setFeatureCategory] = useState("voice_llm");
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);

  useEffect(() => {
    if (initialType === "feature") {
      setActiveTab("feature");
    } else if (initialType === "support") {
      setActiveTab("support");
    }
  }, [initialType]);

  const fetchRequests = async () => {
    if (!dograhOrgId) return;
    try {
      setLoadingRequests(true);
      const res = await fetch(`/api/talkar/customers/support-requests?dograh_org_id=${dograhOrgId}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch requests", e);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [dograhOrgId]);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dograhOrgId) {
      toast.error("Organization context not found. Please refresh.");
      return;
    }
    if (!supportSubject.trim() || !supportDescription.trim()) {
      toast.error("Please provide both a subject and description.");
      return;
    }

    setIsSubmittingSupport(true);
    try {
      const res = await fetch(`/api/talkar/customers/support-requests?dograh_org_id=${dograhOrgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "support",
          category: supportCategory,
          subject: supportSubject.trim(),
          description: supportDescription.trim(),
          priority: supportPriority
        })
      });

      if (res.ok) {
        toast.success("Support ticket submitted! Our team will review it shortly.");
        setSupportSubject("");
        setSupportDescription("");
        fetchRequests();
        setActiveTab("history");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to submit support request.");
      }
    } catch {
      toast.error("Network error while submitting request.");
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dograhOrgId) {
      toast.error("Organization context not found. Please refresh.");
      return;
    }
    if (!featureTitle.trim() || !featureDescription.trim()) {
      toast.error("Please provide both a feature title and description.");
      return;
    }

    setIsSubmittingFeature(true);
    try {
      const res = await fetch(`/api/talkar/customers/support-requests?dograh_org_id=${dograhOrgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "feature_request",
          category: featureCategory,
          subject: featureTitle.trim(),
          description: featureDescription.trim()
        })
      });

      if (res.ok) {
        toast.success("Feature request submitted! Thank you for helping shape Talkar.");
        setFeatureTitle("");
        setFeatureDescription("");
        fetchRequests();
        setActiveTab("history");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to submit feature request.");
      }
    } catch {
      toast.error("Network error while submitting request.");
    } finally {
      setIsSubmittingFeature(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 bg-background text-foreground">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <LifeBuoy className="w-7 h-7 text-indigo-400" />
            Help & Requests
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Submit a support ticket, propose new features, or track the status of your existing requests.
          </p>
        </div>

        {/* Email Direct Fallback Pill */}
        <a
          href="mailto:it@4thorbit.in"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-card border border-border hover:border-indigo-500/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all group shadow-xs w-fit"
        >
          <Mail className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>Prefer email? <strong className="text-foreground">it@4thorbit.in</strong></span>
          <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/60 gap-2">
        <button
          onClick={() => setActiveTab("support")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "support"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          Contact Support
        </button>

        <button
          onClick={() => setActiveTab("feature")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "feature"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Feature Requests
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "history"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Inbox className="w-4 h-4" />
          My Requests
          {requests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CONTACT SUPPORT */}
      {activeTab === "support" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-border bg-card rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-indigo-400" />
                Submit a Support Ticket
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Our support engineers typically respond within a few hours.
              </p>
            </div>

            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Category</Label>
                  <Select value={supportCategory} onValueChange={setSupportCategory}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue / Bug</SelectItem>
                      <SelectItem value="agent_modification">Agent Prompt / Persona Change</SelectItem>
                      <SelectItem value="phone_number">Phone Number Setup</SelectItem>
                      <SelectItem value="billing">Billing & Balance</SelectItem>
                      <SelectItem value="general">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Priority</Label>
                  <Select value={supportPriority} onValueChange={setSupportPriority}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (General guidance)</SelectItem>
                      <SelectItem value="medium">Medium (Standard request)</SelectItem>
                      <SelectItem value="high">High (Impacting production calls)</SelectItem>
                      <SelectItem value="urgent">Urgent (Service outage)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Subject</Label>
                <Input
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  placeholder="e.g. Agent is pausing too long before answering"
                  className="h-9 text-xs bg-background border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Description</Label>
                <Textarea
                  value={supportDescription}
                  onChange={(e) => setSupportDescription(e.target.value)}
                  placeholder="Describe the issue, phone numbers involved, expected behavior, and any timestamps if applicable..."
                  className="min-h-[140px] text-xs bg-background border-border resize-y"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingSupport || !supportSubject.trim() || !supportDescription.trim()}
                  className="h-9 px-5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isSubmittingSupport ? "Submitting..." : "Send Ticket"}
                </Button>
              </div>
            </form>
          </div>

          {/* Side Info Box */}
          <div className="space-y-4">
            <div className="border border-border bg-card rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-400" />
                Direct Email Support
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need to attach logs, recordings, or screenshots? Feel free to email our team directly:
              </p>
              <div className="p-3 bg-background border border-border/80 rounded-lg">
                <a
                  href="mailto:it@4thorbit.in"
                  className="text-xs font-mono text-indigo-400 hover:underline block break-all"
                >
                  it@4thorbit.in
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground/80">
                Please mention your organization and company name for faster response times.
              </p>
            </div>

            <div className="border border-border bg-card rounded-xl p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Support Hours
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Standard Support: Mon – Fri, 9:00 AM – 7:00 PM IST. Urgent production outage tickets are monitored 24/7.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEATURE REQUESTS */}
      {activeTab === "feature" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-border bg-card rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Submit a Feature Request
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tell us what features or voice AI capabilities your business needs. We review every submission!
              </p>
            </div>

            <form onSubmit={handleFeatureSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Target Area</Label>
                <Select value={featureCategory} onValueChange={setFeatureCategory}>
                  <SelectTrigger className="h-9 text-xs bg-background border-border">
                    <SelectValue placeholder="Select target area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voice_llm">Voice & Language Models</SelectItem>
                    <SelectItem value="telephony">Telephony & Phone Numbers</SelectItem>
                    <SelectItem value="crm_integrations">CRM & Webhook Integrations</SelectItem>
                    <SelectItem value="analytics">Call Analytics & Reporting</SelectItem>
                    <SelectItem value="dashboard">Dashboard & Workflow UI</SelectItem>
                    <SelectItem value="other">Other Innovation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Feature Title</Label>
                <Input
                  value={featureTitle}
                  onChange={(e) => setFeatureTitle(e.target.value)}
                  placeholder="e.g. WhatsApp follow-up summary after call completion"
                  className="h-9 text-xs bg-background border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Problem & Use Case</Label>
                <Textarea
                  value={featureDescription}
                  onChange={(e) => setFeatureDescription(e.target.value)}
                  placeholder="Describe how this feature will help your team, your current workaround, and the expected outcome..."
                  className="min-h-[140px] text-xs bg-background border-border resize-y"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingFeature || !featureTitle.trim() || !featureDescription.trim()}
                  className="h-9 px-5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {isSubmittingFeature ? "Submitting..." : "Submit Feature"}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="border border-border bg-card rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-purple-400" />
                How We Review Requests
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our product and engineering teams review feature submissions weekly. If approved, status updates and implementation timelines will appear in your <strong>My Requests</strong> tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY REQUESTS & HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Inbox className="w-4 h-4 text-indigo-400" />
              Your Submitted Requests
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
              disabled={loadingRequests}
              className="text-xs h-8 border-border"
            >
              Refresh
            </Button>
          </div>

          {loadingRequests ? (
            <div className="border border-border bg-card rounded-xl p-12 text-center text-xs text-muted-foreground space-y-2">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading your requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="border border-dashed border-border/80 bg-card/50 rounded-xl p-12 text-center space-y-3">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No requests submitted yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Need help with your voice agent or want to propose an enhancement? Submit a ticket using the tabs above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="border border-border bg-card rounded-xl p-5 shadow-xs hover:border-border/80 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        #{req.id}
                      </span>
                      <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {req.type.replace("_", " ")}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">{req.subject}</h3>
                    </div>
                    <div>{getStatusBadge(req.status)}</div>
                  </div>

                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {req.description}
                  </p>

                  {/* Admin Note / Response */}
                  {req.admin_note && (
                    <div className="mt-3 p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Talkar Team Response
                        {req.resolved_by && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            (from {req.resolved_by})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {req.admin_note}
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground/60 pt-1 flex items-center justify-between">
                    <span>
                      Submitted: {req.created_at ? new Date(req.created_at).toLocaleString() : "Recently"}
                    </span>
                    {req.resolved_at && (
                      <span>Updated: {new Date(req.resolved_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading help center...</div>}>
      <SupportContent />
    </Suspense>
  );
}
