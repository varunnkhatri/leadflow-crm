import { NextResponse } from "next/server";
import { fetchMlService, requireMlWorkspaceContext } from "@/lib/ml/server";

export async function GET() {
  const ctx = await requireMlWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const [convResult, sentResult] = await Promise.all([
    fetchMlService<Record<string, unknown>>("/metrics"),
    fetchMlService<Record<string, unknown>>("/sentiment/metrics"),
  ]);

  if (!convResult.ok) {
    return convResult.response;
  }

  return NextResponse.json({
    ...convResult.data,
    sentiment_evaluation: sentResult.ok ? sentResult.data : null,
  });
}
