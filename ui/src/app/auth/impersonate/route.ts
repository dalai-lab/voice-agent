import { NextRequest, NextResponse } from 'next/server';
import { getServerBackendUrl } from '@/lib/apiClient';

const OSS_TOKEN_COOKIE = 'dograh_auth_token';
const OSS_USER_COOKIE = 'dograh_auth_user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Verify the token and get the user object from Dograh backend
  try {
    const backendUrl = getServerBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error("Impersonation failed: token rejected by backend", await res.text());
      return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url));
    }

    const userData = await res.json();

    // Generate redirect response to the overview page
    const response = NextResponse.redirect(new URL('/overview', request.url));

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
      httpOnly: true,
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
    console.error("Impersonation fetch failed", error);
    return NextResponse.redirect(new URL('/auth/login?error=server_error', request.url));
  }
}
