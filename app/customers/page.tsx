import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceModule } from "@/components/workspace-module";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data } = await supabase.from("customers").select("id, full_name, email, phone, source, last_seen_at").eq("business_id", profile.business_id).is("deleted_at", null).order("last_seen_at", { ascending: false });
  const customers = (data ?? []).map((c) => ({ id: c.id as string, name: c.full_name || "Unknown customer", email: c.email as string | null, phone: c.phone as string | null, source: c.source as string | null, lastSeen: String(c.last_seen_at) }));
  return <WorkspaceShell title="CUSTOMERS" eyebrow="02 / RELATIONSHIPS"><WorkspaceModule kind="customers" customers={customers} /></WorkspaceShell>;
}
