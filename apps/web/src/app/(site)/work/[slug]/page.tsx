import { ArrowLeft, ArrowRight, Hammer, Info, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CaseStudyCard, DemoBadge } from "@/components/CaseStudyCard";
import { CtaPanel } from "@/components/CtaPanel";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { projectCover } from "@/lib/catalog";
import { getCaseStudies, getCaseStudy } from "@/lib/content";
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
  const [study, all] = await Promise.all([load((await params).slug), getCaseStudies()]);
  if (!study) notFound();
  const more = all.filter((s) => s.slug !== study.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Work", item: `${site.url}/work` },
      { "@type": "ListItem", position: 2, name: study.title, item: `${site.url}/work/${study.slug}` },
    ],
  };

  return (
    <article>
      <JsonLd data={jsonLd} />
      <PageHero
        breadcrumb={
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
            <Link href="/work" className="inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden /> All work
            </Link>
          </nav>
        }
        eyebrow={study.is_demo ? "Demo project" : (study.client_name ?? "Case study")}
        title={study.title}
        intro={study.summary}
        aside={<ServiceVisual kind={projectCover(study.slug)} />}
      >
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {study.is_demo && <DemoBadge />}
          {study.services.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-link hover:underline">
              {s.title}
            </Link>
          ))}
        </div>
      </PageHero>

      {study.is_demo && (
        <div className="container-site">
          <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-link" aria-hidden />
            This is an in-house demo project built by UJ Global to show our approach. It is not client work, and the
            results are from our own testing.
          </p>
        </div>
      )}

      {study.results.length > 0 && (
        <section aria-labelledby="results-heading" className="container-site py-12">
          <h2 id="results-heading" className="sr-only">
            Results
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {study.results.map((r, i) => (
              <Reveal key={r.label} delay={i * 100} className="flex flex-col rounded-3xl bg-brand p-8 text-on-brand">
                <dt className="mt-2 opacity-90">{r.label}</dt>
                <dd className="order-first font-display text-5xl font-bold">{r.metric}</dd>
              </Reveal>
            ))}
          </dl>
        </section>
      )}

      {(study.challenge || study.solution) && (
        <section className="container-site grid gap-6 py-8 lg:grid-cols-2">
          {study.challenge && (
            <Reveal className="rounded-3xl border border-line bg-surface p-8 sm:p-10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-signal text-on-signal">
                <Target className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-6 font-display text-2xl font-bold">The challenge</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{study.challenge}</p>
            </Reveal>
          )}
          {study.solution && (
            <Reveal delay={100} className="rounded-3xl border border-line bg-surface p-8 sm:p-10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-on-brand">
                <Hammer className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-6 font-display text-2xl font-bold">What we built</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{study.solution}</p>
            </Reveal>
          )}
        </section>
      )}

      {study.tech_stack.length > 0 && (
        <section aria-labelledby="stack-heading" className="container-site py-8">
          <Reveal className="flex flex-col gap-5 rounded-3xl bg-mist p-8 sm:flex-row sm:items-center sm:p-10">
            <h2 id="stack-heading" className="shrink-0 font-display text-xl font-bold sm:w-48">
              Built with
            </h2>
            <ul className="flex flex-wrap gap-2">
              {study.tech_stack.map((t) => (
                <li key={t} className="rounded-full border border-line bg-surface px-4 py-2 font-display text-sm font-medium">
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {(study.live_url || study.services.length > 0) && (
        <div className="container-site flex flex-wrap gap-3 py-8">
          {study.live_url && (
            <a href={study.live_url} rel="noopener" target="_blank" className="rounded-xl border border-line bg-surface px-6 py-3.5 font-semibold hover:border-link">
              {study.is_demo ? "Try the live demo" : "Visit the live site"}
            </a>
          )}
          <Link
            href={study.services[0] ? `/contact?service=${study.services[0].slug}` : "/contact"}
            className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-on-brand"
          >
            Get a quote for something similar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-heading" className="container-site py-16">
          <h2 id="more-heading" className="font-display text-3xl font-bold tracking-tight">
            More projects
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {more.map((s, i) => (
              <Reveal as="li" key={s.slug} delay={i * 100}>
                <CaseStudyCard study={s} />
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <CtaPanel title="Have a similar project?" />
    </article>
  );
}
