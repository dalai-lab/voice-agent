import { NextRequest, NextResponse } from 'next/server';
import { getServerBackendUrl } from '@/lib/apiClient';

const OSS_TOKEN_COOKIE = 'dograh_auth_token';
const OSS_USER_COOKIE = 'dograh_auth_user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const refreshToken = searchParams.get('refresh_token');
  
  // Construct the correct base URL for redirects (avoid 0.0.0.0 Docker bind addresses)
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'talkar.in';
  const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const baseUrl = `${proto}://${forwardedHost}`;
  
  const backendUrl = getServerBackendUrl();
  let authProvider = 'local';
  try {
    const healthRes = await fetch(`${backendUrl}/api/v1/health`);
    if (healthRes.ok) {
      const data = await healthRes.json();
      authProvider = data.auth_provider || 'local';
    }
  } catch (e) {
    console.warn("Failed to fetch health for auth provider check", e);
  }

  if (authProvider === 'stack' && refreshToken) {
    // Hand off to the official Stack SDK impersonation route
    const response = NextResponse.redirect(new URL(`/impersonate?refresh_token=${refreshToken}&redirect_path=/overview`, baseUrl));
    response.cookies.set('talkar_admin_bypass', 'true', {
      httpOnly: false, // Must be false so AppLayout.tsx document.cookie can read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  }

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', baseUrl));
  }

  // Verify the token and get the user object from Dograh backend
  try {
    const res = await fetch(`${backendUrl}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error("Impersonation failed: token rejected by backend", await res.text());
      return NextResponse.redirect(new URL('/auth/login?error=invalid_token', baseUrl));
    }

    const userData = await res.json();

    // Generate redirect response to the overview page
    const response = NextResponse.redirect(new URL('/overview', baseUrl));

    // Set the authentication cookies
    response.cookies.set(OSS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    
    // Set a session cookie to flag that this is an admin impersonating
    response.cookies.set('talkar_admin_bypass', 'true', {
      httpOnly: false, // Must be false so AppLayout.tsx document.cookie can read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.cookies.set(OSS_USER_COOKIE, JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Impersonation error", error);
    return NextResponse.redirect(new URL('/auth/login?error=server_error', baseUrl));
  }
}
