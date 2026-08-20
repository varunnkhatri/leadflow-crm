import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function LeadPageContent({ params }: PageProps) {
  await connection();

  const { id } = await params;

  if (!id || id === "undefined") {
    return (
      <ErrorState
        title="Invalid lead ID"
        message="The lead URL did not contain a valid lead ID."
      />
    );
  }

  const supabase = await createClient();

  // -----------------------------
  // AUTH
  // -----------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // -----------------------------
  // CRM USER
  // -----------------------------

  const { data: crmUser, error: userError } = await supabase
    .from("users")
    .select(`
      id,
      email,
      full_name,
      role,
      business_id
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !crmUser) {
    return (
      <ErrorState
        title="Account not configured"
        message="Your account could not be connected to the CRM."
        detail={userError?.message}
      />
    );
  }

  if (!crmUser.business_id) {
    return (
      <ErrorState
        title="No business assigned"
        message="Your CRM user does not have a business assigned."
      />
    );
  }

  const businessId = crmUser.business_id;

  // -----------------------------
  // BUSINESS
  // -----------------------------

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, industry, website")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business) {
    return (
      <ErrorState
        title="Business not found"
        message="Your business could not be loaded."
        detail={businessError?.message}
      />
    );
  }

  // -----------------------------
  // LEAD
  // -----------------------------

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(`
      id,
      business_id,
      customer_id,
      enquiry,
      product_interest,
      budget_raw,
      location,
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
      assigned_user_id,
      deal_value,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .maybeSingle();

  if (leadError || !lead) {
    return (
      <ErrorState
        title="Lead not found"
        message="This lead does not exist or does not belong to your business."
        detail={
          leadError
            ? `${leadError.message} | Requested ID: ${id}`
            : `Requested ID: ${id}`
        }
      />
    );
  }

  // -----------------------------
  // CUSTOMER
  // -----------------------------

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(`
      id,
      full_name,
      phone,
      email,
      consent,
      source,
      first_seen_at,
      last_seen_at
    `)
    .eq("id", lead.customer_id)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .maybeSingle();

  if (customerError || !customer) {
    return (
      <ErrorState
        title="Customer not found"
        message="The lead exists, but its customer record could not be loaded."
        detail={customerError?.message}
      />
    );
  }

  // -----------------------------
  // PAGE
  // -----------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="flex items-center justify-between">
          <Link
            href="/protected"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Dashboard
          </Link>

          <span className="text-sm text-slate-500">
            {business.name}
          </span>
        </div>

        {/* Header */}
        <div className="mt-8 flex flex-col gap-5 border-b border-slate-800 pb-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Lead Details
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              {customer.full_name || "Unknown Customer"}
            </h1>

            <p className="mt-2 text-slate-400">
              {lead.product_interest ||
                lead.category ||
                "General enquiry"}
            </p>
          </div>

          <TemperatureBadge
            temperature={lead.temperature}
            large
          />
        </div>

        {/* Top cards */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">

          {/* Customer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Customer
            </h2>

            <div className="mt-6 space-y-5">
              <InfoItem
                label="Name"
                value={customer.full_name}
              />

              <InfoItem
                label="Email"
                value={customer.email}
              />

              <InfoItem
                label="Phone"
                value={customer.phone}
              />

              <InfoItem
                label="Consent"
                value={customer.consent ? "Yes" : "No"}
              />

              <InfoItem
                label="Source"
                value={customer.source}
              />
            </div>

<div className="mt-6 space-y-3">

  {customer.phone && (
    <>
      <a
        href={`tel:${customer.phone}`}
        className="block rounded-xl bg-white px-4 py-3 text-center font-semibold text-black hover:bg-slate-200"
      >
        📞 Call Customer
      </a>

      <a
        href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-green-700 px-4 py-3 text-center font-semibold text-green-300 hover:bg-green-950/30"
      >
        💬 WhatsApp Customer
      </a>
    </>
  )}

  {customer.email && (
    <a
      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        customer.email
      )}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-slate-700 px-4 py-3 text-center font-semibold hover:bg-slate-800"
    >
      ✉️ Email Customer
    </a>
  )}

</div>
          </div>

          {/* AI / Lead */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Lead Intelligence
            </h2>

            <div className="mt-6 space-y-5">
              <InfoItem
                label="Lead Score"
                value={
                  lead.lead_score !== null
                    ? `${lead.lead_score} / 100`
                    : null
                }
              />

              <InfoItem
                label="Intent"
                value={lead.intent}
              />

              <InfoItem
                label="Category"
                value={lead.category}
              />

              <InfoItem
                label="Urgency"
                value={lead.urgency}
              />

              <InfoItem
                label="Purchase Probability"
                value={
                  lead.purchase_probability !== null
                    ? `${Math.round(
                        Number(lead.purchase_probability) * 100
                      )}%`
                    : null
                }
              />

              <InfoItem
                label="Confidence"
                value={
                  lead.confidence !== null
                    ? `${Math.round(
                        Number(lead.confidence) * 100
                      )}%`
                    : null
                }
              />
            </div>
          </div>

          {/* Pipeline */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Pipeline
            </h2>

            <div className="mt-6 space-y-5">
              <InfoItem
                label="Stage"
                value={lead.stage}
              />

              <InfoItem
                label="Status"
                value={lead.status}
              />

              <InfoItem
                label="Deal Value"
                value={
                  lead.deal_value !== null
                    ? `₹${Number(
                        lead.deal_value
                      ).toLocaleString("en-IN")}`
                    : null
                }
              />

              <InfoItem
                label="Source"
                value={lead.source}
              />

              <InfoItem
                label="Campaign"
                value={lead.campaign}
              />

              <InfoItem
                label="Human Review"
                value={
                  lead.human_review_required
                    ? "Required"
                    : "Not required"
                }
              />
            </div>
          </div>
        </div>

        {/* Original enquiry */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Original Enquiry
          </h2>

          <div className="mt-4 rounded-xl bg-slate-950 p-5 leading-7 text-slate-300">
            {lead.enquiry || "No enquiry recorded."}
          </div>
        </section>

        {/* Requirements + timeline */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Requirements
            </h2>

            <div className="mt-4 rounded-xl bg-slate-950 p-5 leading-7 text-slate-300">
              {lead.requirements ||
                "No requirements recorded."}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Timeline
            </h2>

            <div className="mt-4 rounded-xl bg-slate-950 p-5 leading-7 text-slate-300">
              {lead.timeline ||
                "No timeline recorded."}
            </div>
          </section>

        </div>

        {/* AI recommendation */}
        <section className="mt-6 rounded-2xl border border-blue-900/50 bg-blue-950/20 p-6">
          <h2 className="text-lg font-semibold text-blue-300">
            AI Recommended Next Action
          </h2>

          <div className="mt-4 rounded-xl bg-slate-950 p-5 leading-7 text-slate-300">
            {lead.recommended_next_action ||
              "No recommendation available."}
          </div>
        </section>

        {/* Extra info */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <InfoCard
            title="Budget"
            value={lead.budget_raw}
          />

          <InfoCard
            title="Location"
            value={lead.location}
          />

          <InfoCard
            title="Landing Page"
            value={lead.landing_page}
          />
        </div>

        {/* Dates */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <InfoItem
              label="Created"
              value={formatDateTime(lead.created_at)}
            />

            <InfoItem
              label="Last Updated"
              value={formatDateTime(lead.updated_at)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

// -----------------------------
// PAGE WRAPPER
// -----------------------------

export default function LeadPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <p className="text-slate-400">
            Loading lead...
          </p>
        </main>
      }
    >
      <LeadPageContent {...props} />
    </Suspense>
  );
}

// -----------------------------
// INFO ITEM
// -----------------------------

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-slate-200">
        {value || "Not provided"}
      </p>
    </div>
  );
}

// -----------------------------
// INFO CARD
// -----------------------------

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-slate-200">
        {value || "Not provided"}
      </p>
    </div>
  );
}

// -----------------------------
// TEMPERATURE
// -----------------------------

function TemperatureBadge({
  temperature,
  large = false,
}: {
  temperature: string | null;
  large?: boolean;
}) {
  const value = String(temperature ?? "").toUpperCase();

  const size = large
    ? "px-5 py-3 text-base"
    : "px-3 py-1 text-sm";

  if (value === "HOT") {
    return (
      <span
        className={`inline-block rounded-full bg-red-500/15 font-semibold text-red-300 ${size}`}
      >
        🔥 HOT
      </span>
    );
  }

  if (value === "WARM") {
    return (
      <span
        className={`inline-block rounded-full bg-yellow-500/15 font-semibold text-yellow-300 ${size}`}
      >
        🟡 WARM
      </span>
    );
  }

  if (value === "COLD") {
    return (
      <span
        className={`inline-block rounded-full bg-sky-500/15 font-semibold text-sky-300 ${size}`}
      >
        🔵 COLD
      </span>
    );
  }

  return (
    <span
      className={`inline-block rounded-full bg-slate-800 text-slate-400 ${size}`}
    >
      UNKNOWN
    </span>
  );
}

// -----------------------------
// ERROR STATE
// -----------------------------

function ErrorState({
  title,
  message,
  detail,
}: {
  title: string;
  message: string;
  detail?: string;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/protected"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">
            {title}
          </h1>

          <p className="mt-2 text-slate-400">
            {message}
          </p>

          {detail && (
            <div className="mt-5 rounded-xl bg-red-950/40 p-4 text-sm text-red-300">
              {detail}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// -----------------------------
// DATE
// -----------------------------

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Unknown";
  }
}