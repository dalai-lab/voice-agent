import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const { runId } = params;

  if (!runId) {
    return new Response("Missing runId", { status: 400 });
  }

  const DOGRAH_API_KEY =
    process.env.DOGRAH_API_KEY || "dgr_Cx8vqaOxg1GsJ-Anyo0Nj-H5bfTkNTre1S_nPdmMwsY";

  const backendUrl = `https://talkar.in/api/v1/public/agent/run/${runId}/stream?api_key=${DOGRAH_API_KEY}`;

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response(`Error from backend: ${response.statusText}`, {
        status: response.status,
      });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error proxying SSE stream:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
