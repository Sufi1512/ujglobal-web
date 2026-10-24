"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { type AdminUser, type Role, logout, refreshSession, setSignedOutHandler } from "@/lib/admin/api";

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

/** Admin sections and who may use them (owners can use everything). */
export const ADMIN_SECTIONS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin/leads", label: "Leads", roles: ["owner", "sales"] },
  { href: "/admin/services", label: "Services", roles: ["owner", "editor"] },
  { href: "/admin/case-studies", label: "Case studies", roles: ["owner", "editor"] },
];

export function canUse(role: Role, href: string): boolean {
  const section = ADMIN_SECTIONS.find((s) => href.startsWith(s.href));
  return !section || section.roles.includes(role);
}

/** Where someone lands after signing in: the first section their role can use. */
export function homeFor(role: Role): string {
  return ADMIN_SECTIONS.find((s) => s.roles.includes(role))?.href ?? "/admin/leads";
}

/** Only same-site admin paths are allowed as a post-login destination, so ?next= can't redirect off-site. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/admin/") && !next.startsWith("//") && next !== LOGIN_PATH ? next : "/admin";
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
          <div className="container-site flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/admin" aria-label="Admin home">
                <Logo />
              </Link>
              <nav aria-label="Admin" className="flex gap-4 text-sm">
                {ADMIN_SECTIONS.filter((section) => section.roles.includes(user.role) || user.role === "owner").map(
                  (section) => (
                    <Link
                      key={section.href}
                      href={section.href}
                      aria-current={pathname.startsWith(section.href) ? "page" : undefined}
                      className={
                        pathname.startsWith(section.href) ? "font-medium" : "text-muted hover:text-foreground"
                      }
                    >
                      {section.label}
                    </Link>
                  ),
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <ThemeToggle className="h-9 w-9" />
              <Link
                href="/admin/security"
                aria-current={pathname.startsWith("/admin/security") ? "page" : undefined}
                className={pathname.startsWith("/admin/security") ? "font-medium" : "text-muted hover:text-foreground"}
              >
                Security
              </Link>
              <span className="hidden text-muted sm:inline">
                {user.name} · {user.role}
              </span>
              <button type="button" onClick={signOut} className="rounded-md border border-line px-3 py-1.5 hover:border-link">
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="container-site py-8">
          {user.mfa_required && !user.mfa_enabled && !pathname.startsWith("/admin/security") ? (
            // The API refuses admin data until this is done; this explains why and where to go.
            <div className="max-w-2xl rounded-xl border border-line bg-surface p-8">
              <h1 className="font-display text-2xl font-semibold">Set up two-factor sign-in first</h1>
              <p className="mt-2 text-sm text-muted">
                Your role can see client data, so your account needs a second step at sign-in: a code from an
                authenticator app on your phone. It takes about a minute.
              </p>
              <Link href="/admin/security" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-on-brand">
                Set it up now
              </Link>
            </div>
          ) : canUse(user.role, pathname) || user.role === "owner" ? (
            children
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8">
              <h1 className="font-display text-2xl font-semibold">Not available for your role</h1>
              <p className="mt-2 text-sm text-muted">
                This section isn&apos;t part of the {user.role} role. Ask an owner if you need access.
              </p>
              <Link href={homeFor(user.role)} className="mt-4 inline-block text-sm font-medium text-link underline">
                Go to your admin home
              </Link>
            </div>
          )}
        </main>
      </>
    );
  }

  return <SessionContext.Provider value={{ user, setUser, signOut }}>{content}</SessionContext.Provider>;
}
