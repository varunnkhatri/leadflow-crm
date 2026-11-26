import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";
import Lab from "./lab";
export default async function Page(){
 const s=await createClient();
 const {data:{user}}=await s.auth.getUser();
 if(!user) redirect("/auth/login");
 const {data:p}=await s.from("users").select("business_id").eq("id",user.id).maybeSingle();
 if(!p?.business_id) redirect("/protected");
 const {data}=await s.from("leads").select("id,enquiry").eq("business_id",p.business_id).is("deleted_at",null).limit(100);
 return <WorkspaceShell title="ML LAB" eyebrow="Academic prototype"><Lab leads={(data??[]).map(x=>({id:String(x.id),label:String(x.enquiry||x.id).slice(0,100)}))}/></WorkspaceShell>;
}
