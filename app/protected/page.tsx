import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bot, Flame, MessageSquare, Target, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createClient } from "@/lib/supabase/server";

type Customer = { id: string; full_name: string | null; email: string | null; phone: string | null };
type Lead = {
  id: string;
  customer_id: string;
  enquiry: string | null;
  product_interest: string | null;
  source: string | null;
  temperature: string | null;
  intent: string | null;
  lead_score: number | null;
  purchase_probability: number | null;
  recommended_next_action: string | null;
  stage: string;
  status: string;
  deal_value: number | null;
  created_at: string;
  customers: Customer | Customer[] | null;
};
type Activity = { id: string; actor: string; type: string; detail: Record<string, unknown>; created_at: string };

export default function ProtectedPage() {
  return <WorkspaceShell title="COMMAND CENTER" eyebrow="00 / REVENUE CONTROL"><Dashboard /></WorkspaceShell>;
}

async function Dashboard() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("users").select("email, full_name, role, business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/auth/login");
  const { data: business } = await supabase.from("businesses").select("name, industry").eq("id", profile.business_id).maybeSingle();

  const [{ data: leadsData }, { data: activitiesData }, { count: customerCount }] = await Promise.all([
    supabase.from("leads").select("id, customer_id, enquiry, product_interest, source, temperature, intent, lead_score, purchase_probability, recommended_next_action, stage, status, deal_value, created_at, customers (id, full_name, email, phone)").eq("business_id", profile.business_id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("activities").select("id, actor, type, detail, created_at").eq("business_id", profile.business_id).order("created_at", { ascending: false }).limit(6),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", profile.business_id).is("deleted_at", null),
  ]);

  const leads = (leadsData ?? []) as Lead[];
  const activities = (activitiesData ?? []) as Activity[];
  const hot = leads.filter((l) => String(l.temperature).toUpperCase() === "HOT");
  const warm = leads.filter((l) => String(l.temperature).toUpperCase() === "WARM");
  const open = leads.filter((l) => String(l.status).toUpperCase() === "OPEN");
  const highIntent = leads.filter((l) => (Number(l.purchase_probability) || 0) >= 70 || String(l.intent).toLowerCase().includes("high"));
  const scored = leads.filter((l) => typeof l.lead_score === "number");
  const avgScore = scored.length ? Math.round(scored.reduce((n, l) => n + (l.lead_score ?? 0), 0) / scored.length) : 0;
  const pipeline = leads.reduce((n, l) => n + (Number(l.deal_value) || 0), 0);
  const hotPipeline = hot.reduce((n, l) => n + (Number(l.deal_value) || 0), 0);
  const firstName = (profile.full_name || profile.email || "there").split(/\s+/)[0];
  const sourceCounts = Object.entries(leads.reduce<Record<string, number>>((acc, lead) => { const key = lead.source || "Other"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxSource = Math.max(...sourceCounts.map(([, n]) => n), 1);

  return <div className="pb-12">
    <div className="mb-8 grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="text-sm text-white/35">Good afternoon, {firstName}.</p>
        <h2 className="mt-2 max-w-3xl text-4xl font-black uppercase leading-[.9] tracking-[-.06em] sm:text-6xl">Know what needs<br /><span className="customer-gradient-text">revenue now.</span></h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">LeadFlow turns your live enquiries into priorities, conversations and next actions — without making you hunt through a CRM.</p>
      </div>
      <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4 lg:grid-cols-2">
        <QuickStat label="LEADS" value={leads.length} />
        <QuickStat label="CUSTOMERS" value={customerCount ?? 0} />
        <QuickStat label="AVG SCORE" value={avgScore} />
        <QuickStat label="PIPELINE" value={formatCurrency(pipeline)} />
      </div>
    </div>

    <div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
      <Metric icon={<Flame size={17} />} label="HOT OPPORTUNITIES" value={hot.length} detail={`${formatCurrency(hotPipeline)} potential value`} />
      <Metric icon={<Target size={17} />} label="HIGH INTENT" value={highIntent.length} detail="AI-qualified buying signals" />
      <Metric icon={<Bot size={17} />} label="OPEN WORK" value={open.length} detail="Leads still needing a next move" />
    </div>

    <div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_.65fr]">
      <section className="border border-white/10 bg-[#080808]">
        <div className="flex items-end justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div><p className="leadflow-kicker">AI PRIORITY QUEUE</p><h3 className="mt-2 text-2xl font-black uppercase tracking-[-.04em]">What needs attention</h3></div>
          <Link href="/leads" className="leadflow-button">All leads <ArrowUpRight size={13} /></Link>
        </div>
        <div>{leads.slice(0, 5).map((lead) => { const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers; return <Link href={`/leads/${lead.id}`} key={lead.id} className="group grid gap-3 border-b border-white/[.08] p-5 transition hover:bg-white/[.025] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"><div className="min-w-0"><div className="flex items-center gap-3"><span className="truncate font-semibold text-white/85 group-hover:text-white">{customer?.full_name || "Unknown customer"}</span><Temperature temperature={lead.temperature} /></div><p className="mt-2 line-clamp-1 text-xs text-white/35">{lead.enquiry || lead.product_interest || "New enquiry received"}</p><p className="mt-2 text-[10px] uppercase tracking-[.16em] text-white/20">{lead.source || "Unknown source"} · {lead.stage || "NEW"}</p></div><div className="flex items-center justify-between gap-6 sm:block sm:text-right"><p className="text-2xl font-black text-[#b7ff58]">{lead.lead_score ?? 0}</p><p className="mt-1 max-w-[180px] text-[10px] text-white/35 sm:ml-auto">{lead.recommended_next_action || "Review and decide next move"}</p></div></Link>; })}</div>
        {!leads.length && <Empty title="Your revenue queue is empty" text="New enquiries will appear here as soon as LeadFlow receives them." href="/leads" action="Open leads" />}
      </section>

      <div className="space-y-8">
        <section className="border border-white/10 bg-[#080808] p-5 sm:p-6"><p className="leadflow-kicker">LEAD SOURCES</p><h3 className="mt-2 text-xl font-black uppercase tracking-[-.04em]">Where demand comes from</h3><div className="mt-6 space-y-5">{sourceCounts.map(([source, count]) => <div key={source}><div className="mb-2 flex justify-between text-xs"><span className="text-white/55">{source}</span><span className="font-bold text-white/80">{count}</span></div><div className="h-1 bg-white/10"><div className="h-full customer-gradient" style={{ width: `${Math.round((count / maxSource) * 100)}%` }} /></div></div>)}{!sourceCounts.length && <p className="text-xs text-white/30">No source data yet.</p>}</div></section>

        <section className="border border-white/10 bg-[#080808] p-5 sm:p-6"><div className="flex items-center gap-3"><MessageSquare size={17} className="text-[#b7ff58]" /><div><p className="leadflow-kicker">RECENT SIGNAL</p><h3 className="mt-1 text-xl font-black uppercase tracking-[-.04em]">Activity</h3></div></div><div className="mt-5 space-y-4">{activities.slice(0, 4).map((activity) => <div key={activity.id} className="border-l border-[#b7ff58]/30 pl-4"><p className="text-xs font-semibold text-white/70">{prettyActivity(activity)}</p><p className="mt-1 text-[10px] text-white/25">{formatDate(activity.created_at)} · {activity.actor}</p></div>)}{!activities.length && <p className="text-xs text-white/30">AI and team activity will appear here.</p>}</div></section>
      </div>
    </div>

    <section className="mt-8 border border-white/10 bg-[#f4f0e7] p-6 text-black sm:p-8"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-black/45">{business?.name || "Your workspace"} · {business?.industry || "Revenue operations"}</p><h3 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-.05em]">Your next move is the product.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Connect the lead source, let the scoring workflow run, then work the priority queue. LeadFlow should tell the team what matters before they ask.</p></div><div className="flex flex-wrap gap-2"><Link href="/leads" className="leadflow-button leadflow-button-primary">Work leads <ArrowUpRight size={13} /></Link><Link href="/ai-agents" className="leadflow-button border-black/20 text-black hover:border-black">Open AI team <Bot size={13} /></Link></div></div></section>
  </div>;
}

function QuickStat({ label, value }: { label: string; value: string | number }) { return <div className="bg-[#080808] p-4 sm:p-5"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p><p className="mt-2 text-xl font-black tracking-[-.04em] text-white">{value}</p></div>; }
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) { return <div className="bg-[#080808] p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p><span className="text-[#b7ff58]">{icon}</span></div><p className="mt-5 text-4xl font-black tracking-[-.05em]">{value}</p><p className="mt-1 text-[10px] text-white/30">{detail}</p></div>; }
function Temperature({ temperature }: { temperature: string | null }) { const t = String(temperature || "NEW").toUpperCase(); const cls = t === "HOT" ? "border-red-400/25 text-red-300" : t === "WARM" ? "border-amber-300/25 text-amber-200" : t === "COLD" ? "border-cyan-300/25 text-cyan-200" : "border-white/15 text-white/35"; return <span className={`border px-2 py-1 text-[8px] font-bold uppercase tracking-[.15em] ${cls}`}>{t}</span>; }
function Empty({ title, text, href, action }: { title: string; text: string; href: string; action: string }) { return <div className="p-10 text-center"><Users size={22} className="mx-auto text-white/20" /><h4 className="mt-4 font-black uppercase tracking-[-.02em]">{title}</h4><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/30">{text}</p><Link href={href} className="leadflow-button mt-5">{action} <ArrowUpRight size={13} /></Link></div>; }
function prettyActivity(activity: Activity) { const detail = Object.values(activity.detail || {}).find((value) => typeof value === "string"); return detail ? `${activity.type.replace(/_/g, " ")} · ${detail}` : activity.type.replace(/_/g, " "); }
function formatCurrency(value: number) { return `₹${Math.round(value).toLocaleString("en-IN")}`; }
function formatDate(value: string) { try { return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return "recently"; } }
