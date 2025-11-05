"use client";

import {
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import confetti from "canvas-confetti";

import {
  clampMeterValue,
  formatCurrency,
  formatCushionMonths,
  getMoneyHealthZone,
  type MoneyHealthZone,
  type MoneyHealthZoneKey,
} from "@/lib/money";
import { type PlannerInputs } from "@/lib/planner";

import styles from "./PlannerApp.module.css";
import { ResultCard } from "./ResultCard";

type SubscribeState = "idle" | "loading" | "success" | "error";

type PlannerStep = "inputs" | "capture" | "result";

type SubmittedResult = {
  firstName: string;
  email: string;
  inputs: PlannerInputs;
  stats: {
    projectedCash: number;
    monthlyNet: number;
    cushionMonths: number;
  };
  zone: MoneyHealthZone;
  tip: string;
};

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

const ZONE_TIPS: Record<MoneyHealthZoneKey, string[]> = {
  healthy: [
    "Keep the celebration going by automating a transfer to your next money goal.",
    "Lock in this win: schedule the purchase and stash a little extra for future you.",
    "You’re in the green! Treat yourself and your business to a mini money date to stay on track.",
  ],
  tight: [
    "You’re almost there—pause 24 hours and rerun the numbers after trimming one small expense.",
    "Set a reminder to revisit this purchase after your next pay cycle or invoice clears.",
    "Try negotiating one bill this week to nudge your cushion into the green.",
  ],
  risky: [
    "Give yourself breathing room: focus on boosting cash reserves before tapping ‘buy.’",
    "Channel this clarity into action—map out a mini savings sprint for the next two paychecks.",
    "Protect your peace by pressing pause and building a one-month buffer before committing.",
  ],
};

const CTA_LINK = "https://girlletstalkmoney.com/clarity-call";

function getStatusBadgeClass(zone: MoneyHealthZoneKey) {
  if (zone === "healthy") {
    return styles.statusHealthy;
  }
  if (zone === "tight") {
    return styles.statusTight;
  }
  return styles.statusRisky;
}

function getMeterClass(zone: MoneyHealthZoneKey) {
  if (zone === "healthy") {
    return styles.meterHealthy;
  }
  if (zone === "tight") {
    return styles.meterTight;
  }
  return styles.meterRisky;
}

export default function PlannerApp() {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<SubscribeState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [step, setStep] = useState<PlannerStep>("inputs");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<SubmittedResult | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

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
  const previousStep = useRef<PlannerStep>(step);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setErrorMessage(null);
    if (step !== "result") {
      setStep("inputs");
    }
    if (subscribeState !== "loading") {
      setSubscribeState("idle");
    }
  }, [step, subscribeState]);

  useEffect(() => {
    const zoneChanged = previousZone.current !== zone.key;
    const enteredResultStep = previousStep.current !== "result" && step === "result";

    if (
      step === "result" &&
      zone.key === "healthy" &&
      ((zoneChanged && previousZone.current !== "healthy") || enteredResultStep)
    ) {
      void confetti({
        particleCount: 120,
        spread: 65,
        origin: { y: 0.7 },
        colors: ["#16A34A", "#86EFAC", "#A855F7"],
      });
    }

    previousZone.current = zone.key;
    previousStep.current = step;
  }, [zone.key, step]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && subscribeState !== "loading") {
        closeModal();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableSelectors = [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([type='hidden']):not([disabled])",
        "select:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ];

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors.join(",")),
      ).filter((element) => element.offsetParent !== null || element === document.activeElement);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isShift = event.shiftKey;

      if (document.activeElement === last && !isShift) {
        event.preventDefault();
        first.focus();
      } else if (document.activeElement === first && isShift) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, subscribeState, closeModal]);

  useEffect(() => {
    if (isModalOpen) {
      firstFieldRef.current?.focus();
    }
  }, [isModalOpen]);

  const handleInputChange = (id: keyof PlannerInputs, value: number) => {
    setValues((prev) => ({
      ...prev,
      [id]: Number.isNaN(value) ? prev[id] : value,
    }));
  };

  const inputsAreValid = useMemo(
    () =>
      INPUTS.every((field) => {
        const value = values[field.id];
        return Number.isFinite(value) && value >= field.min && value <= field.max;
      }),
    [values],
  );

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setErrorMessage(null);
    if (step !== "result") {
      setStep("capture");
    }
    setSubscribeState("idle");
  }, [step]);

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (subscribeState === "loading") {
        return;
      }

      if (event.target === event.currentTarget) {
        closeModal();
      }
    },
    [subscribeState, closeModal],
  );

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();

    if (!trimmedFirstName) {
      setErrorMessage("We'd love to personalize your plan — add your first name.");
      setSubscribeState("error");
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage("Add an email so we know where to send your plan.");
      setSubscribeState("error");
      return;
    }

    setSubscribeState("loading");
    setErrorMessage(null);
    setSubmittedResult(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          firstName: trimmedFirstName,
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
            : "We couldn't reach the email service just yet. Please try again.",
        );
        setSubscribeState("error");
        return;
      }

      const tipPool = ZONE_TIPS[zone.key];
      const randomTip = tipPool[Math.floor(Math.random() * tipPool.length)];

      setSubmittedResult({
        firstName: trimmedFirstName,
        email: trimmedEmail,
        inputs: { ...values },
        stats: { ...stats },
        zone,
        tip: randomTip,
      });

      setSubscribeState("success");
      setIsModalOpen(false);
      setStep("result");
      setFirstName("");
      setEmail("");
      return;
    } catch (error) {
      console.error(error);
      setErrorMessage("Something went sideways. Try again in a few moments.");
      setSubscribeState("error");
      return;
    }
  };

  useEffect(() => {
    if (!isModalOpen && subscribeState === "success") {
      const resetTimeout = window.setTimeout(() => {
        setSubscribeState("idle");
      }, 300);

      return () => {
        window.clearTimeout(resetTimeout);
      };
    }
  }, [isModalOpen, subscribeState]);

  const resetPlanner = () => {
    setValues(DEFAULT_VALUES);
  };

  const screenReaderStatus =
    step === "result"
      ? "Your results are now visible."
      : "Results will appear after you share your name and email.";

  const layoutClass = [
    styles.layout,
    step === "result" ? styles.layoutResult : styles.layoutDefault,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={styles.main}>
      <section className={`${styles.section} ${styles.hero}`}>
        <div className={`${styles.container} ${styles.heroContent}`}>
          <span className={styles.heroBadge}>Anna Murphy presents</span>
          <h1 className={styles.heroHeading}>Can I actually afford this right now?</h1>
          <p className={styles.heroDescription}>
            Use this 60-second mini planner to check your cushion, get a color-coded Money Health result, and walk away with a
            confident next step.
          </p>
          <div className={styles.ctaGroup}>
            <a href="#planner" className={styles.primaryButton}>
              Start now
            </a>
            <span className={styles.secondaryPill}>
              <span aria-hidden="true">💡</span>
              No spreadsheets. No judgment.
            </span>
          </div>
        </div>
      </section>

      <section id="planner" className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={`${styles.container} ${layoutClass}`}>
          <div className={styles.inputGroup}>
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <div>
                  <p className={styles.stepLabel}>Step 1</p>
                  <h2 className={styles.cardTitle}>Drop in a few numbers</h2>
                  <p className={styles.helperText}>We’ll only use these details to calculate your cushion.</p>
                </div>
                <button type="button" onClick={resetPlanner} className={styles.resetButton}>
                  Reset
                </button>
              </header>
              <div className={styles.inputGroup}>
                {INPUTS.map((field) => (
                  <div key={field.id} className={styles.fieldWrapper}>
                    <div className={styles.fieldHeader}>
                      <div>
                        <label htmlFor={`${field.id}-slider`}>{field.label}</label>
                        <p className={styles.fieldDescription}>{field.description}</p>
                      </div>
                      <span className={styles.fieldValue}>
                        {field.prefix}
                        {values[field.id].toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.controlsRow}>
                      <input
                        id={`${field.id}-slider`}
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={values[field.id]}
                        onChange={(event) => handleInputChange(field.id, Number(event.target.value))}
                        className={styles.rangeInput}
                      />
                      <div className={styles.numberInputWrap}>
                        {field.prefix ? <span>{field.prefix}</span> : null}
                        <input
                          type="number"
                          inputMode="decimal"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={values[field.id]}
                          onChange={(event) => handleInputChange(field.id, Number(event.target.value))}
                          className={styles.numberInput}
                          aria-label={`${field.label} amount`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={openModal}
                  className={styles.primaryButton}
                  disabled={!inputsAreValid}
                >
                  Email my plan
                </button>
                <button type="button" onClick={openModal} className={styles.secondaryButton}>
                  Save progress & continue later
                </button>
              </div>
            </article>

            <article className={styles.card}>
              <header>
                <p className={styles.stepLabel}>Step 2</p>
                <h2 className={styles.cardTitle}>Email my result & checklist</h2>
              </header>
              <p className={styles.helperText}>
                We’ll send a Money Health summary plus Anna’s Money Clarity Checklist straight to your inbox.
              </p>
              <form className={styles.inputGroup} onSubmit={handleSubscribe}>
                <div className={styles.textInputGroup}>
                  <label className={styles.textField}>
                    First name
                    <input
                      ref={firstFieldRef}
                      type="text"
                      value={firstName}
                      onChange={(event) => {
                        setFirstName(event.target.value);
                        if (subscribeState === "error") {
                          setSubscribeState("idle");
                          setErrorMessage(null);
                        }
                      }}
                      placeholder="Taylor"
                      required
                      className={`${styles.inputControl} ${
                        subscribeState === "error" && !firstName.trim() ? styles.errorControl : ""
                      }`}
                    />
                  </label>
                  <label className={styles.textField}>
                    Email address
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (subscribeState === "error") {
                          setSubscribeState("idle");
                          setErrorMessage(null);
                        }
                      }}
                      required
                      placeholder="you@example.com"
                      className={`${styles.inputControl} ${
                        subscribeState === "error" && !email.trim() ? styles.errorControl : ""
                      }`}
                    />
                  </label>
                </div>
                <p className={styles.disclaimer}>
                  By sharing your email you’ll join Anna Murphy’s list. Unsubscribe anytime.
                </p>
                <button type="submit" disabled={subscribeState === "loading"} className={styles.primaryButton}>
                  {subscribeState === "loading" ? "Sending…" : "Send my result"}
                </button>
                {subscribeState === "error" && errorMessage ? (
                  <p className={styles.errorText}>{errorMessage}</p>
                ) : null}
                {submittedResult ? (
                  <div className={styles.tipCard}>
                    <div>
                      <h3>Check your inbox! 💌</h3>
                      <p className={styles.helperText}>
                        Your Money Health recap and checklist are on their way. Ready for more clarity?
                      </p>
                    </div>
                    <a href={CTA_LINK} className={styles.primaryButton} target="_blank" rel="noreferrer">
                      Book a free Clarity Call
                    </a>
                  </div>
                ) : null}
              </form>
            </article>
          </div>

          {step === "result" ? (
            <aside className={styles.resultSidebar} aria-live="polite" aria-label="Money Health result">
              <article className={styles.statusCard}>
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(zone.key)}`}>
                  Money Health · {zone.label}
                </span>
                <div>
                  <h3>{ZONE_SUPPORT[zone.key]}</h3>
                  <p className={styles.helperText}>{zone.description}</p>
                </div>
                <div className={styles.meterTrack} aria-hidden="true">
                  <div
                    className={`${styles.meterFill} ${getMeterClass(zone.key)}`}
                    style={{ width: `${meterProgress}%` }}
                  />
                </div>
                <ul className={styles.resultList}>
                  <li className={styles.resultItem}>
                    <span>Cash after purchase</span>
                    <strong>{formatCurrency(stats.projectedCash)}</strong>
                  </li>
                  <li className={styles.resultItem}>
                    <span>Monthly net</span>
                    <strong>{formatCurrency(stats.monthlyNet)}</strong>
                  </li>
                  <li className={styles.resultItem}>
                    <span>Months of cushion</span>
                    <strong>{formatCushionMonths(stats.cushionMonths)} months</strong>
                  </li>
                </ul>
              </article>

              {submittedResult ? (
                <ResultCard
                  firstName={submittedResult.firstName}
                  email={submittedResult.email}
                  inputs={submittedResult.inputs}
                  stats={submittedResult.stats}
                  zone={submittedResult.zone}
                  tip={submittedResult.tip}
                />
              ) : null}
            </aside>
          ) : null}
        </div>
      </section>

      <div role="status" aria-live="polite" className="visuallyHidden">
        {screenReaderStatus}
      </div>

      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={handleBackdropClick}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="capture-title"
            className={styles.modal}
          >
            <header className={styles.modalHeader}>
              <div>
                <p className={styles.stepLabel}>Step 2</p>
                <h2 id="capture-title" className={styles.cardTitle}>
                  Email my result & checklist
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={subscribeState === "loading"}
                className={styles.closeButton}
                aria-label="Close email capture"
              >
                ×
              </button>
            </header>
            <p className={styles.helperText}>
              We’ll send a Money Health summary plus Anna’s Money Clarity Checklist straight to your inbox.
            </p>
            <form className={styles.modalActions} onSubmit={handleSubscribe}>
              <label className={styles.textField}>
                First name
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    if (subscribeState === "error") {
                      setSubscribeState("idle");
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="Taylor"
                  required
                  className={`${styles.inputControl} ${
                    subscribeState === "error" && !firstName.trim() ? styles.errorControl : ""
                  }`}
                />
              </label>
              <label className={styles.textField}>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (subscribeState === "error") {
                      setSubscribeState("idle");
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="you@example.com"
                  required
                  className={`${styles.inputControl} ${
                    subscribeState === "error" && !email.trim() ? styles.errorControl : ""
                  }`}
                />
              </label>
              <p className={styles.disclaimer}>
                By sharing your email you’ll join Anna Murphy’s list. Unsubscribe anytime.
              </p>
              <button type="submit" disabled={subscribeState === "loading"} className={styles.primaryButton}>
                {subscribeState === "loading" ? "Sending…" : "Send my result"}
              </button>
              {subscribeState === "error" && errorMessage ? (
                <p className={styles.errorText}>{errorMessage}</p>
              ) : null}
            </form>
            <div className={styles.tipCard}>
              <div>
                <h3>Ready for more clarity?</h3>
                <p className={styles.helperText}>Book a free Clarity Call to map your next money move with Anna.</p>
              </div>
              <a href={CTA_LINK} className={styles.primaryButton} target="_blank" rel="noreferrer">
                Book a free Clarity Call
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
