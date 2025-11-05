export type MoneyHealthZoneKey = "healthy" | "tight" | "risky";

export type MoneyHealthZone = {
  key: MoneyHealthZoneKey;
  label: string;
  description: string;
  accentClass: string;
  barClass: string;
};

const ZONES: Array<MoneyHealthZone & { threshold: number }> = [
  {
    key: "healthy",
    label: "Healthy",
    description: "You can comfortably afford this purchase and will keep a strong buffer.",
    accentClass: "text-emerald-600",
    barClass: "bg-emerald-500",
    threshold: 2,
  },
  {
    key: "tight",
    label: "Tight",
    description: "You're close — make a plan before you swipe.",
    accentClass: "text-amber-500",
    barClass: "bg-amber-400",
    threshold: 1,
  },
  {
    key: "risky",
    label: "Risky",
    description: "Press pause — let's build your cushion first.",
    accentClass: "text-rose-500",
    barClass: "bg-rose-500",
    threshold: 0,
  },
];

export function getMoneyHealthZone(cushionMonths: number): MoneyHealthZone {
  if (cushionMonths > ZONES[0].threshold) {
    return ZONES[0];
  }

  if (cushionMonths >= ZONES[1].threshold) {
    return ZONES[1];
  }

  return ZONES[2];
}

export function clampMeterValue(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }

  const bounded = Math.max(0, Math.min(value, 3));
  return Math.round((bounded / 3) * 100);
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  return currencyFormatter.format(Math.round(value));
}

export function formatCushionMonths(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0";
  }

  if (value >= 10) {
    return Math.round(value).toString();
  }

  return value.toFixed(1);
}
