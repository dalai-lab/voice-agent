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

export default function OnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending_approval");
  const [loading, setLoading] = useState(true);

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
  });

  const TALKAR_API = process.env.NEXT_PUBLIC_TALKAR_API_URL || "http://localhost:8001";

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`${TALKAR_API}/customers/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          if (data.status === "active") {
            router.push("/overview"); // Actually handled by middleware, but good as a fallback
          }
        } else {
          // For dev testing if API is down, default to pending_approval
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
  }, [router, TALKAR_API]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real implementation this would upload the documents first to S3/MinIO
      const res = await fetch(`${TALKAR_API}/customers/me/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStatus("under_review");
      }
    } catch (err) {
      alert("Failed to submit application.");
    }
  };

  const handlePaySetupFee = () => {
    // Hits POST /billing/setup-fee/create-order
    alert("Initiating Razorpay setup fee checkout...");
    // Mock successful payment transition
    setTimeout(() => setStatus("agent_building"), 1500);
  };

  if (loading) {
    return <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">Loading account status...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
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
                  <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30">
                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Upload GST Certificate</p>
                    <p className="text-xs text-muted-foreground">PDF or Image (Required)</p>
                    <Input type="file" className="mt-4" required />
                  </div>
                  <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30">
                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Upload Business Registration</p>
                    <p className="text-xs text-muted-foreground">PDF or Image (Required)</p>
                    <Input type="file" className="mt-4" required />
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
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <Clock className="w-16 h-16 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold">Application Under Review</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our team is currently reviewing your business application. We will notify you via email within 48 hours.
            </p>
            <div className="pt-4">
              <a href="mailto:support@talkar.ai" className="text-sm text-blue-600 hover:underline">Need to make changes? Contact us.</a>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "approved" && (
        <Card className="text-center py-12 border-green-500/30 bg-green-500/5">
          <CardContent className="space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Application Approved!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Welcome to Talkar! Please complete your one-time setup fee payment so our engineering team can begin building your AI agent.
            </p>
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" onClick={handlePaySetupFee}>
              Pay Setup Fee
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "agent_building" && (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-t-blue-500 animate-spin" />
            <h2 className="text-2xl font-bold">Your Agent is Being Built</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our engineering team is actively building and testing your AI agent based on your submitted use case.
            </p>
            <div className="bg-muted p-4 rounded-md inline-block mt-4 text-left">
              <p className="text-sm font-medium">Estimated Timeline: <span className="font-normal">48-72 hours</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "rejected" && (
        <Card className="text-center py-12 border-red-500/30 bg-red-500/5">
          <CardContent className="space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold">Application Rejected</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Unfortunately, we are unable to approve your application at this time.
              Reason: <span className="font-medium text-foreground">Did not meet minimum volume requirements.</span>
            </p>
            <div className="pt-4 text-sm font-medium">
              You may reapply in: 29 days, 14 hours
            </div>
          </CardContent>
        </Card>
      )}

      {status === "suspended" && (
        <Card className="text-center py-12 border-red-500/30 bg-red-500/5">
          <CardContent className="space-y-4">
            <Ban className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Account Suspended</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your account has been suspended due to an extended zero balance. All agent activity has been paused.
            </p>
            <div className="font-bold text-xl my-4">Current Balance: ₹0.00</div>
            <Button size="lg" onClick={() => router.push("/wallet")}>
              Add Credits to Reactivate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
