import { NextResponse } from "next/server";

type SubscribeRequest = {
  email: string;
  firstName?: string;
  zone: string;
  cushionMonths: number;
  inputs: {
    cashBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    purchaseCost: number;
  };
};

type ConvertKitResponse = {
  subscription_id?: number;
  message?: string;
};

const CONVERTKIT_BASE_URL = process.env.CONVERTKIT_BASE_URL ?? "https://api.convertkit.com/v3";

export async function POST(request: Request) {
  let payload: SubscribeRequest;

  try {
    payload = (await request.json()) as SubscribeRequest;
  } catch (error) {
    console.error("subscribe.parse", error);
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!payload.email || typeof payload.email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const apiKey = process.env.CONVERTKIT_API_KEY;
  const formId = process.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    return NextResponse.json(
      { error: "ConvertKit is not configured. Add CONVERTKIT_API_KEY and CONVERTKIT_FORM_ID." },
      { status: 500 },
    );
  }

  const body = {
    api_key: apiKey,
    email: payload.email,
    first_name: payload.firstName,
    fields: {
      money_health_zone: payload.zone,
      cushion_months: payload.cushionMonths.toFixed(1),
      cash_balance: payload.inputs.cashBalance.toString(),
      monthly_income: payload.inputs.monthlyIncome.toString(),
      monthly_expenses: payload.inputs.monthlyExpenses.toString(),
      purchase_cost: payload.inputs.purchaseCost.toString(),
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

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("subscribe.fetch", error);
    return NextResponse.json(
      { error: "Unable to reach ConvertKit. Please try again in a moment." },
      { status: 502 },
    );
  }
}
