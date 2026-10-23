import { Clock, Globe2, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { Eyebrow } from "@/components/ui/Section";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell UJ Global about your project and get a quote within one business day.",
  alternates: { canonical: "/contact" },
};

const facts = [
  { icon: Clock, title: "Reply within one business day", text: "From a person on the team, not an autoresponder." },
  { icon: ShieldCheck, title: "Fixed quote, no surprises", text: "After a short call you get a clear scope, price and timeline." },
  { icon: Globe2, title: "Worldwide, remote-first", text: "We work in English, with calls in your time zone." },
];

export default function ContactPage() {
  return (
    <section className="relative -mt-16 overflow-hidden pt-16 sm:-mt-[72px] sm:pt-[72px]">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="glow-brand pointer-events-none absolute -right-48 -top-48 h-[640px] w-[640px]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-8 pt-12 sm:pt-16 lg:grid-cols-[2fr_3fr]">
        <div className="animate-pop">
          <Eyebrow>Get a quote</Eyebrow>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.06] tracking-tight sm:text-6xl">Let&apos;s build something good.</h1>
          <p className="mt-6 text-lg text-muted">
            Every project is priced to its scope, so tell us what you have in mind. A few lines is enough to start.
          </p>
          <ul className="mt-10 space-y-5">
            {facts.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-link shadow-sm ring-1 ring-line">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="text-sm text-muted">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <a
            href={`mailto:${site.email}`}
            className="mt-10 flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-link"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">
              <Mail className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm text-muted">Prefer email?</span>
              <span className="font-semibold text-link">{site.email}</span>
            </span>
          </a>
        </div>
        <div className="animate-pop [animation-delay:120ms]">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
