"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setWorkspaceActive(id: string, isActive: boolean, _formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_super_admin");
  if (adminError || !isAdmin) throw new Error("forbidden");

  const { error } = await supabase.rpc("set_platform_workspace_active", {
    p_business_id: id,
    p_is_active: isActive,
  });

  if (error) throw new Error("update_failed");

  revalidatePath("/admin");
  revalidatePath(`/admin/workspaces/${id}`);
}
