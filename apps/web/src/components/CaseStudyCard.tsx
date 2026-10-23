import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { projectCover } from "@/lib/catalog";
import type { CaseStudyCard as Card } from "@/lib/content";

/** Demo projects are always labelled, so nobody mistakes in-house work for client work. */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block rounded-full border border-foreground bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground ${className}`}>
      Demo project
    </span>
  );
}

/** A project's illustrated cover: its product drawn small inside a tinted panel. */
export function ProjectCover({ slug, className = "", large = false }: { slug: string; className?: string; large?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-mist ${className}`}>
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="glow-brand pointer-events-none absolute -right-16 -top-16 h-64 w-64" aria-hidden />
      <div
        className={`absolute left-1/2 w-[460px] -translate-x-1/2 origin-top transition duration-500 group-hover:-translate-y-2 ${
          large ? "top-16 scale-100 group-hover:scale-[1.03]" : "top-14 scale-[0.72] group-hover:scale-[0.75]"
        }`}
      >
        <ServiceVisual kind={projectCover(slug)} />
      </div>
    </div>
  );
}

export function CaseStudyCard({ study, headingLevel = 3 }: { study: Card; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const topResult = study.results[0];
  return (
    <Link
      href={`/work/${study.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-link hover:shadow-[0_30px_60px_-35px_rgba(16,32,28,0.45)]"
    >
      <div className="relative">
        <ProjectCover slug={study.slug} className="h-56" />
        <div className="absolute left-4 top-4">
          {study.is_demo ? <DemoBadge /> : study.client_name && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs">{study.client_name}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <Heading className="font-display text-xl font-semibold">{study.title}</Heading>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-link" aria-hidden />
        </div>
        {study.summary && <p className="mt-2 text-sm text-muted">{study.summary}</p>}
        {topResult && (
          <p className="mt-4 text-sm">
            <span className="font-display text-3xl font-semibold text-link">{topResult.metric}</span>{" "}
            <span className="text-muted">{topResult.label}</span>
          </p>
        )}
        {study.tech_stack.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-5">
            {study.tech_stack.slice(0, 4).map((t) => (
              <li key={t} className="rounded-full bg-mist px-2.5 py-1 text-xs text-muted">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
