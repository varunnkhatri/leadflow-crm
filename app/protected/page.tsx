import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

type Lead = {
  id: string;
  business_id: string;
  customer_id: string;
  enquiry: string | null;
  product_interest: string | null;
  source: string | null;
  campaign: string | null;
  landing_page: string | null;
  temperature: string | null;
  intent: string | null;
  category: string | null;
  lead_score: number | null;
  confidence: number | null;
  urgency: string | null;
  purchase_probability: number | null;
  requirements: string | null;
  timeline: string | null;
  recommended_next_action: string | null;
  human_review_required: boolean;
  stage: string;
  status: string;
  deal_value: number | null;
  created_at: string;
  updated_at: string;
  customers: Customer | Customer[] | null;
};

async function ProtectedPageContent() {
  await connection();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: users, error: profileError } = await supabase
    .from("users")
    .select("id, email, full_name, role, business_id")
    .eq("id", user.id)
    .limit(1);

  const profile = users?.[0] ?? null;
  if (profileError || !profile) {
    return <ErrorState title="Unable to load your account" message="Your authenticated account does not have a CRM user record." error={profileError?.message} />;
  }
  if (!profile.business_id) {
    return <ErrorState title="No business assigned" message="Your CRM user does not have a business assigned." />;
  }

  const businessId = profile.business_id;
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, industry, website")
    .eq("id", businessId)
    .limit(1)
    .maybeSingle();

  if (businessError || !business) {
    return <ErrorState title="Unable to load business" message="Your account is connected, but the business could not be loaded." error={businessError?.message} />;
  }

  const { data: leadsData, error: leadsError } = await supabase
    .from("leads")
    .select(`
      id, business_id, customer_id, enquiry, product_interest, source, campaign,
      landing_page, temperature, intent, category, lead_score, confidence, urgency,
      purchase_probability, requirements, timeline, recommended_next_action,
      human_review_required, stage, status, deal_value, created_at, updated_at,
      customers (id, full_name, phone, email)
    `)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const leads = (leadsData ?? []) as Lead[];
  const totalLeads = leads.length;
  const hotLeads = leads.filter((lead) => String(lead.temperature ?? "").toUpperCase() === "HOT").length;
  const warmLeads = leads.filter((lead) => String(lead.temperature ?? "").toUpperCase() === "WARM").length;
  const coldLeads = leads.filter((lead) => String(lead.temperature ?? "").toUpperCase() === "COLD").length;
  const openLeads = leads.filter((lead) => String(lead.status ?? "").toUpperCase() === "OPEN").length;
  const scoredLeads = leads.filter((lead) => typeof lead.lead_score === "number");
  const averageScore = scoredLeads.length ? Math.round(scoredLeads.reduce((sum, lead) => sum + (lead.lead_score ?? 0), 0) / scoredLeads.length) : 0;
  const highIntent = leads.filter((lead) => (lead.purchase_probability ?? 0) >= 70 || String(lead.intent ?? "").toLowerCase().includes("high")).length;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050b16] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute right-[-12rem] top-[18rem] h-[40rem] w-[40rem] rounded-full bg-cyan-400/[0.07] blur-3xl" />
        <div className="absolute bottom-[-18rem] left-1/3 h-[36rem] w-[36rem] rounded-full bg-violet-600/[0.06] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1550px] px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-30 rounded-2xl border border-white/10 bg-[#091325]/85 px-5 py-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-cyan-400 to-violet-500 text-lg font-black shadow-lg shadow-blue-500/25">L</span>
                <div><div className="text-base font-bold tracking-tight">LeadFlow</div><div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">AI revenue OS</div></div>
              </Link>
              <div className="hidden h-8 w-px bg-white/10 sm:block" />
              <div className="hidden sm:block"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Workspace</p><p className="font-semibold text-slate-100">{business.name}</p></div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="hidden items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 sm:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /><span className="text-xs font-semibold text-emerald-300">Live workspace</span></div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold">{(profile.full_name || profile.email || "U").slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0"><p className="max-w-[150px] truncate text-sm font-semibold">{profile.full_name || profile.email}</p><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{profile.role || "USER"}</p></div>
              </div>
              <Link href="/auth/login" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white">Log out</Link>
            </div>
          </div>
        </header>

        <section className="mt-9 grid gap-6 xl:grid-cols-[1.55fr_0.85fr] xl:items-stretch">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0d1b35] via-[#091529] to-[#07101f] p-7 shadow-2xl shadow-black/20 sm:p-9">
            <div className="absolute right-[-5rem] top-[-6rem] h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="absolute bottom-[-6rem] right-1/4 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-blue-300/15 bg-blue-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">AI revenue command center</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">{business.industry || "Business"}</span></div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">Turn your leads into <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">revenue.</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">One intelligent workspace for every enquiry, every opportunity and every next action. Your pipeline is already being prioritized for you.</p>
              <div className="mt-7 flex flex-wrap gap-3"><Link href="/leads" className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-blue-500/30">Open lead pipeline →</Link><Link href="/" className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">View workspace</Link></div>
              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
                <MiniStat label="Avg. score" value={averageScore || "—"} />
                <MiniStat label="High intent" value={highIntent} />
                <MiniStat label="Active" value={openLeads} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a1426]/90 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pipeline pulse</p><h2 className="mt-1 text-lg font-bold">Lead temperature</h2></div><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live</span></div>
            <div className="mt-7 flex items-center gap-6"><Donut hot={hotLeads} warm={warmLeads} cold={coldLeads} total={totalLeads} /><div className="flex-1 space-y-4"><Legend label="Hot" value={hotLeads} tone="hot" total={totalLeads} /><Legend label="Warm" value={warmLeads} tone="warm" total={totalLeads} /><Legend label="Cold" value={coldLeads} tone="cold" total={totalLeads} /></div></div>
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">Priority signal</span><span className="text-xs font-bold text-cyan-300">{highIntent ? `${highIntent} high-intent` : "No high-intent leads yet"}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-400" style={{ width: `${totalLeads ? Math.min(100, Math.max(4, Math.round((highIntent / totalLeads) * 100))) : 4}%` }} /></div></div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total leads" value={totalLeads} helper="All active records" />
          <MetricCard label="Hot" value={hotLeads} helper="Highest priority" tone="hot" />
          <MetricCard label="Warm" value={warmLeads} helper="Worth nurturing" tone="warm" />
          <MetricCard label="Cold" value={coldLeads} helper="Lower intent" tone="cold" />
          <MetricCard label="Open" value={openLeads} helper="Still in progress" tone="open" />
        </section>

        {leadsError && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5"><p className="font-semibold text-red-300">Unable to load leads</p><p className="mt-1 text-sm text-red-300/80">{leadsError.message}</p></div>}

        <section className="mt-7 grid gap-6 lg:grid-cols-[1.65fr_0.75fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a1426]/90 shadow-xl shadow-black/15">
            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><h2 className="text-lg font-bold">Recent leads</h2></div><p className="mt-1 text-sm text-slate-500">Newest customer enquiries, ranked for quick action.</p></div><Link href="/leads" className="text-sm font-semibold text-blue-300 hover:text-blue-200">See all leads →</Link></div>
            {leads.length === 0 ? <EmptyLeads /> : <div className="overflow-x-auto"><table className="w-full min-w-[980px]"><thead className="bg-white/[0.02]"><tr className="border-b border-white/10"><th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Customer</th><th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Interest</th><th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Score</th><th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Temperature</th><th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Stage</th><th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Status</th><th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Created</th></tr></thead><tbody>{leads.map((lead) => { const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers; return <tr key={lead.id} className="border-b border-white/5 transition hover:bg-white/[0.025]"><td className="px-6 py-4"><Link href={`/leads/${lead.id}`} className="font-semibold text-slate-100 hover:text-cyan-300">{customer?.full_name || "Unknown customer"}</Link><p className="mt-1 text-xs text-slate-500">{customer?.email || customer?.phone || "No contact information"}</p></td><td className="px-6 py-4"><p className="max-w-[240px] truncate font-medium text-slate-200">{lead.product_interest || lead.category || "General enquiry"}</p>{lead.intent && <p className="mt-1 text-xs text-slate-500">{lead.intent}</p>}</td><td className="px-6 py-4"><Score value={lead.lead_score ?? 0} /></td><td className="px-6 py-4"><TemperatureBadge temperature={lead.temperature} /></td><td className="px-6 py-4"><Pill value={lead.stage || "NEW"} /></td><td className="px-6 py-4"><Pill value={lead.status || "OPEN"} /></td><td className="px-6 py-4 text-sm text-slate-500">{formatDate(lead.created_at)}</td></tr>; })}</tbody></table></div>}
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-[#0d1930] to-[#081120] p-6 shadow-xl shadow-black/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">Why LeadFlow</p>
            <h2 className="mt-2 text-xl font-bold">Less admin. More selling.</h2>
            <div className="mt-6 space-y-5"><Feature icon="01" title="Capture" text="Keep every enquiry in one structured customer record." /><Feature icon="02" title="Prioritize" text="Surface the leads with the strongest buying signals." /><Feature icon="03" title="Act" text="Open a lead and immediately see its context and next step." /></div>
            <div className="mt-7 rounded-2xl border border-violet-400/10 bg-violet-400/[0.05] p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">✦</span><div><p className="text-sm font-semibold">AI-assisted workflow</p><p className="mt-0.5 text-xs text-slate-500">Built to keep your team focused.</p></div></div></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-100">{value}</p></div>; }

function MetricCard({ label, value, helper, tone = "default" }: { label: string; value: number; helper: string; tone?: "default" | "hot" | "warm" | "cold" | "open" }) {
  const styles = { default: "border-white/10 bg-[#0a1426]", hot: "border-red-400/15 bg-red-500/[0.06]", warm: "border-amber-400/15 bg-amber-500/[0.06]", cold: "border-cyan-400/15 bg-cyan-500/[0.055]", open: "border-violet-400/15 bg-violet-500/[0.06]" };
  const dots = { default: "bg-blue-400", hot: "bg-red-400", warm: "bg-amber-400", cold: "bg-cyan-400", open: "bg-violet-400" };
  return <div className={`group rounded-2xl border p-5 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-2xl ${styles[tone]}`}><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-400">{label}</p><span className={`h-2.5 w-2.5 rounded-full ${dots[tone]} shadow-[0_0_16px_currentColor]`} /></div><p className="mt-4 text-4xl font-black tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-500">{helper}</p></div>;
}

function Donut({ hot, warm, cold, total }: { hot: number; warm: number; cold: number; total: number }) {
  const safe = total || 1;
  const hotPct = (hot / safe) * 100;
  const warmPct = (warm / safe) * 100;
  const hotEnd = 25 + hotPct * 3.6;
  const warmEnd = hotEnd + warmPct * 3.6;
  return <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(from -90deg, #f87171 0 ${hotEnd}deg, #fbbf24 ${hotEnd}deg ${warmEnd}deg, #22d3ee ${warmEnd}deg 385deg)` }}><div className="absolute inset-[11px] flex flex-col items-center justify-center rounded-full bg-[#0a1426] ring-1 ring-white/5"><span className="text-3xl font-black">{total}</span><span className="text-[10px] uppercase tracking-wider text-slate-500">leads</span></div></div>;
}

function Legend({ label, value, tone, total }: { label: string; value: number; tone: "hot" | "warm" | "cold"; total: number }) {
  const classes = { hot: "bg-red-400", warm: "bg-amber-400", cold: "bg-cyan-400" };
  const pct = total ? Math.round((value / total) * 100) : 0;
  return <div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-400"><span className={`h-2 w-2 rounded-full ${classes[tone]}`} />{label}</span><span className="font-bold text-slate-200">{value} <span className="font-normal text-slate-600">{pct}%</span></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${classes[tone]}`} style={{ width: `${Math.max(value ? 4 : 0, pct)}%` }} /></div></div>;
}

function Score({ value }: { value: number }) { return <div className="flex items-center gap-2"><span className="font-bold text-slate-100">{value}</span><span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/5"><span className="block h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span></div>; }

function TemperatureBadge({ temperature }: { temperature: string | null }) {
  const value = String(temperature ?? "").toUpperCase();
  const map = { HOT: "border-red-400/15 bg-red-500/10 text-red-300", WARM: "border-amber-400/15 bg-amber-500/10 text-amber-300", COLD: "border-cyan-400/15 bg-cyan-500/10 text-cyan-300" } as const;
  const cls = map[value as keyof typeof map] ?? "border-white/10 bg-white/5 text-slate-400";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>{value || "UNKNOWN"}</span>;
}

function Pill({ value }: { value: string }) { return <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300">{value.replaceAll("_", " ")}</span>; }

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[10px] font-bold text-blue-300">{icon}</span><div><p className="text-sm font-semibold text-slate-200">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div></div>; }

function EmptyLeads() { return <div className="px-6 py-20 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/10 bg-blue-400/5 text-2xl text-blue-300">✦</div><p className="mt-5 text-base font-semibold text-slate-200">Your pipeline is ready.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">New enquiries will appear here automatically once they reach your CRM.</p><Link href="/leads" className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]">Explore pipeline</Link></div>; }

function ErrorState({ title, message, error }: { title: string; message: string; error?: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#050b16] px-6 text-white"><div className="w-full max-w-lg rounded-2xl border border-red-400/15 bg-red-500/[0.04] p-7"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-400">{message}</p>{error && <p className="mt-4 rounded-xl border border-red-400/10 bg-red-500/5 p-4 text-sm text-red-300">{error}</p>}</div></main>; }

function formatDate(value: string) { try { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "Unknown"; } }

export default function ProtectedPage() { return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#050b16] text-white"><p className="text-slate-400">Loading CRM...</p></main>}><ProtectedPageContent /></Suspense>; }
