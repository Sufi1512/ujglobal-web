"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { type AdminUser, logout, refreshSession, setSignedOutHandler } from "@/lib/admin/api";

type SessionState = {
  user: AdminUser | null;
  setUser: (user: AdminUser | null) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function useAdminSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useAdminSession must be used inside AdminSession");
  return value;
}

const LOGIN_PATH = "/admin/login";

/** Only same-site admin paths are allowed as a post-login destination, so ?next= can't redirect off-site. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/admin/") && !next.startsWith("//") && next !== LOGIN_PATH ? next : "/admin/leads";
}

export function AdminSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const onLoginPage = pathname === LOGIN_PATH;
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checked, setChecked] = useState(false);
  // Set while signing out on purpose, so the "session lost" redirect below doesn't add a ?next= back link.
  const signingOut = useRef(false);

  const goToLogin = useCallback(() => {
    setUser(null);
    const next = window.location.pathname + window.location.search;
    router.replace(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
  }, [router]);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let cancelled = false;
    refreshSession().then((session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (onLoginPage) signingOut.current = false;
    else if (checked && !user && !signingOut.current) goToLogin();
  }, [checked, user, onLoginPage, goToLogin]);

  useEffect(() => {
    setSignedOutHandler(goToLogin);
    return () => setSignedOutHandler(null);
  }, [goToLogin]);

  const signOut = useCallback(async () => {
    signingOut.current = true;
    await logout();
    setUser(null);
    router.replace(LOGIN_PATH);
  }, [router]);

  let content: React.ReactNode;
  if (onLoginPage) {
    content = children;
  } else if (!checked || !user) {
    content = (
      <p className="p-8 text-sm text-muted" role="status">
        Loading…
      </p>
    );
  } else {
    content = (
      <>
        <header className="border-b border-line">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-6">
              <Link href="/admin/leads" aria-label="Admin home">
                <Logo />
              </Link>
              <nav aria-label="Admin" className="text-sm">
                <Link
                  href="/admin/leads"
                  className={pathname.startsWith("/admin/leads") ? "font-medium" : "text-muted hover:text-foreground"}
                >
                  Leads
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden text-muted sm:inline">
                {user.name} · {user.role}
              </span>
              <button type="button" onClick={signOut} className="rounded-md border border-line px-3 py-1.5 hover:border-brand">
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </>
    );
  }

  return <SessionContext.Provider value={{ user, setUser, signOut }}>{content}</SessionContext.Provider>;
}
