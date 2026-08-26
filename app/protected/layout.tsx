import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ProtectedActionBridge } from "@/components/protected-action-bridge";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import Link from "next/link";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <ProtectedActionBridge />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#b7ff58]/[0.025] blur-[110px]" />
        <div className="absolute right-[-12rem] top-1/3 h-[32rem] w-[32rem] rounded-full bg-[#72e8cf]/[0.02] blur-[120px]" />
      </div>

      <nav className="relative z-40 border-b border-white/[0.10] bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center bg-[#f4f0e7] text-sm font-black text-black transition-transform group-hover:-translate-y-0.5">L</span>
            <span className="text-sm font-black tracking-[0.14em]">LEADFLOW</span>
            <span className="hidden text-[9px] uppercase tracking-[0.28em] text-slate-500 sm:block">Revenue OS / 01</span>
          </Link>
          <div className="flex items-center gap-2">
            {!hasEnvVars ? <EnvVarWarning /> : <Suspense><AuthButton /></Suspense>}
          </div>
        </div>
      </nav>
      <div className="relative z-10">{children}</div>
    </main>
  );
}
