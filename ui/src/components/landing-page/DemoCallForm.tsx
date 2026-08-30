"use client";

import { initiateDemoCall, runLiveExtraction } from "@/app/actions/demoCall";
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
  RotateCcw,
  CheckCircle2,
  FileText,
  Upload,
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
    role: "Front Desk Concierge",
    company: "The Grand Horizon Hotel",
    description: "Handles bookings, room choices, party sizes, and check-in schedules.",
    greeting: "Hi, this is Sarah from The Grand Horizon. How can I assist you with your reservation today?",
    inCallHint: "Try asking about room rates, dates, or party sizes to see fields capture in real time.",
    callingInstruction: "Please answer Sarah's call and stay on this screen to watch your reservation details get captured in real time.",
    connectedInstruction: "Speak naturally with Sarah — your booking details and live transcript will stream right here.",
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
    callingInstruction: "Please answer Emma's call and stay on this screen to see patient intake notes captured live.",
    connectedInstruction: "Describe your symptoms or appointment request to see clinical triage notes log live.",
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
    callingInstruction: "Please answer Jordan's call and stay on this screen to see qualification criteria captured live.",
    connectedInstruction: "Share your team's software requirements to see qualification notes fill live.",
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
    callingInstruction: "Please answer Casey's call and stay on this screen to see service dispatch details filled live.",
    connectedInstruction: "Explain the maintenance or repair issue to see the dispatch ticket build live.",
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
    callingInstruction: "Please answer Riley's call and stay on this screen to watch buyer preferences logged live.",
    connectedInstruction: "Share your property search criteria to see buyer preferences captured live.",
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
    callingInstruction: "Please answer Alex's call and stay on this screen to watch candidate screening notes captured live.",
    connectedInstruction: "Discuss your background and experience to see screening criteria evaluate live.",
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

  const str = String(value);
  if (labelKey === "sentiment") {
    const isPos = str.toLowerCase().includes("pos");
    const isNeg = str.toLowerCase().includes("neg");
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
            <div className="text-xs font-bold text-white tabular-nums">{formatTime(durationSec || 30)}</div>
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
          href="https://dograh.com"
          target="_blank"
          rel="noreferrer"
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
    } else if (callingState !== "done") {
      if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    }
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
      if (resumeText) formData.set("resumeText", resumeText);

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
      let partialUserLine = "";

      es.onmessage = (evt) => {
        if (!evt.data) return;
        const msg = JSON.parse(evt.data);

        if (msg.type === "ended" || msg.type === "timeout") {
          es.close();
          sseRef.current = null;
          // Final extraction from server polling
          if (finalLinesRef.length > 0) {
            runLiveExtraction([...finalLinesRef], useCase)
              .then((fields) => {
                if (fields && Object.keys(fields).length > 0) {
                  setExtractedData(fields);
                }
              })
              .catch(console.error)
              .finally(() => {
                setCallingState("done");
                setExtractedData((prev: any) => prev || liveFields);
              });
          } else {
            setCallingState("done");
            setExtractedData(liveFields);
          }
          return;
        }

        if (msg.type !== "turn") return;

        setCallingState("connected");

        if (msg.role === "agent") {
          if (finalLinesRef.length > 0 && finalLinesRef[finalLinesRef.length - 1].startsWith("Agent: ")) {
            finalLinesRef[finalLinesRef.length - 1] +=
              (finalLinesRef[finalLinesRef.length - 1] === "Agent: " ? "" : " ") + msg.text;
          } else {
            finalLinesRef.push(`Agent: ${msg.text}`);
          }
          setLiveTurns([...finalLinesRef, ...(partialUserLine ? [partialUserLine] : [])]);

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
          setTurnCount((t) => t + 1);
          if (msg.is_final) {
            finalLinesRef.push(`Caller: ${msg.text}`);
            partialUserLine = "";
          } else {
            partialUserLine = `Caller: ${msg.text}`;
          }
          setLiveTurns([...finalLinesRef, ...(partialUserLine ? [partialUserLine] : [])]);
        }
      };

      es.onerror = () => {
        es.close();
        sseRef.current = null;
        if (callingState !== "done") {
          setCallingState("done");
          setExtractedData(liveFields);
        }
      };
    } catch (err: any) {
      setCallingState("error");
      setErrorMessage(err?.message || "Unexpected error. Please try again.");
    }
  };

  const currentPersona = PERSONAS[useCase] || PERSONAS.hotel;
  const currentLabels = FIELD_LABELS[useCase] || FIELD_LABELS.hotel;
  const allFieldKeys = Object.keys(currentLabels);
  const capturedFieldsCount = Object.entries(liveFields).filter(
    ([k, v]) => k !== "_citations" && v !== null && v !== undefined && v !== ""
  ).length;

  const industryOptions = [
    { id: "hotel", label: "Hotel Bookings", icon: Hotel },
    { id: "medical", label: "Clinic Appointments", icon: Stethoscope },
    { id: "sales", label: "Inbound Sales", icon: Briefcase },
    { id: "service", label: "Service Dispatch", icon: Wrench },
    { id: "real_estate", label: "Real Estate", icon: Home },
    { id: "recruiter", label: "Hiring & Screening", icon: Users },
  ];

  return (
    <div className="w-full h-full text-slate-100 flex flex-col items-center justify-center font-sans selection:bg-orange-500 selection:text-white relative">
      <AnimatePresence mode="wait">
        {/* COMPLETED STATE */}
        {callingState === "done" && extractedData && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex justify-center"
          >
            <CallCompletedCard
              data={extractedData}
              useCase={useCase}
              durationSec={callDuration}
              turnCount={turnCount || liveTurns.length}
              onReset={handleReset}
            />
          </motion.div>
        )}

        {/* IN-CALL / STREAMING STATE */}
        {(callingState === "calling" || callingState === "connected") && (
          <motion.div
            key="active-call"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-[540px] h-[540px] max-h-[540px] aspect-square max-w-full mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between"
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
                                key={i}
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
                                  className={`max-w-[94%] p-3.5 overflow-hidden text-[13px] font-medium leading-relaxed border ${
                                    isAgent
                                      ? "glass-frosted-bubble-agent text-white rounded-2xl rounded-tl-sm shadow-[0_4px_24px_rgba(255,85,0,0.2)]"
                                      : "glass-frosted-bubble-user text-white rounded-2xl rounded-tr-sm shadow-[0_4px_24px_rgba(37,99,235,0.25)]"
                                  }`}
                                  style={{ borderRadius: 16 }}
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
                      const val = liveFields[key];
                      const hasValue = val !== null && val !== undefined && val !== "";
                      const isRecentlyUpdated = (recentFieldKeys[key] || 0) > Date.now();
                      return (
                        <motion.div
                          key={key}
                          layout
                          ref={(el: HTMLDivElement | null) => { fieldRefs.current[key] = el; }}
                          className={`p-2.5 rounded-xl transition-all duration-500 flex items-center justify-between relative overflow-hidden ${
                            isRecentlyUpdated
                              ? "demo-premium-extraction-card text-white"
                              : hasValue
                              ? "demo-glass-card-active text-white"
                              : "demo-glass-card text-white/90"
                          }`}
                          style={{ backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)" } as any}
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
        {callingState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-[540px] h-[540px] aspect-square max-w-full mx-auto bg-transparent border-0 shadow-none flex flex-col justify-between"
          >
            <div className="flex justify-between items-center pb-3 shrink-0">
              <div>
                <h2 className="text-sm text-white font-bold tracking-tight">Test a Live AI Phone Call</h2>
                <p className="text-xs text-gray-400 font-normal mt-0.5">
                  Enter your number and pick a scenario to get an instant test call.
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
                    className="w-full h-11 px-4 rounded-xl demo-glass-input text-white text-sm placeholder:text-white/45 focus:outline-none focus:border-[#FF5500] transition-all font-medium shadow-sm"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-white/90 block">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="h-11 px-3.5 rounded-xl demo-glass-input text-white text-sm font-bold flex items-center shrink-0 select-none shadow-sm">
                      IN +91
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="flex-1 h-11 px-4 rounded-xl demo-glass-input text-white text-sm placeholder:text-white/45 focus:outline-none focus:border-[#FF5500] transition-all font-medium tabular-nums shadow-sm"
                    />
                  </div>
                </div>

                {/* Scenario */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-white/90 block">Choose a Scenario</label>
                  <div className="grid grid-cols-2 gap-2">
                    {industryOptions.map((item) => {
                      const Icon = item.icon;
                      const isSelected = useCase === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setUseCase(item.id)}
                          className={`h-11 px-3.5 rounded-xl text-xs font-medium text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? "demo-glass-card-selected text-white font-bold shadow-[0_0_15px_rgba(255,85,0,0.3)]"
                              : "demo-glass-card text-white shadow-sm"
                          }`}
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
        {callingState === "error" && (
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
