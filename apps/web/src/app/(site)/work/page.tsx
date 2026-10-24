import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CaseStudyCard, DemoBadge, ProjectCover } from "@/components/CaseStudyCard";
import { CtaPanel } from "@/components/CtaPanel";
import { WorkCollage } from "@/components/illustrations/Scenes";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getCaseStudies, getServices } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description: "Projects built by UJ Global: websites, apps, AI assistants and SEO work, including in-house demos.",
  alternates: { canonical: "/work" },
};

type Props = { searchParams: Promise<{ service?: string }> };

export default async function WorkPage({ searchParams }: Props) {
  const { service } = await searchParams;
  const [services, studies] = await Promise.all([getServices(), getCaseStudies(service ? { service } : {})]);
  const activeService = services.find((s) => s.slug === service);
  const hasDemos = studies.some((s) => s.is_demo);
  const [lead, ...rest] = studies;
  const chip = (active: boolean) =>
    `inline-block rounded-full border px-4 py-2 text-sm font-medium transition ${
      active ? "border-brand bg-brand text-on-brand" : "border-line bg-surface hover:border-link hover:text-link"
    }`;

  return (
    <>
      <PageHero
        eyebrow="Work"
        title="Products we've designed and built"
        aside={<WorkCollage />}
        intro={
          <>
            Websites, apps, AI assistants and automation, with the results they deliver.
            {hasDemos && " Projects marked “Demo project” are built in-house to show what we can do; they are not client work."}
          </>
        }
      >
        <nav aria-label="Filter by service" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/work" scroll={false} aria-current={!activeService ? "page" : undefined} className={chip(!activeService)}>
                All projects
              </Link>
            </li>
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/work?service=${s.slug}`}
                  scroll={false}
                  aria-current={activeService?.slug === s.slug ? "page" : undefined}
                  className={chip(activeService?.slug === s.slug)}
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      <div className="container-site">
        {lead ? (
          <>
            <Reveal>
              <Link
                href={`/work/${lead.slug}`}
                className="group grid overflow-hidden rounded-[2rem] border border-line bg-surface transition hover:border-link hover:shadow-[0_30px_60px_-35px_rgba(16,32,28,0.45)] lg:grid-cols-2"
              >
                <ProjectCover slug={lead.slug} large className="min-h-80 lg:min-h-[28rem]" />
                <div className="flex flex-col p-8 sm:p-10">
                  <div className="flex items-center justify-between gap-4">
                    {lead.is_demo ? <DemoBadge /> : <span className="text-sm text-muted">{lead.client_name}</span>}
                    <ArrowUpRight className="h-6 w-6 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-link" aria-hidden />
                  </div>
                  <h2 className="mt-6 font-display text-3xl font-bold tracking-tight">{lead.title}</h2>
                  {lead.summary && <p className="mt-3 text-lg text-muted">{lead.summary}</p>}
                  {lead.results.length > 0 && (
                    <dl className="mt-auto grid grid-cols-2 gap-4 pt-8">
                      {lead.results.slice(0, 2).map((r) => (
                        <div key={r.label} className="flex flex-col rounded-2xl bg-mist p-4">
                          <dt className="text-sm text-muted">{r.label}</dt>
                          <dd className="order-first font-display text-3xl font-bold text-link">{r.metric}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </Link>
            </Reveal>
            {rest.length > 0 && (
              <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((study, i) => (
                  <Reveal as="li" key={study.slug} delay={(i % 3) * 100}>
                    <CaseStudyCard study={study} headingLevel={2} />
                  </Reveal>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-line bg-surface p-10 text-center">
            <p className="font-display text-xl font-semibold">
              {activeService ? `No ${activeService.title} projects to show yet.` : "Our first projects are on their way."}
            </p>
            <p className="mt-2 text-muted">We&apos;d love for yours to be one of them.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {activeService && (
                <Link href="/work" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-link">
                  See all projects
                </Link>
              )}
              <Link href="/contact" className="rounded-xl bg-brand px-5 py-3 font-semibold text-on-brand">
                Tell us about yours
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-16">
        <CtaPanel title="Want results like these?" text="Tell us what you want to build. We reply within one business day with next steps." />
      </div>
    </>
  );
}
