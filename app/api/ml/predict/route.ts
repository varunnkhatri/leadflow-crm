import { NextResponse } from "next/server";
import { fetchMlService, redactLeadText, requireMlWorkspaceContext } from "@/lib/ml/server";

type PredictBody = {
  lead_id?: unknown;
  simulation?: {
    source?: unknown;
    product_interest?: unknown;
    enquiry?: unknown;
  };
};

type FastApiPredictResponse = {
  conversion_probability: number;
  model: string;
  comparison?: Record<string, number>;
  temperature: string;
  segment: number;
  segment_profile?: {
    cluster: number;
    label: string;
    description: string;
    size: number;
    share_pct: number;
    dominant_source: string;
    dominant_service: string;
    avg_enquiry_length: number;
    conversion_rate: number;
    centroid_pc1: number;
    centroid_pc2: number;
  } | null;
  pca_point?: { pc1: number; pc2: number } | null;
  normalized_features?: {
    source: string;
    product_interest: string;
    enquiry_length: number;
  } | null;
};

type FastApiSentimentResponse = {
  sentiment: string;
  confidence: number;
  probabilities: Record<string, number>;
  model: string;
};

export async function POST(request: Request) {
  const ctx = await requireMlWorkspaceContext();
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) as PredictBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  let source = "unknown";
  let productInterest = "unknown";
  let rawEnquiry = "";
  let mode: "workspace_lead" | "simulation" = "workspace_lead";

  if (typeof body.lead_id === "string" && body.lead_id.trim()) {
    const { data: lead, error } = await ctx.supabase
      .from("leads")
      .select("source, product_interest, enquiry")
      .eq("id", body.lead_id.trim())
      .eq("business_id", ctx.businessId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found in your workspace." }, { status: 404 });
    }

    source = String(lead.source || "unknown");
    productInterest = String(lead.product_interest || "unknown");
    rawEnquiry = String(lead.enquiry || "");
  } else if (body.simulation && typeof body.simulation === "object") {
    mode = "simulation";
    source = typeof body.simulation.source === "string" ? body.simulation.source.trim().slice(0, 100) || "unknown" : "unknown";
    productInterest =
      typeof body.simulation.product_interest === "string"
        ? body.simulation.product_interest.trim().slice(0, 200) || "unknown"
        : "unknown";
    rawEnquiry = typeof body.simulation.enquiry === "string" ? body.simulation.enquiry.slice(0, 3000) : "";
  } else {
    return NextResponse.json({ error: "Provide either lead_id or simulation parameters." }, { status: 400 });
  }

  const redactedText = redactLeadText(rawEnquiry);
  const enquiryLength = Math.min(3000, Math.max(0, rawEnquiry.trim().length));

  const [predResult, sentResult] = await Promise.all([
    fetchMlService<FastApiPredictResponse>("/predict", {
      method: "POST",
      body: {
        source,
        product_interest: productInterest,
        enquiry_length: enquiryLength,
      },
    }),
    redactedText
      ? fetchMlService<FastApiSentimentResponse>("/sentiment", {
          method: "POST",
          body: { text: redactedText },
        })
      : Promise.resolve(null),
  ]);

  if (!predResult.ok) {
    return predResult.response;
  }

  const sentimentDetail = sentResult && sentResult.ok ? sentResult.data : null;

  return NextResponse.json({
    ...predResult.data,
    mode,
    sentiment: sentimentDetail?.sentiment ?? null,
    sentiment_detail: sentimentDetail,
  });
}
