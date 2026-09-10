import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Activity, ArrowUpRight, Building2, Flame, Users, UserRoundCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Business = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
  user_count: number;
  lead_count: number;
  customer_count: number;
};

type Overview = {
  businesses: number;
  active_businesses: number;
  users: number;
  leads: number;
  customers: number;
  hot_leads: number;
  business_list: Business[];
};

export default async function AdminPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_super_admin");
  if (adminError || !isAdmin) redirect("/protected");

  const { data, error } = await supabase.rpc("get_platform_overview");
  if (error || !data) {
    return <main className="leadflow-page min-h-screen px-6 py-12"><div className="mx-auto max-w-6xl"><p className="leadflow-kicker">PLATFORM CONTROL</p><h1 className="mt-3 text-5xl font-black uppercase tracking-[-.05em]">Admin unavailable</h1><p className="mt-4 text-sm text-white/40">The platform overview could not be loaded.</p></div></main>;
  }

  const overview = data as Overview;

  return <main className="leadflow-page min-h-screen px-4 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-[1500px] py-6 sm:py-8">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="leadflow-kicker">LEADFLOW / PLATFORM</p><h1 className="mt-3 text-5xl font-black uppercase leading-[.9] tracking-[-.06em] sm:text-7xl">Super Admin</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/40">One control surface for every workspace, user and revenue signal across LeadFlow.</p></div>
        <div className="border border-[#b7ff58]/25 bg-[#b7ff58]/[.05] px-4 py-3"><div className="flex items-center gap-2 text-[#b7ff58]"><UserRoundCheck size={15}/><span className="text-[10px] font-black uppercase tracking-[.18em]">Platform access verified</span></div></div>
      </header>

      <section className="mt-8 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-6">
        <Stat icon={<Building2 size={16}/>} label="Workspaces" value={overview.businesses}/>
        <Stat icon={<Activity size={16}/>} label="Active" value={overview.active_businesses}/>
        <Stat icon={<Users size={16}/>} label="Users" value={overview.users}/>
        <Stat icon={<UserRoundCheck size={16}/>} label="Customers" value={overview.customers}/>
        <Stat icon={<Activity size={16}/>} label="Leads" value={overview.leads}/>
        <Stat icon={<Flame size={16}/>} label="Hot leads" value={overview.hot_leads}/>
      </section>

      <section className="mt-8 border border-white/10 bg-[#080808]">
        <div className="flex items-end justify-between border-b border-white/10 p-5 sm:p-6"><div><p className="leadflow-kicker">TENANT CONTROL</p><h2 className="mt-2 text-2xl font-black uppercase tracking-[-.04em]">All workspaces</h2></div><span className="text-[10px] font-bold uppercase tracking-[.15em] text-white/25">{overview.businesses} total</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead><tr className="border-b border-white/10 text-[9px] font-bold uppercase tracking-[.18em] text-white/25"><th className="px-5 py-4">Workspace</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Users</th><th className="px-5 py-4">Customers</th><th className="px-5 py-4">Leads</th><th className="px-5 py-4">Created</th><th className="px-5 py-4">Action</th></tr></thead><tbody>{overview.business_list.map((business) => <tr key={business.id} className="border-b border-white/[.06] transition hover:bg-white/[.025]"><td className="px-5 py-5"><p className="font-semibold text-white/85">{business.name}</p><p className="mt-1 text-[10px] text-white/25">{business.industry || "No industry"}{business.website ? ` · ${business.website}` : ""}</p></td><td className="px-5 py-5"><span className={`border px-2 py-1 text-[8px] font-bold uppercase tracking-[.15em] ${business.is_active ? "border-[#b7ff58]/25 text-[#b7ff58]" : "border-white/10 text-white/25"}`}>{business.is_active ? "Active" : "Inactive"}</span></td><td className="px-5 py-5 text-sm font-bold">{business.user_count}</td><td className="px-5 py-5 text-sm font-bold">{business.customer_count}</td><td className="px-5 py-5 text-sm font-bold">{business.lead_count}</td><td className="px-5 py-5 text-xs text-white/35">{formatDate(business.created_at)}</td><td className="px-5 py-5"><Link href={`/admin/workspaces/${business.id}`} className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-[.14em] text-white/65 transition hover:border-[#b7ff58]/30 hover:text-[#b7ff58]">Manage <ArrowUpRight size={12}/></Link></td></tr>)}</tbody></table></div>
        {!overview.business_list.length && <div className="p-10 text-center text-xs text-white/30">No workspaces yet.</div>}
      </section>
    </div>
  </main>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="bg-[#080808] p-5"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p><span className="text-[#b7ff58]">{icon}</span></div><p className="mt-5 text-3xl font-black tracking-[-.05em]">{value.toLocaleString("en-IN")}</p></div>; }
function formatDate(value: string) { try { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; } }
