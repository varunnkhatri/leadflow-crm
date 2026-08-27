"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewLeadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create lead.");
      router.push(`/leads/${result.lead.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create lead.");
      setSaving(false);
    }
  }

  return (
    <main className="leadflow-page min-h-screen text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10">
        <Link href="/leads" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/40 hover:text-[#b7ff58]">
          <ArrowLeft size={14} /> Back to leads
        </Link>
        <div className="border-b border-white/10 pb-8">
          <p className="leadflow-kicker">01 / INTAKE</p>
          <h1 className="leadflow-title mt-3 text-5xl sm:text-6xl">NEW LEAD</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/40">Create a lead inside your current workspace. LeadFlow will find or create the customer, score the opportunity and record the activity automatically.</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-8">
          <section className="border border-white/10 bg-[#080808] p-5 sm:p-7">
            <p className="leadflow-kicker">Customer</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field name="name" label="Full name" required placeholder="Jane Smith" />
              <Field name="phone" label="Phone" placeholder="+91 98765 43210" />
              <Field name="email" label="Email" type="email" placeholder="jane@example.com" />
              <Field name="location" label="Location" placeholder="Hyderabad" />
            </div>
          </section>

          <section className="border border-white/10 bg-[#080808] p-5 sm:p-7">
            <p className="leadflow-kicker">Opportunity</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field name="service" label="Service / product" required placeholder="Digital marketing" />
              <Field name="budget_raw" label="Budget" placeholder="₹50,000 / month" />
              <Field name="timeline" label="Timeline" placeholder="This month" />
              <Field name="intent" label="Intent" placeholder="Ready to buy" />
              <Field name="source" label="Source" defaultValue="manual" placeholder="Website / referral / manual" />
              <Field name="campaign" label="Campaign" placeholder="Optional" />
            </div>
            <div className="mt-5">
              <label className="block text-[10px] font-bold uppercase tracking-[.16em] text-white/35">Requirements / context</label>
              <textarea name="requirements" rows={4} placeholder="What does the customer need?" className="mt-2 w-full resize-y border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#b7ff58]/50" />
            </div>
            <div className="mt-5">
              <label className="block text-[10px] font-bold uppercase tracking-[.16em] text-white/35">Enquiry</label>
              <textarea name="message" required rows={5} placeholder="Describe the customer's enquiry..." className="mt-2 w-full resize-y border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#b7ff58]/50" />
            </div>
          </section>

          {error && <div role="alert" className="border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">{error}</div>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/leads" className="leadflow-button justify-center">Cancel</Link>
            <button disabled={saving} className="leadflow-button leadflow-button-primary justify-center disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><Check size={14} /> Create lead</>}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({ name, label, type = "text", required, placeholder, defaultValue }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return <label className="block"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-white/35">{label}{required && <span className="ml-1 text-[#b7ff58]">*</span>}</span><input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#b7ff58]/50" /></label>;
}
