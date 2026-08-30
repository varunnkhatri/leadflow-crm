import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasEnvVars) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers ?? {}).forEach(([name, value]) => {
            if (value) supabaseResponse.headers.set(name, value);
          });
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const isAuthPath = pathname.startsWith("/auth") || pathname.startsWith("/api/auth");
  const isPublicPath = pathname === "/";

  // Refresh/synchronize the Supabase SSR session before any protected
  // Server Component reads it. The protected page remains responsible for
  // the authoritative getUser() authorization check.
  if (!isAuthPath && !isPublicPath) {
    await supabase.auth.getClaims();
  }

  return supabaseResponse;
}
