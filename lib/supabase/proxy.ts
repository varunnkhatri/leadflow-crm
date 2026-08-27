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

  // Let /protected perform the authoritative server-side getUser() check.
  // This avoids a proxy-level getClaims() decision bouncing a valid login
  // back to /auth/login before the page can read the session cookie.
  if (!isAuthPath && pathname !== "/" && pathname !== "/protected") {
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
