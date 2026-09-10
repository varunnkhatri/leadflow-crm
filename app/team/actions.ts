"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function inviteTeamMember(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data: profile } = await supabase.from("users").select("business_id,role,platform_role").eq("id", user.id).maybeSingle();
  if (!profile?.business_id || !["OWNER","ADMIN"].includes(profile.role)) throw new Error("forbidden");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("unauthorized");
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/team-invite`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ full_name: String(formData.get("full_name") || ""), email: String(formData.get("email") || ""), role: String(formData.get("role") || "") }) });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || "invite_failed"); }
  revalidatePath("/team");
}

export async function setTeamUserRole(userId: string, formData: FormData): Promise<void> {
  const role = String(formData.get("role") || "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { error } = await supabase.rpc("set_workspace_user_role", { p_user_id: userId, p_role: role });
  if (error) throw new Error("update_failed");
  revalidatePath("/team");
}

export async function setTeamUserActive(userId: string, isActive: boolean, _formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { error } = await supabase.rpc("set_workspace_user_active", { p_user_id: userId, p_is_active: isActive });
  if (error) throw new Error("update_failed");
  revalidatePath("/team");
}
