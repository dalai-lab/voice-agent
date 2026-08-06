"use server";

import { headers } from "next/headers";
import fs from "fs/promises";
import path from "path";

// Rate limit configuration
// Using /tmp/ because Docker containers often have read-only filesystems in /app
const RATE_LIMIT_FILE = "/tmp/demo_rate_limits.json";
const RATE_LIMIT_HOURS = 24;

// Hardcoded Dograh API configuration
const DOGRAH_API_KEY = "dgr_vcgoAOH9gYU-uBbR7XvhVeySPWQBVGSTzM6vxyPRj9c";

// Workflow mapping: Add more workflows here as they are built!
const WORKFLOW_MAP: Record<string, string> = {
    hotel: "a48f9cf9-7527-4b74-98fc-e499a2cad0d1",
    // medical: "uuid-here",
    // sales: "uuid-here",
    // service: "uuid-here",
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

        return { success: true, message: "Call initiated successfully." };

    } catch (error) {
        console.error("[DemoCall] Server Action Exception:", error);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}
