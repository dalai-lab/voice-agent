"use server";

import { headers } from "next/headers";
import fs from "fs/promises";
import path from "path";
import zlib from "zlib";
import * as mammoth from "mammoth";

// Pure Node.js zero-dependency PDF text extractor (avoids all @napi-rs/canvas / DOMMatrix issues)
function extractTextFromPdf(buffer: Buffer): string {
    const textChunks: string[] = [];
    const bufferStr = buffer.toString("binary");

    // Match all streams in the PDF
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(bufferStr)) !== null) {
        const streamStart = match.index + match[0].indexOf("\n") + 1;
        const rawData = buffer.subarray(streamStart, streamStart + Buffer.byteLength(match[1], "binary"));

        let decompressed: Buffer | null = null;
        try {
            decompressed = zlib.inflateSync(rawData);
        } catch {
            try {
                decompressed = zlib.unzipSync(rawData);
            } catch {
                decompressed = rawData;
            }
        }

        if (decompressed) {
            const content = decompressed.toString("latin1");

            // Extract text from text blocks (BT ... ET)
            const textBlockRegex = /BT([\s\S]*?)ET/g;
            let tbMatch: RegExpExecArray | null;
            while ((tbMatch = textBlockRegex.exec(content)) !== null) {
                const blockContent = tbMatch[1];

                // 1. Single string: (Text) Tj
                const tjRegex = /\((.*?)\)\s*Tj/g;
                let tjMatch: RegExpExecArray | null;
                while ((tjMatch = tjRegex.exec(blockContent)) !== null) {
                    textChunks.push(decodePdfString(tjMatch[1]));
                }

                // 2. Array of strings: [(Text1) 20 (Text2)] TJ
                const arrayRegex = /\[(.*?)\]\s*TJ/g;
                let arrMatch: RegExpExecArray | null;
                while ((arrMatch = arrayRegex.exec(blockContent)) !== null) {
                    const inner = arrMatch[1];
                    const innerStrRegex = /\((.*?)\)/g;
                    let innerMatch: RegExpExecArray | null;
                    while ((innerMatch = innerStrRegex.exec(inner)) !== null) {
                        textChunks.push(decodePdfString(innerMatch[1]));
                    }
                }

                // 3. Hex strings: <48656c6c6f> Tj
                const hexRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
                let hexMatch: RegExpExecArray | null;
                while ((hexMatch = hexRegex.exec(blockContent)) !== null) {
                    const hexClean = hexMatch[1].replace(/\s+/g, "");
                    if (hexClean.length % 2 === 0) {
                        textChunks.push(Buffer.from(hexClean, "hex").toString("utf-8"));
                    }
                }
            }
        }
    }

    // Fallback: If no structured text found, search for plain printable sequences in buffer
    if (textChunks.length === 0) {
        const rawStrings = bufferStr.match(/[\x20-\x7E\s]{4,}/g) || [];
        // Filter out PDF internal syntax keywords
        const filtered = rawStrings.filter(s => 
            !s.includes("/Filter") && 
            !s.includes("/Length") && 
            !s.includes("/Type") && 
            !s.includes("endobj") && 
            !s.includes("xref") && 
            !s.includes("trailer")
        );
        return filtered.join(" ").slice(0, 4000);
    }

    return textChunks.join(" ").replace(/\s+/g, " ").trim();
}

function decodePdfString(str: string): string {
    return str
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\b/g, "\b")
        .replace(/\\f/g, "\f")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");
}

// Rate limit configuration
// Using /tmp/ because Docker containers often have read-only filesystems in /app
const RATE_LIMIT_FILE = "/tmp/demo_rate_limits.json";
const RATE_LIMIT_HOURS = 24;

// API configuration from environment variables
const DOGRAH_API_KEY = process.env.DOGRAH_API_KEY || "dgr_Cx8vqaOxg1GsJ-Anyo0Nj-H5bfTkNTre1S_nPdmMwsY";
const OPENAI_API_DEMO_KEY = process.env.OPENAI_API_DEMO_KEY || process.env.OPENAI_API_KEY;

// Workflow mapping: Add more workflows here as they are built!
const WORKFLOW_MAP: Record<string, string> = {
    hotel: "60708cc2-6818-4f0f-a26e-546d24c4e9c5",
    medical: "0fdf213b-9f96-4000-a2a0-8b64392d8f5b",
    sales: "8f1b5a75-ee5b-47eb-9d2e-f22dad2c3157",
    service: "cb75c339-e0de-46a5-a3b8-843fe5189241",
    real_estate: "6b92b43d-8251-4b48-97f8-8a0bc643ac31",
    recruiter: "4bb689a2-f139-4b40-af2a-e0eb8c9c502f",
    logistics: "57c36bde-c63b-4852-a915-c77bc86187cd"
};

interface RateLimitData {
    [ip: string]: number[]; // array of timestamps in milliseconds
}

async function checkRateLimit(ip: string): Promise<boolean> {
    try {
        let data: RateLimitData = {};
        
        try {
            const fileContent = await fs.readFile(RATE_LIMIT_FILE, "utf-8");
            const parsed = JSON.parse(fileContent);
            
            // Migrate old {ip: number} to {ip: number[]} seamlessly
            for (const key in parsed) {
                if (typeof parsed[key] === "number") {
                    data[key] = [parsed[key]];
                } else if (Array.isArray(parsed[key])) {
                    data[key] = parsed[key];
                }
            }
        } catch (error: any) {
            // File doesn't exist or is invalid, start fresh
            if (error.code !== "ENOENT") {
                console.warn("Failed to read rate limit file, starting fresh:", error);
            }
        }

        const now = Date.now();
        const history = data[ip] || [];
        
        // Filter out timestamps older than RATE_LIMIT_HOURS (24)
        const recentCalls = history.filter(t => (now - t) / (1000 * 60 * 60) < RATE_LIMIT_HOURS);

        if (recentCalls.length >= 50) {
            return false; // Rate limited (max 50 calls per day)
        }

        // Update timestamps for this IP
        recentCalls.push(now);
        data[ip] = recentCalls;
        
        await fs.writeFile(RATE_LIMIT_FILE, JSON.stringify(data, null, 2));
        return true;

    } catch (error) {
        console.error("Rate limit check failed:", error);
        // Fail open if file system errors occur to not block legit users unexpectedly
        return true; 
    }
}

export async function initiateDemoCall(prevState: any, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const phone = formData.get("phone") as string;
        const useCase = formData.get("useCase") as string;
        const jobDescription = formData.get("jobDescription") as string | null;
        const resumeFile = formData.get("resumeFile") as File | null;

        if (!name || !phone || !useCase) {
            return { success: false, error: "Please fill in all fields." };
        }

        // Get IP address from headers
        const headersList = await headers();
        const forwardedFor = headersList.get("x-forwarded-for");
        const realIp = headersList.get("x-real-ip");
        const ip = forwardedFor?.split(",")[0] || realIp || "unknown-ip";

        const isRetry = formData.get("isRetry") === "true";

        // Demo Rate Limit: Commented out for demo testing (limit raised to 50 when active)
        /*
        if (ip !== "unknown-ip" && !isRetry) {
            const allowed = await checkRateLimit(ip);
            if (!allowed) {
                return { 
                    success: false, 
                    error: "You have already requested a demo call today. Please try again tomorrow, or book a demo!" 
                };
            }
        }
        */

        // Check if workflow exists for the use case
        const workflowId = WORKFLOW_MAP[useCase];
        if (!workflowId) {
            return { success: false, error: "This use case is coming soon. Please try the Hotel demo for now!" };
        }

        // Extract first name for the greeting
        const firstName = name.split(" ")[0];

        // Ensure phone number starts with +91 if they didn't include it
        // The UI adds +91 visually, so the input might just be 10 digits
        let formattedPhone = phone.replace(/\D/g, "");
        if (formattedPhone.length === 10) {
            formattedPhone = "+91" + formattedPhone;
        } else if (!formattedPhone.startsWith("+")) {
            formattedPhone = "+" + formattedPhone;
        }

        // Parse and Summarize Resume if Recruiter
        let resumeSummary = "";
        if (useCase === "recruiter" && resumeFile) {
            try {
                let resumeText = "";
                const buffer = Buffer.from(await resumeFile.arrayBuffer());
                if (resumeFile.name.toLowerCase().endsWith(".pdf")) {
                    resumeText = extractTextFromPdf(buffer);
                } else if (resumeFile.name.toLowerCase().endsWith(".docx")) {
                    const result = await mammoth.extractRawText({ buffer });
                    resumeText = result.value;
                } else {
                    resumeText = await resumeFile.text();
                }

                console.log(`[DemoCall] Extracted ${resumeText.trim().length} chars from resume (${resumeFile.name})`);

                if (resumeText.trim().length > 0) {
                    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${OPENAI_API_DEMO_KEY}`
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: "You are an expert HR assistant. Summarize the following resume in exactly 100-150 words, focusing only on their primary skills, years of experience, and key roles. Output only the summary." },
                                { role: "user", content: resumeText }
                            ]
                        })
                    });
                    if (openaiRes.ok) {
                        const openaiData = await openaiRes.json();
                        resumeSummary = openaiData.choices[0].message.content;
                    } else {
                        console.error("[DemoCall] OpenAI API failed:", await openaiRes.text());
                    }
                }
            } catch (err) {
                console.error("[DemoCall] Failed to parse/summarize resume:", err);
            }
        }

        // Check if Talkar service is reachable / in maintenance
        const talkarServiceUrl = process.env.TALKAR_SERVICE_URL || "http://host.docker.internal:8002";
        try {
            const healthRes = await fetch(`${talkarServiceUrl}/health`, {
                method: "GET",
                signal: AbortSignal.timeout(3000),
            });
            if (!healthRes.ok) {
                return {
                    success: false,
                    error: "Demo voice services are temporarily paused for maintenance. Please check back shortly."
                };
            }
        } catch {
            return {
                success: false,
                error: "Demo voice services are temporarily paused for maintenance. Please check back shortly."
            };
        }

        // Make the API request to the Dograh backend
        // We use the public URL because 127.0.0.1 inside a Docker container points to the container itself, not the host!
        const url = `https://talkar.in/api/v1/public/agent/workflow/${workflowId}`;
        
        console.log(`[DemoCall] Initiating call to ${formattedPhone} for useCase: ${useCase}, IP: ${ip}`);

        const sampleProducts = [
            "Nike Air Running Shoes",
            "boAt Rockerz Bluetooth Headphones",
            "Noise ColorFit Smartwatch",
            "Puma Sports Backpack",
            "Sony Wireless Earbuds",
            "Levi's Denim Jacket",
        ];
        const randomItem = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
        const randomOrderId = `DLV-${Math.floor(100000 + Math.random() * 900000)}`;
        const randomLogisticsOrderId = `ORD-LOG-${Math.floor(1000 + Math.random() * 9000)}`;
        const randomBookingId = `GH-${Math.floor(1000 + Math.random() * 9000)}`;
        const randomTicketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

        const initialContext: Record<string, any> = {
            first_name: firstName,
            customer_name: name,
            source: "landing_page_demo",
            ...(useCase === "hotel" ? {
                booking_id: randomBookingId,
                check_in_date: "this Friday",
                room_type: "Deluxe King Suite"
            } : {}),
            ...(useCase === "medical" ? {
                doctor_name: "Dr. Sharma",
                appointment_time: "tomorrow at 3:30 PM",
                department: "General Consultation"
            } : {}),
            ...(useCase === "sales" ? {
                inquiry_topic: "AI Voice Workflows"
            } : {}),
            ...(useCase === "service" ? {
                ticket_id: randomTicketId,
                service_type: "AC Cooling & Maintenance",
                dispatch_slot: "tomorrow between 2 PM and 5 PM"
            } : {}),
            ...(useCase === "real_estate" ? {
                property_name: "Skyline Heights 2-Bedroom Luxury Residence",
                location: "Downtown",
                budget_hint: "₹85 Lakhs"
            } : {}),
            ...(useCase === "recruiter" ? {
                role_title: "Senior Full-Stack Engineer",
                job_description: jobDescription || "Senior Full-Stack Engineer (React, Node.js, TypeScript, Cloud Architecture)",
                ...(resumeSummary ? { resume: resumeSummary } : {})
            } : {}),
            ...(useCase === "logistics" ? {
                order_id: randomLogisticsOrderId,
                item: randomItem,
                company_name: "Talkar Logistics",
                agent_name: "Ananya",
                slot: "4 PM to 7 PM",
                is_cod: "true",
                prepaid_discount_percent: "1",
                called_number: formattedPhone,
            } : {})
        };

        // Pre-register order in Logistics CRM (logistics.talkar.in) so payment checkout & QR code work seamlessly
        if (useCase === "logistics") {
            try {
                await fetch("https://logistics.talkar.in/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderNumber: randomLogisticsOrderId,
                        customerName: name,
                        customerPhone: formattedPhone,
                        deliveryAddress: "B-42, Sector 5, Main Road",
                        amount: 499,
                        expectedDeliveryDate: "Today",
                        deliveryTimeSlot: "4 PM to 7 PM",
                    }),
                });
            } catch (crmErr) {
                console.warn("[DemoCall] Failed to sync order to logistics CRM:", crmErr);
            }
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "X-API-Key": DOGRAH_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                phone_number: formattedPhone,
                initial_context: initialContext
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DemoCall] API Error ${response.status}:`, errorText);
            
            // Revert rate limit on failure
            try {
                const fileContent = await fs.readFile(RATE_LIMIT_FILE, "utf-8");
                const data = JSON.parse(fileContent);
                delete data[ip];
                await fs.writeFile(RATE_LIMIT_FILE, JSON.stringify(data, null, 2));
            } catch (e) {
                // ignore
            }

            return { 
                success: false, 
                error: "Failed to connect to the voice agent. Please ensure the backend is running." 
            };
        }

        const data = await response.json();
        return { success: true, message: "Call initiated successfully.", workflowRunId: data.workflow_run_id as number };

    } catch (error) {
        console.error("[DemoCall] Server Action Exception:", error);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}

// ---------------------------------------------------------------------------
// Poll a completed run for AI-extracted demo data.
// Uses the same org API key – no auth-gated routes touched.
// ---------------------------------------------------------------------------
export async function pollDemoCallResult(
    runId: number
): Promise<{
    ready: boolean;
    extractedData?: Record<string, unknown>;
    call_disposition?: string;
    error?: string;
}> {
    try {
        const url = `https://talkar.in/api/v1/public/agent/run/${runId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-Key": DOGRAH_API_KEY,
            },
            // Always bypass Next.js cache so we get a fresh value each poll
            cache: "no-store",
        });

        if (!response.ok) {
            return { ready: false, error: `API error ${response.status}` };
        }

        const data = await response.json();

        const hasExtraction =
            data.extracted_data &&
            typeof data.extracted_data === "object" &&
            Object.keys(data.extracted_data).length > 0;

        if (!data.is_completed) {
            return {
                ready: false,
                extractedData: hasExtraction ? data.extracted_data : undefined,
                call_disposition: data.call_disposition ?? undefined,
            };
        }

        return {
            ready: true,
            extractedData: data.extracted_data ?? {},
            call_disposition: data.call_disposition ?? undefined,
        };
    } catch (error) {
        console.error("[DemoCall] pollDemoCallResult error:", error);
        return { ready: false, error: "Unexpected error while polling." };
    }
}

// ---------------------------------------------------------------------------
// Live Extraction during SSE — smart domain-aware prompts
// ---------------------------------------------------------------------------
const EXTRACTION_PROMPTS: Record<string, string> = {
  hotel: `You are extracting structured data from a LUXURY HOTEL PRE-ARRIVAL CONCIERGE call between concierge Sarah and a guest.

Extract these fields (return null if not yet mentioned):
- arrival_time: Estimated arrival time stated by the guest. e.g. "3:00 PM", "Around 4 PM", "Evening".
- room_preference: Specific preferences requested. e.g. "High floor", "King bed", "Quiet room", "Ocean view".
- guests_count: Number of guests staying as an integer. e.g. 1, 2.
- dinner_reservation: "Requested", "Declined", or null.
- booking_status: One of: "Confirmed", "Rescheduled", "Cancelled".`,

  medical: `You are extracting structured data from a CLINIC PRE-CONSULTATION INTAKE call between coordinator Emma and a patient.

Extract these fields (return null if not yet mentioned):
- patient_name: The patient's full name. e.g. "Priya Sharma"
- attendance_status: "Confirmed (Tomorrow 3:30 PM)", "Reschedule Requested", or "Cancelled".
- symptoms_mentioned: Primary symptoms described by the patient. e.g. "Fever and persistent cough".
- urgency_level: "Low", "Medium", or "High" — infer from symptoms and tone.
- action_taken: Final resolution e.g. "Appointment Confirmed", "Reschedule Requested", or "Cancelled".`,

  sales: `You are extracting structured data from a B2B SAAS CALLBACK between sales specialist Jordan and a prospect.

Extract these fields (return null if not yet mentioned):
- prospect_name: The prospect's full name. e.g. "Michael Torres"
- company_size: Team size. Normalize to: "1-10", "11-50", "51-200", "200+".
- primary_pain_point: Their core business problem in 3-6 words. e.g. "Manual customer callback bottleneck".
- timeline: When they want to deploy. e.g. "This month", "Next quarter", "Exploring".
- demo_booked: true if they agreed to a 15-minute live demo, false otherwise.
- lead_score: Integer 1-10 based on team size, expressed need, and urgency.`,

  service: `You are extracting structured data from a HOME SERVICES DISPATCH call between coordinator Casey and a customer.

Extract these fields (return null if not yet mentioned):
- customer_name: The customer's full name. e.g. "Sarah Johnson"
- service_category: The service type. e.g. "AC Cooling & Maintenance", "Plumbing".
- issue_description: Concise problem description. e.g. "Water leaking under AC unit".
- service_address: Their address, apartment number, or landmark. e.g. "Flat 402, near Apollo Pharmacy".
- urgency_level: "Standard" or "Emergency".
- job_status: "Booked", "Rescheduled", or "Cancelled".`,

  real_estate: `You are extracting structured data from a REAL ESTATE BROCHURE FOLLOW-UP call between property advisor Kabir and a client.

Extract these fields (return null if not yet mentioned):
- client_name: The client's full name. e.g. "Arnav Mehta"
- client_intent: One of: "Buying (Self-Use)", "Investment", "Renting".
- property_preference: Property or unit type discussed. e.g. "2-Bedroom Luxury Residence".
- budget_range: Format as a clean range e.g. "₹80L - ₹90L" or "$650k - $750k".
- timeline: e.g. "Immediate", "Within 2 months", "Next quarter".
- pre_approved_status: "Pre-approved", "In progress", "Not yet", or "Not Discussed".
- lead_outcome: "Private Showing Scheduled", "Consultation Booked", or "Nurture Lead".`,

  recruiter: `You are extracting structured data from a RECRUITER SCREENING call between talent screener Alex and a job candidate.

Extract these fields (return null if not yet mentioned):
- candidate_name: The candidate's full name. e.g. "Rahul Verma"
- experience_level: Normalize to: "Fresher (0-1 yrs)", "Junior (1-3 yrs)", "Mid-level (3-6 yrs)", "Senior (6-10 yrs)", "Lead (10+ yrs)".
- key_skills: Top 3-5 technical skills discussed as a comma-separated string. e.g. "React, Node.js, TypeScript".
- salary_expectations: Format as e.g. "₹18 LPA", "$120,000/yr". Include currency from context.
- notice_period: e.g. "Immediate", "30 days", "60 days", "90 days".
- candidate_score: Integer 1-10 based on skill match, experience relevance, and communication.`,

  logistics: `You are extracting structured data from an E-COMMERCE / LOGISTICS DELIVERY CONFIRMATION call between a delivery coordinator and a customer.

Extract these fields (return null if not yet mentioned):
- availability: One of: "Self (Available)", "Someone Else", "Reschedule Requested", or "Not Available".
- receiver_name: Name of the person receiving the parcel if mentioned (or "Self"), or null.
- landmark: Specific delivery landmark or gate/building instructions (e.g. "Near Apollo Pharmacy", "Leave at security gate").
- prepaid_offer_status: One of: "Link Requested (Prepaid)", "Declined (Keep COD)", "Not Sure", or null.
- dispatch_status: One of: "Confirmed", "Reschedule", "Exception / Cancelled", or null.`,
};

export async function runLiveExtraction(transcriptLines: string[], useCase: string) {
  if (transcriptLines.length === 0) return {};

  const fieldPrompt = EXTRACTION_PROMPTS[useCase] || EXTRACTION_PROMPTS.hotel;

  const systemPrompt = `You are a data extraction engine for a live call transcript. Your job has two parts:

PART 1 — FIELD EXTRACTION:
${fieldPrompt}

CRITICAL RULES FOR EXTRACTION:
1. NEVER guess or hallucinate. If the caller has NOT explicitly provided the information yet, you MUST return null for that field.
2. DO NOT return "unknown" or "N/A" unless it is explicitly an allowed enum value. Return null instead.
3. Wait for the user to answer. A question asked by the agent does NOT count as a value until the user responds.

PART 2 — CITATION HIGHLIGHTS (the most important part):
After extracting fields, you MUST include a top-level "_citations" key in your JSON.
"_citations" maps each extracted field key to an array of exact verbatim substrings from the transcript.

STRICT CITATION RULES — READ CAREFULLY:
1. Citations MUST be the actual data value as spoken, not the question or trigger phrase.
   - CORRECT for check_in_date: ["March 15th"] or ["next Friday"]
   - WRONG: ["I want to check in"] or ["check-in date"]
2. Citations MUST be the SHORTEST possible verbatim substring — ideally 1-4 words.
   - CORRECT for guest_name: ["John Smith"]
   - WRONG: ["My name is John Smith"]
3. NEVER cite filler words, agent questions, or generic words like "booking", "reservation", "appointment".
4. If the caller says "I want a double room" — cite "double room", NOT "I want a double room".
5. Citations must be EXACT character-for-character substrings that appear in the transcript.
6. Only cite fields that have non-null extracted values.

Return ONLY valid JSON with no markdown fencing.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_DEMO_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Transcript:\n${transcriptLines.join("\n")}\n\nExtract fields and citations as JSON:`,
          },
        ],
      }),
    });

    if (!res.ok) return {};
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[DemoCall] runLiveExtraction error:", err);
    return {};
  }
}
