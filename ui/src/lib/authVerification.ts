import { resolveBrowserBackendUrl } from "@/lib/apiClient";

export interface VerifyEmailResponse {
  token: string;
  user: {
    id: number;
    email: string;
    organization_id?: number | null;
    provider_id?: string | null;
    is_verified: boolean;
  };
  is_verified: boolean;
  message?: string;
}

export async function verifyEmailApi(email: string, code: string): Promise<{ data?: VerifyEmailResponse; error?: string }> {
  const backendUrl = resolveBrowserBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = typeof body?.detail === "string" ? body.detail : body?.detail?.message || "Verification failed";
      return { error: errorMsg };
    }
    return { data: body };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error. Please try again.";
    return { error: msg };
  }
}

export async function resendVerificationApi(email: string): Promise<{ success: boolean; error?: string }> {
  const backendUrl = resolveBrowserBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = typeof body?.detail === "string" ? body.detail : body?.detail?.message || "Failed to resend code";
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error. Please try again.";
    return { success: false, error: msg };
  }
}

export async function changeSignupEmailApi(
  currentEmail: string,
  newEmail: string,
  password: string
): Promise<{ success: boolean; newEmail?: string; token?: string; error?: string }> {
  const backendUrl = resolveBrowserBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/v1/auth/change-signup-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_email: currentEmail,
        new_email: newEmail,
        password: password,
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = typeof body?.detail === "string" ? body.detail : body?.detail?.message || "Failed to change email";
      return { success: false, error: errorMsg };
    }
    return { success: true, newEmail: body.new_email, token: body.token };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error. Please try again.";
    return { success: false, error: msg };
  }
}

export async function checkVerificationStatusApi(email: string): Promise<{ is_verified: boolean }> {
  const backendUrl = resolveBrowserBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/v1/auth/verification-status?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return { is_verified: false };
    const body = await res.json().catch(() => null);
    return { is_verified: Boolean(body?.is_verified) };
  } catch {
    return { is_verified: false };
  }
}
