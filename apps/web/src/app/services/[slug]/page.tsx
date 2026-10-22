import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, services, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = getService((await params).slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.summary,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const service = getService((await params).slug);
  if (!service) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.summary,
    provider: { "@type": "Organization", name: site.name, url: site.url },
    areaServed: "Worldwide",
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/services" className="hover:text-foreground">
          Services
        </Link>{" "}
        / {service.title}
      </nav>
      <h1 className="mt-4 font-display text-4xl font-semibold">{service.title}</h1>
      <p className="mt-4 text-lg text-muted">{service.summary}</p>
      <h2 className="mt-10 font-display text-2xl font-semibold">What you get</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        {service.deliverables.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <Link href="/contact" className="mt-10 inline-block rounded-full bg-brand px-6 py-3 font-medium text-white">
        Get a quote
      </Link>
    </article>
  );
}
