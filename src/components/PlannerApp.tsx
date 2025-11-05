"use client";

import { FormEvent, useState } from "react";

type Status =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const defaultError = "We couldn’t save your details. Please try again.";
const defaultSuccess = "Thanks! We'll be in touch soon.";

export default function PlannerApp() {
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const isSubmitting = status.type === "submitting";

  const statusMessage =
    status.type === "success" || status.type === "error" ? status.message : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          payload[key] = trimmed;
        }
      }
    });

    if (!payload.email) {
      setStatus({ type: "error", message: "Please add your email before submitting." });
      return;
    }

    setStatus({ type: "submitting" });

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({ type: "error", message: body?.error ?? defaultError });
        return;
      }

      form.reset();
      setStatus({ type: "success", message: body?.message ?? defaultSuccess });
    } catch (error) {
      console.error("Subscription request failed", error);
      setStatus({ type: "error", message: defaultError });
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required disabled={isSubmitting} />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Notify me"}
        </button>
      </form>
      {status.type === "success" && statusMessage ? <p role="status">{statusMessage}</p> : null}
      {status.type === "error" && statusMessage ? <p role="alert">{statusMessage}</p> : null}
    </div>
  );
}
