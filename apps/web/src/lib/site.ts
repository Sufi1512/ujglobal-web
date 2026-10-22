export const site = {
  name: "UJ Global",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ujglobal.tech",
  tagline: "Websites, apps and AI that move your business forward",
  description:
    "UJ Global is a technology consultancy that designs and builds websites, mobile apps, AI integrations and SEO programs for growing companies worldwide.",
  email: "hello@ujglobal.tech",
};

// Services and case studies are edited in the admin panel and served by the API (see lib/content.ts).

/*
 * Facts the legal pages (privacy, terms, cookies) depend on. The bracketed values are placeholders the
 * business must fill in before launch; `legalPlaceholders()` lists any that remain.
 */
export const legal = {
  entityName: "[Company legal name]",
  registeredAddress: "[Registered address]",
  governingLaw: "[Country]",
  courts: "[City, Country]",
  serverLocation: "[Country where our server is hosted]",
  contactEmail: site.email,
  lastUpdated: "23 October 2026",
  // Must match LEAD_RETENTION_DAYS in the API (730 days).
  leadRetentionMonths: 24,
};

export function legalPlaceholders(): string[] {
  return Object.entries(legal)
    .filter(([, value]) => typeof value === "string" && value.startsWith("["))
    .map(([key]) => key);
}
