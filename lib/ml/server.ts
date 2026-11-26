import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type MlWorkspaceContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      businessId: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireMlWorkspaceContext(): Promise<MlWorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile?.business_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Workspace access required." }, { status: 403 }),
    };
  }

  return { ok: true, supabase, businessId: String(profile.business_id) };
}

/** Redact common contact identifiers before sending free-text enquiries to the ML service. */
export function redactLeadText(raw: string): string {
  return raw
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
    .trim()
    .slice(0, 3000);
}

export async function fetchMlService<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const url = process.env.ML_API_URL?.trim();
  const key = process.env.ML_API_KEY?.trim();

  if (!url || !key) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ML service is not configured on the server (ML_API_URL / ML_API_KEY missing)." },
        { status: 503 },
      ),
    };
  }

  const targetUrl = `${url.replace(/\/$/, "")}${path}`;
  try {
    const headers: Record<string, string> = { "x-api-key": key };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(targetUrl, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!res.ok) {
      let detail = "ML service returned an error.";
      try {
        const errPayload = (await res.json()) as { detail?: string; error?: string };
        if (typeof errPayload?.detail === "string") detail = errPayload.detail;
        else if (typeof errPayload?.error === "string") detail = errPayload.error;
      } catch {
        // Ignore non-JSON upstream error body.
      }
      const status = res.status === 503 ? 503 : res.status === 400 || res.status === 422 ? 400 : 502;
      return {
        ok: false,
        response: NextResponse.json({ error: detail }, { status }),
      };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: isTimeout
            ? "ML service request timed out. Ensure the FastAPI ML server is running."
            : "Unable to reach the ML service. Ensure ML_API_URL is running and reachable.",
        },
        { status: 503 },
      ),
    };
  }
}
