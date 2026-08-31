"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) return { error: error.message };
  if (!data.session || !data.user) return { error: "Sign in succeeded but no session was created. Please try again." };

  // Keep a server-only fallback session handoff. The proxy converts these
  // into the normal Supabase SSR cookies on the next request. This protects
  // against Next.js/RSC cookie handoff differences across deployments.
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const common = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  cookieStore.set("leadflow_access_token", data.session.access_token, { ...common, maxAge: 60 * 60 });
  cookieStore.set("leadflow_refresh_token", data.session.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });

  return { ok: true };
}
