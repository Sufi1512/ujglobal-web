/*
 * Public content from the API, fetched on the server and cached.
 *
 * Each response is cached for up to REVALIDATE_SECONDS and tagged, so when an editor publishes in the
 * admin the API's worker calls /api/revalidate and the affected pages refresh within seconds. Nothing is
 * fetched at build time, so Docker builds don't need a running API.
 */

import { connection } from "next/server";

export const CONTENT_TAGS = ["services", "case-studies"] as const;
export type ContentTag = (typeof CONTENT_TAGS)[number];

const REVALIDATE_SECONDS = 300;

// Inside Docker the web container reaches the API by service name; the browser uses the public URL.
const API_BASE = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ProcessStep = { title: string; text: string };
export type Faq = { question: string; answer: string };
export type ResultMetric = { metric: string; label: string };

export type ServiceSummary = {
  slug: string;
  title: string;
  tagline: string | null;
  summary: string;
  deliverables: string[];
  tech_stack: string[];
  body: { problem: string | null; process: ProcessStep[]; faqs: Faq[] };
  meta_title: string | null;
  meta_description: string | null;
  noindex: boolean;
  updated_at: string;
};

export type CaseStudyCard = {
  slug: string;
  title: string;
  client_name: string | null;
  summary: string | null;
  results: ResultMetric[];
  tech_stack: string[];
  is_demo: boolean;
  is_featured: boolean;
  published_at: string | null;
  noindex: boolean;
};

export type ServiceDetail = ServiceSummary & { case_studies: CaseStudyCard[] };

export type CaseStudy = CaseStudyCard & {
  challenge: string | null;
  solution: string | null;
  live_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  services: { slug: string; title: string }[];
  updated_at: string;
};

async function getJson<T>(path: string, tags: ContentTag[]): Promise<T | null> {
  // Render at request time (never at build), while the fetch below still uses the tagged data cache.
  await connection();
  const res = await fetch(`${API_BASE}/v1${path}`, { next: { revalidate: REVALIDATE_SECONDS, tags: [...tags] } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Content API ${path} returned ${res.status}`);
  return (await res.json()) as T;
}

export async function getServices(): Promise<ServiceSummary[]> {
  return (await getJson<ServiceSummary[]>("/services", ["services"])) ?? [];
}

export function getService(slug: string): Promise<ServiceDetail | null> {
  return getJson<ServiceDetail>(`/services/${encodeURIComponent(slug)}`, ["services", "case-studies"]);
}

export async function getCaseStudies(params: { service?: string; featured?: boolean } = {}): Promise<CaseStudyCard[]> {
  const query = new URLSearchParams();
  if (params.service) query.set("service", params.service);
  if (params.featured !== undefined) query.set("featured", String(params.featured));
  const suffix = query.size ? `?${query}` : "";
  return (await getJson<CaseStudyCard[]>(`/case-studies${suffix}`, ["case-studies"])) ?? [];
}

export function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  return getJson<CaseStudy>(`/case-studies/${encodeURIComponent(slug)}`, ["case-studies", "services"]);
}

/** For page furniture (footer, sitemap): a broken API must not take the whole page down. */
export async function safely<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error(error);
    return fallback;
  }
}
