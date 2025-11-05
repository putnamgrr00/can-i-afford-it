"use client";

import { FormEvent, useState } from "react";

const defaultError = "We couldn’t save your details. Please try again.";

export default function PlannerApp() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({
    type: "idle",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "idle" });

    const payload = {
      email,
    };

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: body?.error ?? defaultError });
        return;
      }

      setEmail("");
      setStatus({ type: "success", message: body?.message ?? "Thanks for subscribing!" });
    } catch (error) {
      console.error("Subscription request failed", error);
      setStatus({ type: "error", message: defaultError });
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit">Notify me</button>
      </form>
      {status.type === "success" && status.message ? (
        <p role="status">{status.message}</p>
      ) : null}
      {status.type === "error" && status.message ? (
        <p role="alert">{status.message}</p>
      ) : null}
    </div>
  );
}
