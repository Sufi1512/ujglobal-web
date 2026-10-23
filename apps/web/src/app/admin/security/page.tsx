"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { homeFor, useAdminSession } from "@/components/admin/AdminSession";
import { ApiError, type MfaSetup, adminApi } from "@/lib/admin/api";

/**
 * Two-factor sign-in setup: scan a QR code with an authenticator app (Google Authenticator, Microsoft
 * Authenticator, 1Password, ...), confirm with one code, then save the one-time backup codes.
 */
export default function SecurityPage() {
  const { user, setUser } = useAdminSession();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      setSetup(await adminApi.startMfaSetup());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start setup. Please try again.");
    }
    setBusy(false);
  }

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const result = await adminApi.enableMfa(code);
      setCodes(result.backup_codes);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "That code didn't work. Check the time on your phone is set automatically and try the newest code."
          : err instanceof ApiError
            ? err.message
            : "Could not turn on two-factor sign-in. Please try again.",
      );
    }
    setBusy(false);
  }

  function finish() {
    if (user) setUser({ ...user, mfa_enabled: true });
  }

  const card = "rounded-xl border border-line bg-surface p-6";
  const button = "rounded-full bg-brand px-5 py-2 font-medium text-on-brand hover:opacity-90 disabled:opacity-50";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Security</h1>
        <p className="mt-1 text-muted">Two-factor sign-in protects your account even if your password leaks.</p>
      </div>

      {user.mfa_enabled && !codes ? (
        <section className={`${card} flex items-start gap-4`}>
          <ShieldCheck className="h-8 w-8 shrink-0 text-link" aria-hidden />
          <div>
            <h2 className="font-semibold">Two-factor sign-in is on</h2>
            <p className="mt-1 text-sm text-muted">
              You&apos;ll be asked for a code from your authenticator app each time you sign in. Lost your phone and your
              backup codes? Ask an owner to reset it from the server (<code>python -m app.cli reset-mfa</code>).
            </p>
            <Link href={homeFor(user.role)} className="mt-3 inline-block text-sm font-medium text-link underline">
              Back to the admin
            </Link>
          </div>
        </section>
      ) : codes ? (
        <section className={card} aria-labelledby="codes-heading">
          <h2 id="codes-heading" className="font-semibold">
            Two-factor sign-in is on. Save your backup codes
          </h2>
          <p className="mt-1 text-sm text-muted">
            Each code works once, if you lose your phone. Store them in your password manager. They won&apos;t be shown again.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((c) => (
              <li key={c} className="rounded-md bg-mist px-3 py-2">
                {c}
              </li>
            ))}
          </ul>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="accent-[var(--brand)]" />
            I&apos;ve saved these codes somewhere safe
          </label>
          <button type="button" disabled={!saved} onClick={finish} className={`${button} mt-4`}>
            Done
          </button>
        </section>
      ) : (
        <section className={card} aria-labelledby="setup-heading">
          <h2 id="setup-heading" className="font-semibold">
            Set up two-factor sign-in
          </h2>
          {user.mfa_required && (
            <p className="mt-2 rounded-lg bg-mist px-3 py-2 text-sm">
              Your role ({user.role}) can see client data, so two-factor sign-in is required before you can use the admin.
            </p>
          )}
          {!setup ? (
            <>
              <p className="mt-2 text-sm text-muted">
                You&apos;ll need an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or
                1Password.
              </p>
              <button type="button" onClick={start} disabled={busy} className={`${button} mt-4`}>
                {busy ? "Starting…" : "Start setup"}
              </button>
            </>
          ) : (
            <ol className="mt-4 space-y-5 text-sm">
              <li>
                <p className="font-medium">1. Scan this code with your authenticator app</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URI, nothing to optimise */}
                <img src={setup.qr_data_uri} alt="QR code for your authenticator app" width={200} height={200} className="mt-3 rounded-lg border border-line" />
                <details className="mt-2 text-muted">
                  <summary className="cursor-pointer">Can&apos;t scan it? Enter this key instead</summary>
                  <code className="mt-2 block break-all rounded-md bg-mist px-3 py-2 font-mono text-foreground">{setup.secret}</code>
                </details>
              </li>
              <li>
                <form onSubmit={confirm}>
                  <label className="block font-medium">
                    2. Enter the 6-digit code it shows
                    <input
                      name="code"
                      required
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9 ]{6,7}"
                      maxLength={7}
                      placeholder="123 456"
                      className="mt-1 block w-40 rounded-lg border border-line bg-surface px-3 py-2 font-normal tracking-widest outline-none focus:border-link"
                    />
                  </label>
                  <button type="submit" disabled={busy} className={`${button} mt-3`}>
                    {busy ? "Checking…" : "Turn on two-factor sign-in"}
                  </button>
                </form>
              </li>
            </ol>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
