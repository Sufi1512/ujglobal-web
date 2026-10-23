# Deploying behind one port (9005)

Use this when your hosting panel lets you point a domain at **one port** on the server. The whole site (website, API and admin) answers on that port, and a small built-in reverse proxy sends each request to the right place:

| Request on `https://your-domain` | Goes to |
| --- | --- |
| `/v1/...` and `/health` | API (container port 9005) |
| everything else (`/`, `/services`, `/admin`, ...) | website (container port 9006) |
| `/api/revalidate` | refused (404); only the worker uses it, from inside Docker |

```text
Visitor -> your hosting panel (HTTPS, domain) -> server port 9005 -> gateway (Caddy) --+--> /v1/*  -> API     :9005
                                                                                      +--> others -> website :9006
                                       (API, worker, Postgres and Redis are never published)
```

The website and API share the domain, so the browser calls the API on the same address: no CORS setup, and the admin's sign-in cookie stays first-party. Everything is built on the server from this repository; nothing comes from a registry.

Files: `infra/compose.single.yml` (the stack) and `infra/single-port/Caddyfile` (the routing).

## 1. On the server

You need Docker with the Compose plugin (`docker compose version`). Then:

```bash
sudo mkdir -p /srv/ujglobal && sudo chown "$USER" /srv/ujglobal
git clone https://github.com/Sufi1512/ujglobal-web.git /srv/ujglobal/app
bash /srv/ujglobal/app/infra/server/new-env.sh production
```

`new-env.sh` writes `/srv/ujglobal/production/.env` (API, worker, database, every secret random) and `/srv/ujglobal/production/web.env` (just the two values the website needs).

## 2. Settings

Edit `/srv/ujglobal/production/.env`:

- `ADMIN_BASE_URL` and `CORS_ORIGINS`: your domain, e.g. `ADMIN_BASE_URL=https://ujglobal.tech` and `CORS_ORIGINS=["https://ujglobal.tech"]`. The website is built to call the API on this same address.
- The **EMAIL** section and `LEAD_ALERT_RECIPIENTS` (docs/DEPLOY.md, step 5). The API won't start in production without them.
- Optional: `PUBLIC_PORT=9005` (the default) if your panel needs a different port, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET` for Cloudflare's human check on the contact form.

Leave `COOKIE_SECURE=true`: your panel serves the site over HTTPS.

## 3. Start it

```bash
cd /srv/ujglobal/app
export ENV_FILE=/srv/ujglobal/production/.env WEB_ENV_FILE=/srv/ujglobal/production/web.env
docker compose -f infra/compose.single.yml --env-file "$ENV_FILE" up -d --build
docker compose -f infra/compose.single.yml --env-file "$ENV_FILE" ps     # all "healthy" after ~1 minute
curl -s http://127.0.0.1:9005/health                                      # {"status":"ok"}
```

The API applies database migrations itself each time it starts.

## 4. Point the domain at port 9005

In your hosting panel, map the domain (with HTTPS on) to **port 9005** on this server.

The gateway listens on `127.0.0.1:9005` by default, so only something running on the same server, like your panel's proxy, can reach it; the internet can't bypass HTTPS. If your panel connects from another machine or from its own Docker network and can't reach `127.0.0.1`, set `PUBLIC_BIND=0.0.0.0` in `.env`, start again, and allow port 9005 in the firewall **only from the panel's address**.

If Cloudflare is in front, add Cloudflare's IP ranges to `trusted_proxies` in `infra/single-port/Caddyfile` so visitor addresses (used for the sign-in and contact limits) come through correctly.

## 5. First sign-in

```bash
docker exec -it ujglobal-production-api-1 python -m app.cli create-user --email you@ujglobal.tech --name "Your Name" --role owner
```

Sign in at `https://your-domain/admin`. Owners and sales users set up two-factor sign-in on first sign-in (docs/DEPLOY.md, step 7).

## Day to day

| Task | Command (from `/srv/ujglobal/app`, with `ENV_FILE` and `WEB_ENV_FILE` exported as above) |
| --- | --- |
| Update to the latest code | `git pull && docker compose -f infra/compose.single.yml --env-file "$ENV_FILE" up -d --build` |
| Back up first (recommended) | `bash infra/server/backup.sh production pre-update` |
| Logs | `docker compose -f infra/compose.single.yml --env-file "$ENV_FILE" logs -f api` (or `web`, `gateway`, `worker`) |
| Status | `docker compose -f infra/compose.single.yml --env-file "$ENV_FILE" ps` |
| Admin users, two-factor reset | `docker exec -it ujglobal-production-api-1 python -m app.cli ...` |
| Daily backups | `infra/server/backup.sh` and `restore.sh` work unchanged (same container names); see docs/DEPLOY.md for the timer and encrypted off-server copies |
