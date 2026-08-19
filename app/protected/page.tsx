import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function ProtectedContent() {
  await connection();
    const supabase = await createClient();

  // Get currently logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's profile and client
  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.client_id) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">
            LeadFlow AI
          </h1>

          <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
            <h2 className="text-xl font-semibold">
              Client account not configured
            </h2>

            <p className="mt-2 text-slate-300">
              Your account is authenticated, but it is not linked
              to a client profile yet.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Get business information
  const { data: client } = await supabase
    .from("clients")
    .select("business_name, industry")
    .eq("id", profile.client_id)
    .single();

  // Get this client's leads
const { data: leadsData, error: leadsError } = await supabase
  .from("leads")
  .select(
    `
      lead_id,
      customer_name,
      phone,
      email,
      requested_service,
      lead_score,
      lead_status,
      pipeline_stage,
      created_at
    `
  )
  .eq("client_id", profile.client_id)
  .order("created_at", { ascending: false });

const leads = leadsData ?? [];

  const total = leads.length;

  const hot = leads.filter(
    (lead) => lead.lead_status === "HOT"
  ).length;

  const warm = leads.filter(
    (lead) => lead.lead_status === "WARM"
  ).length;

  const cold = leads.filter(
    (lead) => lead.lead_status === "COLD"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              LeadFlow AI
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {client?.business_name ?? "Your Business"}
            </h1>

            <p className="mt-1 text-slate-400">
              AI-powered lead management
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-400">
              Signed in as
            </p>

            <p className="font-medium">
              {profile.full_name || user.email}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Total Leads
            </p>

            <p className="mt-2 text-4xl font-bold">
              {total}
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-300">
              🔥 HOT
            </p>

            <p className="mt-2 text-4xl font-bold">
              {hot}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6">
            <p className="text-sm text-yellow-300">
              🟡 WARM
            </p>

            <p className="mt-2 text-4xl font-bold">
              {warm}
            </p>
          </div>

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
            <p className="text-sm text-sky-300">
              🔵 COLD
            </p>

            <p className="mt-2 text-4xl font-bold">
              {cold}
            </p>
          </div>

        </div>

        {/* Leads */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">
              Recent Leads
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Your latest customer enquiries
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-800 text-sm text-slate-400">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Stage</th>
                </tr>
              </thead>

              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.lead_id}

                    className="cursor-pointer border-b border-slate-800/60 hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4">
                      <a
                        href={`/leads/${lead.lead_id}`}
                        className="font-medium hover:text-blue-400"
                      >
                        {lead.customer_name}
                      </a>

                      <div className="text-sm text-slate-400">
                        {lead.email}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-300">
                      {lead.requested_service || "—"}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {lead.lead_score ?? 0}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={lead.lead_status} />
                    </td>

                    <td className="px-6 py-4 text-slate-300">
                      {lead.pipeline_stage || "NEW"}
                    </td>
                  </tr>
                ))}

                {leads.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  if (status === "HOT") {
    return (
      <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-medium text-red-300">
        🔥 HOT
      </span>
    );
  }

  if (status === "WARM") {
    return (
      <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-sm font-medium text-yellow-300">
        🟡 WARM
      </span>
    );
  }

  return (
    <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sm font-medium text-sky-300">
      🔵 COLD
    </span>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <p className="text-slate-400">Loading LeadFlow CRM...</p>
        </main>
      }
    >
      <ProtectedContent />
    </Suspense>
  );
}