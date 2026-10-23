import { Plus } from "lucide-react";

export type FaqItem = { question: string; answer: string };

/** Accordion built on <details>, so it opens without JavaScript and works with the keyboard. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-surface">
      {items.map((f) => (
        <details key={f.question} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-lg font-semibold">
            {f.question}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line transition group-open:rotate-45 group-open:border-brand group-open:bg-brand group-open:text-on-brand">
              <Plus className="h-4 w-4" aria-hidden />
            </span>
          </summary>
          <p className="mt-3 max-w-3xl text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}
