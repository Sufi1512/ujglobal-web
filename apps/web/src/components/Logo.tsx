/*
 * The UJ Global mark: a U whose right side continues into the J's hook as one connected line
 * ("we wire systems together"), on a rounded tile. See docs/BRAND.md for clear space and misuse.
 */

const U = "M8.5 8v9a5 5 0 0 0 10 0V8";
const J = "M23.5 8v12.5a4.5 4.5 0 0 1-4.5 4.5";

export function BrandMark({ size = 28, title }: { size?: number; title?: string }) {
  // Thicker strokes at small sizes so the mark stays legible as a favicon.
  const stroke = size <= 20 ? 4 : size <= 40 ? 3.2 : 2.8;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="shrink-0"
    >
      <rect width="32" height="32" rx="8" fill="var(--mark)" />
      <path d={U} fill="none" stroke="#ffffff" strokeWidth={stroke} strokeLinecap="round" />
      <path d={J} fill="none" stroke="var(--signal)" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight ${className}`}>
      <BrandMark size={28} />
      UJ Global
    </span>
  );
}
