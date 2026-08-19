"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, Clock, UploadCloud, Building2, User, Bot, Wrench, Shield, 
  ArrowRight, ArrowLeft, Sparkles, FileText, Check, CreditCard, ChevronRight, HelpCircle
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";

const TALKAR_API = "/api/talkar";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { orgContext } = useOrgConfig();
  const dograhOrgId = orgContext?.organization_id;
  const email = (user as any)?.primaryEmail ?? (user as any)?.email;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("pending_approval");
  const [customerData, setCustomerData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State — Preserving ALL original fields
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    gstNumber: "",
    companySize: "",
    websiteUrl: "",
    pocName: "",
    pocPhone: "",
    pocDesignation: "",
    useCaseType: "both",
    useCaseDescription: "",
    callVolume: "",
    languages: "English, Hindi",
    integrations: "",
    needsApiIntegration: false,
    apiIntegrationDetails: "",
    gstCertificateUrl: "",
    businessRegistrationUrl: "",
  });

  // Step Wizards
  const [activeStep, setActiveStep] = useState(1); // 1..4 for main onboarding
  const [briefStep, setBriefStep] = useState(1);   // 1..2 for 2nd agent brief

  // Upload Progress State
  const [uploadProgress, setUploadProgress] = useState({ gst: 0, reg: 0 });

  useEffect(() => {
    if (!dograhOrgId && !email) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      try {
        let url = `${TALKAR_API}/customers/status?`;
        if (dograhOrgId) url += `dograh_org_id=${dograhOrgId}`;
        else url += `contact_email=${encodeURIComponent(email)}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setCustomerData(data);
          setStatus(data.status);

          if (data.onboarding_form) {
            setFormData(prev => ({ ...prev, ...data.onboarding_form }));
          }

          if (data.status === "active") {
            router.push("/overview");
          } else if (data.status === "agent_building" && !data.has_onboarding_form) {
            setStatus("new_agent_brief");
          }
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

  // Step Validation Handlers
  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.businessName.trim() || !formData.industry || !formData.gstNumber.trim()) {
        alert("Please fill in all required fields in Step 1 (Business Name, Industry, GST Number).");
        return false;
      }
    } else if (step === 2) {
      if (!formData.pocName.trim() || !formData.pocPhone.trim()) {
        alert("Please fill in all required fields in Step 2 (Full Name, Phone Number).");
        return false;
      }
    } else if (step === 3) {
      if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
        alert("Please fill in all required fields in Step 3 (Use Case Description, Volume, Languages).");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(4, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setActiveStep(prev => Math.max(1, prev - 1));
  };

  // Submission Handler for Main Application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    if (formData.needsApiIntegration && !formData.apiIntegrationDetails.trim()) {
      alert("Please provide details for your custom API integration in Step 4.");
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

  // Submission Handler for 2nd Agent Brief
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

  // Payment Handlers
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
      amount: 100,
      currency: "INR",
      name: "Talkar Integration Fee",
      description: "One-time custom API integration fee",
      order_id: customerData.setup_fee_order_id,
      handler: async function (response: any) {
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
            window.location.href = "/";
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
      theme: { color: "#8b5cf6" },
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
        window.location.href = "/";
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
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-8 h-8 rounded-full border-3 border-purple-500 border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading Talkar workspace initialization...</p>
      </div>
    );
  }

  const mainSteps = [
    { num: 1, label: "Business Identity", icon: Building2 },
    { num: 2, label: "Point of Contact", icon: User },
    { num: 3, label: "Agent Requirements", icon: Bot },
    { num: 4, label: "Integrations & Docs", icon: Wrench },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 min-h-[85vh] flex flex-col justify-center">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* ── HEADER BRANDING ── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Talkar Platform Onboarding
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">AI Agent Deployment Brief</h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Complete your application details below. Our conversational AI engineering team builds and deploys your workspace's agent within 24 hours.
        </p>
      </div>

      {/* ── 1. NEW AGENT BRIEF (Sub-org or Returning Customer) ── */}
      {(status === "new_agent_brief" || (status === "agent_building" && customerData?.is_sub_org && !customerData?.has_onboarding_form)) && (
        <Card className="border-purple-500/30 shadow-lg shadow-purple-500/5 bg-card">
          <CardHeader className="border-b border-border/40 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  Workspace Agent Brief
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Specify the voice persona, objective, and volume requirements for this new workspace agent.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 font-mono text-[10px]">
                STEP {briefStep} OF 2
              </Badge>
            </div>

            {/* Brief Progress Tracker */}
            <div className="w-full bg-secondary h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(briefStep / 2) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmitBrief} className="space-y-6">
              {briefStep === 1 ? (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="useCaseType" className="text-xs font-semibold">Primary Direction <span className="text-red-500">*</span></Label>
                      <Select value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inbound">Inbound (Support & Inquiries)</SelectItem>
                          <SelectItem value="outbound">Outbound (Sales & Follow-ups)</SelectItem>
                          <SelectItem value="both">Inbound + Outbound (Dual Role)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="callVolume" className="text-xs font-semibold">Monthly Call Volume <span className="text-red-500">*</span></Label>
                      <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select Volume" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<1000">Less than 1,000 mins</SelectItem>
                          <SelectItem value="1000-5000">1,000 – 5,000 mins</SelectItem>
                          <SelectItem value="5000-10000">5,000 – 10,000 mins</SelectItem>
                          <SelectItem value="10000+">10,000+ mins (High Volume)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages" className="text-xs font-semibold">Required Languages <span className="text-red-500">*</span></Label>
                    <Input id="languages" className="h-10" placeholder="e.g. English, Hindi, Hinglish" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCaseDescription" className="text-xs font-semibold">Agent Workflow Objective <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="useCaseDescription"
                      placeholder="Describe what this specific agent should execute (e.g. 'Answer hotel availability questions and capture guest name, check-in date, and room type...')"
                      value={formData.useCaseDescription}
                      onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="p-4 border border-purple-500/20 bg-purple-500/5 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="needsApiIntegration" className="font-semibold text-sm cursor-pointer">Custom API Integration Needed?</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Check this if the agent must call external REST endpoints, proprietary CRMs, or custom webhooks during calls.</p>
                      </div>
                      <Switch
                        id="needsApiIntegration"
                        checked={formData.needsApiIntegration}
                        onCheckedChange={(checked) => setFormData({...formData, needsApiIntegration: checked})}
                      />
                    </div>

                    {formData.needsApiIntegration && (
                      <div className="space-y-2 pt-3 border-t border-purple-500/20">
                        <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold">API Details & System Specs <span className="text-red-500">*</span></Label>
                        <Textarea
                          id="apiIntegrationDetails"
                          placeholder="Detail your API authentication scheme, endpoint URLs, and required payload fields..."
                          value={formData.apiIntegrationDetails}
                          onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                          rows={4}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                {briefStep > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setBriefStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                ) : <div />}

                {briefStep < 2 ? (
                  <Button type="button" onClick={() => {
                    if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
                      alert("Please complete all required fields on Step 1.");
                      return;
                    }
                    setBriefStep(2);
                  }} className="bg-purple-600 hover:bg-purple-700 text-white">
                    Continue to Integrations <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]">
                    {submitting ? "Submitting..." : "Submit Agent Brief"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── 2. BRIEF SUBMITTED CONFIRMATION ── */}
      {status === "brief_submitted" && (
        <Card className="border-green-500/30 bg-green-500/5 text-center py-10">
          <CardContent className="space-y-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto animate-bounce" />
            <h2 className="text-2xl font-bold">Agent Request Submitted!</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Our engineering team has received your workspace brief and is reviewing your workflow specifications.
            </p>
            <div className="pt-2">
              <Button onClick={() => router.push("/overview")} variant="outline">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 3. PENDING APPROVAL: Multi-Step Application Wizard ── */}
      {status === "pending_approval" && (
        <Card className="border-border/80 shadow-xl bg-card">
          <CardHeader className="border-b border-border/40 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Client Onboarding Application</CardTitle>
                <CardDescription className="text-xs mt-0.5">Step {activeStep} of 4: {mainSteps[activeStep - 1].label}</CardDescription>
              </div>

              {/* Wizard Steps Indicator */}
              <div className="flex items-center gap-2">
                {mainSteps.map((s) => {
                  const IconComp = s.icon;
                  const isDone = activeStep > s.num;
                  const isCurrent = activeStep === s.num;
                  return (
                    <div 
                      key={s.num}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isCurrent ? "bg-purple-600 text-white shadow-md" :
                        isDone ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                        "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : <IconComp className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-secondary h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(activeStep / 4) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* STEP 1: BUSINESS IDENTITY */}
              {activeStep === 1 && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-xs font-semibold">Registered Business Name <span className="text-red-500">*</span></Label>
                      <Input id="businessName" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} placeholder="e.g. Acme Health Tech Pvt Ltd" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-xs font-semibold">Industry Sector <span className="text-red-500">*</span></Label>
                      <Select required value={formData.industry} onValueChange={val => setFormData({...formData, industry: val})}>
                        <SelectTrigger><SelectValue placeholder="Select Industry" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Healthcare">Healthcare & Wellness</SelectItem>
                          <SelectItem value="Hospitality">Hospitality & Tourism</SelectItem>
                          <SelectItem value="Real Estate">Real Estate & Construction</SelectItem>
                          <SelectItem value="Education">Education & E-Learning</SelectItem>
                          <SelectItem value="Retail">Retail & E-Commerce</SelectItem>
                          <SelectItem value="Finance">Finance & Insurance</SelectItem>
                          <SelectItem value="Other">Other Industry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstNumber" className="text-xs font-semibold">GST Identification Number (GSTIN) <span className="text-red-500">*</span></Label>
                      <Input id="gstNumber" required value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} placeholder="27AAAAA0000A1Z5" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companySize" className="text-xs font-semibold">Company Size <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                      <Select value={formData.companySize} onValueChange={val => setFormData({...formData, companySize: val})}>
                        <SelectTrigger><SelectValue placeholder="Select Team Size" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1–10 employees</SelectItem>
                          <SelectItem value="11-50">11–50 employees</SelectItem>
                          <SelectItem value="51-200">51–200 employees</SelectItem>
                          <SelectItem value="200+">200+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="websiteUrl" className="text-xs font-semibold">Company Website URL <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                      <Input id="websiteUrl" type="url" placeholder="https://www.example.com" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: POINT OF CONTACT */}
              {activeStep === 2 && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pocName" className="text-xs font-semibold">Primary Contact Name <span className="text-red-500">*</span></Label>
                      <Input id="pocName" required value={formData.pocName} onChange={e => setFormData({...formData, pocName: e.target.value})} placeholder="Alex Johnson" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pocPhone" className="text-xs font-semibold">Phone Number <span className="text-red-500">*</span></Label>
                      <Input id="pocPhone" type="tel" required value={formData.pocPhone} onChange={e => setFormData({...formData, pocPhone: e.target.value})} placeholder="+91 98765 43210" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pocDesignation" className="text-xs font-semibold">Designation / Role <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                      <Input id="pocDesignation" placeholder="e.g. Head of Operations" value={formData.pocDesignation} onChange={e => setFormData({...formData, pocDesignation: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: AGENT REQUIREMENTS */}
              {activeStep === 3 && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Agent Direction <span className="text-red-500">*</span></Label>
                    <RadioGroup value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})} className="flex gap-4">
                      <div className="flex items-center space-x-2 border border-border/60 p-3 rounded-lg flex-1 cursor-pointer">
                        <RadioGroupItem value="inbound" id="inbound" />
                        <Label htmlFor="inbound" className="cursor-pointer text-xs font-medium">Inbound Only</Label>
                      </div>
                      <div className="flex items-center space-x-2 border border-border/60 p-3 rounded-lg flex-1 cursor-pointer">
                        <RadioGroupItem value="outbound" id="outbound" />
                        <Label htmlFor="outbound" className="cursor-pointer text-xs font-medium">Outbound Only</Label>
                      </div>
                      <div className="flex items-center space-x-2 border border-border/60 p-3 rounded-lg flex-1 cursor-pointer">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both" className="cursor-pointer text-xs font-medium">Inbound & Outbound</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCaseDescription" className="text-xs font-semibold">Detailed Use Case Description <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="useCaseDescription"
                      placeholder="Describe what conversation flow you need (e.g., Answer customer queries about order status, collect delivery address, and send SMS confirmation...)"
                      value={formData.useCaseDescription}
                      onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="callVolume" className="text-xs font-semibold">Expected Monthly Volume <span className="text-red-500">*</span></Label>
                      <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                        <SelectTrigger><SelectValue placeholder="Select Call Volume" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<100">Less than 100 calls</SelectItem>
                          <SelectItem value="100-500">100 – 500 calls</SelectItem>
                          <SelectItem value="500-2000">500 – 2,000 calls</SelectItem>
                          <SelectItem value="2000+">2,000+ calls</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="languages" className="text-xs font-semibold">Spoken Languages Needed <span className="text-red-500">*</span></Label>
                      <Input id="languages" placeholder="e.g. English, Hindi, Tamil" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="integrations" className="text-xs font-semibold">Existing Tools & Software <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                      <Input id="integrations" placeholder="e.g. HubSpot, Google Sheets, WhatsApp Business API" value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: INTEGRATIONS & COMPLIANCE DOCS */}
              {activeStep === 4 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="p-4 border border-purple-500/20 bg-purple-500/5 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="needsApiIntegration" className="font-semibold text-sm cursor-pointer">Custom API Integration Required?</Label>
                        <p className="text-xs text-muted-foreground">Select if your agent requires proprietary CRM endpoints or real-time webhook triggers.</p>
                      </div>
                      <Switch 
                        id="needsApiIntegration" 
                        checked={formData.needsApiIntegration} 
                        onCheckedChange={val => setFormData({...formData, needsApiIntegration: val})}
                      />
                    </div>

                    {formData.needsApiIntegration && (
                      <div className="space-y-2 pt-3 border-t border-purple-500/20">
                        <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold">API Details & Authentication Specs <span className="text-red-500">*</span></Label>
                        <Textarea
                          id="apiIntegrationDetails"
                          placeholder="Describe the REST endpoints, headers, authentication method, or webhook payloads..."
                          value={formData.apiIntegrationDetails}
                          onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Verification Documents <span className="text-muted-foreground font-normal">(Optional — Accelerates Approval)</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className="border-2 border-dashed border-border/80 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); simulateUpload("gst"); }}
                      >
                        <UploadCloud className="w-7 h-7 text-purple-400 mb-2" />
                        <p className="text-xs font-semibold">GST Certificate</p>
                        <p className="text-[10px] text-muted-foreground">Drag & drop or click to upload</p>
                        {uploadProgress.gst > 0 && (
                          <div className="w-full mt-3 bg-secondary rounded-full h-1.5">
                            <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress.gst}%` }} />
                          </div>
                        )}
                      </div>

                      <div
                        className="border-2 border-dashed border-border/80 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); simulateUpload("reg"); }}
                      >
                        <UploadCloud className="w-7 h-7 text-purple-400 mb-2" />
                        <p className="text-xs font-semibold">Business Registration</p>
                        <p className="text-[10px] text-muted-foreground">Drag & drop or click to upload</p>
                        {uploadProgress.reg > 0 && (
                          <div className="w-full mt-3 bg-secondary rounded-full h-1.5">
                            <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress.reg}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                {activeStep > 1 ? (
                  <Button type="button" variant="outline" onClick={handlePrevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous Step
                  </Button>
                ) : <div />}

                {activeStep < 4 ? (
                  <Button type="button" onClick={handleNextStep} className="bg-purple-600 hover:bg-purple-700 text-white">
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white min-w-[160px] shadow-lg">
                    {submitting ? "Submitting Application..." : "Submit Application"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── 4. UNDER REVIEW SCREEN ── */}
      {status === "under_review" && (
        <Card className="text-center py-12 border-blue-500/30 bg-blue-500/5">
          <CardContent className="space-y-6">
            <Clock className="w-16 h-16 text-blue-500 mx-auto animate-spin" />
            <div>
              <h2 className="text-2xl font-bold">Application Under Engineering Review</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                Our solutions architecture team is reviewing your use case details. We will notify you via email once approved.
              </p>
            </div>
            <div className="pt-2">
              <Button onClick={() => router.push("/overview")} variant="outline">
                Explore Dashboard Overview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 5. APPROVED SCREEN: Custom Integration Fee Quoted Invoice ── */}
      {status === "approved" && (
        <Card className="border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 via-card to-card shadow-2xl">
          <CardHeader className="text-center pb-4 border-b border-border/40">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-extrabold">Application Approved!</CardTitle>
            <CardDescription className="text-xs">
              Custom API Integration Fee Quoted
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-mono font-semibold">One-Time Integration Quote</span>
              <div className="text-4xl font-extrabold text-foreground mt-1">
                {customerData?.onboarding_form?.integration_fee_paise 
                  ? `₹${(customerData.onboarding_form.integration_fee_paise / 100).toLocaleString()}`
                  : "Custom Quoted Fee"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {customerData?.onboarding_form?.integration_description || "Covers proprietary REST API bindings, custom webhooks, and sandbox testing."}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">What's Included:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 rounded bg-secondary/40">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Custom REST & Webhook Handlers</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-secondary/40">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>End-to-End Pipeline Testing</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-secondary/40">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Dedicated Integration Engineer</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-secondary/40">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>24-Hour Agent Delivery SLA</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t border-border/40">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg min-w-[200px]" onClick={handlePaySetupFee}>
                <CreditCard className="w-4 h-4 mr-2" /> Pay Integration Fee
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
    </div>
  );
}
