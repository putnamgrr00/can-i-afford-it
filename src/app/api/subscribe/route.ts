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

type ConvertKitResponse = {
  subscription_id?: number;
  message?: string;
};

const CONVERTKIT_BASE_URL = process.env.CONVERTKIT_BASE_URL ?? "https://api.convertkit.com/v3";
const ZAPIER_WEBHOOK_URL = sanitizeString(process.env.ZAPIER_WEBHOOK_URL);

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

type ZapierPayload = {
  email: string;
  firstName?: string;
  zone: string;
  cushionMonths: string;
  inputs: PlannerInputs;
  subscriptionId: number | null;
};

async function sendZapierWebhook(url: string, payload: ZapierPayload) {
  try {
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

    return { ok: true as const };
  } catch (error) {
    console.error("subscribe.zapier", error);
    return { ok: false as const };
  }
}

export async function POST(request: Request) {
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

  const apiKey = process.env.CONVERTKIT_API_KEY;
  const formId = process.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    return NextResponse.json(
      { error: "ConvertKit is not configured. Add CONVERTKIT_API_KEY and CONVERTKIT_FORM_ID." },
      { status: 500 },
    );
  }

  const summary = {
    zone,
    cushionMonths: payload.cushionMonths,
    inputs: normalizedInputs,
  };

  const body = {
    api_key: apiKey,
    email,
    first_name: firstName,
    fields: {
      money_health_zone: summary.zone,
      cushion_months: summary.cushionMonths.toFixed(1),
      cash_balance: summary.inputs.cashBalance.toString(),
      monthly_income: summary.inputs.monthlyIncome.toString(),
      monthly_expenses: summary.inputs.monthlyExpenses.toString(),
      purchase_cost: summary.inputs.purchaseCost.toString(),
    },
  };

  try {
    const response = await fetch(`${CONVERTKIT_BASE_URL}/forms/${formId}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      console.error("subscribe.convertkit", response.status, errorMessage);
      return NextResponse.json(
        { error: "Unable to subscribe right now. Please try again soon." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as ConvertKitResponse;

    let zapier: Awaited<ReturnType<typeof sendZapierWebhook>> | undefined;

    if (ZAPIER_WEBHOOK_URL) {
      zapier = await sendZapierWebhook(ZAPIER_WEBHOOK_URL, {
        email,
        firstName,
        zone: summary.zone,
        cushionMonths: summary.cushionMonths.toFixed(1),
        inputs: summary.inputs,
        subscriptionId: data.subscription_id ?? null,
      });
    }

    return NextResponse.json({ success: true, data, zapier });
  } catch (error) {
    console.error("subscribe.fetch", error);
    return NextResponse.json(
      { error: "Unable to reach ConvertKit. Please try again in a moment." },
      { status: 502 },
    );
  }
}
