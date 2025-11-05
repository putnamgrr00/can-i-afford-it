import { NextResponse } from "next/server";

import {
  type PlannerInputs,
  type PlannerSnapshot,
  isValidPlannerInputs,
  normalizePlannerInputs,
  sanitizeString,
} from "@/lib/planner";

type SubscribeRequest = {
  email: string;
  firstName?: string;
} & PlannerSnapshot;

type ZapierPayload = {
  email: string;
  firstName?: string;
  zone: string;
  cushionMonths: string;
  inputs: PlannerInputs;
};

const ZAPIER_WEBHOOK_URL = sanitizeString(process.env.ZAPIER_WEBHOOK_URL);

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

async function sendZapierWebhook(url: string, payload: ZapierPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Zapier responded with ${response.status}: ${message}`);
  }
}

export async function POST(request: Request) {
  if (!ZAPIER_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Zapier webhook is not configured. Add ZAPIER_WEBHOOK_URL." },
      { status: 500 },
    );
  }

  let payload: SubscribeRequest;

  try {
    payload = (await request.json()) as SubscribeRequest;
  } catch (error) {
    console.error("subscribe.parse", error);
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = sanitizeString(payload.email);

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const firstName = sanitizeString(payload.firstName);
  const zone = sanitizeString(payload.zone);

  if (!zone) {
    return NextResponse.json({ error: "Money health zone is required." }, { status: 400 });
  }

  if (!isNonNegativeFiniteNumber(payload.cushionMonths)) {
    return NextResponse.json({ error: "Cushion months must be a valid number." }, { status: 400 });
  }

  if (!isValidPlannerInputs(payload.inputs)) {
    return NextResponse.json({ error: "Planner inputs are invalid." }, { status: 400 });
  }

  const normalizedInputs = normalizePlannerInputs(payload.inputs);

  const summary = {
    zone,
    cushionMonths: payload.cushionMonths,
    inputs: normalizedInputs,
  };

  try {
    await sendZapierWebhook(ZAPIER_WEBHOOK_URL, {
      email,
      firstName,
      zone: summary.zone,
      cushionMonths: summary.cushionMonths.toFixed(1),
      inputs: summary.inputs,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("subscribe.zapier", error);
    return NextResponse.json(
      { error: "We couldn’t reach the email service. Please try again soon." },
      { status: 502 },
    );
  }
}
