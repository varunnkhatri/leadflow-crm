import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: token, error } = await supabase.rpc("get_my_public_intake_token");
  if (error || !token) {
    return NextResponse.json({ error: "Public intake is not available for this workspace." }, { status: 404 });
  }

  return NextResponse.json({
    endpoint: new URL(`/api/public/leads/${token}`, request.url).toString(),
    token,
  });
}
