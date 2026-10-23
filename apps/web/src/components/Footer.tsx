import { Mail } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

// Plain links, so the footer never depends on the content API (it also renders on the 404 page).
const serviceLinks = [
  { href: "/services/web-development", label: "Web Development" },
  { href: "/services/mobile-apps", label: "Mobile Apps" },
  { href: "/services/ai-integration", label: "AI Integration" },
  { href: "/services/ai-agents-automation", label: "AI Agents and Automation" },
  { href: "/services/seo-growth", label: "SEO and Growth" },
  { href: "/services/ui-ux-design", label: "UI/UX Design" },
  { href: "/services/cloud-devops", label: "Cloud and DevOps" },
];
const companyLinks = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="ink-scope mt-24 border-t border-line bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 pb-12 pt-14 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_1.4fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted">{site.description}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Services</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {serviceLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Company</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Talk to us</h2>
            <a href={`mailto:${site.email}`} className="mt-4 inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground">
              <Mail className="h-4 w-4" aria-hidden /> {site.email}
            </a>
            <p className="mt-3 text-sm text-muted">We reply within one business day. Working with clients worldwide, remotely.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-6 text-xs text-muted">
          <p>© {new Date().getFullYear()} UJ Global. All rights reserved.</p>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/cookies" className="hover:text-foreground">
              Cookies
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
