import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateLeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
  source?: string;
  campaign?: string;
  budget_raw?: string;
  requirements?: string;
  timeline?: string;
  intent?: string;
  location?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.business_id) {
      return NextResponse.json({ error: "Your account is not connected to a business." }, { status: 403 });
    }

    const body = (await request.json()) as CreateLeadPayload;
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const email = body.email?.trim();
    const service = body.service?.trim();
    const message = body.message?.trim();

    if (!name || (!phone && !email) || !message) {
      return NextResponse.json({ error: "Name, phone or email, and enquiry are required." }, { status: 400 });
    }
    if (name.length > 100 || message.length > 3000) {
      return NextResponse.json({ error: "Lead details exceed the allowed length." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("create_lead_lifecycle", {
      p_business_id: profile.business_id,
      p_name: name,
      p_phone: phone || null,
      p_email: email || null,
      p_service: service || null,
      p_message: message,
      p_source: body.source?.trim() || "manual",
      p_campaign: body.campaign?.trim() || null,
      p_budget_raw: body.budget_raw?.trim() || null,
      p_requirements: body.requirements?.trim() || null,
      p_timeline: body.timeline?.trim() || null,
      p_intent: body.intent?.trim() || null,
      p_location: body.location?.trim() || null,
    });

    if (error) {
      console.error("create_lead_lifecycle failed", error);
      return NextResponse.json({ error: "Unable to create the lead." }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
