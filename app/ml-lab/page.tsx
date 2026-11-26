import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { LeadOption } from "@/components/ml/types";
import Lab from "./lab";

type LeadRow = {
  id: string;
  enquiry: string | null;
  source: string | null;
  product_interest: string | null;
  stage: string | null;
  temperature: string | null;
  customers: { full_name: string | null } | { full_name: string | null }[] | null;
};

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

  const { data } = await s
    .from("leads")
    .select("id, enquiry, source, product_interest, stage, temperature, customers(full_name)")
    .eq("business_id", p.business_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const leads: LeadOption[] = ((data ?? []) as LeadRow[]).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const customerName = customer?.full_name?.trim() || "Unnamed lead";
    const source = row.source?.trim() || "unknown";
    const productInterest = row.product_interest?.trim() || "General";
    const enquiryText = String(row.enquiry || "").trim();
    const preview = enquiryText ? enquiryText.slice(0, 120) : "No enquiry message recorded";

    return {
      id: String(row.id),
      label: `${customerName} · ${source} · ${productInterest} — ${preview.slice(0, 65)}`,
      source,
      productInterest,
      stage: String(row.stage || "NEW"),
      temperature: row.temperature,
      customerName,
      enquiryPreview: enquiryText,
    };
  });

  return (
    <WorkspaceShell title="ML LAB" eyebrow="08 / ACADEMIC AI INTELLIGENCE">
      <Lab leads={leads} />
    </WorkspaceShell>
  );
}
