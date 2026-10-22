import Link from "next/link";
import { legal } from "@/lib/site";

/** Shared layout for the privacy, terms and cookie pages: readable measure, dated, cross-linked. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {legal.lastUpdated}</p>
      <p className="mt-6 text-lg text-muted">{intro}</p>
      <div className="mt-10 space-y-10 leading-relaxed">{children}</div>
      <nav aria-label="Legal" className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm">
        <Link href="/privacy" className="text-link hover:underline">
          Privacy policy
        </Link>
        <Link href="/cookies" className="text-link hover:underline">
          Cookie policy
        </Link>
        <Link href="/terms" className="text-link hover:underline">
          Terms of use
        </Link>
      </nav>
    </article>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="font-display text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
