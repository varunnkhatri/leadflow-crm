import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import Link from "next/link";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#d9ff62]/[0.035] blur-[110px]" />
        <div className="absolute right-[-12rem] top-1/3 h-[32rem] w-[32rem] rounded-full bg-cyan-300/[0.025] blur-[120px]" />
      </div>

      <nav className="relative z-40 border-b border-white/[0.07] bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center bg-gradient-to-br from-[#e6ff86] via-[#9dff75] to-[#62d8ff] text-sm font-black text-black transition-transform group-hover:rotate-3">L</span>
            <span className="text-sm font-black tracking-[0.14em]">LEADFLOW</span>
            <span className="hidden text-[9px] uppercase tracking-[0.28em] text-slate-600 sm:block">Revenue OS</span>
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
