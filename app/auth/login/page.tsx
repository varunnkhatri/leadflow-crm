import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="leadflow-auth">
      <header className="relative z-10 flex min-h-20 items-center justify-between border-b border-white/10 px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center bg-[#f4f0e7] font-black text-black">L</span><span className="text-sm font-black tracking-[.14em]">LEADFLOW</span><span className="hidden text-[9px] uppercase tracking-[.28em] text-white/35 sm:block">REVENUE OS / 01</span></Link>
        <Link href="/auth/sign-up" className="leadflow-button leadflow-button-primary">Start free</Link>
      </header>
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-80px)] w-full max-w-[1200px] items-center justify-between gap-16 px-6 py-12 lg:px-10">
        <div className="hidden max-w-xl lg:block"><p className="leadflow-kicker">THE INTELLIGENT LEAD DESK</p><h1 className="leadflow-title mt-5 text-7xl xl:text-8xl">LEADS<br/><span className="text-white/30">IN.</span><br/><span className="leadflow-accent">REVENUE</span><br/>OUT.</h1><p className="mt-8 max-w-md text-lg leading-7 text-white/45">Your CRM should turn every enquiry into a clear next move.</p></div>
        <div className="leadflow-auth-card"><p className="leadflow-kicker">01 / WORKSPACE ACCESS</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em]">Enter LeadFlow.</h2><p className="mt-2 mb-7 text-xs text-white/40">Sign in to your revenue desk.</p><LoginForm /></div>
      </div>
    </main>
  );
}
