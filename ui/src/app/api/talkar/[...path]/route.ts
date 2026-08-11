/**
 * Server-side proxy for all Talkar service API calls.
 * 
 * The browser cannot call http://host.docker.internal:8002 directly because:
 *  1. It is not reachable from the user's machine (internal Docker network).
 *  2. Mixed Content rules block HTTP requests from an HTTPS page.
 * 
 * This proxy catches all /api/talkar/* requests, strips the /api/talkar prefix,
 * and forwards them to the internal Talkar service. The response is returned as-is.
 */
import { NextRequest, NextResponse } from "next/server";

const TALKAR_INTERNAL_URL =
  process.env.TALKAR_SERVICE_URL || "http://host.docker.internal:8002";

async function proxy(request: NextRequest, method: string, path: string) {
  const search = request.nextUrl.search;
  const targetUrl = `${TALKAR_INTERNAL_URL}/${path}${search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      body = undefined;
    }
  }

  try {
    const upstream = await fetch(targetUrl, { method, headers, body });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error(`[talkar-proxy] Failed to reach ${targetUrl}:`, err);
    return NextResponse.json(
      { error: "Talkar service unreachable" },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, "GET", path.join("/"));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, "POST", path.join("/"));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, "PATCH", path.join("/"));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, "PUT", path.join("/"));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxy(request, "DELETE", path.join("/"));
}
