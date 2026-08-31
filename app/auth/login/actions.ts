"use server";

import { createClient } from "@/lib/supabase/server";

export async function loginAction(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) return { error: error.message };
  if (!data.session || !data.user) return { error: "Sign in succeeded but no session was created. Please try again." };

  return { ok: true };
}
