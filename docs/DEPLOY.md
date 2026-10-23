# Deploying ujglobal.tech

> **Being reworked (23 Oct 2026).** GitHub no longer publishes images or deploys: UJ Global runs the site on its own server and hosting platforms. The GitHub Actions steps below (step 6, the automatic staging deploy and "Deploy production") no longer exist, and `infra/compose.app.yml` still expects published images. This guide will be rewritten for the chosen hosting before go-live; the server setup, Cloudflare, email, backup and firewall parts still apply.

One Linux server (Ubuntu 22.04/24.04 or Debian 12; 4 vCPU, 8 GB RAM, 80 GB disk is plenty) runs two copies of the site behind Cloudflare:

| Stack | Site | API | Deploys |
| --- | --- | --- | --- |
| production | https://ujglobal.tech | https://api.ujglobal.tech | when you run **Actions → Deploy production** |
| staging | https://staging.ujglobal.tech (password) | https://api-staging.ujglobal.tech | automatically after every merge to `main` |

```text
Visitors -> Cloudflare -> server :443 -> edge Caddy --+--> production: web, api, worker, postgres, redis
            (DNS, CDN,     (Cloudflare     (one for  |
             WAF)           IPs only)      the box)  +--> staging:    web, api, worker, postgres, redis
```

Each stack has its own database, Redis and secrets; staging can never touch real leads. On every merge to `main`, GitHub Actions tests the code, builds the images (`ghcr.io/sufi1512/ujglobal-web` and `ujglobal-api`, tagged with the commit) and deploys them to staging. Production gets the same images when you choose to ship them.

Everything below is done once. Steps 1–6 take about an hour.

## 1. Make a deploy key (on your own computer)

GitHub Actions logs in to the server with its own SSH key, separate from yours:

```bash
ssh-keygen -t ed25519 -f ujglobal_deploy -C "github-actions@ujglobal" -N ""
```

That creates `ujglobal_deploy` (private, for GitHub in step 6) and `ujglobal_deploy.pub` (public, for the server in step 2).

## 2. Set up the server

Make sure you can log in to the server **with your own SSH key** first (the script only turns off password logins when an admin key exists, so you can't be locked out). Then, on the server:

```bash
git clone https://github.com/Sufi1512/ujglobal-web.git /tmp/ujglobal-web
sudo DEPLOY_PUBKEY="$(cat ujglobal_deploy.pub)" bash /tmp/ujglobal-web/infra/server/setup.sh
```

(Paste the contents of `ujglobal_deploy.pub` if the file isn't on the server.) The script:

- installs security updates and turns on automatic ones;
- installs Docker if needed;
- creates a `deploy` user that can run Docker but has no password and no sudo;
- creates `/srv/ujglobal`;
- opens only SSH, HTTP and HTTPS; enables fail2ban;
- switches off SSH password logins (only if your key works);
- installs the daily backup timer.

It's safe to run again.

> Being in the `docker` group gives the `deploy` user root-level power over the server, so keep its private key only in GitHub's secrets.

## 3. Cloudflare

In the Cloudflare dashboard for ujglobal.tech:

1. **DNS:** add these records, all **Proxied** (orange cloud), pointing at the server's IP:

   | Type | Name |
   | --- | --- |
   | A | `ujglobal.tech` (`@`) |
   | A | `www` |
   | A | `api` |
   | A | `staging` |
   | A | `api-staging` |

   Add matching AAAA records too, if the server has IPv6.
2. **SSL/TLS → Overview:** set the mode to **Full (strict)**.
3. **SSL/TLS → Origin Server → Create Certificate:** hostnames `ujglobal.tech, *.ujglobal.tech`, validity 15 years. Save the two texts on the server:

   ```bash
   sudo nano /srv/ujglobal/edge/certs/origin.pem   # paste the Origin Certificate
   sudo nano /srv/ujglobal/edge/certs/origin.key   # paste the Private Key
   sudo chmod 600 /srv/ujglobal/edge/certs/*
   ```

4. **SSL/TLS → Edge Certificates:** turn on **Always Use HTTPS**.
5. **Security → Settings:** set **Challenge Passage** to **30 minutes** (the cookie policy says so), and turn on **Bot Fight Mode**.
6. **Security → WAF → Managed rules:** turn on the Cloudflare managed ruleset.
7. **Security → WAF → Rate limiting rules → Create rule:** when *URI Path* is in `/v1/auth/login`, `/v1/auth/mfa/verify`, `/v1/leads/contact` and the hostname is `api.ujglobal.tech`, block for 10 minutes after **10 requests per minute** from one IP. (The API has its own limits too; this stops floods before they reach the server.)
8. **Turnstile → Add widget** (recommended): domain `ujglobal.tech`, mode *Managed*. Put the **site key** in the web image's `NEXT_PUBLIC_TURNSTILE_SITE_KEY` build setting and the **secret key** in `TURNSTILE_SECRET` in `production/.env`. The contact form then checks visitors are human, usually invisibly.

## 4. Settings files

Generate the settings files on the server. Every secret is random. Each stack gets two files: `.env` for the API, worker and database (all the secrets), and `web.env` for the website, which holds only the two values it needs, so a bug in the website can't expose the database password or the other keys:

```bash
sudo -u deploy bash /tmp/ujglobal-web/infra/server/new-env.sh production
sudo -u deploy bash /tmp/ujglobal-web/infra/server/new-env.sh staging
sudo -u deploy bash /tmp/ujglobal-web/infra/server/new-env.sh edge   # asks for a username and password for staging
```

Then fill in production's email settings in step 5 and set `LEAD_ALERT_RECIPIENTS`, e.g. `["you@ujglobal.tech","sales@ujglobal.tech"]`:

```bash
sudo -u deploy nano /srv/ujglobal/production/.env
```

The API refuses to start in production without email settings, so a missing one shows up immediately rather than as silently lost alerts.

## 5. Email (Resend or Postmark)

Lead alerts go out over SMTP; either provider works and switching later is a settings change.

- **Resend** (simplest): sign up, **Domains → Add domain** `ujglobal.tech`, and add the DNS records it shows (SPF, DKIM, and the suggested DMARC) in Cloudflare, **DNS only** (grey cloud). Create an API key. In `production/.env`: `SMTP_HOST=smtp.resend.com`, `SMTP_USERNAME=resend`, `SMTP_PASSWORD=<the API key>`.
- **Postmark:** create a server, add the domain's DKIM and Return-Path records, and use the server token as both `SMTP_USERNAME` and `SMTP_PASSWORD` with `SMTP_HOST=smtp.postmarkapp.com`.

Accept the provider's data processing agreement (the privacy policy refers to it).

## 6. GitHub

In the repository's **Settings**:

1. **Environments → New environment → `staging`.** Add these secrets:
   - `SSH_HOST`: the server's IP address (not a Cloudflare-proxied name).
   - `SSH_PRIVATE_KEY`: the whole contents of `ujglobal_deploy` from step 1.
   - `SSH_KNOWN_HOSTS`: the output of `ssh-keyscan -t ed25519 <server IP>`. This pins the server's identity.
   - `SSH_PORT`: only if SSH isn't on port 22.
2. **Environments → New environment → `production`.** Add the same four secrets. Under **Deployment protection rules**, tick **Required reviewers** and add yourself, so production waits for your approval even when someone else starts it.
3. **Secrets and variables → Actions → Variables → New repository variable:** `DEPLOY_STAGING` = `true`. This switches on automatic staging deploys.
4. Then delete `ujglobal_deploy` and `ujglobal_deploy.pub` from your computer: GitHub and the server now hold them.

## 7. First deploy

1. **Staging:** merge any pull request, or open the latest **CI** run on `main` and **Re-run all jobs**. When it finishes, open https://staging.ujglobal.tech with the step 4 password. Create your admin account there:

   ```bash
   docker exec -it ujglobal-staging-api-1 python -m app.cli create-user --email you@ujglobal.tech --name "Your Name" --role owner
   ```

2. **Production:** **Actions → Deploy production → Run workflow** (leave the version empty), then approve it. When it's green, create the production owner the same way, with `ujglobal-production-api-1`. Sign in at https://ujglobal.tech/admin.

   Owners and sales users must turn on **two-factor sign-in** before they can use the admin: on first sign-in the admin opens **Security**, where you scan a QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) and save 10 one-time backup codes in your password manager. Lost the phone and the codes? Reset it from the server: `docker exec -it ujglobal-production-api-1 python -m app.cli reset-mfa --email someone@ujglobal.tech`.

3. **Check alerts:** send yourself a message through https://ujglobal.tech/contact. The alert should arrive within a minute.

## 8. Lock the origin to Cloudflare (before going public)

Do this as soon as the site loads through Cloudflare, before announcing it. Until then, attackers can reach the server's IP directly and skip Cloudflare's protection:

```bash
sudo systemctl enable --now ujglobal-firewall.service ujglobal-firewall.timer
```

From your own computer, `curl -m 10 -k https://<server IP>` should now time out, while https://ujglobal.tech still loads.

Then protect the staging API, which can't sit behind the staging password: in Cloudflare **Zero Trust → Access → Applications**, add `api-staging.ujglobal.tech` and `staging.ujglobal.tech` with a policy that allows only your team's emails (free for up to 50 users). To undo: `sudo systemctl disable --now ujglobal-firewall.service`. Docker's published ports bypass `ufw`, so this uses Docker's own `DOCKER-USER` chain; the IP ranges refresh weekly from cloudflare.com.

## 9. Search engines

- In **Google Search Console**, add the **Domain** property `ujglobal.tech`. Verify it with the TXT record it gives you (add it in Cloudflare DNS), then submit `https://ujglobal.tech/sitemap.xml`.
- Do the same in **Bing Webmaster Tools**; it can import from Search Console.

## Day to day

| Task | How |
| --- | --- |
| Ship to production | **Actions → Deploy production → Run workflow**, leaving the version empty, then approve. |
| Roll back | Same workflow, with the full commit SHA of the last good version. The images are kept, so this takes a minute. Database migrations are not reversed automatically. |
| A bad deploy | `deploy.sh` waits for the health checks and rolls back to the previous version by itself if they fail; the Actions log shows why. |
| Logs | `/srv/ujglobal/infra/server/stack.sh production logs -f api` (or `web`, `worker`). Caddy: `docker logs -f ujglobal-edge-caddy-1`. |
| Status | `/srv/ujglobal/infra/server/stack.sh production ps`, which shows each container and its health. |
| Admin users | `docker exec -it ujglobal-production-api-1 python -m app.cli create-user / set-password / deactivate ...` |
| Backups | Daily at 02:47 UTC into `/srv/ujglobal/backups/<stack>/`, kept 14 days, plus one before every production deploy. Check: `systemctl list-timers 'ujglobal-backup*'`. |
| Off-server backups | Install `rclone`, add your bucket as a remote (for example Cloudflare R2, named `r2`), then add a second remote of **type `crypt`** wrapping it (for example `r2crypt` → `r2:ujglobal-backups`) with a long random password kept in your password manager. Set `BACKUP_REMOTE=r2crypt:` in `production/.env`. The backup script refuses to upload to a remote that isn't encrypted. |
| Two-factor reset | `docker exec -it ujglobal-production-api-1 python -m app.cli reset-mfa --email ...` (they set it up again at their next sign-in). |
| Locked out by too many attempts | Sign-in unlocks itself after 15 minutes. The owners get an email whenever an account or address is locked. |
| Test a restore (monthly) | `/srv/ujglobal/infra/server/restore.sh staging /srv/ujglobal/backups/production/<latest>.dump`, then check staging. It takes a safety backup of staging first. |
| Restore production | `restore.sh production <file>`. It asks you to type `production`, and backs up the current data first, so a restore can be undone. |
| Change a setting | Edit the stack's `.env`, then `/srv/ujglobal/infra/server/stack.sh production up -d`. |

Files on the server:
- `/srv/ujglobal/infra/`: copied from this repo's `infra/` on every deploy; don't edit it there.
- `/srv/ujglobal/{production,staging}/.env` and `deployed.env`: the settings and the version that's running.
- `/srv/ujglobal/edge/`: the staging password and Cloudflare's origin certificate.
- `/srv/ujglobal/backups/`: the database dumps.
