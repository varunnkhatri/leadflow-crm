import { NextResponse } from "next/server";
import { fetchMlService, redactLeadText, requireMlWorkspaceContext } from "@/lib/ml/server";

export async function POST(request: Request) {
  const ctx = await requireMlWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ error: "Enquiry text is required." }, { status: 400 });
  }

  const redacted = redactLeadText(body.text);
  if (!redacted) {
    return NextResponse.json({ error: "Enquiry text must not be empty." }, { status: 400 });
  }

  const result = await fetchMlService<{
    sentiment: string;
    confidence: number;
    probabilities: Record<string, number>;
    model: string;
  }>("/sentiment", {
    method: "POST",
    body: { text: redacted },
  });

  if (!result.ok) {
    return result.response;
  }

  return NextResponse.json(result.data);
}
