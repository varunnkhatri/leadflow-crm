import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowed = ["enquiry","product_interest","budget_raw","location","source","campaign","temperature","intent","category","requirements","timeline","recommended_next_action","human_review_required","stage","status","assigned_user_id","deal_value"] as const;

type Payload = { id?: string; [key: string]: unknown };

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
    if (!profile?.business_id) return NextResponse.json({ error: "Your account is not connected to a business." }, { status: 403 });

    const body = (await request.json()) as Payload;
    if (!body.id) return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });

    const changes: Record<string, unknown> = {};
    for (const key of allowed) if (key in body) changes[key] = body[key];
    if (!Object.keys(changes).length) return NextResponse.json({ error: "No changes supplied." }, { status: 400 });
    if (typeof changes.enquiry === "string" && changes.enquiry.length > 3000) return NextResponse.json({ error: "Enquiry is too long." }, { status: 400 });

    const { data: current, error: currentError } = await supabase.from("leads").select("id, business_id, customer_id, stage").eq("id", body.id).eq("business_id", profile.business_id).is("deleted_at", null).maybeSingle();
    if (currentError || !current) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const { data: updated, error } = await supabase.from("leads").update(changes).eq("id", body.id).eq("business_id", profile.business_id).select("id, stage, status, updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to update lead." }, { status: 500 });

    if ("stage" in changes && String(changes.stage) !== String(current.stage)) {
      await supabase.from("activities").insert({ business_id: profile.business_id, lead_id: current.id, customer_id: current.customer_id, type: "STAGE_CHANGED", actor: "user", detail: { from: current.stage, to: changes.stage } });
    } else {
      await supabase.from("activities").insert({ business_id: profile.business_id, lead_id: current.id, customer_id: current.customer_id, type: "LEAD_UPDATED", actor: "user", detail: { fields: Object.keys(changes) } });
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
