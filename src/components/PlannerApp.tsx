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
} from "@/lib/money";
import { type PlannerInputs } from "@/lib/planner";

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
    label: "Cash in your account",
    description: "How much is available in your bank account today?",
    min: 0,
    max: 200000,
    step: 100,
    prefix: "$",
  },
  {
    id: "monthlyIncome",
    label: "Monthly income",
    description: "Average take-home or owner pay each month.",
    min: 0,
    max: 200000,
    step: 100,
    prefix: "$",
  },
  {
    id: "monthlyExpenses",
    label: "Monthly expenses",
    description: "Everything you spend to keep life and business running.",
    min: 0,
    max: 200000,
    step: 100,
    prefix: "$",
  },
  {
    id: "purchaseCost",
    label: "Cost of what you want",
    description: "Course, retreat, laptop—add it all in.",
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

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const stats = useMemo(() => {
    const projectedCash = values.cashBalance - values.purchaseCost;
    const monthlyNet = values.monthlyIncome - values.monthlyExpenses;
    const cushionMonths =
      values.monthlyExpenses > 0
        ? (values.cashBalance - values.purchaseCost) / values.monthlyExpenses
        : 0;

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
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setIsSubmitting(false);
    setModalStep("capture");
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
    (event) => {
      event.preventDefault();
      setTouched({ name: true, email: true });

      if (!captureIsValid) {
        return;
      }

      setIsSubmitting(true);
      const delay = 500 + Math.floor(Math.random() * 300);
      timeoutRef.current = window.setTimeout(() => {
        setIsSubmitting(false);
        setModalStep("result");
        timeoutRef.current = null;
      }, delay);
    },
    [captureIsValid],
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
          <h1 className={styles.title}>Can I afford it?</h1>
          <p className={styles.subtitle}>
            Drop in a few numbers to see how your cash cushion holds up before you
            hit purchase.
          </p>
        </header>

        <section className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Your numbers</h2>
          <div className={styles.inputGrid}>
            {INPUTS.map((field) => (
              <label key={field.id} className={styles.field}>
                <span className={styles.fieldLabel}>{field.label}</span>
                <span className={styles.fieldDescription}>{field.description}</span>
                <div className={styles.numberInputWrap}>
                  {field.prefix ? (
                    <span className={styles.prefix}>{field.prefix}</span>
                  ) : null}
                  <input
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={values[field.id]}
                    onChange={(event) =>
                      handleInputChange(field.id, Number(event.target.value))
                    }
                    className={styles.numberInput}
                  />
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={openModal}
            className={styles.primaryButton}
            disabled={!inputsAreValid}
          >
            Can I afford it?
          </button>
        </section>
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
                <span className={styles.stepIndicator} data-step-focus="true">
                  Step 1 of 2
                </span>
              )}
              <div className={styles.modalHeadingGroup}>
                <p className={styles.stepLabel}>
                  {modalStep === "capture" ? "Step 1 of 2" : "Step 2 of 2"}
                </p>
                <h2 id="modal-title" className={styles.modalTitle}>
                  {modalStep === "capture"
                    ? "Subscribe to see your result"
                    : "Here’s your affordability snapshot"}
                </h2>
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
                <label className={styles.textField}>
                  Name
                  <input
                    ref={firstFieldRef}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() =>
                      setTouched((previous) => ({ ...previous, name: true }))
                    }
                    className={`${styles.inputControl} ${
                      touched.name && nameError ? styles.inputError : ""
                    }`}
                    autoComplete="name"
                  />
                  {touched.name && nameError ? (
                    <span role="alert" className={styles.errorText}>
                      {nameError}
                    </span>
                  ) : null}
                </label>
                <label className={styles.textField}>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() =>
                      setTouched((previous) => ({ ...previous, email: true }))
                    }
                    className={`${styles.inputControl} ${
                      touched.email && emailError ? styles.inputError : ""
                    }`}
                    autoComplete="email"
                  />
                  {touched.email && emailError ? (
                    <span role="alert" className={styles.errorText}>
                      {emailError}
                    </span>
                  ) : null}
                </label>
                <p className={styles.consentLine}>
                  By submitting, you agree to receive emails from Anna Murphy.
                  Unsubscribe anytime. <a href="#">Privacy Policy</a>
                </p>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!captureIsValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <span className={styles.loadingWrap}>
                      <span className={styles.spinner} aria-hidden="true" />
                      Working…
                    </span>
                  ) : (
                    "Subscribe & show result"
                  )}
                </button>
              </form>
            ) : (
              <div className={styles.resultStep}>
                <div className={styles.resultCard}>
                  <span
                    className={`${styles.resultBadge} ${styles[`zone${zone.key}`]}`}
                  >
                    Money Health · {zone.label}
                  </span>
                  <p className={styles.resultSummary}>
                    After your purchase you’d have {formatCurrency(stats.projectedCash)}
                    {" "}
                    on hand and about {formatCushionMonths(stats.cushionMonths)}
                    {" "}
                    months of cushion.
                  </p>
                  <ul className={styles.resultList}>
                    <li>
                      <span>Cash after purchase</span>
                      <strong>{formatCurrency(stats.projectedCash)}</strong>
                    </li>
                    <li>
                      <span>Monthly net</span>
                      <strong>{formatCurrency(stats.monthlyNet)}</strong>
                    </li>
                    <li>
                      <span>Months of cushion</span>
                      <strong>
                        {formatCushionMonths(stats.cushionMonths)} months
                      </strong>
                    </li>
                  </ul>
                  <p className={styles.resultDescription}>{zone.description}</p>
                  <div className={styles.resultMeter} aria-hidden="true">
                    <div className={styles.meterTrack}>
                      <div
                        className={`${styles.meterFill} ${styles[`zone${zone.key}`]}`}
                        style={{ width: `${meterProgress}%` }}
                      />
                    </div>
                    <div className={styles.meterLabels}>
                      <span>Risky</span>
                      <span>Tight</span>
                      <span>Healthy</span>
                    </div>
                  </div>
                  <div className={styles.resultActions}>
                    <button type="button" className={styles.secondaryButton}>
                      Download
                    </button>
                    <button type="button" className={styles.secondaryButton}>
                      Share
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
