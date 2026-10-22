import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

// Plain links, so the footer never depends on the content API (it also renders on the 404 page).
const links = [
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Get a quote" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted">{site.tagline}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Company</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Contact</h2>
          <p className="mt-3 text-sm text-muted">
            <a href={`mailto:${site.email}`} className="hover:text-foreground">
              {site.email}
            </a>
          </p>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-muted">© {new Date().getFullYear()} UJ Global. All rights reserved.</p>
    </footer>
  );
}
