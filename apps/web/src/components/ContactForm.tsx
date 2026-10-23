"use client";

import { ArrowRight, Check, CircleCheckBig } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ContactError, TURNSTILE_SITE_KEY, submitContact } from "@/lib/api";

type Status = "idle" | "sending" | "sent" | "error";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Cloudflare's "are you human" widget. Renders nothing when no site key is configured. */
function useTurnstile(onToken: (token: string) => void) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    const el = box.current;
    const render = () => {
      if (window.turnstile && !widget.current) {
        widget.current = window.turnstile.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: onToken,
          "expired-callback": () => onToken(""),
          appearance: "interaction-only",
        });
      }
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = TURNSTILE_SCRIPT;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [onToken]);
  const reset = () => widget.current && window.turnstile?.reset(widget.current);
  return { box, reset };
}

const INTERESTS = [
  { slug: "web-development", label: "Website or web app" },
  { slug: "mobile-apps", label: "Mobile app" },
  { slug: "ai-integration", label: "AI features" },
  { slug: "ai-agents-automation", label: "Automation and agents" },
  { slug: "seo-growth", label: "SEO and growth" },
  { slug: "ui-ux-design", label: "UI/UX design" },
  { slug: "cloud-devops", label: "Cloud and DevOps" },
  { slug: "other", label: "Not sure yet" },
];
const TIMELINES = ["As soon as possible", "In the next 1–3 months", "Later this year", "Just exploring"];

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [interests, setInterests] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [errorText, setErrorText] = useState("");
  const [token, setToken] = useState("");
  const { box: turnstileBox, reset: resetTurnstile } = useTurnstile(setToken);

  // Links like /contact?service=mobile-apps pre-select that interest.
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("service");
    if (preset && INTERESTS.some((i) => i.slug === preset)) setInterests([preset]);
  }, []);

  const toggle = (slug: string) => setInterests((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // The API stores one message; the picked interests and timeline go at the top of it for the team.
    const context = [
      interests.length > 0 && `Interested in: ${INTERESTS.filter((i) => interests.includes(i.slug)).map((i) => i.label).join(", ")}`,
      timeline && `Timeline: ${timeline}`,
    ].filter(Boolean);
    const message = String(data.get("message") ?? "");
    setStatus("sending");
    try {
      await submitContact({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        company: String(data.get("company") ?? "") || undefined,
        message: context.length > 0 ? `${context.join("\n")}\n\n${message}` : message,
        consent: data.get("consent") === "on",
        website: String(data.get("website") ?? ""),
        turnstile_token: token || undefined,
      });
      setStatus("sent");
    } catch (err) {
      // Too many messages (429) or a failed security check (400) come with a message for the visitor.
      setErrorText(
        err instanceof ContactError && (err.status === 429 || err.status === 400)
          ? err.message
          : "Something went wrong. Please try again or email us directly.",
      );
      setStatus("error");
      resetTurnstile();
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="animate-pop rounded-3xl border border-line bg-surface p-8 sm:p-10">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-on-brand">
          <CircleCheckBig className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="mt-6 font-display text-3xl font-bold">Thanks, we have your message.</h2>
        <p className="mt-3 text-muted">We&apos;ll reply with next steps within one business day. Here&apos;s what happens now:</p>
        <ol className="mt-6 space-y-3">
          {["We read your message and look at anything you linked", "We reply to suggest a short call", "After the call you get a fixed quote and timeline"].map((t, i) => (
            <li key={t} className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mist font-display text-sm font-bold text-link">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <Link href="/work" className="mt-8 inline-flex items-center gap-2 font-semibold text-link hover:underline">
          Meanwhile, see our work <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-line bg-background px-4 py-3 outline-none transition placeholder:text-muted/70 focus:border-link focus:bg-surface focus:ring-4 focus:ring-brand/10";

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_60px_-40px_rgba(16,32,28,0.4)] sm:p-8">
      <fieldset>
        <legend className="text-sm font-semibold">What can we help with?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i.slug);
            return (
              <button
                key={i.slug}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(i.slug)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  on ? "border-brand bg-brand text-on-brand" : "border-line bg-background hover:border-link"
                }`}
              >
                {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                {i.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Name
          <input name="name" required minLength={2} maxLength={120} className={field} autoComplete="name" placeholder="Your name" />
        </label>
        <label className="block text-sm font-medium">
          Work email
          <input name="email" type="email" required className={field} autoComplete="email" placeholder="you@company.com" />
        </label>
        <label className="block text-sm font-medium">
          Company (optional)
          <input name="company" maxLength={160} className={field} autoComplete="organization" placeholder="Company name" />
        </label>
        <label className="block text-sm font-medium">
          When do you want to start? (optional)
          <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className={field}>
            <option value="">Choose one</option>
            {TIMELINES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        What do you want to build?
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          className={field}
          placeholder="A few lines about your idea, your goals and anything you already have (a site, an app, designs)."
        />
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
      {TURNSTILE_SITE_KEY && <div ref={turnstileBox} />}
      {/* Honeypot: hidden from people, filled by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "sending"}
          className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-on-brand shadow-[0_14px_30px_-14px_var(--brand)] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {status === "sending" ? "Sending..." : "Send message"}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
        </button>
        <p className="text-sm text-muted">We reply within one business day.</p>
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {errorText}
        </p>
      )}
    </form>
  );
}
