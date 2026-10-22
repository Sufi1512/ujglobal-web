# ujglobal.tech

Website for UJ Global, a technology consultancy for web, mobile, AI and SEO work.

| Part | Path | Stack |
| --- | --- | --- |
| Frontend | `apps/web` | Next.js 15 (App Router), TypeScript, Tailwind CSS 4 |
| Backend | `apps/api` | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic 2 |
| Database | | PostgreSQL 16 with pgvector |
| Hosting | `infra/` | Docker Compose behind Caddy on our own server, Cloudflare in front |

## Run locally

With Docker:

```bash
docker compose up --build
```

- Site: http://localhost:3000
- API docs: http://localhost:8000/docs
- Mailpit (test inbox, where new-lead alert emails land): http://localhost:8025

Without Docker (needs Node 22, Python 3.12+, [uv](https://docs.astral.sh/uv/) and a local Postgres):

```bash
cd apps/api && cp .env.example .env && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
cd apps/web && npm install && npm run dev
```

## Checks

```bash
cd apps/web && npm run lint && npx tsc --noEmit && npm run build
cd apps/api && uv run ruff check . && uv run mypy app && uv run pytest
```

## Content (services and case studies)

Services and case studies live in Postgres. Owners and editors edit them at `/admin/services` and
`/admin/case-studies` (sales users only see the leads inbox). Every change is
recorded in `audit_log`. Public pages fetch content from the API at request time and cache it for up to
5 minutes; after an edit the worker calls the web app's `/api/revalidate`, so changes show within seconds.
Docker builds never need a running API. Running the web app without Docker, set `API_INTERNAL_URL` (if the
API isn't on http://localhost:8000) and `REVALIDATE_SECRET` (same value as the API's).

Case studies default to **demo projects** and are labelled "Demo project" everywhere on the site until
`is_demo` is turned off for real client work.

## Background worker and email

Slow work runs in the `worker` container (ARQ on Redis), started by `docker compose up`. Right now it emails the
team about every new lead; the lead is always saved first, failed emails retry with back-off, and a sweep every
minute catches anything missed. Locally the emails go to Mailpit. In production set the `SMTP_*`,
`EMAIL_FROM` and `LEAD_ALERT_RECIPIENTS` settings from `infra/.env.example` (Resend or Postmark both work over
SMTP). Without Docker: `cd apps/api && uv run arq app.workers.main.WorkerSettings`.

## Database changes

Edit the models in `apps/api/app/models`, then:

```bash
cd apps/api && uv run alembic revision --autogenerate -m "describe the change" && uv run alembic upgrade head
```

## Admin users

There is no public sign-up. Create accounts from the API container (or `apps/api` locally); the password is asked for in a hidden prompt:

```bash
cd apps/api && uv run python -m app.cli create-user --email you@ujglobal.tech --name "Your Name" --role owner
uv run python -m app.cli set-password --email you@ujglobal.tech   # also signs out existing sessions
uv run python -m app.cli deactivate --email someone@ujglobal.tech
```

On the server: `docker compose -f infra/compose.prod.yml exec api python -m app.cli create-user ...`.
Then sign in at http://localhost:3000/admin. Roles are `owner`, `editor` and `sales`; the leads inbox
(`/admin/leads`: filters, status, assignee, notes, CSV export) is for owners and sales. Admin endpoints use `POST /v1/auth/login`, `/refresh` and `/logout`
(see the API docs), and `infra/.env.example` lists the settings the server needs.

## Status

Phase 0 scaffold: public pages (home, services, service detail, about, contact), SEO basics (metadata, JSON-LD,
sitemap, robots), core database schema, and a contact endpoint that stores every submission as a lead.
Phase 1 in progress: admin auth (Argon2 passwords, JWT access tokens, rotating refresh cookie), the
leads inbox at `/admin/leads`, new-lead alert emails sent by the background worker, and services and case
studies managed through the admin API, with `/work` pages for the portfolio.
See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the full plan and the remaining phases, and
[docs/BRAND.md](docs/BRAND.md) for the brand (logo, colours, type).
