import Link from "next/link";
import { site, services } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted">{site.tagline}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Services</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {services.slice(0, 5).map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="hover:text-foreground">
                  {s.title}
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
