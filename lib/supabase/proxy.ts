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
          // Keep the request cookies in sync so the current request can see
          // the refreshed session immediately.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // Re-create the response after mutating request cookies. This is
          // important with Next.js Proxy + @supabase/ssr; otherwise the
          // browser can receive stale/missing auth cookies and bounce back
          // to /auth/login after a successful sign-in.
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

  // Authentication pages/endpoints must be reachable without a session.
  if (!isAuthPath) {
    const { data } = await supabase.auth.getClaims();
    const user = data?.claims;

    if (pathname !== "/" && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
