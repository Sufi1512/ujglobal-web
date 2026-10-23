import Link from "next/link";
import { Logo } from "./Logo";

const nav = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="UJ Global home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hidden text-muted hover:text-foreground sm:inline">
              {item.label}
            </Link>
          ))}
          <Link href="/contact" className="rounded-full bg-brand px-4 py-2 font-medium text-on-brand hover:opacity-90">
            Get a quote
          </Link>
        </nav>
      </div>
    </header>
  );
}
