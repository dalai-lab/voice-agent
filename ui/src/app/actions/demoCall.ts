"use server";

import { headers } from "next/headers";
import fs from "fs/promises";
import path from "path";

// Rate limit configuration
// Using /tmp/ because Docker containers often have read-only filesystems in /app
const RATE_LIMIT_FILE = "/tmp/demo_rate_limits.json";
const RATE_LIMIT_HOURS = 24;

// Hardcoded Dograh API configuration
const DOGRAH_API_KEY = "dgr_Cx8vqaOxg1GsJ-Anyo0Nj-H5bfTkNTre1S_nPdmMwsY";

// Workflow mapping: Add more workflows here as they are built!
const WORKFLOW_MAP: Record<string, string> = {
    hotel: "60708cc2-6818-4f0f-a26e-546d24c4e9c5",
    medical: "aff893d1-0f12-4d13-a1d4-de2752913ad1",
    sales: "4a558359-9221-4d8b-a6c9-e54349811f49",
    service: "7b5b8865-eec6-4b4c-8a53-fdf2ba1c17bb",
};

interface RateLimitData {
    [ip: string]: number; // timestamp in milliseconds
}

async function checkRateLimit(ip: string): Promise<boolean> {
    try {
        let data: RateLimitData = {};
        
        try {
            const fileContent = await fs.readFile(RATE_LIMIT_FILE, "utf-8");
            data = JSON.parse(fileContent);
        } catch (error: any) {
            // File doesn't exist or is invalid, start fresh
            if (error.code !== "ENOENT") {
                console.warn("Failed to read rate limit file, starting fresh:", error);
            }
        }

        const now = Date.now();
        const lastCallTime = data[ip];

        if (lastCallTime) {
            const hoursSinceLastCall = (now - lastCallTime) / (1000 * 60 * 60);
            if (hoursSinceLastCall < RATE_LIMIT_HOURS) {
                return false; // Rate limited
            }
        }

        // Update timestamp for this IP
        data[ip] = now;
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
                    source: "landing_page_demo"
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
