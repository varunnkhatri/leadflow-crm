"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Lead = {
  id: string;
  enquiry: string | null;
  product_interest: string | null;
  budget_raw: string | null;
  location: string | null;
  source: string | null;
  campaign: string | null;
  temperature: string | null;
  intent: string | null;
  category: string | null;
  requirements: string | null;
  timeline: string | null;
  recommended_next_action: string | null;
  human_review_required: boolean | null;
  stage: string | null;
  status: string | null;
  assigned_user_id: string | null;
  deal_value: number | null;
};

const inputClass = "mt-2 w-full border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#b7ff58]";
const labelClass = "text-[10px] font-bold uppercase tracking-[.16em] text-white/40";

export default function LeadEditor({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [form, setForm] = useState({
    enquiry: lead.enquiry ?? "", product_interest: lead.product_interest ?? "", budget_raw: lead.budget_raw ?? "",
    location: lead.location ?? "", source: lead.source ?? "", campaign: lead.campaign ?? "", temperature: lead.temperature ?? "",
    intent: lead.intent ?? "", category: lead.category ?? "", requirements: lead.requirements ?? "", timeline: lead.timeline ?? "",
    recommended_next_action: lead.recommended_next_action ?? "", human_review_required: Boolean(lead.human_review_required),
    stage: lead.stage ?? "NEW", status: lead.status ?? "OPEN", deal_value: lead.deal_value == null ? "" : String(lead.deal_value),
  });
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  function setField(name: keyof typeof form, value: string | boolean) { setForm((current) => ({ ...current, [name]: value })); setSaved(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    const dealValue = form.deal_value.trim() === "" ? null : Number(form.deal_value);
    if (dealValue !== null && (!Number.isFinite(dealValue) || dealValue < 0)) { setError("Deal value must be a valid non-negative number."); setSaving(false); return; }
    try {
      const response = await fetch("/api/leads/update", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, ...form, deal_value: dealValue }) });
      const result = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to save lead.");
      setSaved(true); router.refresh(); setTimeout(() => router.push(`/leads/${lead.id}`), 250);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save lead."); setSaving(false); }
  }
  return <form onSubmit={submit} className="mt-8 space-y-6">
    <section className="border border-white/10 bg-[#080808] p-5 sm:p-7"><p className="leadflow-kicker">01 / Customer enquiry</p><div className="mt-6 grid gap-6 md:grid-cols-2">
      <Field label="Product / Interest" value={form.product_interest} onChange={(v) => setField("product_interest", v)} /><Field label="Category" value={form.category} onChange={(v) => setField("category", v)} />
      <Field label="Budget" value={form.budget_raw} onChange={(v) => setField("budget_raw", v)} /><Field label="Location" value={form.location} onChange={(v) => setField("location", v)} />
      <Field label="Source" value={form.source} onChange={(v) => setField("source", v)} /><Field label="Campaign" value={form.campaign} onChange={(v) => setField("campaign", v)} />
    </div><label className="mt-6 block"><span className={labelClass}>Original enquiry</span><textarea className={`${inputClass} min-h-32 resize-y`} value={form.enquiry} onChange={(e) => setField("enquiry", e.target.value)} maxLength={3000} /></label></section>
    <section className="border border-white/10 bg-[#080808] p-5 sm:p-7"><p className="leadflow-kicker">02 / Qualification</p><div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <SelectField label="Temperature" value={form.temperature} options={["NEW", "HOT", "WARM", "COLD"]} onChange={(v) => setField("temperature", v)} />
      <SelectField label="Intent" value={form.intent} options={["HIGH", "MEDIUM", "LOW"]} onChange={(v) => setField("intent", v)} />
      <SelectField label="Stage" value={form.stage} options={["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]} onChange={(v) => setField("stage", v)} />
      <SelectField label="Status" value={form.status} options={["OPEN", "ACTIVE", "WON", "LOST", "CLOSED", "ARCHIVED"]} onChange={(v) => setField("status", v)} />
      <Field label="Deal value (₹)" value={form.deal_value} onChange={(v) => setField("deal_value", v)} inputMode="decimal" />
    </div><label className="mt-6 flex items-center gap-3 border border-white/10 bg-[#0b0b0b] px-4 py-4"><input type="checkbox" checked={form.human_review_required} onChange={(e) => setField("human_review_required", e.target.checked)} className="h-4 w-4 accent-[#b7ff58]" /><span className="text-sm text-white/70">Human review required</span></label></section>
    <section className="border border-white/10 bg-[#080808] p-5 sm:p-7"><p className="leadflow-kicker">03 / Context & next move</p><div className="mt-6 grid gap-6 md:grid-cols-2"><TextAreaField label="Requirements" value={form.requirements} onChange={(v) => setField("requirements", v)} /><TextAreaField label="Timeline" value={form.timeline} onChange={(v) => setField("timeline", v)} /></div><label className="mt-6 block"><span className={labelClass}>Recommended next action</span><textarea className={`${inputClass} min-h-28 resize-y`} value={form.recommended_next_action} onChange={(e) => setField("recommended_next_action", e.target.value)} /></label></section>
    {error && <div role="alert" className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}{saved && <div className="border border-[#b7ff58]/30 bg-[#b7ff58]/10 px-4 py-3 text-sm text-[#b7ff58]">Lead saved. Returning to the lead record…</div>}
    <div className="sticky bottom-0 flex flex-col gap-3 border-t border-white/10 bg-[#050505]/95 py-5 backdrop-blur sm:flex-row sm:justify-end"><button type="button" onClick={() => router.push(`/leads/${lead.id}`)} className="border border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-[.14em] text-white/60 hover:text-white">Cancel</button><button type="submit" disabled={saving} className="bg-[#f5f1e8] px-8 py-3 text-xs font-black uppercase tracking-[.14em] text-black disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div>
  </form>;
}
function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "decimal" }) { return <label className="block"><span className={labelClass}>{label}</span><input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} /></label>; }
function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className={labelClass}>{label}</span><textarea className={`${inputClass} min-h-32 resize-y`} value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block"><span className={labelClass}>{label}</span><select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Not set</option>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
