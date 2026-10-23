/** An endless, slowly scrolling row (pauses on hover; still for reduced motion). Decorative copy is hidden. */
export function Marquee({ items, label }: { items: string[]; label: string }) {
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <p className="sr-only">
        {label}: {items.join(", ")}
      </p>
      <div className="animate-marquee group-hover-pause flex w-max gap-3" aria-hidden>
        {[...items, ...items].map((item, i) => (
          <span key={i} className="whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2.5 font-display text-sm font-medium text-muted">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
