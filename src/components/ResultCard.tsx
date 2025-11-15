"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

import {
  clampMeterValue,
  formatCurrency,
  formatCushionMonths,
  type MoneyHealthZone,
  type MoneyHealthZoneKey,
} from "@/lib/money";
import { type PlannerInputs } from "@/lib/planner";

import styles from "./ResultCard.module.css";

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

function getBadgeClass(zone: MoneyHealthZoneKey) {
  if (zone === "healthy") {
    return styles.zoneHealthy;
  }
  if (zone === "tight") {
    return styles.zoneTight;
  }
  return styles.zoneRisky;
}

function getMeterClass(zone: MoneyHealthZoneKey) {
  if (zone === "healthy") {
    return styles.fillHealthy;
  }
  if (zone === "tight") {
    return styles.fillTight;
  }
  return styles.fillRisky;
}

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

  const cardClass = `card${zone.key.charAt(0).toUpperCase() + zone.key.slice(1)}`;
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={styles.cardWrapper}>
      <div 
        className={`${styles.cardInner} ${isFlipped ? styles.isFlipped : ""}`}
        onClick={() => setIsFlipped(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped(true);
          }
        }}
        aria-label="Tap to reveal your Money Health result"
      >
        {/* Front face */}
        <div className={styles.cardFace} style={{ background: "#fef6e8" }}>
          <div className={styles.frontContent}>
            <div className={styles.logoText}>Money Made Simple</div>
            <div className={styles.revealText}>Your Money Health is ready.</div>
            <div className={styles.tapText}>Tap to reveal your result.</div>
          </div>
        </div>
        {/* Back face - result content */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <div className={`${styles.card} ${styles[cardClass]}`} ref={cardRef}>
      <div className={styles.header}>
        <div className={styles.headerStrip}>
          Money Health – {zone.label}
        </div>
        <div className={styles.zoneSummary}>
          <p className={styles.summarySentence}>
            After your purchase you&apos;d have {formatCurrency(stats.projectedCash)} on hand and about {formatCushionMonths(stats.cushionMonths)} months of cushion.
          </p>
        </div>
      </div>

      <div className={styles.meter}>
        <div 
          className={styles.meterTrack} 
          aria-hidden="true"
          style={{ 
            "--fill-percentage": meterProgress / 100,
            "--indicator-position": `${meterProgress}%`
          } as React.CSSProperties}
        >
          <div
            className={styles.meterFill}
          />
          <div
            className={styles.meterIndicator}
            style={{ 
              borderColor: zone.key === "healthy" ? "#0a8a5b" : zone.key === "tight" ? "#f6c25f" : "#f97373"
            } as React.CSSProperties}
            aria-hidden="true"
          />
        </div>
        <div className={styles.meterLabels}>
          <span>RISKY</span>
          <span>TIGHT</span>
          <span>HEALTHY</span>
        </div>
      </div>

      <ul className={styles.summaryList}>
        <li className={styles.summaryItem}>
          <span>Cash after purchase</span>
          <strong>{formatCurrency(stats.projectedCash)}</strong>
        </li>
        <li className={styles.summaryItem}>
          <span>Monthly net</span>
          <strong>{formatCurrency(stats.monthlyNet)}</strong>
        </li>
        <li className={styles.summaryItem}>
          <span>Months of cushion</span>
          <strong>{formatCushionMonths(stats.cushionMonths)} months</strong>
        </li>
      </ul>

      <div className={styles.tip}>
        <strong>Try this next:</strong>
        <p>{tip}</p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.primaryButton} onClick={shareResult}>
          Share my Money Health
        </button>
        <button type="button" className={styles.secondaryButton} onClick={downloadCard}>
          Save snapshot as PNG
        </button>
        {shareFeedback ? <p className={styles.feedback}>{shareFeedback}</p> : null}
        {downloadFeedback ? <p className={styles.feedback}>{downloadFeedback}</p> : null}
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
