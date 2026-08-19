import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function LeadPageContent({ params }: PageProps) {
    await connection();

  const { id } = await params;

  const supabase = await createClient();

  // --------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // --------------------------------------------------
  // GET USER PROFILE / CLIENT
  // --------------------------------------------------

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.client_id) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">
            Client configuration missing
          </h1>

          <p className="mt-2 text-slate-400">
            Your account is authenticated, but it is not connected to a
            client profile yet.
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // GET LEAD
  // --------------------------------------------------

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      `
        lead_id,
        customer_name,
        phone,
        email,
        original_message,
        requested_service,
        intent,
        urgency,
        purchase_intent,
        lead_score,
        lead_status,
        pipeline_stage,
        created_at
      `
    )
    .eq("lead_id", id)
    .eq("client_id", profile.client_id)
    .single();

  // --------------------------------------------------
  // GET CONVERSATION
  // --------------------------------------------------

  const { data: messagesData } = await supabase
    .from("conversations")
    .select(
      `
        id,
        direction,
        sender_type,
        message,
        channel,
        created_at
      `
    )
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  // Supabase may return null, so always use an array.
  const messages = messagesData ?? [];

  // --------------------------------------------------
  // HANDLE MISSING LEAD
  // --------------------------------------------------

  if (leadError || !lead) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/protected"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-8 text-2xl font-bold">
            Lead not found
          </h1>

          <p className="mt-2 text-slate-400">
            This lead does not exist or does not belong to your account.
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Back */}
        <Link
          href="/protected"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              {lead.customer_name}
            </h1>

            <p className="mt-2 text-slate-400">
              {lead.requested_service || "No service specified"}
            </p>
          </div>

          <StatusBadge status={lead.lead_status} />
        </div>

        {/* --------------------------------------------------
            INFORMATION CARDS
        -------------------------------------------------- */}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">

          {/* Customer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Customer
            </h2>

            <div className="mt-5 space-y-4">

              <div>
                <p className="text-sm text-slate-500">
                  Phone
                </p>

                <p className="mt-1">
                  {lead.phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Email
                </p>

                <p className="mt-1 break-all">
                  {lead.email || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Intent
                </p>

                <p className="mt-1">
                  {lead.intent || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Urgency
                </p>

                <p className="mt-1">
                  {lead.urgency || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Purchase Intent
                </p>

                <p className="mt-1">
                  {lead.purchase_intent || "Unknown"}
                </p>
              </div>

            </div>
          </div>

          {/* Lead Score */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Lead Score
            </h2>

            <div className="mt-6">
              <p className="text-6xl font-bold">
                {lead.lead_score ?? 0}
              </p>

              <p className="mt-2 text-slate-400">
                out of 100
              </p>
            </div>

            <div className="mt-8">
              <p className="text-sm text-slate-500">
                Pipeline Stage
              </p>

              <p className="mt-2 text-lg font-semibold">
                {lead.pipeline_stage || "NEW"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Actions
            </h2>

            <div className="mt-5 space-y-3">

              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="block rounded-xl bg-white px-4 py-3 text-center font-medium text-black hover:bg-slate-200"
                >
                  📞 Call Customer
                </a>
              )}

              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="block rounded-xl border border-slate-700 px-4 py-3 text-center font-medium hover:bg-slate-800"
                >
                  ✉️ Email Customer
                </a>
              )}

              <button
                type="button"
                disabled
                className="w-full rounded-xl border border-slate-800 px-4 py-3 text-slate-500"
              >
                Mark as Booked
              </button>

              <button
                type="button"
                disabled
                className="w-full rounded-xl border border-slate-800 px-4 py-3 text-slate-500"
              >
                Mark as Won
              </button>

            </div>
          </div>
        </div>

        {/* --------------------------------------------------
            ORIGINAL ENQUIRY
        -------------------------------------------------- */}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Original Enquiry
          </h2>

          <div className="mt-4 rounded-xl bg-slate-950 p-5 leading-7 text-slate-300">
            {lead.original_message || "No message available."}
          </div>
        </div>

        {/* --------------------------------------------------
            CONVERSATION
        -------------------------------------------------- */}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Conversation
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Customer and AI communication history
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
              {messages.length}{" "}
              {messages.length === 1 ? "message" : "messages"}
            </span>
          </div>

          <div className="mt-6 space-y-4">

            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400">
                  No conversation history yet.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Messages will appear here as the AI and customer
                  communicate.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.direction === "outbound"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 ${
                      message.direction === "outbound"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >

                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-xs font-semibold opacity-80">
                        {message.sender_type === "ai"
                          ? "AI"
                          : message.sender_type === "human"
                          ? "Team Member"
                          : "Customer"}
                      </p>

                      <span className="text-[10px] opacity-50">
                        {message.channel}
                      </span>
                    </div>

                    <p className="leading-6">
                      {message.message}
                    </p>

                    {message.created_at && (
                      <p className="mt-2 text-[10px] opacity-50">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    )}

                  </div>
                </div>
              ))
            )}

          </div>
        </div>

      </div>
    </main>
  );
}

// --------------------------------------------------
// STATUS BADGE
// --------------------------------------------------

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  if (status === "HOT") {
    return (
      <span className="rounded-full bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300">
        🔥 HOT
      </span>
    );
  }

  if (status === "WARM") {
    return (
      <span className="rounded-full bg-yellow-500/15 px-4 py-2 text-sm font-semibold text-yellow-300">
        🟡 WARM
      </span>
    );
  }

  if (status === "COLD") {
    return (
      <span className="rounded-full bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300">
        🔵 COLD
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">
      UNKNOWN
    </span>
  );
}

export default function LeadPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <div className="text-slate-400">
            Loading lead...
          </div>
        </main>
      }
    >
      <LeadPageContent {...props} />
    </Suspense>
  );
}