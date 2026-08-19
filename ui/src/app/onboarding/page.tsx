"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Clock, CheckCircle, XCircle, Ban, UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { LocalUser } from "@/lib/auth/types";
import { useOrgConfig } from "@/context/OrgConfigContext";
import Script from "next/script";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending_approval");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<{ gst: number, reg: number }>({ gst: 0, reg: 0 });
  // Track which orgId we last checked so we re-fire on workspace switch but ignore same-org double-fires
  const lastCheckedOrgRef = useRef<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    gstNumber: "",
    pocName: "",
    pocPhone: "",
    useCaseType: "both",
    useCaseDescription: "",
    callVolume: "",
    languages: "",
    websiteUrl: "",
    companySize: "",
    pocDesignation: "",
    integrations: "",
    gstCertificateUrl: "",
    businessRegistrationUrl: "",
    needsApiIntegration: false,
    apiIntegrationDetails: "",
  });

  const email = (user as any)?.primaryEmail ?? (user as any)?.email;
  
  const TALKAR_API = "/api/talkar";

  useEffect(() => {
    if (!dograhOrgId) return;  // Wait for org context to resolve before checking
    if (lastCheckedOrgRef.current === dograhOrgId) return; // Already checked this exact org — skip

    // Mark this org as in-flight BEFORE any await to prevent double-fires from same-org re-renders.
    lastCheckedOrgRef.current = dograhOrgId;

    // Reset UI state for the new org
    setLoading(true);
    setStatus("pending_approval");
    setCustomerData(null);

    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch(`${TALKAR_API}/customers/status?dograh_org_id=${dograhOrgId}`);
        if (cancelled) return;

        if (res.status === 404) {
          // No Talkar customer for this org yet. Check if user already has another org (returning customer).
          if (email) {
            const existingRes = await fetch(`${TALKAR_API}/customers/existing?contact_email=${encodeURIComponent(email)}`);
            if (cancelled) return;
            if (existingRes.ok) {
              const existing = await existingRes.json();
              if (existing?.customer_id) {
                // Returning customer creating a new workspace — show the brief form
                if (!cancelled) {
                  setStatus("new_agent_brief");
                  setCustomerData({ master_customer_id: existing.customer_id, ...existing });
                }
                return;
              }
            }
          }
          // Brand new customer — show the full application form
          if (!cancelled) setStatus("pending_approval");
        } else if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            // Sub-orgs in "pending_approval" that already have their brief submitted
            // should see the "under review" screen, not the full application form.
            // Sub-orgs with no form (or only the _needs_brief tag) should see the brief form.
            let effectiveStatus = data.status;

            if (data.is_sub_org) {
              if (data.status === "pending_approval" && data.has_onboarding_form) {
                // Brief already submitted — show simple confirmation
                effectiveStatus = "brief_submitted";
              } else if (data.status === "pending_approval" && !data.has_onboarding_form) {
                // Sub-org was auto-created by workspace hook but hasn't filled brief yet
                effectiveStatus = "new_agent_brief";
              } else if (data.status === "agent_building" && !data.has_onboarding_form) {
                // Sub-org in agent_building (master was active at time of creation) but no brief
                effectiveStatus = "new_agent_brief";
              }
            }

            setStatus(effectiveStatus);
            setCustomerData(data);
            if (effectiveStatus === "active" || effectiveStatus === "pending_deposit" || effectiveStatus === "pending_plan_selection") {
              router.push("/overview");
            } else if (effectiveStatus === "agent_building") {
              // All agent_building orgs (master or sub) go to the dashboard — the
              // AppLayout banner handles the "being built" message there.
              router.push("/overview");
            } else if (effectiveStatus === "under_review" && !data.is_sub_org) {
              // Master org under review — send to overview (banner shown there, platform accessible)
              router.push("/overview");
            } else if (effectiveStatus === "brief_submitted") {
              // Sub-org brief submitted — head to dashboard, banner handles messaging
              router.push("/overview");
            } else if (effectiveStatus === "under_review" && data.is_sub_org) {
              // Sub-org still waiting on review — stay on /onboarding, fetch real form data
              if (!cancelled) {
                fetch(`${TALKAR_API}/customers/by-org/${dograhOrgId}`)
                  .then(r => r.ok ? r.json() : null)
                  .then(full => {
                    if (full && !cancelled) {
                      setCustomerData((prev: any) => ({ ...prev, onboarding_form: full.onboarding_form }));
                    }
                  })
                  .catch(() => {});
              }
            }
            // All other cases (new_agent_brief, rejected, suspended) render on this page
          }
        } else {
          if (!cancelled) setStatus("pending_approval");
        }
      } catch (err) {
        console.error("Failed to fetch onboarding status", err);
        if (!cancelled) setStatus("pending_approval");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    checkStatus();
    return () => { cancelled = true; };
  }, [router, dograhOrgId, email]);

  // No handleToggleBuildForMe anymore, always managed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields based on mode
    if (!formData.businessName.trim() || !formData.industry || !formData.gstNumber.trim()) {
      alert("Please fill in all required business information fields.");
      return;
    }
    if (!formData.pocName.trim() || !formData.pocPhone.trim()) {
      alert("Please fill in your contact name and phone number.");
      return;
    }
    if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
      alert("Please fill in all use case fields so we can build your agent correctly.");
      return;
    }

    if (formData.needsApiIntegration && !formData.apiIntegrationDetails.trim()) {
      alert("Please provide details for your custom API integration.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = customerData?.customer_id 
        ? `${TALKAR_API}/customers/${customerData.customer_id}/onboarding`
        : `${TALKAR_API}/customers/by-org/${dograhOrgId}/onboarding`;
        
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: formData, documents: [] })
      });
      if (res.ok) {
        setCustomerData((prev: any) => ({ ...prev, onboarding_form: formData } as any));
        setStatus("under_review");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to submit: ${err.detail || res.statusText}`);
      }
    } catch (err) {
      alert("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBrief = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
      alert("Please fill in all use case fields so we can build your agent correctly.");
      return;
    }
    if (formData.needsApiIntegration && !formData.apiIntegrationDetails.trim()) {
      alert("Please provide details for your custom API integration.");
      return;
    }

    setSubmitting(true);
    try {
      // customerData.customer_id is set when the sub-org record was auto-created by the
      // Dograh workspace hook (POST /customers/). In that case, use new-agent-brief to
      // update the existing record. Only use new-agent-request when there's truly no record.
      const endpoint = customerData?.customer_id
        ? `${TALKAR_API}/customers/by-org/${dograhOrgId}/new-agent-brief`
        : `${TALKAR_API}/customers/by-org/${dograhOrgId}/new-agent-request`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: formData, master_customer_id: customerData?.master_customer_id })
      });
      if (res.ok) {
        setCustomerData((prev: any) => ({ ...prev, onboarding_form: formData } as any));
        setStatus("brief_submitted");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to submit brief: ${err.detail || res.statusText}`);
      }
    } catch (err) {
      alert("Failed to submit brief. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaySetupFee = async () => {
    if (!customerData?.setup_fee_order_id || !customerData?.razorpay_key_id) {
      alert("Missing Razorpay order details. Please contact support.");
      return;
    }

    if (!(window as any).Razorpay) {
      alert("Payment gateway not loaded yet. Please try again in a moment.");
      return;
    }

    const options = {
      key: customerData.razorpay_key_id,
      amount: 100, // ₹1 (100 paise) — test amount
      currency: "INR",
      name: "Talkar Integration Fee",
      description: "One-time custom API integration fee",
      order_id: customerData.setup_fee_order_id,
      handler: async function (response: any) {
        // Verify payment server-side and trigger provisioning
        // This bypasses the need for a configured Razorpay webhook
        try {
          const res = await fetch(`${TALKAR_API}/billing/confirm-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (res.ok) {
            setStatus("agent_building");
          } else {
            const err = await res.json().catch(() => ({}));
            alert(`Payment confirmed but setup failed: ${err.detail || "Please contact support."}`);
          }
        } catch {
          alert("Payment received but could not reach server. Please refresh the page.");
        }
      },
      prefill: {
        name: formData.pocName || "Talkar Customer",
        contact: formData.pocPhone || "",
      },
      theme: { color: "#18181b" },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleMockSetupFee = async () => {
    if (!customerData?.setup_fee_order_id) return;
    try {
      const res = await fetch(`${TALKAR_API}/billing/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_payment_id: "mock_payment_id",
          razorpay_order_id: customerData.setup_fee_order_id,
          razorpay_signature: "mock_signature",
        }),
      });
      if (res.ok) {
        setStatus("agent_building");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Mock payment confirmed but setup failed: ${err.detail || "Error"}`);
      }
    } catch {
      alert("Mock payment failed to reach server.");
    }
  };

  const simulateUpload = (type: "gst" | "reg") => {
    setUploadProgress(prev => ({ ...prev, [type]: 10 }));
    let progress = 10;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        if (type === "gst") {
          setFormData(prev => ({ ...prev, gstCertificateUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }));
        } else {
          setFormData(prev => ({ ...prev, businessRegistrationUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }));
        }
      }
      setUploadProgress(prev => ({ ...prev, [type]: progress }));
    }, 200);
  };

  if (loading) {
    return <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">Loading account status...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Talkar</h1>
        <p className="text-muted-foreground mt-2">Your AI Voice Agent Platform</p>
      </div>

      {/* ── NEW AGENT BRIEF (Sub-org without form, OR returning customer with new workspace) ── */}
      {(status === "new_agent_brief" || (status === "agent_building" && customerData?.is_sub_org && !customerData?.has_onboarding_form)) && (
        <Card>
          <CardHeader>
            <CardTitle>Tell us about your new agent</CardTitle>
            <CardDescription>Give our experts a brief so we can build this workspace's agent to your exact specifications.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitBrief} className="space-y-8">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="useCaseType">Primary Function <span className="text-red-500">*</span></Label>
                    <Select value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">Inbound (Customer Support)</SelectItem>
                        <SelectItem value="outbound">Outbound (Sales/Follow-up)</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="callVolume">Monthly Call Volume <span className="text-red-500">*</span></Label>
                    <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                      <SelectTrigger><SelectValue placeholder="Select Volume" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<1000">Less than 1,000 mins</SelectItem>
                        <SelectItem value="1000-5000">1,000 - 5,000 mins</SelectItem>
                        <SelectItem value="5000-10000">5,000 - 10,000 mins</SelectItem>
                        <SelectItem value="10000+">10,000+ mins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="languages">Languages Required <span className="text-red-500">*</span></Label>
                  <Input id="languages" placeholder="e.g., English, Hindi, Spanish" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="useCaseDescription">Use Case Description <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="useCaseDescription"
                    placeholder="Describe exactly what this agent should do. E.g., 'Take restaurant reservations and check table availability...'"
                    value={formData.useCaseDescription}
                    onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="needsApiIntegration"
                    checked={formData.needsApiIntegration}
                    onCheckedChange={(checked) => setFormData({...formData, needsApiIntegration: checked})}
                  />
                  <Label htmlFor="needsApiIntegration">Yes, I need custom API integration for this agent</Label>
                </div>
                {formData.needsApiIntegration && (
                  <div className="space-y-2 mt-4 border-l-2 border-primary pl-4">
                    <Label htmlFor="apiIntegrationDetails">Describe the integration <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="apiIntegrationDetails"
                      placeholder="E.g., I need to pull customer records from my proprietary CRM via REST API..."
                      value={formData.apiIntegrationDetails}
                      onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Submitting Brief..." : "Submit Brief"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── BRIEF SUBMITTED: Sub-org brief sent, waiting for admin ── */}
      {status === "brief_submitted" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Request Received!
            </CardTitle>
            <CardDescription>
              Our team has been notified and will start building your new agent. We&apos;ll reach out within 24 hours.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* ── PENDING APPROVAL: Show the application form ── */}
      {status === "pending_approval" && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Application</CardTitle>
            <CardDescription>Tell us about your business to get started with Talkar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── 1. Business Information (always required) ── */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">1. Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
                    <Input id="businessName" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry <span className="text-red-500">*</span></Label>
                    <Select required onValueChange={val => setFormData({...formData, industry: val})}>
                      <SelectTrigger><SelectValue placeholder="Select Industry" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Hospitality">Hospitality</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number <span className="text-red-500">*</span></Label>
                    <Input id="gstNumber" required value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Select onValueChange={val => setFormData({...formData, companySize: val})}>
                      <SelectTrigger><SelectValue placeholder="Select Size" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1–10 employees</SelectItem>
                        <SelectItem value="11-50">11–50 employees</SelectItem>
                        <SelectItem value="51-200">51–200 employees</SelectItem>
                        <SelectItem value="200+">200+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="websiteUrl">Website URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input id="websiteUrl" type="url" placeholder="https://..." value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* ── 2. Point of Contact (always required) ── */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">2. Point of Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pocName">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="pocName" required value={formData.pocName} onChange={e => setFormData({...formData, pocName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pocPhone">Phone Number <span className="text-red-500">*</span></Label>
                    <Input id="pocPhone" type="tel" required value={formData.pocPhone} onChange={e => setFormData({...formData, pocPhone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pocDesignation">Designation <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input id="pocDesignation" placeholder="e.g. CTO, Operations Head" value={formData.pocDesignation} onChange={e => setFormData({...formData, pocDesignation: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* ── 3. Use Case Details ── */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">3. Tell Us About Your Agent</h3>
                <p className="text-sm text-muted-foreground">Help our team build the perfect agent for your business.</p>

                  <div className="space-y-3">
                    <Label>Agent Type <span className="text-red-500">*</span></Label>
                    <RadioGroup defaultValue="both" onValueChange={val => setFormData({...formData, useCaseType: val})} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inbound" id="inbound" />
                        <Label htmlFor="inbound">Inbound</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="outbound" id="outbound" />
                        <Label htmlFor="outbound">Outbound</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both">Both</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCaseDescription">Describe your use case <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="useCaseDescription"
                      placeholder="E.g., We need an agent to answer patient queries and book appointments in Hindi and English..."
                      value={formData.useCaseDescription}
                      onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="callVolume">Expected Monthly Volume <span className="text-red-500">*</span></Label>
                      <Select onValueChange={val => setFormData({...formData, callVolume: val})}>
                        <SelectTrigger><SelectValue placeholder="Select Volume" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<100">Less than 100 calls</SelectItem>
                          <SelectItem value="100-500">100–500 calls</SelectItem>
                          <SelectItem value="500-2000">500–2,000 calls</SelectItem>
                          <SelectItem value="2000+">2,000+ calls</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="languages">Languages Needed <span className="text-red-500">*</span></Label>
                      <Input id="languages" placeholder="Hindi, English, Hinglish..." value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="integrations">Existing Tools to Integrate <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input id="integrations" placeholder="E.g., HubSpot CRM, Google Calendar, WhatsApp" value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} />
                    </div>
                  </div>
              </div>

              {/* ── 4. Custom API Integration ── */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">4. Custom API Integration</h3>
                <p className="text-sm text-muted-foreground">Do you need your AI agent to integrate with a custom internal tool, proprietary API, or custom webhook? (If yes, we will quote a custom integration fee).</p>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="needsApiIntegration" 
                    checked={formData.needsApiIntegration} 
                    onCheckedChange={val => setFormData({...formData, needsApiIntegration: val})}
                  />
                  <Label htmlFor="needsApiIntegration">Yes, I need custom API integration</Label>
                </div>
                {formData.needsApiIntegration && (
                  <div className="space-y-2 mt-4 border-l-2 border-primary pl-4">
                    <Label htmlFor="apiIntegrationDetails">Describe the integration <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="apiIntegrationDetails"
                      placeholder="E.g., I need to pull customer records from my proprietary CRM via REST API..."
                      value={formData.apiIntegrationDetails}
                      onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* ── 5. Documents ── */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">
                  5. Documents <span className="text-muted-foreground text-sm font-normal">(optional — speeds up verification)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); simulateUpload("gst"); }}
                  >
                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">GST Certificate</p>
                    <p className="text-xs text-muted-foreground">PDF or Image</p>
                    <Input type="file" className="mt-4" onChange={() => simulateUpload("gst")} />
                    {uploadProgress.gst > 0 && (
                      <div className="w-full mt-4 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress.gst}%` }} />
                      </div>
                    )}
                  </div>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); simulateUpload("reg"); }}
                  >
                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Business Registration</p>
                    <p className="text-xs text-muted-foreground">PDF or Image</p>
                    <Input type="file" className="mt-4" onChange={() => simulateUpload("reg")} />
                    {uploadProgress.reg > 0 && (
                      <div className="w-full mt-4 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress.reg}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── UNDER REVIEW ── */}
      {status === "under_review" && (
        <Card className="py-8">
          <CardContent className="space-y-8">
            <div className="text-center space-y-4">
              <Clock className="w-16 h-16 text-blue-500 mx-auto" />
              <h2 className="text-2xl font-bold">Application under review.</h2>
              <p className="text-muted-foreground">We'll notify you within 48 hours. <a href="mailto:support@talkar.ai" className="text-blue-600 hover:underline">Need changes? Contact us</a></p>
            </div>
            <div className="border-t pt-8 px-4 md:px-8">
              <h3 className="text-lg font-medium mb-4">Submitted Details</h3>
              <div className="opacity-70 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Business:</span><br />{customerData?.onboarding_form?.businessName || "N/A"}</div>
                <div><span className="text-muted-foreground">Industry:</span><br />{customerData?.onboarding_form?.industry || "N/A"}</div>
                <div><span className="text-muted-foreground">GST:</span><br />{customerData?.onboarding_form?.gstNumber || "N/A"}</div>
                <div><span className="text-muted-foreground">Contact:</span><br />{customerData?.onboarding_form?.pocName || "N/A"} · {customerData?.onboarding_form?.pocPhone || "N/A"}</div>
                <div className="md:col-span-2"><span className="text-muted-foreground">Custom API Integration:</span><br />
                  {customerData?.onboarding_form?.needsApiIntegration ? "Yes — " + customerData?.onboarding_form?.apiIntegrationDetails : "No"}
                </div>
                <div className="md:col-span-2"><span className="text-muted-foreground">Use Case:</span><br />{customerData?.onboarding_form?.useCaseDescription || "N/A"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── APPROVED: Pay integration fee ── */}
      {status === "approved" && (
        <Card className="text-center py-12 border-green-500/30 bg-green-500/5">
          <CardContent className="space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Integration Fee Quoted</h2>
            <p className="text-muted-foreground text-sm">We have approved your application and quoted a one-time fee for your custom API integration. Complete the payment to begin development.</p>
            <div className="flex gap-4 justify-center mt-4">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={handlePaySetupFee}>
                Pay Integration Fee
              </Button>
              {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                <Button onClick={handleMockSetupFee} variant="secondary" size="lg">
                  Bypass Payment (Dev)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* ── REJECTED ── */}
      {status === "rejected" && (
        <Card className="text-center py-12 border-red-500/30 bg-red-500/5">
          <CardContent className="space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Application Not Approved</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              <span className="font-medium text-foreground">{customerData?.rejection_reason || "Did not meet requirements."}</span>
            </p>
            <div className="pt-4 text-sm font-medium">
              Reapply after 30 days ({customerData?.reapply_countdown || "29d 14h"})
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SUSPENDED ── */}
      {status === "suspended" && (
        <Card className="text-center py-12 border-red-500/30 bg-red-500/5">
          <CardContent className="space-y-4">
            <Ban className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Account Suspended</h2>
            <p className="text-muted-foreground">Your account has been suspended due to low wallet balance.</p>
            <div className="font-bold text-xl my-4">Balance: ₹{customerData?.wallet_balance ? (customerData.wallet_balance / 100).toFixed(2) : "0.00"}</div>
            <Button size="lg" onClick={() => router.push("/wallet")}>
              Add Credits to Reactivate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
