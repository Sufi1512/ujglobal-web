"use client";

import { useState } from "react";

export type Step = { title: string; text: string; weeks: string; outputs: string[] };

/**
 * "How we work" as a clickable timeline: the bar fills up to the chosen step, and the panel below
 * shows what happens and what you receive. All steps are real buttons, so it works with the keyboard.
 */
export function ProcessSteps({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <div>
      <div className="relative">
        <div className="absolute left-0 right-0 top-5 hidden h-0.5 bg-line sm:block" aria-hidden />
        <div
          className="absolute left-0 top-5 hidden h-0.5 bg-brand transition-all duration-500 sm:block"
          style={{ width: `${(active / Math.max(steps.length - 1, 1)) * 100}%` }}
          aria-hidden
        />
        <ol className="relative grid gap-3 sm:grid-cols-4 sm:gap-6">
          {steps.map((s, i) => {
            const done = i <= active;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={i === active ? "step" : undefined}
                  className="group flex w-full items-center gap-3 text-left sm:flex-col sm:items-start"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 font-display text-sm font-bold transition ${
                      done ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-muted group-hover:border-link"
                    } ${i === active ? "animate-pulse-ring" : ""}`}
                  >
                    0{i + 1}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold">{s.title}</span>
                    <span className="text-sm text-muted">{s.weeks}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div key={active} className="animate-pop mt-8 grid gap-6 rounded-3xl border border-line bg-surface p-6 sm:grid-cols-[3fr_2fr] sm:p-8" aria-live="polite">
        <div>
          <p className="text-sm font-semibold text-link">
            Step {active + 1} of {steps.length}
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold">{step.title}</h3>
          <p className="mt-3 text-muted">{step.text}</p>
        </div>
        <div className="rounded-2xl bg-mist p-5">
          <p className="text-sm font-semibold">What you receive</p>
          <ul className="mt-3 space-y-2 text-sm">
            {step.outputs.map((o) => (
              <li key={o} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
