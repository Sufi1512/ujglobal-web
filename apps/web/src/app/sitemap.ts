import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getCaseStudies, getServices, safely } from "@/lib/content";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  // If the API is briefly down, still serve the fixed pages rather than an error.
  const [services, caseStudies] = await Promise.all([safely(getServices, []), safely(() => getCaseStudies(), [])]);

  const pages = ["", "/services", "/work", "/about", "/contact"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  const legalPages = ["/privacy", "/cookies", "/terms"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));
  const servicePages = services
    .filter((s) => !s.noindex)
    .map((s) => ({
      url: `${site.url}/services/${s.slug}`,
      lastModified: s.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }));
  const workPages = caseStudies
    .filter((c) => !c.noindex)
    .map((c) => ({
    url: `${site.url}/work/${c.slug}`,
    lastModified: c.published_at ?? undefined,
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));
  return [...pages, ...servicePages, ...workPages, ...legalPages];
}
