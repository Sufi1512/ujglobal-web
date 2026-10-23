# Deploying behind one port (9005) with your existing PostgreSQL

The root `compose.yml` is the live site. Point your hosting panel's domain at **port 9005** and it serves everything: website, API and admin. It uses **the PostgreSQL you already have**; it doesn't start its own database and doesn't use port 5432.

| Request on `https://your-domain` | Goes to |
| --- | --- |
| `/v1/...` and `/health` | API (container port 9005) |
| everything else (`/`, `/services`, `/admin`, ...) | website (container port 9006) |
| `/api/revalidate` | refused (404); only the worker uses it, from inside Docker |

```text
Visitor -> hosting panel (HTTPS, domain) -> 127.0.0.1:9005 -> gateway (Caddy) --+--> /v1/*  -> API     :9005 --+
                                                                                 +--> others -> website :9006    |
                                                       your existing PostgreSQL (DATABASE_URL) <-- API, worker --+
                                                       Redis: inside the stack, no published port
```

The website and API share the domain, so the browser calls the API on the same address: no CORS setup, and the admin's sign-in cookie stays first-party. Images are built on the server from this repository; nothing comes from a registry. Local development uses `compose.dev.yml` instead.

## 1. Prepare a database in your PostgreSQL

PostgreSQL 13 or newer. Create an empty database and a user just for the site (in `psql` as an admin):

```sql
CREATE USER ujglobal WITH PASSWORD 'a-long-random-password';
CREATE DATABASE ujglobal OWNER ujglobal;
```

The API creates all its tables itself on first start.

How the site reaches it (`DATABASE_URL` in step 2):

| Your PostgreSQL runs... | Host to use in `DATABASE_URL` | Also needed |
| --- | --- | --- |
| in Docker, publishing port 5432 on this server | `host.docker.internal` | nothing |
| directly on this server (installed with apt) | `host.docker.internal` | In `postgresql.conf` set `listen_addresses = '*'` (or add `172.17.0.1`); in `pg_hba.conf` add `host ujglobal ujglobal 172.16.0.0/12 scram-sha-256`; restart PostgreSQL. Keep port 5432 closed to the internet in your firewall. |
| on another server or a managed service | its hostname | allow this server's IP; add `?ssl=require` to the URL |

## 2. Settings

Enter these in your hosting panel's environment settings, or copy `deploy.env.example` to `.env` next to `compose.yml` and fill it in. The deploy stops with a clear message if a required one is missing.

| Setting | Value |
| --- | --- |
| `SITE_URL` | your domain with https, e.g. `https://ujglobal.tech` |
| `DATABASE_URL` | `postgresql+asyncpg://ujglobal:PASSWORD@host.docker.internal:5432/ujglobal` |
| `JWT_SECRET`, `IP_HASH_SALT`, `REVALIDATE_SECRET`, `MFA_ENCRYPTION_KEY` | run `bash infra/server/gen-secrets.sh` and paste its four lines (or any 64 random hex characters each) |
| `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `LEAD_ALERT_RECIPIENTS` | your email provider (docs/DEPLOY.md, step 5); required unless `LEAD_ALERT_RECIPIENTS=[]` |
| `PUBLIC_PORT` | `9005` (default), the port your panel points the domain at |
| `PUBLIC_BIND` | `127.0.0.1` (default). Use `0.0.0.0` only if the panel connects from another machine or can't reach 127.0.0.1, and then allow the port from the panel's address alone |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | optional: Cloudflare's human check on the contact form |

Keep `MFA_ENCRYPTION_KEY` the same forever after the first deploy: changing it turns everyone's two-factor sign-in off.

## 3. Deploy

Most panels run this for you on every deploy. By hand, from the repository folder:

```bash
docker compose up -d --build
docker compose ps                      # gateway, web, api, worker, redis: all running/healthy after ~1 minute
curl -s http://127.0.0.1:9005/health   # {"status":"ok"}
```

The API applies database migrations on every start, so redeploying is all an update needs.

## 4. Point the domain at port 9005

In your hosting panel, map the domain, with HTTPS on, to **port 9005** on this server. If Cloudflare is in front, add Cloudflare's IP ranges to `trusted_proxies` in `infra/single-port/Caddyfile` so visitor addresses (used for the sign-in and contact limits) come through correctly.

## 5. First sign-in

```bash
docker exec -it ujglobal-api-1 python -m app.cli create-user --email you@ujglobal.tech --name "Your Name" --role owner
```

Sign in at `https://your-domain/admin`. Owners and sales users set up two-factor sign-in on first sign-in.

## Day to day

| Task | How |
| --- | --- |
| Update | Redeploy in the panel, or `git pull && docker compose up -d --build` |
| Logs | `docker compose logs -f api` (or `web`, `gateway`, `worker`) |
| Status | `docker compose ps` |
| Admin users, two-factor reset | `docker exec -it ujglobal-api-1 python -m app.cli create-user / set-password / deactivate / reset-mfa ...` |
| Backups | The data lives in your PostgreSQL, so your existing backups cover it. For a one-off copy: `pg_dump -Fc -d ujglobal > ujglobal.dump` |

## Troubleshooting

| Message | Fix |
| --- | --- |
| `set DATABASE_URL ...` (or another `set ...`) | That setting is missing in the panel or `.env` |
| API keeps restarting; logs say `connection refused` or `password authentication failed` | Check `DATABASE_URL`, and the PostgreSQL settings in step 1 for your setup |
| `port is already allocated` on 9005 | Something else uses 9005: change `PUBLIC_PORT` and point the domain at that port instead |
| Panel shows "bad gateway" | The panel can't reach 127.0.0.1:9005: set `PUBLIC_BIND=0.0.0.0` and firewall the port to the panel only |
