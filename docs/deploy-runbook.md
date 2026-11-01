# Deploy runbook: TourGraph on Cloudflare

**Last Updated:** November 1, 2026
**Replaces:** `deployment/` (nginx, PM2, droplet scripts). Design: [cloudflare-architecture.md](cloudflare-architecture.md).

---

## What lives where

| Thing | Where |
|---|---|
| Cloudflare account | OmSpark, `58ada9261161c4454f308218ac672f8c` (nikhil@omspark.com), Workers Paid |
| Worker | `tourgraph`. Code in `web/` (Next.js site plus `src/server/` API), config `web/wrangler.jsonc`, entry `web/worker.ts` |
| Addresses | `tourgraph.ai` and `www.tourgraph.ai` (custom domains since Nov 1, 2026; www redirects to the apex). The workers.dev address is off |
| Database | D1 `tourgraph-db` (`8c7d8475-0130-4e69-8f5d-679d2f4305e4`, WNAM), schema in `web/migrations/`. Source of truth for the data: `data/tourgraph.db` (Git LFS) |
| Rate limit | `ROULETTE_LIMITER` binding: 30 roulette hands per 10 s per IP |
| Secrets | None in the Worker |
| Deploy token | `~/.secrets/cloudflare/tourgraph.env` (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), chmod 600, never in the repo or chat. Permissions: Workers Scripts, D1, R2, KV edit; Account Settings and Workers Tail read; User Details and Memberships read; for the tourgraph.ai zone only: Workers Routes, DNS and Zone Settings edit, Zone read. The Mac's default wrangler login is ParkPro's and is never used here |
| DNS | Zone `tourgraph.ai` (`469a0e4098c091802005894df6c9cd25`) on the same account. It also carries Microsoft 365 mail: MX, SPF TXT, `autodiscover`, `enterpriseenrollment`, `enterpriseregistration` CNAMEs, a Google verification TXT, and since Nov 1, 2026 a DMARC TXT (`_dmarc`, `p=none`). Never touch those. DKIM is not set up yet (NOW.md) |

To run wrangler by hand from `web/`:

```bash
set -a; . ~/.secrets/cloudflare/tourgraph.env; set +a
npx wrangler whoami        # must say Nikhil@omspark.com's Account
```

---

## Deploy

From `web/`:

```bash
npm test                                   # 48 tests in the Workers runtime
node scripts/deploy.mjs                    # tests, clean build, bundle check, wrangler deploy
node scripts/verify.mjs                    # live checks on tourgraph.ai (add --base <url> for another address)
```

`deploy.mjs` builds in a copy of `web/` made from files git tracks or would track, because OpenNext bakes any `.env` file into the Worker and `web/.env` holds the data pipeline's Viator and Anthropic keys. After the build it refuses to deploy if any of those key names or any `.env` file appears in the output. Options: `--dry-run` (build and check, no upload), `--skip-tests`, `--local` (serve the build on http://localhost:8787 against the local D1).

**Rollback a bad deploy:** `npx wrangler rollback` (or pick a version under Workers & Pages > tourgraph > Deployments).

Other checks, from `web/`:

```bash
node scripts/contract-diff.mjs --old <url> --new <url>      # API on two deployments, read-only
node scripts/loadtest.mjs --base <url> --n 400               # page renders; watch with npx wrangler tail tourgraph --format json
cd scripts/walk && npm install && cd ../..                   # once
node scripts/walk/walk.mjs --base https://tourgraph.ai       # headless Chrome, desktop and phone
```

Run the load test after any Next.js or OpenNext upgrade: OpenNext issue #1381 (pages failing with error 1102 after many renders per isolate) did not show on Nov 1, 2026 with Next 16.4.3 and OpenNext 1.20.15, but it is still open upstream.

---

## Local development

From `web/`:

```bash
npx wrangler d1 migrations apply tourgraph-db --local
node scripts/d1-load.mjs --local          # full data into the local D1, about 30 s, then a fingerprint check
npm run preview                           # the real Worker build on :8787: pages and API
npm run dev                               # next dev on :3000 with the local D1: pages only
```

`next dev` renders every page (server components call the API in-process), but `/api/v1/*` is routed by `worker.ts`, not Next.js, so the browser's roulette call gets a 404 there. Use `npm run preview` to try the whole site.

After changing `wrangler.jsonc` bindings, run `npm run cf-typegen` to refresh `worker-configuration.d.ts`.

Tests use their own small slice of the data (`test/fixtures/seed.json`). Rebuild it with `node scripts/d1-load.mjs --fixture` if the schema changes.

---

## Data

The data is frozen; nothing refreshes it. If it ever changes:

1. Run the pipeline on the Mac (`data/scripts/README.md`); it writes `data/tourgraph.db`.
2. Empty the five API tables in D1 (`DELETE FROM` each of `tours`, `six_degrees_chains`, `trivia_pool`, `trivia_daily`, `trivia_scores`; trivia rows written by visitors are lost unless exported first).
3. `node scripts/d1-load.mjs --remote` loads, runs `PRAGMA optimize`, and checks every table's fingerprint against the source. It refuses to run if a table is not empty.

Schema changes: add `web/migrations/000N_name.sql`, then `npx wrangler d1 migrations apply tourgraph-db --remote` before deploying code that needs it.

**Bad data:** `npx wrangler d1 time-travel restore tourgraph-db --timestamp=<before the problem>` (any minute in the last 30 days).

---

## Watching

- Request logs: `npx wrangler tail tourgraph` or Workers Logs in the dashboard (observability is on).
- Traffic: Workers & Pages > tourgraph > Metrics shows requests, errors and CPU time per day. This is the answer to "does anybody use the site" without any analytics script.
- D1: Storage & Databases > D1 > tourgraph-db shows rows read and written. Paid includes 25 billion reads a month.
- Errors are logged as `<label>: <message> | cause: <cause>` (`logError` in `src/server/api/env.ts`).
- Seen once, Nov 1, 2026 02:30 ET on workers.dev: D1 queries failed for about half a second (6 requests got 500; the route's error body, e.g. `{"error": "Failed to fetch tour"}`), then recovered on their own. Nothing else touched the database at the time, and more than 4,000 other requests that night had no errors. The D1 message was not logged then (fixed since). If it recurs, read the message in Workers Logs before changing code.
- Known noise: "Failed to load dynamic font for ★" on roulette OG images. The default font has no star glyph; the image still renders, with a box where the star goes (same as on the droplet).

---

## Switchover (done Nov 1, 2026, 02:38 ET)

Both hostnames became custom domains of the Worker. Cloudflare would not replace the droplet's DNS-only A records in place (code 100117), so a script deleted each record and attached the domain right after: 484 ms for www, 451 ms for the apex. Cloudflare created proxied `AAAA 100::` records and a certificate for `tourgraph.ai` and `*.tourgraph.ai`. The six mail records did not change. Zone settings changed the same night: Always Use HTTPS on, Email Obfuscation off, minimum TLS 1.2. Details: [cloudflare-architecture.md section 9](cloudflare-architecture.md#9-switchover-and-rollback).

## Rollback

1. **Bad code:** `npx wrangler rollback` (or pick an earlier version under Workers & Pages > tourgraph > Deployments).
2. **Bad data:** `npx wrangler d1 time-travel restore tourgraph-db --timestamp=<before the problem>`.
3. **Back to the droplet** (only while it exists, and only until its certificate expires on Nov 27, 2026 08:23 GMT): remove the `routes` from `wrangler.jsonc`, detach both custom domains (Workers & Pages > tourgraph > Settings > Domains), then recreate `A tourgraph.ai 143.244.186.165` and `A www.tourgraph.ai 143.244.186.165`, DNS only, TTL auto. A JSON and BIND export of the zone from before the switchover were taken; the records are listed in section "What lives where".
4. If the custom domains ever have to be detached, remove their routes from `wrangler.jsonc` first, or the next deploy takes the hostnames back.
