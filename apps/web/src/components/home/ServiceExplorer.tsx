"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { serviceLook } from "@/lib/catalog";

export type ExplorerService = { slug: string; title: string; summary: string; deliverables: string[] };

/**
 * Tabbed explorer: pick a service on the left, see what it looks like and what you get on the right.
 * Follows the WAI-ARIA tabs pattern (arrow keys move between tabs). The illustrations are rendered on
 * the server and passed in, so this component only switches between them.
 */
export function ServiceExplorer({ services, visuals }: { services: ExplorerService[]; visuals: Record<string, React.ReactNode> }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  if (services.length === 0) return null;
  const current = services[Math.min(active, services.length - 1)];

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = services.length - 1;
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div role="tablist" aria-label="Services" aria-orientation="vertical" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {services.map((s, i) => {
          const { icon: Icon } = serviceLook(s.slug);
          const selected = i === active;
          return (
            <button
              key={s.slug}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`${id}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`group flex shrink-0 items-center gap-4 rounded-2xl border px-4 py-3 text-left transition lg:px-5 lg:py-4 ${
                selected ? "border-brand bg-surface shadow-[0_12px_30px_-18px_rgba(16,32,28,0.45)]" : "border-transparent hover:border-line hover:bg-surface/60"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
                  selected ? "bg-brand text-on-brand" : "bg-mist text-foreground group-hover:bg-surface"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap font-display font-semibold lg:whitespace-normal">{s.title}</span>
                <span className="hidden text-sm text-muted lg:line-clamp-1">{s.summary}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} className="min-w-0">
        <div key={current.slug} className="animate-pop grid gap-6">
          <div className="relative">
            <div className="glow-brand pointer-events-none absolute -inset-x-4 -inset-y-10 -z-10 opacity-70 sm:-inset-10" aria-hidden />
            {visuals[current.slug]}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h3 className="font-display text-2xl font-semibold">{current.title}</h3>
              <p className="mt-2 text-muted">{current.summary}</p>
              {current.deliverables.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {current.deliverables.slice(0, 4).map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-link" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              href={`/services/${current.slug}`}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold transition hover:border-link hover:text-link sm:self-end"
            >
              Explore {current.title} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
