import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaPanel } from "@/components/CtaPanel";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { serviceLook } from "@/lib/catalog";
import { getServices } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description: "Web development, mobile apps, AI integration, automation, SEO, design and DevOps from UJ Global.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Everything you need to build, launch and grow"
        intro="One team for strategy, design, engineering, AI and growth, so nothing gets lost between agencies."
      >
        <ul className="mt-8 flex flex-wrap gap-2" aria-label="Jump to a service">
          {services.map((s) => {
            const { icon: Icon } = serviceLook(s.slug);
            return (
              <li key={s.slug}>
                <a
                  href={`#${s.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:border-link hover:text-link"
                >
                  <Icon className="h-4 w-4" aria-hidden /> {s.title}
                </a>
              </li>
            );
          })}
        </ul>
      </PageHero>

      <div className="container-site space-y-6">
        {services.map((s, i) => {
          const look = serviceLook(s.slug);
          const flip = i % 2 === 1;
          return (
            <Reveal
              as="section"
              key={s.slug}
              className="overflow-hidden rounded-[2rem] border border-line bg-surface"
            >
              <div id={s.slug} className="scroll-mt-24 grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-12">
                <div className={flip ? "lg:order-2" : ""}>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-on-brand">
                    <look.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="mt-5 font-display text-3xl font-bold tracking-tight">{s.title}</h2>
                  {s.tagline && <p className="mt-2 font-medium text-link">{s.tagline}</p>}
                  <p className="mt-3 text-muted">{s.summary}</p>
                  {s.deliverables.length > 0 && (
                    <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {s.deliverables.slice(0, 6).map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-link" aria-hidden />
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={`/services/${s.slug}`}
                    className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-on-brand transition hover:-translate-y-0.5"
                  >
                    Explore {s.title}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                  </Link>
                </div>
                <div className={`relative rounded-3xl bg-mist p-5 sm:p-8 ${flip ? "lg:order-1" : ""}`}>
                  <div className="bg-grid pointer-events-none absolute inset-0 rounded-3xl opacity-50" aria-hidden />
                  <ServiceVisual kind={look.visual} className="relative" />
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="mt-16">
        <CtaPanel title="Not sure which service you need?" text="Tell us what you're trying to achieve and we'll suggest the right mix, with a fixed quote." />
      </div>
    </>
  );
}
