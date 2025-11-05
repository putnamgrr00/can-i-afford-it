export type PlannerInputs = {
  cashBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  purchaseCost: number;
};

export type PlannerSnapshot = {
  zone: string;
  cushionMonths: number;
  inputs: PlannerInputs;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidPlannerInputs(value: unknown): value is PlannerInputs {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<keyof PlannerInputs, unknown>;

  return (
    isFiniteNumber(record.cashBalance) &&
    isFiniteNumber(record.monthlyIncome) &&
    isFiniteNumber(record.monthlyExpenses) &&
    isFiniteNumber(record.purchaseCost)
  );
}

export function normalizePlannerInputs(value: PlannerInputs): PlannerInputs {
  return {
    cashBalance: Math.max(0, value.cashBalance),
    monthlyIncome: Math.max(0, value.monthlyIncome),
    monthlyExpenses: Math.max(0, value.monthlyExpenses),
    purchaseCost: Math.max(0, value.purchaseCost),
  } satisfies PlannerInputs;
}

export function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
