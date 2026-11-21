"use client";

import { initiateDemoCall, runLiveExtraction, pollDemoCallResult } from "@/app/actions/demoCall";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Check,
  X,
  PhoneCall,
  ArrowRight,
  Hotel,
  Stethoscope,
  Briefcase,
  Wrench,
  Users,
  Home,
  RotateCcw,
  CheckCircle2,
  FileText,
  Upload,
  Clock,
  RefreshCw,
  Truck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Agent Personas
// ---------------------------------------------------------------------------
interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  description: string;
  greeting: string;
  inCallHint: string;
  callingInstruction: string;
  connectedInstruction: string;
  ctaText: string;
  accent: string;
}

const PERSONAS: Record<string, Persona> = {
  hotel: {
    id: "hotel",
    name: "Sarah",
    role: "VIP Concierge",
    company: "The Grand Horizon Hotel",
    description: "Confirms VIP arrival time, room preferences, and dining reservations.",
    greeting: "Hi, this is Sarah from The Grand Horizon. This is a demo call regarding your upcoming reservation.",
    inCallHint: "Confirm your arrival time, bed preference, or request a rooftop dinner reservation.",
    callingInstruction: "Please answer Sarah's call and stay on this screen to watch your check-in preferences captured live.",
    connectedInstruction: "Share your arrival time and room preferences to watch concierge notes stream live.",
    ctaText: "Automate Hospitality Bookings",
    accent: "orange",
  },
  medical: {
    id: "medical",
    name: "Emma",
    role: "Patient Care Coordinator",
    company: "Riverside Clinic",
    description: "Confirms scheduled consultation, duration of symptoms, and triage priority.",
    greeting: "Hello, this is Emma from Riverside Clinic. This is a demo call regarding your consultation tomorrow.",
    inCallHint: "Confirm your slot attendance and describe your symptoms.",
    callingInstruction: "Please answer Emma's call and stay on this screen to watch intake triage captured live.",
    connectedInstruction: "Confirm your appointment and symptoms to watch triage notes stream live.",
    ctaText: "Automate Patient Intake",
    accent: "teal",
  },
  sales: {
    id: "sales",
    name: "Jordan",
    role: "Enterprise Sales Specialist",
    company: "Northwind Software",
    description: "Follows up on website pricing inquiry, qualifies team size, and schedules live demo.",
    greeting: "Hey, Jordan here with Northwind Software. This is a demo call following up on your pricing request.",
    inCallHint: "Discuss your team size, workflow bottlenecks, and timeline.",
    callingInstruction: "Please answer Jordan's call and stay on this screen to see qualification criteria captured live.",
    connectedInstruction: "Share your team's automation needs to see sales qualification evaluate live.",
    ctaText: "Scale Inbound Sales",
    accent: "blue",
  },
  service: {
    id: "service",
    name: "Casey",
    role: "Dispatch Coordinator",
    company: "Bluefield Home Services",
    description: "Confirms technician arrival window, repair details, and address landmark.",
    greeting: "Hey, Casey with Bluefield Home Services. This is a demo call following up on your repair ticket.",
    inCallHint: "Confirm your preferred time slot and share your address landmark.",
    callingInstruction: "Please answer Casey's call and stay on this screen to watch dispatch details logged live.",
    connectedInstruction: "Confirm your technician slot and problem description to watch dispatch notes stream live.",
    ctaText: "Automate Service Dispatch",
    accent: "amber",
  },
  real_estate: {
    id: "real_estate",
    name: "Kabir",
    role: "Senior Property Advisor",
    company: "Maple & Co Realty",
    description: "Follows up on brochure inquiry, qualifies budget and intent, and schedules private tour.",
    greeting: "Hi, Kabir from Maple & Co Realty. This is a demo call following up on your property brochure inquiry.",
    inCallHint: "Share your budget range, intent (self-use/investment), and preferred tour day.",
    callingInstruction: "Please answer Kabir's call and stay on this screen to watch buyer preferences captured live.",
    connectedInstruction: "Share your budget and moving timeline to watch buyer qualification stream live.",
    ctaText: "Capture Real Estate Leads",
    accent: "emerald",
  },
  recruiter: {
    id: "recruiter",
    name: "Alex",
    role: "Talent Screener",
    company: "TalentStream Global",
    description: "Conducts outbound screening on skills, experience level, salary expectation, and notice period.",
    greeting: "Hi, Alex calling from TalentStream. This is a demo call regarding your recent application.",
    inCallHint: "Mention your primary technical skills, years of experience, and notice period.",
    callingInstruction: "Please answer Alex's call and stay on this screen to watch candidate screening notes captured live.",
    connectedInstruction: "Discuss your background and experience to see screening criteria evaluate live.",
    ctaText: "Streamline Candidate Screening",
    accent: "indigo",
  },
  logistics: {
    id: "logistics",
    name: "Ananya",
    role: "Delivery Coordinator",
    company: "Talkar Logistics",
    description: "Confirms delivery availability, receiver details, address landmarks, and prepaid offers.",
    greeting: "Hello, this is Ananya from Talkar. This is a demo call regarding your package delivery.",
    inCallHint: "Confirm whether you'll be available to receive your order or need a reschedule.",
    callingInstruction: "Please answer Ananya's call and stay on this screen to watch delivery confirmation captured live.",
    connectedInstruction: "Confirm your availability and delivery instructions to see notes stream live.",
    ctaText: "Automate Logistics & COD Verification",
    accent: "rose",
  },
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  hotel: {
    arrival_time: "Arrival Time",
    room_preference: "Room Preference",
    guests_count: "Party Size",
    dinner_reservation: "Rooftop Dining",
    booking_status: "Check-in Status",
  },
  medical: {
    patient_name: "Patient Name",
    attendance_status: "Appointment Status",
    symptoms_mentioned: "Reported Symptoms",
    urgency_level: "Triage Urgency",
    action_taken: "Doctor Consultation",
  },
  sales: {
    prospect_name: "Prospect Name",
    company_size: "Team Size",
    primary_pain_point: "Core Challenge",
    timeline: "Deployment Timeline",
    demo_booked: "15-Min Demo Booked",
    lead_score: "Opportunity Score",
  },
  service: {
    customer_name: "Customer Name",
    service_category: "Service Category",
    issue_description: "Issue Description",
    service_address: "Service Landmark",
    urgency_level: "Urgency Level",
    job_status: "Dispatch Status",
  },
  real_estate: {
    client_name: "Client Name",
    client_intent: "Buyer Intent",
    property_preference: "Property Type",
    budget_range: "Target Budget",
    timeline: "Purchase Timeline",
    pre_approved_status: "Pre-Approved",
    lead_outcome: "Showing Tour Status",
  },
  recruiter: {
    candidate_name: "Candidate Name",
    experience_level: "Experience Level",
    key_skills: "Primary Skills",
    salary_expectations: "Compensation Expectation",
    notice_period: "Notice Period",
    candidate_score: "Candidate Fit Score",
  },
  logistics: {
    who_answered: "Call Answered By",
    availability: "Recipient Availability",
    receiver_name: "Receiver Name",
    landmark: "Nearby Landmark",
    prepaid_offer_status: "COD / Prepaid Choice",
    dispatch_status: "Dispatch Decision",
  },
};

// ---------------------------------------------------------------------------
// Helpers: Robust Field Value Resolver & Formatted Value Renderer
// ---------------------------------------------------------------------------
function getFieldValue(data: any, key: string) {
  if (!data || typeof data !== "object") return null;
  if (data[key] !== undefined && data[key] !== null) return data[key];

  // Try underscore <-> space
  const spaced = key.replace(/_/g, " ");
  if (data[spaced] !== undefined && data[spaced] !== null) return data[spaced];

  const underscored = key.replace(/ /g, "_");
  if (data[underscored] !== undefined && data[underscored] !== null) return data[underscored];

  // Normalized alphanumeric match (ignores spaces, underscores, dashes, and casing)
  const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [k, v] of Object.entries(data)) {
    if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === normKey) {
      if (v !== undefined && v !== null) return v;
    }
  }

  return null;
}

function FormattedValue({ value, labelKey }: { value: any; labelKey: string }) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "null" ||
    value === "not_given" ||
    value === "not given"
  ) {
    return <span className="text-xs text-slate-500 font-medium">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${
          value ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-slate-800 text-slate-400"
        }`}
      >
        {value ? "✓ Yes" : "✕ No"}
      </span>
    );
  }

  const str = String(value).trim();
  const lowerStr = str.toLowerCase();

  // Boolean-like strings
  if (lowerStr === "yes" || lowerStr === "true") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        ✓ Yes
      </span>
    );
  }
  if (lowerStr === "no" || lowerStr === "false") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-slate-400">
        ✕ No
      </span>
    );
  }

  // Common status badges
  if (
    lowerStr === "confirmed" ||
    lowerStr.includes("link requested") ||
    lowerStr.includes("link_requested") ||
    lowerStr === "cod confirmed" ||
    lowerStr === "cod_confirmed" ||
    lowerStr === "booked"
  ) {
    let badgeText = "✓ Confirmed";
    if (lowerStr.includes("link")) badgeText = "✓ Link Requested";
    if (lowerStr.includes("cod")) badgeText = "✓ COD Confirmed";
    if (lowerStr === "booked") badgeText = "✓ Booked";
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        {badgeText}
      </span>
    );
  }

  if (
    lowerStr.includes("declined") ||
    lowerStr.includes("keep_cod") ||
    lowerStr.includes("keep cod") ||
    lowerStr.includes("cod pending") ||
    lowerStr.includes("cod_pending")
  ) {
    let badgeText = "COD at Delivery";
    if (lowerStr.includes("pending")) badgeText = "COD Pending Payment";
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
        {badgeText}
      </span>
    );
  }

  if (lowerStr === "someone else" || lowerStr === "someone_else") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
        Someone Else
      </span>
    );
  }

  if (lowerStr === "self" || lowerStr === "available") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        {lowerStr === "available" ? "✓ Available" : "Self (Available)"}
      </span>
    );
  }

  if (lowerStr === "customer") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        ✓ Customer
      </span>
    );
  }

  if (lowerStr === "reschedule" || lowerStr === "rescheduled" || lowerStr.includes("reschedule")) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/25">
        Reschedule Requested
      </span>
    );
  }

  if (lowerStr === "cancelled" || lowerStr === "canceled") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
        ✕ Cancelled
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1 mt-0.5">
        {value.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-200 text-xs font-semibold"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "number" && (labelKey.includes("score") || labelKey.includes("interest"))) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-orange-400 tabular-nums">{value}/10</span>
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, value * 10))}%` }}
          />
        </div>
      </div>
    );
  }

  if (labelKey === "sentiment") {
    const isPos = lowerStr.includes("pos");
    const isNeg = lowerStr.includes("neg");
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${
          isPos
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
            : isNeg
            ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
            : "bg-amber-500/10 border-amber-500/25 text-amber-400"
        }`}
      >
        {str}
      </span>
    );
  }

  return <span className="text-xs font-bold text-slate-100 break-words leading-relaxed">{str}</span>;
}

// ---------------------------------------------------------------------------
// Call Completed Summary Card
// ---------------------------------------------------------------------------
function CallCompletedCard({
  data,
  useCase,
  durationSec,
  turnCount,
  onReset,
}: {
  data: any;
  useCase: string;
  durationSec: number;
  turnCount: number;
  onReset: () => void;
}) {
  const persona = PERSONAS[useCase] || PERSONAS.hotel;
  const labels = FIELD_LABELS[useCase] || FIELD_LABELS.hotel;

  const primaryKeys = new Set(Object.keys(labels));
  const primaryEntries = Object.entries(labels).map(([key, label]) => {
    let val = getFieldValue(data, key);
    if (val === "not_given" || val === "not given" || val === "unknown") {
      val = null;
    }
    const hasValue = val !== null && val !== undefined && val !== "" && val !== "null";
    return { key, label, val, hasValue };
  });

  // Include any extra fields returned by Talkar that have values
  const extraEntries: { key: string; label: string; val: any; hasValue: boolean }[] = [];
  if (data && typeof data === "object") {
    for (const [rawK, rawV] of Object.entries(data)) {
      if (rawK.startsWith("_")) continue;
      const normK = rawK.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isAlreadyInPrimary = Array.from(primaryKeys).some(
        (pk) => pk.toLowerCase().replace(/[^a-z0-9]/g, "") === normK
      );
      if (!isAlreadyInPrimary) {
        let val = rawV;
        if (val === "not_given" || val === "not given" || val === "unknown") {
          val = null;
        }
        const hasValue = val !== null && val !== undefined && val !== "" && val !== "null";
        if (hasValue) {
          const niceLabel = rawK
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          extraEntries.push({ key: rawK, label: niceLabel, val, hasValue: true });
        }
      }
    }
  }

  const allEntries = [...primaryEntries, ...extraEntries];

  const capturedCount = allEntries.filter((e) => e.hasValue).length;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-[540px] h-[540px] aspect-square max-w-full mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                Call Completed
              </span>
              <span className="text-xs text-slate-400 font-medium">{persona.company}</span>
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">Call Summary & Notes</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-2xl border border-white/20 text-right shadow-sm">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Time</div>
            <div className="text-xs font-bold text-white tabular-nums">{formatTime(durationSec || 0)}</div>
          </div>
          <div className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-2xl border border-white/20 text-right shadow-sm">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Turns</div>
            <div className="text-xs font-bold text-orange-400 tabular-nums">{turnCount || 6}</div>
          </div>
        </div>
      </div>

      {/* Fields body */}
      <div className="flex-1 min-h-0 flex flex-col space-y-2 py-2">
        <div className="flex items-center justify-between shrink-0 px-0.5">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            Details Captured ({capturedCount}/{allEntries.length})
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 grid grid-cols-2 gap-2">
          {allEntries.map(({ key, label, val, hasValue }) => (
            <div
              key={key}
              className={`p-2.5 rounded-xl transition-all duration-500 flex flex-col justify-between ${
                hasValue ? "demo-glass-card-active text-white" : "demo-glass-card text-white/90"
              }`}
              style={{ backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)" } as any}
            >
              <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                <span className={`truncate ${hasValue ? "text-orange-200/80 font-semibold" : "text-slate-400"}`}>
                  {label}
                </span>
                {hasValue ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] text-slate-600 font-normal shrink-0">N/A</span>
                )}
              </div>
              <div>
                <FormattedValue value={val} labelKey={key} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onReset}
          className="h-12 px-4 rounded-2xl text-xs font-semibold bg-white/10 hover:bg-white/20 backdrop-blur-2xl border border-white/25 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" /> Try Another Call
        </button>
        <a
          href="/handler/sign-up"
          className="flex-1 h-12 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 text-white shadow-xl shadow-orange-600/35 flex items-center justify-center gap-2 transition-all cursor-pointer truncate"
        >
          <span className="truncate">{persona.ctaText}</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Interactive DemoCallForm Component
// ---------------------------------------------------------------------------
export function DemoCallForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [useCase, setUseCase] = useState("hotel");
  const [callingState, setCallingState] = useState<"idle" | "calling" | "connected" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedData, setExtractedData] = useState<any | null>(null);

  // System maintenance tracking
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch("/api/talkar/health", { cache: "no-store" });
      if (res.ok) {
        setIsMaintenance(false);
      } else {
        setIsMaintenance(true);
      }
    } catch {
      setIsMaintenance(true);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Recruiter specific
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");

  // Live extraction state
  const [liveFields, setLiveFields] = useState<Record<string, any>>({});
  const [liveTurns, setLiveTurns] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);

  // Highlight tracking
  const [activeHighlights, setActiveHighlights] = useState<
    Array<{ phrase: string; key: string; expiresAt: number }>
  >([]);
  const [recentFieldKeys, setRecentFieldKeys] = useState<Record<string, number>>({});
  const [turnIds, setTurnIds] = useState<string[]>([]);

  const pollIntervalRef = useRef<any>(null);
  const sseRef = useRef<EventSource | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const durationTimerRef = useRef<any>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll newly updated field into view
  useEffect(() => {
    const updatedKeys = Object.keys(recentFieldKeys);
    if (updatedKeys.length > 0) {
      const newestKey = updatedKeys.sort((a, b) => (recentFieldKeys[b] || 0) - (recentFieldKeys[a] || 0))[0];
      if (newestKey && fieldRefs.current[newestKey]) {
        fieldRefs.current[newestKey]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [recentFieldKeys]);

  const clearTimers = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
  };

  useEffect(() => { return () => clearTimers(); }, []);

  // Cleanup expired highlights
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveHighlights((prev) => prev.filter((h) => h.expiresAt > now));
      setRecentFieldKeys((prev) => {
        const next: Record<string, number> = {};
        for (const [k, exp] of Object.entries(prev)) { if (exp > now) next[k] = exp; }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const triggerFieldHighlights = (newFields: Record<string, any>, currentPrevFields: Record<string, any>) => {
    const now = Date.now();
    const expiresAt = now + 2800;
    const newHighlights: Array<{ phrase: string; key: string; expiresAt: number }> = [];
    const updatedKeys: Record<string, number> = {};
    const citations = newFields._citations || {};

    for (const [key, val] of Object.entries(newFields)) {
      if (key === "_citations") continue;
      if (val !== null && val !== undefined && val !== "" && currentPrevFields[key] !== val) {
        updatedKeys[key] = expiresAt;
        if (citations[key] && Array.isArray(citations[key])) {
          for (const phrase of citations[key]) {
            if (typeof phrase === "string" && phrase.trim().length >= 2) {
              newHighlights.push({ phrase: phrase.trim(), key, expiresAt });
            }
          }
        } else {
          if (typeof val === "string" && val.trim().length >= 2) {
            newHighlights.push({ phrase: val.trim(), key, expiresAt });
          } else if (typeof val === "number") {
            newHighlights.push({ phrase: String(val), key, expiresAt });
          }
        }
      }
    }
    if (newHighlights.length > 0) setActiveHighlights((prev) => [...prev, ...newHighlights]);
    if (Object.keys(updatedKeys).length > 0) setRecentFieldKeys((prev) => ({ ...prev, ...updatedKeys }));
  };

  // Call duration timer
  useEffect(() => {
    if (callingState === "connected") {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [callingState]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [liveTurns]);

  const handleReset = () => {
    clearTimers();
    setCallingState("idle");
    setExtractedData(null);
    setLiveFields({});
    setLiveTurns([]);
    setTurnIds([]);
    setTurnCount(0);
    setCallDuration(0);
    setActiveHighlights([]);
    setRecentFieldKeys({});
    setErrorMessage("");
    setResumeFileName("");
  };

  const renderTranscriptText = (rawText: string, isLatest: boolean) => {
    const matchIndices: { start: number; end: number; phrase: string; isExpired: boolean }[] = [];
    if (activeHighlights.length > 0) {
      const phrases = activeHighlights.filter((h) => h.phrase.trim().length >= 2);
      phrases.sort((a, b) => b.phrase.length - a.phrase.length);
      const escaped = phrases.map((p) => p.phrase.trim().replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"));
      if (escaped.length > 0) {
        const regex = new RegExp(`(${escaped.join("|")})`, "gi");
        let match;
        while ((match = regex.exec(rawText)) !== null) {
          const matchedText = match[0];
          const hObj = phrases.find((p) => p.phrase.trim().toLowerCase() === matchedText.toLowerCase());
          if (hObj) {
            matchIndices.push({
              start: match.index,
              end: match.index + matchedText.length,
              phrase: matchedText,
              isExpired: Date.now() > hObj.expiresAt,
            });
          }
        }
      }
    }

    const words = rawText.split(" ");
    let charIndex = 0;

    return (
      <span className="font-normal whitespace-pre-wrap">
        {words.map((word, wIdx) => {
          const wordStart = charIndex;
          const wordEnd = charIndex + word.length;
          charIndex += word.length + 1;

          const match = matchIndices.find((m) => wordStart < m.end && wordEnd > m.start);
          const isStreamedWord = isLatest && wIdx >= words.length - 4;

          let bgClass = "";
          let textClass = "text-white/90";
          let duration = "0ms";
          let delay = "0ms";
          let extraRadius = "";

          if (match) {
            const phrasePrefix = rawText.substring(match.start, wordStart);
            const charsBefore = phrasePrefix.length;
            const wordLength = word.length + 1;
            const totalChars = match.phrase.length;
            const wordIndexInPhrase = phrasePrefix.split(" ").length - 1;
            const totalWordsInPhrase = match.phrase.split(" ").length;

            if (wordIndexInPhrase === 0) extraRadius += " rounded-l-[4px]";
            if (wordIndexInPhrase === totalWordsInPhrase - 1) extraRadius += " rounded-r-[4px]";

            const sweepTime = Math.max(350, totalChars * 10);
            const speedPerChar = sweepTime / totalChars;
            duration = `${wordLength * speedPerChar}ms`;
            delay = `${charsBefore * speedPerChar}ms`;

            if (!match.isExpired) {
              bgClass = "active";
              textClass = "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]";
            }
          }

          return (
            <span
              key={wIdx}
              className={`word-sweep ${bgClass} ${textClass} ${extraRadius} ${
                isStreamedWord && !match ? "animate-word-stream-blur" : ""
              }`}
              style={{ transitionDuration: duration, transitionDelay: delay }}
            >
              {word}
              {wIdx < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </span>
    );
  };

  const handleInitiateCall = async (e?: React.FormEvent, isRetry = false) => {
    if (e) e.preventDefault();
    if (!phone || !name) return;

    if (isRetry) {
      setErrorMessage("Telephony issue detected. Reconnecting automatically...");
    } else {
      setCallingState("calling");
      setErrorMessage("");
      setExtractedData(null);
      setLiveFields({});
      setLiveTurns([]);
      setTurnIds([]);
      setTurnCount(0);
      setCallDuration(0);
    }

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("phone", phone);
      formData.set("useCase", useCase);
      if (jobDescription) formData.set("jobDescription", jobDescription);
      if (resumeText) formData.set("resumeText", resumeText);
      if (isRetry) formData.set("isRetry", "true");

      const result = await initiateDemoCall(null, formData as any);
      if (!result?.success) {
        setCallingState("error");
        setErrorMessage(result?.error || "Failed to initiate call.");
        return;
      }
      const runId = result.workflowRunId as number;

      const sseUrl = `/api/demo-stream/${runId}`;
      const es = new EventSource(sseUrl);
      sseRef.current = es;

      const lastExtractedTurnCountRef = { current: 0 };
      const finalLinesRef: string[] = [];
      const turnIdCounter = { current: 0 };
      const stableTurnsRef: { id: string; text: string }[] = [];
      let partialUserLine: { id: string; text: string } | null = null;

      const syncTurns = () => {
        const arr = [...stableTurnsRef, ...(partialUserLine ? [partialUserLine] : [])];
        setLiveTurns(arr.map((t) => t.text));
        setTurnIds(arr.map((t) => t.id));
      };

      // Background poller to fetch official extraction results from Talkar backend
      const fetchOfficialExtraction = (targetRunId: number) => {
        let attempts = 0;
        const maxAttempts = 10;
        const checkOnce = async () => {
          try {
            const res = await pollDemoCallResult(targetRunId);
            if (res.extractedData && Object.keys(res.extractedData).length > 0) {
              setExtractedData((prev: any) => ({
                ...(prev || {}),
                ...res.extractedData,
              }));
              if (res.ready) return true;
            }
          } catch (e) {
            console.error("[DemoCall] Failed to fetch official extraction:", e);
          }
          return false;
        };

        checkOnce().then((done) => {
          if (done) return;
          const officialPollTimer = setInterval(async () => {
            attempts++;
            const isDone = await checkOnce();
            if (isDone || attempts >= maxAttempts) {
              clearInterval(officialPollTimer);
            }
          }, 1400);
        });
      };

      es.onmessage = (evt) => {
        if (!evt.data) return;
        const msg = JSON.parse(evt.data);

        if (msg.type === "timeout") {
          es.close();
          sseRef.current = null;
          handleInitiateCall(undefined, true);
          return;
        }

        if (msg.type === "ended") {
          es.close();
          sseRef.current = null;
          if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
          }
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setCallingState("done");
          setExtractedData((prev: any) => prev || liveFields);
          fetchOfficialExtraction(runId);
          return;
        }

        if (msg.type !== "turn") return;
        setCallingState("connected");

        if (msg.role === "agent") {
          const lastStable = stableTurnsRef[stableTurnsRef.length - 1];
          if (lastStable && lastStable.text.startsWith("Agent: ")) {
            lastStable.text += (lastStable.text === "Agent: " ? "" : " ") + msg.text;
            finalLinesRef[finalLinesRef.length - 1] = lastStable.text;
          } else {
            const id = `agent-${turnIdCounter.current++}`;
            const entry = { id, text: `Agent: ${msg.text}` };
            stableTurnsRef.push(entry);
            finalLinesRef.push(entry.text);
          }
          syncTurns();

          if (stableTurnsRef.length > lastExtractedTurnCountRef.current) {
            lastExtractedTurnCountRef.current = stableTurnsRef.length;
            runLiveExtraction([...finalLinesRef], useCase)
              .then((fields) => {
                if (fields && Object.keys(fields).length > 0) {
                  setLiveFields((prev) => {
                    triggerFieldHighlights(fields, prev);
                    return { ...prev, ...fields };
                  });
                }
              })
              .catch(console.error);
          }
        } else if (msg.role === "user") {
          setTurnCount((t) => t + 1);
          if (msg.final || msg.is_final) {
            const id = `user-${turnIdCounter.current++}`;
            const entry = { id, text: `Caller: ${msg.text}` };
            stableTurnsRef.push(entry);
            finalLinesRef.push(entry.text);
            partialUserLine = null;
          } else {
            if (!partialUserLine) {
              partialUserLine = { id: `user-partial-${turnIdCounter.current}`, text: `Caller: ${msg.text}` };
            } else {
              partialUserLine.text = `Caller: ${msg.text}`;
            }
          }
          syncTurns();
        }
      };

      es.onerror = () => {
        es.close();
        sseRef.current = null;
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
        }
        if (callingState !== "done") {
          setCallingState("done");
          setExtractedData((prev: any) => prev || liveFields);
          fetchOfficialExtraction(runId);
        }
      };

      pollIntervalRef.current = setInterval(async () => {
        try {
          const poll = await pollDemoCallResult(runId);
          const disposition = poll.call_disposition;

          if (poll.extractedData && Object.keys(poll.extractedData).length > 0) {
            setExtractedData((prev: any) => ({
              ...(prev || {}),
              ...poll.extractedData,
            }));
          }

          if (poll.ready || disposition === "completed" || disposition === "normal_clearing") {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            if (durationTimerRef.current) {
              clearInterval(durationTimerRef.current);
              durationTimerRef.current = null;
            }
            if (sseRef.current) {
              sseRef.current.close();
              sseRef.current = null;
            }
            setCallingState("done");
            if (poll.extractedData && Object.keys(poll.extractedData).length > 0) {
              setExtractedData((prev: any) => ({
                ...(prev || {}),
                ...poll.extractedData,
              }));
            } else {
              fetchOfficialExtraction(runId);
            }
            return;
          }

          if (disposition === "busy") {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            clearTimers();
            setCallingState("error");
            setErrorMessage(
              "Your phone appears to be busy or in Do Not Disturb mode. Please disable DND and try again."
            );
          } else if (disposition === "no_answer") {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            clearTimers();
            setCallingState("error");
            setErrorMessage(
              "The call wasn't answered. Please try again when you're ready to receive the demo call."
            );
          } else if (disposition === "failed") {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            clearTimers();
            // Auto-retry silently for pure telephony failures (no limit consumed)
            handleInitiateCall(undefined, true);
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch (err: any) {
      setCallingState("error");
      setErrorMessage(err?.message || "Unexpected error. Please try again.");
    }
  };

  const currentPersona = PERSONAS[useCase] || PERSONAS.hotel;
  const currentLabels = FIELD_LABELS[useCase] || FIELD_LABELS.hotel;
  const allFieldKeys = Object.keys(currentLabels);
  const capturedFieldsCount = allFieldKeys.filter((key) => {
    const val = getFieldValue(liveFields, key);
    return (
      val !== null &&
      val !== undefined &&
      val !== "" &&
      val !== "null" &&
      val !== "not_given" &&
      val !== "not given"
    );
  }).length;

  const industryOptions = [
    { id: "hotel", label: "Hotel Bookings", icon: Hotel },
    { id: "medical", label: "Clinic Appointments", icon: Stethoscope },
    { id: "sales", label: "Inbound Sales", icon: Briefcase },
    { id: "service", label: "Service Dispatch", icon: Wrench },
    { id: "real_estate", label: "Real Estate", icon: Home },
    { id: "recruiter", label: "Hiring & Screening", icon: Users },
    { id: "logistics", label: "Logistics & Delivery", icon: Truck },
  ];

  return (
    <div className="w-full h-full text-slate-100 flex flex-col items-center justify-center font-sans selection:bg-orange-500 selection:text-white relative">
      <AnimatePresence mode="wait">
        {/* MAINTENANCE STATE */}
        {isMaintenance && (
          <motion.div
            key="maintenance"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md bg-[#111218] border border-white/[0.08] p-7 rounded-2xl shadow-2xl text-center space-y-4"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Demo Calls Temporarily Paused
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We are currently performing routine maintenance on our live telephony infrastructure. Interactive demo calls will resume shortly.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={checkHealth}
                disabled={isCheckingHealth}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? "animate-spin" : ""}`} />
                <span>{isCheckingHealth ? "Checking Status..." : "Refresh Status"}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* COMPLETED STATE */}
        {!isMaintenance && callingState === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex justify-center"
          >
            <CallCompletedCard
              data={extractedData || liveFields || {}}
              useCase={useCase}
              durationSec={callDuration}
              turnCount={turnCount || liveTurns.length}
              onReset={handleReset}
            />
          </motion.div>
        )}

        {/* IN-CALL / STREAMING STATE */}
        {!isMaintenance && (callingState === "calling" || callingState === "connected") && (
          <motion.div
            key="active-call"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[540px] h-auto min-h-[480px] lg:h-[540px] lg:max-h-[540px] lg:aspect-square mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between"
          >
            <div className="flex-1 min-h-0 h-full flex gap-3 items-stretch">
              {/* Left: Transcript */}
              <div className="w-[58%] bg-transparent border-0 p-0 flex flex-col h-full">
                <div className="flex-1 min-h-0 h-full overflow-y-auto no-scrollbar pr-0.5 flex flex-col justify-end scroll-smooth">
                  <AnimatePresence mode="wait">
                    {liveTurns.length === 0 ? (
                      <motion.div
                        key="waiting-state"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-3 my-auto"
                      >
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm border ${
                            callingState === "calling"
                              ? "bg-orange-500/10 border-orange-500/25 text-orange-400"
                              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          }`}
                        >
                          <PhoneCall className="w-5 h-5" />
                        </div>
                        <div className="space-y-1.5 max-w-[240px]">
                          <p className="text-sm font-bold text-slate-100 flex items-center justify-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                callingState === "calling" ? "bg-amber-400" : "bg-emerald-400"
                              }`}
                            />
                            {callingState === "calling" ? "Calling your phone..." : "Call Connected"}
                          </p>
                          <p className="text-xs text-slate-300 font-normal leading-relaxed">
                            {callingState === "calling"
                              ? currentPersona.callingInstruction
                              : currentPersona.connectedInstruction}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="turns-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2.5 pt-1 pb-1 flex flex-col justify-end min-h-full"
                      >
                        <AnimatePresence initial={false}>
                          {liveTurns.map((turn, i) => {
                            const isAgent = turn.startsWith("Agent:");
                            const rawText = turn.replace(/^(Agent|Caller):\s*/, "");
                            const isLatest = i === liveTurns.length - 1;
                            return (
                              <motion.div
                                key={turnIds[i] || i}
                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
                                className={`flex flex-col w-full ${isAgent ? "items-start" : "items-end"}`}
                              >
                                <motion.div
                                  layout
                                  className={`flex items-center gap-1.5 px-1 mb-1 text-xs font-bold ${
                                    isAgent ? "flex-row text-orange-400" : "flex-row-reverse text-indigo-300"
                                  }`}
                                >
                                  <span>{isAgent ? currentPersona.name : name || "You"}</span>
                                </motion.div>
                                <motion.div
                                  layout
                                  className={`max-w-[94%] p-3.5 overflow-hidden text-[13px] font-medium leading-relaxed`}
                                  style={isAgent ? {
                                    borderRadius: 16,
                                    borderTopLeftRadius: 4,
                                    background: "rgba(255, 255, 255, 0.05)",
                                    backdropFilter: "blur(12px)",
                                    WebkitBackdropFilter: "blur(12px)",
                                    border: "1px solid rgba(255, 120, 40, 0.2)",
                                    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
                                    color: "white",
                                  } : {
                                    borderRadius: 16,
                                    borderTopRightRadius: 4,
                                    background: "rgba(255, 255, 255, 0.03)",
                                    backdropFilter: "blur(12px)",
                                    WebkitBackdropFilter: "blur(12px)",
                                    border: "1px solid rgba(96, 165, 250, 0.2)",
                                    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
                                    color: "white",
                                  }}
                                >
                                  <motion.span layout="position" className="inline-block">
                                    {renderTranscriptText(rawText, isLatest)}
                                  </motion.span>
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <div ref={transcriptBottomRef} className="h-1" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: Live Notes */}
              <div className="w-[42%] bg-transparent border-0 p-0 flex flex-col h-full">
                <div className="flex items-center justify-between pb-2 mb-1 shrink-0">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block truncate">Live Notes</span>
                  <div className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 text-xs font-bold text-orange-400 tabular-nums shadow-sm">
                    {capturedFieldsCount}/{allFieldKeys.length}
                  </div>
                </div>
                <div className="w-full bg-white/[0.04] border border-white/[0.08] h-1.5 rounded-full overflow-hidden mb-2 shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${Math.round((capturedFieldsCount / Math.max(1, allFieldKeys.length)) * 100)}%` }}
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2 scroll-smooth">
                  <AnimatePresence>
                    {allFieldKeys.map((key) => {
                      const label = currentLabels[key] || key;
                      const val = getFieldValue(liveFields, key);
                      const hasValue =
                        val !== null &&
                        val !== undefined &&
                        val !== "" &&
                        val !== "null" &&
                        val !== "not_given" &&
                        val !== "not given";
                      const isRecentlyUpdated = (recentFieldKeys[key] || 0) > Date.now();
                      return (
                        <motion.div
                          key={key}
                          layout
                          ref={(el: HTMLDivElement | null) => { fieldRefs.current[key] = el; }}
                          className="p-2.5 rounded-xl transition-all duration-500 flex items-center justify-between relative overflow-hidden"
                          style={isRecentlyUpdated ? {
                            background: "rgba(255,85,0,0.16)",
                            backdropFilter: "blur(24px) saturate(200%)",
                            WebkitBackdropFilter: "blur(24px) saturate(200%)",
                            border: "1px solid rgba(255,100,0,0.95)",
                            boxShadow: "0 0 18px rgba(255,85,0,0.38)",
                            color: "white",
                          } : hasValue ? {
                            background: "rgba(255,255,255,0.17)",
                            backdropFilter: "blur(24px) saturate(180%)",
                            WebkitBackdropFilter: "blur(24px) saturate(180%)",
                            border: "1px solid rgba(255,255,255,0.36)",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
                            color: "white",
                          } : {
                            background: "rgba(255,255,255,0.09)",
                            backdropFilter: "blur(24px) saturate(180%)",
                            WebkitBackdropFilter: "blur(24px) saturate(180%)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
                            color: "rgba(255,255,255,0.85)",
                          } as any}
                        >
                          <div className="min-w-0 flex-1 pr-1.5">
                            <span className="text-xs text-slate-300 block truncate font-semibold">{label}</span>
                            <div className="mt-1">
                              <FormattedValue value={val} labelKey={key} />
                            </div>
                          </div>
                          {hasValue && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* IDLE FORM */}
        {!isMaintenance && callingState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[540px] h-auto min-h-[480px] lg:h-[540px] lg:aspect-square mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between"
          >
            <div className="flex justify-between items-center pb-3 shrink-0">
              <div>
                <h2 className="text-sm text-white font-bold tracking-tight">Test a Live AI Phone Call</h2>
                <p className="text-xs text-gray-400 font-normal mt-0.5">
                  Enter your number and pick an agent to get an instant test call.
                </p>
              </div>
            </div>

            <form onSubmit={handleInitiateCall} className="flex-1 min-h-0 flex flex-col justify-between mt-3">
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3.5 pr-0.5 pb-1">
                {/* Name */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-white/90 block">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full h-11 px-4 rounded-xl text-white text-sm placeholder:text-white/45 focus:outline-none transition-all font-medium"
                    style={{ background: "rgba(255,255,255,0.09)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.20)" } as any}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-white/90 block">Mobile Number</label>
                  <div className="flex gap-2">
                    <div
                      className="h-11 px-3.5 rounded-xl text-white text-sm font-bold flex items-center shrink-0 select-none"
                      style={{ background: "rgba(255,255,255,0.09)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.20)" } as any}
                    >
                      IN +91
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="flex-1 h-11 px-4 rounded-xl text-white text-sm placeholder:text-white/45 focus:outline-none transition-all font-medium tabular-nums"
                      style={{ background: "rgba(255,255,255,0.09)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.20)" } as any}
                    />
                  </div>
                </div>

                {/* Agent */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-white/90 block">Choose an Agent</label>
                  <div className="grid grid-cols-2 gap-2">
                    {industryOptions.map((item) => {
                      const Icon = item.icon;
                      const isSelected = useCase === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setUseCase(item.id)}
                          className="h-11 px-3.5 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-all cursor-pointer"
                          style={isSelected ? {
                            background: "rgba(255,85,0,0.20)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            border: "1px solid rgba(255,100,0,0.85)",
                            boxShadow: "0 0 14px rgba(255,85,0,0.28)",
                            color: "white",
                            fontWeight: 700,
                          } : {
                            background: "rgba(255,255,255,0.09)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            color: "white",
                          } as any}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#f97316]" : "text-gray-400"}`} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recruiter extras */}
                {useCase === "recruiter" && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/[0.05] backdrop-blur-md border border-indigo-500/20 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Role & Company Context (Optional)</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Job Description</label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste job requirements or role details..."
                        className="w-full h-16 p-2.5 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-medium transition-all resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Resume or Candidate Notes</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setResumeFileName(file.name);
                                try { setResumeText(await file.text()); }
                                catch { setResumeText(`Resume: ${file.name}`); }
                              }
                            }}
                            className="hidden"
                            id="demo-resume-file-input"
                          />
                          <label
                            htmlFor="demo-resume-file-input"
                            className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/50 text-slate-300 text-xs font-medium flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="truncate">{resumeFileName || "Upload file"}</span>
                            </span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={resumeText}
                          onChange={(e) => setResumeText(e.target.value)}
                          placeholder="Or paste skills..."
                          className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-medium truncate"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 shrink-0">
                <button
                  type="submit"
                  className="w-full h-14 min-h-[56px] rounded-2xl text-base font-bold bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:opacity-95 text-white shadow-xl shadow-orange-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer tracking-wide shrink-0"
                >
                  <PhoneCall className="w-5 h-5 fill-current shrink-0" />
                  <span>Call My Phone</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ERROR STATE */}
        {!isMaintenance && callingState === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-[#111218] border border-white/[0.08] p-6 rounded-2xl shadow-2xl text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <X className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Call Connection Failed</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={handleReset}
              type="button"
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
