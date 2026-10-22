export const site = {
  name: "UJ Global",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ujglobal.tech",
  tagline: "Websites, apps and AI that move your business forward",
  description:
    "UJ Global is a technology consultancy that designs and builds websites, mobile apps, AI integrations and SEO programs for growing companies worldwide.",
  email: "hello@ujglobal.tech",
};

export type Service = {
  slug: string;
  title: string;
  summary: string;
  deliverables: string[];
};

// Static seed content until the admin-managed API content lands in Phase 1.
export const services: Service[] = [
  {
    slug: "web-development",
    title: "Web Development",
    summary: "Fast, SEO-ready marketing sites, web apps and portals built on modern frameworks.",
    deliverables: ["Next.js and React builds", "Headless CMS and admin panels", "Performance and accessibility audits"],
  },
  {
    slug: "mobile-apps",
    title: "Mobile Apps",
    summary: "Cross-platform iOS and Android apps with clean UX and reliable backends.",
    deliverables: ["React Native and Flutter apps", "API and backend development", "App Store and Play Store launch"],
  },
  {
    slug: "ai-integration",
    title: "AI Integration",
    summary: "Add LLMs, retrieval and automation to the products and workflows you already have.",
    deliverables: ["Chatbots grounded in your data", "Document and data extraction", "AI features inside existing apps"],
  },
  {
    slug: "ai-agents-automation",
    title: "AI Agents and Automation",
    summary: "Agents that take on repetitive operations work, with humans kept in the loop.",
    deliverables: ["Workflow and back-office automation", "Tool-using agents", "Evaluation and monitoring"],
  },
  {
    slug: "seo-growth",
    title: "SEO and Growth",
    summary: "Technical SEO, content strategy and conversion work that compounds over time.",
    deliverables: ["Technical SEO audits", "Content and keyword strategy", "Analytics and conversion tracking"],
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX Design",
    summary: "Research-led product and interface design, from wireframes to design systems.",
    deliverables: ["Wireframes and prototypes", "Design systems", "Usability testing"],
  },
  {
    slug: "cloud-devops",
    title: "Cloud and DevOps",
    summary: "Reliable infrastructure, CI/CD and monitoring so releases are boring.",
    deliverables: ["Docker and CI/CD pipelines", "Server and cloud setup", "Monitoring and backups"],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
