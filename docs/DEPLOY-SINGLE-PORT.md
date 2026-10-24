# Deploying the live site: website on port 9006, API on 9005, your existing PostgreSQL

The root `compose.yml` is the live site. Point your hosting panel's domain at **port 9006** and it serves everything: website, API and admin. The API itself listens on **127.0.0.1:9005** (handy for `curl http://127.0.0.1:9005/health` on the server). It uses **the PostgreSQL you already have**; it doesn't start its own database and doesn't use port 5432.

| Request on `https://your-domain` | Goes to |
| --- | --- |
| `/v1/...` and `/health` | API (127.0.0.1:9005) |
| everything else (`/`, `/services`, `/admin`, ...) | website (127.0.0.1:9007, internal) |
| `/api/revalidate` | refused (404); only the worker uses it, directly on 127.0.0.1 |

```text
Visitor -> hosting panel (HTTPS, domain) -> 127.0.0.1:9006 -> gateway (Caddy) --+--> /v1/*  -> API     :9005 --+
                                                                                 +--> others -> website :9007    |
                                                       your existing PostgreSQL (DATABASE_URL) <-- API, worker --+
                                                       Redis: 127.0.0.1:6380, only for the API and worker
```

The website and API share the domain, so the browser calls the API on the same address: no CORS setup, and the admin's sign-in cookie stays first-party. Images are built on the server from this repository; nothing comes from a registry.

**Two settings files.** The live site reads its settings from your hosting panel's **environment variables**, or from a **`.env`** file next to `compose.yml`; your computer reads **`.env.local`** (with `compose.dev.yml`). Both have a committed example next to them; git ignores the real files. Needs Docker Compose 2.24 or newer (`docker compose version`).

## 1. Settings

**Hosting panel:** paste the lines of `.env.production.example` into its environment variables, with your values (the panel's own folder is rebuilt on every deploy, so a file there would be lost).

**By hand**, on the server in the repository folder:

```bash
cp .env.production.example .env
bash infra/server/gen-secrets.sh        # prints the four secrets to paste in
nano .env
```

| Setting | Value |
| --- | --- |
| `SITE_URL` | your domain with https, e.g. `https://ujglobal.tech` |
| `DATABASE_URL` | **required, no default**: the site's user and database in your PostgreSQL, e.g. `postgresql+asyncpg://ujglobal:PASSWORD@localhost:5432/ujglobal` (`postgres://...` works too). The API refuses to start without it |
| `DATABASE_ADMIN_URL` | optional, see step 2 |
| `JWT_SECRET`, `IP_HASH_SALT`, `REVALIDATE_SECRET`, `MFA_ENCRYPTION_KEY` | the four lines from `gen-secrets.sh`. Keep `MFA_ENCRYPTION_KEY` the same forever |
| `SMTP_*`, `EMAIL_FROM`, `LEAD_ALERT_RECIPIENTS` | alerts go to `hello@ujglobal.tech` by default. Replace `SMTP_HOST` and `SMTP_PASSWORD` for the service that hosts that mailbox (Google Workspace, Zoho, Hostinger, Microsoft 365 or Resend: the example lists each one's settings), or set `LEAD_ALERT_RECIPIENTS=[]` to switch alerts off for now. The API won't start with the example's `REPLACE_...` values while alerts are on |
| `PUBLIC_PORT` | `9006` (default), the port your panel points the domain at |
| `PUBLIC_BIND` | `127.0.0.1` (default). `0.0.0.0` only if the panel connects from another machine or can't reach 127.0.0.1; then allow the port from the panel's address alone |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | optional: Cloudflare's human check on the contact form |

Settings set in the panel win over the `.env` file. The deploy stops with a clear "set X in .env or the panel's environment variables" message if something required is missing.

### If your panel doesn't pass settings to containers

Some panels read your `.env` but start the containers without it (the API logs `received none of the site's settings`). The live images are therefore built from the repository root and **copy in the `.env` that sits next to `compose.yml` at build time**: the API reads it from inside its image, and the website takes `SITE_URL` and `REVALIDATE_SECRET` from it. So with such a panel, make sure the `.env` is in the app's root folder **before** you deploy, and redeploy after changing it. The images are built on your server and never pushed anywhere. Environment variables, when they do arrive, take priority over the file.

## 2. The database is created for you

On every start the API checks the PostgreSQL in `DATABASE_URL` (13 or newer), **creates the database named there if it doesn't exist**, then creates or updates its tables. There is no built-in database address: without `DATABASE_URL` nothing starts. Pick one:

- **Simplest:** set `DATABASE_ADMIN_URL` to an admin connection, e.g. `postgresql+asyncpg://postgres:ADMIN_PASSWORD@localhost:5432/postgres`. The API then also creates the site's user from `DATABASE_URL`, with that password. You can remove the admin URL after the first successful start.
- **Without an admin URL:** create the user once, allowed to create its own database: `CREATE USER ujglobal WITH PASSWORD '...' CREATEDB;`. The API creates the database.
- **Or** create both yourself (`CREATE DATABASE ujglobal OWNER ujglobal;`); the API sees they exist and carries on.

How the site reaches your PostgreSQL: the site's containers share the server's own network, so `localhost` in the URLs means this server, exactly like an app run without Docker. They listen on 127.0.0.1 only: 9006 (the site, `PUBLIC_PORT`), 9005 (API), 9007 (website, internal) and 6380 (Redis), so those ports must be free.

| Your PostgreSQL runs... | Host in the URLs | Also needed |
| --- | --- | --- |
| directly on this server, or in Docker publishing port 5432 | `localhost` | nothing |
| in Docker **without** a published port (the panel shows just `5432/tcp`) | `localhost` | publish it on this server only: `127.0.0.1:5432:5432` |
| on another server or a managed service | its hostname | allow this server's IP; add `?ssl=require` to the URL |

## 3. Deploy

Most panels run this on every deploy. By hand, from the repository folder:

```bash
docker compose up -d --build
docker compose ps                      # gateway, web, api, worker, redis: running/healthy after ~1 minute
docker compose logs api | head         # "Database ready (created database ujglobal)" on the first start
curl -s http://127.0.0.1:9005/health   # {"status":"ok"}
```

## 4. Point the domain at port 9006

In your hosting panel, map the domain, with HTTPS on, to **port 9006** on this server. If Cloudflare is in front, add Cloudflare's IP ranges to `trusted_proxies` in `infra/single-port/Caddyfile` so visitor addresses (used for the sign-in and contact limits) come through correctly.

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
| `set ... in .env or the panel's environment variables` | That setting is missing or empty: add it in the panel, or in `.env` (step 1) |
| API logs say `DATABASE_URL is required` and `received none of the site's settings` | The settings didn't reach the container. Check they're saved in this app's environment variables in the panel, then redeploy. A container you started by hand from the `ujglobal-api` image (not through the deploy) never gets them: remove it |
| Deploy fails with `container ...-api-1 is unhealthy` | Open that container's logs: its last lines say why the API stopped (one of the rows here) |
| `additional property ... is not allowed` (e.g. on `env_file`) | Docker Compose is older than 2.24: update Docker |
| API keeps restarting; logs say `Could not reach PostgreSQL` or `password authentication failed` | Check the host and password in `DATABASE_URL` (and `DATABASE_ADMIN_URL`), and the PostgreSQL settings in step 2. |
| Logs say `isn't allowed to create it` | Set `DATABASE_ADMIN_URL`, give the user `CREATEDB`, or create the database once (step 2) |
| `address already in use` on 9006 | Something else uses 9006: change `PUBLIC_PORT` and point the domain at that port instead. Ports 9005, 9007 and 6380 must be free too |
| Panel shows "bad gateway" | The panel can't reach 127.0.0.1:9006: set `PUBLIC_BIND=0.0.0.0` and firewall the port to the panel only |
