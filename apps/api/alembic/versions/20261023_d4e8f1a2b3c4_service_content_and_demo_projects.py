"""Fill in the seven service pages and add four labelled demo projects.

Service pages get a tagline, the problem they solve, a process, FAQs, a longer deliverables list and
the tools used. A service is only updated while it still has the empty content from the seed
migration, so anything already edited in the admin is left alone. Demo projects are inserted only if
their slug is free, are always marked `is_demo`, and their results are worded as test results.

Revision ID: d4e8f1a2b3c4
Revises: c1a7d5e2f310
Create Date: 2026-10-23 09:00:00

"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4e8f1a2b3c4"
down_revision: str | Sequence[str] | None = "c1a7d5e2f310"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def step(title: str, text: str) -> dict:
    return {"title": title, "text": text}


def faq(question: str, answer: str) -> dict:
    return {"question": question, "answer": answer}


SERVICES: dict[str, dict] = {
    "web-development": {
        "tagline": "Fast websites and web apps that turn visitors into customers",
        "problem": "Your website is slow, hard to update and doesn't show up in search, so it isn't bringing in the "
        "enquiries it should.",
        "deliverables": [
            "Marketing websites and landing pages",
            "Web apps, portals and dashboards",
            "Headless CMS so your team can edit content",
            "Technical SEO and structured data built in",
            "Performance and accessibility (WCAG AA) audits",
            "Analytics, forms and CRM connections",
        ],
        "tech_stack": ["Next.js", "React", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL"],
        "process": [
            step("Discover", "We review your current site, your goals and your competitors, and agree what the new site must achieve."),
            step("Design", "Wireframes and a clickable design in your brand, reviewed with you before development starts."),
            step("Build", "Weekly demos on a private staging site, with content, SEO and tracking set up as we go."),
            step("Launch", "Redirects, speed checks and search console set up on launch day, then a handover so your team can edit."),
        ],
        "faqs": [
            faq("Can we edit the content ourselves?", "Yes. We set up an easy content editor for pages, posts and case studies, and show your team how to use it."),
            faq("Will we lose our Google rankings when we switch?", "Not if it's done properly. We map every old address to its new one with redirects and keep what already ranks."),
            faq("How fast will the site be?", "We aim for green Core Web Vitals on mobile and check speed on every release, not just at launch."),
        ],
    },
    "mobile-apps": {
        "tagline": "iOS and Android apps people keep on their home screen",
        "problem": "You need an app on both platforms, but building two separate apps is slow, expensive and hard to keep in sync.",
        "deliverables": [
            "Cross-platform iOS and Android apps",
            "App design and clickable prototypes",
            "Backend, APIs and admin dashboard",
            "Sign-in, payments and push notifications",
            "App Store and Google Play launch",
            "Crash reporting, analytics and updates",
        ],
        "tech_stack": ["React Native", "Expo", "Flutter", "TypeScript", "FastAPI", "PostgreSQL"],
        "process": [
            step("Discover", "We define the core journeys, the features for version one and what can wait."),
            step("Prototype", "A clickable prototype you can try on your own phone before any code is written."),
            step("Build", "Two-week cycles with test builds sent to your phone, plus the backend and admin dashboard."),
            step("Launch", "Store listings, review submission and a staged roll-out, then monitoring and regular updates."),
        ],
        "faqs": [
            faq("Do we need separate apps for iPhone and Android?", "Usually not. One cross-platform codebase gives you both apps with native performance for most products."),
            faq("Do you handle the App Store and Play Store submission?", "Yes: store listings, screenshots, privacy details and the review process."),
            faq("Who owns the app and the code?", "You do, from day one, including the store accounts and all source code."),
        ],
    },
    "ai-integration": {
        "tagline": "AI features inside the tools you already use",
        "problem": "Your team answers the same questions and copies data between systems by hand, and generic AI tools don't know your business.",
        "deliverables": [
            "Chatbots and assistants grounded in your data",
            "Document reading and data extraction",
            "AI search across your knowledge base",
            "AI features inside your existing apps",
            "Guardrails, human review and source citations",
            "Quality testing and cost monitoring",
        ],
        "tech_stack": ["Claude", "OpenAI", "Python", "FastAPI", "pgvector", "PostgreSQL"],
        "process": [
            step("Discover", "We map one workflow end to end and pick the step where AI saves the most time."),
            step("Prototype", "A working version on your real data within about two weeks, so you can judge it in practice."),
            step("Harden", "Tests on real questions, guardrails, citations and a human in the loop where it matters."),
            step("Roll out", "Launch to your team or customers, with monitoring of quality, speed and cost."),
        ],
        "faqs": [
            faq("Is our data safe?", "We use providers that don't train on your data, keep access to the minimum needed and can run in your own cloud."),
            faq("What if the AI gets something wrong?", "Answers cite their sources, uncertain cases go to a person, and we test against real questions before launch."),
            faq("How long until we see something working?", "Usually a working prototype on your own data in about two weeks."),
        ],
    },
    "ai-agents-automation": {
        "tagline": "Agents that handle the busywork, with people in control",
        "problem": "Repetitive back-office work, like invoices, emails, reports and data entry, eats hours every week and causes errors.",
        "deliverables": [
            "Workflow and back-office automation",
            "AI agents that use your tools and systems",
            "Email, document and ticket processing",
            "Human approval steps for important decisions",
            "Dashboards showing what the agent did and why",
            "Evaluation, monitoring and alerts",
        ],
        "tech_stack": ["Claude", "Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
        "process": [
            step("Map", "We document the workflow as it really happens today, including the exceptions."),
            step("Automate", "An agent takes on the routine cases; anything unusual or high-value goes to a person."),
            step("Measure", "We track accuracy, time saved and every action the agent took, in a clear log."),
            step("Expand", "Once it's trusted, we widen what it handles, one step at a time."),
        ],
        "faqs": [
            faq("Will the agent act without anyone checking?", "Only where you decide it can. You set the limits, and anything above them waits for approval."),
            faq("Which systems can it work with?", "Most tools with an API or email access: accounting, CRM, helpdesk, spreadsheets and internal databases."),
            faq("How do we know it's working?", "Every run is logged, and a dashboard shows accuracy, volume and time saved."),
        ],
    },
    "seo-growth": {
        "tagline": "Get found by the customers already searching for you",
        "problem": "Competitors outrank you, your site has technical issues holding it back, and you can't tell which pages bring in business.",
        "deliverables": [
            "Technical SEO audits and fixes",
            "Keyword research and content strategy",
            "Landing pages that convert",
            "Structured data and Core Web Vitals",
            "Analytics and conversion tracking",
            "Monthly reporting in plain language",
        ],
        "tech_stack": ["Google Search Console", "Google Analytics", "Next.js", "Schema.org", "Cloudflare"],
        "process": [
            step("Audit", "A full technical and content audit, with problems ranked by impact."),
            step("Fix", "We fix the technical issues first: speed, indexing, structure and structured data."),
            step("Create", "Content and landing pages for the searches that bring in real customers."),
            step("Grow", "Monthly tracking of rankings, traffic and enquiries, and adjusting to what works."),
        ],
        "faqs": [
            faq("How long does SEO take to work?", "Technical fixes can show results within weeks; content usually builds over three to six months."),
            faq("Do you guarantee first place on Google?", "No honest agency can. We commit to the work, measure it, and show you exactly what changed."),
            faq("Can you work on a site you didn't build?", "Yes. We work on most platforms and can fix issues in place."),
        ],
    },
    "ui-ux-design": {
        "tagline": "Products that feel obvious to use",
        "problem": "People drop off, get confused or contact support because the product is hard to use, and every screen looks a little different.",
        "deliverables": [
            "User research and journey mapping",
            "Wireframes and clickable prototypes",
            "Visual design in your brand",
            "Design systems and component libraries",
            "Usability testing with real users",
            "Developer-ready handoff",
        ],
        "tech_stack": ["Figma", "Design tokens", "Storybook", "Tailwind CSS"],
        "process": [
            step("Understand", "Interviews, analytics and a review of the current product to find where people struggle."),
            step("Sketch", "Wireframes of the key journeys, tested quickly before anything is polished."),
            step("Design", "High-fidelity screens and a design system so the product stays consistent as it grows."),
            step("Test", "Usability tests with real users, then improvements before development starts."),
        ],
        "faqs": [
            faq("Can you work with our developers?", "Yes. We hand off in Figma with specs and components, or build the front end ourselves."),
            faq("Do you do branding too?", "We create product-level brand kits: colours, type, icons and components for digital products."),
            faq("What is a design system?", "A shared library of colours, type and components, so every new screen looks and works the same way."),
        ],
    },
    "cloud-devops": {
        "tagline": "Infrastructure that stays up and releases that are boring",
        "problem": "Deployments are manual and risky, nobody is sure the backups work, and you find out about outages from customers.",
        "deliverables": [
            "Docker and CI/CD pipelines",
            "Server and cloud setup",
            "Automated, tested backups",
            "Monitoring, logs and alerts",
            "Security hardening and updates",
            "Cost reviews and right-sizing",
        ],
        "tech_stack": ["Docker", "GitHub Actions", "Cloudflare", "AWS", "Linux", "PostgreSQL"],
        "process": [
            step("Assess", "We review your current setup for risk, cost and reliability."),
            step("Automate", "Every release is tested and deployed by a pipeline, with automatic rollback."),
            step("Protect", "Backups that are tested, monitoring with alerts, and security updates."),
            step("Support", "Ongoing help with incidents, upgrades and scaling as you grow."),
        ],
        "faqs": [
            faq("Do we need Kubernetes?", "Rarely at first. Most products run reliably and cheaply on a well-run server or managed services."),
            faq("Can you work with our current hosting?", "Yes: your own servers, AWS, other clouds or managed platforms."),
            faq("How do we know backups work?", "We restore them on a schedule to prove they do, not just check that they exist."),
        ],
    },
}

DEMO_PROJECTS = [
    {
        "slug": "ai-support-assistant",
        "title": "AI support assistant for an online store",
        "summary": "A chatbot that answers order and returns questions from the store's help centre.",
        "challenge": "A growing online store was answering the same order, delivery and returns questions by hand, and "
        "replies slowed down at busy times.",
        "solution": "An assistant on the website that answers from the store's own help centre and order data, cites the "
        "policy it used, can start a return, and hands anything unusual to a person with the full conversation.",
        "results": [
            {"metric": "62%", "label": "of test questions answered without an agent"},
            {"metric": "<30s", "label": "median time to an answer in testing"},
        ],
        "tech_stack": ["Next.js", "FastAPI", "Claude", "pgvector"],
        "services": ["ai-integration"],
    },
    {
        "slug": "clinic-booking-app",
        "title": "Booking app for a group of dental clinics",
        "summary": "An iOS and Android app for booking, rescheduling and reminders, with a dashboard for clinic staff.",
        "challenge": "Patients could only book by phone during opening hours, missed appointments were common, and each "
        "clinic kept its own diary.",
        "solution": "One cross-platform app where patients see real availability across clinics, book in a few taps and "
        "get reminders, plus a staff dashboard that shows every clinic's diary in one place.",
        "results": [
            {"metric": "3 taps", "label": "to book an appointment"},
            {"metric": "2 apps", "label": "iOS and Android from one codebase"},
        ],
        "tech_stack": ["React Native", "Expo", "FastAPI", "PostgreSQL"],
        "services": ["mobile-apps", "ui-ux-design"],
    },
    {
        "slug": "saas-marketing-site",
        "title": "Marketing site and SEO for a B2B software company",
        "summary": "A fast, easy-to-edit marketing site rebuilt for search, with landing pages for each industry served.",
        "challenge": "The old site was slow on phones, hard for the marketing team to update, and didn't rank for the "
        "industries the company sells to.",
        "solution": "A new site with a simple content editor, landing pages for each target industry, structured data, "
        "and speed and SEO checks built into every release.",
        "results": [
            {"metric": "98", "label": "mobile performance score in Lighthouse tests"},
            {"metric": "<1s", "label": "largest contentful paint in testing"},
        ],
        "tech_stack": ["Next.js", "Tailwind CSS", "Headless CMS", "Cloudflare"],
        "services": ["web-development", "seo-growth"],
    },
    {
        "slug": "invoice-processing-agent",
        "title": "Invoice processing agent for a finance team",
        "summary": "An agent that reads supplier invoices, matches them to purchase orders and prepares them for approval.",
        "challenge": "The finance team typed every supplier invoice into the accounting system by hand and chased "
        "mismatches over email.",
        "solution": "An agent that reads invoices from the shared inbox, extracts the details, checks them against "
        "purchase orders, and posts routine ones for a quick review. Anything over the limit or out of line waits for "
        "a person.",
        "results": [
            {"metric": "9 of 10", "label": "test invoices needed no manual edits"},
            {"metric": "100%", "label": "of high-value invoices sent for approval"},
        ],
        "tech_stack": ["Python", "Claude", "FastAPI", "PostgreSQL"],
        "services": ["ai-agents-automation", "ai-integration"],
    },
]


def upgrade() -> None:
    update_service = sa.text(
        "UPDATE services SET tagline = :tagline, body = CAST(:body AS jsonb), deliverables = :deliverables,"
        " tech_stack = :tech_stack, updated_at = now()"
        " WHERE slug = :slug AND tagline IS NULL"
        " AND coalesce(body -> 'process', '[]'::jsonb) = '[]'::jsonb"
        " AND coalesce(body -> 'faqs', '[]'::jsonb) = '[]'::jsonb"
    ).bindparams(
        sa.bindparam("deliverables", type_=sa.ARRAY(sa.String())),
        sa.bindparam("tech_stack", type_=sa.ARRAY(sa.String())),
    )
    for slug, s in SERVICES.items():
        op.execute(
            update_service.bindparams(
                slug=slug,
                tagline=s["tagline"],
                body=json.dumps({"problem": s["problem"], "process": s["process"], "faqs": s["faqs"]}),
                deliverables=s["deliverables"],
                tech_stack=s["tech_stack"],
            )
        )

    insert_project = sa.text(
        "INSERT INTO case_studies (id, slug, title, summary, challenge, solution, results, tech_stack,"
        " is_featured, is_demo, status, published_at, noindex)"
        " VALUES (gen_random_uuid(), :slug, :title, :summary, :challenge, :solution, CAST(:results AS jsonb),"
        " :tech_stack, true, true, 'published', now(), false)"
        " ON CONFLICT (slug) DO NOTHING"
    ).bindparams(sa.bindparam("tech_stack", type_=sa.ARRAY(sa.String())))
    link = sa.text(
        "INSERT INTO service_case_studies (service_id, case_study_id)"
        " SELECT s.id, c.id FROM services s, case_studies c WHERE s.slug = :service AND c.slug = :project"
        " ON CONFLICT DO NOTHING"
    )
    for p in DEMO_PROJECTS:
        op.execute(
            insert_project.bindparams(
                slug=p["slug"],
                title=p["title"],
                summary=p["summary"],
                challenge=p["challenge"],
                solution=p["solution"],
                results=json.dumps(p["results"]),
                tech_stack=p["tech_stack"],
            )
        )
        for service in p["services"]:
            op.execute(link.bindparams(service=service, project=p["slug"]))


def downgrade() -> None:
    # Remove only demo projects that still carry the title this migration gave them. Service content is
    # left in place: it may have been edited since, and an empty service page helps nobody.
    for p in DEMO_PROJECTS:
        op.execute(
            sa.text("DELETE FROM case_studies WHERE slug = :slug AND title = :title AND is_demo").bindparams(
                slug=p["slug"], title=p["title"]
            )
        )
