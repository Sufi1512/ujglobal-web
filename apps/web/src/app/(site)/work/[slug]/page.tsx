import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DemoBadge } from "@/components/CaseStudyCard";
import { getCaseStudy } from "@/lib/content";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

const load = cache(getCaseStudy);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const study = await load((await params).slug);
  if (!study) return {};
  return {
    title: study.meta_title ?? study.title,
    description: study.meta_description ?? study.summary ?? undefined,
    alternates: { canonical: `/work/${study.slug}` },
    robots: study.noindex ? { index: false } : undefined,
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const study = await load((await params).slug);
  if (!study) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Work", item: `${site.url}/work` },
      { "@type": "ListItem", position: 2, name: study.title, item: `${site.url}/work/${study.slug}` },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/work" className="hover:text-foreground">
          Work
        </Link>{" "}
        / {study.title}
      </nav>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {study.is_demo ? <DemoBadge /> : study.client_name && <span className="text-sm text-muted">{study.client_name}</span>}
      </div>
      <h1 className="mt-3 font-display text-4xl font-semibold">{study.title}</h1>
      {study.summary && <p className="mt-4 text-lg text-muted">{study.summary}</p>}
      {study.is_demo && (
        <p className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          This is an in-house demo project built by UJ Global to show our approach. It is not client work.
        </p>
      )}

      {study.results.length > 0 && (
        <section aria-labelledby="results-heading" className="mt-12">
          <h2 id="results-heading" className="font-display text-2xl font-semibold">
            Results
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            {study.results.map((r) => (
              <div key={r.label} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                <dt className="text-sm text-muted">{r.label}</dt>
                <dd className="order-first font-display text-3xl font-semibold text-link">{r.metric}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {study.challenge && (
        <section aria-labelledby="challenge-heading" className="mt-12">
          <h2 id="challenge-heading" className="font-display text-2xl font-semibold">
            The challenge
          </h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed">{study.challenge}</p>
        </section>
      )}

      {study.solution && (
        <section aria-labelledby="solution-heading" className="mt-12">
          <h2 id="solution-heading" className="font-display text-2xl font-semibold">
            What we built
          </h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed">{study.solution}</p>
        </section>
      )}

      {(study.tech_stack.length > 0 || study.services.length > 0) && (
        <section aria-labelledby="stack-heading" className="mt-12">
          <h2 id="stack-heading" className="font-display text-2xl font-semibold">
            Stack and services
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {study.tech_stack.map((t) => (
              <li key={t} className="rounded-full border border-line px-3 py-1 text-sm">
                {t}
              </li>
            ))}
            {study.services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="inline-block rounded-full bg-brand/10 px-3 py-1 text-sm text-link hover:underline">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 flex flex-wrap gap-3">
        {study.live_url && (
          <a href={study.live_url} rel="noopener" target="_blank" className="rounded-full border border-line px-6 py-3 font-medium hover:border-link">
            {study.is_demo ? "Try the live demo" : "Visit the live site"}
          </a>
        )}
        <Link href="/contact" className="rounded-full bg-brand px-6 py-3 font-medium text-on-brand">
          Get a quote for something similar
        </Link>
      </div>
    </article>
  );
}
