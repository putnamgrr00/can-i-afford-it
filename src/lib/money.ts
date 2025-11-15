export type MoneyHealthZoneKey = "healthy" | "tight" | "risky";

export type MoneyHealthZone = {
  key: MoneyHealthZoneKey;
  label: string;
  description: string;
};

const ZONES: Array<MoneyHealthZone & { threshold: number }> = [
  {
    key: "healthy",
    label: "Healthy",
    description:
      "You're in the Healthy zone ✅ This purchase fits your money situation. You'll still have a solid cushion after you pay for it. Keep doing what you're doing — and remember, that buffer is what keeps surprise expenses from becoming emergencies.",
    threshold: 2,
  },
  {
    key: "tight",
    label: "Tight",
    description:
      "You're in the Tight zone ⚠️ You can make this purchase, but it will shrink your cushion. If you go ahead, make sure you keep an eye on extra spending for the next month or two. A few small adjustments — or waiting a bit longer — could move you into the Healthy zone.",
    threshold: 1,
  },
  {
    key: "risky",
    label: "Risky",
    description:
      "You're in the Risky zone ❌ This purchase could leave you short on cash for your basic bills and responsibilities. That doesn't mean 'never' — it just means 'not yet.' Building your cushion first will make this decision feel a lot safer.",
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

const ZONE_TIPS: Record<MoneyHealthZoneKey, string[]> = {
  healthy: [
    "Keep building that buffer — even an extra $50/mo strengthens your safety net.",
    "You're doing great — consider setting aside a bit more to grow into the next financial milestone.",
    "Your cushion is solid. Consider what financial goal you want to tackle next.",
  ],
  tight: [
    "If you can delay the purchase 2–4 weeks, your cushion will improve.",
    "Try trimming one non-essential expense this month to strengthen your buffer.",
    "A few small adjustments over the next 30 days could move you into the Healthy zone.",
  ],
  risky: [
    "Focus on building 1–2 more months of cushion before committing.",
    "Even a small weekly savings habit can move you toward the Healthy zone.",
    "That doesn't mean 'never' — it just means 'not yet.' Building your cushion first will make this decision feel a lot safer.",
  ],
};

export function getZoneTip(zone: MoneyHealthZone): string {
  const tips = ZONE_TIPS[zone.key];
  const randomIndex = Math.floor(Math.random() * tips.length);
  return tips[randomIndex] || tips[0];
}
