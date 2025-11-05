import { NextResponse } from "next/server";

type SubscribeRequest = Record<string, unknown> & {
  email?: unknown;
};

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

if (!ZAPIER_WEBHOOK_URL) {
  throw new Error("ZAPIER_WEBHOOK_URL is not configured");
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractPayload(data: SubscribeRequest) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    payload[key] = value;
  }

  return payload;
}

export async function POST(request: Request) {
  let data: SubscribeRequest;

  try {
    data = await request.json();
  } catch (error) {
    console.error("Failed to parse subscription payload", error);
    return NextResponse.json(
      { error: "Invalid JSON body supplied." },
      { status: 400 }
    );
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";

  if (!email || !emailPattern.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  const payload = extractPayload(data);
  payload.email = email;

  try {
    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error("Zapier webhook failed", {
        status: response.status,
        body: responseText,
      });
      return NextResponse.json(
        { error: "We couldn’t save your submission. Please try again." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Unexpected error calling Zapier webhook", error);
    return NextResponse.json(
      {
        error: "We ran into an issue while saving your submission. Please try again shortly.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: "Thanks! You’re on the list." });
}
