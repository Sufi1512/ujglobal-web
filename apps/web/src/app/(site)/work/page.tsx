import type { Metadata } from "next";
import Link from "next/link";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import { getCaseStudies } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description: "Projects built by UJ Global: websites, apps, AI assistants and SEO work, including in-house demos.",
  alternates: { canonical: "/work" },
};

export default async function WorkPage() {
  const studies = await getCaseStudies();
  const hasDemos = studies.some((s) => s.is_demo);

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="font-display text-4xl font-semibold">Our work</h1>
      <p className="mt-4 max-w-2xl text-muted">
        Products we have designed and built, with the results they deliver.
        {hasDemos && " Projects marked “Demo project” are built in-house to show what we can do; they are not client work."}
      </p>

      {studies.length > 0 ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => (
            <li key={study.slug}>
              <CaseStudyCard study={study} headingLevel={2} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-2xl border border-line p-8">
          <p className="text-muted">Our first projects are on their way.</p>
          <Link href="/contact" className="mt-4 inline-block font-medium text-brand hover:underline">
            Tell us about yours
          </Link>
        </div>
      )}
    </section>
  );
}
