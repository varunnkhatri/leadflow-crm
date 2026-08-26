"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

type Row = { id: string; name: string; enquiry: string | null; stage: string; score: number; temperature: string | null; value: number; updated: string };

const stages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON"];

export function PipelineBoard({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [activeStage, setActiveStage] = useState("ALL");
  const filtered = useMemo(() => rows.filter((row) => (!query || `${row.name} ${row.enquiry || ""}`.toLowerCase().includes(query.toLowerCase())) && (activeStage === "ALL" || row.stage.toUpperCase() === activeStage)), [rows, query, activeStage]);
  const value = filtered.reduce((sum, row) => sum + row.value, 0);

  return <div>
    <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
      <Metric label="ACTIVE" value={rows.filter((r) => r.stage.toUpperCase() !== "WON").length} detail="Live opportunities" />
      <Metric label="NEEDS ATTENTION" value={rows.filter((r) => r.score >= 80).length} detail="High-intent records" />
      <Metric label="PIPELINE VALUE" value={formatCurrency(value)} detail={`${filtered.length} visible opportunities`} />
    </div>

    <div className="mt-8 border border-white/10 bg-[#080808]">
      <div className="flex flex-col gap-4 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 border border-white/10 px-3 py-2 md:w-96"><Search size={14} className="text-white/30"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search opportunities..." className="w-full bg-transparent text-xs outline-none placeholder:text-white/25" /></div>
        <div className="flex gap-1 overflow-x-auto border border-white/10 p-1">{["ALL", ...stages].map((stage) => <button key={stage} onClick={() => setActiveStage(stage)} className={`shrink-0 px-3 py-2 text-[9px] font-bold uppercase tracking-[.14em] ${activeStage === stage ? "bg-[#b7ff58]/10 text-[#b7ff58]" : "text-white/30 hover:text-white"}`}>{stage}</button>)}</div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        {(activeStage === "ALL" ? stages : [activeStage]).map((stage) => <section key={stage} className="min-w-0 border border-white/10 bg-[#050505]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">{stage}</p><p className="mt-1 text-lg font-black">{filtered.filter((r) => r.stage.toUpperCase() === stage).length}</p></div><span className="h-2 w-2 bg-[#b7ff58]" /></div>
          <div className="space-y-2 p-2">{filtered.filter((r) => r.stage.toUpperCase() === stage).map((row) => <Link key={row.id} href={`/leads/${row.id}`} className="block border border-white/[.08] bg-[#0a0a0a] p-3 transition hover:border-[#b7ff58]/30 hover:bg-white/[.025]"><div className="flex items-start justify-between gap-3"><p className="truncate text-xs font-semibold text-white/80">{row.name}</p><span className="text-sm font-black text-[#b7ff58]">{row.score}</span></div><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/30">{row.enquiry || "No enquiry text"}</p><div className="mt-3 flex items-center justify-between text-[9px] text-white/25"><span>{row.temperature || "NEW"}</span><span>{row.value ? formatCurrency(row.value) : "No value"}</span></div></Link>)}{!filtered.some((r) => r.stage.toUpperCase() === stage) && <p className="p-5 text-center text-[10px] text-white/20">Nothing here yet.</p>}</div>
        </section>)}
      </div>
      {!filtered.length && <div className="border-t border-white/10 p-12 text-center text-xs text-white/30">No opportunities match this view.</div>}
    </div>

    <div className="mt-8 border border-white/10 bg-[#f4f0e7] p-6 text-black"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-black/40">Pipeline rule</p><p className="mt-2 text-xl font-black uppercase tracking-[-.03em]">Every card should have a next move.</p><p className="mt-1 max-w-xl text-xs leading-5 text-black/55">Open a lead to see its score, customer context and AI recommendation instead of treating the pipeline as a static spreadsheet.</p></div><Link href="/leads" className="leadflow-button leadflow-button-primary">Open lead desk <ArrowUpRight size={13}/></Link></div></div>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <div className="bg-[#080808] p-5"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p><p className="mt-3 text-3xl font-black tracking-[-.04em]">{value}</p><p className="mt-1 text-[10px] text-white/30">{detail}</p></div>; }
function formatCurrency(value: number) { return `₹${Math.round(value).toLocaleString("en-IN")}`; }
