"use client";
import { initiateDemoCall, pollDemoCallResult, runLiveExtraction } from "@/app/actions/demoCall";
import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Copy,
  ChevronRight,
  Clock,
  Mic,
  Shield,
  Layers,
  Code2,
  ExternalLink,
  FileText,
  Upload,
} from "lucide-react";


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
  ctaText: string;
  accent: string;
}

const PERSONAS: Record<string, Persona> = {
  hotel: {
    id: "hotel",
    name: "Sarah",
    role: "Front Desk Concierge",
    company: "The Grand Horizon Hotel",
    description: "Handles bookings, room choices, party sizes, and check-in schedules.",
    greeting: "Hi, this is Sarah from The Grand Horizon. How can I assist you with your reservation today?",
    inCallHint: "Try asking about room rates, dates, or party sizes to see fields capture in real time.",
    ctaText: "Automate Hospitality Bookings",
    accent: "orange",
  },
  medical: {
    id: "medical",
    name: "Emma",
    role: "Patient Intake Coordinator",
    company: "Riverside Clinic",
    description: "Gathers symptoms, patient history, triage priority, and preferred slots.",
    greeting: "Hello, this is Emma from Riverside Clinic. How can I help you today?",
    inCallHint: "Mention symptoms, appointment preferences, or urgency level.",
    ctaText: "Automate Patient Intake",
    accent: "teal",
  },
  sales: {
    id: "sales",
    name: "Jordan",
    role: "Inbound Sales Specialist",
    company: "Northwind Software",
    description: "Qualifies prospect size, software pain points, timeline, and demo booking.",
    greeting: "Hey, Jordan here with Northwind Software. Thanks for checking us out!",
    inCallHint: "Discuss your team size, key challenges, or preferred timeline for a demo.",
    ctaText: "Scale Inbound Sales",
    accent: "blue",
  },
  service: {
    id: "service",
    name: "Casey",
    role: "Dispatch Coordinator",
    company: "Bluefield Home Services",
    description: "Captures job category, repair details, location address, and emergency status.",
    greeting: "Hi, Casey with Bluefield Home Services. What issue can we help you resolve?",
    inCallHint: "Describe a plumbing or AC issue and share your location and urgency.",
    ctaText: "Automate Service Dispatch",
    accent: "amber",
  },
  real_estate: {
    id: "real_estate",
    name: "Riley",
    role: "Real Estate Advisor",
    company: "Maple & Co Realty",
    description: "Extracts buying/renting intent, property preference, budget, and timeline.",
    greeting: "Hi, Riley from Maple & Co Realty. Looking to buy, sell, or rent?",
    inCallHint: "Share your target budget, number of bedrooms, and preferred location.",
    ctaText: "Capture Real Estate Leads",
    accent: "emerald",
  },
  recruiter: {
    id: "recruiter",
    name: "Alex",
    role: "Talent Screener",
    company: "TalentStream Global",
    description: "Screens skills, experience level, salary expectation, and notice period.",
    greeting: "Hi, Alex calling from the talent acquisition team regarding your application.",
    inCallHint: "Mention your years of experience, primary skills, and notice period.",
    ctaText: "Streamline Candidate Screening",
    accent: "indigo",
  },
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  hotel: {
    caller_name: "Guest Name",
    wants_to_book: "Booking Intent",
    inquiry_type: "Inquiry Type",
    check_in_date: "Check-in Date",
    check_out_date: "Check-out Date",
    guests_count: "Party Size",
    room_preference: "Room Preference",
    sentiment: "Guest Sentiment",
    interest_score: "Interest Score",
  },
  medical: {
    patient_name: "Patient Name",
    patient_type: "Patient Type",
    call_reason: "Reason for Visit",
    symptoms_mentioned: "Symptoms Reported",
    preferred_date_time: "Requested Slot",
    action_taken: "Action Taken",
    urgency_level: "Urgency Level",
  },
  sales: {
    prospect_name: "Prospect Name",
    company_size: "Company Size",
    primary_pain_point: "Core Pain Point",
    timeline: "Purchase Timeline",
    demo_booked: "Demo Scheduled",
    lead_score: "Lead Score",
    sentiment: "Buyer Sentiment",
  },
  service: {
    customer_name: "Customer Name",
    service_category: "Service Category",
    issue_description: "Issue Description",
    service_address: "Service Address",
    preferred_schedule: "Preferred Time",
    urgency_level: "Urgency Level",
    job_status: "Job Status",
  },
  real_estate: {
    client_name: "Client Name",
    client_intent: "Intent (Buy/Rent/Sell)",
    property_preference: "Property Type",
    budget_range: "Target Budget",
    timeline: "Purchase Timeline",
    pre_approved_status: "Pre-Approved",
    lead_outcome: "Lead Status",
  },
  recruiter: {
    candidate_name: "Candidate Name",
    experience_level: "Experience Level",
    key_skills: "Primary Skills",
    salary_expectations: "Compensation Expectation",
    notice_period: "Notice Period",
    communication_skills: "Communication Score",
    candidate_score: "Candidate Fit Score",
  },
};

// ---------------------------------------------------------------------------
// Sub-Components: Formatted Value Renderer
// ---------------------------------------------------------------------------
function FormattedValue({ value, labelKey }: { value: any; labelKey: string }) {
  if (value === null || value === undefined || value === "" || value === "null") {
    return <span className="text-xs sm:text-sm text-slate-500 font-medium">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-bold ${
          value ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-slate-800 text-slate-400"
        }`}
      >
        {value ? "✓ Yes" : "✕ No"}
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
        <span className="text-xs sm:text-sm font-bold text-orange-400 tabular-nums">{value}/10</span>
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, value * 10))}%` }}
          />
        </div>
      </div>
    );
  }

  const str = String(value);
  if (labelKey === "sentiment") {
    const isPos = str.toLowerCase().includes("pos");
    const isNeg = str.toLowerCase().includes("neg");
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs sm:text-sm font-bold border ${
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

  return <span className="text-xs sm:text-sm font-bold text-slate-100 break-words leading-relaxed">{str}</span>;
}

// ---------------------------------------------------------------------------
// Call Completed Summary Card (Matching Exact Demo Theme & Layout)
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

  const allEntries = Object.entries(labels).map(([key, label]) => {
    const val = data?.[key];
    const hasValue = val !== null && val !== undefined && val !== "" && val !== "null";
    return { key, label, val, hasValue };
  });

  const capturedCount = allEntries.filter((e) => e.hasValue).length;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-[540px] h-[540px] aspect-square max-w-full mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between overflow-hidden animate-turn-in">
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
              <span className="text-xs text-slate-400 font-medium">
                {persona.company}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
              Call Summary & Extracted Data
            </h2>
          </div>
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-right">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Time</div>
            <div className="text-xs font-bold text-white tabular-nums">{formatTime(durationSec || 30)}</div>
          </div>
          <div className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-right">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Turns</div>
            <div className="text-xs font-bold text-orange-400 tabular-nums">{turnCount || 6}</div>
          </div>
        </div>
      </div>

      {/* Structured Fields Body (Always displays all schema fields with minimal accent colors) */}
      <div className="flex-1 min-h-0 flex flex-col space-y-2 py-2">
        <div className="flex items-center justify-between shrink-0 px-0.5">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            Extracted Fields ({capturedCount}/{allEntries.length})
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Synchronized
          </span>
        </div>

        {/* Data Cards Grid with Minimal Accent Tints */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 grid grid-cols-2 gap-2">
          {allEntries.map(({ key, label, val, hasValue }) => (
            <div
              key={key}
              className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                hasValue
                  ? "bg-gradient-to-br from-orange-500/[0.08] to-transparent border-orange-500/25 hover:border-orange-500/40 shadow-xs"
                  : "bg-white/[0.015] border-white/[0.05] opacity-55"
              }`}
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

      {/* Footer / CTA Actions matching Exact Colors */}
      <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onReset}
          className="h-12 px-4 rounded-2xl text-xs sm:text-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" /> Start Over
        </button>

        <a
          href="https://dograh.com"
          target="_blank"
          rel="noreferrer"
          className="flex-1 h-12 rounded-2xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:from-[#ff6414] hover:to-[#f43f5e] text-white shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer truncate"
        >
          <span className="truncate">{persona.ctaText}</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Interactive Application
// ---------------------------------------------------------------------------
export function DemoCallForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [useCase, setUseCase] = useState("hotel");
  const [callingState, setCallingState] = useState<"idle" | "calling" | "connected" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedData, setExtractedData] = useState<any | null>(null);

  // Recruiter specific context inputs
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");

  // Real-time live extraction states
  const [liveFields, setLiveFields] = useState<Record<string, any>>({});
  const [liveTurns, setLiveTurns] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);

  // Temporary 2.5-3s highlight tracking for newly extracted words & fields
  const [activeHighlights, setActiveHighlights] = useState<
    Array<{ phrase: string; key: string; expiresAt: number }>
  >([]);
  const [recentFieldKeys, setRecentFieldKeys] = useState<Record<string, number>>({});

  const pollIntervalRef = useRef<any>(null);
  const sseRef = useRef<EventSource | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const durationTimerRef = useRef<any>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll newly extracted/updated field into view in right column
  useEffect(() => {
    const updatedKeys = Object.keys(recentFieldKeys);
    if (updatedKeys.length > 0) {
      const newestKey = updatedKeys.sort(
        (a, b) => (recentFieldKeys[b] || 0) - (recentFieldKeys[a] || 0)
      )[0];
      if (newestKey && fieldRefs.current[newestKey]) {
        fieldRefs.current[newestKey]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [recentFieldKeys]);

  const clearTimers = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Cleanup expired highlights periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveHighlights((prev) => prev.filter((h) => h.expiresAt > now));
      setRecentFieldKeys((prev) => {
        const next: Record<string, number> = {};
        for (const [k, exp] of Object.entries(prev)) {
          if (exp > now) next[k] = exp;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Trigger temporary highlight when new field values arrive
  const triggerFieldHighlights = (newFields: Record<string, any>, currentPrevFields: Record<string, any>) => {
    const now = Date.now();
    const expiresAt = now + 2800; // 2.8 seconds
    const newHighlights: Array<{ phrase: string; key: string; expiresAt: number }> = [];
    const updatedKeys: Record<string, number> = {};
    const citations = newFields._citations || {};

    for (const [key, val] of Object.entries(newFields)) {
      if (key === "_citations") continue;
      if (val !== null && val !== undefined && val !== "" && currentPrevFields[key] !== val) {
        updatedKeys[key] = expiresAt;

        // Determine extractable search words/phrases from AI citations
        if (citations[key] && Array.isArray(citations[key])) {
          for (const phrase of citations[key]) {
            if (typeof phrase === "string" && phrase.trim().length >= 2) {
              newHighlights.push({ phrase: phrase.trim(), key, expiresAt });
            }
          }
        } else {
          // Fallback if AI didn't provide a citation
          if (typeof val === "string" && val.trim().length >= 2) {
            newHighlights.push({ phrase: val.trim(), key, expiresAt });
          } else if (typeof val === "number") {
            newHighlights.push({ phrase: String(val), key, expiresAt });
          }
        }
      }
    }

    if (newHighlights.length > 0) {
      setActiveHighlights((prev) => [...prev, ...newHighlights]);
    }
    if (Object.keys(updatedKeys).length > 0) {
      setRecentFieldKeys((prev) => ({ ...prev, ...updatedKeys }));
    }
  };

  // Duration timer
  useEffect(() => {
    if (callingState === "connected") {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callingState !== "done") {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
  }, [callingState]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveTurns]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name) return;

    setCallingState("calling");
    setErrorMessage("");
    setExtractedData(null);
    setLiveFields({});
    setLiveTurns([]);
    setTurnCount(0);
    setCallDuration(0);

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("phone", phone);
      formData.set("useCase", useCase);
      if (jobDescription) formData.set("jobDescription", jobDescription);
      if (resumeText) formData.set("resumeText", resumeText); // We don't have file here, just pass text
      
      const result = await initiateDemoCall(null, formData as any);
      if (!result?.success) {
        setCallingState("error");
        setErrorMessage(result?.error || "Failed to initiate call.");
        return;
      }
      const runId = result.workflowRunId;

      // SSE connection for live transcription
      const sseUrl = `https://talkar.in/api/v1/public/agent/run/${runId}/stream?use_case=${useCase}`;
      const es = new EventSource(sseUrl);
      sseRef.current = es;

      const lastExtractedTurnCountRef = { current: 0 };
      const finalLinesRef: string[] = [];
      let partialUserLine = "";

      es.onmessage = (evt) => {
        if (!evt.data) return;
        const msg = JSON.parse(evt.data);

        if (msg.type === "ended" || msg.type === "timeout") {
          es.close();
          sseRef.current = null;
          return;
        }

        if (msg.type !== "turn") return;

        // Active connection
        setCallingState("connected");

        if (msg.role === "agent") {
          if (finalLinesRef.length > 0 && finalLinesRef[finalLinesRef.length - 1].startsWith("Agent: ")) {
            finalLinesRef[finalLinesRef.length - 1] +=
              (finalLinesRef[finalLinesRef.length - 1] === "Agent: " ? "" : " ") + msg.text;
          } else {
            finalLinesRef.push(`Agent: ${msg.text}`);
          }

          setLiveTurns([...finalLinesRef, ...(partialUserLine ? [partialUserLine] : [])]);

          // Trigger extraction on bot turn
          if (finalLinesRef.length > lastExtractedTurnCountRef.current) {
            lastExtractedTurnCountRef.current = finalLinesRef.length;
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
          if (!msg.final) {
            partialUserLine = `Caller: ${msg.text}`;
            setLiveTurns([...finalLinesRef, partialUserLine]);
          } else {
            partialUserLine = "";
            finalLinesRef.push(`Caller: ${msg.text}`);
            const snapshot = [...finalLinesRef];
            setLiveTurns(snapshot);
            setTurnCount(snapshot.length);

            if (snapshot.length > lastExtractedTurnCountRef.current) {
              lastExtractedTurnCountRef.current = snapshot.length;
              runLiveExtraction(snapshot, useCase)
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
          }
        }
      };

      es.onerror = () => {
        es.close();
        sseRef.current = null;
      };

      // Periodic check for call completion
      pollIntervalRef.current = setInterval(async () => {
        const { ready: isCompleted, extractedData: doneData } = await pollDemoCallResult(runId);
        if (isCompleted) {
          clearTimers();
          setLiveFields((currentLive) => {
            const merged = { ...currentLive, ...(doneData || {}) };
            setExtractedData(merged);
            return merged;
          });
          setCallingState("done");
        }
      }, 4000);
    } catch (err: any) {
      setCallingState("error");
      setErrorMessage(err.message || "Failed to initiate outbound demo call.");
    }
  };

  const handleReset = () => {
    clearTimers();
    setCallingState("idle");
    setErrorMessage("");
    setExtractedData(null);
    setLiveFields({});
    setLiveTurns([]);
    setTurnCount(0);
    setCallDuration(0);
    setActiveHighlights([]);
    setRecentFieldKeys({});
    setJobDescription("");
    setResumeText("");
    setResumeFileName("");
  };

  // Helper to render transcript text with temporary entity highlights & smooth blur-in streaming
  const renderTranscriptText = (rawText: string, isLatest: boolean) => {
    const matchingPhrases = activeHighlights
      .map((h) => h.phrase.trim())
      .filter((p) => p.length >= 2 && rawText.toLowerCase().includes(p.toLowerCase()));

    if (matchingPhrases.length === 0) {
      const words = rawText.split(" ");
      return (
        <span className="font-normal whitespace-pre-wrap">
          {words.map((word, wIdx) => {
            const isStreamedWord = isLatest && wIdx >= words.length - 4;
            return (
              <span
                key={wIdx}
                className={isStreamedWord ? "animate-word-stream-blur" : "inline"}
              >
                {word}
                {wIdx < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </span>
      );
    }

    matchingPhrases.sort((a, b) => b.length - a.length);
    const escaped = matchingPhrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const parts = rawText.split(regex);

    return (
      <span className="font-normal whitespace-pre-wrap">
        {parts.map((part, pIdx) => {
          const isMatch = matchingPhrases.some(
            (phrase) => phrase.toLowerCase() === part.toLowerCase()
          );
          if (isMatch) {
            return (
              <span key={pIdx} className="entity-temporary-highlight font-semibold">
                {part}
              </span>
            );
          }
          return <span key={pIdx}>{part}</span>;
        })}
      </span>
    );
  };

  const currentPersona = PERSONAS[useCase] || PERSONAS.hotel;
  const currentLabels = FIELD_LABELS[useCase] || FIELD_LABELS.hotel;
  const allFieldKeys = Object.keys(currentLabels);
  const capturedFieldsCount = Object.entries(liveFields).filter(
    ([k, v]) => k !== "_citations" && v !== null && v !== undefined && v !== ""
  ).length;

  const industryOptions = [
    { id: "hotel", label: "Hotels & Stays", persona: "Sarah · Front Desk", icon: Hotel },
    { id: "medical", label: "Healthcare", persona: "Emma · Patient Intake", icon: Stethoscope },
    { id: "sales", label: "Sales & Leads", persona: "Jordan · Qualifying AI", icon: Briefcase },
    { id: "service", label: "Home Services", persona: "Casey · Dispatcher", icon: Wrench },
    { id: "real_estate", label: "Real Estate", persona: "Riley · Advisor", icon: Home },
    { id: "recruiter", label: "Recruiter AI", persona: "Alex · HR Specialist", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Brand Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2 mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm">
            <Mic className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-white tracking-tight">Dograh</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hidden sm:inline-block">
              Voice Telephony Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Live Demo Engine
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl flex flex-col items-center justify-center flex-1 my-auto">
        {/* COMPLETED STATE */}
        {callingState === "done" && extractedData && (
          <CallCompletedCard
            data={extractedData}
            useCase={useCase}
            durationSec={callDuration}
            turnCount={turnCount || liveTurns.length}
            onReset={handleReset}
          />
        )}

        {/* IN-CALL / STREAMING STATE (Completely Transparent 540x540 Placeholder, No Background, No Border, Pure Full-Height Split) */}
        {(callingState === "calling" || callingState === "connected") && (
          <div className="w-[540px] h-[540px] aspect-square max-w-full mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between overflow-hidden animate-turn-in">
            {/* 60/40 Split: Transcript (7/12) & Captured Data (5/12) - Pure Full Height */}
            <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 h-full items-stretch">
              {/* Left Column: Live Transcript (60%) Completely Backgroundless with Upper Mask Fade */}
              <div className="col-span-7 bg-transparent border-0 p-0 flex flex-col h-full overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 flex flex-col justify-end mask-top-fade scroll-smooth">
                  {liveTurns.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2 my-auto">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-slate-300">
                        <PhoneCall className="w-5 h-5 animate-pulse text-amber-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-200">
                        {callingState === "calling" ? "Calling your phone..." : "Connected · Speak now"}
                      </p>
                      <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                        {callingState === "calling"
                          ? "Answer call to start."
                          : currentPersona.inCallHint}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1 pb-1 flex flex-col justify-end min-h-full">
                      {liveTurns.map((turn, i) => {
                        const isAgent = turn.startsWith("Agent:");
                        const rawText = turn.replace(/^(Agent|Caller):\s*/, "");
                        const isLatest = i === liveTurns.length - 1;

                        return (
                          <div
                            key={i}
                            className={`flex flex-col ${isAgent ? "items-start" : "items-end"} message-bubble-in`}
                          >
                            <div
                              className={`flex items-center gap-1.5 px-1 mb-1 text-xs font-bold ${
                                isAgent ? "flex-row text-orange-400" : "flex-row-reverse text-indigo-300"
                              }`}
                            >
                              <span>{isAgent ? currentPersona.name : name || "You"}</span>
                            </div>

                            <div
                              className={`max-w-[94%] p-3 rounded-2xl text-[13px] sm:text-sm font-medium leading-relaxed shadow-sm smooth-bubble-expand ${
                                isAgent
                                  ? "bg-gradient-to-br from-[#241710] to-[#15131a] border border-[#ea580c]/30 text-slate-100 rounded-tl-xs"
                                  : "bg-gradient-to-br from-[#1b1f30] to-[#111320] border border-indigo-500/25 text-white rounded-tr-xs"
                              }`}
                            >
                              {renderTranscriptText(rawText, isLatest)}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={transcriptBottomRef} className="h-1" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Captured Data (40%) Completely Backgroundless */}
              <div className="col-span-5 bg-transparent border-0 p-0 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between pb-2 mb-1 shrink-0">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block truncate">
                    Fields
                  </span>
                  <div className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-orange-400 tabular-nums">
                    {capturedFieldsCount}/{allFieldKeys.length}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden mb-2 shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                    style={{
                      width: `${Math.round((capturedFieldsCount / Math.max(1, allFieldKeys.length)) * 100)}%`,
                    }}
                  />
                </div>

                {/* Field Grid with Transparent Scrolling & Auto-scroll */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2 scroll-smooth">
                  {allFieldKeys.map((key) => {
                    const label = currentLabels[key] || key;
                    const val = liveFields[key];
                    const hasValue = val !== null && val !== undefined && val !== "";
                    const isRecentlyUpdated = (recentFieldKeys[key] || 0) > Date.now();

                    return (
                      <div
                        key={key}
                        ref={(el) => { fieldRefs.current[key] = el; }}
                        className={`p-2.5 rounded-xl border backdrop-blur-md transition-all duration-500 flex items-center justify-between ${
                          isRecentlyUpdated
                            ? "bg-orange-500/[0.12] border-orange-500/60 field-unlock-card shadow-sm shadow-orange-500/10"
                            : hasValue
                            ? "bg-white/[0.03] border-white/[0.10] hover:bg-white/[0.05]"
                            : "bg-white/[0.01] border-white/[0.04] opacity-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-1.5">
                          <span className="text-xs text-slate-300 block truncate font-semibold">
                            {label}
                          </span>
                          <div className="mt-1">
                            <FormattedValue value={val} labelKey={key} />
                          </div>
                        </div>

                        {hasValue && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IDLE / SETUP FORM STATE (Exact Design & Color Language from Screenshot) */}
        {callingState === "idle" && (
          <div className="w-full max-w-[540px] space-y-4 animate-turn-in">
            {/* Hero Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Interactive Demo</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Conversational{" "}
                <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                  Voice AI
                </span>
              </h1>

              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose an agent, enter your number, and test live AI calling.
              </p>
            </div>

            {/* Main Form Card (Completely Transparent Placeholder, No Background, No Border) */}
            <div className="w-[540px] h-[540px] aspect-square max-w-full mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between overflow-hidden">
              {/* Card Header */}
              <div className="flex justify-between items-center border-b border-white/[0.08] pb-3 shrink-0">
                <div>
                  <h2 className="text-sm sm:text-base text-white font-bold tracking-tight">
                    Try Live AI Demo
                  </h2>
                  <p className="text-xs text-gray-400 font-normal mt-0.5">
                    Receive an instant test call from Dograh
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs text-emerald-400 font-semibold">Ready</span>
                </div>
              </div>

              <form onSubmit={handleInitiateCall} className="flex-1 min-h-0 flex flex-col justify-between mt-3">
                {/* Scrollable Form Body (No Visible Scrollbars) */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3.5 pr-0.5 pb-1">
                  {/* Your Name */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs sm:text-sm font-semibold text-white/90 block">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rahul Sharma"
                      className="w-full h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-orange-500 focus:bg-white/[0.06] transition-all font-medium"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs sm:text-sm font-semibold text-white/90 block">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <div className="h-11 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md text-white text-sm font-semibold flex items-center shrink-0 select-none">
                        IN +91
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        className="flex-1 h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-orange-500 focus:bg-white/[0.06] transition-all font-medium tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Select Business Type */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs sm:text-sm font-semibold text-white/90 block">
                      Select Business Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {industryOptions.map((item) => {
                        const Icon = item.icon;
                        const isSelected = useCase === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setUseCase(item.id)}
                            className={`h-11 px-3.5 rounded-xl text-xs sm:text-sm font-medium border text-left flex items-center gap-2.5 transition-all cursor-pointer backdrop-blur-md ${
                              isSelected
                                ? "bg-[#28150a]/80 border-2 border-[#ea580c] text-[#f97316] font-bold shadow-[0_0_15px_rgba(234,88,12,0.2)]"
                                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-gray-300"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isSelected ? "text-[#f97316]" : "text-gray-400"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recruiter Context Section (If Recruiter AI Selected) */}
                  {useCase === "recruiter" && (
                    <div className="p-3.5 rounded-2xl bg-indigo-500/[0.05] backdrop-blur-md border border-indigo-500/20 space-y-2.5 animate-turn-in">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-200">
                          Screening Context (Optional)
                        </span>
                      </div>

                      {/* Job Description */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300 block">
                          Job Description
                        </label>
                        <textarea
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          placeholder="Paste job requirements or role details..."
                          className="w-full h-16 p-2.5 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/[0.05] text-xs sm:text-sm font-medium transition-all resize-none"
                        />
                      </div>

                      {/* Resume Upload / Text */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300 block">
                          Candidate Resume
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,.docx,.txt,.md"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setResumeFileName(file.name);
                                  try {
                                    const text = await file.text();
                                    setResumeText(text);
                                  } catch {
                                    setResumeText(`Resume: ${file.name}`);
                                  }
                                }
                              }}
                              className="hidden"
                              id="resume-file-input"
                            />
                            <label
                              htmlFor="resume-file-input"
                              className="w-full h-10 px-3 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] hover:border-indigo-500/50 text-slate-300 text-xs font-medium flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <span className="truncate flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate">
                                  {resumeFileName || "Upload file"}
                                </span>
                              </span>
                            </label>
                          </div>

                          <input
                            type="text"
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Or paste skills..."
                            className="w-full h-10 px-3 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/[0.05] text-xs sm:text-sm font-medium truncate"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pinned Action Button (Full Height, Never Squished) */}
                <div className="pt-3 border-t border-white/[0.08] shrink-0">
                  <button
                    type="submit"
                    className="w-full h-14 min-h-[56px] rounded-2xl text-base sm:text-lg font-extrabold bg-gradient-to-r from-[#FF5500] to-[#E11D48] hover:from-[#ff6414] hover:to-[#f43f5e] text-white shadow-xl shadow-orange-600/30 ring-2 ring-orange-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer tracking-wide shrink-0"
                  >
                    <PhoneCall className="w-5 h-5 fill-current shrink-0" />
                    <span>Receive Demo Call</span>
                    <ArrowRight className="w-5 h-5 shrink-0" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {callingState === "error" && (
          <div className="w-full max-w-md bg-[#111218] border border-white/[0.08] p-6 sm:p-7 rounded-2xl shadow-2xl text-center space-y-4 animate-turn-in">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <X className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Call Connection Failed</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={handleReset}
              type="button"
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Clean Bottom Footer */}
      <footer className="w-full max-w-5xl py-4 mt-6 text-center text-xs sm:text-sm text-slate-500 border-t border-white/[0.04] flex items-center justify-between">
        <span>Powered by Dograh Telephony Engine</span>
        <span className="font-mono text-xs text-slate-600">v1.2 · Real-Time Extraction</span>
      </footer>
    </div>
  );
}
