# ujglobal.tech

Website for UJ Global, a technology consultancy for web, mobile, AI and SEO work.

| Part | Path | Stack |
| --- | --- | --- |
| Frontend | `apps/web` | Next.js 15 (App Router), TypeScript, Tailwind CSS 4 |
| Backend | `apps/api` | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic 2 |
| Database | | PostgreSQL 16 with pgvector |
| Hosting | `infra/` | Docker Compose behind Caddy on our own server, Cloudflare in front |

## Run locally

There are two settings files, one per place the site runs. Each has a committed example; the real files
stay on your machine (git ignores them):

| File | Used by | For |
| --- | --- | --- |
| `.env.local` | `docker compose -f compose.dev.yml up` | your computer (safe test values) |
| `.env` (or panel environment variables) | `docker compose up` | the live site ([docs/DEPLOY-SINGLE-PORT.md](docs/DEPLOY-SINGLE-PORT.md)) |

With Docker:

```bash
cp .env.local.example .env.local      # once; the defaults work as they are
docker compose -f compose.dev.yml up --build
```

- Site: http://localhost:9006
- API docs: http://localhost:9005/docs
- Mailpit (test inbox, where new-lead alert emails land): http://localhost:8025
- Postgres and Redis for local tools: `localhost:5433` and `localhost:6380` (so they don't clash with copies
  you may already run)

Without Docker (needs Node 22, Python 3.12+, [uv](https://docs.astral.sh/uv/) and a local Postgres):

```bash
export DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost:5432/ujglobal   # required; created if missing
cd apps/api && uv sync && uv run python -m app.db_bootstrap && uv run alembic upgrade head && uv run uvicorn app.main:app --reload --port 9005
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
API isn't on http://localhost:9005) and `REVALIDATE_SECRET` (same value as the API's).

Case studies default to **demo projects** and are labelled "Demo project" everywhere on the site until
`is_demo` is turned off for real client work.

## Background worker and email

Slow work runs in the `worker` container (ARQ on Redis), started with the rest of the stack. Right now it emails the
team about every new lead; the lead is always saved first, failed emails retry with back-off, and a sweep every
minute catches anything missed. Locally the emails go to Mailpit. In production set the `SMTP_*`,
`EMAIL_FROM` and `LEAD_ALERT_RECIPIENTS` settings in the server's `.env` (see docs/DEPLOY.md; Resend or
Postmark both work over SMTP). Without Docker: `cd apps/api && uv run arq app.workers.main.WorkerSettings`.

## Privacy

The legal pages (`/privacy`, `/cookies`, `/terms`) describe what the code actually does, so change them in
the same pull request as any change to what data is collected, where it goes or which cookies are set.
They rely on:

- the contact form's required consent tick, and campaign tags read only from the current link (nothing is
  stored in visitors' browsers; ordinary visitors get no cookies);
- owners deleting a lead on request (lead page in the admin), with no personal data left in the audit log;
- the worker deleting leads with no activity for `LEAD_RETENTION_DAYS` (730) every night, except won clients.

The company details on those pages live in `legal` in `apps/web/src/lib/site.ts`; bracketed values are
placeholders that must be filled before launch.

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

On the server: `/srv/ujglobal/infra/server/stack.sh production exec api python -m app.cli create-user ...`.
Then sign in at http://localhost:9006/admin. Roles are `owner`, `editor` and `sales`; the leads inbox
(`/admin/leads`: filters, status, assignee, notes, CSV export) is for owners and sales. Admin endpoints use `POST /v1/auth/login`, `/refresh` and `/logout`
(see the API docs).

## Deploying

Two ways to run it on your own server; GitHub only tests the code and never deploys:

- **One port** (`compose.yml`, simplest, for hosting panels that map a domain to a single port): the whole
  site answers on port 9006 (API on 9005), a built-in reverse proxy routes `/v1/*` to the API and everything else to the
  website, and it uses your existing PostgreSQL. See [docs/DEPLOY-SINGLE-PORT.md](docs/DEPLOY-SINGLE-PORT.md).
- **Full setup**: production and staging side by side behind Cloudflare, with a shared Caddy on ports
  80/443, backups and a firewall. See [docs/DEPLOY.md](docs/DEPLOY.md).

| Path | What |
| --- | --- |
| `compose.yml` + `.env` | The live site: one port (9006; API on 9005), built on the server, using your PostgreSQL (routing in `infra/single-port/`) |
| `compose.dev.yml` + `.env.local` | Local development, with its own Postgres, Redis and Mailpit (stack in `infra/compose.local.yml`) |
| `infra/compose.app.yml` | One stack (web, api, worker, Postgres, Redis); used for production and staging |
| `infra/edge/` | The shared Caddy in front of both stacks |
| `infra/server/` | `setup.sh` (one-time), `new-env.sh`, `deploy.sh`, `stack.sh`, `backup.sh`, `restore.sh`, firewall |
| `.github/workflows/` | `ci.yml`: tests, infra checks and an image build check (nothing is published or deployed from GitHub) |

## Status

Phase 0 scaffold: public pages (home, services, service detail, about, contact), SEO basics (metadata, JSON-LD,
sitemap, robots), core database schema, and a contact endpoint that stores every submission as a lead.
Phase 1 in progress: admin auth (Argon2 passwords, JWT access tokens, rotating refresh cookie), the
leads inbox at `/admin/leads`, new-lead alert emails, services and case studies edited in the admin with `/work`
pages for the portfolio, the Signal brand, legal pages, and the deploy pipeline (docs/DEPLOY.md).
See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the full plan and the remaining phases, and
[docs/BRAND.md](docs/BRAND.md) for the brand (logo, colours, type).
