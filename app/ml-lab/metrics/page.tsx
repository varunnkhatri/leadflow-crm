import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";
import MetricsClient from "./metrics-client";

export default async function Page() {
  await connection();
  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: p } = await s
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!p?.business_id) redirect("/protected");

  return (
    <WorkspaceShell title="MODEL EVALUATION" eyebrow="08 / BENCHMARKS & MATRICES">
      <MetricsClient />
    </WorkspaceShell>
  );
}
