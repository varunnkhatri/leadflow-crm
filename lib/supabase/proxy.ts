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

  if (!isAuthPath && !isPublicPath) {
    const { data: claimsData } = await supabase.auth.getClaims();

    // If the normal SSR cookie was not persisted by the preceding login
    // request, recover the server-side session from the short-lived fallback
    // cookies written by loginAction, then let Supabase SSR write its normal
    // auth cookie pair into the response.
    if (!claimsData?.claims) {
      const accessToken = request.cookies.get("leadflow_access_token")?.value;
      const refreshToken = request.cookies.get("leadflow_refresh_token")?.value;
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    }
  }

  return supabaseResponse;
}
