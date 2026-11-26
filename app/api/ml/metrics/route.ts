import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(){
 const s=await createClient();
 const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const url=process.env.ML_API_URL,key=process.env.ML_API_KEY;
 if(!url||!key)return NextResponse.json({error:"ML service not configured"},{status:503});
 try{const r=await fetch(url.replace(/\/$/,"")+"/metrics",{headers:{"x-api-key":key},cache:"no-store",signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();return NextResponse.json(await r.json());}catch{return NextResponse.json({error:"Metrics unavailable"},{status:502});}
}
