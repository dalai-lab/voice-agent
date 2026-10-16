import { NextRequest, NextResponse } from "next/server";
import { getServerBackendUrl } from "@/lib/apiClient";
import { getServerUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit for onboarding docs

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fileName = (body.fileName || body.file_name || "").trim();
    const fileType = (body.fileType || body.content_type || "application/pdf").trim();
    const fileSize = Number(body.fileSize || body.file_size || 0);
    const documentType = (body.documentType || body.document_type || "onboarding").trim();

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of 20MB (${fileSize} bytes)` },
        { status: 400 }
      );
    }

    const user = await getServerUser().catch(() => null);
    const userId = (user as any)?.id || "user";
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueKey = `onboarding/${userId}/${Date.now()}_${sanitizedFileName}`;

    // 1. Attempt to delegate to the backend's storage service
    const backendUrl = getServerBackendUrl();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        headers["Authorization"] = authHeader;
      }
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        headers["Cookie"] = cookieHeader;
      }

      const upstreamRes = await fetch(`${backendUrl}/api/v1/s3/presigned-document-url`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file_name: fileName,
          file_size: fileSize > 0 ? fileSize : 1024,
          content_type: fileType,
          document_type: documentType,
        }),
      });

      if (upstreamRes.ok) {
        const upstreamData = await upstreamRes.json();
        return NextResponse.json({
          uploadUrl: upstreamData.upload_url,
          fileUrl: upstreamData.file_url,
          fileKey: upstreamData.file_key,
          upload_url: upstreamData.upload_url,
          file_url: upstreamData.file_url,
          expiresIn: upstreamData.expires_in || 900,
        });
      }
    } catch (backendErr) {
      console.warn("[upload/presigned-url] Backend unreachable, falling back to direct storage:", backendErr);
    }

    // 2. Direct storage fallback (MinIO / S3 env vars or internal mock endpoint)
    const minioPublic = process.env.MINIO_PUBLIC_ENDPOINT;
    const minioBucket = process.env.MINIO_BUCKET || "voice-audio";
    const s3Bucket = process.env.S3_BUCKET;
    const s3Region = process.env.S3_REGION || "us-east-1";

    let uploadUrl = "";
    let fileUrl = "";

    if (minioPublic) {
      const baseUrl = minioPublic.replace(/\/$/, "");
      uploadUrl = `${baseUrl}/${minioBucket}/${uniqueKey}`;
      fileUrl = `${baseUrl}/${minioBucket}/${uniqueKey}`;
    } else if (s3Bucket) {
      uploadUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${uniqueKey}`;
      fileUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${uniqueKey}`;
    } else {
      // Local dev fallback: route PUT directly through Next.js
      const origin = request.nextUrl.origin || "http://localhost:3000";
      uploadUrl = `${origin}/api/upload/presigned-url?key=${encodeURIComponent(uniqueKey)}`;
      fileUrl = `https://storage.talkar.ai/${uniqueKey}`;
    }

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      fileKey: uniqueKey,
      upload_url: uploadUrl,
      file_url: fileUrl,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("[upload/presigned-url] Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Internal server error generating upload URL" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Support direct PUT uploads in local dev / mock scenarios
  try {
    const key = request.nextUrl.searchParams.get("key") || "unknown";
    const body = await request.arrayBuffer().catch(() => new ArrayBuffer(0));
    return NextResponse.json({
      success: true,
      key,
      size: body.byteLength,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process upload" },
      { status: 500 }
    );
  }
}
