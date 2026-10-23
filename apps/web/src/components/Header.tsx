"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const nav = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the phone menu after navigating, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,box-shadow] ${
        scrolled || open ? "border-b border-line bg-background/85 shadow-[0_10px_30px_-25px_rgba(16,32,28,0.5)] backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[72px]">
        <Link href="/" aria-label="UJ Global home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-full px-4 py-2 transition ${
                isActive(item.href) ? "bg-surface font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="group ml-3 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 font-semibold text-on-brand transition hover:shadow-[0_10px_24px_-10px_var(--brand)]"
          >
            Get a quote <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </nav>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="animate-pop border-t border-line px-4 pb-6 pt-2 md:hidden">
          <ul className="divide-y divide-line">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center justify-between py-4 font-display text-xl font-semibold ${isActive(item.href) ? "text-link" : ""}`}
                >
                  {item.label} <ArrowRight className="h-5 w-5 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/contact" className="mt-4 flex justify-center rounded-xl bg-brand px-4 py-3.5 font-semibold text-on-brand">
            Get a quote
          </Link>
        </nav>
      )}
    </header>
  );
}
