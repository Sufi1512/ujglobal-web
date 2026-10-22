"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { safeNextPath, useAdminSession } from "@/components/admin/AdminSession";
import { Logo } from "@/components/Logo";
import { ApiError, login } from "@/lib/admin/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { user, setUser } = useAdminSession();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSending(true);
    setError(null);
    try {
      setUser(await login(String(data.get("email") ?? ""), String(data.get("password") ?? "")));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Wrong email or password."
          : "Could not sign in right now. Please try again.",
      );
      setSending(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-brand";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Email
        <input name="email" type="email" required autoComplete="username" className={field} autoFocus />
      </label>
      <label className="block text-sm">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={field} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-full bg-brand px-6 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line p-8">
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
