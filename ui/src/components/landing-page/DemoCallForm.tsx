"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, PhoneCall, ArrowRight, Hotel, Stethoscope, Briefcase, Wrench, Star, BedDouble, Users, Calendar, Smile, Meh, Frown, Home } from "lucide-react";
import Link from "next/link";
import { initiateDemoCall, pollDemoCallResult } from "@/app/actions/demoCall";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HotelExtractedData {
    caller_name?: string;
    wants_to_book?: boolean;
    inquiry_type?: string;
    check_in_date?: string;
    guests_count?: number;
    room_preference?: string;
    sentiment?: "Positive" | "Neutral" | "Negative";
    interest_score?: number;
}

interface SalesExtractedData {
    prospect_name?: string;
    company_size?: string;
    primary_pain_point?: string;
    timeline?: string;
    demo_booked?: boolean;
    lead_score?: number;
    sentiment?: string;
}

interface RecruiterExtractedData {
    candidate_name?: string;
    experience_level?: string;
    key_skills?: string;
    salary_expectations?: string;
    notice_period?: string;
    communication_skills?: string;
    candidate_score?: number;
}

interface MedicalExtractedData {
    patient_name?: string;
    patient_type?: string;
    call_reason?: string;
    symptoms_mentioned?: string;
    preferred_date_time?: string;
    action_taken?: string;
    urgency_level?: string;
}

interface ServiceExtractedData {
    customer_name?: string;
    service_category?: string;
    issue_description?: string;
    service_address?: string;
    preferred_schedule?: string;
    urgency_level?: string;
    job_status?: string;
}

interface RealEstateExtractedData {
    client_name?: string;
    client_intent?: string;
    property_preference?: string;
    budget_range?: string;
    timeline?: string;
    pre_approved_status?: string;
    lead_outcome?: string;
}

// ---------------------------------------------------------------------------
// Hotel Demo Result Card
// ---------------------------------------------------------------------------

function HotelResultCard({
    data,
    phone,
}: {
    data: HotelExtractedData;
    phone: string;
}) {
    // Generate hospitality-themed status and intent summaries
    const hasHighIntent = data.wants_to_book && (data.interest_score ?? 0) >= 7;
    
    const engagementLabel = 
        (data.interest_score ?? 0) >= 8 ? "Highly Committed" :
        (data.interest_score ?? 0) >= 5 ? "Inquisitive & Warm" : "General Inquiry";
        
    const sentimentLabel = 
        data.sentiment === "Positive" ? "Warm & Receptive" :
        data.sentiment === "Negative" ? "Hesitant / Neutral" : "Neutral & Polite";

    return (
        <div className="w-full max-w-md bg-[#0C0B0F] border border-neutral-850 rounded-xl shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-500 space-y-0">
            {/* Header / Branding */}
            <div className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between bg-[#111014]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Hotel className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold tracking-wider text-neutral-300 uppercase leading-none">THE GRAND HORIZON</h4>
                        <span className="text-[10px] text-neutral-500 font-medium">Guest Assistant Log</span>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-medium text-emerald-400 tracking-wider uppercase">
                    Processed
                </span>
            </div>

            {/* AI Summary Highlight */}
            <div className="px-6 py-4.5 bg-[#141318]/50 border-b border-neutral-900/60">
                <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider block mb-1">CONVERSATION OVERVIEW</span>
                <p className="text-xs text-neutral-400 italic leading-relaxed">
                    "{data.caller_name || "Guest"} initiated an inquiry. {
                        hasHighIntent 
                            ? "They demonstrated clear booking intent and would like to finalize room arrangements." 
                            : "They reviewed property details and availability with no active booking requested yet."
                    }"
                </p>
            </div>

            {/* Industrial Grid Details */}
            <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-neutral-900/60">
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">GUEST</span>
                    <span className="text-xs font-semibold text-neutral-200">{data.caller_name || "Anonymous Guest"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">INTENT STATUS</span>
                    <span className={`text-xs font-semibold ${data.wants_to_book ? "text-amber-400" : "text-neutral-400"}`}>
                        {data.wants_to_book ? "Reservation Requested" : "Inquiry Only"}
                    </span>
                </div>

                {data.check_in_date && (
                    <div>
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">CHECK-IN</span>
                        <span className="text-xs font-semibold text-neutral-200">{data.check_in_date}</span>
                    </div>
                )}
                {data.guests_count != null && data.guests_count > 0 && (
                    <div>
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">PARTY SIZE</span>
                        <span className="text-xs font-semibold text-neutral-200">{data.guests_count} {data.guests_count === 1 ? "Guest" : "Guests"}</span>
                    </div>
                )}
                
                {data.room_preference && (
                    <div className="col-span-2">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">ROOM PREFERENCE</span>
                        <span className="text-xs font-semibold text-neutral-300">{data.room_preference}</span>
                    </div>
                )}
            </div>

            {/* Hospitality Engagement Insights */}
            <div className="px-6 py-4 bg-[#111014]/80 grid grid-cols-2 gap-4 border-b border-neutral-900/60">
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">GUEST SENTIMENT</span>
                    <span className="text-xs font-semibold text-neutral-200">{sentimentLabel}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">ENGAGEMENT INDEX</span>
                    <span className="text-xs font-semibold text-amber-400">{engagementLabel}</span>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-[#111014] flex items-center justify-between gap-3">
                <Link
                    href="/auth/signup"
                    className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
                >
                    Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sales Demo Result Card
// ---------------------------------------------------------------------------

function SalesResultCard({
    data,
}: {
    data: SalesExtractedData;
    phone: string;
}) {
    // Generate SaaS CRM-themed status and intent summaries
    const isHotLead = data.demo_booked || (data.lead_score ?? 0) >= 8;
    
    const pipelineStatus = data.demo_booked ? "Demo Scheduled (SQL)" : isHotLead ? "Priority Nurture (MQL)" : "Lead Nurture";
    const pipelineColor = data.demo_booked ? "text-emerald-400" : isHotLead ? "text-amber-400" : "text-indigo-400";
    const badgeColor = data.demo_booked ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400";
        
    const scoreLabel = 
        (data.lead_score ?? 0) >= 8 ? "🔥 Hot Lead (High Intent)" :
        (data.lead_score ?? 0) >= 5 ? "Warm Lead" : "❄️ Cold Lead (Low Intent)";

    return (
        <div className="w-full max-w-md bg-[#0A0F1C] border border-[#1E293B] rounded-xl shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-500 space-y-0">
            {/* Header / Branding */}
            <div className="border-b border-[#1E293B] px-6 py-4 flex items-center justify-between bg-[#0F172A]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold tracking-wider text-slate-300 uppercase leading-none">NORTHWIND SOFTWARE</h4>
                        <span className="text-[10px] text-slate-500 font-medium">Lead Intelligence Brief</span>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider uppercase ${badgeColor}`}>
                    {data.demo_booked ? "Meeting Booked" : "Processed"}
                </span>
            </div>

            {/* AI Summary Highlight */}
            <div className="px-6 py-4.5 bg-[#0F172A]/50 border-b border-[#1E293B]/60">
                <span className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-wider block mb-1">DEAL BRIEF</span>
                <p className="text-xs text-slate-400 italic leading-relaxed">
                    "Prospect initiated an inbound sales inquiry. {
                        data.demo_booked 
                            ? "They are actively evaluating solutions and scheduled a product demo." 
                            : "They are currently exploring options and gathering initial information."
                    }"
                </p>
            </div>

            {/* Industrial CRM Grid Details */}
            <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#1E293B]/60">
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">LEAD NAME</span>
                    <span className="text-xs font-semibold text-slate-200">{data.prospect_name || "Anonymous Prospect"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PIPELINE STATUS</span>
                    <span className={`text-xs font-semibold ${pipelineColor}`}>
                        {pipelineStatus}
                    </span>
                </div>

                {data.company_size && (
                    <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">COMPANY SIZE</span>
                        <span className="text-xs font-semibold text-slate-200">{data.company_size}</span>
                    </div>
                )}
                {data.timeline && (
                    <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">TIMELINE</span>
                        <span className="text-xs font-semibold text-slate-200">{data.timeline}</span>
                    </div>
                )}
                
                {data.primary_pain_point && (
                    <div className="col-span-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PRIMARY USE CASE / PAIN POINT</span>
                        <span className="text-xs font-semibold text-slate-300">{data.primary_pain_point}</span>
                    </div>
                )}
            </div>

            {/* Call Metrics */}
            <div className="px-6 py-4 bg-[#0F172A]/80 grid grid-cols-2 gap-4 border-b border-[#1E293B]/60">
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PROSPECT VIBE</span>
                    <span className="text-xs font-semibold text-slate-200">{data.sentiment || "Neutral"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">LEAD QUALIFICATION</span>
                    <span className="text-xs font-semibold text-indigo-400">{scoreLabel}</span>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-[#0F172A] flex items-center justify-between gap-3">
                <Link
                    href="/auth/signup"
                    className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5"
                >
                    Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Recruiter Demo Result Card
// ---------------------------------------------------------------------------

function RecruiterResultCard({
    data,
}: {
    data: RecruiterExtractedData;
    phone: string;
}) {
    const isStrongFit = (data.candidate_score ?? 0) >= 7;
    const stageStatus = isStrongFit ? "Move to Technical Round" : "Rejected / Keep in Pool";
    const stageColor = isStrongFit ? "text-emerald-400" : "text-rose-400";
    const badgeColor = isStrongFit ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-neutral-800 border-neutral-700 text-neutral-400";

    return (
        <div className="w-full max-w-md bg-[#0F0E14] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-500 space-y-0">
            {/* Header / Branding */}
            <div className="border-b border-[#27272A] px-6 py-4 flex items-center justify-between bg-[#18181B]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold tracking-wider text-neutral-300 uppercase leading-none">NORTHWIND HR</h4>
                        <span className="text-[10px] text-neutral-500 font-medium">Applicant Tracking System</span>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider uppercase ${badgeColor}`}>
                    Screening Complete
                </span>
            </div>

            {/* AI Summary Highlight */}
            <div className="px-6 py-4.5 bg-[#18181B]/50 border-b border-[#27272A]/60">
                <span className="text-[9px] font-bold text-blue-400/80 uppercase tracking-wider block mb-1">CANDIDATE BRIEF</span>
                <p className="text-xs text-neutral-400 italic leading-relaxed">
                    "Completed initial screening with {data.candidate_name || 'Candidate'}. {
                        isStrongFit 
                            ? "Candidate demonstrated strong alignment with the job description and communicated effectively." 
                            : "Candidate may require further review or lacks some key qualifications at this time."
                    }"
                </p>
            </div>

            {/* ATS Grid Details */}
            <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#27272A]/60">
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">CANDIDATE NAME</span>
                    <span className="text-xs font-semibold text-neutral-200">{data.candidate_name || "Unknown"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">RECOMMENDED ACTION</span>
                    <span className={`text-xs font-semibold ${stageColor}`}>
                        {stageStatus}
                    </span>
                </div>

                {data.experience_level && (
                    <div>
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">EXPERIENCE</span>
                        <span className="text-xs font-semibold text-neutral-200">{data.experience_level}</span>
                    </div>
                )}
                {data.notice_period && (
                    <div>
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">AVAILABILITY</span>
                        <span className="text-xs font-semibold text-neutral-200">{data.notice_period}</span>
                    </div>
                )}
                
                {data.key_skills && (
                    <div className="col-span-2">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">KEY SKILLS EXTRACTED</span>
                        <span className="text-xs font-semibold text-neutral-300">{data.key_skills}</span>
                    </div>
                )}
            </div>

            {/* Metrics */}
            <div className="px-6 py-4 bg-[#18181B]/80 grid grid-cols-2 gap-4 border-b border-[#27272A]/60">
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">COMMUNICATION</span>
                    <span className="text-xs font-semibold text-neutral-200">{data.communication_skills || "N/A"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">JD ALIGNMENT SCORE</span>
                    <span className="text-xs font-semibold text-blue-400">{data.candidate_score ?? 0} / 10</span>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-[#18181B] flex items-center justify-between gap-3">
                <Link
                    href="/auth/signup"
                    className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5"
                >
                    Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Medical Demo Result Card
// ---------------------------------------------------------------------------

function MedicalResultCard({
    data,
}: {
    data: MedicalExtractedData;
    phone: string;
}) {
    const isUrgent = data.urgency_level === "High";
    const urgencyColor = isUrgent ? "text-rose-400" : data.urgency_level === "Medium" ? "text-amber-400" : "text-emerald-400";
    const badgeColor = isUrgent ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400";

    return (
        <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-500 space-y-0">
            {/* Header / Branding */}
            <div className="border-b border-[#1E293B] px-6 py-4 flex items-center justify-between bg-[#0B1120]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold tracking-wider text-slate-300 uppercase leading-none">RIVERSIDE CLINIC</h4>
                        <span className="text-[10px] text-slate-500 font-medium">Patient Triage System</span>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider uppercase ${badgeColor}`}>
                    Triage Complete
                </span>
            </div>

            {/* AI Summary Highlight */}
            <div className="px-6 py-4.5 bg-[#0B1120]/50 border-b border-[#1E293B]/60">
                <span className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-wider block mb-1">CLINICAL SUMMARY</span>
                <p className="text-xs text-slate-400 italic leading-relaxed">
                    "Completed triage for {data.patient_name || 'Patient'}. {
                        data.action_taken ? `Outcome: ${data.action_taken}.` : "Request logged for provider review."
                    }"
                </p>
            </div>

            {/* Medical Grid Details */}
            <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#1E293B]/60">
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PATIENT NAME</span>
                    <span className="text-xs font-semibold text-slate-200">{data.patient_name || "Unknown"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">URGENCY LEVEL</span>
                    <span className={`text-xs font-semibold ${urgencyColor}`}>
                        {data.urgency_level || "Standard"}
                    </span>
                </div>

                {data.patient_type && (
                    <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PATIENT TYPE</span>
                        <span className="text-xs font-semibold text-slate-200">{data.patient_type}</span>
                    </div>
                )}
                {data.call_reason && (
                    <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">REASON FOR CALL</span>
                        <span className="text-xs font-semibold text-slate-200">{data.call_reason}</span>
                    </div>
                )}
                
                {data.symptoms_mentioned && (
                    <div className="col-span-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">SYMPTOMS / NOTES</span>
                        <span className="text-xs font-semibold text-slate-300">{data.symptoms_mentioned}</span>
                    </div>
                )}
            </div>

            {/* Metrics */}
            <div className="px-6 py-4 bg-[#0B1120]/80 grid grid-cols-2 gap-4 border-b border-[#1E293B]/60">
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">ACTION TAKEN</span>
                    <span className="text-xs font-semibold text-cyan-400">{data.action_taken || "Pending"}</span>
                </div>
                {data.preferred_date_time && (
                    <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PREFERRED TIME</span>
                        <span className="text-xs font-semibold text-slate-200">{data.preferred_date_time}</span>
                    </div>
                )}
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-[#0B1120] flex items-center justify-between gap-3">
                <Link
                    href="/auth/signup"
                    className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5"
                >
                    Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Home Services Demo Result Card
// ---------------------------------------------------------------------------

function ServiceResultCard({
    data,
}: {
    data: ServiceExtractedData;
    phone: string;
}) {
    const isUrgent = data.urgency_level === "Emergency";
    const statusColor = data.job_status === "Booked" ? "text-emerald-400" : data.job_status === "Quote Requested" ? "text-amber-400" : "text-orange-400";
    const badgeColor = isUrgent ? "bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse" : "bg-orange-500/10 border-orange-500/20 text-orange-400";

    return (
        <div className="w-full max-w-md bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-500 space-y-0">
            {/* Header / Branding */}
            <div className="border-b border-[#27272A] px-6 py-4 flex items-center justify-between bg-[#09090B]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                        <Wrench className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold tracking-wider text-neutral-300 uppercase leading-none">BLUEFIELD DISPATCH</h4>
                        <span className="text-[10px] text-neutral-500 font-medium">Field Service Management</span>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider uppercase ${badgeColor}`}>
                    {isUrgent ? "EMERGENCY" : "DISPATCH LOG"}
                </span>
            </div>

            {/* AI Summary Highlight */}
            <div className="px-6 py-4.5 bg-[#09090B]/50 border-b border-[#27272A]/60">
                <span className="text-[9px] font-bold text-orange-400/80 uppercase tracking-wider block mb-1">CALL SUMMARY</span>
                <p className="text-xs text-neutral-400 italic leading-relaxed">
                    "Field agent intake complete for {data.customer_name || 'Customer'}. {
                        data.job_status === "Booked" 
                            ? "Service appointment successfully scheduled." 
                            : data.job_status === "Quote Requested"
                            ? "Estimate requested, dispatching field assessor."
                            : "Issue documented for follow-up."
                    }"
                </p>
            </div>

            {/* Service Grid Details */}
            <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#27272A]/60">
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">CUSTOMER NAME</span>
                    <span className="text-xs font-semibold text-neutral-200">{data.customer_name || "Unknown"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">JOB STATUS</span>
                    <span className={`text-xs font-semibold ${statusColor}`}>
                        {data.job_status || "Pending"}
                    </span>
                </div>

                {data.service_category && (
                    <div>
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">SERVICE TYPE</span>
                        <span className="text-xs font-semibold text-neutral-200">{data.service_category}</span>
                    </div>
                )}
                {data.urgency_level && (
                    <div>
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">URGENCY</span>
                        <span className={`text-xs font-semibold ${isUrgent ? 'text-rose-400' : 'text-neutral-200'}`}>
                            {data.urgency_level}
                        </span>
                    </div>
                )}
                
                {data.issue_description && (
                    <div className="col-span-2">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">ISSUE DESCRIPTION</span>
                        <span className="text-xs font-semibold text-neutral-300">{data.issue_description}</span>
                    </div>
                )}
                {data.service_address && (
                    <div className="col-span-2">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">SERVICE ADDRESS</span>
                        <span className="text-xs font-semibold text-neutral-300">{data.service_address}</span>
                    </div>
                )}
            </div>

            {/* Metrics */}
            <div className="px-6 py-4 bg-[#09090B]/80 grid grid-cols-2 gap-4 border-b border-[#27272A]/60">
                <div className="col-span-2">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-0.5">PREFERRED SCHEDULE</span>
                    <span className="text-xs font-semibold text-orange-400">{data.preferred_schedule || "ASAP"}</span>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-[#09090B] flex items-center justify-between gap-3">
                <Link
                    href="/auth/signup"
                    className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-orange-600 text-white hover:bg-orange-500 transition-colors shadow-lg shadow-orange-500/10 flex items-center justify-center gap-1.5"
                >
                    Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Real Estate Demo Result Card
// ---------------------------------------------------------------------------

function RealEstateResultCard({
    data,
}: {
    data: RealEstateExtractedData;
    phone: string;
}) {
    const isHotLead = data.lead_outcome === "Showing Scheduled" || data.lead_outcome === "Consultation Booked" || data.lead_outcome === "Valuation Requested";
    const statusColor = isHotLead ? "text-amber-400" : "text-blue-400";
    const badgeColor = isHotLead ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400";

    return (
        <div className="w-full max-w-md bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-500 space-y-0">
            {/* Header / Branding */}
            <div className="border-b border-[#1E293B] px-6 py-4 flex items-center justify-between bg-[#0B1120]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Home className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold tracking-wider text-slate-200 uppercase leading-none">MAPLE & CO REALTY</h4>
                        <span className="text-[10px] text-slate-500 font-medium">Lead Management CRM</span>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider uppercase ${badgeColor}`}>
                    Lead Captured
                </span>
            </div>

            {/* AI Summary Highlight */}
            <div className="px-6 py-4.5 bg-[#0B1120]/50 border-b border-[#1E293B]/60">
                <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider block mb-1">CALL SUMMARY</span>
                <p className="text-xs text-slate-400 italic leading-relaxed">
                    "Incoming inquiry captured for {data.client_name || 'Client'}. {
                        isHotLead 
                            ? "Action required: Lead successfully booked for next steps." 
                            : "Lead logged into CRM for future nurturing."
                    }"
                </p>
            </div>

            {/* Real Estate Grid Details */}
            <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#1E293B]/60">
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">CLIENT NAME</span>
                    <span className="text-xs font-semibold text-slate-200">{data.client_name || "Unknown"}</span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">INTENT</span>
                    <span className={`text-xs font-semibold text-slate-200`}>
                        {data.client_intent || "Inquiry"}
                    </span>
                </div>

                {data.budget_range && (
                    <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">BUDGET RANGE</span>
                        <span className="text-xs font-semibold text-emerald-400">{data.budget_range}</span>
                    </div>
                )}
                {data.timeline && (
                    <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">TIMELINE</span>
                        <span className="text-xs font-semibold text-slate-200">{data.timeline}</span>
                    </div>
                )}
                
                {data.property_preference && (
                    <div className="col-span-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PROPERTY INTEREST / AREA</span>
                        <span className="text-xs font-semibold text-slate-300">{data.property_preference}</span>
                    </div>
                )}
            </div>

            {/* Metrics */}
            <div className="px-6 py-4 bg-[#0B1120]/80 grid grid-cols-2 gap-4 border-b border-[#1E293B]/60">
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">PRE-APPROVED</span>
                    <span className={`text-xs font-semibold ${data.pre_approved_status === 'Yes' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {data.pre_approved_status || "Not Discussed"}
                    </span>
                </div>
                <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">LEAD OUTCOME</span>
                    <span className={`text-xs font-bold ${statusColor}`}>{data.lead_outcome || "Pending"}</span>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-[#0B1120] flex items-center justify-between gap-3">
                <Link
                    href="/auth/signup"
                    className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-amber-600 text-slate-900 hover:bg-amber-500 transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
                >
                    Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DemoCallForm() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [useCase, setUseCase] = useState("hotel");
    const [callingState, setCallingState] = useState<"idle" | "calling" | "connected" | "polling" | "done" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [workflowRunId, setWorkflowRunId] = useState<number | null>(null);
    const [extractedData, setExtractedData] = useState<any | null>(null);

    // Keep a ref to the interval so we can clear it safely
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // Safety cap: stop polling after 10 minutes
    const pollStartRef = useRef<number>(0);
    const MAX_POLL_MS = 10 * 60 * 1000;
    // Guard so the polling effect only fires once per run — not every re-render
    const hasStartedPollingRef = useRef(false);

    // Stop polling on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // Start polling whenever a new workflowRunId arrives.
    // Depends ONLY on workflowRunId — not on callingState — so the cleanup
    // that fires when we call setCallingState("polling") inside here doesn't
    // immediately destroy the interval we just created.
    useEffect(() => {
        if (!workflowRunId || hasStartedPollingRef.current) return;

        hasStartedPollingRef.current = true;
        setCallingState("polling");
        pollStartRef.current = Date.now();

        pollIntervalRef.current = setInterval(async () => {
            // Safety cap
            if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
                clearInterval(pollIntervalRef.current!);
                return;
            }

            const result = await pollDemoCallResult(workflowRunId);

            if (result.ready) {
                clearInterval(pollIntervalRef.current!);
                setExtractedData(result.extractedData ?? {});
                setCallingState("done");
            }
            // If error on individual poll, just keep polling — don't surface noise
        }, 5000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflowRunId]);

    const handleInitiateCall = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCallingState("calling");
        setErrorMessage("");
        setWorkflowRunId(null);
        setExtractedData(null);

        const formData = new FormData(e.currentTarget);
        formData.set("useCase", useCase);

        try {
            const result = await initiateDemoCall(null, formData);
            if (!result?.success) {
                setCallingState("error");
                setErrorMessage(result?.error || "Failed to connect to the voice agent.");
                return;
            }
            // Store run ID — the polling effect kicks in once callingState → "connected"
            if (result.workflowRunId) setWorkflowRunId(result.workflowRunId);
            setCallingState("connected");
        } catch {
            setCallingState("error");
            setErrorMessage("An unexpected error occurred.");
        }
    };

    const handleReset = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        hasStartedPollingRef.current = false;
        setCallingState("idle");
        setErrorMessage("");
        setWorkflowRunId(null);
        setExtractedData(null);
    };

    // ── Error state ──────────────────────────────────────────────────────────
    if (callingState === "error") {
        return (
            <div className="py-6 px-4 space-y-4 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-md bg-[#16151E]/95 border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
                <div className="relative flex items-center justify-center my-2 text-rose-500">
                    <X className="w-12 h-12" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Call Request Failed</p>
                    <p className="text-xs text-gray-400">{errorMessage}</p>
                </div>
                <button
                    onClick={handleReset}
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white mt-2"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // ── Result cards ───────────────────────────────
    if (callingState === "done" && extractedData) {
        if (useCase === "hotel") {
            return <HotelResultCard data={extractedData} phone={phone} />;
        }
        if (useCase === "sales") {
            return <SalesResultCard data={extractedData} phone={phone} />;
        }
        if (useCase === "recruiter") {
            return <RecruiterResultCard data={extractedData} phone={phone} />;
        }
        if (useCase === "medical") {
            return <MedicalResultCard data={extractedData} phone={phone} />;
        }
        if (useCase === "service") {
            return <ServiceResultCard data={extractedData} phone={phone} />;
        }
        if (useCase === "real_estate") {
            return <RealEstateResultCard data={extractedData} phone={phone} />;
        }
    }

    // ── Calling / connected / polling ────────────────────────────────────────
    if (callingState === "calling" || callingState === "connected" || callingState === "polling") {
        const isPolling = callingState === "polling";
        return (
            <div className="py-6 px-4 space-y-4 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-md bg-[#0C0B0F] border border-neutral-800 p-6 sm:p-8 rounded-xl shadow-2xl">
                <div className="relative flex items-center justify-center my-2">
                    {callingState === "calling" ? (
                        <div className="w-14 h-14 rounded-full border border-neutral-800 flex items-center justify-center relative bg-neutral-900/30">
                            <span className="absolute inset-0 rounded-full border border-t-amber-500/60 border-neutral-800 animate-spin" />
                            <PhoneCall className="w-5 h-5 text-neutral-400" />
                        </div>
                    ) : isPolling ? (
                        <div className="w-14 h-14 rounded-full border border-neutral-800 flex items-center justify-center relative bg-neutral-900/30">
                            <span className="absolute inset-0 rounded-full border border-t-amber-500/60 border-neutral-800 animate-spin" />
                            <PhoneCall className="w-5 h-5 text-amber-400" />
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded-full border border-emerald-800/30 bg-emerald-950/10 flex items-center justify-center relative text-emerald-400 animate-pulse">
                            <Check className="w-5 h-5" />
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                        {callingState === "calling"
                            ? "Initiating Call..."
                            : isPolling
                            ? "Call in Progress…"
                            : "Call Connected"}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">+91 {phone || "98765 43210"}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 w-full space-y-1">
                    <p className="font-semibold text-white">
                        {callingState === "calling"
                            ? "Connecting call to your mobile..."
                            : isPolling
                            ? "Talk to Sarah — we'll show your results when the call ends!"
                            : "Your phone should be ringing!"}
                    </p>
                </div>

                {(callingState === "connected" || isPolling) && (
                    <Link
                        href="/auth/signup"
                        className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors shadow-lg flex items-center justify-center gap-2 mt-2"
                    >
                        Build Your Agent <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>
        );
    }

    // ── Idle form ────────────────────────────────────────────────────────────
    const businessOptions = [
        { id: "hotel",       label: "Hotels & Stays",  icon: Hotel,       available: true },
        { id: "medical",     label: "Healthcare",       icon: Stethoscope, available: true },
        { id: "sales",       label: "Sales & Leads",   icon: Briefcase,   available: true },
        { id: "service",     label: "Home Services",   icon: Wrench,      available: true },
        { id: "real_estate", label: "Real Estate",     icon: Home,        available: true },
        { id: "recruiter",   label: "Recruiter AI",    icon: Users,       available: true },
    ];

    return (
        <div className="w-full max-w-md bg-[#16151E]/95 border border-white/10 p-6 sm:p-8 flex flex-col gap-5 rounded-2xl shadow-2xl backdrop-blur-xl hover:border-orange-500/30 transition-all">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <div className="text-sm text-white font-bold tracking-tight">Try Live AI Demo</div>
                    <div className="text-xs text-gray-400 font-light mt-0.5">Receive an instant test call from Talkar</div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs text-emerald-400 font-medium">Ready</span>
                </div>
            </div>

            <form onSubmit={handleInitiateCall} className="space-y-3.5 text-xs text-white">
                <div className="space-y-1 text-left">
                    <label className="text-[11px] font-semibold text-white/90 block">Your Name</label>
                    <input
                        type="text"
                        required
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className="w-full h-9.5 px-3 py-3 rounded-lg border border-white/10 bg-[#0F0E14] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                    />
                </div>

                <div className="space-y-1 text-left">
                    <label className="text-[11px] font-semibold text-white/90 block">Mobile Number</label>
                    <div className="flex gap-2">
                        <span className="h-9.5 px-3 py-3 rounded-lg border border-white/10 bg-white/5 text-white text-xs font-semibold flex items-center font-mono shrink-0 gap-1.5">
                            <span className="text-sm leading-none">🇮🇳</span> +91
                        </span>
                        <input
                            type="tel"
                            required
                            name="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="98765 43210"
                            className="w-full h-9.5 px-3 py-3 rounded-lg border border-white/10 bg-[#0F0E14] text-white text-xs font-mono placeholder:text-gray-500 focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1 text-left">
                    <label className="text-[11px] font-semibold text-white/90 block">Select Business Type</label>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {businessOptions.map((item) => {
                            const Icon = item.icon;
                            const isSelected = useCase === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={!item.available}
                                    onClick={() => item.available && setUseCase(item.id)}
                                    className={`h-9 px-2.5 rounded-lg text-[11px] font-medium border text-left flex items-center justify-between gap-1.5 transition-all ${
                                        isSelected
                                            ? "bg-orange-500/20 border-orange-500 text-orange-500 font-semibold shadow-xs"
                                            : item.available
                                            ? "border-white/10 bg-[#0F0E14] hover:bg-white/5 text-gray-300"
                                            : "border-white/5 bg-white/5 text-gray-600 cursor-not-allowed"
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-orange-500" : "text-gray-500"}`} />
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    {!item.available && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-sans uppercase font-semibold shrink-0">
                                            Soon
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {useCase === "recruiter" && (
                    <>
                        <div className="space-y-1 text-left mt-2 animate-in fade-in zoom-in-95 duration-300">
                            <label className="text-[11px] font-semibold text-white/90 block">Job Description</label>
                            <textarea
                                name="jobDescription"
                                placeholder="Paste the JD here..."
                                className="w-full h-20 px-3 py-2 rounded-lg border border-white/10 bg-[#0F0E14] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                            />
                        </div>
                        <div className="space-y-1 text-left animate-in fade-in zoom-in-95 duration-300">
                            <label className="text-[11px] font-semibold text-white/90 block">Upload Resume (PDF/DOCX/TXT)</label>
                            <input
                                type="file"
                                name="resumeFile"
                                accept=".pdf,.docx,.txt"
                                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600 transition-all border border-white/10 bg-[#0F0E14] rounded-lg p-1.5 focus:outline-none cursor-pointer"
                            />
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    className="w-full mt-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF5500] to-[#E11D48] text-white hover:opacity-95 transition-all shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 group py-3.5"
                >
                    <PhoneCall className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    Receive Demo Call
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}
