import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceModule } from "@/components/workspace-module";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data } = await supabase.from("leads").select("source, lead_score, deal_value, stage, temperature, created_at").eq("business_id", profile.business_id).is("deleted_at", null).order("created_at", { ascending: false });
  const leads = (data ?? []).map((l) => ({ source: l.source as string | null, score: Number(l.lead_score) || 0, value: Number(l.deal_value) || 0, stage: String(l.stage || "NEW"), temperature: l.temperature as string | null, createdAt: String(l.created_at) }));
  return <WorkspaceShell title="ANALYTICS" eyebrow="07 / REVENUE INTELLIGENCE"><WorkspaceModule kind="analytics" leads={leads} /></WorkspaceShell>;
}
