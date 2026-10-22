"use client";

import Link from "next/link";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-32 text-center">
      <h1 className="font-display text-4xl font-semibold">Something went wrong</h1>
      <p className="mt-4 text-muted">This page could not load just now. Please try again in a moment.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-brand px-6 py-3 font-medium text-white">
          Try again
        </button>
        <Link href="/contact" className="rounded-full border border-line px-6 py-3 font-medium hover:border-brand">
          Contact us
        </Link>
      </div>
    </section>
  );
}
