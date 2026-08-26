import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceModule } from "@/components/workspace-module";
import { createClient } from "@/lib/supabase/server";

type CustomerRelation = { full_name?: string | null } | { full_name?: string | null }[] | null | undefined;

function customerName(value: CustomerRelation) {
  if (Array.isArray(value)) return value[0]?.full_name || "Unknown customer";
  return value?.full_name || "Unknown customer";
}

export default async function TasksPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data } = await supabase.from("followups").select("id, channel, state, scheduled_at, message_body, reason, customers (full_name)").eq("business_id", profile.business_id).order("scheduled_at", { ascending: true }).limit(100);
  const tasks = (data ?? []).map((t) => {
    const raw = (t as unknown as { customers?: unknown }).customers as CustomerRelation;
    return { id: t.id as string, name: customerName(raw), channel: String(t.channel), state: String(t.state), scheduledAt: String(t.scheduled_at), reason: t.reason as string | null, message: t.message_body as string | null };
  });
  return <WorkspaceShell title="TASKS" eyebrow="04 / NEXT MOVES"><WorkspaceModule kind="tasks" tasks={tasks} /></WorkspaceShell>;
}
