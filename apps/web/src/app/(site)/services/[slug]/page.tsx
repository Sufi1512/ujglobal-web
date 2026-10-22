import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { getService } from "@/lib/content";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// Metadata and the page share one request.
const load = cache(getService);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await load((await params).slug);
  if (!service) return {};
  return {
    title: service.meta_title ?? service.title,
    description: service.meta_description ?? service.summary,
    alternates: { canonical: `/services/${service.slug}` },
    robots: service.noindex ? { index: false } : undefined,
  };
}

export default async function ServicePage({ params }: Props) {
  const service = await load((await params).slug);
  if (!service) notFound();
  const { problem, process, faqs } = service.body;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.title,
      description: service.summary,
      provider: { "@type": "Organization", name: site.name, url: site.url },
      areaServed: "Worldwide",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Services", item: `${site.url}/services` },
        { "@type": "ListItem", position: 2, name: service.title, item: `${site.url}/services/${service.slug}` },
      ],
    },
  ];
  if (faqs.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/services" className="hover:text-foreground">
          Services
        </Link>{" "}
        / {service.title}
      </nav>
      <h1 className="mt-4 font-display text-4xl font-semibold">{service.title}</h1>
      {service.tagline && <p className="mt-3 text-lg font-medium text-link">{service.tagline}</p>}
      <p className="mt-4 text-lg text-muted">{service.summary}</p>

      {problem && (
        <section aria-labelledby="problem-heading" className="mt-12">
          <h2 id="problem-heading" className="font-display text-2xl font-semibold">
            The problem we solve
          </h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed">{problem}</p>
        </section>
      )}

      {service.deliverables.length > 0 && (
        <section aria-labelledby="deliverables-heading" className="mt-12">
          <h2 id="deliverables-heading" className="font-display text-2xl font-semibold">
            What you get
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            {service.deliverables.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {process.length > 0 && (
        <section aria-labelledby="process-heading" className="mt-12">
          <h2 id="process-heading" className="font-display text-2xl font-semibold">
            How it works
          </h2>
          <ol className="mt-6 space-y-6">
            {process.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="font-display text-lg font-semibold text-link">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {service.tech_stack.length > 0 && (
        <section aria-labelledby="stack-heading" className="mt-12">
          <h2 id="stack-heading" className="font-display text-2xl font-semibold">
            Tech we use
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {service.tech_stack.map((t) => (
              <li key={t} className="rounded-full border border-line px-3 py-1 text-sm">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {service.case_studies.length > 0 && (
        <section aria-labelledby="work-heading" className="mt-12">
          <h2 id="work-heading" className="font-display text-2xl font-semibold">
            Related work
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {service.case_studies.slice(0, 4).map((study) => (
              <li key={study.slug}>
                <CaseStudyCard study={study} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {faqs.length > 0 && (
        <section aria-labelledby="faq-heading" className="mt-12">
          <h2 id="faq-heading" className="font-display text-2xl font-semibold">
            Questions
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <span aria-hidden="true" className="text-xl text-muted transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="mt-14 rounded-2xl border border-line p-8">
        <h2 className="font-display text-2xl font-semibold">Talk to us about {service.title}</h2>
        <p className="mt-2 text-muted">Every project is priced to its scope. Tell us what you need and we reply within one business day.</p>
        <Link href="/contact" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-medium text-white">
          Get a quote
        </Link>
      </div>
    </article>
  );
}
