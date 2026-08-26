import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceModule } from "@/components/workspace-module";
import { createClient } from "@/lib/supabase/server";

export default async function IntegrationsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data } = await supabase.from("integration_health").select("component, healthy, issue_count, checked_at").order("checked_at", { ascending: false });
  const integrations = (data ?? []).map((i) => ({ component: String(i.component), healthy: Boolean(i.healthy), issueCount: Number(i.issue_count) || 0, checkedAt: String(i.checked_at) }));
  return <WorkspaceShell title="INTEGRATIONS" eyebrow="08 / CONNECTED SYSTEMS"><WorkspaceModule kind="integrations" integrations={integrations} /></WorkspaceShell>;
}
