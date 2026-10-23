"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const BAR_COLOURS: Record<Theme, string> = { light: "#f6f3ec", dark: "#0d1613" };

/** Light/dark switch. Light is the default; the choice is remembered on this device only. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  // Unknown until mounted: the server can't know what this visitor picked last time.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOURS[next]);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage blocked (private mode): the switch still works for this visit.
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-foreground transition hover:border-link hover:text-link ${className}`}
    >
      {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : theme === "light" ? <Moon className="h-5 w-5" aria-hidden /> : null}
    </button>
  );
}
