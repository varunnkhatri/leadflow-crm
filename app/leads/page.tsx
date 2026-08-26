import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";

type Customer = { full_name: string | null; phone: string | null; email: string | null };
type Lead = { id: string; enquiry: string | null; product_interest: string | null; category: string | null; temperature: string | null; intent: string | null; lead_score: number | null; stage: string | null; status: string | null; deal_value: number | null; created_at: string; customers: Customer | Customer[] | null };

export default async function LeadsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("email, full_name, role, business_id").eq("id", user.id).limit(1).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data: business } = await supabase.from("businesses").select("name, industry").eq("id", profile.business_id).maybeSingle();
  const { data } = await supabase.from("leads").select(`id, enquiry, product_interest, category, temperature, intent, lead_score, stage, status, deal_value, created_at, customers (full_name, phone, email)`).eq("business_id", profile.business_id).is("deleted_at", null).order("created_at", { ascending: false });
  const leads = (data ?? []) as Lead[];
  const hot = leads.filter(l => String(l.temperature).toUpperCase() === "HOT").length;
  const open = leads.filter(l => String(l.status).toUpperCase() === "OPEN").length;
  const value = leads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

  return <WorkspaceShell title="LEADS" eyebrow="00 / THE INTELLIGENT LEAD DESK">
    <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
      <Metric label="TOTAL LEADS" value={leads.length} detail="Active records" />
      <Metric label="HOT" value={hot} detail="Priority opportunities" />
      <Metric label="PIPELINE" value={`₹${value.toLocaleString("en-IN")}`} detail={`${open} open records`} />
    </div>
    <section className="mt-8 border border-white/10 bg-[#080808]">
      <div className="border-b border-white/10 p-5 sm:p-6"><p className="leadflow-kicker">{business?.industry ?? "CRM"}</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Live lead desk</h2><p className="mt-1 text-xs text-white/35">Select a lead to open its full customer context.</p></div>
      {leads.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px]"><thead className="border-b border-white/10"><tr>{["Customer","Interest","Score","Temperature","Stage","Status","Created"].map(h => <th key={h} className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-[.15em] text-white/30">{h}</th>)}</tr></thead><tbody>{leads.map(lead => <LeadRow key={lead.id} lead={lead} />)}</tbody></table></div> : <div className="p-16 text-center text-xs text-white/35">No leads yet. New enquiries will appear here automatically.</div>}
    </section>
  </WorkspaceShell>;
}

function getCustomer(lead: Lead) { return Array.isArray(lead.customers) ? lead.customers[0] : lead.customers; }
function tempClass(t: string | null) { const v = String(t ?? "").toUpperCase(); return v === "HOT" ? "text-[#ff7070]" : v === "WARM" ? "text-[#f4c56b]" : v === "COLD" ? "text-[#72e8cf]" : "text-white/45"; }
function LeadRow({ lead }: { lead: Lead }) { const c = getCustomer(lead); return <tr className="border-b border-white/[.07] transition hover:bg-white/[.025]"><td className="px-5 py-4"><Link href={`/leads/${lead.id}`} className="font-semibold text-white/80 hover:text-[#b7ff58]">{c?.full_name || "Unknown customer"}</Link><p className="mt-1 text-[10px] text-white/30">{c?.email || c?.phone || "No contact"}</p></td><td className="px-5 py-4 text-xs text-white/50">{lead.product_interest || lead.category || "General enquiry"}</td><td className="px-5 py-4 text-xs font-bold text-[#b7ff58]">{lead.lead_score ?? 0}</td><td className={`px-5 py-4 text-xs font-bold ${tempClass(lead.temperature)}`}>{String(lead.temperature ?? "NEW").toUpperCase()}</td><td className="px-5 py-4 text-xs text-white/45">{lead.stage || "NEW"}</td><td className="px-5 py-4 text-xs text-white/45">{lead.status || "OPEN"}</td><td className="px-5 py-4 text-xs text-white/30">{formatDate(lead.created_at)}</td></tr>; }
function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) { return <div className="bg-[#080808] p-5"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-white">{value}</p><p className="mt-1 text-[10px] text-white/30">{detail}</p></div>; }
function formatDate(v: string) { try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "Unknown"; } }
