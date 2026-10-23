# UJ Global Website Build Plan

Written 22 Oct 2026 for Sufiyan. Copied from the original Claude doc so the plan lives with the code.

## Overview

ujglobal.tech should be a fast, SEO-first marketing site that turns visitors into qualified leads for web, app, AI and SEO work, backed by a small admin so the team can publish case studies and posts without a developer. The plan ships an MVP in about 6 weeks and the full site in about 10 to 12 weeks for one or two developers.

**Goals**

- Explain the four service lines (Web, Mobile Apps, AI Integration, SEO and Growth) clearly enough that a buyer self-qualifies.
- Prove capability with in-house demo projects now, and client case studies as they come in.
- Rank for service and location keywords through a blog and landing pages.
- Capture leads through a contact form, a project-brief wizard and call booking, with every lead in one admin inbox.

**Audience:** founders and SMBs who need a product built, and mid-size companies adding AI to existing systems.

**Success metrics (first 6 months after launch):** Lighthouse 95+ on every page, all key pages indexed, 2 to 4% visitor-to-lead conversion on service pages, lead reply time under 24 hours.

**Stack at a glance**

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion | Server rendering and static generation for SEO, strong ecosystem |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 | Async, typed, auto OpenAPI docs, natural fit for AI work |
| Database | PostgreSQL 16 (+ pgvector for the AI assistant) | Relational content plus vector search in one database |
| Background jobs | ARQ or Celery with Redis | Emails, CRM sync, embeddings off the request path |
| Media | S3-compatible storage (Cloudflare R2) + CDN | Cheap, fast image delivery |
| Email | Resend or Postmark | Transactional lead notifications |
| AI | Claude API for the site assistant and lead triage | Shows the firm's own AI capability on the site |

## Sitemap and pages

The public site has 14 page types; content pages are statically generated and revalidated when the admin publishes, so they load from the CDN.

| Route | Page | Key content | Rendering |
| --- | --- | --- | --- |
| `/` | Home | Hero with value prop, service cards, featured demo projects, tech we use, process, CTA | Static (ISR) |
| `/services` | Services hub | All service lines with short pitch and links | Static (ISR) |
| `/services/[slug]` | Service detail | Web Development, Mobile Apps, AI Integration, AI Agents and Automation, SEO and Growth, UI/UX Design, Cloud and DevOps: problem, deliverables, tech stack, process, FAQs, related work, CTA | Static (ISR) |
| `/work` | Portfolio | Filterable grid by service, industry, tech | Static (ISR) |
| `/work/[slug]` | Case study | Client, challenge, solution, stack, results with metrics, gallery, testimonial | Static (ISR) |
| `/industries/[slug]` | Industry page | Healthcare, e-commerce, fintech, education, etc. (optional, Phase 3) | Static (ISR) |
| `/blog` | Blog index | Posts with categories, tags, search, pagination | Static (ISR) |
| `/blog/[slug]` | Blog post | MDX/rich text, author, TOC, related posts, newsletter CTA | Static (ISR) |
| `/about` | About | Story, mission, team, values, tech partners | Static |
| `/careers` + `/careers/[slug]` | Careers | Open roles and an application form with CV upload | Static (ISR) |
| `/contact` | Contact | Form, call booking (Cal.com embed), email, WhatsApp, address, map | Static + client form |
| `/start-project` | Project brief wizard | Multi-step: service, budget, timeline, details, contact; ends with a "we will send you a quote" confirmation | Client |
| `/privacy`, `/terms`, `/cookies` | Legal | Policies | Static |
| `/admin/*` | Admin panel | Protected dashboard (see Features) | Client, no index |

System routes: `/sitemap.xml`, `/robots.txt`, `/rss.xml`, `/api/og` (generated social images), and a custom 404.

## Features

Every public feature is managed from the admin panel, so the team edits content, not code.

**Services**

- Service records with rich sections (problem, deliverables, process steps, tech stack, FAQs). No prices are shown; every service ends with a "Get a quote" call to action.
- Each service page links to matching case studies and blog posts automatically by tag.

**Portfolio and case studies**

Launch content: with no client work yet, the portfolio starts with 3 to 4 in-house demo projects (for example an AI support chatbot, an e-commerce storefront, a booking app and an SEO audit tool), each clearly marked as a demo with a live link. Testimonials and client logos stay hidden until real ones exist.

- Case studies with cover image, gallery, results metrics (for example "+180% organic traffic"), client testimonial and tech tags.
- Filters by service, industry and technology; "featured" flag for the home page.

**Blog and content marketing**

- Rich-text editor (TipTap) in admin, stored as JSON plus rendered HTML; code blocks, images, embeds.
- Categories, tags, authors, reading time, table of contents, related posts, draft/scheduled/published states.
- Newsletter signup feeding a subscribers table (exportable or synced to Mailchimp/Brevo).

**Lead capture**

- Contact form and the multi-step project brief wizard, both with server validation, honeypot and Cloudflare Turnstile against spam.
- No price estimate: the wizard collects scope, budget range and timeline so the team can reply with a quote.
- Call booking through a Cal.com embed; bookings land in the lead record via webhook.
- On submit: save lead, email the team, send the visitor a confirmation, optional Slack/WhatsApp alert. Every submission is saved in Postgres first; there is no external CRM.
- UTM source, landing page and referrer stored on every lead for attribution.

**AI features (showcase the firm's own skills)**

- Site assistant chat widget answering questions about services, process and past work (it never quotes prices and points pricing questions to "Get a quote"), grounded in site content through pgvector retrieval, with a handoff to "book a call".
- Automatic lead triage: Claude summarises each brief, tags service and budget, and scores fit, shown in the admin inbox.
- Admin writing helper: draft meta titles, descriptions and post outlines.

**Admin panel (`/admin`)**

- Login with email and password plus optional 2FA; roles: Owner, Editor, Sales.
- Dashboard: leads this week, conversion by page, top posts.
- Leads inbox (used instead of a CRM): status pipeline (New, Contacted, Qualified, Proposal, Won, Lost), notes, assignee, CSV export.
- CRUD for services, case studies, posts, testimonials, team, jobs, FAQs, site settings and redirects.
- Media library with upload to R2, alt text required, automatic resizing.
- Per-page SEO fields (meta title, description, canonical, OG image, noindex).

**Site-wide**

- Dark and light theme, responsive, WCAG 2.2 AA accessibility, cookie consent, GA4 and Search Console, optional Microsoft Clarity heatmaps.
- English only for now; the data model leaves room for more languages later.

## Architecture

Next.js renders every page and talks to one FastAPI service over a versioned REST API; FastAPI is the only thing that touches Postgres, and slow work goes to a background worker.

```text
Visitors and admins --> Cloudflare (DNS, CDN, WAF, Turnstile) --> Next.js 15 frontend (Docker, SSR + ISR, /admin)
                                                                         |
                                                                     REST JSON
                                                                         v
External services <-- calls -- Background worker <-- enqueue -- FastAPI backend (Docker on our server)
(Claude API, Resend,           (ARQ: emails, AI triage,         (auth, content, leads, chat)
 Cal.com, GA4, Slack)           embeddings)                              |
                                 |            |                     SQLAlchemy
                               media        queue                        v
                                 v            v                    PostgreSQL 16 + pgvector
                         Cloudflare R2      Redis                  (Docker volume)
```

Public pages are built at deploy time and refreshed on demand: when an editor publishes in admin, FastAPI calls a Next.js revalidation webhook for the affected paths. Forms and the chat widget call FastAPI directly from the browser through Cloudflare.

**Key decisions**

- **Rendering:** React Server Components fetch from FastAPI at build/revalidate time; client components only for forms, filters, wizard, chat and admin.
- **Types end to end:** FastAPI's OpenAPI schema generates a TypeScript client (`openapi-typescript`), so the frontend never drifts from the API.
- **Auth:** admin only. FastAPI issues short-lived JWT access tokens plus a refresh token in an httpOnly, Secure, SameSite cookie; passwords hashed with Argon2; optional TOTP 2FA.
- **Content format:** rich text stored as TipTap JSON and pre-rendered sanitized HTML.
- **AI:** embeddings of services, case studies and posts stored in pgvector; the chat endpoint retrieves the top matches and streams a Claude answer with server-sent events.

**Repository layout (monorepo)**

```text
ujglobal/
  apps/
    web/                 # Next.js 15 (public site + /admin)
      app/(site)/        # public routes
      app/admin/         # admin routes
      components/  lib/api/ (generated client)
    api/                 # FastAPI
      app/
        main.py
        core/            # config, security, db session
        models/          # SQLAlchemy models
        schemas/         # Pydantic schemas
        routers/         # public, admin, auth, chat
        services/        # email, ai, crm, storage, seo
        workers/         # ARQ tasks
      alembic/  tests/
  infra/                 # docker-compose, Dockerfiles, CI
  .github/workflows/
```

Local development runs everything with `docker compose -f compose.dev.yml up` (web, api, worker, Postgres, Redis, Mailpit for email). The live site uses the root `compose.yml`: one port behind a Caddy gateway, with the server's existing PostgreSQL.

## Data model

About 25 Postgres tables (plus join tables) cover content, leads, users and AI; every table has `id` (UUID), `created_at` and `updated_at`, and content tables add `status`, `published_at` and SEO fields.

**Shared SEO columns** on services, case studies, posts, pages and industries: `slug` (unique), `meta_title`, `meta_description`, `canonical_url`, `og_image_id`, `noindex`.

| Table | Main columns | Relations |
| --- | --- | --- |
| `users` | email, password\_hash, name, role (owner, editor, sales), totp\_secret, is\_active, last\_login\_at | authors posts, owns leads |
| `services` | title, slug, tagline, summary, body (JSON), deliverables (JSON), process\_steps (JSON), tech\_stack (text\[\]), icon, sort\_order, status | many-to-many case\_studies, faqs |
| `case_studies` | title, slug, client\_name, industry\_id, challenge, solution, results (JSON list of metric + label), cover\_image\_id, gallery (uuid\[\]), testimonial\_id, is\_featured, is\_demo, status | services, technologies |
| `technologies` | name, slug, logo\_id, category | case\_studies |
| `industries` | name, slug, description, body | case\_studies |
| `posts` | title, slug, excerpt, content\_json, content\_html, cover\_image\_id, author\_id, category\_id, reading\_minutes, status (draft, scheduled, published), published\_at | tags, category, author |
| `categories`, `tags`, `post_tags` | name, slug | posts |
| `testimonials` | author\_name, author\_title, company, quote, rating, photo\_id | case\_studies, home |
| `team_members` | name, role, bio, photo\_id, linkedin\_url, sort\_order | about page |
| `faqs` | question, answer, scope (global, service) , service\_id | services |
| `jobs` | title, slug, location, type, description, status | job\_applications |
| `job_applications` | job\_id, name, email, phone, cv\_file\_id, cover\_letter, status | jobs |
| `leads` | name, email, phone, company, source (contact, wizard, chat, booking), services (text\[\]), budget\_range, timeline, message, brief (JSON), status (new to won/lost), assignee\_id, ai\_summary, ai\_score, utm (JSON), landing\_page, referrer, ip\_hash, consent | lead\_notes, users |
| `lead_notes` | lead\_id, author\_id, body | leads |
| `subscribers` | email, status, confirmed\_at, source | newsletter |
| `media` | key, url, mime, width, height, size\_bytes, alt\_text, uploaded\_by | referenced by content |
| `redirects` | from\_path, to\_path, code (301/302) | Next.js middleware |
| `settings` | key, value (JSON) | site name, contacts, socials, analytics IDs |
| `content_chunks` | source\_type, source\_id, chunk\_text, embedding (vector(1024)) | AI assistant retrieval |
| `chat_sessions`, `chat_messages` | visitor\_id, lead\_id, role, content, tokens | AI assistant history |
| `audit_log` | user\_id, action, entity, entity\_id, diff (JSON) | admin changes |

Indexes: unique on every `slug`, `(status, published_at)` on posts and case studies, `(status, created_at)` on leads, GIN on `tags` arrays, HNSW on `content_chunks.embedding`. Migrations run with Alembic in CI before each deploy.

## API

FastAPI exposes one versioned REST API at `api.ujglobal.tech/v1`, split into public read endpoints (cached), public write endpoints (rate limited) and admin endpoints (JWT + role checks). Interactive docs live at `/docs` in staging only.

**Public, read (cached at the CDN for 5 minutes, revalidated on publish)**

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/services`, `/services/{slug}` | Service list and detail with FAQs and related work |
| GET | `/case-studies?service=&industry=&tech=&page=` | Filtered portfolio |
| GET | `/case-studies/{slug}` | Case study detail |
| GET | `/posts?category=&tag=&q=&page=` | Blog list with search |
| GET | `/posts/{slug}` | Post with related posts |
| GET | `/testimonials`, `/team`, `/jobs`, `/jobs/{slug}`, `/industries/{slug}` | Supporting content |
| GET | `/settings/public` | Contacts, socials, nav, analytics IDs |
| GET | `/sitemap-entries`, `/redirects` | Data for sitemap.xml and middleware |

**Public, write (Turnstile token required, 5 requests per minute per IP)**

| Method | Path | Does |
| --- | --- | --- |
| POST | `/leads/contact` | Creates a lead from the contact form |
| POST | `/leads/brief` | Creates a lead from the project brief wizard |
| POST | `/subscribe` | Newsletter signup with double opt-in email |
| POST | `/jobs/{slug}/apply` | Application with CV upload (PDF, max 5 MB) |
| POST | `/chat` | AI assistant reply, streamed as server-sent events |
| POST | `/webhooks/cal` | Cal.com booking webhook (signature checked) |

**Auth**

| Method | Path | Does |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` | Session handling |
| POST | `/auth/2fa/setup`, `/auth/2fa/verify` | TOTP |
| POST | `/auth/password/forgot`, `/auth/password/reset` | Password reset |

**Admin (`/admin/...`, role-checked)**

- Full CRUD on `services`, `case-studies`, `posts`, `categories`, `tags`, `testimonials`, `team`, `faqs`, `jobs`, `industries`, `redirects`, `settings`, `users` (owner only).
- `GET /admin/leads` with filters, `PATCH /admin/leads/{id}` (status, assignee), `POST /admin/leads/{id}/notes`, `GET /admin/leads/export.csv`.
- `POST /admin/media/upload-url` (presigned R2 upload) and `POST /admin/media` to register it.
- `POST /admin/ai/seo-suggest` and `POST /admin/ai/outline` for the writing helper.
- `GET /admin/stats` for the dashboard; `POST /admin/revalidate` to force a page refresh.

Errors follow one JSON shape (`{code, message, details}`), lists paginate with `page` and `page_size`, and every write to content records an `audit_log` row.

## SEO

SEO is built into the platform rather than added later: every page is server-rendered with complete metadata, structured data and a fast load, and content is planned around buyer keywords.

**Technical SEO**

- Next.js `generateMetadata` on every route from the admin SEO fields, with sensible fallbacks; canonical URLs; one `h1` per page.
- Dynamic `sitemap.xml` (split by type) and `robots.txt`; `/admin`, search results and previews set to noindex.
- JSON-LD structured data: `Organization` and `WebSite` site-wide, `ProfessionalService` with `areaServed`, `Service` on service pages, `Article` and `BreadcrumbList` on posts, `FAQPage` where FAQs show, `JobPosting` on careers.
- Open Graph and Twitter cards with auto-generated OG images from `/api/og`.
- Core Web Vitals targets: LCP under 2.0 s, CLS under 0.05, INP under 200 ms; `next/image` with AVIF/WebP, `next/font`, minimal client JavaScript.
- Admin-managed 301 redirects served by Next.js middleware; custom 404 with links to services.
- Clean slugs, internal links between services, case studies and posts by shared tags, breadcrumbs.
- Accessibility (alt text required, landmarks, contrast) which also helps rankings.

**Content SEO**

- One pillar page per service targeting its head term (for example "AI integration services", "custom web development company", "mobile app development company").
- Supporting blog clusters of 4 to 6 posts per service linking back to the pillar.
- The market is global, so pages target service and problem keywords rather than cities; location pages can come later if a region starts converting.
- Case studies written around measurable results, which earn links and convert.
- Publishing cadence target: 2 posts per month from launch.

**Measurement**

- Google Search Console and Bing Webmaster Tools verified at launch, sitemap submitted.
- GA4 with conversion events: `lead_submit`, `brief_complete`, `call_booked`, `chat_started`, `newsletter_signup`.
- Google Business Profile for local trust and map results.
- Monthly check of rankings, Core Web Vitals and crawl errors.

## Hosting, deployment and security

Everything runs on your own server as one Docker Compose stack, with Cloudflare's free plan in front for DNS, CDN and DDoS protection. A Linux server with 4 vCPU, 8 GB RAM and 80 GB SSD (Ubuntu 24.04 LTS) is enough for launch; the only paid outside services are email sending and the Claude API, both pay as you go.

| Container | Runs | Notes |
| --- | --- | --- |
| `caddy` | Reverse proxy with automatic HTTPS | Routes `ujglobal.tech` to web and `api.ujglobal.tech` to api; only ports 80 and 443 open |
| `web` | Next.js standalone build | Internal port 9006 |
| `api` | FastAPI on Gunicorn + Uvicorn workers | Internal port 9005 |
| `worker` | ARQ background jobs | Emails, AI triage, embeddings |
| `postgres` | PostgreSQL 16 + pgvector | Data on a named volume; never exposed to the internet |
| `redis` | Redis 7 | Job queue and rate limits |
| Media | Local volume served by Caddy, or Cloudflare R2 | R2 recommended so media and backups also live off the server |
| Outside services | Resend or Postmark (email), Claude API, Cloudflare | Email and AI are the only running costs beyond the server |

**Domains:** `ujglobal.tech` and `www` to your server through Cloudflare (www redirects to apex), `api.ujglobal.tech` to the backend, `staging.ujglobal.tech` for a second Compose stack on the same server with its own database. Email DNS records (SPF, DKIM, DMARC) set on Cloudflare so lead emails land in inboxes.

**Environments:** local (Docker Compose), staging (auto-deploy from `main`), production (deploy on a tagged release or manual approval). Each has its own database and secrets.

**CI/CD (GitHub Actions)**

1. On every pull request: lint (ESLint, Ruff), type check (tsc, mypy), unit tests (Vitest, pytest), API contract check, Playwright smoke tests, Lighthouse CI budget.
2. Build the web and api Docker images and push them to GitHub Container Registry.
3. On merge to `main`: SSH into the server, pull the new images, run Alembic migrations and restart the staging stack.
4. On release: migrate and deploy production, then revalidate the site.

**Security**

- HTTPS everywhere with HSTS; strict Content Security Policy and security headers from Next.js config.
- Argon2 password hashing, short-lived JWTs, httpOnly cookies, CSRF protection on cookie-authenticated admin calls, optional 2FA.
- Pydantic validation on every input, SQLAlchemy parameterised queries, HTML sanitised with `bleach` before storing.
- Turnstile and per-IP rate limits on forms and chat; Cloudflare WAF rules on `/admin` and `/auth`.
- CV uploads checked for type and size, stored privately with signed download links.
- Server hardening: SSH keys only, ufw firewall (22, 80, 443), fail2ban, automatic security updates. Secrets in a server-side .env file, never in the repo; Dependabot for dependency updates.
- Privacy: consent checkbox on forms, cookie banner, IP stored only as a hash, lead deletion on request (GDPR and India DPDP friendly).

**Operations:** Sentry for frontend and backend errors, Better Stack or UptimeRobot for uptime alerts, structured JSON logs, daily pg\_dump backups copied off the server (to R2 or Backblaze) and kept for 14 days with a monthly restore test.

## Milestones

The site goes live as an MVP at the end of week 6 so it can start ranking and collecting leads, then grows in two more phases to a full launch around week 12.

| Phase | Weeks | Main work | Gate to move on |
| --- | --- | --- | --- |
| 0. Discovery + design | 1 to 2 | Brand kit, wireframes, UI design, repo + CI + staging, site copy and demo ideas | Design sign-off |
| 1. MVP build | 3 to 6 | Core pages + admin, FastAPI + Postgres, contact form and leads, SEO basics, deploy | MVP live on ujglobal.tech |
| 2. Content + growth | 7 to 9 | Blog and editor, project brief wizard, Cal.com, newsletter, careers, schema, GA4 | Leads flow end to end |
| 3. AI + polish | 10 to 12 | AI site assistant, AI lead triage, industry pages, speed + security audit | Full launch |

Each gate needs your sign-off before the next phase starts. The timeline assumes site copy and team details are ready in Phase 0, and that 3 to 4 demo projects are built during Phases 1 and 2 to fill the portfolio; late content is the most likely cause of slip.

**Definition of done for each phase**

1. **Discovery + design:** approved sitemap, a new brand kit (logo, colour palette, typography, icon style, social images) and Figma designs for home, service, case study, blog post and contact pages (desktop and mobile); repo with CI and a staging URL.
2. **MVP build:** home, services, work, about, contact and legal pages live on ujglobal.tech; admin can edit services, case studies and see leads; contact form emails the team; sitemap, robots, metadata and Search Console in place; Lighthouse 90+.
3. **Content + growth:** blog with editor and categories, project brief wizard, 3 to 4 demo projects in the portfolio, Cal.com booking, newsletter, careers, JSON-LD on all page types, GA4 conversion events, media library.
4. **AI + polish:** AI assistant grounded in site content, AI lead summaries and scores, admin writing helper, industry pages, Lighthouse 95+, accessibility and security review, backup restore tested.

**After launch (ongoing):** 2 posts per month, one new case study per month, monthly SEO and performance report, conversion tests on service pages, dependency updates.

## Decisions

Sufiyan answered these on 22 Oct 2026, and the rest of this plan has been updated to match.

| Topic | Decision | What changes in the plan |
| --- | --- | --- |
| Target market | Global | English-language site aimed at international buyers; no location pages in v1 |
| Brand assets | None yet, we create them | Phase 0 delivers a brand kit: logo, colour palette, typography, icon style, social images |
| Clients and case studies | No clients yet | Portfolio launches with 3 to 4 in-house demo projects, labelled as demos; testimonials and client logos hidden until real ones exist |
| Pricing | Not shown; visitors contact us | No prices or estimates anywhere; every service ends with "Get a quote" |
| Hosting | Your own server | Everything runs in Docker Compose on your server behind Caddy and Cloudflare |
| CRM | None | Leads live only in Postgres and the admin inbox, with email alerts and CSV export |
| Languages | English only for now | Single locale; schema leaves room to add more later |
| Contact data | Stored in the database | Every form submission is saved to the `leads` table before any email is sent |
| Repository | Create a new GitHub repo | Repo set up at the start of Phase 0 |

## Status

| Date | What happened |
| --- | --- |
| 22 Oct 2026 | Phase 0 scaffold merged in PR #1: Next.js pages (home, services, 7 service pages, about, contact), SEO basics, FastAPI with the core schema and the contact-to-lead endpoint, Alembic migration, Docker Compose, CI |
| 22 Oct 2026 | Phase 1 started. Admin auth API merged in PR #3: Argon2 password hashing, 15-minute JWT access tokens, rotating refresh token in an httpOnly cookie with reuse detection, `/v1/auth/login`, `/refresh`, `/logout`, `/me`, role checks, and a CLI to create admin users (no public sign-up) |
| 22 Oct 2026 | Leads inbox merged in PRs #4 to #6 (#4 into the auth branch, #5 and #6 into `main`), with the admin CLI email check: admin API to list, filter, search and page leads, change status and assignee, add notes and export CSV (owners and sales only); `/admin` login and inbox screens, noindex. Public pages moved into an `app/(site)` route group so the admin has its own layout |
| 22 Oct 2026 | Lead email alerts merged in PR #7: each saved lead queues a job in Redis and the new ARQ `worker` container emails the team over SMTP (Mailpit locally; Resend or Postmark in production, by config only), with Reply-To set to the lead and a link to the inbox. Failed sends retry at 1, 2, 5, 10 and 30 minutes; a sweep every minute re-queues any lead from the past week whose alert never went out (`leads.notified_at`), so Redis or email outages delay alerts but never lose them |
| 22 Oct 2026 | Content backend merged in PR #8: admin API for services and case studies (owners and editors; drafts, publish, slug checks, delete only when unpublished), `audit_log` of every admin change, the 7 services moved from code into the database, public case-study API, and `/work` + `/work/[slug]` pages with every demo clearly labelled. Public pages (home, services, work, sitemap) read the API at request time with a 5-minute cache, and the worker refreshes them within seconds of an edit via `/api/revalidate`; pages already cached keep working if the API is down |
| 23 Oct 2026 | Content editing screens merged in PR #9: `/admin/services` and `/admin/case-studies` list and edit pages (draft or publish, URL from title, rich sections, results, linked services, demo and featured labels, search preview, delete for drafts, unsaved-changes warning, errors shown on the field). Admin menu and landing page now depend on role (owner: all; editor: content; sales: leads). Fixed API CORS so browsers may send `PUT` (saving content would have failed in production) |
| 23 Oct 2026 | Brand kit merged in PR #10: the "Signal" direction chosen from three (Signal, Meridian, Prism): new mark (a U running into a J's hook), Ink / Electric / Signal palette with light and dark themes that pass WCAG AA everywhere (axe-core scan clean), Space Grotesk and Inter, favicon, SVG and Apple icons, a generated 1200×630 share image, theme colour, and the guide in `docs/BRAND.md` |
| 23 Oct 2026 | Legal pages merged in PR #11: privacy, cookie and terms pages written from the site's real data flows (no analytics, so no cookie banner; visitors get no cookies), a required consent tick on the contact form, campaign tags kept to the five utm fields, owner-only lead deletion for privacy requests, nightly deletion of leads with no activity for 24 months (won clients kept) and of dead sign-in sessions, and audit entries for lead changes and notes without any personal data |
| 23 Oct 2026 | Deploy pipeline merged in PR #12: production and staging stacks on one server behind a shared Caddy and Cloudflare (origin certificate, Full strict), images built in CI and pushed to GitHub's registry, staging deployed on every merge to `main`, production deployed from Actions with approval, health-checked deploys with automatic rollback, a one-time Ubuntu/Debian setup script (Docker, `deploy` user, ufw, fail2ban, safe SSH hardening, automatic updates), a Cloudflare-only firewall for ports 80/443, generated `.env` files with random secrets, daily backups kept 14 days plus one before each production deploy, a tested restore, and the step-by-step guide in `docs/DEPLOY.md` |
| 23 Oct 2026 | GitHub publishing switched off in PR #13: CI still tests everything and checks the Docker images build, but no longer pushes images to GitHub's registry or deploys. The site will be deployed to UJ Global's own server and hosting; `docs/DEPLOY.md` is to be rewritten for that |
| 23 Oct 2026 | Front-end redesign step 1, new brand colours, merged in PR #14: "Forest" (option B of three mock-ups) replaces the blue "Signal" palette. Cream page, white cards, pine text, forest-green buttons and an amber accent, in light and dark themes that pass WCAG AA (axe-core scan clean); logo, favicon, Apple icon and share image recoloured; `docs/BRAND.md` updated. Next: the home page rebuild, then the inner pages, motion and content |
| 23 Oct 2026 | Front-end redesign steps 2–5 (home, inner pages, motion, content), merged in PR #15: new home page (animated product preview in the hero, scrolling tools row, tabbed service explorer with an illustration per service, "why us" cards, project cards with covers, clickable process timeline, FAQ, closing call to action); redesigned services overview and service pages, work page with filters and a lead project, project pages, about and contact (interest chips, timeline, pre-selected service, clearer success state); sticky header with a phone menu, dark footer. Illustrations are drawn in code in the brand colours (no stock photos). A migration fills in all 7 service pages and adds 4 labelled demo projects. Scroll fades respect reduced motion. axe-core clean in light and dark; Lighthouse on mobile settings 98–99 performance and 100 accessibility, best practices and SEO (titles and descriptions now always render in `<head>`) |
| 23 Oct 2026 | Security review (doc: UJ Global security review) and fixes for all 12 findings, merged in PR #16: sign-in limits per account and IP with lockout and owner alerts; two-factor sign-in (authenticator app, encrypted secrets, single-use codes, backup codes) required for owners and sales; contact form limit per IP, optional Cloudflare Turnstile, hourly cap on alert emails; strict Content Security Policy with per-request nonces; verified client IP from Caddy only; website gets its own settings file without API secrets; API schema hidden outside local; 64 KB request cap; encrypted off-server backups only; patched PostCSS (0 known vulnerabilities in production dependencies) |
| 23 Oct 2026 | Ports changed (PR #17): the API now listens on 9005 and the website on 9006 everywhere (local development, Docker images, compose files, Caddy routes, generated settings); the website's default API address and the API's default CORS origin follow |
| 23 Oct 2026 | Single-port deploy: the root `compose.yml` is now the live site behind one port (9005), for hosting panels that map a domain to a single port, and it uses the server's existing PostgreSQL (no Postgres container, nothing on port 5432; local development moved to `compose.dev.yml` with host ports bound to localhost); a Caddy gateway sends `/v1/*` and `/health` to the API and the rest to the website on the same domain, blocks the internal cache-refresh endpoint, caps API bodies at 64 KB and passes the verified visitor IP. Images are built on the server; guide in `docs/DEPLOY-SINGLE-PORT.md` |
| 23 Oct 2026 | Two settings files: `.env.production` (live site, `docker compose up`) and `.env.local` (development, `docker compose -f compose.dev.yml up`), each with a committed example; the stacks moved to `infra/compose.live.yml` and `infra/compose.local.yml`. The API now creates its database on start if it's missing (and the database user too, given `DATABASE_ADMIN_URL`) before running migrations. `DATABASE_URL` has no default anywhere: without it the API, worker and bootstrap refuse to start with a clear message; `postgres://` URLs are accepted |
| 23 Oct 2026 | Light theme by default with a light/dark toggle in the site and admin headers (remembered per device, applied before first paint, no longer following the device setting); the hero's chat preview is replaced by a website-and-phone-app picture; pages run full width, edge to edge, with side padding of 16/24/40/56 px by screen size; fixed the development hydration warning on the CSP nonce script |

**Next in Phase 1:** go live by following `docs/DEPLOY.md` (server, Cloudflare, email provider, GitHub settings), then replace the demo projects with real ones as they come in. Needed before deploying: the server's OS, whether Docker is installed, the email provider (Resend or Postmark) with ujglobal.tech verified for sending, which addresses get lead alerts, the company details for the legal pages (legal name, registered address, governing law and courts, server country; placeholders in `apps/web/src/lib/site.ts`) and a review of those pages by someone qualified, and Cloudflare's security check passage set to 30 minutes (the cookie policy says so).
