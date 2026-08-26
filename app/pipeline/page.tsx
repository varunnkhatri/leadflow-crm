import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PipelineBoard } from "@/components/pipeline-board";
import { createClient } from "@/lib/supabase/server";

type CustomerRelation = { full_name?: string | null } | { full_name?: string | null }[] | null | undefined;

function customerName(value: CustomerRelation) {
  if (Array.isArray(value)) return value[0]?.full_name || "Unknown customer";
  return value?.full_name || "Unknown customer";
}

export default async function PipelinePage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data } = await supabase.from("leads").select("id, enquiry, stage, lead_score, temperature, deal_value, updated_at, customers (full_name)").eq("business_id", profile.business_id).is("deleted_at", null).order("updated_at", { ascending: false });
  const rows = (data ?? []).map((lead) => {
    const raw = (lead as unknown as { customers?: unknown }).customers as CustomerRelation;
    return { id: lead.id as string, name: customerName(raw), enquiry: lead.enquiry as string | null, stage: String(lead.stage || "NEW"), score: Number(lead.lead_score) || 0, temperature: lead.temperature as string | null, value: Number(lead.deal_value) || 0, updated: String(lead.updated_at || "") };
  });
  return <WorkspaceShell title="PIPELINE" eyebrow="01 / OPPORTUNITY FLOW"><PipelineBoard rows={rows} /></WorkspaceShell>;
}
