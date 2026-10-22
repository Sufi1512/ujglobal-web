"use client";

import Link from "next/link";
import { useState } from "react";
import { submitContact } from "@/lib/api";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      await submitContact({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        company: String(data.get("company") ?? "") || undefined,
        message: String(data.get("message") ?? ""),
        consent: data.get("consent") === "on",
        website: String(data.get("website") ?? ""),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p role="status" className="rounded-xl border border-line p-6">
        Thanks, we have your message. We will reply with next steps and a quote within one business day.
      </p>
    );
  }

  const field = "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-link";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Name
        <input name="name" required minLength={2} maxLength={120} className={field} autoComplete="name" />
      </label>
      <label className="block text-sm">
        Work email
        <input name="email" type="email" required className={field} autoComplete="email" />
      </label>
      <label className="block text-sm">
        Company (optional)
        <input name="company" maxLength={160} className={field} autoComplete="organization" />
      </label>
      <label className="block text-sm">
        What do you want to build?
        <textarea name="message" required minLength={10} maxLength={5000} rows={5} className={field} />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]" />
        <span>
          I agree that UJ Global may use these details to reply to my enquiry, as described in the{" "}
          <Link href="/privacy" className="text-link underline">
            privacy policy
          </Link>
          .
        </span>
      </label>
      {/* Honeypot: hidden from people, filled by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-brand px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Something went wrong. Please try again or email us directly.
        </p>
      )}
    </form>
  );
}
