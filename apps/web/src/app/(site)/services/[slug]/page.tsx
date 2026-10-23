import { ArrowRight, Check, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { CtaPanel } from "@/components/CtaPanel";
import { FaqList, faqJsonLd } from "@/components/ui/FaqList";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/Section";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { serviceLook } from "@/lib/catalog";
import { getService, getServices } from "@/lib/content";
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
  const [service, all] = await Promise.all([load((await params).slug), getServices()]);
  if (!service) notFound();
  const { problem, process, faqs } = service.body;
  const look = serviceLook(service.slug);
  const others = all.filter((s) => s.slug !== service.slug);

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
  if (faqs.length > 0) jsonLd.push(faqJsonLd(faqs));

  return (
    <article>
      <JsonLd data={jsonLd} />
      <PageHero
        breadcrumb={
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
            <Link href="/services" className="hover:text-foreground">
              Services
            </Link>{" "}
            <span aria-hidden>/</span> <span aria-current="page">{service.title}</span>
          </nav>
        }
        eyebrow={service.title}
        title={service.tagline ?? service.title}
        intro={service.summary}
        aside={<ServiceVisual kind={look.visual} />}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/contact?service=${service.slug}`}
            className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-on-brand shadow-[0_14px_30px_-14px_var(--brand)] transition hover:-translate-y-0.5"
          >
            Get a quote <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
          </Link>
          {service.case_studies.length > 0 && (
            <a href="#work" className="rounded-xl border border-line bg-surface px-6 py-3.5 font-semibold transition hover:border-link hover:text-link">
              See related work
            </a>
          )}
        </div>
      </PageHero>

      {problem && (
        <section aria-labelledby="problem-heading" className="mx-auto max-w-6xl px-4 py-8">
          <Reveal className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-8 sm:flex-row sm:items-center sm:p-10">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-signal text-on-signal">
              <CircleAlert className="h-7 w-7" aria-hidden />
            </span>
            <div>
              <h2 id="problem-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-link">
                Sound familiar?
              </h2>
              <p className="mt-2 whitespace-pre-line font-display text-xl font-semibold leading-snug sm:text-2xl">{problem}</p>
            </div>
          </Reveal>
        </section>
      )}

      {service.deliverables.length > 0 && (
        <section aria-labelledby="deliverables-heading" className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeading id="deliverables-heading" eyebrow="What you get" title={`Everything included in ${service.title}`} />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {service.deliverables.map((d, i) => (
              <Reveal as="li" key={d} delay={(i % 3) * 80} className="group flex items-start gap-4 rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-link">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-link transition group-hover:bg-brand group-hover:text-on-brand">
                  <Check className="h-5 w-5" aria-hidden />
                </span>
                <span className="pt-2 font-medium">{d}</span>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {process.length > 0 && (
        <section aria-labelledby="process-heading" className="bg-mist py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading id="process-heading" eyebrow="How it works" title="From first call to launch" />
            <ol className="relative mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <span className="absolute left-0 right-0 top-6 hidden h-0.5 bg-line lg:block" aria-hidden />
              {process.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 100} className="relative">
                  <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-brand font-display font-bold text-on-brand ring-8 ring-mist">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}

      {service.tech_stack.length > 0 && (
        <section aria-labelledby="stack-heading" className="mx-auto max-w-6xl px-4 py-20">
          <Reveal className="grid gap-6 rounded-3xl border border-line bg-surface p-8 sm:p-10 lg:grid-cols-[1fr_2fr] lg:items-center">
            <div>
              <h2 id="stack-heading" className="font-display text-2xl font-bold">
                Tools we use
              </h2>
              <p className="mt-2 text-muted">Proven, well-supported technology, so your product is easy to hire for and maintain.</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {service.tech_stack.map((t) => (
                <li key={t} className="rounded-full border border-line bg-mist px-4 py-2 font-display text-sm font-medium">
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {service.case_studies.length > 0 && (
        <section id="work" aria-labelledby="work-heading" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12">
          <SectionHeading id="work-heading" eyebrow="Related work" title={`${service.title} in practice`} />
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {service.case_studies.slice(0, 3).map((study, i) => (
              <Reveal as="li" key={study.slug} delay={i * 100}>
                <CaseStudyCard study={study} />
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {faqs.length > 0 && (
        <section aria-labelledby="faq-heading" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[2fr_3fr]">
          <SectionHeading id="faq-heading" eyebrow="Questions" title={`About ${service.title}`} />
          <Reveal>
            <FaqList items={faqs} />
          </Reveal>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="more-heading" className="mx-auto max-w-6xl px-4 pb-12">
          <h2 id="more-heading" className="font-display text-xl font-semibold">
            More services
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((s) => {
              const { icon: Icon } = serviceLook(s.slug);
              return (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-link"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-link transition group-hover:bg-brand group-hover:text-on-brand">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-medium">{s.title}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted transition group-hover:translate-x-1 group-hover:text-link" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <CtaPanel href={`/contact?service=${service.slug}`} title={`Talk to us about ${service.title}`} text="Every project is priced to its scope. Tell us what you need and we reply within one business day." />
    </article>
  );
}
