export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--brand)" />
        <path d="M8 9v8a5 5 0 0 0 10 0V9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M23 9v10a4 4 0 0 1-4 4" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      UJ Global
    </span>
  );
}
