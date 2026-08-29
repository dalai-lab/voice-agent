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
    recruiter: "4bb689a2-f139-4b40-af2a-e0eb8c9c502f"
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

        if (recentCalls.length >= 2) {
            return false; // Rate limited (max 2 calls per day)
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

        // Check Rate Limit (Bypass if IP is unknown for local testing, though unlikely in prod)
        if (ip !== "unknown-ip") {
            const allowed = await checkRateLimit(ip);
            if (!allowed) {
                return { 
                    success: false, 
                    error: "You have already requested a demo call today. Please try again tomorrow, or book a demo!" 
                };
            }
        }

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

        // Make the API request to the Dograh backend
        // We use the public URL because 127.0.0.1 inside a Docker container points to the container itself, not the host!
        const url = `https://talkar.in/api/v1/public/agent/workflow/${workflowId}`;
        
        console.log(`[DemoCall] Initiating call to ${formattedPhone} for useCase: ${useCase}, IP: ${ip}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "X-API-Key": DOGRAH_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                phone_number: formattedPhone,
                initial_context: {
                    first_name: firstName,
                    customer_name: name,
                    source: "landing_page_demo",
                    ...(useCase === "recruiter" && jobDescription ? { job_description: jobDescription } : {}),
                    ...(useCase === "recruiter" && resumeSummary ? { resume: resumeSummary } : {})
                }
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

        if (!data.is_completed) {
            return { ready: false };
        }

        return { ready: true, extractedData: data.extracted_data ?? {} };
    } catch (error) {
        console.error("[DemoCall] pollDemoCallResult error:", error);
        return { ready: false, error: "Unexpected error while polling." };
    }
}

// ---------------------------------------------------------------------------
// Live Extraction during SSE
// ---------------------------------------------------------------------------
const EXTRACTION_PROMPTS: Record<string, string> = {
  hotel: `Extract the following fields from this hotel reservation call. Return ONLY valid JSON, no markdown.
Fields: caller_name (string), wants_to_book (boolean), inquiry_type (string), check_in_date (string or null), check_out_date (string or null), guests_count (number or null), room_preference (string or null), sentiment ("Positive"|"Neutral"|"Negative"), interest_score (1-10 integer). If not yet mentioned, set to null.`,
  medical: `Extract the following fields from this medical intake call. Return ONLY valid JSON, no markdown.
Fields: patient_name (string), patient_type (string), call_reason (string), symptoms_mentioned (string or null), preferred_date_time (string or null), action_taken (string), urgency_level ("Low"|"Medium"|"High"). If not yet mentioned, set to null.`,
  sales: `Extract the following fields from this sales call. Return ONLY valid JSON, no markdown.
Fields: prospect_name (string), company_size (string or null), primary_pain_point (string or null), timeline (string or null), demo_booked (boolean), lead_score (1-10 integer), sentiment (string). If not yet mentioned, set to null.`,
  service: `Extract the following fields from this home services call. Return ONLY valid JSON, no markdown.
Fields: customer_name (string), service_category (string), issue_description (string), service_address (string or null), preferred_schedule (string or null), urgency_level ("Low"|"Medium"|"High"), job_status (string). If not yet mentioned, set to null.`,
  real_estate: `Extract the following fields from this real estate call. Return ONLY valid JSON, no markdown.
Fields: client_name (string), client_intent ("Buying"|"Selling"|"Renting"|"unknown"), property_preference (string or null), budget_range (string or null), timeline (string or null), pre_approved_status (string or null), lead_outcome (string). If not yet mentioned, set to null.`,
  recruiter: `Extract the following fields from this recruiter screening call. Return ONLY valid JSON, no markdown.
Fields: candidate_name (string), experience_level (string), key_skills (string), salary_expectations (string or null), notice_period (string or null), communication_skills ("Poor"|"Average"|"Good"|"Excellent"), candidate_score (1-10 integer). If not yet mentioned, set to null.`,
};

export async function runLiveExtraction(transcriptLines: string[], useCase: string) {
  if (transcriptLines.length === 0) return {};
  const prompt = (EXTRACTION_PROMPTS[useCase] || EXTRACTION_PROMPTS.hotel) + `

CRITICAL INSTRUCTION FOR CITATIONS:
You MUST also include a top-level "_citations" object in your JSON response. This object must map every extracted field key (that is not null) to an array of exact, verbatim text snippets directly from the transcript that justify that extracted value. These snippets can be disconnected phrases or whole sentences, but they MUST be exact substrings from the transcript.`;

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
          { role: "system", content: prompt },
          {
            role: "user",
            content: `The following is an ongoing speech-to-text transcript. Extract all mentioned entities as valid JSON. If not yet said, leave the value as null:\n\n${transcriptLines.join("\n")}`,
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
