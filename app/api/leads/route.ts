import { NextResponse } from "next/server";

type LeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadPayload;

    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const email = body.email?.trim();
    const service = body.service?.trim();
    const message = body.message?.trim();

    if (!name || !phone || !email || !service || !message) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name is too long." },
        { status: 400 }
      );
    }

    if (message.length > 3000) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.N8N_LEAD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "Lead service is not configured." },
        { status: 500 }
      );
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        email,
        message,
        requested_service: service,
        source: "website",
      }),
    });

    if (!n8nResponse.ok) {
      return NextResponse.json(
        { error: "Unable to process your enquiry." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}