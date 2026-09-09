import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type CreatedLead = {
  business_id: string;
  lead_id: string;
  customer_id: string;
};

function isCreatedLead(value: unknown): value is CreatedLead {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return ["business_id", "lead_id", "customer_id"].every((key) => typeof result[key] === "string");
}

async function dispatchAutomation(payload: CreatedLead & {
  name: string;
  phone: string | null;
  email: string | null;
  requested_service: string | null;
  message: string;
}) {
  const webhookUrl = process.env.N8N_LEAD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, source: "public_form" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("lead automation dispatch failed", { leadId: payload.lead_id, status: response.status });
    }
  } catch {
    console.error("lead automation dispatch failed", { leadId: payload.lead_id });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!UUID_PATTERN.test(token)) {
    return NextResponse.json({ error: "Unknown public intake endpoint." }, { status: 404 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name);
    const phone = text(body.phone);
    const email = text(body.email);
    const service = text(body.service);
    const message = text(body.message);

    if (!name || (!phone && !email) || !message) {
      return NextResponse.json({ error: "Name, phone or email, and message are required." }, { status: 400 });
    }

    if (name.length > 100 || phone.length > 40 || email.length > 320 || service.length > 200 || message.length > 3000) {
      return NextResponse.json({ error: "Lead details exceed the allowed length." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_public_lead", {
      p_token: token,
      p_name: name,
      p_phone: phone || null,
      p_email: email || null,
      p_service: service || null,
      p_message: message,
    });

    if (error) {
      const unknownEndpoint = error.message.includes("Unknown or inactive public intake endpoint");
      console.error("public lead intake failed", error);
      return NextResponse.json(
        { error: unknownEndpoint ? "Unknown public intake endpoint." : "Unable to submit your enquiry." },
        { status: unknownEndpoint ? 404 : 400 },
      );
    }

    if (!isCreatedLead(data)) {
      console.error("public lead intake returned an invalid lifecycle result");
      return NextResponse.json({ error: "Unable to submit your enquiry." }, { status: 500 });
    }

    await dispatchAutomation({
      ...data,
      name,
      phone: phone || null,
      email: email || null,
      requested_service: service || null,
      message,
    });

    return NextResponse.json(
      { success: true, lead: { lead_id: data.lead_id, customer_id: data.customer_id } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
