"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  clampMeterValue,
  formatCurrency,
  formatCushionMonths,
  getMoneyHealthZone,
  type MoneyHealthZoneKey,
} from "@/lib/money";

type PlannerInputs = {
  cashBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  purchaseCost: number;
};

type SubscribeState = "idle" | "loading" | "success" | "error";

type InputDefinition = {
  id: keyof PlannerInputs;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  prefix?: string;
};

const DEFAULT_VALUES: PlannerInputs = {
  cashBalance: 5000,
  monthlyIncome: 4800,
  monthlyExpenses: 3200,
  purchaseCost: 1200,
};

const INPUTS: InputDefinition[] = [
  {
    id: "cashBalance",
    label: "Cash in your account",
    description: "What's sitting in your bank account right now?",
    min: 0,
    max: 20000,
    step: 100,
    prefix: "$",
  },
  {
    id: "monthlyIncome",
    label: "Monthly income",
    description: "Average take-home or owner's pay each month.",
    min: 0,
    max: 20000,
    step: 100,
    prefix: "$",
  },
  {
    id: "monthlyExpenses",
    label: "Monthly expenses",
    description: "Everything that needs to be paid to keep life and business running.",
    min: 0,
    max: 20000,
    step: 100,
    prefix: "$",
  },
  {
    id: "purchaseCost",
    label: "Cost of the thing you want",
    description: "Course, retreat, laptop, dream hire — add it all in.",
    min: 0,
    max: 20000,
    step: 100,
    prefix: "$",
  },
];

const ZONE_SUPPORT: Record<MoneyHealthZoneKey, string> = {
  healthy: "You'll still have a strong cushion left — this move supports your goals.",
  tight: "You're close! Give yourself a little breathing room or make a plan before you swipe.",
  risky: "Press pause for now. A little more cash cushion will make this feel so much lighter.",
};

const CTA_LINK = "https://girlletstalkmoney.com/clarity-call";

export default function Home() {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<SubscribeState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const projectedCash = values.cashBalance - values.purchaseCost;
    const monthlyNet = values.monthlyIncome - values.monthlyExpenses;
    const cushionMonths = values.monthlyExpenses > 0 ? projectedCash / values.monthlyExpenses : 0;

    return {
      projectedCash,
      monthlyNet,
      cushionMonths,
    };
  }, [values]);

  const zone = useMemo(() => getMoneyHealthZone(stats.cushionMonths), [stats.cushionMonths]);
  const meterProgress = useMemo(
    () => clampMeterValue(stats.cushionMonths),
    [stats.cushionMonths],
  );

  const previousZone = useRef<MoneyHealthZoneKey>(zone.key);

  useEffect(() => {
    if (previousZone.current !== "healthy" && zone.key === "healthy") {
      void confetti({
        particleCount: 120,
        spread: 65,
        origin: { y: 0.7 },
        colors: ["#4FB286", "#6ee7b7", "#a855f7"],
      });
    }

    previousZone.current = zone.key;
  }, [zone.key]);

  const handleInputChange = (id: keyof PlannerInputs, value: number) => {
    setValues((prev) => ({
      ...prev,
      [id]: Number.isNaN(value) ? prev[id] : value,
    }));
  };

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      setErrorMessage("Add an email so we know where to send your plan.");
      setSubscribeState("error");
      return;
    }

    setSubscribeState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName,
          zone: zone.label,
          cushionMonths: stats.cushionMonths,
          inputs: values,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(
          typeof data.error === "string"
            ? data.error
            : "We couldn't reach ConvertKit just yet. Please try again.",
        );
        setSubscribeState("error");
        return;
      }

      setSubscribeState("success");
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went sideways. Try again in a few moments.");
      setSubscribeState("error");
    }
  };

  const resetPlanner = () => {
    setValues(DEFAULT_VALUES);
  };

  return (
    <main className="flex min-h-screen flex-col">
      <section className="px-6 pb-10 pt-16 sm:pt-20">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 text-center">
          <span className="mx-auto rounded-full bg-white/60 px-4 py-1 text-sm font-medium text-slate-600 shadow-sm">
            Money Made Simple presents
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Can I actually afford this right now?
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-slate-600 sm:text-xl">
            Use this 60-second mini planner to check your cushion, get a color-coded Money Health result, and walk away with a
            confident next step.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#planner"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              Start now
            </a>
            <div className="inline-flex items-center gap-3 rounded-full bg-white/80 px-5 py-3 text-sm text-slate-500 shadow">
              <span className="text-lg">💡</span>
              No spreadsheets. No judgment.
            </div>
          </div>
        </div>
      </section>

      <section id="planner" className="pb-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <div className="rounded-3xl bg-white p-8 shadow-xl shadow-emerald-100/50">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Step 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Drop in a few numbers
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetPlanner}
                  className="text-sm font-medium text-emerald-600 underline-offset-4 hover:underline"
                >
                  Reset
                </button>
              </div>
              <div className="mt-6 space-y-8">
                {INPUTS.map((field) => (
                  <div key={field.id} className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <label htmlFor={`${field.id}-slider`} className="text-base font-medium text-slate-800">
                          {field.label}
                        </label>
                        <p className="text-sm text-slate-500">{field.description}</p>
                      </div>
                      <div className="text-right text-lg font-semibold text-slate-700">
                        {field.prefix}
                        {values[field.id].toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                      <input
                        id={`${field.id}-slider`}
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={values[field.id]}
                        onChange={(event) => handleInputChange(field.id, Number(event.target.value))}
                        className="h-2 w-full appearance-none rounded-full bg-slate-200 accent-emerald-500"
                      />
                      <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700 md:w-44">
                        {field.prefix ? <span className="text-sm font-semibold">{field.prefix}</span> : null}
                        <input
                          type="number"
                          inputMode="decimal"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={values[field.id]}
                          onChange={(event) => handleInputChange(field.id, Number(event.target.value))}
                          className="w-full border-0 bg-transparent text-right text-base font-semibold text-slate-700 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl shadow-amber-100/60">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Step 2</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Email me my result & checklist</h2>
              <p className="mt-2 text-sm text-slate-600">
                Get your Money Health summary plus Anna&apos;s Money Clarity Checklist delivered to your inbox.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleSubscribe}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    First name <span className="text-xs font-normal text-slate-400">Optional</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Taylor"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-1 sm:[grid-column:auto/span_1]">
                    Email address
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      placeholder="you@example.com"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-400">
                  By sharing your email you&apos;ll join the Money Made Simple list. Unsubscribe anytime.
                </p>
                <button
                  type="submit"
                  disabled={subscribeState === "loading"}
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {subscribeState === "loading" ? "Sending..." : "Send my result"}
                </button>
                {subscribeState === "error" && errorMessage ? (
                  <p className="text-sm font-medium text-rose-500">{errorMessage}</p>
                ) : null}
                {subscribeState === "success" ? (
                  <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
                    <p className="font-semibold">Check your inbox! 💌</p>
                    <p>
                      Your Money Health recap and checklist are on their way. Ready for more clarity?
                    </p>
                    <a
                      href={CTA_LINK}
                      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Book a free Clarity Call
                    </a>
                  </div>
                ) : null}
              </form>
            </div>
          </div>

          <aside className="flex h-full flex-col justify-between gap-6">
            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl shadow-slate-600/30">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Money Health</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-3xl">{zone.key === "healthy" ? "💚" : zone.key === "tight" ? "🧡" : "❤️"}</span>
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-white/60">Your zone</p>
                  <p className="text-3xl font-semibold text-white">{zone.label}</p>
                </div>
              </div>
              <p className="mt-4 text-pretty text-base text-white/80">
                {ZONE_SUPPORT[zone.key]}
              </p>
              <div className="mt-6 space-y-3">
                <div className="h-3 w-full rounded-full bg-white/20">
                  <div
                    className={`h-full rounded-full ${zone.barClass}`}
                    style={{ width: `${meterProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs uppercase tracking-widest text-white/60">
                  <span>Risky</span>
                  <span>Tight</span>
                  <span>Healthy</span>
                </div>
              </div>
              <div className="mt-8 space-y-3 rounded-2xl bg-white/10 p-5 backdrop-blur">
                <ResultRow label="Cash after purchase" value={formatCurrency(stats.projectedCash)} />
                <ResultRow label="Monthly net" value={formatCurrency(stats.monthlyNet)} />
                <ResultRow label="Months of cushion" value={`${formatCushionMonths(stats.cushionMonths)} mo`} />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl shadow-emerald-100/50">
              <h3 className="text-xl font-semibold text-slate-900">How to use your result</h3>
              <ul className="mt-4 space-y-4 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="mt-1 text-lg">📝</span>
                  <span>
                    Healthy? Celebrate and move ahead. Schedule your payment and set aside money for future goals while you&apos;re in the flow.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 text-lg">⏱️</span>
                  <span>
                    Tight? Stretch your timeline or trim one expense this month. Even a small adjustment can move you into the green.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 text-lg">🛟</span>
                  <span>
                    Risky? Protect your peace. Focus on boosting cash or reducing expenses before committing to the purchase.
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

type ResultRowProps = {
  label: string;
  value: string;
};

function ResultRow({ label, value }: ResultRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/70">{label}</span>
      <span className="text-base font-semibold text-white">{value}</span>
    </div>
  );
}
