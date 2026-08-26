"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, BarChart3, Bot, BriefcaseBusiness, CheckSquare, ChevronRight, Command, ContactRound, Inbox, LayoutDashboard, Megaphone, MessageSquare, Search, Sparkles, UsersRound } from "lucide-react";

const items = [
  ["Dashboard", "/protected", LayoutDashboard],
  ["Leads", "/leads", UsersRound],
  ["Pipeline", "/pipeline", BriefcaseBusiness],
  ["Customers", "/customers", ContactRound],
  ["Conversations", "/conversations", MessageSquare],
  ["Tasks", "/tasks", CheckSquare],
  ["AI Agents", "/ai-agents", Bot],
  ["Campaigns", "/campaigns", Megaphone],
  ["Analytics", "/analytics", BarChart3],
  ["Integrations", "/integrations", Command],
] as const;

export function WorkspaceShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const filtered = items.filter(([label]) => label.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="leadflow-page">
      <div className="leadflow-shell px-4 sm:px-6 lg:px-10">
        <header className="leadflow-topline flex min-h-20 items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center bg-[#f4f0e7] text-sm font-black text-black">L</span>
            <span className="text-sm font-black tracking-[.14em]">LEADFLOW</span>
            <span className="hidden text-[9px] uppercase tracking-[.28em] text-white/35 sm:block">REVENUE OS / 01</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/auth/logout" className="hidden text-[10px] font-bold uppercase tracking-[.16em] text-white/45 hover:text-white sm:block">Sign out</a>
            <a href="/protected" className="leadflow-button leadflow-button-primary">Workspace <ArrowUpRight size={14}/></a>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-80px)] lg:grid-cols-[230px_1fr]">
          <aside className="border-r border-white/10 py-8 pr-6">
            <p className="leadflow-kicker mb-5">Revenue desk</p>
            <div className="mb-6 flex items-center gap-2 border border-white/10 bg-white/[.02] px-3 py-2">
              <Search size={14} className="text-white/35"/>
              <input aria-label="Filter navigation" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a section" className="w-full bg-transparent text-xs outline-none placeholder:text-white/25" />
            </div>
            <nav className="space-y-1">
              {filtered.map(([label, href, Icon]) => {
                const active = pathname === href || (href !== "/protected" && pathname.startsWith(href));
                return <a key={href} href={href} data-active={active} className="workspace-nav-link flex items-center gap-3 px-3 py-3 text-xs font-semibold text-white/45"><Icon size={15}/><span>{label}</span>{label === "AI Agents" && <span className="ml-auto text-[9px] text-[#b7ff58]">03</span>} {active && <ChevronRight size={13} className="ml-auto"/>}</a>;
              })}
            </nav>
            <div className="mt-10 border-t border-white/10 pt-6">
              <button onClick={() => setNotice("AI assistant is ready — connect an agent to begin.")} className="w-full border border-[#b7ff58]/25 bg-[#b7ff58]/[.05] p-4 text-left transition hover:border-[#b7ff58]/60">
                <div className="flex items-center gap-2 text-[#b7ff58]"><Sparkles size={14}/><span className="text-[10px] font-bold uppercase tracking-[.14em]">AI is working</span></div>
                <p className="mt-2 text-[10px] leading-4 text-white/40">Your revenue desk is ready for the next move.</p>
              </button>
            </div>
          </aside>

          <section className="min-w-0 px-5 py-8 sm:px-8 lg:px-12">
            <div className="mb-10 flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
              <div>
                {eyebrow && <p className="leadflow-kicker mb-3">{eyebrow}</p>}
                <h1 className="leadflow-title text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setNotice("Search is ready — use the section filter on the left or open Leads for lead search.")} className="leadflow-button"><Inbox size={14}/> Search</button>
                <button onClick={() => setNotice("Action created. Connect the relevant integration to automate it.")} className="leadflow-button leadflow-button-primary"><Sparkles size={14}/> New action</button>
              </div>
            </div>

            {notice && <button onClick={() => setNotice(null)} className="mb-6 w-full border border-[#b7ff58]/30 bg-[#b7ff58]/[.06] px-4 py-3 text-left text-xs text-[#d9ff9a]">{notice} <span className="float-right opacity-50">dismiss</span></button>}
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
