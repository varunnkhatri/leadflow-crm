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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get CRM user
  const { data: users, error: profileError } = await supabase
    .from("users")
    .select(`
      id,
      email,
      full_name,
      role,
      business_id
    `)
    .eq("id", user.id)
    .limit(1);

  const profile = users?.[0] ?? null;

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">
            Unable to load your account
          </h1>

          <p className="mt-2 text-slate-400">
            Your authenticated account does not have a CRM user record.
          </p>

          {profileError && (
            <p className="mt-4 rounded-xl bg-red-950/40 p-4 text-sm text-red-300">
              {profileError.message}
            </p>
          )}
        </div>
      </main>
    );
  }

  if (!profile.business_id) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">
            No business assigned
          </h1>

          <p className="mt-2 text-slate-400">
            Your CRM user does not have a business assigned.
          </p>
        </div>
      </main>
    );
  }

  const businessId = profile.business_id;

  // Get business
  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      industry,
      website
    `)
    .eq("id", businessId)
    .limit(1)
    .maybeSingle();

  if (businessError || !business) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">
            Unable to load business
          </h1>

          <p className="mt-2 text-slate-400">
            Your account is connected, but the business could not be loaded.
          </p>

          {businessError && (
            <p className="mt-4 rounded-xl bg-red-950/40 p-4 text-sm text-red-300">
              {businessError.message}
            </p>
          )}
        </div>
      </main>
    );
  }

  // Get leads
  const {
    data: leadsData,
    error: leadsError,
  } = await supabase
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
      customers (
        id,
        full_name,
        phone,
        email
      )
    `)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const leads = (leadsData ?? []) as Lead[];

  const totalLeads = leads.length;

  const hotLeads = leads.filter(
    (lead) =>
      String(lead.temperature ?? "").toUpperCase() === "HOT"
  ).length;

  const warmLeads = leads.filter(
    (lead) =>
      String(lead.temperature ?? "").toUpperCase() === "WARM"
  ).length;

  const coldLeads = leads.filter(
    (lead) =>
      String(lead.temperature ?? "").toUpperCase() === "COLD"
  ).length;

  const openLeads = leads.filter(
    (lead) =>
      String(lead.status ?? "").toUpperCase() === "OPEN"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Header */}
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              LeadFlow AI
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {business.name}
            </h1>

            <p className="mt-1 text-slate-400">
              AI-powered lead management
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-sm text-slate-500">
              Signed in as
            </p>

            <p className="font-semibold">
              {profile.full_name || profile.email}
            </p>

            <p className="mt-1 text-xs uppercase text-slate-500">
              {profile.role || "USER"}
            </p>
          </div>
        </header>

        {/* Metrics */}
        <section className="mt-8 grid gap-5 md:grid-cols-5">
          <MetricCard
            title="Total Leads"
            value={totalLeads}
          />

          <MetricCard
            title="🔥 HOT"
            value={hotLeads}
            tone="hot"
          />

          <MetricCard
            title="🟡 WARM"
            value={warmLeads}
            tone="warm"
          />

          <MetricCard
            title="🔵 COLD"
            value={coldLeads}
            tone="cold"
          />

          <MetricCard
            title="Open"
            value={openLeads}
          />
        </section>

        {/* Lead query error */}
        {leadsError && (
          <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/40 p-5">
            <h2 className="font-semibold text-red-300">
              Unable to load leads
            </h2>

            <p className="mt-2 text-sm text-red-400">
              {leadsError.message}
            </p>
          </div>
        )}

        {/* Leads */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">
              Recent Leads
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest customer enquiries for {business.name}
            </p>
          </div>

          {leads.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-medium text-slate-300">
                No leads yet
              </p>

              <p className="mt-2 text-sm text-slate-500">
                New enquiries will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="border-b border-slate-800 bg-slate-950/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Interest
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Score
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Temperature
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Stage
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {leads.map((lead) => {
                    const customer = Array.isArray(lead.customers)
                      ? lead.customers[0]
                      : lead.customers;

                    return (
                      <tr
                        key={lead.id}
                        className="border-b border-slate-800/70 transition hover:bg-slate-800/40"
                      >
                        <td className="px-6 py-5">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-semibold hover:text-blue-400"
                          >
                            {customer?.full_name ||
                              "Unknown customer"}
                          </Link>

                          <p className="mt-1 text-sm text-slate-500">
                            {customer?.email ||
                              customer?.phone ||
                              "No contact information"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-medium">
                            {lead.product_interest ||
                              lead.category ||
                              "General enquiry"}
                          </p>

                          {lead.intent && (
                            <p className="mt-1 text-xs text-slate-500">
                              {lead.intent}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span className="font-bold">
                            {lead.lead_score ?? 0}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <TemperatureBadge
                            temperature={lead.temperature}
                          />
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                            {lead.stage || "NEW"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                            {lead.status || "OPEN"}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-500">
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: number;
  tone?: "default" | "hot" | "warm" | "cold";
}) {
  const toneClasses = {
    default: "border-slate-800 bg-slate-900",
    hot: "border-red-900/60 bg-red-950/30",
    warm: "border-yellow-900/60 bg-yellow-950/20",
    cold: "border-sky-900/60 bg-sky-950/20",
  };

  return (
    <div
      className={`rounded-2xl border p-6 ${toneClasses[tone]}`}
    >
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold">
        {value}
      </p>
    </div>
  );
}

function TemperatureBadge({
  temperature,
}: {
  temperature: string | null;
}) {
  const value = String(
    temperature ?? ""
  ).toUpperCase();

  if (value === "HOT") {
    return (
      <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-300">
        🔥 HOT
      </span>
    );
  }

  if (value === "WARM") {
    return (
      <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-sm font-semibold text-yellow-300">
        🟡 WARM
      </span>
    );
  }

  if (value === "COLD") {
    return (
      <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sm font-semibold text-sky-300">
        🔵 COLD
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400">
      UNKNOWN
    </span>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-IN");
  } catch {
    return "Unknown";
  }
}

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <p className="text-slate-400">
            Loading CRM...
          </p>
        </main>
      }
    >
      <ProtectedPageContent />
    </Suspense>
  );
}