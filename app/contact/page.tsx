"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    try {
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const token =
        searchParams?.get("token") ||
        process.env.NEXT_PUBLIC_PUBLIC_INTAKE_TOKEN ||
        process.env.NEXT_PUBLIC_LEAD_INTAKE_TOKEN;

      if (!token) {
        throw new Error("This public intake link is missing its workspace token.");
      }

      const response = await fetch(`/api/public/leads/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your enquiry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="leadflow-page min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-50 editorial-grain opacity-20" />

      <nav className="leadflow-shell leadflow-topline flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center bg-[#f4f1e8] text-sm font-black text-black">L</span>
          <span className="font-bold tracking-[-0.03em]">LEADFLOW</span>
          <span className="hidden border-l border-white/15 pl-3 text-[10px] uppercase tracking-[0.25em] text-white/35 sm:block">Revenue OS</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">Secure lead intake</span>
      </nav>

      <section className="leadflow-shell px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_520px] lg:items-start">
          <div className="pt-2">
            <p className="leadflow-kicker flex items-center gap-3"><span className="h-px w-10 bg-[#b7ff58]" />PUBLIC INTAKE</p>
            <h1 className="leadflow-title mt-7 max-w-4xl text-[clamp(3.6rem,8vw,7.5rem)] uppercase">Turn your enquiry into the <span className="customer-gradient-text">next move.</span></h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-white/45 sm:text-lg">Share a few details and the team can follow up with the right context — without your enquiry disappearing into an inbox.</p>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-px border border-white/10 bg-white/10">
              <div className="bg-[#080808] p-4"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">01</p><p className="mt-5 text-xs font-bold uppercase">Capture</p></div>
              <div className="bg-[#080808] p-4"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">02</p><p className="mt-5 text-xs font-bold uppercase">Understand</p></div>
              <div className="bg-[#080808] p-4"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">03</p><p className="mt-5 text-xs font-bold uppercase">Respond</p></div>
            </div>
          </div>

          <section className="leadflow-panel p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-6">
              <div>
                <p className="leadflow-kicker">START HERE</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[-.04em]">Tell us what you need.</h2>
              </div>
              <span className="customer-gradient h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden="true" />
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Name</span><input name="name" required placeholder="Your full name" className="w-full border border-white/15 bg-[#050505] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#b7ff58]" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Phone</span><input name="phone" required placeholder="Phone number" className="w-full border border-white/15 bg-[#050505] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#b7ff58]" /></label>
                <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Email</span><input name="email" type="email" required placeholder="Email address" className="w-full border border-white/15 bg-[#050505] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#b7ff58]" /></label>
              </div>
              <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Service</span><select name="service" required defaultValue="" className="w-full border border-white/15 bg-[#050505] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#b7ff58]"><option value="" disabled>What can we help with?</option><option value="Sales enquiry">Sales enquiry</option><option value="Demo request">Demo request</option><option value="Product enquiry">Product enquiry</option><option value="Support">Support</option><option value="Other">Other</option></select></label>
              <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Message</span><textarea name="message" rows={5} required placeholder="Tell us what you're looking for..." className="w-full resize-none border border-white/15 bg-[#050505] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#b7ff58]" /></label>
              <button type="submit" disabled={loading} className="customer-gradient w-full px-5 py-4 text-xs font-black uppercase tracking-[.14em] text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Sending..." : "Send enquiry  ↗"}</button>
            </form>

            {success && <div className="mt-5 border border-[#b7ff58]/20 bg-[#b7ff58]/[.06] p-4 text-xs leading-5 text-[#d8ff9a]">Received. Your enquiry is now in the team&apos;s LeadFlow workspace.</div>}
            {error && <div className="mt-5 border border-red-300/20 bg-red-300/[.05] p-4 text-xs leading-5 text-red-200">{error}</div>}
          </section>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-7 sm:px-8 lg:px-12"><div className="leadflow-shell flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-white/25">LeadFlow · Intelligent lead desk</p><p className="text-[9px] uppercase tracking-[.16em] text-white/20">Capture → Understand → Respond</p></div></footer>
    </main>
  );
}
