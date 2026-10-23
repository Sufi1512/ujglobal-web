"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { safeNextPath, useAdminSession } from "@/components/admin/AdminSession";
import { Logo } from "@/components/Logo";
import { ApiError, login, verifyMfa } from "@/lib/admin/api";

function errorText(err: unknown, wrong: string): string {
  if (err instanceof ApiError && err.status === 401) return wrong;
  // 429: too many attempts; the API's message says how long to wait.
  if (err instanceof ApiError && err.status === 429) return err.message;
  return "Could not sign in right now. Please try again.";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { user, setUser } = useAdminSession();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Set once the password is accepted for an account with two-factor sign-in.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  async function onPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSending(true);
    setError(null);
    try {
      const result = await login(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
      if (result.kind === "mfa") {
        setMfaToken(result.mfaToken);
        setSending(false);
      } else {
        setUser(result.user);
      }
    } catch (err) {
      setError(errorText(err, "Wrong email or password."));
      setSending(false);
    }
  }

  async function onCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaToken) return;
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    setSending(true);
    setError(null);
    try {
      setUser(await verifyMfa(mfaToken, code));
    } catch (err) {
      if (err instanceof ApiError && err.message.startsWith("Sign-in expired")) {
        setMfaToken(null);
        setError("That took a while, so please sign in again.");
      } else {
        setError(errorText(err, "That code didn't work. Check the time on your phone and try the newest code."));
      }
      setSending(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-link";
  const button =
    "w-full rounded-full bg-brand px-6 py-2.5 font-medium text-on-brand hover:opacity-90 disabled:opacity-60";
  const alert = error && (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
      {error}
    </p>
  );

  if (mfaToken) {
    return (
      <form onSubmit={onCode} className="space-y-4">
        <p className="text-sm text-muted">
          {useBackup
            ? "Enter one of the backup codes you saved when you set up two-factor sign-in. Each works once."
            : "Open your authenticator app and enter the 6-digit code for UJ Global."}
        </p>
        <label className="block text-sm">
          {useBackup ? "Backup code" : "Authentication code"}
          <input
            key={useBackup ? "backup" : "totp"}
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={useBackup ? "text" : "numeric"}
            pattern={useBackup ? undefined : "[0-9 ]{6,7}"}
            maxLength={useBackup ? 20 : 7}
            placeholder={useBackup ? "xxxx-xxxx" : "123 456"}
            className={`${field} tracking-widest`}
          />
        </label>
        {alert}
        <button type="submit" disabled={sending} className={button}>
          {sending ? "Checking…" : "Verify and sign in"}
        </button>
        <button type="button" onClick={() => setUseBackup((v) => !v)} className="w-full text-sm text-link underline">
          {useBackup ? "Use the authenticator app instead" : "Lost your phone? Use a backup code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="space-y-4">
      <label className="block text-sm">
        Email
        <input name="email" type="email" required autoComplete="username" className={field} autoFocus />
      </label>
      <label className="block text-sm">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={field} />
      </label>
      {alert}
      <button type="submit" disabled={sending} className={button}>
        {sending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold">Sign in to admin</h1>
        <p className="mt-1 text-sm text-muted">For the UJ Global team only.</p>
        <div className="mt-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
