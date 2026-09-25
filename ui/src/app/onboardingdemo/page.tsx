"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  Clock, CheckCircle2, CreditCard, UploadCloud, RotateCcw, Wand2, Layers, MessageSquare
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { TalkarBootAnimation } from "./TalkarBootAnimation";

export default function OnboardingDemoPage() {
  // Boot Animation state (plays on entering onboarding demo)
  const [showBootAnimation, setShowBootAnimation] = useState(true);

  // Demo Mode Status switcher: "wizard" | "under_review" | "new_agent_brief" | "brief_submitted" | "info_requested" | "approved"
  const [status, setStatus] = useState<string>("wizard");
  const [submitting, setSubmitting] = useState(false);

  // Form State — exact fields from real onboarding
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

  // Upload State (purely frontend simulation)
  const [uploadProgress, setUploadProgress] = useState({ gst: 0, reg: 0 });
  const [uploadedFiles, setUploadedFiles] = useState<{ gst: { name: string; size: number } | null; reg: { name: string; size: number } | null }>({ gst: null, reg: null });

  // Quick fill sample data for fast testing
  const handleFillSampleData = () => {
    setFormData({
      businessName: "Acme Healthcare Corp",
      industry: "Healthcare",
      gstNumber: "27ABCDE1234F1Z5",
      companySize: "11-50",
      websiteUrl: "https://acmehealth.example.com",
      pocName: "Arnav Sharma",
      pocPhone: "+91 98765 43210",
      pocDesignation: "Head of Operations",
      useCaseType: "both",
      useCaseDescription: "Handle inbound patient inquiries, check doctor schedules, and automatically book clinical appointments. Also make outbound appointment confirmation calls 24 hours prior.",
      callVolume: "500-2000",
      languages: "English, Hindi",
      integrations: "Salesforce CRM, Google Calendar, Slack",
      needsApiIntegration: true,
      apiIntegrationDetails: "Webhooks to POST appointment booking payloads into our internal EHR API endpoint (https://api.acmehealth.example.com/v1/appointments).",
      gstCertificateUrl: "sample_gst.pdf",
      businessRegistrationUrl: "sample_incorporation.pdf",
    });
    setUploadedFiles({
      gst: { name: "acme_gst_certificate.pdf", size: 245000 },
      reg: { name: "acme_incorporation_doc.pdf", size: 480000 },
    });
    setUploadProgress({ gst: 100, reg: 100 });
    toast.success("Sample data populated across all steps!");
  };

  const handleClearForm = () => {
    setFormData({
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
    setUploadedFiles({ gst: null, reg: null });
    setUploadProgress({ gst: 0, reg: 0 });
    setActiveStep(1);
    toast.info("Form reset to empty");
  };

  // Step Validation Handlers
  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.businessName.trim() || !formData.industry) {
        toast.error("Please fill in required fields (Company Name, Industry)");
        return false;
      }
    } else if (step === 2) {
      if (!formData.pocName.trim() || !formData.pocPhone.trim()) {
        toast.error("Please fill in required fields (Full Name, Phone Number)");
        return false;
      }
    } else if (step === 3) {
      if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
        toast.error("Please fill in required fields (Objective, Volume, Languages)");
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

  // Mock Submission Handler for Main Application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep < 4) {
      handleNextStep();
      return;
    }

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    if (formData.needsApiIntegration && !formData.apiIntegrationDetails.trim()) {
      toast.error("Please provide details for your custom CRM/API integration in Step 4.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStatus("under_review");
      toast.success("Application submitted in demo mode! Transitioned to 'Under Review'");
    }, 900);
  };

  // Mock Submission Handler for 2nd Agent Brief
  const handleSubmitBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (briefStep < 2) {
      setBriefStep(2);
      return;
    }

    if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
      toast.error("Please fill in all use case fields so we can configure your agent.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStatus("brief_submitted");
      toast.success("Agent brief submitted in demo mode!");
    }, 800);
  };

  // Mock File Upload Simulator
  const handleFileSelect = (type: "gst" | "reg", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFiles(prev => ({ ...prev, [type]: { name: file.name, size: file.size } }));
    setUploadProgress(prev => ({ ...prev, [type]: 20 }));

    setTimeout(() => {
      setUploadProgress(prev => ({ ...prev, [type]: 65 }));
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [type]: 100 }));
        toast.success(`Uploaded ${file.name} (Simulated)`);
      }, 250);
    }, 200);
  };

  const mainSteps = [
    { num: 1, label: "Company Profile", icon: Building2 },
    { num: 2, label: "Contact Details", icon: User },
    { num: 3, label: "Agent Settings", icon: Bot },
    { num: 4, label: "Integrations & Setup", icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col relative overflow-x-hidden font-sans">
      <div className="absolute inset-0 bg-zinc-50 pointer-events-none -z-10" />
      
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-orange-50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-50 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── SANDBOX DEMO CONTROL BAR (Sticky Top) ── */}
      <div className="w-full bg-zinc-950 text-white px-4 py-2.5 z-40 border-b border-zinc-800 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-zinc-200">DEMO SANDBOX</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400">Pure Frontend · Zero Backend API Calls</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Screen State Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Screen:
              </span>
              <button
                type="button"
                onClick={() => setStatus("wizard")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  status === "wizard" ? "bg-orange-500 text-white font-bold" : "text-zinc-300 hover:text-white"
                }`}
              >
                Wizard
              </button>
              <button
                type="button"
                onClick={() => setStatus("under_review")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  status === "under_review" ? "bg-orange-500 text-white font-bold" : "text-zinc-300 hover:text-white"
                }`}
              >
                Under Review
              </button>
              <button
                type="button"
                onClick={() => setStatus("new_agent_brief")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  status === "new_agent_brief" ? "bg-orange-500 text-white font-bold" : "text-zinc-300 hover:text-white"
                }`}
              >
                2nd Brief
              </button>
              <button
                type="button"
                onClick={() => setStatus("info_requested")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  status === "info_requested" ? "bg-orange-500 text-white font-bold" : "text-zinc-300 hover:text-white"
                }`}
              >
                Info Request
              </button>
              <button
                type="button"
                onClick={() => setStatus("approved")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  status === "approved" ? "bg-orange-500 text-white font-bold" : "text-zinc-300 hover:text-white"
                }`}
              >
                Approved
              </button>
            </div>

            {/* Quick Actions */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleFillSampleData}
              className="h-7 text-xs border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <Wand2 className="w-3 h-3 mr-1 text-orange-400" /> Fill Sample Data
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClearForm}
              className="h-7 text-xs border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 mr-1 text-zinc-400" /> Clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowBootAnimation(true)}
              className="h-7 text-xs border-orange-500/50 bg-gradient-to-r from-orange-950/60 to-zinc-900 text-orange-300 hover:text-white hover:border-orange-400 cursor-pointer font-medium"
            >
              <Sparkles className="w-3 h-3 mr-1 text-orange-400" /> Replay Boot
            </Button>
          </div>
        </div>
      </div>

      {/* Boot Animation Overlay (Demo Only) */}
      {showBootAnimation && (
        <TalkarBootAnimation
          onComplete={() => setShowBootAnimation(false)}
          onSkip={() => setShowBootAnimation(false)}
        />
      )}

      {/* Corporate Header */}
      <header className="w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-[41px] z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" className="h-7" />
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider border-orange-200 bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
              Demo Mode
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-[10px] font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Account Setup
            </div>
            <Link href="/overview" className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
              Exit Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 lg:py-16 z-10">
        
        {/* ── 1. MAIN ONBOARDING WIZARD (4 Steps) ── */}
        {status === "wizard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            
            {/* LEFT COLUMN: Progress & Navigation Timeline */}
            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-36">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-zinc-900">Get Started</h2>
                <p className="text-xs text-zinc-500">Complete 4 quick steps to configure your Talkar AI voice workspace.</p>
              </div>

              {/* Vertical Custom Timeline with Clickable Steps */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-200">
                {mainSteps.map((s) => {
                  const isDone = activeStep > s.num;
                  const isCurrent = activeStep === s.num;
                  return (
                    <div 
                      key={s.num} 
                      onClick={() => setActiveStep(s.num)}
                      className="relative flex items-start gap-4 cursor-pointer group"
                    >
                      {/* Node circle */}
                      <div 
                        className={`absolute -left-[20px] w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                          isCurrent ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-110" :
                          isDone ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                          "bg-white border-zinc-200 text-zinc-400 group-hover:border-zinc-300"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{s.num}</span>}
                      </div>

                      <div className="space-y-1 pl-4">
                        <h4 className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                          isCurrent ? "text-orange-600" : isDone ? "text-emerald-600" : "text-zinc-500 group-hover:text-zinc-800"
                        }`}>
                          {s.label}
                        </h4>
                        {isCurrent && (
                          <p className="text-[11px] text-zinc-500 max-w-xs leading-normal animate-in fade-in-50 duration-300">
                            {s.num === 1 && "Basic information about your business."}
                            {s.num === 2 && "Primary point of contact for your account."}
                            {s.num === 3 && "Tell us how your AI agent should handle calls."}
                            {s.num === 4 && "Integrations, CRM, and verification docs."}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step quick jumps */}
              <div className="pt-2 flex items-center gap-1.5 border-t border-zinc-200">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Jump to:</span>
                {[1, 2, 3, 4].map((stepNum) => (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => setActiveStep(stepNum)}
                    className={`h-6 w-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activeStep === stepNum
                        ? "bg-orange-500 text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {stepNum}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: The Form Content */}
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
                        <Label htmlFor="businessName" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Company Name <span className="text-orange-500">*</span>
                        </Label>
                        <Input 
                          id="businessName" 
                          required 
                          value={formData.businessName} 
                          onChange={e => setFormData({...formData, businessName: e.target.value})} 
                          placeholder="e.g. Acme Healthcare Inc." 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industry" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Industry <span className="text-orange-500">*</span>
                        </Label>
                        <Select value={formData.industry} onValueChange={val => setFormData({...formData, industry: val})}>
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
                        <Label htmlFor="gstNumber" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Tax ID / GST <span className="text-zinc-400 font-normal">(optional)</span>
                        </Label>
                        <Input 
                          id="gstNumber" 
                          value={formData.gstNumber} 
                          onChange={e => setFormData({...formData, gstNumber: e.target.value})} 
                          placeholder="e.g. 27AAAAA0000A1Z5" 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companySize" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Team Size <span className="text-zinc-400 font-normal">(optional)</span>
                        </Label>
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
                        <Label htmlFor="websiteUrl" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Website Address <span className="text-zinc-400 font-normal">(optional)</span>
                        </Label>
                        <Input 
                          id="websiteUrl" 
                          type="url" 
                          placeholder="https://www.company.com" 
                          value={formData.websiteUrl} 
                          onChange={e => setFormData({...formData, websiteUrl: e.target.value})} 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
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
                        <Label htmlFor="pocName" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Your Name <span className="text-orange-500">*</span>
                        </Label>
                        <Input 
                          id="pocName" 
                          required 
                          value={formData.pocName} 
                          onChange={e => setFormData({...formData, pocName: e.target.value})} 
                          placeholder="e.g. Alex Johnson" 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pocPhone" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Phone Number <span className="text-orange-500">*</span>
                        </Label>
                        <Input 
                          id="pocPhone" 
                          type="tel" 
                          required 
                          value={formData.pocPhone} 
                          onChange={e => setFormData({...formData, pocPhone: e.target.value})} 
                          placeholder="e.g. +91 98765 43210" 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pocDesignation" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Role / Job Title <span className="text-zinc-400 font-normal">(optional)</span>
                        </Label>
                        <Input 
                          id="pocDesignation" 
                          placeholder="e.g. Founder / COO" 
                          value={formData.pocDesignation} 
                          onChange={e => setFormData({...formData, pocDesignation: e.target.value})} 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
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
                      <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Call Type <span className="text-orange-500">*</span>
                      </Label>
                      <RadioGroup 
                        value={formData.useCaseType} 
                        onValueChange={val => setFormData({...formData, useCaseType: val})} 
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
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
                      <Label htmlFor="useCaseDescription" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Describe what the agent should do <span className="text-orange-500">*</span>
                      </Label>
                      <Textarea
                        id="useCaseDescription"
                        placeholder="e.g. 'Answer incoming customer support calls, verify their order status from our store, and transfer complex issues to an executive.'"
                        value={formData.useCaseDescription}
                        onChange={e => setFormData({...formData, useCaseDescription: e.target.value})}
                        rows={5}
                        className="bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 p-4 transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="callVolume" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Expected Call Volume / Month <span className="text-orange-500">*</span>
                        </Label>
                        <Select value={formData.callVolume} onValueChange={val => setFormData({...formData, callVolume: val})}>
                          <SelectTrigger className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all">
                            <SelectValue placeholder="Select Volume" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-zinc-200 text-zinc-900 rounded-xl">
                            <SelectItem value="<100">Less than 100 calls</SelectItem>
                            <SelectItem value="100-500">100 - 500 calls</SelectItem>
                            <SelectItem value="500-2000">500 - 2,000 calls</SelectItem>
                            <SelectItem value="2000+">2,000+ calls</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="languages" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Languages Required <span className="text-orange-500">*</span>
                        </Label>
                        <Input 
                          id="languages" 
                          placeholder="e.g. English, Hindi, Spanish" 
                          value={formData.languages} 
                          onChange={e => setFormData({...formData, languages: e.target.value})} 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="integrations" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Tools you use <span className="text-zinc-400 font-normal">(optional)</span>
                        </Label>
                        <Input 
                          id="integrations" 
                          placeholder="e.g. Salesforce, HubSpot, Slack, Google Calendar" 
                          value={formData.integrations} 
                          onChange={e => setFormData({...formData, integrations: e.target.value})} 
                          className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 px-4 transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: INTEGRATIONS & SETUP */}
                {activeStep === 4 && (
                  <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-xl font-bold text-zinc-900">Integrations & Verification</h3>
                      <p className="text-xs text-zinc-500 mt-1">Connect your existing software and upload business docs.</p>
                    </div>

                    <div className="p-6 border border-zinc-200 bg-white rounded-2xl space-y-4">
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <Label htmlFor="needsApiIntegration" className="font-bold text-sm text-zinc-900 cursor-pointer">
                            Need Custom API Integration?
                          </Label>
                          <p className="text-xs text-zinc-500 mt-1">
                            Check this if your voice agent needs custom webhooks or internal database connectors.
                          </p>
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
                          <Label htmlFor="apiIntegrationDetails" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            Provide API / Webhook Details <span className="text-orange-500">*</span>
                          </Label>
                          <Textarea
                            id="apiIntegrationDetails"
                            placeholder="Briefly describe what systems you want to connect, expected API endpoints, or auth methods..."
                            value={formData.apiIntegrationDetails}
                            onChange={e => setFormData({...formData, apiIntegrationDetails: e.target.value})}
                            rows={3}
                            className="bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 focus:ring-orange-500/10 p-4 transition-all resize-none leading-relaxed"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Company Documents <span className="text-zinc-400 font-normal">(Optional · Simulated Upload)</span>
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label
                          htmlFor="gst-upload-demo"
                          className={`border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            uploadedFiles.gst
                              ? "border-emerald-500 bg-emerald-50 hover:bg-emerald-100"
                              : "border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100"
                          }`}
                        >
                          <input
                            type="file"
                            id="gst-upload-demo"
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
                          htmlFor="reg-upload-demo"
                          className={`border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            uploadedFiles.reg
                              ? "border-emerald-500 bg-emerald-50 hover:bg-emerald-100"
                              : "border-zinc-300 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100"
                          }`}
                        >
                          <input
                            type="file"
                            id="reg-upload-demo"
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

                {/* Wizard Action Footer */}
                <div className="flex items-center justify-between pt-8 border-t border-zinc-200">
                  {activeStep > 1 ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handlePrevStep} 
                      className="border-zinc-300 text-zinc-600 hover:bg-zinc-50 rounded-xl h-12 px-6 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                    </Button>
                  ) : <div />}

                  {activeStep < 4 ? (
                    <Button 
                      key="next-step-btn" 
                      type="button" 
                      onClick={handleNextStep} 
                      className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-semibold shadow-lg shadow-orange-500/10 cursor-pointer"
                    >
                      Next Step <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      key="submit-btn" 
                      type="button" 
                      disabled={submitting} 
                      onClick={handleSubmit as any} 
                      className="bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-orange-500/25 min-w-[180px] cursor-pointer"
                    >
                      {submitting ? "Submitting (Simulated)..." : "Submit Activation Request"}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 2. NEW AGENT BRIEF (2 Steps) ── */}
        {status === "new_agent_brief" && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                  <Bot className="w-6 h-6 text-orange-500" />
                  Voice Agent Objectives (Sub-Org Brief)
                </h2>
                <p className="text-sm text-zinc-500 mt-1">Configure second voice agent for this workspace.</p>
              </div>
              <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600 font-mono text-[10px] px-3 py-1 rounded-full">
                Step {briefStep} of 2
              </Badge>
            </div>

            <form onSubmit={handleSubmitBrief} className="space-y-10">
              {briefStep === 1 ? (
                <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="briefUseCaseType" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Call Type <span className="text-orange-500">*</span>
                      </Label>
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
                      <Label htmlFor="briefCallVolume" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Expected Call Minutes <span className="text-orange-500">*</span>
                      </Label>
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
                    <Label htmlFor="briefLanguages" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Agent Languages <span className="text-orange-500">*</span>
                    </Label>
                    <Input 
                      id="briefLanguages" 
                      className="h-12 bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl focus:border-orange-500 px-4" 
                      placeholder="e.g. English, Hindi" 
                      value={formData.languages} 
                      onChange={e => setFormData({...formData, languages: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="briefUseCaseDescription" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      What should this agent do? <span className="text-orange-500">*</span>
                    </Label>
                    <Textarea
                      id="briefUseCaseDescription"
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
                        <Label htmlFor="briefNeedsApiIntegration" className="font-bold text-sm text-zinc-900 cursor-pointer">
                          CRM / Database Connection Needed?
                        </Label>
                        <p className="text-xs text-zinc-500 mt-1">
                          Check if the agent needs to read or write live details to your CRM or custom API.
                        </p>
                      </div>
                      <Switch
                        id="briefNeedsApiIntegration"
                        checked={formData.needsApiIntegration}
                        onCheckedChange={(checked) => setFormData({...formData, needsApiIntegration: checked})}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>

                    {formData.needsApiIntegration && (
                      <div className="space-y-2 pt-4 border-t border-zinc-200 animate-in slide-in-from-top-2 duration-200">
                        <Label htmlFor="briefApiIntegrationDetails" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          API/Webhook Details <span className="text-orange-500">*</span>
                        </Label>
                        <Textarea
                          id="briefApiIntegrationDetails"
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
                  <Button type="button" variant="outline" onClick={() => setBriefStep(1)} className="border-zinc-300 text-zinc-600 hover:bg-zinc-50 rounded-xl h-12 px-6 cursor-pointer">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                ) : <div />}

                {briefStep < 2 ? (
                  <Button 
                    key="next-brief-btn" 
                    type="button" 
                    onClick={() => {
                      if (!formData.useCaseDescription.trim() || !formData.callVolume || !formData.languages.trim()) {
                        toast.error("Please complete all required fields on Step 1.");
                        return;
                      }
                      setBriefStep(2);
                    }} 
                    className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-semibold shadow-lg shadow-orange-500/10 cursor-pointer"
                  >
                    Continue to Integrations <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    key="submit-brief-btn" 
                    type="button" 
                    disabled={submitting} 
                    onClick={handleSubmitBrief as any} 
                    className="bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 rounded-xl h-12 px-8 font-bold min-w-[160px] shadow-lg shadow-orange-500/25 cursor-pointer"
                  >
                    {submitting ? "Submitting..." : "Submit Agent Details"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── 3. BRIEF SUBMITTED CONFIRMATION ── */}
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
            <div className="pt-4 flex justify-center gap-3">
              <Button onClick={() => setStatus("wizard")} variant="outline" className="rounded-xl h-12 px-6 cursor-pointer">
                Back to Wizard Demo
              </Button>
            </div>
          </div>
        )}

        {/* ── 4. INFO REQUESTED SCREEN ── */}
        {status === "info_requested" && (
          <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
            {/* Minimal Status Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Quick clarification needed
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                We need a few more details
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Our team reviewed your setup request and has a quick question before we can activate your line.
              </p>
            </div>

            {/* Clean Note Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Message from onboarding team
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    We sent a brief message to your email and phone to confirm your call flow and integration details.
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">Contact person</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{formData.pocName || "Account Owner"}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">Expected response time</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">&lt; 15 minutes</span>
                </div>
              </div>
            </div>

            {/* Clean Modern Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => toast.info("Opening WhatsApp conversation (Demo)")}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-orange-400 dark:text-orange-500" />
                Chat with Onboarding Team
              </button>
              <Button
                variant="outline"
                className="h-11 px-6 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs cursor-pointer"
                onClick={() => setStatus("wizard")}
              >
                Back to Wizard
              </Button>
            </div>
          </div>
        )}

        {/* ── 5. UNDER REVIEW SCREEN ── */}
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
                <span>ID: #TK-84920</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                <div>
                  <span className="text-zinc-400 dark:text-zinc-500">Business:</span>{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{formData.businessName || "Acme Healthcare Corp"}</span>
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

            {/* Sandbox Simulation Actions */}
            <div className="pt-4 flex flex-wrap justify-center gap-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button 
                onClick={() => setStatus("approved")} 
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-10 px-5 text-xs font-medium cursor-pointer shadow-xs"
              >
                Simulate: Admin Approves Account &rarr;
              </Button>
              <Button 
                onClick={() => setStatus("wizard")} 
                variant="outline" 
                className="rounded-xl h-10 px-5 text-xs cursor-pointer border-zinc-300 dark:border-zinc-700"
              >
                Back to Wizard
              </Button>
            </div>
          </div>
        )}

        {/* ── 6. APPROVED SCREEN ── */}
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
                    Includes virtual number allocation, prompt calibration, and testing.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    ₹15,000
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
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium h-11 px-8 rounded-xl text-xs cursor-pointer shadow-xs" 
                  onClick={() => toast.success("Payment simulated! In production, this opens Razorpay gateway.")}
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Pay Setup Fee & Activate (Demo)
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-6 rounded-xl border-zinc-300 dark:border-zinc-700 text-xs cursor-pointer"
                  onClick={() => setStatus("wizard")}
                >
                  Back to Wizard Demo
                </Button>
              </div>
              <p className="text-[11px] text-center text-zinc-400 dark:text-zinc-500">
                Secure checkout via Razorpay · Instant activation upon completion
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
