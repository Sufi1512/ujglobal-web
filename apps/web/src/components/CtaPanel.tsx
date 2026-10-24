import { ArrowRight, Mail, MessagesSquare, Rocket } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";

/** The closing "get a quote" panel used at the bottom of most pages. */
export function CtaPanel({
  title = "Have a project in mind?",
  text = "Tell us what you want to build. We reply within one business day with next steps.",
  href = "/contact",
}: {
  title?: string;
  text?: string;
  href?: string;
}) {
  return (
    <section className="container-site pt-8">
      <Reveal className="relative overflow-hidden rounded-[2rem] bg-brand px-6 py-14 text-on-brand sm:px-14 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-signal/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-on-brand/10 blur-3xl" aria-hidden />
        <div className="relative grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">{title}</h2>
            <p className="mt-4 max-w-xl text-lg opacity-90">{text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href} className="group inline-flex items-center gap-2 rounded-xl bg-on-brand px-6 py-3.5 font-semibold text-brand transition hover:-translate-y-0.5">
                Get a quote <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
              </Link>
              <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 rounded-xl border border-on-brand/40 px-6 py-3.5 font-semibold transition hover:bg-on-brand/10">
                <Mail className="h-4 w-4" aria-hidden /> {site.email}
              </a>
            </div>
          </div>
          <ol className="space-y-3">
            {[
              { icon: Mail, t: "You tell us about your project" },
              { icon: MessagesSquare, t: "We reply within one business day" },
              { icon: Rocket, t: "A short call, then a fixed quote" },
            ].map((s, i) => (
              <li key={s.t} className="flex items-center gap-4 rounded-2xl bg-on-brand/10 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-on-brand text-brand">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-wide">Step {i + 1}</span>
                  <span className="font-medium">{s.t}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
