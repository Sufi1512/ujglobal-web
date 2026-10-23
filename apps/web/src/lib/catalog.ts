import {
  Bot,
  Cloud,
  Code2,
  Layers,
  PenTool,
  Smartphone,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/*
 * Presentation details for each service that don't belong in the CMS: icon, short label and the
 * illustration used on the home page, the services pages and project covers. Content (titles,
 * summaries, deliverables, FAQs) still comes from the API, so editors can change it in the admin.
 * A service added in the admin without an entry here gets the fallback.
 */
export type ServiceLook = { icon: LucideIcon; short: string; visual: VisualKind };
export type VisualKind = "web" | "mobile" | "ai" | "agents" | "seo" | "design" | "cloud" | "generic";

const LOOKS: Record<string, ServiceLook> = {
  "web-development": { icon: Code2, short: "Web", visual: "web" },
  "mobile-apps": { icon: Smartphone, short: "Mobile", visual: "mobile" },
  "ai-integration": { icon: Sparkles, short: "AI", visual: "ai" },
  "ai-agents-automation": { icon: Bot, short: "Agents", visual: "agents" },
  "seo-growth": { icon: TrendingUp, short: "SEO", visual: "seo" },
  "ui-ux-design": { icon: PenTool, short: "Design", visual: "design" },
  "cloud-devops": { icon: Cloud, short: "Cloud", visual: "cloud" },
};

const FALLBACK: ServiceLook = { icon: Layers, short: "Service", visual: "generic" };

export function serviceLook(slug: string): ServiceLook {
  return LOOKS[slug] ?? FALLBACK;
}

/** Cover illustration for each project; projects added later get one picked from their slug. */
const PROJECT_COVERS: Record<string, VisualKind> = {
  "ai-support-assistant": "ai",
  "clinic-booking-app": "mobile",
  "saas-marketing-site": "seo",
  "invoice-processing-agent": "agents",
};
const COVER_CYCLE: VisualKind[] = ["web", "mobile", "ai", "agents", "seo", "design", "cloud"];

export function projectCover(slug: string): VisualKind {
  if (PROJECT_COVERS[slug]) return PROJECT_COVERS[slug];
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_CYCLE[hash % COVER_CYCLE.length];
}

/** Tools we work with, shown as plain text (no third-party logos). */
export const TOOLS = [
  "Next.js",
  "React",
  "TypeScript",
  "React Native",
  "Flutter",
  "Python",
  "FastAPI",
  "Node.js",
  "PostgreSQL",
  "Redis",
  "Claude",
  "OpenAI",
  "pgvector",
  "Docker",
  "Cloudflare",
  "AWS",
  "Figma",
  "Tailwind CSS",
];
