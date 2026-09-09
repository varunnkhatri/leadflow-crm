"use client";

import { ArrowRight, Check, ChevronDown, Instagram, Linkedin, Menu, Play, Sparkles, TrendingUp } from "lucide-react";
import { type FormEvent, useState } from "react";

const services = [
  ["01", "Social media strategy", "A practical content system shaped around your audience, goals and brand point of view."],
  ["02", "Content & creative", "Scroll-stopping campaigns, reels and design that feel unmistakably like your business."],
  ["03", "Paid media", "Performance-focused campaigns that turn attention into qualified enquiries and growth."],
];

export default function DemoPage() {
  const [submissionState, setSubmissionState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionState === "submitting") return;

    setSubmissionState("submitting");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const token =
        searchParams?.get("token") ||
        process.env.NEXT_PUBLIC_PUBLIC_INTAKE_TOKEN ||
        process.env.NEXT_PUBLIC_LEAD_INTAKE_TOKEN;

      if (!token) {
        throw new Error("Public intake token is required.");
      }

      const response = await fetch(`/api/public/leads/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          service: formData.get("service"),
          message: formData.get("message"),
        }),
      });

      if (!response.ok) throw new Error("Lead submission failed");

      form.reset();
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#090a0d] text-[#f6f3ec] selection:bg-[#ddff4f] selection:text-black">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(circle_at_15%_10%,rgba(221,255,79,.13),transparent_24rem),radial-gradient(circle_at_85%_35%,rgba(100,161,255,.14),transparent_28rem)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.08] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:52px_52px]" />

      <nav className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3" aria-label="RJS Digital Solution home">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ddff4f] text-sm font-black tracking-[-.08em] text-black">RJS</span>
          <span className="text-sm font-black uppercase tracking-[-.03em]">Digital<br className="sm:hidden" /> Solution</span>
        </a>
        <div className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-[.16em] text-white/55 md:flex">
          <a href="#services" className="transition hover:text-[#ddff4f]">Services</a>
          <a href="#work" className="transition hover:text-[#ddff4f]">Our approach</a>
          <a href="#consultation" className="transition hover:text-[#ddff4f]">Contact</a>
        </div>
        <a href="#consultation" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] transition hover:border-[#ddff4f] hover:bg-[#ddff4f] hover:text-black">Let&apos;s talk <ArrowRight size={13} /></a>
        <button className="ml-3 grid h-10 w-10 place-items-center rounded-full border border-white/15 md:hidden" aria-label="Open menu"><Menu size={17} /></button>
      </nav>

      <section id="top" className="relative z-10 mx-auto max-w-[1440px] px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12 lg:pb-32">
        <div className="grid items-end gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-7 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-[#ddff4f]"><span className="h-px w-9 bg-[#ddff4f]" /> Your digital growth partner</p>
            <h1 className="max-w-4xl text-[clamp(4rem,10vw,9.5rem)] font-black uppercase leading-[.78] tracking-[-.085em]">Make your<br /><span className="text-white/25">brand</span> the<br /><span className="text-[#ddff4f]">conversation.</span></h1>
            <p className="mt-9 max-w-lg text-lg leading-8 text-white/55">RJS Digital Solution helps ambitious brands earn attention, build community and turn social momentum into measurable growth.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#consultation" className="inline-flex items-center gap-3 rounded-full bg-[#ddff4f] px-6 py-4 text-xs font-black uppercase tracking-[.12em] text-black transition hover:-translate-y-1">Get a free consultation <ArrowRight size={15} /></a>
              <a href="#work" className="inline-flex items-center gap-3 rounded-full border border-white/15 px-6 py-4 text-xs font-black uppercase tracking-[.12em] text-white/75 transition hover:border-white/60 hover:text-white"><Play size={13} fill="currentColor" /> See what we do</a>
            </div>
          </div>

          <div className="relative min-h-[450px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#15181f] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(221,255,79,.8),transparent_0_18%),radial-gradient(circle_at_18%_82%,rgba(100,161,255,.55),transparent_0_23%)] opacity-80" />
            <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-white/30" />
            <div className="absolute bottom-0 left-0 h-56 w-full bg-gradient-to-t from-[#15181f] to-transparent" />
            <div className="relative flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em] text-white/60"><span>Social pulse</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[#ddff4f]">Live / 2026</span></div>
            <div className="absolute bottom-7 left-6 right-6 sm:bottom-9 sm:left-8 sm:right-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/45">Ideas that move people</p><p className="mt-3 max-w-md text-4xl font-black uppercase leading-[.9] tracking-[-.06em] sm:text-5xl">Your next big<br />thing starts here.</p><div className="mt-7 flex items-end gap-1.5">{[34, 52, 39, 75, 61, 88, 68, 95, 77, 100, 84, 91].map((height, index) => <span key={index} className="w-full rounded-t-full bg-[#ddff4f]" style={{ height: `${height}px`, opacity: 0.35 + index / 18 }} />)}</div></div>
          </div>
        </div>
      </section>

      <div className="relative z-10 overflow-hidden border-y border-white/10 bg-[#ddff4f] py-4 text-black"><div className="flex min-w-max animate-[editorialMarquee_24s_linear_infinite] gap-10 whitespace-nowrap text-xs font-black uppercase tracking-[.22em]">{Array.from({ length: 5 }).map((_, index) => <span key={index}>Strategy · Content · Community · Performance · Culture · Strategy · Content · Community · Performance · Culture</span>)}</div></div>

      <section id="services" className="relative z-10 mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-[#ddff4f]">What we build</p><h2 className="mt-6 text-5xl font-black uppercase leading-[.86] tracking-[-.07em] sm:text-7xl">More than<br /><span className="text-white/25">posts.</span></h2><p className="mt-7 max-w-sm text-base leading-7 text-white/45">A sharp social presence needs a clear idea behind it. We bring strategy, craft and performance together.</p></div><div className="divide-y divide-white/10 border-y border-white/10">{services.map(([number, title, description]) => <article key={number} className="group grid gap-5 py-7 sm:grid-cols-[64px_1fr_auto] sm:items-center sm:py-9"><span className="text-xs font-black text-[#ddff4f]">{number}</span><div><h3 className="text-2xl font-black uppercase tracking-[-.045em] sm:text-3xl">{title}</h3><p className="mt-3 max-w-xl text-sm leading-6 text-white/45">{description}</p></div><span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition group-hover:border-[#ddff4f] group-hover:bg-[#ddff4f] group-hover:text-black"><ArrowRight size={16} /></span></article>)}</div></div>
      </section>

      <section id="work" className="relative z-10 mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12"><div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-[#13161c] lg:grid-cols-2"><div className="p-7 sm:p-12"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ddff4f] text-black"><TrendingUp size={19} /></div><p className="mt-12 text-[10px] font-black uppercase tracking-[.28em] text-[#ddff4f]">Built for momentum</p><h2 className="mt-6 text-5xl font-black uppercase leading-[.88] tracking-[-.07em] sm:text-6xl">The right message.<br />In the right feed.</h2><p className="mt-7 max-w-md text-base leading-7 text-white/50">We start with what makes your audience stop scrolling, then turn that insight into an always-on content engine.</p><ul className="mt-9 space-y-4 text-sm text-white/70">{["Audience-first positioning", "Creative made for every platform", "Clear reporting, real next steps"].map((item) => <li key={item} className="flex items-center gap-3"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#ddff4f] text-black"><Check size={12} strokeWidth={3} /></span>{item}</li>)}</ul></div><div className="relative min-h-[380px] overflow-hidden bg-[#c4ff5d] text-black"><div className="absolute -left-10 top-12 h-64 w-64 rounded-full border-[18px] border-black/10" /><div className="absolute right-8 top-8 text-right text-[10px] font-black uppercase tracking-[.2em]">RJS / Signal report<br />Q3 2026</div><div className="absolute bottom-9 left-8 right-8"><p className="text-[clamp(4.5rem,10vw,8rem)] font-black leading-none tracking-[-.1em]">+214%</p><p className="mt-3 max-w-xs text-sm font-bold leading-5">Average engagement lift for brands that give their audience something worth sharing.</p></div></div></div></section>

      <section id="consultation" className="relative z-10 border-t border-white/10 bg-[#f4f0e7] px-5 py-20 text-[#101114] sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto grid max-w-[1200px] gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-24"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-[#5d7a00]">Let&apos;s make moves</p><h2 className="mt-6 text-5xl font-black uppercase leading-[.85] tracking-[-.075em] sm:text-7xl">Get a free<br />consultation.</h2><p className="mt-7 max-w-sm text-base leading-7 text-black/60">Tell us where you want to go. We&apos;ll bring a fresh perspective and a practical way to get there.</p><div className="mt-10 flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-black text-white"><Instagram size={16} /></span><span className="grid h-10 w-10 place-items-center rounded-full bg-black text-white"><Linkedin size={16} /></span></div></div>
        <form onSubmit={handleSubmit} className="grid gap-5" aria-label="Free consultation form">
          <label className="grid gap-2 text-[10px] font-black uppercase tracking-[.17em]">Your name<input required name="name" placeholder="How should we call you?" className="border-b border-black/25 bg-transparent px-0 py-3 text-base font-medium outline-none placeholder:text-black/35 focus:border-black" /></label>
          <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-[10px] font-black uppercase tracking-[.17em]">Phone<input required name="phone" type="tel" placeholder="+91 00000 00000" className="border-b border-black/25 bg-transparent px-0 py-3 text-base font-medium outline-none placeholder:text-black/35 focus:border-black" /></label><label className="grid gap-2 text-[10px] font-black uppercase tracking-[.17em]">Email<input required name="email" type="email" placeholder="you@company.com" className="border-b border-black/25 bg-transparent px-0 py-3 text-base font-medium outline-none placeholder:text-black/35 focus:border-black" /></label></div>
          <label className="grid gap-2 text-[10px] font-black uppercase tracking-[.17em]">What can we help with?<span className="relative"><select required name="service" defaultValue="" className="w-full appearance-none border-b border-black/25 bg-transparent px-0 py-3 text-base font-medium outline-none focus:border-black"><option value="" disabled>Select a service</option><option>Social media strategy</option><option>Content & creative</option><option>Paid media</option><option>Something else</option></select><ChevronDown className="pointer-events-none absolute right-0 top-3" size={17} /></span></label>
          <label className="grid gap-2 text-[10px] font-black uppercase tracking-[.17em]">Tell us a little more<textarea required name="message" rows={3} placeholder="Your business, goals or challenge..." className="resize-none border-b border-black/25 bg-transparent px-0 py-3 text-base font-medium outline-none placeholder:text-black/35 focus:border-black" /></label>
          <button type="submit" disabled={submissionState === "submitting"} className="mt-3 inline-flex w-fit items-center gap-3 rounded-full bg-black px-6 py-4 text-xs font-black uppercase tracking-[.12em] text-white transition hover:bg-[#5d7a00] disabled:cursor-not-allowed disabled:opacity-60">{submissionState === "submitting" ? "Submitting..." : "Request my consultation"} <Sparkles size={14} /></button>
          {submissionState === "success" && <p className="text-xs leading-5 text-[#4f6900]">Thanks! We&apos;ll be in touch shortly.</p>}
          {submissionState === "error" && <p className="text-xs leading-5 text-red-700">We couldn&apos;t send your request. Please try again.</p>}
        </form></div>
      </section>

      <footer className="relative z-10 bg-[#090a0d] px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 text-[10px] font-bold uppercase tracking-[.17em] text-white/35 sm:flex-row"><span>© 2026 RJS Digital Solution</span><span>Made to be noticed.</span></div></footer>
    </main>
  );
}
