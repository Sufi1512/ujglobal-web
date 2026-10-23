import { Compass, Eye, Gauge, Handshake, Layers, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { CtaPanel } from "@/components/CtaPanel";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/Section";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { TeamScene } from "@/components/illustrations/Scenes";

export const metadata: Metadata = {
  title: "About",
  description: "UJ Global is a technology consultancy building websites, apps and AI products for clients worldwide.",
  alternates: { canonical: "/about" },
};

const values = [
  { icon: Eye, title: "Honest by default", text: "Clear quotes, realistic timelines and straight answers, including when something isn't a good idea." },
  { icon: Gauge, title: "Results over output", text: "We measure success by what the work changes for you: enquiries, time saved, customers served." },
  { icon: Layers, title: "Built to last", text: "Clean, documented code on proven tools, so your product is easy to maintain and grow." },
  { icon: Handshake, title: "Partners, not vendors", text: "We stay close after launch and treat your product like it's our own." },
];

const disciplines = [
  { title: "Strategy", text: "Goals, scope and the roadmap to get there." },
  { title: "Design", text: "Research, UX and interfaces people enjoy using." },
  { title: "Engineering", text: "Web, mobile, backend and cloud." },
  { title: "AI", text: "Assistants, extraction and agents on your own data." },
  { title: "Growth", text: "SEO, content and conversion that compounds." },
  { title: "Support", text: "Monitoring, fixes and improvements after launch." },
];

const audiences = [
  { title: "Founders", text: "Turning an idea into a first version people can use, quickly and without cutting corners." },
  { title: "Growing companies", text: "Replacing a slow website, launching an app or adding AI to how the team works." },
  { title: "Teams with a product", text: "An extra senior team for a new feature, a redesign or a performance and SEO push." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About UJ Global"
        title="A small senior team that builds products people use"
        intro="We're engineers and designers who build websites, mobile apps and AI-powered products for founders and growing companies worldwide. We keep the team small and senior, so the people you talk to are the people doing the work."
        aside={
          <div className="relative">
            <ServiceVisual kind="design" />
            <div className="animate-float absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg sm:-left-10">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal text-on-signal">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[11px] text-muted">From idea to launch</span>
                <span className="font-display text-sm font-bold">One team, end to end</span>
              </span>
            </div>
          </div>
        }
      />

      <section aria-labelledby="mission-heading" className="container-site py-16">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-brand p-8 text-on-brand sm:p-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-signal/20 blur-3xl" aria-hidden />
          <Compass className="relative h-10 w-10" aria-hidden />
          <h2 id="mission-heading" className="relative mt-6 text-sm font-semibold uppercase tracking-[0.14em] opacity-90">
            Our mission
          </h2>
          <p className="relative mt-3 max-w-4xl font-display text-3xl font-bold leading-tight sm:text-4xl">
            Give every growing company access to the kind of senior product team that used to be only for the biggest
            brands, and make the technology work for the business, not the other way round.
          </p>
        </Reveal>
      </section>

      <section aria-labelledby="values-heading" className="container-site py-16">
        <SectionHeading id="values-heading" eyebrow="What we value" title="How we like to work" />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[5fr_6fr]">
        <Reveal className="relative rounded-[2rem] bg-mist p-6 sm:p-10">
          <div className="bg-grid pointer-events-none absolute inset-0 rounded-[2rem] opacity-50" aria-hidden />
          <TeamScene className="relative" />
        </Reveal>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {values.map((v, i) => (
            <Reveal as="li" key={v.title} delay={(i % 2) * 100} className="group flex gap-5 rounded-3xl border border-line bg-surface p-7 transition hover:-translate-y-1 hover:border-link">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mist text-link transition group-hover:bg-brand group-hover:text-on-brand">
                <v.icon className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <h3 className="font-display text-xl font-semibold">{v.title}</h3>
                <p className="mt-2 text-muted">{v.text}</p>
              </span>
            </Reveal>
          ))}
        </ul>
        </div>
      </section>

      <section aria-labelledby="disciplines-heading" className="bg-mist py-20">
        <div className="container-site">
          <SectionHeading
            id="disciplines-heading"
            eyebrow="One team"
            title="Six disciplines under one roof"
            intro="Nothing gets lost between agencies, and you always have one place to ask."
          />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((d, i) => (
              <Reveal as="li" key={d.title} delay={(i % 3) * 80} className="rounded-3xl border border-line bg-surface p-7">
                <span className="font-display text-4xl font-bold text-link">0{i + 1}</span>
                <h3 className="mt-4 font-display text-xl font-semibold">{d.title}</h3>
                <p className="mt-1 text-muted">{d.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="who-heading" className="container-site py-20">
        <SectionHeading id="who-heading" eyebrow="Who we work with" title="Built for teams that want to move" />
        <ul className="mt-12 grid gap-4 lg:grid-cols-3">
          {audiences.map((a, i) => (
            <Reveal as="li" key={a.title} delay={i * 100} className="rounded-3xl border border-line bg-surface p-8">
              <h3 className="font-display text-2xl font-bold">{a.title}</h3>
              <p className="mt-3 text-muted">{a.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <CtaPanel title="Let's talk about your project" />
    </>
  );
}
