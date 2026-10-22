import Link from "next/link";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { getCaseStudies, getServices } from "@/lib/content";
import { site } from "@/lib/site";

const steps = [
  { title: "Discover", text: "We learn your goals, users and constraints, then agree on scope." },
  { title: "Design", text: "Wireframes and visual design you review before any code is written." },
  { title: "Build", text: "Weekly demos on a staging site so you see progress as it happens." },
  { title: "Launch and grow", text: "Go live, measure, and keep improving speed, SEO and conversion." },
];

export default async function Home() {
  const [services, featured] = await Promise.all([getServices(), getCaseStudies({ featured: true })]);
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:pt-28">
        <p className="text-sm font-medium text-brand">Technology consultancy</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
          {site.tagline}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">{site.description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-full bg-brand px-6 py-3 font-medium text-white hover:opacity-90">
            Get a quote
          </Link>
          <Link href="/services" className="rounded-full border border-line px-6 py-3 font-medium hover:border-brand">
            Explore services
          </Link>
        </div>
      </section>

      <section aria-labelledby="services-heading" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="services-heading" className="font-display text-3xl font-semibold">
          What we build
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/services/${s.slug}`}
                className="block h-full rounded-2xl border border-line p-6 transition hover:border-brand"
              >
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="work-heading" className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="work-heading" className="font-display text-3xl font-semibold">
              Featured work
            </h2>
            <Link href="/work" className="text-sm font-medium text-brand hover:underline">
              See all work
            </Link>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((study) => (
              <li key={study.slug}>
                <CaseStudyCard study={study} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="process-heading" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="process-heading" className="font-display text-3xl font-semibold">
          How we work
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-line p-6">
              <span className="text-sm font-medium text-accent">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl bg-brand px-8 py-12 text-white sm:px-12">
          <h2 className="font-display text-3xl font-semibold">Have a project in mind?</h2>
          <p className="mt-3 max-w-xl text-white/80">
            Tell us what you want to build. We reply within one business day with next steps and a quote.
          </p>
          <Link href="/contact" className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-medium text-brand">
            Start a conversation
          </Link>
        </div>
      </section>
    </>
  );
}
