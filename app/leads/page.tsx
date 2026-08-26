import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Customer = { full_name: string | null; phone: string | null; email: string | null };
type Lead = {
  id: string; enquiry: string | null; product_interest: string | null; category: string | null;
  temperature: string | null; intent: string | null; lead_score: number | null;
  stage: string | null; status: string | null; deal_value: number | null; created_at: string;
  customers: Customer | Customer[] | null;
};

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
  const warm = leads.filter(l => String(l.temperature).toUpperCase() === "WARM").length;
  const open = leads.filter(l => String(l.status).toUpperCase() === "OPEN").length;
  const value = leads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

  return (
    <main className="min-h-screen bg-[#050b16] text-white">
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-30 rounded-2xl border border-white/10 bg-[#091325]/90 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/protected" className="flex shrink-0 items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-cyan-400 to-violet-500 font-black shadow-lg shadow-blue-500/20">L</span>
                <div className="hidden sm:block"><div className="font-bold">LeadFlow</div><div className="text-[10px] uppercase tracking-[.2em] text-slate-500">AI revenue OS</div></div>
              </Link>
              <span className="hidden h-7 w-px bg-white/10 sm:block" />
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{business?.name ?? "Workspace"}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">Lead pipeline</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/protected" className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[.08] active:scale-[.98]">Dashboard</Link>
              <Link href="/auth/logout" className="inline-flex min-h-10 items-center rounded-xl border border-white/10 px-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[.06] hover:text-white active:scale-[.98]">Log out</Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Total leads" value={leads.length} detail="All active records" />
          <Summary label="Hot leads" value={hot} detail="Highest priority" accent="text-red-300" />
          <Summary label="Open" value={open} detail="Still in progress" accent="text-cyan-300" />
          <Summary label="Pipeline value" value={`₹${value.toLocaleString("en-IN")}`} detail={`${warm} warm leads`} accent="text-violet-300" />
        </section>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a1426]/90 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-300">{business?.industry ?? "CRM"}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Lead pipeline</h1><p className="mt-1 text-sm text-slate-500">Open any lead to see its complete customer context and next action.</p></div>
            <Link href="/protected" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 active:translate-y-0">← Back to command center</Link>
          </div>

          {leads.length === 0 ? (
            <div className="px-6 py-20 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/10 bg-blue-400/5 text-2xl text-blue-300">✦</div><h2 className="mt-5 font-semibold">No leads yet</h2><p className="mt-2 text-sm text-slate-500">New enquiries will appear here automatically.</p></div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px]"><thead className="border-b border-white/10 bg-white/[.02]"><tr>{["Customer","Interest","Score","Temperature","Stage","Status","Created"].map(h => <th key={h} className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{h}</th>)}</tr></thead><tbody>{leads.map(lead => <LeadRow key={lead.id} lead={lead} />)}</tbody></table></div>
              <div className="grid gap-3 p-3 md:hidden">{leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}</div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function getCustomer(lead: Lead) { return Array.isArray(lead.customers) ? lead.customers[0] : lead.customers; }
function tempClass(t: string | null) { const v = String(t ?? "").toUpperCase(); return v === "HOT" ? "border-red-400/15 bg-red-500/10 text-red-300" : v === "WARM" ? "border-amber-400/15 bg-amber-500/10 text-amber-300" : v === "COLD" ? "border-cyan-400/15 bg-cyan-500/10 text-cyan-300" : "border-white/10 bg-white/5 text-slate-400"; }
function LeadRow({ lead }: { lead: Lead }) { const c = getCustomer(lead); return <tr className="border-b border-white/5 transition hover:bg-white/[.025]"><td className="px-6 py-4"><Link href={`/leads/${lead.id}`} className="font-semibold hover:text-cyan-300">{c?.full_name || "Unknown customer"}</Link><p className="mt-1 text-xs text-slate-500">{c?.email || c?.phone || "No contact"}</p></td><td className="px-6 py-4 text-sm text-slate-300">{lead.product_interest || lead.category || "General enquiry"}</td><td className="px-6 py-4 font-bold">{lead.lead_score ?? 0}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tempClass(lead.temperature)}`}>{String(lead.temperature ?? "UNKNOWN").toUpperCase()}</span></td><td className="px-6 py-4"><span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-xs text-slate-300">{lead.stage || "NEW"}</span></td><td className="px-6 py-4"><span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-xs text-slate-300">{lead.status || "OPEN"}</span></td><td className="px-6 py-4 text-sm text-slate-500">{formatDate(lead.created_at)}</td></tr>; }
function LeadCard({ lead }: { lead: Lead }) { const c = getCustomer(lead); return <Link href={`/leads/${lead.id}`} className="block rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-white/[.045] active:scale-[.99]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{c?.full_name || "Unknown customer"}</p><p className="mt-1 truncate text-xs text-slate-500">{c?.email || c?.phone || "No contact"}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${tempClass(lead.temperature)}`}>{String(lead.temperature ?? "UNKNOWN").toUpperCase()}</span></div><p className="mt-4 truncate text-sm text-slate-300">{lead.product_interest || lead.category || "General enquiry"}</p><div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3"><span className="text-xs text-slate-500">Score <b className="text-slate-200">{lead.lead_score ?? 0}</b></span><span className="text-xs font-semibold text-cyan-300">Open lead →</span></div></Link>; }
function Summary({ label, value, detail, accent = "text-white" }: { label: string; value: number | string; detail: string; accent?: string }) { return <div className="rounded-2xl border border-white/10 bg-[#0a1426] p-5 shadow-lg shadow-black/10"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black tracking-tight ${accent}`}>{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>; }
function formatDate(v: string) { try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "Unknown"; } }
