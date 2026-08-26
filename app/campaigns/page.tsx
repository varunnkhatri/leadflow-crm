import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceModule } from "@/components/workspace-module";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data } = await supabase.from("leads").select("campaign, temperature, purchase_probability, deal_value").eq("business_id", profile.business_id).is("deleted_at", null);
  const grouped = new Map<string, { leads:number; hot:number; qualified:number; value:number }>();
  (data ?? []).forEach((lead) => { const name = String(lead.campaign || "Unattributed"); const current = grouped.get(name) || { leads:0, hot:0, qualified:0, value:0 }; current.leads += 1; if (String(lead.temperature).toUpperCase() === "HOT") current.hot += 1; if (Number(lead.purchase_probability) >= 70) current.qualified += 1; current.value += Number(lead.deal_value) || 0; grouped.set(name, current); });
  const campaigns = Array.from(grouped.entries()).sort((a,b)=>b[1].value-a[1].value).map(([name, stats])=>({ name, ...stats }));
  return <WorkspaceShell title="CAMPAIGNS" eyebrow="06 / DEMAND ENGINE"><WorkspaceModule kind="campaigns" campaigns={campaigns} /></WorkspaceShell>;
}
