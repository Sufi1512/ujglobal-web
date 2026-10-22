import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "UJ Global is a technology consultancy building websites, apps and AI products for clients worldwide.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-display text-4xl font-semibold">About UJ Global</h1>
      <p className="mt-6 text-lg text-muted">
        We are a small senior team of engineers and designers who build websites, mobile apps and AI-powered
        products. We work with founders and growing companies worldwide, and we measure success by the results our
        work delivers.
      </p>
    </section>
  );
}
