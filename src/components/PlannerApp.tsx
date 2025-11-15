"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEventHandler,
  type MouseEventHandler,
} from "react";

import {
  clampMeterValue,
  formatCurrency,
  formatCushionMonths,
  getMoneyHealthZone,
  getZoneTip,
} from "@/lib/money";
import { type PlannerInputs } from "@/lib/planner";
import confetti from "canvas-confetti";

import { ResultCard } from "./ResultCard";
import { SliderInput } from "./SliderInput";
import styles from "./PlannerApp.module.css";

type ModalStep = "capture" | "result";

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
    label: "How much do you have set aside?",
    description: "Checking/savings – cash you already have",
    min: 0,
    max: 200000,
    step: 100,
    prefix: "$",
  },
  {
    id: "monthlyIncome",
    label: "About how much comes in each month?",
    description: "Income – after tax, on average",
    min: 0,
    max: 200000,
    step: 100,
    prefix: "$",
  },
  {
    id: "monthlyExpenses",
    label: "About how much goes out each month?",
    description: "Bills, debt, essentials",
    min: 0,
    max: 200000,
    step: 100,
    prefix: "$",
  },
  {
    id: "purchaseCost",
    label: "How much does this purchase cost?",
    description: "Total price or amount you plan to spend",
    min: 0,
    max: 200000,
    step: 100,
    prefix: "$",
  },
];

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function PlannerApp() {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("capture");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const stats = useMemo(() => {
    const projectedCash = values.cashBalance - values.purchaseCost;
    const monthlyNet = values.monthlyIncome - values.monthlyExpenses;
    let cushionMonths =
      values.monthlyExpenses > 0
        ? (values.cashBalance - values.purchaseCost) / values.monthlyExpenses
        : 0;

    // Ensure cushionMonths is always a valid finite number
    if (!Number.isFinite(cushionMonths) || Number.isNaN(cushionMonths)) {
      cushionMonths = 0;
    }

    return {
      projectedCash,
      monthlyNet,
      cushionMonths,
    };
  }, [values.cashBalance, values.monthlyExpenses, values.monthlyIncome, values.purchaseCost]);

  const zone = useMemo(
    () => getMoneyHealthZone(stats.cushionMonths),
    [stats.cushionMonths],
  );

  const meterProgress = useMemo(
    () => clampMeterValue(stats.cushionMonths),
    [stats.cushionMonths],
  );

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  const nameError = trimmedName ? "" : "Please add your name.";
  let emailError = "";
  if (!trimmedEmail) {
    emailError = "Please add your email.";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    emailError = "Enter a valid email address.";
  }

  const captureIsValid = !nameError && !emailError;

  const handleInputChange = (id: keyof PlannerInputs, nextValue: number) => {
    setValues((previous) => ({
      ...previous,
      [id]: Number.isNaN(nextValue) ? 0 : nextValue,
    }));
  };

  const openModal = useCallback(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    setModalStep("capture");
    setTouched({ name: false, email: false });
    setIsSubmitting(false);
    setEmailSubmitted(false);
    setSubmitError(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setIsSubmitting(false);
    setModalStep("capture");
    setEmailSubmitted(false);
    setSubmitError(null);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleBackdropClick = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (isSubmitting) {
        return;
      }

      if (event.target === event.currentTarget) {
        closeModal();
      }
    },
    [closeModal, isSubmitting],
  );

  useEffect(() => {
    if (!isModalOpen) {
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
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
        modalRef.current.querySelectorAll<HTMLElement>(
          focusableSelectors.join(","),
        ),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, isModalOpen, isSubmitting]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    if (modalStep === "capture") {
      window.requestAnimationFrame(() => {
        firstFieldRef.current?.focus();
      });
    } else {
      window.requestAnimationFrame(() => {
        const focusTarget = modalRef.current?.querySelector<HTMLElement>(
          "[data-step-focus='true']",
        );
        focusTarget?.focus();
      });
    }
  }, [isModalOpen, modalStep]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCaptureSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();
      setTouched({ name: true, email: true });
      setSubmitError(null);

      if (!captureIsValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            firstName: trimmedName || undefined,
            zone: zone.key,
            cushionMonths: Number.isFinite(stats.cushionMonths) ? stats.cushionMonths : 0,
            inputs: values,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Something went wrong. Please try again.");
        }

        setEmailSubmitted(true);
        setModalStep("result");
        
        // Trigger confetti after flip completes (~600ms delay)
        if (zone.key === "healthy") {
          setTimeout(() => {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ["#0A8A5B", "#F6C25F"],
              gravity: 0.8,
              ticks: 100,
            });
          }, 600);
        }
      } catch (error) {
        console.error("Subscribe error:", error);
        setSubmitError(
          error instanceof Error
            ? error.message
            : "We couldn't send your result. Please try again soon.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [captureIsValid, trimmedEmail, trimmedName, zone.key, stats.cushionMonths, values],
  );

  const handleBackToCapture = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setModalStep("capture");
  }, [isSubmitting]);

  const inputsAreValid = useMemo(
    () =>
      INPUTS.every((field) => {
        const value = values[field.id];
        return (
          Number.isFinite(value) &&
          value >= field.min &&
          value <= field.max
        );
      }),
    [values],
  );

  return (
    <main className={styles.main}>
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.brandTag}>Money Made Simple</span>
          <h1 className={styles.title}>
            Anna Murphy Presents: <span className={styles.titleAccent}>Can I Afford It?</span>
          </h1>
          <p className={styles.subtitle}>
            A 60-second Money Health Check for your next purchase.
          </p>
        </header>

        <section className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Your Money Snapshot</h2>
          <div className={styles.inputGrid}>
            {INPUTS.map((field) => (
              <SliderInput
                key={field.id}
                id={field.id}
                label={field.label}
                description={field.description}
                value={values[field.id]}
                min={field.min}
                max={field.max}
                step={field.step}
                onChange={(value) => handleInputChange(field.id, value)}
                ariaLabel={field.label}
              />
            ))}
          </div>
          <p className={styles.helperCopy}>Estimates are okay — just give your best guess.</p>
          <button
            type="button"
            onClick={openModal}
            className={styles.primaryButton}
            disabled={!inputsAreValid}
          >
            Check my Money Health →
          </button>
        </section>
        <footer className={styles.footer}>
          Created by Anna Murphy • Money Made Simple
        </footer>
      </div>

      {isModalOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={styles.modal}
          >
            <header className={styles.modalHeader}>
              {modalStep === "result" ? (
                <button
                  type="button"
                  onClick={handleBackToCapture}
                  className={styles.backButton}
                  data-step-focus="true"
                >
                  ← Back
                </button>
              ) : (
                <div></div>
              )}
              <div className={styles.modalHeadingGroup}>
                <p className={styles.stepLabel}>
                  {modalStep === "capture" ? "STEP 1 OF 2" : "STEP 2 OF 2"}
                </p>
                {modalStep === "result" && (
                  <h2 id="modal-title" className={styles.modalTitle}>
                    Your Money Health result
                  </h2>
                )}
                {modalStep === "capture" && (
                  <>
                    <h2 id="modal-title" className={styles.modalTitle}>
                      See your Money Health result
                    </h2>
                    <p className={styles.modalDescription}>
                      Enter your details to view your result and get monthly money tips from Anna.
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={styles.closeButton}
                aria-label="Close"
                disabled={isSubmitting}
              >
                ×
              </button>
            </header>

            {modalStep === "capture" ? (
              <form className={styles.captureForm} onSubmit={handleCaptureSubmit}>
                <div className={styles.emailRow}>
                  <div className={styles.emailInputWrapper}>
                    <input
                      ref={firstFieldRef}
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onBlur={() =>
                        setTouched((previous) => ({ ...previous, name: true }))
                      }
                      placeholder="Your name"
                      className={`${styles.emailInput} ${
                        touched.name && nameError ? styles.inputError : ""
                      }`}
                      autoComplete="name"
                      required
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() =>
                        setTouched((previous) => ({ ...previous, email: true }))
                      }
                      placeholder="you@example.com"
                      className={`${styles.emailInput} ${
                        touched.email && emailError ? styles.inputError : ""
                      }`}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.emailButton}
                    disabled={!captureIsValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className={styles.loadingWrap}>
                        <span className={styles.spinner} aria-hidden="true" />
                      </span>
                    ) : (
                      "Show my Money Health"
                    )}
                  </button>
                </div>
                {touched.name && nameError ? (
                  <span role="alert" className={styles.errorText}>
                    {nameError}
                  </span>
                ) : null}
                {touched.email && emailError ? (
                  <span role="alert" className={styles.errorText}>
                    {emailError}
                  </span>
                ) : null}
                {submitError ? (
                  <div role="alert" className={styles.errorText}>
                    {submitError}
                  </div>
                ) : null}
                <p className={styles.consentLine}>
                  You&apos;ll get monthly Money Made Simple tips. Unsubscribe anytime.
                </p>
              </form>
            ) : (
              <div className={styles.resultStep}>
                <ResultCard
                  firstName={trimmedName || undefined}
                  email={emailSubmitted ? trimmedEmail : undefined}
                  inputs={values}
                  stats={stats}
                  zone={zone}
                  tip={getZoneTip(zone)}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
