# Architecture: TourGraph on Cloudflare

**Status:** built Nov 1, 2026 on branch `cloudflare-move` (task #399, the move off DigitalOcean).
**Decided by Nikhil, Oct 31 and Nov 1:** move to the OmSpark Cloudflare account to retire the $6 droplet; straight move first (same pages, same URLs, same API); TourGraph gets its own Cloudflare token. The iOS and Android apps were never published and the data is frozen, so nothing outside this repo calls the API.
**Reviews:** inventory `docs/reviews/2026-11-01-inventory.md`, research `docs/reviews/2026-11-01-research-cloudflare.md`, independent review `docs/reviews/2026-11-01-review.md`.
**Runbook:** [deploy-runbook.md](deploy-runbook.md).

---

## 1. What changes

| Droplet (until Nov 2026) | Cloudflare |
|---|---|
| nginx: TLS, www and http redirects, `/api/v1` vs pages, `/api/ios` rewrites, GeoIP2 country, HSTS | One Worker, `tourgraph`. `src/server/route.ts` does the redirects and the routing; Cloudflare does TLS; `request.cf.country` replaces GeoIP2 |
| Express 5 API on :3001 (`backend/`) | The same routes on Hono in the same Worker (`web/src/server/api/`) |
| Next.js 16.1 on :3000 calling the API over localhost HTTP | Next.js 16.4.3 built with OpenNext; pages call the API in-process |
| SQLite file (507 MB) copied up with scp | D1 `tourgraph-db` (493 MB), the five tables the API reads |
| Next image optimizer | Images served as they are from TripAdvisor's CDN (already 720x480) |
| PM2, UFW, fail2ban, Let's Encrypt | Nothing to patch; Cloudflare edge certificate |

Cost: covered by Workers Paid, which the account already pays ($5 a month for all Workers). No R2, KV or Cloudflare Images.

## 2. The parts

```
browser ──HTTPS──> tourgraph.ai, www.tourgraph.ai   (Worker "tourgraph", custom domains)
                     │
                     ├─ static files (/_next/static, logo, social card): assets binding,
                     │    headers from public/_headers
                     └─ worker.ts → src/server/route.ts
                          ├─ www.*            301 to https://tourgraph.ai
                          ├─ http://          301 to https
                          ├─ /api/v1/*, /api/ios/*   Hono API ──> D1 "tourgraph-db"
                          │                                   └─> ROULETTE_LIMITER (30 per 10 s per IP)
                          └─ everything else  Next.js (OpenNext) ──in-process──> Hono API
```

- **One Worker.** The research suggested two (API and site joined by a service binding) to keep the mobile API away from OpenNext bug #1381. With no published apps, the only API caller outside the site is the roulette button, which needs the site anyway. One Worker means one deploy and no extra hop. The load test (section 8) is the gate for #1381.
- **In-process API calls.** `web/src/lib/api.ts` builds a Request and hands it to `api.fetch()` with the Worker's bindings. Pages get exactly the JSON the public endpoints return. Each call starts with `await connection()`, so pages still render per request: before, the `fetch(..., { cache: "no-store" })` did that implicitly, and without it Next pre-rendered the homepage at build time.
- **Bindings** (`web/wrangler.jsonc`): `DB` (D1), `ROULETTE_LIMITER` (Rate Limiting), `ASSETS`. No secrets and no environment variables: the Worker needs no keys.
- **Flags:** `nodejs_compat`, `global_fetch_strictly_public`; compatibility date 2026-10-20.

## 3. API contract

Kept exactly: every path, method, status code, `{"error": ...}` body, JSON field name and type, the per-route `Cache-Control`, open CORS (`Access-Control-Allow-Origin: *`, 204 preflights), and the two `/api/ios` aliases (`/api/ios/tour/:id` to `/api/v1/tours/:id/enrichment`, `/api/ios/tours/batch` to `/api/v1/tours/batch`). Checked by `web/scripts/contract-diff.mjs`: 177 of 177 comparisons match between the droplet and the Worker on production data (Nov 1, 2026).

Deliberate differences (none visible to the site):

| Before | Now | Why |
|---|---|---|
| Unknown `/api/v1` path: Express HTML 404 | `{"error": "Not found"}` 404 | JSON API |
| POST with a body that is not JSON: 500 | 400 with the route's usual message | inventory O13 |
| `/trivia/results?date=garbage` assembled a garbage day (and used up questions) | 400 `{"error": "Invalid date"}` | inventory O6 |
| Two first requests of a day could get different trivia sets | Both get the set that was saved; only that set is marked used | D1 runs statements concurrently (inventory 3.3) |
| Duplicate score check was SELECT then INSERT | Unique index on (date, session_hash), `INSERT OR IGNORE`, 409 when nothing was saved | same |
| Country from nginx GeoIP2 | `request.cf.country`; `XX` (unknown) and `T1` (Tor) stored as NULL | Cloudflare equivalent |
| Roulette rate limit: in-process map, 30 per 10 s per IP | Rate Limiting binding, same numbers, approximate and per Cloudflare location | no shared memory on Workers |
| `X-Powered-By: Express`, Express ETags | Hono weak ETags, no X-Powered-By | nothing depends on them |
| `/health` `uptime`: process uptime | seconds since this isolate started | no long-lived process |

D1-specific changes inside the routes:

- **Bound parameters.** D1 allows 100 per query; roulette could bind 221. Lists of ids now go in as one JSON parameter (`id NOT IN (SELECT value FROM json_each(?))`), in roulette, batch enrichment, trivia and practice.
- **Roulette.** The random pick runs on a covering index (`weight_category, status`) and reads only the chosen rows; each category's picks are shuffled so the order matches `ORDER BY RANDOM()`. The seven category queries run as one batch (categories are disjoint, so they can't collide).
- **Right Now.** One random tour per time zone, queried 25 time zones per batch until `count` are found. Same result as the one-at-a-time loop, fewer round trips. Duplicate time zones in the request are dropped.
- **Per-isolate memo** (`env.ts` `remember`, one hour): `/health` count, `/stats`, the time zone list, chain count and slugs, and the six top-10 superlative candidate lists. The data is frozen. Each superlative request still picks one of the ten at random.

## 4. Data

- **D1 `tourgraph-db`** (`8c7d8475-0130-4e69-8f5d-679d2f4305e4`, location WNAM). Tables: `tours` (all 136,303 rows and all 29 columns; the 47 inactive tours are still reachable through `/tours/:id`), `six_degrees_chains`, `trivia_pool`, `trivia_daily`, `trivia_scores`. The pipeline-only tables (`destinations`, `city_profiles`, `city_readings`, `indexer_state`, `superlatives`) stay in `data/tourgraph.db` (Git LFS), which remains the source of truth.
- **Schema:** `web/migrations/0001_schema.sql`, copied from the source file. Changes: indexes added on `duration_minutes` and `review_count` and `(weight_category, status)`; three unused indexes left out; a unique index for trivia scores.
- **Planner statistics.** The source file has none, so SQLite scanned the whole 454 MB `tours` table through the status index for every roulette and superlative query. That is the main reason the droplet took 13 to 21 s per homepage. After the load, `PRAGMA optimize=0x10002` runs ANALYZE. On D1 the longest-tour superlative now reads 10 rows in 0.4 ms.
- **Load and proof:** `web/scripts/d1-load.mjs` opens the source read-only, writes multi-row INSERTs of at most 90 KB (D1's limit is 100 KB per statement) in 40 MB files, loads them with `wrangler d1 execute --file`, runs the optimize, then compares a fingerprint of every table between the source and D1: row count, and per column the non-null count, text count, total text length, numeric sum, and the code points of the first, middle and last characters. Production load on Nov 1: 9 files, about 2 minutes, every table matches.
- **Trivia state starts empty.** The droplet's trivia rows (from iOS testing in March, if any) were not copied. Nobody uses trivia.
- **Refreshing the data** (none planned): run the pipeline on the Mac, empty the five tables, re-run `d1-load.mjs --remote`. D1 Time Travel can restore any minute of the last 30 days.

## 5. The site

- **Build:** `opennextjs-cloudflare build` with an empty `open-next.config.ts` (no incremental cache: every data page renders per request). The route table is the same as before: `/story`, `/privacy`, `/support`, `/robots.txt` and the icons are static, everything else dynamic.
- **Bundle:** 8.3 MB, 2.1 MB gzipped. Workers allow 64 MB.
- **Images:** `images.unoptimized: true`. Pages point at TripAdvisor's CDN URLs, which the CSP already allows. Avoids Cloudflare Images billing per transformation.
- **Headers:** `next.config.ts` `headers()` covers pages, OG images and the sitemap, unchanged. API responses get HSTS and `nosniff` in `route.ts`. Static files served straight from the asset store get the same set from `public/_headers`.
- **Secrets never reach the bundle.** `web/.env` and `web/.env.local` hold the data pipeline's Viator and Anthropic keys (`data/lib/env.ts` reads them there), and OpenNext bakes any `.env` file into the Worker. `web/scripts/deploy.mjs` therefore builds in a copy of `web/` made of files git tracks or would track, then scans the output and refuses to deploy if any key name or `.env` file shows up.
- **Google Analytics:** unchanged. `layout.tsx` loads GA4, and the CSP blocks it, as it has since June 2026. The privacy page says "No analytics, no tracking", so turning GA on is Nikhil's call (see section 10).

## 6. Behaviors replaced

| nginx (inventory 6.1) | Now |
|---|---|
| N1 http to https, N2 www to apex (301, path and query kept) | `route.ts` |
| N4 HSTS on every response | Next headers on pages, `route.ts` on API, `_headers` on static files |
| N5 gzip | Cloudflare compresses automatically |
| N6 1 MB body cap | 100 KB on the API (Express's own JSON limit, the one that applied) |
| N7, N8 routing and `/api/ios` rewrites | `route.ts`, `app.ts` |
| N9 GeoIP2 country | `request.cf.country` |
| N11 upstream timeouts | Worker CPU and D1 limits |
| N13 ACME challenge | not needed |

## 7. Security

- No secrets in the Worker. The deploy token lives in `~/.secrets/cloudflare/tourgraph.env` (chmod 600) with 12 permissions, scoped to the OmSpark account and the `tourgraph.ai` zone. The Mac's default wrangler login (ParkPro) is never used.
- The DNS zone also carries Microsoft 365 mail for tourgraph.ai (MX, SPF, autodiscover and two enrollment CNAMEs, a site verification TXT). The switchover touches only the apex and `www` A records.

## 8. Testing

- **Unit tests** (`web/test/`, `npm test`): 48 tests run the API and the routing in the Workers runtime against a local D1 seeded from a slice of the real data (`test/fixtures/seed.json`, made by `d1-load.mjs --fixture`). They cover every route's status codes, bodies and headers, the 200-id exclude list, the rate limit path, both race fixes, the redirects and the API vs pages split.
- **Contract diff** (`scripts/contract-diff.mjs --old <url> --new <url>`): 177 read-only comparisons against the droplet.
- **Live checks** (`scripts/verify.mjs [--base <url>]`): 35 checks after each deploy, plus the redirects on tourgraph.ai.
- **Load test** (`scripts/loadtest.mjs`): the gate for OpenNext #1381 (pages failing with 1102 after about 120 renders per isolate), run with `wrangler tail` watching each request's outcome. Results are in the runbook.

## 9. Switchover and rollback

Switchover (Nov 1, 2026, on Nikhil's written OK in chat):

1. Load test and live checks pass on `workers.dev`.
2. Delete the two DNS-only A records (`tourgraph.ai`, `www.tourgraph.ai`, both 143.244.186.165). A non-interactive deploy would otherwise overwrite them without asking.
3. Attach both hostnames to the Worker as custom domains (Cloudflare creates proxied records and the certificate), and add them to `wrangler.jsonc` so later deploys keep them.
4. Run `verify.mjs` on tourgraph.ai, including the redirects. Check the six mail records are unchanged.
5. Turn off `workers_dev` so tourgraph.ai is the only address.

Rollback while the droplet exists: remove the custom domain routes from `wrangler.jsonc`, detach the domains, recreate the two A records to 143.244.186.165 (DNS only). After the droplet is deleted: `npx wrangler rollback` for code, D1 Time Travel for data.

## 10. Decisions

| # | Decision | Ruling |
|---|---|---|
| 1 | Platform | Cloudflare Workers, OmSpark account (Nikhil). |
| 2 | Scope | Straight move (Nikhil). Fixed on the way: the D1 changes in section 3, and three small bugs from the inventory: the site-wide canonical tag (O14), the Six Degrees share link (O11), unencoded time zones (O12). |
| 3 | Token | TourGraph's own token, not Recurate's (Nikhil). |
| 4 | Workers | One, not two (Claude, section 2). |
| 5 | Adapter | OpenNext 1.20.15. Cloudflare now points new Next.js apps at vinext; OpenNext is documented as supported and built this app on the first try. |
| 6 | Router | Hono, as in Recurate. |
| 7 | Data | D1 with the API's five tables; all columns kept, since the unused ones are small. |
| 8 | Images | Unoptimized, no Cloudflare Images. |
| 9 | Rate limit | Rate Limiting binding with the old numbers. |
| 10 | Google Analytics | Not turned on. Nikhil asked for the GA fix before the inventory found that the privacy page promises no analytics and the product's rules say no cookies. Left blocked as it was; Nikhil decides. |
| 11 | Trivia rows on the droplet | Not copied. |

## 11. Known and left alone

From the inventory, not changed in the move: trivia options reveal the answer through `tourId` on the correct option (O7); `/trivia/results` shows answers for today without a completion check (O9); pages without catch blocks show the error page if the API fails (O2); the worlds-most OG image picks its own random tour (O15); pages whose openGraph has no image (O16); stale numbers in copy (O17); `highlights` always empty (O18); POST `/tours/batch` sends a public Cache-Control and returns rows in id order (O19); unused API surface kept (O20); OG images are not cached (O23); the ★ in roulette OG images renders as a box (the font has no star; same on the droplet).
