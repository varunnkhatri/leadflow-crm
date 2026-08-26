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
      id,
      business_id,
      customer_id,
      enquiry,
      product_interest,
      source,
      campaign,
      landing_page,
      temperature,
      intent,
      category,
      lead_score,
      confidence,
      urgency,
      purchase_probability,
      requirements,
      timeline,
      recommended_next_action,
      human_review_required,
      stage,
      status,
      deal_value,
      created_at,
      updated_at,
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

  return (
    <main className="min-h-screen bg-[#07101f] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[32rem] w-[32rem] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-20 rounded-2xl border border-white/10 bg-[#0b1528]/90 px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg font-black shadow-lg shadow-blue-500/20">L</span>
                <div>
                  <div className="text-base font-bold tracking-tight">LeadFlow</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">AI CRM</div>
                </div>
              </Link>
              <div className="hidden h-8 w-px bg-white/10 sm:block" />
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Workspace</p>
                <p className="font-semibold text-slate-100">{business.name}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="hidden rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 sm:block">
                <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-300/70">Status</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-300">Workspace active</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold">
                  {(profile.full_name || profile.email || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{profile.full_name || profile.email}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{profile.role || "USER"}</p>
                </div>
              </div>
              <Link href="/auth/login" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white">Log out</Link>
            </div>
          </div>
        </header>

        <div className="mt-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Overview</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Good to see you, {profile.full_name?.split(" ")[0] || "there"}.</h1>
              <p className="mt-2 max-w-2xl text-slate-400">A clean snapshot of your current lead pipeline and the opportunities that need attention.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/leads" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]">View all leads</Link>
            </div>
          </div>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total leads" value={totalLeads} helper="All active records" />
            <MetricCard label="Hot" value={hotLeads} helper="Highest priority" tone="hot" />
            <MetricCard label="Warm" value={warmLeads} helper="Worth nurturing" tone="warm" />
            <MetricCard label="Cold" value={coldLeads} helper="Lower intent" tone="cold" />
            <MetricCard label="Open" value={openLeads} helper="Still in progress" tone="open" />
          </section>

          {leadsError && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="font-semibold text-red-300">Unable to load leads</p>
              <p className="mt-1 text-sm text-red-300/80">{leadsError.message}</p>
            </div>
          )}

          <section className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1528]/80 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 md:flex-row md:items-center md:justify-between sm:px-6">
              <div>
                <h2 className="text-lg font-bold">Recent leads</h2>
                <p className="mt-1 text-sm text-slate-500">Your newest customer enquiries, prioritized for quick action.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live data
              </div>
            </div>

            {leads.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xl">⌁</div>
                <p className="mt-4 text-base font-semibold text-slate-200">No leads yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">New enquiries will appear here automatically once they reach your CRM.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-white/[0.02]">
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Customer</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Interest</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Score</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Temperature</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Stage</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers;
                      return (
                        <tr key={lead.id} className="border-b border-white/5 transition hover:bg-white/[0.025]">
                          <td className="px-6 py-4">
                            <Link href={`/leads/${lead.id}`} className="font-semibold text-slate-100 hover:text-blue-300">{customer?.full_name || "Unknown customer"}</Link>
                            <p className="mt-1 text-xs text-slate-500">{customer?.email || customer?.phone || "No contact information"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="max-w-[250px] truncate font-medium text-slate-200">{lead.product_interest || lead.category || "General enquiry"}</p>
                            {lead.intent && <p className="mt-1 text-xs text-slate-500">{lead.intent}</p>}
                          </td>
                          <td className="px-6 py-4"><span className="font-bold text-slate-100">{lead.lead_score ?? 0}</span></td>
                          <td className="px-6 py-4"><TemperatureBadge temperature={lead.temperature} /></td>
                          <td className="px-6 py-4"><Pill value={lead.stage || "NEW"} /></td>
                          <td className="px-6 py-4"><Pill value={lead.status || "OPEN"} /></td>
                          <td className="px-6 py-4 text-sm text-slate-500">{formatDate(lead.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-7 grid gap-4 md:grid-cols-3">
            <InfoCard title="Capture" text="Bring new enquiries into one structured record so nothing gets lost between channels." />
            <InfoCard title="Prioritize" text="Use lead score and temperature to focus your team on the opportunities most likely to move." />
            <InfoCard title="Act faster" text="Open any lead for context, ownership and the next action your team should take." />
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, helper, tone = "default" }: { label: string; value: number; helper: string; tone?: "default" | "hot" | "warm" | "cold" | "open" }) {
  const styles = {
    default: "border-white/10 bg-[#0b1528]",
    hot: "border-red-400/15 bg-red-500/[0.07]",
    warm: "border-amber-400/15 bg-amber-500/[0.07]",
    cold: "border-cyan-400/15 bg-cyan-500/[0.06]",
    open: "border-violet-400/15 bg-violet-500/[0.06]",
  };
  return <div className={`rounded-2xl border p-5 shadow-lg shadow-black/5 ${styles[tone]}`}><div className="flex items-start justify-between gap-3"><p className="text-sm text-slate-400">{label}</p><span className="h-2 w-2 rounded-full bg-white/20" /></div><p className="mt-4 text-4xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-500">{helper}</p></div>;
}

function TemperatureBadge({ temperature }: { temperature: string | null }) {
  const value = String(temperature ?? "").toUpperCase();
  const map = {
    HOT: "border-red-400/15 bg-red-500/10 text-red-300",
    WARM: "border-amber-400/15 bg-amber-500/10 text-amber-300",
    COLD: "border-cyan-400/15 bg-cyan-500/10 text-cyan-300",
  } as const;
  const cls = map[value as keyof typeof map] ?? "border-white/10 bg-white/5 text-slate-400";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>{value || "UNKNOWN"}</span>;
}

function Pill({ value }: { value: string }) {
  return <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300">{value.replaceAll("_", " ")}</span>;
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0b1528]/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">{title}</p><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p></div>;
}

function ErrorState({ title, message, error }: { title: string; message: string; error?: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#07101f] px-6 text-white"><div className="w-full max-w-lg rounded-2xl border border-red-400/15 bg-red-500/[0.04] p-7"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-400">{message}</p>{error && <p className="mt-4 rounded-xl border border-red-400/10 bg-red-500/5 p-4 text-sm text-red-300">{error}</p>}</div></main>;
}

function formatDate(value: string) {
  try { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "Unknown"; }
}

export default function ProtectedPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#07101f] text-white"><p className="text-slate-400">Loading CRM...</p></main>}><ProtectedPageContent /></Suspense>;
}
