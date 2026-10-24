/** Section heading: a small label, a big title and an optional intro, all faded in on scroll. */
import { Reveal } from "./Reveal";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-link">
      <span className="h-px w-6 bg-link" aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  id,
  align = "left",
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  id?: string;
  align?: "left" | "center";
  action?: React.ReactNode;
}) {
  const centered = align === "center";
  return (
    <Reveal className={`flex flex-wrap items-end justify-between gap-6 ${centered ? "flex-col items-center text-center" : ""}`}>
      <div className={centered ? "mx-auto max-w-2xl" : "max-w-2xl"}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
          {title}
        </h2>
        {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
      </div>
      {action}
    </Reveal>
  );
}
