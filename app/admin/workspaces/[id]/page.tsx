import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Activity, ArrowLeft, Building2, Flame, Globe, Mail, Users, UserRoundCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type User = { id: string; email: string; full_name: string | null; role: string; is_active: boolean; created_at: string; onboarding_completed: boolean };
type Lead = { id: string; enquiry: string | null; temperature: string | null; stage: string | null; status: string | null; deal_value: number | null; created_at: string };
type WorkspaceDetail = { business: { id: string; name: string; industry: string | null; website: string | null; is_active: boolean; created_at: string; }; users: User[]; customer_count: number; lead_count: number; hot_lead_count: number; recent_leads: Lead[] };

export default async function WorkspaceAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_super_admin");
  if (adminError || !isAdmin) redirect("/protected");

  const { data, error } = await supabase.rpc("get_platform_workspace_detail", { p_business_id: id });
  if (error || !data) notFound();
  const detail = data as WorkspaceDetail;
  const business = detail.business;

  return <main className="leadflow-page min-h-screen px-4 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-[1500px] py-6 sm:py-8">
      <Link href="/admin" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/35 transition hover:text-[#b7ff58]"><ArrowLeft size={13}/> Back to platform</Link>

      <header className="mt-7 flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="leadflow-kicker">WORKSPACE / {business.is_active ? "ACTIVE" : "INACTIVE"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4"><h1 className="text-5xl font-black uppercase leading-[.9] tracking-[-.06em] sm:text-7xl">{business.name}</h1><span className={`border px-3 py-2 text-[9px] font-bold uppercase tracking-[.15em] ${business.is_active ? "border-[#b7ff58]/25 text-[#b7ff58]" : "border-white/10 text-white/30"}`}>{business.is_active ? "Active" : "Inactive"}</span></div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/35"><span className="inline-flex items-center gap-2"><Building2 size={13}/>{business.industry || "No industry"}</span>{business.website && <span className="inline-flex items-center gap-2"><Globe size={13}/>{business.website}</span>}</div>
        </div>
        <div className="text-[10px] uppercase tracking-[.14em] text-white/25">Created {formatDate(business.created_at)}</div>
      </header>

      <section className="mt-8 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Users size={16}/>} label="Users" value={detail.users.length}/>
        <Stat icon={<UserRoundCheck size={16}/>} label="Customers" value={detail.customer_count}/>
        <Stat icon={<Activity size={16}/>} label="Leads" value={detail.lead_count}/>
        <Stat icon={<Flame size={16}/>} label="Hot leads" value={detail.hot_lead_count}/>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.35fr]">
        <section className="border border-white/10 bg-[#080808]">
          <div className="border-b border-white/10 p-5 sm:p-6"><p className="leadflow-kicker">TEAM</p><h2 className="mt-2 text-2xl font-black uppercase tracking-[-.04em]">Workspace users</h2></div>
          <div>{detail.users.map((member) => <div key={member.id} className="border-b border-white/[.06] p-5 last:border-0"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-white/85">{member.full_name || "Unnamed user"}</p><p className="mt-1 flex items-center gap-2 text-xs text-white/30"><Mail size={12}/>{member.email}</p></div><span className="border border-white/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[.14em] text-white/45">{member.role}</span></div><div className="mt-3 flex gap-3 text-[9px] font-bold uppercase tracking-[.12em] text-white/25"><span>{member.is_active ? "Active" : "Inactive"}</span><span>{member.onboarding_completed ? "Onboarded" : "Pending onboarding"}</span></div></div>)}{!detail.users.length && <div className="p-8 text-center text-xs text-white/30">No users.</div>}</div>
        </section>

        <section className="border border-white/10 bg-[#080808]">
          <div className="flex items-end justify-between border-b border-white/10 p-5 sm:p-6"><div><p className="leadflow-kicker">CRM SIGNAL</p><h2 className="mt-2 text-2xl font-black uppercase tracking-[-.04em]">Recent leads</h2></div><span className="text-[10px] font-bold uppercase tracking-[.14em] text-white/25">{detail.lead_count} total</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-white/10 text-[9px] font-bold uppercase tracking-[.18em] text-white/25"><th className="px-5 py-4">Enquiry</th><th className="px-5 py-4">Temperature</th><th className="px-5 py-4">Stage</th><th className="px-5 py-4">Value</th><th className="px-5 py-4">Created</th></tr></thead><tbody>{detail.recent_leads.map((lead) => <tr key={lead.id} className="border-b border-white/[.06]"><td className="max-w-[280px] px-5 py-5"><p className="truncate text-sm font-semibold text-white/75">{lead.enquiry || "No enquiry"}</p></td><td className="px-5 py-5"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/50">{lead.temperature || "—"}</span></td><td className="px-5 py-5 text-xs text-white/40">{lead.stage || "—"}</td><td className="px-5 py-5 text-xs text-white/50">{lead.deal_value != null ? `₹${Number(lead.deal_value).toLocaleString("en-IN")}` : "—"}</td><td className="px-5 py-5 text-xs text-white/30">{formatDate(lead.created_at)}</td></tr>)}</tbody></table></div>{!detail.recent_leads.length && <div className="p-8 text-center text-xs text-white/30">No leads yet.</div>}
        </section>
      </div>
    </div>
  </main>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="bg-[#080808] p-5"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p><span className="text-[#b7ff58]">{icon}</span></div><p className="mt-5 text-3xl font-black tracking-[-.05em]">{value.toLocaleString("en-IN")}</p></div>; }
function formatDate(value: string) { try { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; } }
