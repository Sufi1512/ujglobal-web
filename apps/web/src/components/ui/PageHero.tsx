import { Eyebrow } from "./Section";

/** The top of inner pages: grid and glow background, label, big title, intro, optional visual on the right. */
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
  aside,
  breadcrumb,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  aside?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <section className="relative -mt-16 overflow-hidden pt-16 sm:-mt-[72px] sm:pt-[72px]">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="glow-brand pointer-events-none absolute -right-48 -top-48 h-[640px] w-[640px]" aria-hidden />
      <div className="glow-signal pointer-events-none absolute -left-56 top-64 h-[420px] w-[420px] opacity-70" aria-hidden />
      <div className={`container-site relative grid gap-12 pb-16 pt-12 sm:pb-20 sm:pt-16 ${aside ? "items-center lg:grid-cols-2" : ""}`}>
        <div className="animate-pop">
          {breadcrumb}
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.06] tracking-tight sm:text-6xl">{title}</h1>
          {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>}
          {children}
        </div>
        {aside && <div className="animate-pop [animation-delay:150ms]">{aside}</div>}
      </div>
    </section>
  );
}
