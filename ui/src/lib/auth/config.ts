import "server-only";

import { getServerBackendUrl } from "@/lib/apiClient";

export interface StackConfig {
  projectId: string;
  publishableClientKey: string;
}

interface ResolvedAuthConfig {
  authProvider: string;
  stackConfig: StackConfig | null;
  signupEnabled: boolean;
}

let cachedConfig: ResolvedAuthConfig | null = null;

/**
 * Fetches the auth configuration from the backend health endpoint and caches it.
 *
 * The backend reports the active auth provider and — when it is `stack` — the
 * public Stack client config (project id + publishable client key). The UI uses
 * these at runtime to initialize Stack Auth, so they no longer need to be baked
 * into the browser bundle at build time. Falls back to local auth on error.
 */
async function resolveAuthConfig(): Promise<ResolvedAuthConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const backendUrl = getServerBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/health`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      const authProvider = (data.auth_provider as string) || "local";
      const stackConfig =
        authProvider === "stack" &&
        data.stack_project_id &&
        data.stack_publishable_client_key
          ? {
              projectId: data.stack_project_id as string,
              publishableClientKey:
                data.stack_publishable_client_key as string,
            }
          : null;
      // Default to signup-enabled when the backend omits the field (older api
      // versions before the flag existed) — matches the backend's own default.
      const signupEnabled = data.signup_enabled !== false;
      cachedConfig = { authProvider, stackConfig, signupEnabled };
      return cachedConfig;
    }
  } catch {
    // Backend not reachable — fall through without caching so we retry next request.
  }

  // Fallback to environment variables if backend health endpoint is unreachable
  const envProvider = process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER;
  const envProjectId = process.env.STACK_AUTH_PROJECT_ID || process.env.NEXT_PUBLIC_STACK_AUTH_PROJECT_ID;
  const envKey = process.env.STACK_PUBLISHABLE_CLIENT_KEY || process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

  if (envProvider === "stack" && envProjectId && envKey) {
    return {
      authProvider: "stack",
      stackConfig: { projectId: envProjectId, publishableClientKey: envKey },
      signupEnabled: true,
    };
  }

  // Unknown (backend unreachable and no env config). Return local fallback.
  return { authProvider: "local", stackConfig: null, signupEnabled: true };
}

/**
 * Returns the active auth provider ('local' or 'stack'). Falls back to 'local'.
 */
export async function getAuthProvider(): Promise<string> {
  return (await resolveAuthConfig()).authProvider;
}

/**
 * Returns the public Stack client config when the active provider is `stack`,
 * otherwise null. Server-only — the browser receives these via /api/config/auth.
 */
export async function getStackConfig(): Promise<StackConfig | null> {
  return (await resolveAuthConfig()).stackConfig;
}

/**
 * Returns true when the backend allows signup (`ENABLE_SIGNUP`, default true).
 * The login page uses this to hide the signup link on locked-down installs.
 */
export async function getSignupEnabled(): Promise<boolean> {
  return (await resolveAuthConfig()).signupEnabled;
}
