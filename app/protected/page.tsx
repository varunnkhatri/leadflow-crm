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

export default function ProtectedPage() {
  return <Suspense fallback={<LoadingState />}><ProtectedPageContent /></Suspense>;
}

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
  const scored = leads.filter((lead) => typeof lead.lead_score === "number");
  const averageScore = scored.length ? Math.round(scored.reduce((sum, lead) => sum + (lead.lead_score ?? 0), 0) / scored.length) : 0;
  const highIntent = leads.filter((lead) => (lead.purchase_probability ?? 0) >= 70 || String(lead.intent ?? "").toLowerCase().includes("high")).length;
  const pipelineValue = leads.reduce((sum, lead) => sum + (lead.deal_value ?? 0), 0);
  const hotValue = leads.filter((lead) => String(lead.temperature ?? "").toUpperCase() === "HOT").reduce((sum, lead) => sum + (lead.deal_value ?? 0), 0);
  const sources = Object.entries(leads.reduce<Record<string, number>>((acc, lead) => {
    const source = lead.source || "Other";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSource = Math.max(...sources.map(([, count]) => count), 1);
  const recentLeads = leads.slice(0, 6);
  const priorityLeads = [...leads].sort((a, b) => ((b.lead_score ?? 0) - (a.lead_score ?? 0))).slice(0, 3);
  const firstName = (profile.full_name || profile.email || "there").split(/\s+/)[0];
  const avatarLetter = (profile.full_name || profile.email || "U").slice(0, 1).toUpperCase();

  return (
    <main className="min-h-screen bg-[#030712] text-white selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-56 -top-56 h-[42rem] w-[42rem] rounded-full bg-violet-600/[0.10] blur-[120px]" />
        <div className="absolute right-[-18rem] top-[20rem] h-[40rem] w-[40rem] rounded-full bg-cyan-500/[0.07] blur-[130px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="hidden w-[238px] shrink-0 border-r border-white/[0.07] bg-[#050914]/90 px-4 py-5 lg:flex lg:flex-col">
          <Link href="/protected" className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-lg shadow-violet-500/20"><span className="text-lg font-black">L</span></div>
            <div><p className="text-[17px] font-black tracking-tight">LeadFlow <span className="text-violet-400">AI</span></p><p className="text-[9px] uppercase tracking-[0.25em] text-slate-600">Revenue OS</p></div>
          </Link>

          <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-sm font-bold">{business.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{business.name}</p><p className="truncate text-[10px] text-slate-500">Workspace</p></div><span className="text-slate-600">⌄</span></div>
          </div>

          <nav className="mt-7 space-y-1.5">
            <NavItem active icon="⌂" label="Dashboard" href="/protected" />
            <NavItem icon="◈" label="Leads" href="/leads" />
            <NavItem icon="◇" label="Pipeline" />
            <NavItem icon="♙" label="Customers" />
            <NavItem icon="◌" label="Conversations" />
            <NavItem icon="✓" label="Tasks" />
            <NavItem icon="✦" label="AI Agents" badge="3" />
            <NavItem icon="⌁" label="Campaigns" />
            <NavItem icon="▥" label="Analytics" />
            <NavItem icon="⌘" label="Integrations" />
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.12] to-blue-500/[0.04] p-4">
              <div className="flex items-center gap-2 text-violet-300"><span>✦</span><span className="text-xs font-bold">AI is working</span></div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Your pipeline is being prioritized automatically.</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold">{avatarLetter}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{profile.full_name || profile.email}</p><p className="text-[10px] uppercase tracking-wider text-slate-600">{profile.role || "User"}</p></div><span className="text-slate-600">⌄</span></div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="lg:hidden"><p className="text-lg font-black">LeadFlow <span className="text-violet-400">AI</span></p></div>
            <div className="hidden sm:block"><p className="text-[11px] uppercase tracking-[0.2em] text-slate-600">Workspace</p><p className="mt-1 text-sm font-semibold text-slate-300">{business.name}</p></div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <div className="hidden h-10 w-[310px] items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 md:flex"><span className="text-slate-600">⌕</span><span className="text-xs text-slate-600">Search leads, customers, tasks...</span><kbd className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-600">⌘ K</kbd></div>
              <button className="h-10 rounded-xl border border-violet-400/15 bg-violet-500/[0.08] px-4 text-xs font-semibold text-violet-200">✦ Ask AI</button>
              <button className="relative h-10 w-10 rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-400">♧<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400" /></button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-amber-200 via-orange-400 to-violet-500 text-xs font-black text-slate-950">{avatarLetter}</div>
            </div>
          </header>

          <section className="pt-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div><p className="text-sm font-medium text-slate-500">Wednesday, August 26</p><h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Good afternoon, {firstName} <span className="inline-block">👋</span></h1><p className="mt-2 text-sm text-slate-500">Here&apos;s what&apos;s happening with <span className="font-semibold text-violet-300">{business.name}</span> today.</p></div>
              <div className="flex items-center gap-2"><span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-3 py-2 text-[11px] font-semibold text-emerald-300">● Live data</span><span className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-slate-400">Today · Aug 26</span></div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard label="Total leads" value={totalLeads} change="Live" icon="♙" tone="violet" />
              <StatCard label="Hot leads" value={hotLeads} change={`${hotLeads ? Math.round((hotLeads / Math.max(totalLeads, 1)) * 100) : 0}% of pipeline`} icon="♨" tone="red" />
              <StatCard label="Warm leads" value={warmLeads} change="Nurture" icon="✦" tone="amber" />
              <StatCard label="Cold leads" value={coldLeads} change="Lower intent" icon="✧" tone="blue" />
              <StatCard label="Open deals" value={openLeads} change="In progress" icon="◎" tone="green" />
              <StatCard label="Pipeline value" value={formatCurrency(pipelineValue)} change={hotValue ? `${formatCurrency(hotValue)} hot` : "No deal value yet"} icon="▣" tone="violet" />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.55fr_0.85fr]">
              <BentoCard title="Lead temperature" subtitle="Current distribution" className="min-h-[315px]">
                <div className="mt-5 flex items-center gap-5">
                  <TemperatureDonut hot={hotLeads} warm={warmLeads} cold={coldLeads} total={totalLeads} />
                  <div className="min-w-0 flex-1 space-y-4"><TempRow label="Hot" value={hotLeads} total={totalLeads} color="red" /><TempRow label="Warm" value={warmLeads} total={totalLeads} color="amber" /><TempRow label="Cold" value={coldLeads} total={totalLeads} color="blue" /><TempRow label="New / other" value={Math.max(0, totalLeads - hotLeads - warmLeads - coldLeads)} total={totalLeads} color="slate" /></div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Updated from your CRM data</div>
              </BentoCard>

              <BentoCard title="AI pipeline overview" subtitle="Where opportunities are moving" action="View pipeline">
                <div className="mt-5 grid grid-cols-5 gap-2 text-center"><PipelineStage label="New" value={Math.max(0, totalLeads - openLeads)} /><PipelineStage label="Contacted" value={Math.min(openLeads, Math.round(openLeads * 0.45))} /><PipelineStage label="Qualified" value={highIntent} accent /><PipelineStage label="Proposal" value={Math.min(highIntent, Math.round(highIntent * 0.55))} /><PipelineStage label="Won" value={0} /></div>
                <div className="relative mt-3 h-28 overflow-hidden rounded-xl border border-white/[0.05] bg-gradient-to-b from-violet-500/[0.07] to-transparent">
                  <div className="absolute inset-x-0 bottom-4 h-px bg-white/[0.06]" /><div className="absolute inset-x-0 bottom-9 h-px bg-white/[0.04]" />
                  <svg viewBox="0 0 800 150" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><defs><linearGradient id="pipelineLine" x1="0" x2="1"><stop offset="0" stopColor="#8b5cf6"/><stop offset="0.55" stopColor="#22d3ee"/><stop offset="1" stopColor="#34d399"/></linearGradient><linearGradient id="pipelineFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.28"/><stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs><path d="M0 45 C100 50 120 30 200 60 S320 55 400 72 S520 52 600 78 S700 68 800 100 L800 150 L0 150Z" fill="url(#pipelineFill)"/><path d="M0 45 C100 50 120 30 200 60 S320 55 400 72 S520 52 600 78 S700 68 800 100" fill="none" stroke="url(#pipelineLine)" strokeWidth="3" strokeLinecap="round"/><circle cx="200" cy="60" r="5" fill="#8b5cf6"/><circle cx="400" cy="72" r="5" fill="#22d3ee"/><circle cx="600" cy="78" r="5" fill="#38bdf8"/><circle cx="800" cy="100" r="5" fill="#34d399"/></svg>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Avg. lead score</p><p className="mt-1 text-xl font-black">{averageScore || "—"}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wider text-slate-600">High intent</p><p className="mt-1 text-xl font-black text-cyan-300">{highIntent}</p></div></div>
              </BentoCard>

              <BentoCard title="AI assistant" subtitle="Beta" accent="violet" className="min-h-[315px]">
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-violet-400/10 bg-violet-500/[0.06] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">✦</div><div><p className="text-xs font-semibold">{priorityLeads.length ? `I found ${highIntent || priorityLeads.length} opportunities worth attention.` : "I’m ready for your first leads."}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Based on current lead score, intent and temperature.</p></div></div>
                <div className="mt-4 space-y-2.5">{priorityLeads.map((lead, index) => <InsightRow key={lead.id} lead={lead} index={index} />)}</div>
                {!priorityLeads.length && <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-600">New opportunities will appear here.</div>}
              </BentoCard>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.9fr_0.85fr]">
              <BentoCard title="Recent leads" subtitle="Latest customer enquiries" action="View all" className="min-h-[365px]">
                {recentLeads.length ? <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06]"><div className="grid grid-cols-[1.5fr_0.9fr_0.55fr_0.7fr] border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600"><span>Lead</span><span>Source</span><span>Score</span><span>Status</span></div>{recentLeads.map((lead) => { const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers; return <div key={lead.id} className="grid grid-cols-[1.5fr_0.9fr_0.55fr_0.7fr] items-center border-b border-white/[0.05] px-4 py-3 last:border-0 hover:bg-white/[0.02]"><Link href={`/leads/${lead.id}`} className="flex min-w-0 items-center gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/80 to-blue-500/80 text-[10px] font-bold">{(customer?.full_name || "?").slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-200">{customer?.full_name || "Unknown customer"}</span><span className="block truncate text-[9px] text-slate-600">{customer?.email || customer?.phone || "No contact"}</span></span></Link><span className="truncate text-[10px] text-slate-500">{lead.source || "Direct"}</span><span className="text-xs font-bold">{lead.lead_score ?? "—"}</span><TemperatureBadge temperature={lead.temperature} /></div>; })}</div> : <EmptyLeads />}
              </BentoCard>

              <BentoCard title="Leads by source" subtitle="Where enquiries come from" className="min-h-[365px]">
                <div className="mt-5 space-y-5">{sources.length ? sources.map(([source, count], index) => <SourceBar key={source} label={source} count={count} max={maxSource} index={index} />) : <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-600">No source data yet.</div>}</div>
                <div className="mt-6 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] p-3"><p className="text-[10px] font-semibold text-cyan-300">Tip</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Use source performance to decide where your next campaign should focus.</p></div>
              </BentoCard>

              <BentoCard title="Next actions" subtitle="Keep momentum moving" action="View all" className="min-h-[365px]">
                <div className="mt-4 space-y-2.5">{priorityLeads.length ? priorityLeads.map((lead, index) => { const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers; return <div key={lead.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${index === 0 ? "border-red-400/30 text-red-300" : "border-white/10 text-slate-600"}`}>{index === 0 ? "!" : "○"}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{lead.recommended_next_action || `Follow up with ${customer?.full_name || "lead"}`}</p><p className="mt-1 text-[10px] text-slate-600">{customer?.full_name || "Unknown"} · {lead.timeline || "No timeline"}</p></div><span className="text-[9px] font-semibold text-slate-600">{index === 0 ? "High" : "Next"}</span></div>; }) : <div className="flex h-52 items-center justify-center text-xs text-slate-600">Your next actions will appear here.</div>}</div>
              </BentoCard>
            </div>

            <section className="relative mt-4 overflow-hidden rounded-2xl border border-violet-400/10 bg-gradient-to-r from-violet-500/[0.10] via-blue-500/[0.05] to-cyan-500/[0.04] p-5">
              <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
              <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xl shadow-lg shadow-violet-500/20">✦</div><div><p className="text-sm font-bold">AI is working for you 24/7</p><p className="mt-1 text-xs text-slate-500">LeadFlow is ready to capture, qualify and prioritize every new enquiry.</p></div></div><div className="flex flex-wrap gap-2"><AgentPill label="Lead Finder" /><AgentPill label="Scoring Agent" /><AgentPill label="Follow-up Agent" /></div></div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

function NavItem({ icon, label, href, active = false, badge }: { icon: string; label: string; href?: string; active?: boolean; badge?: string }) {
  const content = <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${active ? "bg-violet-500/[0.15] text-white shadow-inner shadow-violet-500/10" : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"}`}><span className={`w-5 text-center text-sm ${active ? "text-violet-300" : "text-slate-600"}`}>{icon}</span><span>{label}</span>{badge && <span className="ml-auto rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-300">{badge}</span>}</div>;
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

function StatCard({ label, value, change, icon, tone }: { label: string; value: number | string; change: string; icon: string; tone: "violet" | "red" | "amber" | "blue" | "green" }) {
  const tones = { violet: "from-violet-500/15 to-violet-500/[0.02] text-violet-300", red: "from-red-500/15 to-red-500/[0.02] text-red-300", amber: "from-amber-500/15 to-amber-500/[0.02] text-amber-300", blue: "from-blue-500/15 to-blue-500/[0.02] text-blue-300", green: "from-emerald-500/15 to-emerald-500/[0.02] text-emerald-300" };
  return <div className="group rounded-2xl border border-white/[0.07] bg-[#080e1b]/90 p-4 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-[#0a1222]"><div className="flex items-start justify-between"><p className="text-[10px] font-medium text-slate-500">{label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-sm`}>{icon}</span></div><p className="mt-4 truncate text-2xl font-black tracking-tight">{value}</p><p className="mt-1 truncate text-[9px] text-slate-600">{change}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.04]"><div className={`h-full rounded-full bg-gradient-to-r ${tone === "red" ? "from-red-500 to-orange-400" : tone === "amber" ? "from-amber-500 to-yellow-300" : tone === "green" ? "from-emerald-500 to-cyan-300" : "from-violet-500 to-cyan-400"} w-2/3`} /></div></div>;
}

function BentoCard({ title, subtitle, action, accent, className = "", children }: { title: string; subtitle: string; action?: string; accent?: "violet"; className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-white/[0.07] bg-[#080e1b]/90 p-5 shadow-xl shadow-black/10 ${className}`}><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-sm font-bold tracking-tight">{title}</h2>{accent && <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-300">Beta</span>}</div><p className="mt-1 text-[10px] text-slate-600">{subtitle}</p></div>{action && <button className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[9px] font-semibold text-slate-500">{action}</button>}</div>{children}</div>;
}

function PipelineStage({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) { return <div><p className="text-[9px] text-slate-600">{label}</p><p className={`mt-1 text-xl font-black ${accent ? "text-cyan-300" : "text-slate-200"}`}>{value}</p></div>; }

function TemperatureDonut({ hot, warm, cold, total }: { hot: number; warm: number; cold: number; total: number }) {
  const safe = total || 1;
  const h = (hot / safe) * 360;
  const w = h + (warm / safe) * 360;
  return <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(#fb3b43 0deg ${h}deg, #f5ad1a ${h}deg ${w}deg, #3b82f6 ${w}deg 360deg)` }}><div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-[#080e1b] ring-1 ring-white/[0.05]"><span className="text-2xl font-black">{total}</span><span className="text-[9px] uppercase tracking-wider text-slate-600">Total</span></div></div>;
}

function TempRow({ label, value, total, color }: { label: string; value: number; total: number; color: "red" | "amber" | "blue" | "slate" }) { const classes = { red: "bg-red-400", amber: "bg-amber-400", blue: "bg-blue-400", slate: "bg-slate-500" }; const pct = total ? Math.round(value / total * 100) : 0; return <div><div className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-2 text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${classes[color]}`} />{label}</span><span className="font-bold text-slate-300">{value} <span className="font-normal text-slate-700">{pct}%</span></span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.04]"><div className={`h-full rounded-full ${classes[color]}`} style={{ width: `${pct}%` }} /></div></div>; }

function InsightRow({ lead, index }: { lead: Lead; index: number }) { const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers; const labels = ["High intent lead", "Follow-up opportunity", "Priority lead"]; return <Link href={`/leads/${lead.id}`} className="block rounded-xl border border-white/[0.06] bg-white/[0.018] p-3 transition hover:border-violet-400/15 hover:bg-violet-500/[0.03]"><div className="flex items-start gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${index === 0 ? "bg-red-500/10 text-red-300" : "bg-violet-500/10 text-violet-300"}`}>{index === 0 ? "♨" : "✦"}</span><div className="min-w-0 flex-1"><p className="text-[9px] text-slate-500">{labels[index]}</p><p className="truncate text-[11px] font-semibold">{customer?.full_name || "Unknown customer"}</p><p className="mt-0.5 truncate text-[9px] text-slate-600">{lead.product_interest || lead.category || "General enquiry"}</p></div><span className="rounded-md bg-violet-500/10 px-1.5 py-1 text-[9px] font-bold text-violet-300">{lead.lead_score ?? "—"}%</span></div></Link>; }

function SourceBar({ label, count, max, index }: { label: string; count: number; max: number; index: number }) { const gradients = ["from-violet-500 to-cyan-400", "from-blue-500 to-violet-400", "from-cyan-400 to-emerald-400", "from-fuchsia-500 to-violet-400", "from-amber-400 to-orange-400"]; return <div><div className="flex items-center justify-between text-[10px]"><span className="text-slate-400">{label}</span><span className="font-bold text-slate-300">{count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.04]"><div className={`h-full rounded-full bg-gradient-to-r ${gradients[index % gradients.length]}`} style={{ width: `${Math.max(5, count / max * 100)}%` }} /></div></div>; }

function AgentPill({ label }: { label: string }) { return <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/10 px-3 py-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" /><span className="text-[10px] font-semibold text-slate-400">{label}</span><span className="text-[9px] text-emerald-300">Active</span></div>; }

function TemperatureBadge({ temperature }: { temperature: string | null }) { const value = String(temperature ?? "").toUpperCase(); const map: Record<string, string> = { HOT: "border-red-400/15 bg-red-500/10 text-red-300", WARM: "border-amber-400/15 bg-amber-500/10 text-amber-300", COLD: "border-blue-400/15 bg-blue-500/10 text-blue-300" }; return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${map[value] || "border-white/10 bg-white/5 text-slate-500"}`}>{value || "NEW"}</span>; }

function EmptyLeads() { return <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-xl text-violet-300">✦</div><p className="mt-4 text-sm font-semibold">Your pipeline is ready.</p><p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-600">New enquiries will appear here automatically once they reach your CRM.</p><Link href="/leads" className="mt-4 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-400">Explore pipeline</Link></div>; }

function ErrorState({ title, message, error }: { title: string; message: string; error?: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#030712] px-6 text-white"><div className="w-full max-w-lg rounded-2xl border border-red-400/15 bg-red-500/[0.04] p-7"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-400">{message}</p>{error && <p className="mt-4 rounded-xl border border-red-400/10 bg-red-500/5 p-4 text-sm text-red-300">{error}</p>}</div></main>; }

function LoadingState() { return <main className="flex min-h-screen items-center justify-center bg-[#030712] text-white"><div className="text-center"><div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400" /><p className="mt-4 text-xs text-slate-500">Loading LeadFlow...</p></div></main>; }

function formatCurrency(value: number) { if (!value) return "₹0"; return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }
