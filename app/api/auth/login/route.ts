import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // The login endpoint must own the response that receives Supabase's
    // session cookies. Using the shared server client here can authenticate
    // successfully while leaving the Set-Cookie handoff ambiguous.
    const response = NextResponse.json({ ok: true });
    response.headers.set("Cache-Control", "private, no-store");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: "Sign in succeeded but no session was created. Please try again." },
        { status: 401 },
      );
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
