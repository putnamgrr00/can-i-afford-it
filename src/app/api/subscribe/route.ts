import { NextResponse } from "next/server";

type SubscribeRequest = Record<string, unknown> & {
  email?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const payload: Record<string, unknown> = { ...data, email };

  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("ZAPIER_WEBHOOK_URL is not configured");
    return NextResponse.json(
      {
        error:
          "We’re unable to save your submission right now. Please contact support while we look into it.",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(webhookUrl, {
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
