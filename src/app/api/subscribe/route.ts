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
  first_name?: string;
  cash_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  purchase_cost: number;
  months_cushion: string;
  money_health_zone: string;
};

const ZAPIER_WEBHOOK_URL = sanitizeString(process.env.ZAPIER_WEBHOOK_URL);

// Debug: Log environment variable status (remove in production)
if (process.env.NODE_ENV !== "production") {
  console.log("ZAPIER_WEBHOOK_URL from env:", process.env.ZAPIER_WEBHOOK_URL);
  console.log("ZAPIER_WEBHOOK_URL sanitized:", ZAPIER_WEBHOOK_URL);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

  // Validate cushionMonths - ensure it's a valid finite number (negative values are allowed)
  if (
    typeof payload.cushionMonths !== "number" ||
    !Number.isFinite(payload.cushionMonths) ||
    Number.isNaN(payload.cushionMonths)
  ) {
    console.error("Invalid cushionMonths:", payload.cushionMonths, typeof payload.cushionMonths);
    return NextResponse.json(
      { error: "Cushion months must be a valid number." },
      { status: 400 },
    );
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
      first_name: firstName,
      cash_balance: normalizedInputs.cashBalance,
      monthly_income: normalizedInputs.monthlyIncome,
      monthly_expenses: normalizedInputs.monthlyExpenses,
      purchase_cost: normalizedInputs.purchaseCost,
      months_cushion: summary.cushionMonths.toFixed(1),
      money_health_zone: summary.zone,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("subscribe.zapier", error);
    return NextResponse.json(
      { error: "We couldn't reach the email service. Please try again soon." },
      { status: 502 },
    );
  }
}
