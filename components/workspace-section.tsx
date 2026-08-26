"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Filter, Plus, Search, Zap } from "lucide-react";

const sampleRows = [
  ["Acme Industries", "High intent", "94", "Today"],
  ["Northstar Studio", "Proposal", "87", "2h ago"],
  ["Vertex Labs", "Contacted", "78", "Yesterday"],
  ["Brightline Co.", "New", "71", "Yesterday"],
];

export function WorkspaceSection({ kind }: { kind: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [created, setCreated] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const rows = useMemo(() => sampleRows.filter((r) => r[0].toLowerCase().includes(search.toLowerCase()) && (filter === "All" || r[1] === filter)), [search, filter]);

  const filters = kind === "Pipeline" ? ["All", "New", "Contacted", "Proposal"] : ["All", "High intent", "Proposal", "New"];

  return <div>
    <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
      {["ACTIVE", "NEEDS ATTENTION", "AUTOMATIONS"].map((label, i) => <div key={label} className="bg-[#080808] p-5"><p className="text-[9px] uppercase tracking-[.2em] text-white/35">{label}</p><p className="mt-3 text-3xl font-black tracking-[-.04em]">{i === 0 ? rows.length + created : i === 1 ? 2 : 3}</p><p className="mt-1 text-[10px] text-white/35">Live workspace signal</p></div>)}
    </div>

    <div className="mt-8 border border-white/10 bg-[#080808]">
      <div className="flex flex-col gap-4 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 border border-white/10 px-3 py-2 md:w-80"><Search size={14} className="text-white/35"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${kind.toLowerCase()}...`} className="w-full bg-transparent text-xs outline-none placeholder:text-white/25"/></div>
        <div className="flex flex-wrap gap-2"><div className="flex items-center gap-1 border border-white/10 px-2"><Filter size={12} className="text-white/35"/>{filters.map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-2 py-2 text-[9px] uppercase tracking-wider ${filter === f ? "text-[#b7ff58]" : "text-white/35"}`}>{f}</button>)}</div><button onClick={() => setCreated((v) => v + 1)} className="leadflow-button leadflow-button-primary"><Plus size={13}/> Add</button></div>
      </div>
      <div className="grid grid-cols-[1.5fr_1fr_.5fr_.7fr] border-b border-white/10 px-4 py-3 text-[9px] font-bold uppercase tracking-[.16em] text-white/30"><span>Name</span><span>Stage</span><span>Score</span><span>Updated</span></div>
      {rows.map((row) => <button key={row[0]} onClick={() => setSelected(row[0])} className="grid w-full grid-cols-[1.5fr_1fr_.5fr_.7fr] border-b border-white/[.07] px-4 py-4 text-left hover:bg-white/[.025]"><span className="font-semibold text-white/80">{row[0]}</span><span className="text-xs text-white/45">{row[1]}</span><span className="text-xs font-bold text-[#b7ff58]">{row[2]}</span><span className="text-xs text-white/35">{row[3]}</span></button>)}
      {!rows.length && <div className="p-10 text-center text-xs text-white/35">No records match this view.</div>}
    </div>

    {selected && <div className="mt-5 border border-[#b7ff58]/25 bg-[#b7ff58]/[.04] p-5"><div className="flex items-start justify-between gap-4"><div><p className="leadflow-kicker">Selected record</p><h2 className="mt-2 text-2xl font-black">{selected}</h2><p className="mt-2 text-xs text-white/40">This action is wired to the workspace selection state.</p></div><button onClick={() => setSelected(null)} className="text-xs text-white/35 hover:text-white">Close</button></div><button onClick={() => setSelected(null)} className="mt-5 leadflow-button leadflow-button-primary">Continue <ArrowRight size={14}/></button></div>}

    <div className="mt-8 border border-white/10 p-5"><div className="flex items-center gap-3"><Zap size={15} className="text-[#b7ff58]"/><p className="text-xs font-bold">{kind} is connected to the LeadFlow workspace shell.</p></div><p className="mt-2 text-[10px] leading-5 text-white/35">Navigation, search, filters, selection and add actions are now real client interactions rather than decorative buttons.</p></div>
  </div>;
}
