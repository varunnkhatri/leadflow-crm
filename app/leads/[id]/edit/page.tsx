import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LeadEditor from "./lead-editor";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const { data: lead } = await supabase.from("leads").select("id,enquiry,product_interest,budget_raw,location,source,campaign,temperature,intent,category,requirements,timeline,recommended_next_action,human_review_required,stage,status,assigned_user_id,deal_value").eq("id", id).eq("business_id", profile.business_id).is("deleted_at", null).maybeSingle();
  if (!lead) return <main className="min-h-screen bg-[#050505] p-10 text-white"><p>Lead not found.</p><Link className="mt-4 inline-block underline" href="/leads">Back to leads</Link></main>;
  return <main className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-4xl"><Link href={`/leads/${id}`} className="text-xs uppercase tracking-[.16em] text-white/40 hover:text-[#b7ff58]">← Back to lead</Link><div className="mt-8 border-b border-white/10 pb-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b7ff58]">Lead desk / edit</p><h1 className="mt-3 text-5xl font-black tracking-[-.05em]">EDIT LEAD</h1></div><LeadEditor lead={lead} /></div></main>;
}
