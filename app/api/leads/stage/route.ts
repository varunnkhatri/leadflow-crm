import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON"] as const;

type Stage = (typeof ALLOWED_STAGES)[number];

export async function PATCH(request: Request) {
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

    const body = (await request.json()) as { lead_id?: string; stage?: string };
    const leadId = body.lead_id?.trim();
    const stage = body.stage?.trim().toUpperCase() as Stage;

    if (!leadId || !ALLOWED_STAGES.includes(stage)) {
      return NextResponse.json({ error: "A valid lead and pipeline stage are required." }, { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, business_id, stage, customer_id")
      .eq("id", leadId)
      .eq("business_id", profile.business_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (leadError || !lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    if (String(lead.stage).toUpperCase() === stage) {
      return NextResponse.json({ success: true, lead });
    }

    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .eq("business_id", profile.business_id)
      .select("id, stage, updated_at")
      .single();

    if (updateError) {
      console.error("lead stage update failed", updateError);
      return NextResponse.json({ error: "Unable to update pipeline stage." }, { status: 500 });
    }

    const { error: activityError } = await supabase.from("activities").insert({
      business_id: profile.business_id,
      lead_id: leadId,
      customer_id: lead.customer_id,
      actor: user.id,
      type: "STAGE_CHANGED",
      detail: { from: lead.stage, to: stage },
    });

    if (activityError) console.error("pipeline activity insert failed", activityError);

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("pipeline stage request failed", error);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
