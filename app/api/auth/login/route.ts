import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session || !data.user) {
      return NextResponse.json({ error: "Sign in succeeded but no session was created. Please try again." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
