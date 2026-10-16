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
  Clock, CheckCircle2, CreditCard, UploadCloud, ChevronRight, MessageSquare,
  XCircle, ShieldAlert, Mail
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOrgConfig } from "@/context/OrgConfigContext";
import { SidebarTeamSwitcher } from "@/components/layout/SidebarTeamSwitcher";
import { BrandLogo } from "@/components/BrandLogo";

const TALKAR_API = "/api/talkar";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
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
  const [switchingBillingType, setSwitchingBillingType] = useState(false);
  const [clarificationText, setClarificationText] = useState("");
  const [submittingClarification, setSubmittingClarification] = useState(false);

  const handleSwitchToIndependent = async () => {
    if (!dograhOrgId) return;
    setSwitchingBillingType(true);
    try {
      const res = await fetch(`${TALKAR_API}/customers/by-org/${dograhOrgId}/billing-account-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_type: "independent" }),
      });
      if (res.ok) {
        setCustomerData((prev: any) => ({
          ...prev,
          is_sub_org: false,
          account_type: "independent",
          billing_org_id: null,
          master_customer_id: null,
        }));
        setStatus("pending_approval");
        setActiveStep(1);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to switch to independent billing.");
      }
    } catch {
      alert("Error switching billing account type.");
    } finally {
      setSwitchingBillingType(false);
    }
  };

  const handleSwitchToShared = async () => {
    if (!dograhOrgId) return;
    setSwitchingBillingType(true);
    try {
      const res = await fetch(`${TALKAR_API}/customers/by-org/${dograhOrgId}/billing-account-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_type: "shared" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerData((prev: any) => ({
          ...prev,
          is_sub_org: true,
          account_type: "shared",
          billing_org_id: data.billing_org_id,
          master_customer_id: data.billing_org_id,
        }));
        setStatus("new_agent_brief");
        setBriefStep(1);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to link to shared wallet.");
      }
    } catch {
      alert("Error linking to shared billing account.");
    } finally {
      setSwitchingBillingType(false);
    }
  };

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
          
          if (data.is_sub_org && data.status === "pending_approval" && !data.has_onboarding_form) {
            setStatus("new_agent_brief");
          } else {
            setStatus(data.status);
          }

          if (data.onboarding_form) {
            setFormData(prev => ({ ...prev, ...data.onboarding_form }));
          }

          if (data.status === "active") {
            router.push("/overview");
          } else if (data.status === "pending_deposit" || data.status === "suspended") {
            router.push("/wallet");
          } else if (data.status === "agent_building") {
            if (!data.has_onboarding_form) {
              setStatus("new_agent_brief");
            } else {
              router.push("/overview");
            }
          }

          // Fetch existing master info if available to provide linking / independent context
          if (email) {
            fetch(`${TALKAR_API}/customers/existing?contact_email=${encodeURIComponent(email)}`)
              .then(r => r.ok ? r.json() : null)
              .then(ex => {
                if (ex && !cancelled) {
                  setCustomerData((prev: any) => ({
                    ...prev,
                    has_existing_master: true,
                    existing_master: ex,
                    existing_company_name: ex.company_name,
                  }));
                }
              })
              .catch(() => {});
          }
        } else if (res.status === 404 && dograhOrgId && email) {
          // New org in Dograh; check if this user already has a master account
          const existingRes = await fetch(`${TALKAR_API}/customers/existing?contact_email=${encodeURIComponent(email)}`);
          if (existingRes.ok) {
            const existingData = await existingRes.json();
            if (cancelled) return;
            // Link to existing master account and provide quick brief by default
            setCustomerData({
              master_customer_id: existingData.customer_id,
              existing_master: existingData,
              has_existing_master: true,
              existing_company_name: existingData.company_name,
              is_sub_org: true,
            });
            setStatus("new_agent_brief");
          } else {
            // Completely new user
            if (!cancelled) setStatus("pending_approval");
          }
        } else {
          // Unknown error or no dograhOrgId
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

  // Step Validation Handlers
  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.businessName.trim() || !formData.industry) {
        alert("Please fill in all required fields in Step 1 (Company Name, Industry).");
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
    
    // Prevent accidental enter-key submission on earlier steps
    if (activeStep < 4) {
      handleNextStep();
      return;
    }

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

    // Prevent accidental enter-key submission on step 1
    if (briefStep < 2) {
      setBriefStep(2);
      return;
    }

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
      name: "Talkar Integration Fee",
      description: "One-time custom API integration fee",
      order_id: customerData.setup_fee_order_id,
      handler: function (response: any) {
        (async () => {
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
              window.location.href = "/overview";
            } else {
              const err = await res.json().catch(() => ({}));
              alert(`Payment confirmed but setup failed: ${err.detail || "Please contact support."}`);
            }
          } catch {
            alert("Payment received but could not reach server. Please refresh the page.");
          }
        })();
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

  const handleFileSelect = async (type: "gst" | "reg", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store file reference for display
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    setUploadProgress(prev => ({ ...prev, [type]: 15 }));

    try {
      // 1. Request presigned upload URL from S3 presigned upload endpoint
      const presignedRes = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "application/pdf",
          fileSize: file.size,
          documentType: type,
        }),
      });

      if (!presignedRes.ok) {
        const err = await presignedRes.json().catch(() => ({}));
        throw new Error(err.error || err.detail || "Failed to get presigned upload URL");
      }

      const { uploadUrl, fileUrl } = await presignedRes.json();
      setUploadProgress(prev => ({ ...prev, [type]: 45 }));

      // 2. Direct upload to S3 / storage via HTTP PUT
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }

      setUploadProgress(prev => ({ ...prev, [type]: 100 }));

      // 3. Store clean HTTPS document URL in formData (NOT raw base64 data)
      const cleanUrl = fileUrl || uploadUrl.split("?")[0];
      if (type === "gst") {
        setFormData(prev => ({ ...prev, gstCertificateUrl: cleanUrl }));
      } else {
        setFormData(prev => ({ ...prev, businessRegistrationUrl: cleanUrl }));
      }
    } catch (err: any) {
      console.error(`Failed to upload ${type} document:`, err);
      alert(`Document upload failed: ${err.message || "Please try again."}`);
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
      setUploadedFiles(prev => ({ ...prev, [type]: null }));
    }
  };
 
  const handleSubmitClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationText.trim() && !formData.gstCertificateUrl && !formData.businessRegistrationUrl) {
      alert("Please provide a clarification message or upload requested documents.");
      return;
    }

    setSubmittingClarification(true);
    try {
      const updatedForm = {
        ...formData,
        clarification_response: clarificationText.trim(),
        info_requested_reply: clarificationText.trim(),
      };
      const endpoint = dograhOrgId
        ? `${TALKAR_API}/customers/by-org/${dograhOrgId}/onboarding`
        : `${TALKAR_API}/customers/${customerData?.customer_id}/onboarding`;

      const docs = [
        ...(formData.gstCertificateUrl ? [{ type: "gst_certificate", url: formData.gstCertificateUrl }] : []),
        ...(formData.businessRegistrationUrl ? [{ type: "business_registration", url: formData.businessRegistrationUrl }] : []),
      ];

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form: updatedForm,
          documents: docs,
        }),
      });

      if (res.ok) {
        setCustomerData((prev: any) => ({
          ...prev,
          status: "under_review",
          onboarding_form: updatedForm,
          documents: docs,
        }));
        setStatus("under_review");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to submit clarification: ${err.detail || res.statusText}`);
      }
    } catch {
      alert("Failed to submit clarification. Please try again.");
    } finally {
      setSubmittingClarification(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-zinc-50 pointer-events-none -z-10" />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-orange-500" />
        <p className="text-sm font-medium text-zinc-500">Loading your Talkar workspace...</p>
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
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col relative overflow-x-hidden font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="absolute inset-0 bg-zinc-50 pointer-events-none -z-10" />
      
      {/* Background ambient glows - Light Mode adjusted */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-orange-50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-50 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Corporate Header */}
      <header className="w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo size="md" className="h-7" />
          </div>

          <div className="flex items-center gap-4">
            <div className="w-48">
              <SidebarTeamSwitcher />
            </div>
            <Button 
              variant="ghost" 
              onClick={() => void logout()} 
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg h-9 px-3 border border-zinc-200 cursor-pointer"
            >
              Sign Out
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-[10px] font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Account Setup
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Large Wide Space Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 z-10">
        
        {/* ── 3. PENDING APPROVAL: Premium Split-Screen Wizard ── */}
        {(status === "pending_approval" || status === "new" || status === "editing") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            
            {/* Optional Banner to switch to Shared Wallet if returning customer has an established account */}
            {(customerData?.has_existing_master || customerData?.existing_master) && (
              <div className="lg:col-span-12 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold text-xs">
                      Independent Billing Account
                    </Badge>
                    <span className="text-xs text-blue-700 font-medium">
                      Separate legal entity & GST invoices
                    </span>
                  </div>
                  <p className="text-xs text-blue-900/80 leading-relaxed">
                    Configuring an independent business entity with its own dedicated wallet and invoicing. Want this workspace to share your existing wallet ({customerData?.existing_company_name || "Primary Account"}) instead?
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={switchingBillingType}
                  onClick={handleSwitchToShared}
                  className="border-blue-300 text-blue-900 hover:bg-blue-100/90 font-medium text-xs whitespace-nowrap bg-white/90 shadow-xs"
                >
                  {switchingBillingType ? "Linking..." : "Switch to Shared Wallet →"}
                </Button>
              </div>
            )}
            
            {/* LEFT COLUMN: Progress & Navigation Timeline */}
            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-28">
              {/* Title removed per user request */}

              {/* Vertical Custom Timeline */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-200">
                {mainSteps.map((s) => {
                  const IconComp = s.icon;
                  const isDone = activeStep > s.num;
                  const isCurrent = activeStep === s.num;
                  return (
                    <div key={s.num} className="relative flex items-start gap-4">
                      {/* Node circle */}
                      <div 
                        className={`absolute -left-[20px] w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                          isCurrent ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-110" :
                          isDone ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                          "bg-white border-zinc-200 text-zinc-400"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{s.num}</span>}
                      </div>

                      <div className="space-y-1 pl-4">
                        <h4 className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                          isCurrent ? "text-orange-600" : isDone ? "text-emerald-600" : "text-zinc-400"
                        }`}>
                          {s.label}
                        </h4>
                        {isCurrent && (
                          <p className="text-[11px] text-zinc-500 max-w-xs leading-normal animate-in fade-in-50 duration-300">
                            Provide details for this section to continue.
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
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-xl font-bold text-zinc-900">Company Details</h3>
                      <p className="text-xs text-zinc-500 mt-1">Basic information about your business.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessName" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Company Name <span className="text-orange-500">*</span></Label>
                        <Input id="businessName" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} placeholder="e.g. Acme Inc." className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industry" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Industry <span className="text-orange-500">*</span></Label>
                        <Select required value={formData.industry} onValueChange={val => setFormData({...formData, industry: val})}>
                          <SelectTrigger className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all">
                            <SelectValue placeholder="Select Industry" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-zinc-200 text-zinc-900 rounded-xl">
                            <SelectItem value="Healthcare">Healthcare & Biotech</SelectItem>
                            <SelectItem value="Hospitality">Hospitality & Tourism</SelectItem>
                            <SelectItem value="Real Estate">Real Estate</SelectItem>
                            <SelectItem value="Education">Education & E-learning</SelectItem>
                            <SelectItem value="Retail">Retail & E-commerce</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gstNumber" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tax ID / GST <span className="text-zinc-400 font-normal">(optional)</span></Label>
                        <Input id="gstNumber" value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} placeholder="e.g., 27AAAAA0000A1Z5" className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companySize" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Team Size <span className="text-zinc-400 font-normal">(optional)</span></Label>
                        <Select value={formData.companySize} onValueChange={val => setFormData({...formData, companySize: val})}>
                          <SelectTrigger className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all">
                            <SelectValue placeholder="Select Team Size" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-zinc-200 text-zinc-900 rounded-xl">
                            <SelectItem value="1-10">1–10 employees</SelectItem>
                            <SelectItem value="11-50">11–50 employees</SelectItem>
                            <SelectItem value="51-200">51–200 employees</SelectItem>
                            <SelectItem value="200+">200+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="websiteUrl" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Website Address <span className="text-zinc-400 font-normal">(optional)</span></Label>
                        <Input id="websiteUrl" type="url" placeholder="https://www.company.com" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: CONTACT DETAILS */}
                {activeStep === 2 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-xl font-bold text-zinc-900">Contact Details</h3>
                      <p className="text-xs text-zinc-500 mt-1">Who should we contact for account updates?</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="pocName" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Your Name <span className="text-orange-500">*</span></Label>
                        <Input id="pocName" required value={formData.pocName} onChange={e => setFormData({...formData, pocName: e.target.value})} placeholder="e.g. Alex Johnson" className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pocPhone" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Phone Number <span className="text-orange-500">*</span></Label>
                        <Input id="pocPhone" type="tel" required value={formData.pocPhone} onChange={e => setFormData({...formData, pocPhone: e.target.value})} placeholder="e.g. +91 98765 43210" className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pocDesignation" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Role / Job Title <span className="text-zinc-400 font-normal">(optional)</span></Label>
                        <Input id="pocDesignation" placeholder="e.g. Founder" value={formData.pocDesignation} onChange={e => setFormData({...formData, pocDesignation: e.target.value})} className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: AGENT SETTINGS */}
                {activeStep === 3 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-xl font-bold text-zinc-900">Agent Settings</h3>
                      <p className="text-xs text-zinc-500 mt-1">How will your AI voice agent be used?</p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Call Type <span className="text-orange-500">*</span></Label>
                      <RadioGroup value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex items-center space-x-3 border border-zinc-200 bg-white p-4 rounded-xl cursor-pointer hover:bg-zinc-50 transition-all">
                          <RadioGroupItem value="inbound" id="inbound" className="border-zinc-300 text-orange-500 focus:ring-orange-500/10" />
                          <span className="text-xs font-medium text-zinc-900">Inbound (Answering Calls)</span>
                        </label>
                        <label className="flex items-center space-x-3 border border-zinc-200 bg-white p-4 rounded-xl cursor-pointer hover:bg-zinc-50 transition-all">
                          <RadioGroupItem value="outbound" id="outbound" className="border-zinc-300 text-orange-500 focus:ring-orange-500/10" />
                          <span className="text-xs font-medium text-zinc-900">Outbound (Making Calls)</span>
                        </label>
                        <label className="flex items-center space-x-3 border border-zinc-200 bg-white p-4 rounded-xl cursor-pointer hover:bg-zinc-50 transition-all">
                          <RadioGroupItem value="both" id="both" className="border-zinc-300 text-orange-500 focus:ring-orange-500/10" />
                          <span className="text-xs font-medium text-zinc-900">Both</span>
                        </label>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="useCaseDescription" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Describe what the agent should do <span className="text-orange-500">*</span></Label>
                      <Textarea
                        id="useCaseDescription"
                        placeholder="e.g. 'Answer calls, ask the customer what they need, and book an appointment for them.'"
                        value={formData.useCaseDescription}
                        onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                        rows={5}
                        className="bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 p-4 transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="callVolume" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Expected Call Volume / Month <span className="text-orange-500">*</span></Label>
                        <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                          <SelectTrigger className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all">
                            <SelectValue placeholder="Select Volume" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-zinc-200 text-zinc-900 rounded-xl">
                            <SelectItem value="<100">Less than 100</SelectItem>
                            <SelectItem value="100-500">100 - 500</SelectItem>
                            <SelectItem value="500-2000">500 - 2,000</SelectItem>
                            <SelectItem value="2000+">2,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="languages" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Languages Required <span className="text-orange-500">*</span></Label>
                        <Input id="languages" placeholder="e.g. English, Hindi" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="integrations" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tools you use (e.g. Salesforce, Slack) <span className="text-zinc-400 font-normal">(optional)</span></Label>
                        <Input id="integrations" placeholder="e.g. Salesforce, Google Sheets" value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: INTEGRATIONS & SETUP */}
                {activeStep === 4 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-xl font-bold text-zinc-900">Integrations</h3>
                      <p className="text-xs text-zinc-500 mt-1">Connect your existing tools to your voice agent.</p>
                    </div>

                    <div className="p-6 border border-zinc-200 bg-white rounded-2xl space-y-4">
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <Label htmlFor="needsApiIntegration" className="font-bold text-sm text-zinc-900 cursor-pointer">Need Custom API Integration?</Label>
                          <p className="text-xs text-zinc-500 mt-1">Check this if you need Talkar to connect to your custom software or webhooks.</p>
                        </div>
                        <Switch 
                          id="needsApiIntegration" 
                          checked={formData.needsApiIntegration} 
                          onCheckedChange={val => setFormData({...formData, needsApiIntegration: val})}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>

                      {formData.needsApiIntegration && (
                        <div className="space-y-2 pt-4 border-t border-zinc-200 animate-in slide-in-from-top-2 duration-200">
                          <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Provide API/Webhook Details <span className="text-orange-500">*</span></Label>
                          <Textarea
                            id="apiIntegrationDetails"
                            placeholder="Briefly describe what systems you want to connect..."
                            value={formData.apiIntegrationDetails}
                            onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                            rows={3}
                            className="bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 p-4 transition-all resize-none leading-relaxed"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Company Documents <span className="text-zinc-400 font-normal">(Optional)</span></Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label
                          htmlFor="gst-upload"
                          className={`border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            uploadedFiles.gst
                              ? "border-emerald-500 bg-emerald-50 hover:bg-emerald-100"
                              : "border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100"
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
                              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                <Check className="w-6 h-6 text-emerald-600" />
                              </div>
                              <p className="text-xs font-bold text-emerald-700 max-w-full truncate px-2">{uploadedFiles.gst.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{(uploadedFiles.gst.size / 1024).toFixed(1)} KB · Click to replace</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
                              <p className="text-xs font-bold text-zinc-900">Tax Registration Doc</p>
                              <p className="text-[10px] text-zinc-500 mt-1">PDF, JPG or PNG · Click to select</p>
                            </>
                          )}
                          {uploadProgress.gst > 0 && uploadProgress.gst < 100 && (
                            <div className="w-full mt-4 bg-zinc-200 rounded-full h-1 overflow-hidden">
                              <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all duration-150" style={{ width: `${uploadProgress.gst}%` }} />
                            </div>
                          )}
                        </label>

                        <label
                          htmlFor="reg-upload"
                          className={`border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            uploadedFiles.reg
                              ? "border-emerald-500 bg-emerald-50 hover:bg-emerald-100"
                              : "border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100"
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
                              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                <Check className="w-6 h-6 text-emerald-600" />
                              </div>
                              <p className="text-xs font-bold text-emerald-700 max-w-full truncate px-2">{uploadedFiles.reg.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{(uploadedFiles.reg.size / 1024).toFixed(1)} KB · Click to replace</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-8 h-8 text-orange-500 mb-2" />
                              <p className="text-xs font-bold text-zinc-900">Company Incorporation Doc</p>
                              <p className="text-[10px] text-zinc-500 mt-1">PDF, JPG or PNG · Click to select</p>
                            </>
                          )}
                          {uploadProgress.reg > 0 && uploadProgress.reg < 100 && (
                            <div className="w-full mt-4 bg-zinc-200 rounded-full h-1 overflow-hidden">
                              <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all duration-150" style={{ width: `${uploadProgress.reg}%` }} />
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Action Footer - Spacious & Clean */}
                <div className="flex items-center justify-between pt-8 border-t border-zinc-200">
                  {activeStep > 1 ? (
                    <Button type="button" variant="outline" onClick={handlePrevStep} className="border-zinc-300 text-zinc-600 hover:bg-zinc-50 rounded-xl h-12 px-6">
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
                      {submitting ? "Submitting Application..." : "Submit Activation Request"}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                  <Bot className="w-6 h-6 text-orange-500" />
                  Voice Agent Objectives
                </h2>
                <p className="text-sm text-zinc-500 mt-1">Tell us about this voice agent.</p>
              </div>
              <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600 font-mono text-[10px] px-3 py-1 rounded-full">
                Step {briefStep} of 2
              </Badge>
            </div>

            {/* Shared vs Independent Billing Selector Banner */}
            <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/80 border border-amber-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-xs">
                    Shared Wallet
                  </Badge>
                  <span className="text-xs text-amber-700 font-medium">
                    Linked to primary company billing
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed max-w-xl">
                  This workspace draws call credits from your master organization wallet. Need separate GST invoicing, a dedicated credit card, or an isolated budget for this business entity?
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={switchingBillingType}
                onClick={handleSwitchToIndependent}
                className="border-amber-300 text-amber-900 hover:bg-amber-100/90 font-medium text-xs whitespace-nowrap bg-white/90 shadow-xs"
              >
                {switchingBillingType ? "Updating..." : "Set Up Independent Billing →"}
              </Button>
            </div>

            <form onSubmit={handleSubmitBrief} className="space-y-10">
              {briefStep === 1 ? (
                <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="useCaseType" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Call Type <span className="text-orange-500">*</span></Label>
                      <Select value={formData.useCaseType} onValueChange={val => setFormData({...formData, useCaseType: val})}>
                        <SelectTrigger className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-zinc-200 text-zinc-900 rounded-xl">
                          <SelectItem value="inbound">Incoming Calls Only</SelectItem>
                          <SelectItem value="outbound">Outgoing Calls Only</SelectItem>
                          <SelectItem value="both">Both (Incoming & Outgoing)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="callVolume" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Expected Call Minutes <span className="text-orange-500">*</span></Label>
                      <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                        <SelectTrigger className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 px-4">
                          <SelectValue placeholder="Select Volume" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-zinc-200 text-zinc-900 rounded-xl">
                          <SelectItem value="<1000">Less than 1,000 minutes</SelectItem>
                          <SelectItem value="1000-5000">1,000 – 5,000 minutes</SelectItem>
                          <SelectItem value="5000-10000">5,000 – 10,000 minutes</SelectItem>
                          <SelectItem value="10000+">10,000+ minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Agent Languages <span className="text-orange-500">*</span></Label>
                    <Input id="languages" className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 px-4" placeholder="e.g. English, Hindi" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCaseDescription" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">What should this agent do? <span className="text-orange-500">*</span></Label>
                    <Textarea
                      id="useCaseDescription"
                      placeholder="e.g. 'Answer room booking questions, capture customer name, check availability, book slot.'"
                      value={formData.useCaseDescription}
                      onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                      rows={5}
                      className="bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 p-4 transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="p-6 border border-zinc-200 bg-white rounded-2xl space-y-4">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <Label htmlFor="needsApiIntegration" className="font-bold text-sm text-zinc-900 cursor-pointer">CRM / Database Connection Needed?</Label>
                        <p className="text-xs text-zinc-500 mt-1">Check if the agent needs to read or write live details to your CRM or custom API.</p>
                      </div>
                      <Switch
                        id="needsApiIntegration"
                        checked={formData.needsApiIntegration}
                        onCheckedChange={(checked) => setFormData({...formData, needsApiIntegration: checked})}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>

                    {formData.needsApiIntegration && (
                      <div className="space-y-2 pt-4 border-t border-zinc-200 animate-in slide-in-from-top-2 duration-200">
                        <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">API/Webhook Details <span className="text-orange-500">*</span></Label>
                        <Textarea
                          id="apiIntegrationDetails"
                          placeholder="Provide details about endpoints, tools, or webhooks you need to connect..."
                          value={formData.apiIntegrationDetails}
                          onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                          rows={5}
                          className="bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 p-4 leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-8 border-t border-zinc-200">
                {briefStep > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setBriefStep(1)} className="border-zinc-300 text-zinc-600 hover:bg-zinc-50 rounded-xl h-12 px-6">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                ) : <div />}

                {briefStep < 2 ? (
                  <Button key="next-brief-btn" type="button" onClick={() => {
                    if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
                      alert("Please complete all required fields on Step 1.");
                      return;
                    }
                    setBriefStep(2);
                  }} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-semibold shadow-lg shadow-orange-500/10">
                    Continue to Integrations <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button key="submit-brief-btn" type="button" disabled={submitting} onClick={handleSubmitBrief as any} className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-bold min-w-[160px] shadow-lg shadow-orange-500/25">
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
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900">Information Saved</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Your voice agent details have been updated. Our team is setting up your workspace now.
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={() => router.push("/overview")} className="bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-xl h-12 px-8">
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── INFO REQUESTED SCREEN ── */}
        {status === "info_requested" && (
          <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
            {/* Minimal Status Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Quick clarification needed
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Action Required: Additional Information
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Our onboarding team reviewed your setup request and has a question before we can activate your line.
              </p>
            </div>

            {/* Note Card with Admin Message */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 w-full">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Message from Onboarding Team
                  </p>
                  <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                    <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed whitespace-pre-line font-medium">
                      {customerData?.info_requested_message || "We reviewed your onboarding application and need a brief clarification regarding your call flow or business verification before we can activate your account."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">Contact person</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{formData.pocName || "Account Owner"}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">Official support channel</span>
                  <a href="mailto:support@talkar.in?subject=Application%20Clarification%20Inquiry" className="font-medium text-orange-600 dark:text-orange-400 hover:underline">
                    support@talkar.in
                  </a>
                </div>
              </div>
            </div>

            {/* Clarification & Document Re-Upload Form */}
            <form onSubmit={handleSubmitClarification} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="space-y-2">
                <Label htmlFor="clarification-response" className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Your Clarification / Response <span className="text-orange-500">*</span>
                </Label>
                <Textarea
                  id="clarification-response"
                  rows={4}
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  placeholder="Provide answers to the team's questions, describe any updates to your call flow, or share additional business details..."
                  className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-orange-500"
                />
              </div>

              {/* Document Re-upload Components */}
              <div className="space-y-2.5 pt-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Re-upload Verification Documents (Optional)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <label
                    htmlFor="clarification-gst-upload"
                    className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      uploadedFiles.gst
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20"
                        : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 bg-zinc-50 dark:bg-zinc-800/40"
                    }`}
                  >
                    <input
                      type="file"
                      id="clarification-gst-upload"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect("gst", e)}
                    />
                    {uploadedFiles.gst ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-600 mb-1" />
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate max-w-[180px]">{uploadedFiles.gst.name}</p>
                        <p className="text-[10px] text-zinc-500">Click to replace</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5 text-orange-500 mb-1" />
                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">GST / Tax Document</p>
                        <p className="text-[10px] text-zinc-500">PDF, JPG, PNG</p>
                      </>
                    )}
                    {uploadProgress.gst > 0 && uploadProgress.gst < 100 && (
                      <div className="w-full mt-2 bg-zinc-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all" style={{ width: `${uploadProgress.gst}%` }} />
                      </div>
                    )}
                  </label>

                  <label
                    htmlFor="clarification-reg-upload"
                    className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      uploadedFiles.reg
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20"
                        : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 bg-zinc-50 dark:bg-zinc-800/40"
                    }`}
                  >
                    <input
                      type="file"
                      id="clarification-reg-upload"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect("reg", e)}
                    />
                    {uploadedFiles.reg ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-600 mb-1" />
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate max-w-[180px]">{uploadedFiles.reg.name}</p>
                        <p className="text-[10px] text-zinc-500">Click to replace</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5 text-orange-500 mb-1" />
                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Business Registration</p>
                        <p className="text-[10px] text-zinc-500">PDF, JPG, PNG</p>
                      </>
                    )}
                    {uploadProgress.reg > 0 && uploadProgress.reg < 100 && (
                      <div className="w-full mt-2 bg-zinc-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full transition-all" style={{ width: `${uploadProgress.reg}%` }} />
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submittingClarification}
                  className="w-full h-11 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white font-semibold rounded-xl text-xs transition-opacity shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {submittingClarification ? "Submitting Clarification..." : "Submit Clarification & Update Application"}
                </Button>
              </div>
            </form>

            {/* Official Support & Sign Out */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="mailto:support@talkar.in?subject=Application%20Clarification%20Support"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-xl text-xs transition-colors shadow-xs"
              >
                <Mail className="w-4 h-4 text-orange-400 dark:text-orange-500" />
                Email Support (support@talkar.in)
              </a>
              <Button
                variant="outline"
                className="h-11 px-6 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs"
                onClick={() => void logout()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}

        {/* ── 4. UNDER REVIEW SCREEN ── */}
        {status === "under_review" && (
          <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
            {/* Minimal Status Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Application in review
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                We&apos;re setting up your phone line
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Our team is checking your details and preparing your voice agent. We usually finish within 2 to 4 hours.
              </p>
            </div>

            {/* Simple Step Timeline — Plain English, Zero Jargon */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-5">
                What happens next
              </h3>
              <div className="space-y-6">
                {/* Step 1: Received */}
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Details received
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Your business profile and call requirements are saved.
                    </p>
                  </div>
                </div>

                {/* Step 2: Setting up */}
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Phone line & agent setup
                      </p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400">
                        In progress
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      We assign your phone number and configure the agent greeting.
                    </p>
                  </div>
                </div>

                {/* Step 3: Ready */}
                <div className="flex items-start gap-3.5 opacity-60">
                  <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-semibold">3</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Test call & launch
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      You&apos;ll get an email to test dial your agent and start taking calls.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Summary Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Submitted details</span>
                <span>Active Submission</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Business:</span>{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {customerData?.organization?.name || formData.businessName || "Your Organization"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Calls:</span>{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                    {formData.useCaseType === "both" ? "Inbound & Outbound" : formData.useCaseType}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Languages:</span>{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{formData.languages || "English, Hindi"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Volume:</span>{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{formData.callVolume || "1,000 - 5,000"} calls/mo</span>
                </div>
              </div>
            </div>

            {/* Direct human help */}
            <div className="text-center pt-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Need to change anything? Email us at{" "}
                <a href="mailto:support@talkar.in" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                  support@talkar.in
                </a>
              </p>
            </div>
          </div>
        )}

        {/* ── 5. APPROVED SCREEN: Setup Fee Activation ── */}
        {status === "approved" && (
          <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
            {/* Minimal Status Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Application approved
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Activate your voice agent
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Your workspace is pre-configured. Complete the one-time line setup fee to receive your active phone number and dial in.
              </p>
            </div>

            {/* Minimal Invoice Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Dedicated Phone Line & Workspace
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {customerData?.onboarding_form?.integration_description || "Includes virtual number allocation, prompt calibration, and testing."}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {customerData?.onboarding_form?.integration_fee_paise 
                      ? `₹${(customerData.onboarding_form.integration_fee_paise / 100).toLocaleString()}`
                      : "₹15,000"}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">one-time</span>
                </div>
              </div>

              {/* What is covered list */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dedicated business phone number (Inbound & Outbound)</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Custom greeting and conversation flow</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Live test dialing with our onboarding engineer</span>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Direct WhatsApp & phone support channel</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2 text-center">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-medium h-11 px-8 rounded-xl text-xs cursor-pointer shadow-xs" 
                onClick={handlePaySetupFee}
              >
                <CreditCard className="w-4 h-4 mr-2" /> Pay Setup Fee & Activate
              </Button>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Secure checkout via Razorpay · Instant activation upon completion
              </p>
            </div>
          </div>
        )}

        {/* ── 6. REJECTED SCREEN ── */}
        {status === "rejected" && (() => {
          const remainingDays = typeof customerData?.remaining_days === "number"
            ? customerData.remaining_days
            : (typeof customerData?.reapply_countdown_days === "number"
              ? customerData.reapply_countdown_days
              : (customerData?.reapply_countdown === "0d 0h" ? 0 : 30));
          const isEligible = remainingDays <= 0;

          return (
            <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
              {/* Minimal Status Header */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Application not approved
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Application Status Update
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  We are unable to approve your voice agent onboarding application at this time based on our verification criteria.
                </p>
              </div>

              {/* Rejection Details Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Reason for Rejection
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {customerData?.rejection_reason || "Verification details did not satisfy our telecom compliance and verification policies."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="text-zinc-400 dark:text-zinc-500">Reapplication Eligible In</span>
                    <span className={`font-semibold flex items-center gap-1.5 ${isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {isEligible ? "Eligible now" : (customerData?.reapply_countdown || "30d 0h")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span className="text-zinc-400 dark:text-zinc-500">Registered Business</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {customerData?.company_name || formData.businessName || "Your Organization"}
                    </span>
                  </div>
                </div>

                {isEligible && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      className="w-full h-11 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white font-semibold rounded-xl text-xs transition-opacity shadow-xs cursor-pointer flex items-center justify-center gap-2"
                      onClick={() => {
                        setActiveStep(1);
                        setStatus("editing");
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Re-Apply Now
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                {isEligible && (
                  <Button
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-95 text-white font-medium rounded-xl text-xs transition-opacity shadow-xs cursor-pointer"
                    onClick={() => {
                      setActiveStep(1);
                      setStatus("editing");
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Re-Apply Now
                  </Button>
                )}
                <a
                  href="mailto:support@talkar.in?subject=Application%20Rejection%20Inquiry"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-xl text-xs transition-colors shadow-xs"
                >
                  <Mail className="w-4 h-4 text-orange-400 dark:text-orange-500" />
                  Contact Support Team
                </a>
                <Button
                  variant="outline"
                  className="h-11 px-6 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs"
                  onClick={() => void logout()}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          );
        })()}

        {/* ── 7. CHURNED SCREEN ── */}
        {status === "churned" && (
          <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
            {/* Minimal Status Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-700 dark:text-zinc-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                Account Closed
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Workspace Decommissioned
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                This account was permanently closed following prolonged suspension exceeding 45 days.
              </p>
            </div>

            {/* Churned Details Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Resource Release &amp; Closure Notice
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    All reserved telephony lines (DIDs), speech models, and agent configurations associated with this organization have been released back to the telecom pool.
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">Account ID</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {customerData?.id || dograhOrgId || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">Status</span>
                  <span className="font-medium text-rose-600 dark:text-rose-400">Churned (Permanent)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="mailto:support@talkar.in?subject=Reopen%20Churned%20Account%20Inquiry"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-xl text-xs transition-colors shadow-xs"
              >
                <Mail className="w-4 h-4 text-orange-400 dark:text-orange-500" />
                Contact Talkar Support
              </a>
              <Button
                variant="outline"
                className="h-11 px-6 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs"
                onClick={() => void logout()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
