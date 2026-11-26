import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const { data: profile } = await supabase.from("users").select("business_id").eq("id",user.id).maybeSingle();
  if (!profile?.business_id) return NextResponse.json({error:"No workspace"},{status:403});
  const body = await request.json().catch(()=>null);
  if (typeof body?.lead_id !== "string") return NextResponse.json({error:"Lead ID required"},{status:400});
  const {data:lead,error} = await supabase.from("leads").select("source,product_interest,enquiry").eq("id",body.lead_id).eq("business_id",profile.business_id).is("deleted_at",null).maybeSingle();
  if(error || !lead) return NextResponse.json({error:"Lead not found"},{status:404});
  const url=process.env.ML_API_URL, key=process.env.ML_API_KEY;
  if(!url || !key) return NextResponse.json({error:"ML service not configured"},{status:503});
  try {
    const r=await fetch(url.replace(/\/$/,"")+"/predict",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key},body:JSON.stringify({source:lead.source||"unknown",product_interest:lead.product_interest||"unknown",enquiry_length:Math.min(3000,(lead.enquiry||"").length)}),signal:AbortSignal.timeout(10000),cache:"no-store"});
    if(!r.ok) return NextResponse.json({error:"ML service unavailable"},{status:502});
    const prediction=await r.json();
    // Redact common contact identifiers before sending text to the ML service.
    const message=String(lead.enquiry||"").replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,"[email]").replace(/\+?\d[\d\s().-]{7,}\d/g,"[phone]").slice(0,3000);
    let sentiment=null;
    if(message.trim()){
      try{const sr=await fetch(url.replace(/\/$/,"")+"/sentiment",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key},body:JSON.stringify({text:message}),signal:AbortSignal.timeout(10000),cache:"no-store"});if(sr.ok)sentiment=(await sr.json()).sentiment;}catch{}
    }
    return NextResponse.json({...prediction,sentiment});
  } catch {return NextResponse.json({error:"ML service unavailable"},{status:502});}
}
