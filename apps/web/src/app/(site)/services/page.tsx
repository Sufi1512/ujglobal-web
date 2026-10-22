import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description: "Web development, mobile apps, AI integration, automation, SEO, design and DevOps from UJ Global.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="font-display text-4xl font-semibold">Services</h1>
      <p className="mt-4 max-w-2xl text-muted">
        One team for strategy, design, engineering and growth. Pick a service to see what is included.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <li key={s.slug}>
            <Link href={`/services/${s.slug}`} className="block rounded-2xl border border-line p-6 hover:border-brand">
              <h2 className="font-display text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted">{s.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
