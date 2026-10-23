import Link from "next/link";
import type { CaseStudyCard as Card } from "@/lib/content";

/** Demo projects are always labelled, so nobody mistakes in-house work for client work. */
export function DemoBadge() {
  return (
    <span className="inline-block rounded-full border border-foreground px-2.5 py-0.5 text-xs font-semibold text-foreground">
      Demo project
    </span>
  );
}

export function CaseStudyCard({ study, headingLevel = 3 }: { study: Card; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const topResult = study.results[0];
  return (
    <Link
      href={`/work/${study.slug}`}
      className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition hover:border-link"
    >
      <div className="flex flex-wrap items-center gap-2">
        {study.is_demo ? <DemoBadge /> : study.client_name && <span className="text-xs text-muted">{study.client_name}</span>}
      </div>
      <Heading className="mt-3 font-display text-lg font-semibold">{study.title}</Heading>
      {study.summary && <p className="mt-2 text-sm text-muted">{study.summary}</p>}
      {topResult && (
        <p className="mt-4 text-sm">
          <span className="font-display text-2xl font-semibold text-link">{topResult.metric}</span>{" "}
          <span className="text-muted">{topResult.label}</span>
        </p>
      )}
      {study.tech_stack.length > 0 && (
        <p className="mt-auto pt-4 text-xs text-muted">{study.tech_stack.slice(0, 4).join(" · ")}</p>
      )}
    </Link>
  );
}
