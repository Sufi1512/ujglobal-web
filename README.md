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
- Mailpit (test inbox): http://localhost:8025

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

## Database changes

Edit the models in `apps/api/app/models`, then:

```bash
cd apps/api && uv run alembic revision --autogenerate -m "describe the change" && uv run alembic upgrade head
```

## Status

Phase 0 scaffold: public pages (home, services, service detail, about, contact), SEO basics (metadata, JSON-LD,
sitemap, robots), core database schema, and a contact endpoint that stores every submission as a lead.
See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the full plan and the remaining phases.
