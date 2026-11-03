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
  entityName: "UJGLOBAL TECH OPC PRIVATE LIMITED",
  registeredAddress:
    "Elmore A 802 Dosti Planet North, Near Shilphata, Kausa, Mumbra, Thane, Maharashtra 400612, India",
  governingLaw: "India",
  courts: "Thane / Mumbai, India",
  serverLocation: "Germany",
  contactEmail: site.email,
  lastUpdated: "3 November 2026",
  // Must match LEAD_RETENTION_DAYS in the API (730 days).
  leadRetentionMonths: 24,
};

export function legalPlaceholders(): string[] {
  return Object.entries(legal)
    .filter(([, value]) => typeof value === "string" && value.startsWith("["))
    .map(([key]) => key);
}
