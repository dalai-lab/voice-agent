"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
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
        alert("Please fill in all required fields in Step 1 (Company Name, Industry, Tax Registration Number).");
        return false;
      }
    } else if (step === 2) {
      if (!formData.pocName.trim() || !formData.pocPhone.trim()) {
        alert("Please fill in all required fields in Step 2 (Full Name, Phone Number).");
        return false;
      }
    } else if (step === 3) {
      if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
        alert("Please fill in all required fields in Step 3 (Describe Objective, Volume, Languages).");
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
      alert("Please provide details for your custom CRM/API integration in Step 4.");
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
      alert("Please fill in all use case fields so we can configure your agent correctly.");
      return;
    }
    if (formData.needsApiIntegration && !formData.apiIntegrationDetails.trim()) {
      alert("Please provide integration details for custom systems.");
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
        alert(`Failed to submit: ${err.detail || res.statusText}`);
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
      alert("Missing payment order details. Please contact support.");
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
      theme: { color: "#fe6905" },
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
      <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 hero-bg pointer-events-none -z-10" />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/5 border-t-orange-500" />
        <p className="text-sm font-medium text-zinc-400">Initializing your Talkar workspace...</p>
      </div>
    );
  }

  const mainSteps = [
    { num: 1, label: "Company Details", icon: Building2 },
    { num: 2, label: "Contact Person", icon: User },
    { num: 3, label: "Call Objectives", icon: Bot },
    { num: 4, label: "Integrations & Docs", icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col justify-center py-12 px-4 relative overflow-x-hidden font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="absolute inset-0 hero-bg pointer-events-none -z-10" />
      <div className="absolute inset-0 hero-stripe-pattern pointer-events-none -z-10" />
      
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-3xl mx-auto space-y-8 z-10">
        
        {/* ── HEADER BRANDING ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider badge-glow">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Talkar Platform Configuration
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-sans">AI Call Agent Deployment Setup</h1>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
            Provide details about your business and communication requirements below. Our solutions engineering team will configure and deploy your custom voice agent within 24 hours.
          </p>
        </div>

        {/* ── 1. NEW AGENT BRIEF (Sub-org or Returning Customer) ── */}
        {(status === "new_agent_brief" || (status === "agent_building" && customerData?.is_sub_org && !customerData?.has_onboarding_form)) && (
          <div className="bg-black/40 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-orange-500" />
                  Voice Agent Setup Details
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Specify the purpose, call routing direction, and volume requirements for your agent.
                </p>
              </div>
              <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400 font-mono text-[10px] self-start sm:self-auto">
                STEP {briefStep} OF 2
              </Badge>
            </div>

            {/* Brief Progress Tracker */}
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(briefStep / 2) * 100}%` }}
              />
            </div>

            <form onSubmit={handleSubmitBrief} className="space-y-6 pt-2">
              {briefStep === 1 ? (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="useCaseType" className="text-xs font-semibold text-zinc-300">Call Flow Direction <span className="text-orange-500">*</span></Label>
                      <Select value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})}>
                        <SelectTrigger className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="inbound">Incoming Calls Only (Support / Inquiries)</SelectItem>
                          <SelectItem value="outbound">Outgoing Calls Only (Sales / Follow-ups)</SelectItem>
                          <SelectItem value="both">Both (Incoming & Outgoing)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="callVolume" className="text-xs font-semibold text-zinc-300">Estimated Monthly Volume <span className="text-orange-500">*</span></Label>
                      <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                        <SelectTrigger className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20">
                          <SelectValue placeholder="Select Volume" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="<1000">Less than 1,000 minutes</SelectItem>
                          <SelectItem value="1000-5000">1,000 – 5,000 minutes</SelectItem>
                          <SelectItem value="5000-10000">5,000 – 10,000 minutes</SelectItem>
                          <SelectItem value="10000+">10,000+ minutes (High Volume)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages" className="text-xs font-semibold text-zinc-300">Preferred Conversation Languages <span className="text-orange-500">*</span></Label>
                    <Input id="languages" className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" placeholder="e.g. English, Hindi" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCaseDescription" className="text-xs font-semibold text-zinc-300">Agent Flow Objective <span className="text-orange-500">*</span></Label>
                    <Textarea
                      id="useCaseDescription"
                      placeholder="Describe what you want the voice agent to achieve (e.g. 'Answer patient scheduling queries, check slot availability in our system, and book appointments...')"
                      value={formData.useCaseDescription}
                      onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                      rows={4}
                      className="bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="p-5 border border-white/10 bg-white/[0.02] rounded-xl space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="needsApiIntegration" className="font-bold text-sm text-white cursor-pointer">CRM or Software Integration Required?</Label>
                        <p className="text-xs text-zinc-400 mt-1">Enable this if the agent needs to fetch or post data to your database, CRM, Google Sheets, or custom backend endpoints.</p>
                      </div>
                      <Switch
                        id="needsApiIntegration"
                        checked={formData.needsApiIntegration}
                        onCheckedChange={(checked) => setFormData({...formData, needsApiIntegration: checked})}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>

                    {formData.needsApiIntegration && (
                      <div className="space-y-2 pt-4 border-t border-white/10 animate-in slide-in-from-top-2 duration-200">
                        <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold text-zinc-300">Integration Specs or Systems to Connect <span className="text-orange-500">*</span></Label>
                        <Textarea
                          id="apiIntegrationDetails"
                          placeholder="Provide any details about the systems to connect (e.g., 'Need to connect to our Salesforce CRM endpoint', or 'Integrate with custom booking REST API with API key authorization')"
                          value={formData.apiIntegrationDetails}
                          onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                          rows={4}
                          className="bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20 leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                {briefStep > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setBriefStep(1)} className="border-white/10 text-zinc-300 hover:bg-white/5 rounded-xl h-10 px-5">
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
                  }} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-95 rounded-xl h-10 px-5 font-semibold">
                    Continue to Integrations <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-95 rounded-xl h-10 px-6 font-semibold min-w-[140px]">
                    {submitting ? "Submitting..." : "Submit Agent Brief"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── 2. BRIEF SUBMITTED CONFIRMATION ── */}
        {status === "brief_submitted" && (
          <div className="bg-black/40 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-8 sm:p-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Agent Request Submitted</h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                Thank you! Our engineering team has received your agent setup details. We are building the configuration profile and will deploy the workspace updates shortly.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={() => router.push("/overview")} className="bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl h-10 px-6">
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── 3. PENDING APPROVAL: Multi-Step Application Wizard ── */}
        {status === "pending_approval" && (
          <div className="bg-black/40 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-10 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/10 pb-6 gap-5">
              <div>
                <h2 className="text-xl font-bold text-white">Account Activation Setup</h2>
                <p className="text-xs text-zinc-400 mt-1">Step {activeStep} of 4: {mainSteps[activeStep - 1].label}</p>
              </div>

              {/* Wizard Steps Indicator */}
              <div className="flex flex-wrap items-center gap-2">
                {mainSteps.map((s) => {
                  const IconComp = s.icon;
                  const isDone = activeStep > s.num;
                  const isCurrent = activeStep === s.num;
                  return (
                    <div 
                      key={s.num}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        isCurrent ? "bg-orange-500 border-orange-500/50 text-white shadow-md shadow-orange-500/20" :
                        isDone ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-zinc-900 border-white/5 text-zinc-500"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : <IconComp className="w-3.5 h-3.5" />}
                      <span className="hidden md:inline">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 via-rose-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(activeStep / 4) * 100}%` }}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pt-2">

              {/* STEP 1: BUSINESS IDENTITY */}
              {activeStep === 1 && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-xs font-semibold text-zinc-300">Registered Business Name <span className="text-orange-500">*</span></Label>
                      <Input id="businessName" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} placeholder="e.g. Acme Hospitality Pvt Ltd" className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-xs font-semibold text-zinc-300">Industry Sector <span className="text-orange-500">*</span></Label>
                      <Select required value={formData.industry} onValueChange={val => setFormData({...formData, industry: val})}>
                        <SelectTrigger className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20">
                          <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="Healthcare">Healthcare & Medical</SelectItem>
                          <SelectItem value="Hospitality">Hospitality & Tourism</SelectItem>
                          <SelectItem value="Real Estate">Real Estate & Property</SelectItem>
                          <SelectItem value="Education">Education & Training</SelectItem>
                          <SelectItem value="Retail">Retail & E-Commerce</SelectItem>
                          <SelectItem value="Finance">Finance & Insurance</SelectItem>
                          <SelectItem value="Other">Other Enterprise Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstNumber" className="text-xs font-semibold text-zinc-300">Tax Identification / GSTIN <span className="text-orange-500">*</span></Label>
                      <Input id="gstNumber" required value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} placeholder="e.g., 27AAAAA0000A1Z5" className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companySize" className="text-xs font-semibold text-zinc-300">Company Size <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                      <Select value={formData.companySize} onValueChange={val => setFormData({...formData, companySize: val})}>
                        <SelectTrigger className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20">
                          <SelectValue placeholder="Select Team Size" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="1-10">1–10 team members</SelectItem>
                          <SelectItem value="11-50">11–50 team members</SelectItem>
                          <SelectItem value="51-200">51–200 team members</SelectItem>
                          <SelectItem value="200+">200+ team members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="websiteUrl" className="text-xs font-semibold text-zinc-300">Company Website URL <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                      <Input id="websiteUrl" type="url" placeholder="https://www.example.com" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: POINT OF CONTACT */}
              {activeStep === 2 && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="pocName" className="text-xs font-semibold text-zinc-300">Contact Person Full Name <span className="text-orange-500">*</span></Label>
                      <Input id="pocName" required value={formData.pocName} onChange={e => setFormData({...formData, pocName: e.target.value})} placeholder="Alex Johnson" className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pocPhone" className="text-xs font-semibold text-zinc-300">Contact Phone Number <span className="text-orange-500">*</span></Label>
                      <Input id="pocPhone" type="tel" required value={formData.pocPhone} onChange={e => setFormData({...formData, pocPhone: e.target.value})} placeholder="+91 98765 43210" className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pocDesignation" className="text-xs font-semibold text-zinc-300">Corporate Designation <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                      <Input id="pocDesignation" placeholder="e.g., Operations Director" value={formData.pocDesignation} onChange={e => setFormData({...formData, pocDesignation: e.target.value})} className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: AGENT REQUIREMENTS */}
              {activeStep === 3 && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-300">Primary Call Direction <span className="text-orange-500">*</span></Label>
                    <RadioGroup value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})} className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center space-x-3 border border-white/10 bg-zinc-950/20 p-4 rounded-xl flex-1 cursor-pointer hover:bg-white/[0.02] transition-all">
                        <RadioGroupItem value="inbound" id="inbound" className="border-white/30 text-orange-500 focus:ring-orange-500/20" />
                        <span className="text-xs font-medium text-white">Incoming Calls Only (Answering / Support)</span>
                      </label>
                      <label className="flex items-center space-x-3 border border-white/10 bg-zinc-950/20 p-4 rounded-xl flex-1 cursor-pointer hover:bg-white/[0.02] transition-all">
                        <RadioGroupItem value="outbound" id="outbound" className="border-white/30 text-orange-500 focus:ring-orange-500/20" />
                        <span className="text-xs font-medium text-white">Outgoing Calls Only (Outreach / Alerts)</span>
                      </label>
                      <label className="flex items-center space-x-3 border border-white/10 bg-zinc-950/20 p-4 rounded-xl flex-1 cursor-pointer hover:bg-white/[0.02] transition-all">
                        <RadioGroupItem value="both" id="both" className="border-white/30 text-orange-500 focus:ring-orange-500/20" />
                        <span className="text-xs font-medium text-white">Incoming & Outgoing (Dual Role)</span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCaseDescription" className="text-xs font-semibold text-zinc-300">Describe What the Agent Should Do <span className="text-orange-500">*</span></Label>
                    <Textarea
                      id="useCaseDescription"
                      placeholder="Outline your call script, booking requirements, or typical customer questions (e.g. 'We need the agent to answer incoming hotel booking questions, confirm room availability, and collect the check-in details...')"
                      value={formData.useCaseDescription}
                      onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                      rows={4}
                      className="bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="callVolume" className="text-xs font-semibold text-zinc-300">Expected Monthly Volume <span className="text-orange-500">*</span></Label>
                      <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                        <SelectTrigger className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20">
                          <SelectValue placeholder="Select Call Volume" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="<100">Less than 100 calls/month</SelectItem>
                          <SelectItem value="100-500">100 – 500 calls/month</SelectItem>
                          <SelectItem value="500-2000">500 – 2,000 calls/month</SelectItem>
                          <SelectItem value="2000+">2,000+ calls/month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="languages" className="text-xs font-semibold text-zinc-300">Spoken Languages Needed <span className="text-orange-500">*</span></Label>
                      <Input id="languages" placeholder="e.g. English, Hindi, Hinglish" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="integrations" className="text-xs font-semibold text-zinc-300">Existing Software to Connect <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                      <Input id="integrations" placeholder="e.g. HubSpot CRM, Google Sheets, WhatsApp Business API" value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} className="h-10 bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: INTEGRATIONS & COMPLIANCE DOCS */}
              {activeStep === 4 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="p-5 border border-white/10 bg-white/[0.02] rounded-xl space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="needsApiIntegration" className="font-bold text-sm text-white cursor-pointer">Require Custom API Setup?</Label>
                        <p className="text-xs text-zinc-400 mt-1">Select this if your team needs us to build a custom endpoint handler, database sync, or secure webhook relays.</p>
                      </div>
                      <Switch 
                        id="needsApiIntegration" 
                        checked={formData.needsApiIntegration} 
                        onCheckedChange={val => setFormData({...formData, needsApiIntegration: val})}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>

                    {formData.needsApiIntegration && (
                      <div className="space-y-2 pt-4 border-t border-white/10 animate-in slide-in-from-top-2 duration-200">
                        <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold text-zinc-300">API Details or Custom Requirements <span className="text-orange-500">*</span></Label>
                        <Textarea
                          id="apiIntegrationDetails"
                          placeholder="Provide details about endpoints, headers, authentication method, or payload mapping specifications (if available)..."
                          value={formData.apiIntegrationDetails}
                          onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                          rows={3}
                          className="bg-zinc-950/50 border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/20 leading-relaxed"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-zinc-300">Verification & Registration Documents <span className="text-zinc-500 font-normal">(Optional — Accelerates Account Activation)</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label
                        htmlFor="gst-upload"
                        className="border border-dashed border-white/15 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-zinc-950/20 hover:bg-zinc-950/40 transition-colors cursor-pointer"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); simulateUpload("gst"); }}
                      >
                        <input type="file" id="gst-upload" className="hidden" onChange={() => simulateUpload("gst")} />
                        <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
                        <p className="text-xs font-bold text-white">GST Certificate</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Drag & drop or click to upload</p>
                        {uploadProgress.gst > 0 && (
                          <div className="w-full mt-3 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all" style={{ width: `${uploadProgress.gst}%` }} />
                          </div>
                        )}
                      </label>

                      <label
                        htmlFor="reg-upload"
                        className="border border-dashed border-white/15 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-zinc-950/20 hover:bg-zinc-950/40 transition-colors cursor-pointer"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); simulateUpload("reg"); }}
                      >
                        <input type="file" id="reg-upload" className="hidden" onChange={() => simulateUpload("reg")} />
                        <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
                        <p className="text-xs font-bold text-white">Company Registration</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Drag & drop or click to upload</p>
                        {uploadProgress.reg > 0 && (
                          <div className="w-full mt-3 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all" style={{ width: `${uploadProgress.reg}%` }} />
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                {activeStep > 1 ? (
                  <Button type="button" variant="outline" onClick={handlePrevStep} className="border-white/10 text-zinc-300 hover:bg-white/5 rounded-xl h-10 px-5">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous Step
                  </Button>
                ) : <div />}

                {activeStep < 4 ? (
                  <Button type="button" onClick={handleNextStep} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-95 rounded-xl h-10 px-5 font-semibold">
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white h-10 px-6 rounded-xl font-bold shadow-lg shadow-orange-500/20 min-w-[160px]">
                    {submitting ? "Submitting Application..." : "Submit Application"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── 4. UNDER REVIEW SCREEN ── */}
        {status === "under_review" && (
          <div className="bg-black/40 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-8 sm:p-12 text-center space-y-6">
            <Clock className="w-16 h-16 text-orange-500 mx-auto animate-spin" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Application Under Engineering Review</h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed mt-2">
                Our solutions engineering team is actively setting up your call architecture and routing parameters. We will notify you via email as soon as activation is completed.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={() => router.push("/overview")} className="bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl h-10 px-6">
                Explore Dashboard Overview
              </Button>
            </div>
          </div>
        )}

        {/* ── 5. APPROVED SCREEN: Custom Integration Fee Quoted Invoice ── */}
        {status === "approved" && (
          <div className="bg-black/40 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-10 space-y-8 bg-gradient-to-b from-orange-500/5 to-transparent">
            <div className="text-center pb-4 border-b border-white/10">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-3 border border-orange-500/20">
                <CheckCircle className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Application Approved!</h2>
              <p className="text-xs text-zinc-400 mt-1">One-time payment to deploy your custom voice agent pipeline</p>
            </div>

            <div className="p-6 rounded-xl border border-orange-500/30 bg-orange-500/10 text-center">
              <span className="text-xs uppercase tracking-wider text-orange-400 font-mono font-semibold">Custom API Integration Quote</span>
              <div className="text-4xl font-extrabold text-white mt-2">
                {customerData?.onboarding_form?.integration_fee_paise 
                  ? `₹${(customerData.onboarding_form.integration_fee_paise / 100).toLocaleString()}`
                  : "Custom Quoted Fee"}
              </div>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-md mx-auto">
                {customerData?.onboarding_form?.integration_description || "Covers custom API data-flows, Salesforce/CRM authentication, calendar hooks, and full production pipeline testing."}
              </p>
            </div>

            <div className="space-y-3">
              <span className="font-bold uppercase tracking-wider text-zinc-400 text-[10px]">What is Included:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Custom CRM & Webhook Handlers</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>End-to-End Voice Flow Testing</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dedicated Integration Engineer</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/40 border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24-Hour Active SLA Delivery</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t border-white/10">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white font-semibold shadow-lg shadow-orange-500/25 h-12 px-8 rounded-xl min-w-[200px]" onClick={handlePaySetupFee}>
                <CreditCard className="w-4 h-4 mr-2" /> Pay Integration Fee
              </Button>
              
              {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                <Button onClick={handleMockSetupFee} variant="outline" size="lg" className="border-white/10 text-zinc-300 hover:bg-white/5 h-12 rounded-xl">
                  Bypass Payment (Dev)
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
