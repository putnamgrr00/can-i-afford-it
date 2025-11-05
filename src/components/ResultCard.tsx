"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

import {
  clampMeterValue,
  formatCurrency,
  formatCushionMonths,
  type MoneyHealthZone,
  type MoneyHealthZoneKey,
} from "@/lib/money";
import { type PlannerInputs } from "@/lib/planner";

type ResultCardProps = {
  firstName?: string;
  email?: string;
  inputs: PlannerInputs;
  stats: {
    projectedCash: number;
    monthlyNet: number;
    cushionMonths: number;
  };
  zone: MoneyHealthZone;
  tip: string;
};

const ZONE_EMOJI: Record<MoneyHealthZoneKey, string> = {
  healthy: "💚",
  tight: "🧡",
  risky: "❤️",
};

export function ResultCard({ firstName, email, inputs, stats, zone, tip }: ResultCardProps) {
  const meterProgress = useMemo(
    () => clampMeterValue(stats.cushionMonths),
    [stats.cushionMonths],
  );

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  const permalink = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const url = new URL(window.location.href);
    const params = new URLSearchParams();

    params.set("cashBalance", String(inputs.cashBalance));
    params.set("monthlyIncome", String(inputs.monthlyIncome));
    params.set("monthlyExpenses", String(inputs.monthlyExpenses));
    params.set("purchaseCost", String(inputs.purchaseCost));
    params.set("zone", zone.key);

    if (firstName) {
      params.set("firstName", firstName);
    }

    url.search = params.toString();

    return url.toString();
  }, [
    inputs.cashBalance,
    inputs.monthlyExpenses,
    inputs.monthlyIncome,
    inputs.purchaseCost,
    zone.key,
    firstName,
  ]);

  const shareResult = useCallback(async () => {
    setShareFeedback(null);
    const headline = `${firstName ? `${firstName}’s` : "My"} Money Health: ${ZONE_EMOJI[zone.key]} ${zone.label}`;
    const summary = `Cash after purchase: ${formatCurrency(stats.projectedCash)} • Cushion: ${formatCushionMonths(stats.cushionMonths)} months.`;

    try {
      if (typeof navigator !== "undefined") {
        const navWithShare = navigator as Navigator & {
          share?: (data?: ShareData) => Promise<void>;
          clipboard?: Clipboard;
        };

        if (navWithShare.share) {
          await navWithShare.share({
            title: headline,
            text: `${summary}\n${tip}`,
            url: permalink,
          });
          setShareFeedback("Shared successfully!");
          return;
        }

        if (navWithShare.clipboard) {
          await navWithShare.clipboard.writeText(permalink);
          setShareFeedback("Link copied to clipboard.");
          return;
        }
      }

      setShareFeedback("Copy this link to share: " + permalink);
    } catch (error) {
      console.error(error);
      setShareFeedback("We couldn't share automatically. Copy the link and share it manually.");
    }
  }, [firstName, permalink, stats.projectedCash, stats.cushionMonths, tip, zone.key, zone.label]);

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) {
      return;
    }

    try {
      setDownloadFeedback(null);
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = "money-health-result.png";
      link.href = dataUrl;
      link.click();
      setDownloadFeedback("PNG saved to your device.");
    } catch (error) {
      console.error(error);
      setDownloadFeedback("We couldn't save the image. Try again.");
    }
  }, []);

  useEffect(() => {
    if (zone.key === "healthy") {
      void confetti({
        particleCount: 120,
        spread: 65,
        origin: { y: 0.7 },
        colors: ["#4FB286", "#6ee7b7", "#a855f7"],
      });
    }
  }, [zone.key]);

  return (
    <div className="space-y-6">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-800 p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-emerald-400/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Money Health</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                {firstName ? `${firstName}, here’s your snapshot` : "Your Money Health snapshot"}
              </h3>
              {email ? (
                <p className="mt-1 text-sm text-white/60">Sent to {email}</p>
              ) : null}
            </div>
            <span className="text-5xl drop-shadow">{ZONE_EMOJI[zone.key]}</span>
          </div>

          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">Your zone</p>
            <p className="mt-2 text-4xl font-semibold text-white">{zone.label}</p>
            <p className="mt-3 text-base text-white/80">{tip}</p>

            <div className="mt-6 space-y-3">
              <div className="h-2 w-full rounded-full bg-white/10">
                <div className={`h-full rounded-full ${zone.barClass}`} style={{ width: `${meterProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-white/60">
                <span>Risky</span>
                <span>Tight</span>
                <span>Healthy</span>
              </div>
            </div>
          </div>

          <dl className="grid gap-4 rounded-2xl bg-black/30 p-6 backdrop-blur">
            <div className="flex items-baseline justify-between">
              <dt className="text-sm uppercase tracking-[0.3em] text-white/60">Cash after purchase</dt>
              <dd className="text-xl font-semibold text-white">{formatCurrency(stats.projectedCash)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-sm uppercase tracking-[0.3em] text-white/60">Monthly net</dt>
              <dd className="text-xl font-semibold text-white">{formatCurrency(stats.monthlyNet)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-sm uppercase tracking-[0.3em] text-white/60">Months of cushion</dt>
              <dd className="text-xl font-semibold text-white">{formatCushionMonths(stats.cushionMonths)} mo</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={shareResult}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/90 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-900/20 transition hover:bg-white"
              >
                <span>Share result</span>
              </button>
              <button
                type="button"
                onClick={downloadCard}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                <span>Download card</span>
              </button>
            </div>
            <a
              href="https://girlletstalkmoney.com/clarity-call"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-300"
            >
              Book a clarity call
            </a>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm text-slate-600">
        {shareFeedback ? <p className="font-medium text-emerald-600">{shareFeedback}</p> : null}
        {downloadFeedback ? <p className="font-medium text-emerald-600">{downloadFeedback}</p> : null}
        <p className="text-xs text-slate-400">Keep this card handy when you&apos;re making your next move.</p>
      </div>
    </div>
  );
}

