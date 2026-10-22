"""Seed the seven service pages that were hard-coded in the website (apps/web/src/lib/site.ts).

From now on services are edited in the admin panel. Existing slugs are left alone, so this is safe to
run against a database that already has services.

Revision ID: c1a7d5e2f310
Revises: b80203a38689
Create Date: 2026-10-22 21:00:00

"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c1a7d5e2f310"
down_revision: str | Sequence[str] | None = "b80203a38689"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SERVICES = [
    (
        "web-development",
        "Web Development",
        "Fast, SEO-ready marketing sites, web apps and portals built on modern frameworks.",
        ["Next.js and React builds", "Headless CMS and admin panels", "Performance and accessibility audits"],
    ),
    (
        "mobile-apps",
        "Mobile Apps",
        "Cross-platform iOS and Android apps with clean UX and reliable backends.",
        ["React Native and Flutter apps", "API and backend development", "App Store and Play Store launch"],
    ),
    (
        "ai-integration",
        "AI Integration",
        "Add LLMs, retrieval and automation to the products and workflows you already have.",
        ["Chatbots grounded in your data", "Document and data extraction", "AI features inside existing apps"],
    ),
    (
        "ai-agents-automation",
        "AI Agents and Automation",
        "Agents that take on repetitive operations work, with humans kept in the loop.",
        ["Workflow and back-office automation", "Tool-using agents", "Evaluation and monitoring"],
    ),
    (
        "seo-growth",
        "SEO and Growth",
        "Technical SEO, content strategy and conversion work that compounds over time.",
        ["Technical SEO audits", "Content and keyword strategy", "Analytics and conversion tracking"],
    ),
    (
        "ui-ux-design",
        "UI/UX Design",
        "Research-led product and interface design, from wireframes to design systems.",
        ["Wireframes and prototypes", "Design systems", "Usability testing"],
    ),
    (
        "cloud-devops",
        "Cloud and DevOps",
        "Reliable infrastructure, CI/CD and monitoring so releases are boring.",
        ["Docker and CI/CD pipelines", "Server and cloud setup", "Monitoring and backups"],
    ),
]


def upgrade() -> None:
    insert = sa.text(
        "INSERT INTO services (id, slug, title, summary, deliverables, tech_stack, body, sort_order, status, noindex)"
        " VALUES (gen_random_uuid(), :slug, :title, :summary, :deliverables, '{}', CAST(:body AS jsonb),"
        " :sort_order, 'published', false)"
        " ON CONFLICT (slug) DO NOTHING"
    ).bindparams(sa.bindparam("deliverables", type_=sa.ARRAY(sa.String())))
    for order, (slug, title, summary, deliverables) in enumerate(SERVICES, start=1):
        op.execute(
            insert.bindparams(
                slug=slug,
                title=title,
                summary=summary,
                deliverables=deliverables,
                body=json.dumps({"problem": None, "process": [], "faqs": []}),
                sort_order=order,
            )
        )


def downgrade() -> None:
    # Only remove the seeded pages if nobody has edited them since.
    for slug, title, summary, _ in SERVICES:
        op.execute(
            sa.text("DELETE FROM services WHERE slug = :slug AND title = :title AND summary = :summary").bindparams(
                slug=slug, title=title, summary=summary
            )
        )
