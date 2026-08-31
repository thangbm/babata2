import { AI_SERVICE_URL } from "@/lib/env";

/**
 * Proxies to the Python multi-agent AI service (services/ai).
 * Keep BFF-side validation/auth here; the AI service stays an internal
 * service that is not directly exposed to the browser.
 */
export async function POST(request: Request) {
  const body = await request.json();

  try {
    const upstream = await fetch(`${AI_SERVICE_URL}/agents/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unexpected error";
    return Response.json({ error: message }, { status: 502 });
  }
}
