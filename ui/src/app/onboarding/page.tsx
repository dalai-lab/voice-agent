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
  Check, ArrowRight, ArrowLeft, Sparkles, Building2, User, Bot, Wrench, 
  Clock, CheckCircle2, CreditCard, UploadCloud, ChevronRight
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

  // Upload State
  const [uploadProgress, setUploadProgress] = useState({ gst: 0, reg: 0 });
  const [uploadedFiles, setUploadedFiles] = useState<{ gst: File | null; reg: File | null }>({ gst: null, reg: null });

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

  const handleFileSelect = (type: "gst" | "reg", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store file reference for display
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    // Read as data URL for form submission (or just store the file name/object URL)
    const reader = new FileReader();
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (progress >= 90) clearInterval(interval);
      setUploadProgress(prev => ({ ...prev, [type]: progress }));
    }, 100);

    reader.onload = () => {
      clearInterval(interval);
      setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      const dataUrl = reader.result as string;
      if (type === "gst") {
        setFormData(prev => ({ ...prev, gstCertificateUrl: dataUrl }));
      } else {
        setFormData(prev => ({ ...prev, businessRegistrationUrl: dataUrl }));
      }
    };

    reader.onerror = () => {
      clearInterval(interval);
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
      setUploadedFiles(prev => ({ ...prev, [type]: null }));
    };

    reader.readAsDataURL(file);
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
    { num: 1, label: "Company Profile", icon: Building2 },
    { num: 2, label: "Contact Details", icon: User },
    { num: 3, label: "Agent Settings", icon: Bot },
    { num: 4, label: "Integrations & Setup", icon: Wrench },
  ];

  return (
    <div className="dark min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col relative overflow-x-hidden font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="absolute inset-0 hero-bg pointer-events-none -z-10" />
      <div className="absolute inset-0 hero-stripe-pattern pointer-events-none -z-10" />
      
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-orange-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-500/[0.02] rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Corporate Header */}
      <header className="w-full border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <span className="font-extrabold text-base font-sans">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Talkar</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/5 text-orange-400 text-[10px] font-semibold uppercase tracking-wider badge-glow">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Workspace Activation
          </div>
        </div>
      </header>

      {/* Main Container - Large Wide Space Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 z-10">
        
        {/* ── 3. PENDING APPROVAL: Premium Split-Screen Wizard ── */}
        {status === "pending_approval" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            
            {/* LEFT COLUMN: Progress & Navigation Timeline */}
            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-28">
              <div className="space-y-3">
                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                  Let's activate <br />
                  your voice network.
                </h1>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
                  Provide your business profile and routing parameters. We configure your automated voice channels within 24 hours.
                </p>
              </div>

              {/* Vertical Custom Timeline */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
                {mainSteps.map((s) => {
                  const IconComp = s.icon;
                  const isDone = activeStep > s.num;
                  const isCurrent = activeStep === s.num;
                  return (
                    <div key={s.num} className="relative flex items-start gap-4">
                      {/* Node circle */}
                      <div 
                        className={`absolute -left-[20px] w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                          isCurrent ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110" :
                          isDone ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                          "bg-zinc-950 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{s.num}</span>}
                      </div>

                      <div className="space-y-1 pl-4">
                        <h4 className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                          isCurrent ? "text-orange-400" : isDone ? "text-emerald-400" : "text-zinc-500"
                        }`}>
                          {s.label}
                        </h4>
                        {isCurrent && (
                          <p className="text-[11px] text-zinc-400 max-w-xs leading-normal animate-in fade-in-50 duration-300">
                            Currently editing company configuration parameters.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: The Form Content (Borderless, Clean) */}
            <div className="lg:col-span-8 space-y-12">
              <form onSubmit={handleSubmit} className="space-y-10">

                {/* STEP 1: COMPANY PROFILE */}
                {activeStep === 1 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-xl font-bold text-white">Company Profile Details</h3>
                      <p className="text-xs text-zinc-400 mt-1">Specify your corporate entity and registration identifier.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessName" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Registered Company Name <span className="text-orange-500">*</span></Label>
                        <Input id="businessName" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} placeholder="e.g. Acme Hospitality Pvt Ltd" className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industry" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Industry Segment <span className="text-orange-500">*</span></Label>
                        <Select required value={formData.industry} onValueChange={val => setFormData({...formData, industry: val})}>
                          <SelectTrigger className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all">
                            <SelectValue placeholder="Select Industry" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                            <SelectItem value="Healthcare">Healthcare & Biotech</SelectItem>
                            <SelectItem value="Hospitality">Hospitality & Tourism</SelectItem>
                            <SelectItem value="Real Estate">Real Estate & Assets</SelectItem>
                            <SelectItem value="Education">Education & E-learning</SelectItem>
                            <SelectItem value="Retail">Retail & E-commerce</SelectItem>
                            <SelectItem value="Finance">Finance & Brokerage</SelectItem>
                            <SelectItem value="Other">Other Business</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gstNumber" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">GST Registration Identifier <span className="text-orange-500">*</span></Label>
                        <Input id="gstNumber" required value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} placeholder="e.g., 27AAAAA0000A1Z5" className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companySize" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Company Size <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                        <Select value={formData.companySize} onValueChange={val => setFormData({...formData, companySize: val})}>
                          <SelectTrigger className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all">
                            <SelectValue placeholder="Select Team Size" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                            <SelectItem value="1-10">1–10 employees</SelectItem>
                            <SelectItem value="11-50">11–50 employees</SelectItem>
                            <SelectItem value="51-200">51–200 employees</SelectItem>
                            <SelectItem value="200+">200+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="websiteUrl" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Corporate Website Address <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                        <Input id="websiteUrl" type="url" placeholder="https://www.company.com" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: CONTACT DETAILS */}
                {activeStep === 2 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-xl font-bold text-white">Point of Contact</h3>
                      <p className="text-xs text-zinc-400 mt-1">Provide information for the primary account administrator.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="pocName" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Contact Person Name <span className="text-orange-500">*</span></Label>
                        <Input id="pocName" required value={formData.pocName} onChange={e => setFormData({...formData, pocName: e.target.value})} placeholder="e.g. Alex Johnson" className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pocPhone" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Direct Phone Number <span className="text-orange-500">*</span></Label>
                        <Input id="pocPhone" type="tel" required value={formData.pocPhone} onChange={e => setFormData({...formData, pocPhone: e.target.value})} placeholder="e.g. +91 98765 43210" className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pocDesignation" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Designation / Role <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                        <Input id="pocDesignation" placeholder="e.g. Head of Operations" value={formData.pocDesignation} onChange={e => setFormData({...formData, pocDesignation: e.target.value})} className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: AGENT SETTINGS */}
                {activeStep === 3 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-xl font-bold text-white">Call Routing & Logic Settings</h3>
                      <p className="text-xs text-zinc-400 mt-1">Specify how calls flow through the agent and what objectives it must complete.</p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Primary Call Path <span className="text-orange-500">*</span></Label>
                      <RadioGroup value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex items-center space-x-3 border border-white/10 bg-white/[0.01] p-4 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-all">
                          <RadioGroupItem value="inbound" id="inbound" className="border-white/30 text-orange-500 focus:ring-orange-500/10" />
                          <span className="text-xs font-medium text-white">Incoming Calls (Answering / Inquiries)</span>
                        </label>
                        <label className="flex items-center space-x-3 border border-white/10 bg-white/[0.01] p-4 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-all">
                          <RadioGroupItem value="outbound" id="outbound" className="border-white/30 text-orange-500 focus:ring-orange-500/10" />
                          <span className="text-xs font-medium text-white">Outgoing Calls (Outreach / Notifications)</span>
                        </label>
                        <label className="flex items-center space-x-3 border border-white/10 bg-white/[0.01] p-4 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-all">
                          <RadioGroupItem value="both" id="both" className="border-white/30 text-orange-500 focus:ring-orange-500/10" />
                          <span className="text-xs font-medium text-white">Dual Path (Incoming & Outgoing)</span>
                        </label>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="useCaseDescription" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Core Call Objective & Steps <span className="text-orange-500">*</span></Label>
                      <Textarea
                        id="useCaseDescription"
                        placeholder="Detail the conversational flow (e.g. 'Greet user, request hotel check-in date, confirm suite type, update booking system, and send confirmation details via SMS.')"
                        value={formData.useCaseDescription}
                        onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                        rows={5}
                        className="bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 p-4 transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="callVolume" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Monthly Call Capacity <span className="text-orange-500">*</span></Label>
                        <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                          <SelectTrigger className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all">
                            <SelectValue placeholder="Select Call Volume" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                            <SelectItem value="<100">Less than 100 calls</SelectItem>
                            <SelectItem value="100-500">100 – 500 calls</SelectItem>
                            <SelectItem value="500-2000">500 – 2,000 calls</SelectItem>
                            <SelectItem value="2000+">2,000+ calls</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="languages" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Languages Required <span className="text-orange-500">*</span></Label>
                        <Input id="languages" placeholder="e.g. English, Hindi" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="integrations" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Connected Corporate Tools <span className="text-zinc-500 text-[10px]">(optional)</span></Label>
                        <Input id="integrations" placeholder="e.g. Salesforce CRM, Google Sheets, Slack hooks" value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: INTEGRATIONS & SETUP */}
                {activeStep === 4 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-xl font-bold text-white">System Integrations & Verification</h3>
                      <p className="text-xs text-zinc-400 mt-1">Optionally connect external databases or upload verification details to bypass sandbox constraints.</p>
                    </div>

                    <div className="p-6 border border-white/5 bg-white/[0.01] rounded-2xl space-y-4">
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <Label htmlFor="needsApiIntegration" className="font-bold text-sm text-white cursor-pointer">Require Custom API Infrastructure?</Label>
                          <p className="text-xs text-zinc-400 mt-1">Select if the voice agent must read/write to proprietary endpoints, webhooks, or custom REST servers.</p>
                        </div>
                        <Switch 
                          id="needsApiIntegration" 
                          checked={formData.needsApiIntegration} 
                          onCheckedChange={val => setFormData({...formData, needsApiIntegration: val})}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>

                      {formData.needsApiIntegration && (
                        <div className="space-y-2 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                          <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Endpoint Requirements & System Rules <span className="text-orange-500">*</span></Label>
                          <Textarea
                            id="apiIntegrationDetails"
                            placeholder="Detail authorization headers, webhook event structures, or API routing details..."
                            value={formData.apiIntegrationDetails}
                            onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                            rows={3}
                            className="bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 p-4 transition-all resize-none leading-relaxed"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Corporate Documents <span className="text-zinc-500 font-normal">(Optional — Accelerates Activation)</span></Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label
                          htmlFor="gst-upload"
                          className={`border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            uploadedFiles.gst
                              ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                              : "border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02]"
                          }`}
                        >
                          <input
                            type="file"
                            id="gst-upload"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileSelect("gst", e)}
                          />
                          {uploadedFiles.gst ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                <Check className="w-6 h-6 text-emerald-400" />
                              </div>
                              <p className="text-xs font-bold text-emerald-400 max-w-full truncate px-2">{uploadedFiles.gst.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{(uploadedFiles.gst.size / 1024).toFixed(1)} KB · Click to replace</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
                              <p className="text-xs font-bold text-white">GST Certificate</p>
                              <p className="text-[10px] text-zinc-500 mt-1">PDF, JPG or PNG · Click to select</p>
                            </>
                          )}
                          {uploadProgress.gst > 0 && uploadProgress.gst < 100 && (
                            <div className="w-full mt-4 bg-zinc-900 rounded-full h-1 overflow-hidden">
                              <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all duration-150" style={{ width: `${uploadProgress.gst}%` }} />
                            </div>
                          )}
                        </label>

                        <label
                          htmlFor="reg-upload"
                          className={`border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            uploadedFiles.reg
                              ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                              : "border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02]"
                          }`}
                        >
                          <input
                            type="file"
                            id="reg-upload"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileSelect("reg", e)}
                          />
                          {uploadedFiles.reg ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                <Check className="w-6 h-6 text-emerald-400" />
                              </div>
                              <p className="text-xs font-bold text-emerald-400 max-w-full truncate px-2">{uploadedFiles.reg.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{(uploadedFiles.reg.size / 1024).toFixed(1)} KB · Click to replace</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
                              <p className="text-xs font-bold text-white">Company Incorporation Doc</p>
                              <p className="text-[10px] text-zinc-500 mt-1">PDF, JPG or PNG · Click to select</p>
                            </>
                          )}
                          {uploadProgress.reg > 0 && uploadProgress.reg < 100 && (
                            <div className="w-full mt-4 bg-zinc-900 rounded-full h-1 overflow-hidden">
                              <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all duration-150" style={{ width: `${uploadProgress.reg}%` }} />
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Action Footer - Spacious & Clean */}
                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                  {activeStep > 1 ? (
                    <Button type="button" variant="outline" onClick={handlePrevStep} className="border-white/10 text-zinc-300 hover:bg-white/5 rounded-xl h-12 px-6">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                    </Button>
                  ) : <div />}

                  {activeStep < 4 ? (
                    // key="next" forces React to unmount this button when we switch to Submit,
                    // preventing the click event from bleeding into the new DOM node.
                    <Button key="next-step-btn" type="button" onClick={handleNextStep} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-semibold shadow-lg shadow-orange-500/10">
                      Next Step <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    // type="button" + explicit onClick so the form's onSubmit can never fire
                    // accidentally from a click event that leaked from the previous render.
                    <Button key="submit-btn" type="button" disabled={submitting} onClick={handleSubmit as any} className="bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-orange-500/25 min-w-[180px]">
                      {submitting ? "Activating Portal..." : "Submit Activation Request"}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 1. NEW AGENT BRIEF (Sub-org or Returning Customer) ── */}
        {(status === "new_agent_brief" || (status === "agent_building" && customerData?.is_sub_org && !customerData?.has_onboarding_form)) && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Bot className="w-6 h-6 text-orange-500" />
                  Voice Agent Objectives
                </h2>
                <p className="text-sm text-zinc-400 mt-1">Specify how you want this agent configured.</p>
              </div>
              <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400 font-mono text-[10px] px-3 py-1 rounded-full">
                Step {briefStep} of 2
              </Badge>
            </div>

            <form onSubmit={handleSubmitBrief} className="space-y-10">
              {briefStep === 1 ? (
                <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="useCaseType" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Call Flow Route <span className="text-orange-500">*</span></Label>
                      <Select value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})}>
                        <SelectTrigger className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="inbound">Incoming Calls Only (Answering)</SelectItem>
                          <SelectItem value="outbound">Outgoing Calls Only (Outreach)</SelectItem>
                          <SelectItem value="both">Both (Incoming & Outgoing)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="callVolume" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Expected Call Minutes <span className="text-orange-500">*</span></Label>
                      <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                        <SelectTrigger className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 px-4">
                          <SelectValue placeholder="Select Volume" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-xl">
                          <SelectItem value="<1000">Less than 1,000 minutes</SelectItem>
                          <SelectItem value="1000-5000">1,000 – 5,000 minutes</SelectItem>
                          <SelectItem value="5000-10000">5,000 – 10,000 minutes</SelectItem>
                          <SelectItem value="10000+">10,000+ minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Agent Languages <span className="text-orange-500">*</span></Label>
                    <Input id="languages" className="h-12 bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 px-4" placeholder="e.g. English, Hindi" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCaseDescription" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workflow Target <span className="text-orange-500">*</span></Label>
                    <Textarea
                      id="useCaseDescription"
                      placeholder="Outline instructions (e.g. 'Answer room booking questions, capture customer name, check availability in CRM, book slot.')"
                      value={formData.useCaseDescription}
                      onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                      rows={5}
                      className="bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 focus:ring-orange-500/10 p-4 transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="p-6 border border-white/5 bg-white/[0.01] rounded-2xl space-y-4">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <Label htmlFor="needsApiIntegration" className="font-bold text-sm text-white cursor-pointer">CRM / Database Connection Needed?</Label>
                        <p className="text-xs text-zinc-400 mt-1">Check if the agent needs to read or write live details to your CRM or custom API database.</p>
                      </div>
                      <Switch
                        id="needsApiIntegration"
                        checked={formData.needsApiIntegration}
                        onCheckedChange={(checked) => setFormData({...formData, needsApiIntegration: checked})}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>

                    {formData.needsApiIntegration && (
                      <div className="space-y-2 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                        <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Connection specs <span className="text-orange-500">*</span></Label>
                        <Textarea
                          id="apiIntegrationDetails"
                          placeholder="Provide details about standard payloads, external tool names, or secure webhook endpoints..."
                          value={formData.apiIntegrationDetails}
                          onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                          rows={5}
                          className="bg-white/[0.02] border-white/10 hover:border-white/20 text-white rounded-xl focus:border-orange-500 p-4 leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-8 border-t border-white/5">
                {briefStep > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setBriefStep(1)} className="border-white/10 text-zinc-300 hover:bg-white/5 rounded-xl h-12 px-6">
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
                  }} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-semibold">
                    Continue to Integrations <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-bold min-w-[160px]">
                    {submitting ? "Submitting..." : "Submit Agent Details"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── 2. BRIEF SUBMITTED CONFIRMATION ── */}
        {status === "brief_submitted" && (
          <div className="max-w-xl mx-auto text-center space-y-6 py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Objective Saved</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your voice agent objective and call structure details have been updated. Our solutions engineers are updating the routing workspace now.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={() => router.push("/overview")} className="bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl h-12 px-8">
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── 4. UNDER REVIEW SCREEN ── */}
        {status === "under_review" && (
          <div className="max-w-xl mx-auto text-center space-y-6 py-12">
            <Clock className="w-16 h-16 text-orange-500 mx-auto animate-spin" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Verification Pending</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Our solutions engineering team is currently verifying the routing endpoints and settings for your corporate voice profile. We will notify you by email as soon as activation finishes.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={() => router.push("/overview")} className="bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl h-12 px-8">
                Explore Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── 5. APPROVED SCREEN: Custom Integration Fee Quoted Invoice ── */}
        {status === "approved" && (
          <div className="max-w-3xl mx-auto space-y-12 py-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
                <CheckCircle2 className="w-7 h-7 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Application Approved</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">Please complete the setup payment to configure your live voice workspace.</p>
            </div>

            <div className="p-8 rounded-2xl border border-orange-500/30 bg-orange-500/10 text-center">
              <span className="text-xs uppercase tracking-wider text-orange-400 font-mono font-bold">Quoted Integration Fee</span>
              <div className="text-4xl font-extrabold text-white mt-2">
                {customerData?.onboarding_form?.integration_fee_paise 
                  ? `₹${(customerData.onboarding_form.integration_fee_paise / 100).toLocaleString()}`
                  : "Quoted setup fee"}
              </div>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-md mx-auto">
                {customerData?.onboarding_form?.integration_description || "Covers custom API data-flows, Salesforce/CRM authentication, calendar hooks, and full production pipeline testing."}
              </p>
            </div>

            <div className="space-y-4">
              <span className="font-bold uppercase tracking-wider text-zinc-400 text-[10px]">What is Included:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Custom CRM & Webhook Handlers</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>End-to-End Voice Flow Testing</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dedicated Integration Engineer</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24-Hour Active SLA Delivery</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-white/5">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white font-semibold shadow-lg shadow-orange-500/25 h-12 px-8 rounded-xl min-w-[220px]" onClick={handlePaySetupFee}>
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
      </main>
    </div>
  );
}
