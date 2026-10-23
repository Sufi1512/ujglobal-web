import { ArrowRight, CalendarCheck, KeyRound, MessagesSquare, SearchCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { CtaPanel } from "@/components/CtaPanel";
import { HeroVisual } from "@/components/home/HeroVisual";
import { ProcessSteps, type Step } from "@/components/home/ProcessSteps";
import { ServiceExplorer } from "@/components/home/ServiceExplorer";
import { FaqList, faqJsonLd, type FaqItem } from "@/components/ui/FaqList";
import { Marquee } from "@/components/ui/Marquee";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/Section";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { serviceLook, TOOLS } from "@/lib/catalog";
import { getCaseStudies, getServices } from "@/lib/content";
import { site } from "@/lib/site";

const steps: Step[] = [
  {
    title: "Discover",
    weeks: "Week 1",
    text: "A working session to understand your goals, users and constraints. We look at what you have today and agree on what success means, in numbers where we can.",
    outputs: ["Clear scope and priorities", "Fixed quote and timeline", "Risks flagged up front"],
  },
  {
    title: "Design",
    weeks: "Weeks 2–3",
    text: "Wireframes first, then the visual design, as clickable prototypes you can try on your phone. You review and sign off before any code is written.",
    outputs: ["Clickable prototype", "Visual design in your brand", "Content and SEO plan"],
  },
  {
    title: "Build",
    weeks: "Weeks 3–8",
    text: "Short cycles with a demo every week on a private staging site, so you see real progress and can change direction early, not after launch.",
    outputs: ["Weekly demo and progress notes", "Private staging site", "Tested, documented code"],
  },
  {
    title: "Launch and grow",
    weeks: "Ongoing",
    text: "We launch, watch the numbers and keep improving: speed, search rankings, conversion and new features, for as long as you want us around.",
    outputs: ["Smooth go-live and handover", "Analytics and monitoring", "Monthly improvements, if you want them"],
  },
];

const reasons = [
  {
    icon: UsersRound,
    title: "Senior people, start to finish",
    text: "The people you meet are the people who design and build your product. No hand-offs to a junior team after the sale.",
  },
  {
    icon: CalendarCheck,
    title: "A demo every week",
    text: "You see working software every week on a private staging site, so there are no surprises at the end.",
  },
  {
    icon: SearchCheck,
    title: "Built to be found",
    text: "Speed, accessibility and technical SEO are part of every build, not an extra you pay for later.",
  },
  {
    icon: KeyRound,
    title: "You own everything",
    text: "Code, designs, accounts and data are yours from day one, documented so any team can carry them on.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "How much does a project cost?",
    answer:
      "Every project is priced to its scope, so we don't publish prices. Tell us what you need and within one business day you'll get next steps; after a short call we send a fixed quote with a timeline.",
  },
  {
    question: "How long does it take?",
    answer:
      "A marketing website usually takes 4 to 6 weeks, a mobile app or web app 8 to 16 weeks, and a first AI feature on your own data about 2 to 4 weeks. We agree the timeline before we start.",
  },
  {
    question: "Do you work with companies outside your country?",
    answer: "Yes. We work remotely with clients worldwide, in English, with calls scheduled in your time zone.",
  },
  {
    question: "Can you improve something we already have?",
    answer:
      "Yes. Many projects start from an existing site or app: we audit it, fix what's slowing it down, and add the new features or AI capabilities on top.",
  },
  {
    question: "What happens after launch?",
    answer:
      "You get a handover with documentation and access to everything. If you want us to stay on, we offer monthly support for fixes, improvements, SEO and new features.",
  },
];

export default async function Home() {
  const [services, featured] = await Promise.all([getServices(), getCaseStudies({ featured: true })]);
  const visuals = Object.fromEntries(services.map((s) => [s.slug, <ServiceVisual key={s.slug} kind={serviceLook(s.slug).visual} />]));

  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />

      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden pt-16 sm:-mt-[72px] sm:pt-[72px]">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="glow-brand pointer-events-none absolute -right-40 -top-40 h-[760px] w-[760px]" aria-hidden />
        <div className="glow-signal pointer-events-none absolute -left-48 top-[420px] h-[560px] w-[560px]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28">
          <div>
            <p className="animate-pop inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/80 px-4 py-1.5 text-sm text-muted backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse-ring" aria-hidden />
              Technology consultancy · Worldwide
            </p>
            <h1 className="animate-pop mt-6 font-display text-[2.6rem] font-bold leading-[1.04] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-[4.1rem]">
              Websites, apps and <span className="text-link">AI</span> that move your business{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">forward.</span>
                <svg viewBox="0 0 220 18" className="absolute -bottom-2 left-0 z-0 h-4 w-full" preserveAspectRatio="none" aria-hidden>
                  <path className="draw-line" d="M3 13 C 60 4, 150 4, 217 10" fill="none" stroke="var(--signal)" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="animate-pop mt-6 max-w-xl text-lg leading-relaxed text-muted [animation-delay:160ms]">
              Design, engineering and growth under one roof. We plan, design and build the product, launch it, and keep
              making it faster, easier to find and better at converting.
            </p>
            <div className="animate-pop mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-on-brand shadow-[0_14px_30px_-14px_var(--brand)] transition hover:-translate-y-0.5"
              >
                Get a quote <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link href="/work" className="rounded-xl border border-line bg-surface/80 px-6 py-3.5 font-semibold backdrop-blur transition hover:border-link hover:text-link">
                See our work
              </Link>
            </div>
            <dl className="animate-pop mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6 [animation-delay:320ms]">
              <div>
                <dt className="text-sm text-muted">Services</dt>
                <dd className="font-display text-2xl font-bold sm:text-3xl">{services.length || 7}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Reply time</dt>
                <dd className="font-display text-2xl font-bold sm:text-3xl">1 day</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Clients</dt>
                <dd className="font-display text-2xl font-bold sm:text-3xl">Global</dd>
              </div>
            </dl>
          </div>
          <div className="animate-pop [animation-delay:200ms]">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Tools */}
      <section aria-label="Tools we use" className="border-y border-line bg-mist/60 py-8">
        <p className="mb-5 text-center text-sm font-medium text-muted">Built with modern, proven tools</p>
        <Marquee items={TOOLS} label="Tools we use" />
      </section>

      {/* Services */}
      <section aria-labelledby="services-heading" className="mx-auto max-w-6xl px-4 py-24">
        <SectionHeading
          id="services-heading"
          eyebrow="What we build"
          title="Everything your product needs, from one team"
          intro="Pick a service to see what it looks like in practice."
          action={
            <Link href="/services" className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline">
              All services <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
        <Reveal className="mt-12">
          <ServiceExplorer
            services={services.map((s) => ({ slug: s.slug, title: s.title, summary: s.summary, deliverables: s.deliverables }))}
            visuals={visuals}
          />
        </Reveal>
      </section>

      {/* Why us */}
      <section aria-labelledby="why-heading" className="bg-mist py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading id="why-heading" eyebrow="Why UJ Global" title="A partner, not just a vendor" />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            <Reveal className="relative overflow-hidden rounded-3xl bg-brand p-8 text-on-brand lg:row-span-2">
              <MessagesSquare className="h-8 w-8" aria-hidden />
              <h3 className="mt-6 font-display text-3xl font-bold leading-tight">One team from the first idea to launch day and beyond.</h3>
              <p className="mt-4 opacity-90">
                Strategy, design, engineering, AI and SEO sit together, so nothing gets lost between agencies and you have one
                place to ask.
              </p>
              <ul className="mt-10 flex flex-wrap gap-2" aria-label="Disciplines">
                {["Strategy", "UI/UX design", "Web", "Mobile", "AI", "SEO", "Cloud", "Support"].map((d) => (
                  <li key={d} className="rounded-full border border-on-brand/30 bg-on-brand/10 px-3.5 py-1.5 text-sm font-medium">
                    {d}
                  </li>
                ))}
              </ul>
            </Reveal>
            {reasons.map((r, i) => (
              <Reveal key={r.title} delay={i * 90} className="group rounded-3xl border border-line bg-surface p-7 transition hover:-translate-y-1 hover:border-link">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-link transition group-hover:bg-brand group-hover:text-on-brand">
                  <r.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold">{r.title}</h3>
                <p className="mt-2 text-muted">{r.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Work */}
      {featured.length > 0 && (
        <section aria-labelledby="work-heading" className="mx-auto max-w-6xl px-4 py-24">
          <SectionHeading
            id="work-heading"
            eyebrow="Selected work"
            title="Products we've designed and built"
            intro="Projects marked “Demo project” are built in-house to show what we can do."
            action={
              <Link href="/work" className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline">
                All work <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          />
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((study, i) => (
              <Reveal as="li" key={study.slug} delay={i * 100}>
                <CaseStudyCard study={study} />
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {/* Process */}
      <section aria-labelledby="process-heading" className="mx-auto max-w-6xl px-4 py-24">
        <SectionHeading
          id="process-heading"
          eyebrow="How we work"
          title="A clear path from idea to launch"
          intro="Four steps, with something real to review at every one of them."
        />
        <Reveal className="mt-12">
          <ProcessSteps steps={steps} />
        </Reveal>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mx-auto grid max-w-6xl gap-12 px-4 py-24 lg:grid-cols-[2fr_3fr]">
        <div>
          <SectionHeading id="faq-heading" eyebrow="Questions" title="Good to know" />
          <Reveal className="mt-6 text-muted">
            Something else on your mind?{" "}
            <a href={`mailto:${site.email}`} className="font-medium text-link hover:underline">
              Email us
            </a>{" "}
            and a real person will reply.
          </Reveal>
        </div>
        <Reveal>
          <FaqList items={faqs} />
        </Reveal>
      </section>

      <CtaPanel />
    </>
  );
}
