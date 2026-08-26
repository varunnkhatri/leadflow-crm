import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceModule } from "@/components/workspace-module";
import { createClient } from "@/lib/supabase/server";

export default async function AIAgentsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data: runs } = await supabase.from("workflow_executions").select("workflow_name, status").eq("business_id", profile.business_id);
  const definitions = [
    ["Lead Finder", "PROSPECTING", "Finds and enriches new prospects before they enter the sales queue.", "lead_finder"],
    ["Scoring Agent", "QUALIFICATION", "Scores intent, urgency and purchase probability so the team sees what matters first.", "lead_scoring"],
    ["Sales Agent", "CONVERSATION", "Handles first-response sales conversations and surfaces high-intent handoffs.", "sales_agent"],
    ["Follow-up Agent", "NURTURE", "Creates and sequences follow-ups when a lead needs another touch.", "follow_up"],
    ["Manager Agent", "CONTROL", "Surfaces failures, exceptions and opportunities that need human decisions.", "manager_agent"],
  ] as const;
  const agents = definitions.map(([name, job, description, workflow]) => { const relevant = (runs ?? []).filter((r) => String(r.workflow_name || "").toLowerCase().includes(workflow)); return { name, job, description, workflow, runs: relevant.length, failures: relevant.filter((r) => ["FAILED", "ERROR"].includes(String(r.status).toUpperCase())).length, active: relevant.some((r) => !["FAILED", "ERROR"].includes(String(r.status).toUpperCase())) }; });
  return <WorkspaceShell title="AI AGENTS" eyebrow="05 / AUTOMATION"><WorkspaceModule kind="ai-agents" agents={agents} /></WorkspaceShell>;
}
