"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Clock, CheckCircle, XCircle, Ban, UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { LocalUser } from "@/lib/auth/types";
import Script from "next/script";

export default function OnboardingPage() {
  const { user } = useAuth();
  const dograhOrgId = (user as any)?.organization_id || (user as LocalUser)?.organizationId;
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending_approval");
  const [customerId, setCustomerId] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<{ gst: number, reg: number }>({ gst: 0, reg: 0 });

  // Form State
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    websiteUrl: "",
    companySize: "",
    gstNumber: "",
    useCaseType: "both",
    useCaseDescription: "",
    callVolume: "",
    languages: "",
    integrations: "",
    pocName: "",
    pocDesignation: "",
    pocPhone: "",
    gstCertificateUrl: "",
    businessRegistrationUrl: "",
  });

  // Use server-side proxy to avoid mixed content (HTTPS page -> HTTP internal service)
  const TALKAR_API = "/api/talkar";

  useEffect(() => {
    if (!dograhOrgId) return;
    async function checkStatus() {
      try {
        const res = await fetch(`${TALKAR_API}/customers/status?dograh_org_id=${dograhOrgId}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setCustomerData(data);
          if (data.customer_id) setCustomerId(data.customer_id);
          if (data.status === "active") {
            router.push("/overview");
          }
        } else {
          setStatus("pending_approval");
        }
      } catch (err) {
        console.error("Failed to fetch onboarding status", err);
        setStatus("pending_approval");
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, [router, TALKAR_API, dograhOrgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use by-org endpoint so we don't need a hardcoded customer_id
      const res = await fetch(`${TALKAR_API}/customers/by-org/${dograhOrgId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Backend expects { form: {...}, documents: [] }
        body: JSON.stringify({ form: formData, documents: [] })
      });
      if (res.ok) {
        setStatus("under_review");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to submit: ${err.detail || res.statusText}`);
      }
    } catch (err) {
      alert("Failed to submit application. Please try again.");
    }
  };

  const handlePaySetupFee = () => {
    if (!customerData?.setup_fee_order_id || !customerData?.razorpay_key_id) {
      alert("Missing Razorpay order details. Please contact support.");
      return;
    }

    const options = {
      key: customerData.razorpay_key_id,
      amount: 100, // ₹1 (100 paise)
      currency: "INR",
      name: "Talkar Setup Fee",
      description: "One-time setup fee for Talkar Voice AI",
      order_id: customerData.setup_fee_order_id,
      handler: async function (response: any) {
        // Don't set status here — the backend webhook (payment.captured) does that.
        // Just inform the user their payment was received.
        alert("Payment received! Your agent is now being built. This page will update automatically.");
      },
      prefill: {
        name: formData.pocName || "Talkar Customer",
        contact: formData.pocPhone || "",
      },
      theme: {
        color: "#18181b",
      },
    };
    
    if (!(window as any).Razorpay) {
      alert("Payment gateway not loaded yet. Please try again in a moment.");
      return;
    }
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const simulateUpload = (type: 'gst' | 'reg') => {
    setUploadProgress(prev => ({ ...prev, [type]: 10 }));
    let progress = 10;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        // Mock the URL returned from S3/MinIO after successful upload
        if (type === 'gst') {
          setFormData(prev => ({ ...prev, gstCertificateUrl: "https://talkar.s3.amazonaws.com/mock-gst.pdf" }));
        } else {
          setFormData(prev => ({ ...prev, businessRegistrationUrl: "https://talkar.s3.amazonaws.com/mock-reg.pdf" }));
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

      {status === "pending_approval" && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Application</CardTitle>
            <CardDescription>Tell us about your business so we can build your perfect AI agent.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">1. Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input id="businessName" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
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
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input id="websiteUrl" type="url" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select required onValueChange={val => setFormData({...formData, companySize: val})}>
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
                    <Label htmlFor="gstNumber">GST Number <span className="text-red-500">*</span></Label>
                    <Input id="gstNumber" required value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Use Case */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">2. Use Case</h3>
                <div className="space-y-3">
                  <Label>Agent Type</Label>
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
                  <Label htmlFor="useCaseDescription">Describe your use case</Label>
                  <Textarea id="useCaseDescription" required placeholder="E.g., We need an agent to answer patient queries and book appointments..." value={formData.useCaseDescription} onChange={e => setFormData({...formData, useCaseDescription: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="callVolume">Expected Monthly Volume</Label>
                    <Select required onValueChange={val => setFormData({...formData, callVolume: val})}>
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
                    <Label htmlFor="languages">Languages Needed</Label>
                    <Input id="languages" required placeholder="Hindi, English, Hinglish..." value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="integrations">Existing Tools to Integrate (CRM, Calendars, WhatsApp)</Label>
                    <Input id="integrations" placeholder="E.g., HubSpot CRM, Google Calendar" value={formData.integrations} onChange={e => setFormData({...formData, integrations: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Documents & POC */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">3. Documents & Point of Contact</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); simulateUpload('gst'); }}
                  >
                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drag & Drop GST Certificate</p>
                    <p className="text-xs text-muted-foreground">PDF or Image (Required)</p>
                    <Input type="file" className="mt-4" required onChange={() => simulateUpload('gst')} />
                    {uploadProgress.gst > 0 && (
                      <div className="w-full mt-4 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress.gst}%` }}></div>
                      </div>
                    )}
                  </div>
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); simulateUpload('reg'); }}
                  >
                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drag & Drop Business Registration</p>
                    <p className="text-xs text-muted-foreground">PDF or Image (Required)</p>
                    <Input type="file" className="mt-4" required onChange={() => simulateUpload('reg')} />
                    {uploadProgress.reg > 0 && (
                      <div className="w-full mt-4 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${uploadProgress.reg}%` }}></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pocName">POC Name</Label>
                    <Input id="pocName" required value={formData.pocName} onChange={e => setFormData({...formData, pocName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pocDesignation">POC Designation</Label>
                    <Input id="pocDesignation" required value={formData.pocDesignation} onChange={e => setFormData({...formData, pocDesignation: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pocPhone">POC Phone</Label>
                    <Input id="pocPhone" required value={formData.pocPhone} onChange={e => setFormData({...formData, pocPhone: e.target.value})} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">Submit Application</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {status === "under_review" && (
        <Card className="py-8">
          <CardContent className="space-y-8">
            <div className="text-center space-y-4">
              <Clock className="w-16 h-16 text-blue-500 mx-auto" />
              <h2 className="text-2xl font-bold">Application under review. We'll notify you within 48 hours.</h2>
              <div className="pt-4">
                <a href="mailto:support@talkar.ai" className="text-sm text-blue-600 hover:underline">Need changes? Contact us</a>
              </div>
            </div>

            <div className="border-t pt-8 px-4 md:px-8">
              <h3 className="text-lg font-medium mb-4">Submitted Application Details</h3>
              <div className="opacity-70 pointer-events-none">
                {/* Read-only form preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-left">
                  <div><span className="text-muted-foreground">Business Name:</span><br/>{customerData?.onboarding_form?.businessName || "N/A"}</div>
                  <div><span className="text-muted-foreground">Industry:</span><br/>{customerData?.onboarding_form?.industry || "N/A"}</div>
                  <div><span className="text-muted-foreground">Website URL:</span><br/>{customerData?.onboarding_form?.websiteUrl || "N/A"}</div>
                  <div><span className="text-muted-foreground">Company Size:</span><br/>{customerData?.onboarding_form?.companySize || "N/A"}</div>
                  <div><span className="text-muted-foreground">GST Number:</span><br/>{customerData?.onboarding_form?.gstNumber || "N/A"}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Use Case:</span><br/>{customerData?.onboarding_form?.useCaseType || "N/A"}<br/>{customerData?.onboarding_form?.useCaseDescription || "N/A"}</div>
                  <div><span className="text-muted-foreground">Expected Volume:</span><br/>{customerData?.onboarding_form?.callVolume || "N/A"}</div>
                  <div><span className="text-muted-foreground">Languages:</span><br/>{customerData?.onboarding_form?.languages || "N/A"}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Integrations:</span><br/>{customerData?.onboarding_form?.integrations || "N/A"}</div>
                  <div className="col-span-2 border-t pt-4 mt-2"><strong className="text-foreground">Point of Contact</strong></div>
                  <div><span className="text-muted-foreground">Name:</span><br/>{customerData?.onboarding_form?.pocName || "N/A"}</div>
                  <div><span className="text-muted-foreground">Designation:</span><br/>{customerData?.onboarding_form?.pocDesignation || "N/A"}</div>
                  <div><span className="text-muted-foreground">Phone:</span><br/>{customerData?.onboarding_form?.pocPhone || "N/A"}</div>
                  <div className="col-span-2 border-t pt-4 mt-2"><strong className="text-foreground">Documents</strong></div>
                  <div><span className="text-muted-foreground">GST Certificate:</span><br/>{customerData?.onboarding_form?.gstCertificateUrl ? <a href={customerData.onboarding_form.gstCertificateUrl} target="_blank" className="text-blue-500 underline pointer-events-auto">View Document</a> : "Not uploaded"}</div>
                  <div><span className="text-muted-foreground">Business Registration:</span><br/>{customerData?.onboarding_form?.businessRegistrationUrl ? <a href={customerData.onboarding_form.businessRegistrationUrl} target="_blank" className="text-blue-500 underline pointer-events-auto">View Document</a> : "Not uploaded"}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "approved" && (
        <Card className="text-center py-12 border-green-500/30 bg-green-500/5">
          <CardContent className="space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Approved! Please complete your setup fee payment.</h2>
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={handlePaySetupFee}>
              Pay Setup Fee
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "agent_building" && (
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-t-blue-500 animate-spin" />
            <h2 className="text-2xl font-bold">Your agent is being built by our team.</h2>
            
            <div className="bg-muted p-4 rounded-md inline-block mt-4 text-left border">
              <p className="text-sm font-medium mb-1 border-b pb-1">Estimated Timeline: <span className="font-normal">48-72 hours</span></p>
              <h4 className="text-xs text-muted-foreground mt-3 mb-1 uppercase tracking-wider font-bold">Use Case Summary</h4>
              <p className="text-sm"><strong>Type:</strong> {customerData?.onboarding_form?.useCaseType || "N/A"}</p>
              <p className="text-sm"><strong>Description:</strong> {customerData?.onboarding_form?.useCaseDescription || "N/A"}</p>
              <p className="text-sm"><strong>Languages:</strong> {customerData?.onboarding_form?.languages || "N/A"}</p>
              <p className="text-sm"><strong>Integrations:</strong> {customerData?.onboarding_form?.integrations || "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "rejected" && (
        <Card className="text-center py-12 border-red-500/30 bg-red-500/5">
          <CardContent className="space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <p className="text-muted-foreground max-w-md mx-auto">
              <span className="font-medium text-foreground">{customerData?.rejection_reason || "Did not meet requirements."}</span>
            </p>
            <div className="pt-4 text-sm font-medium">
              Reapply after 30 days ({customerData?.reapply_countdown || "29d 14h"})
            </div>
          </CardContent>
        </Card>
      )}

      {status === "suspended" && (
        <Card className="text-center py-12 border-red-500/30 bg-red-500/5">
          <CardContent className="space-y-4">
            <Ban className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Account suspended.</h2>
            <div className="font-bold text-xl my-4">₹{customerData?.wallet_balance ? (customerData.wallet_balance / 100).toFixed(2) : "0.00"}</div>
            <Button size="lg" onClick={() => router.push("/wallet")}>
              Add Credits
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
