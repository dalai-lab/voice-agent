import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getServerBackendUrl } from '@/lib/apiClient';

const OSS_TOKEN_COOKIE = 'dograh_auth_token';

// Paths that don't require authentication in OSS mode.
// `/embed` serves the public website widget (e.g. /embed/dograh-widget.js),
// which must be fetchable without a session cookie so third-party sites can
// embed it — otherwise the middleware 307-redirects the asset to /auth/login.
const PUBLIC_PATHS = ['/auth/login', '/auth/signup', '/auth/impersonate', '/embed'];
const isPublicPath = (pathname: string) => {
  return pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p));
};

let cachedAuthProvider: string | null = null;

async function fetchAuthProvider(): Promise<string> {
  if (cachedAuthProvider) {
    return cachedAuthProvider;
  }

  try {
    const backendUrl = getServerBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/health`);
    if (res.ok) {
      const data = await res.json();
      // Only cache a DEFINITIVE answer from the backend. Never cache a failure:
      // this is a module-scoped cache with no TTL, so a single early request
      // during container startup (before the api service is reachable) would
      // otherwise poison it to 'local' for the life of the worker — redirecting
      // every Stack user to the local /auth/login form even though the backend
      // reports `stack`.
      cachedAuthProvider = (data.auth_provider as string) || 'local';
      return cachedAuthProvider;
    }
  } catch {
    // Backend not reachable — fall through without caching so we retry next request.
  }

  // Provider unknown (backend unreachable). Return a non-'local' sentinel so the
  // middleware does NOT guard/redirect: assuming 'local' here would bounce Stack
  // users to /auth/login. Deliberately not cached — the next request retries.
  return 'unknown';
}

export async function middleware(request: NextRequest) {
  const authProvider = await fetchAuthProvider();

  const token = request.cookies.get(OSS_TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  // Allow public paths without auth
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // If local auth and no token, redirect to login
  if (authProvider === 'local' && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // TALKAR PATCH: Fetch user info for status and gating
  let organizationId = null;
  let talkarOrgType = null;
  try {
    const backendUrl = getServerBackendUrl();

    // Use MIDDLEWARE_BACKEND_URL which is set to host.docker.internal in docker-compose.
    // Regular BACKEND_URL (http://api:8000) can't be resolved by the Next.js Edge runtime.
    const edgeBackendUrl = process.env.MIDDLEWARE_BACKEND_URL
      || (backendUrl.includes('//api:') ? backendUrl.replace('//api:', '//host.docker.internal:') : backendUrl);

    // Build auth headers for /auth/me call
    const safeHeaders = new Headers();

    if (authProvider === 'local') {
      // Local auth: pass the session cookie + Bearer token
      if (token) {
        safeHeaders.set('Cookie', `${OSS_TOKEN_COOKIE}=${token}`);
        safeHeaders.set('Authorization', `Bearer ${token}`);
      } else {
        // No local token, can't check org - skip gate
        return NextResponse.next();
      }
    } else {
      // Stack Auth: the backend's Stack Auth SDK validates using the raw session cookies.
      // The hexclave-access value is an opaque token (NOT a Bearer JWT), so we must
      // forward ALL cookies and let the backend resolve the user server-side.
      const rawCookie = request.headers.get('cookie');
      console.log("[MIDDLEWARE] ALL COOKIES:", request.cookies.getAll().map(c => ({ name: c.name, val_start: c.value.substring(0, 10) })));
      if (!rawCookie || !rawCookie.includes('hexclave-access')) {
        console.log("[MIDDLEWARE] NO STACK SESSION FOUND, SKIPPING GATE");
        return NextResponse.next();
      }
      safeHeaders.set('Cookie', rawCookie);
    }

    console.log("[MIDDLEWARE] Fetching from:", `${edgeBackendUrl}/api/v1/auth/me`);
    const res = await fetch(`${edgeBackendUrl}/api/v1/auth/me`, {
      headers: safeHeaders
    });
    console.log("[MIDDLEWARE] /auth/me status:", res.status);
    if (res.ok) {
      const userData = await res.json();
      console.log("[MIDDLEWARE] /auth/me response:", JSON.stringify(userData));
      organizationId = userData.organization_id;
      talkarOrgType = userData.talkar_org_type;
    } else {
      const errText = await res.text().catch(() => '(unreadable)');
      console.log("[MIDDLEWARE] /auth/me failed body:", errText.substring(0, 200));
    }

  } catch (err) {
    console.error("Failed to fetch user info in middleware", err);
  }

  // TALKAR PATCH: Account status gate (Phase 5B)
  const ALLOWED_WHILE_LOCKED = ["/onboarding", "/api", "/_next", "/login", "/logout"];
  console.log("[MIDDLEWARE] Gate check - organizationId:", organizationId, "pathname:", pathname);
  if (organizationId && !ALLOWED_WHILE_LOCKED.some(p => pathname.startsWith(p))) {
    try {
      // Check Talkar account status using the org ID
      const TALKAR_SERVICE = process.env.TALKAR_SERVICE_URL || "http://host.docker.internal:8002";
      console.log("[MIDDLEWARE] Checking Talkar status at:", `${TALKAR_SERVICE}/customers/status?dograh_org_id=${organizationId}`);
      const statusRes = await fetch(`${TALKAR_SERVICE}/customers/status?dograh_org_id=${organizationId}`);
      console.log("[MIDDLEWARE] Talkar status response:", statusRes.status);

      if (statusRes.ok) {
        const { status } = await statusRes.json();
        console.log("[MIDDLEWARE] Talkar customer status:", status);
        if (status !== 'active') {
          // TALKAR PATCH: Status state machine routing
          const isAdminBypass = request.cookies.get('talkar_admin_bypass')?.value;
          
          if (isAdminBypass === 'true') {
            // Bypass the lock for Talkar Admins impersonating a user
          } else if (status === 'suspended' && (pathname.startsWith('/wallet') || pathname.startsWith('/billing'))) {
            // let it pass
          } else if (status === 'pending_deposit') {
            if (!pathname.startsWith('/wallet')) {
              return NextResponse.redirect(new URL('/wallet?activation=true', request.url));
            }
          } else if (status === 'pending_plan_selection') {
            if (!pathname.startsWith('/onboarding/select-plan')) {
              return NextResponse.redirect(new URL('/onboarding/select-plan', request.url));
            }
          } else {
            return NextResponse.redirect(new URL('/onboarding', request.url));
          }
        }
      } else {
        // If the customer doesn't exist yet (404) or API is down, force them to onboarding
        console.log(`[MIDDLEWARE] Talkar status check failed (${statusRes.status}), forcing onboarding`);
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    } catch (err) {
      console.error("Talkar account status gate fetch failed", err);
      // Failsafe: If Talkar API is unreachable, do not let them bypass the lock!
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // TALKAR PATCH: Block restricted URLs for customers (SOT 695)
  const RESTRICTED_PREFIXES = [
    '/usage', '/telephony-configurations', 
    '/model-configurations', '/api-keys'
  ];
  if (RESTRICTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const isAdminBypass = request.cookies.get('talkar_admin_bypass')?.value;
    if (talkarOrgType === 'customer' && isAdminBypass !== 'true') {
      const overviewUrl = new URL('/overview', request.url);
      // Optional: Add a query param so the UI can show a toast
      overviewUrl.searchParams.set('restricted', 'true');
      return NextResponse.redirect(overviewUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public static assets (anything with a file extension, e.g. /dograh-logo.png)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)).*)',
  ],
};
