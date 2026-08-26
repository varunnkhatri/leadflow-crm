import Link from "next/link";
import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <main className="leadflow-auth">
      <header className="relative z-10 flex min-h-20 items-center justify-between border-b border-white/10 px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center bg-[#f4f0e7] font-black text-black">L</span><span className="text-sm font-black tracking-[.14em]">LEADFLOW</span><span className="hidden text-[9px] uppercase tracking-[.28em] text-white/35 sm:block">REVENUE OS / 01</span></Link>
        <Link href="/auth/login" className="text-[10px] font-bold uppercase tracking-[.16em] text-white/45 hover:text-white">Sign in</Link>
      </header>
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-80px)] w-full max-w-[1200px] items-center justify-between gap-16 px-6 py-12 lg:px-10">
        <div className="hidden max-w-xl lg:block"><p className="leadflow-kicker">BUILD YOUR REVENUE DESK</p><h1 className="leadflow-title mt-5 text-7xl xl:text-8xl">LEADS<br/><span className="leadflow-accent">IN.</span><br/>REVENUE<br/>OUT.</h1></div>
        <div className="leadflow-auth-card"><p className="leadflow-kicker">01 / CREATE WORKSPACE</p><h2 className="mt-3 mb-7 text-3xl font-black tracking-[-.04em]">Start free.</h2><SignUpForm /></div>
      </div>
    </main>
  );
}
