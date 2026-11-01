# Cloudflare research for the TourGraph Worker move

**Checked on 2026-11-01.** Every fact below was checked that day against the source named next to it.

**How it was checked.** Cloudflare docs (developers.cloudflare.com, read as `index.md`), OpenNext docs (opennext.js.org), GitHub issues and releases, `npm view`, and the published package code of `@opennextjs/cloudflare@1.20.15`, `@opennextjs/aws@4.1.14` and `wrangler@4.156.0`. Some answers were also tested on this Mac in scratch folders under `/private/tmp/claude-501/research-cf/`: a local D1 import of a copy of `data/tourgraph.db`, and an OpenNext build plus local preview of a copy of `web/` taken from `git archive HEAD`. No Cloudflare account was used. No repo file other than this one was changed.

**Labels.** Each answer carries one:
- **[Docs]** official Cloudflare or OpenNext documentation.
- **[Source]** read in the published package code.
- **[Issue]** a GitHub issue or release note.
- **[Tested]** reproduced locally on Nov 1 (Node 26.12.1, npm 11.20.0, macOS).
- **[Inference]** my reasoning; not stated anywhere.

**Notation.** To keep this file free of double hyphens, command line flags are written without their leading dashes, in code style: "flag `remote`" means the double-dash remote flag. Single-dash flags such as sqlite3's `-escape off` are written as is.

## 0. Findings that shape the design

1. **Next.js must be 16.4.1 or later.** `@opennextjs/cloudflare@1.20.15` declares peer `next: ">=15.5.28 <16 || >=16.4.1"`. The committed lockfile has Next 16.1.6, so npm will refuse the install until Next is bumped. The floor follows the Next.js security update of Oct 14, 2026. A copy of the web app built cleanly with Next 16.4.3 and Turbopack. [npm view, Issue, Tested]
2. **An open OpenNext bug hits apps like TourGraph.** Issue #1381: `force-dynamic` App Router pages start failing with error 1102 (`exceededCpu`) after about 120 renders per isolate, and get worse until the isolate is replaced. Route handlers without React rendering stay clean. It is reported on Workers Paid, Next 16.2 to 16.4.3, adapter 1.19 to 1.20.13, and is still open. Most TourGraph pages are `force-dynamic`. This needs a load test on `workers.dev` before switchover, and it is a reason to keep the mobile API out of the Next.js Worker. [Issue]
3. **The Worker size limit is no longer a concern.** The only limit now is 64 MiB uncompressed on every plan; the compressed limit was removed (changelog dated 2026-09-04). OpenNext's docs still quote the old 10 MiB compressed limit. The TourGraph web bundle measured 7,881 KiB uncompressed, 1,963 KiB gzip. [Docs, Tested]
4. **A default macOS dump will not import into D1.** sqlite3 3.54 writes `unistr()` into 89,148 of 144,247 dump lines, and D1 rejects `unistr()`, `PRAGMA writable_schema` and `CREATE TABLE sqlite_sequence`. A cleaned dump made with `-escape off` imported locally in 41 seconds with matching row counts. The largest statement is 74,141 bytes, under the 100 KB limit. [Tested]
5. **D1 allows 100 bound parameters per query; roulette sends up to 220.** `roulette.ts` builds `id NOT IN (?, ?, ...)` from up to 200 client ids plus the hand so far. Passing one JSON parameter to `json_each` works in D1 instead. [Docs, Tested]
6. **`ORDER BY RANDOM()` is cheap in money but slow and serial.** One roulette hand scans about 136,000 rows (every category once). Billing is negligible, but the queries take about 80 ms of SQL per hand locally, on a database that runs one query at a time. An indexed random key column reads about 3 rows in under 1 ms. [Docs, Tested]
7. **Do not bind Cloudflare Images.** Without the binding, OpenNext returns the original image. With it, every distinct tour photo at every width is a billable unique transformation. Setting `images.unoptimized` lets browsers load the 720x480 TripAdvisor CDN photos directly. [Source, Docs, Inference]
8. **No R2, KV, queue or tag cache is needed.** With no cache configured, OpenNext uses a "dummy" cache that always misses, so prerendered pages are simply rendered on demand. Tested: `/privacy` served 200 with `x-nextjs-cache: MISS`. [Docs, Source, Tested]
9. **Country comes from `request.cf.country`.** In OpenNext, `getCloudflareContext().cf` is the incoming `request.cf`. It returned `US` in a local route handler. [Docs, Source, Tested]
10. **Attaching the custom domain over the existing A records needs care.** Docs say nothing about A records. Wrangler's source shows that a non-interactive `wrangler deploy` overrides conflicting DNS records without asking. Delete the two A records first, then attach. Cloudflare's edge already holds a Universal SSL certificate for `tourgraph.ai` and `*.tourgraph.ai`. [Docs, Source, Tested]
11. **Security headers from `next.config.ts` do not reach static files.** OpenNext applies `headers()` to Worker responses (tested), but `/_next/static/*` and `public/` files bypass the Worker and get only `Cache-Control: public, max-age=0, must-revalidate`. A `public/_headers` file is needed. [Docs, Tested]
12. **The Express API cannot move as is.** `better-sqlite3` is native and synchronous; every query becomes an awaited D1 call. A module-level `setInterval` in `roulette.ts` would throw at startup ("Disallowed operation called within global scope"). The nginx `/api/ios/*` rewrites must move into the Worker. [Docs, Inference]
13. **Pre-existing, not caused by the move:** the live CSP blocks the GA4 script added in commit `a9fe9d0`. Live HTML loads `https://www.googletagmanager.com/gtag/js`, but the live `script-src` is `'self' 'unsafe-inline'`. [Tested against tourgraph.ai, Inference]

## 1. Next.js on Workers through OpenNext

| Question | Answer | Source | Label |
|-|-|-|-|
| Latest version | `@opennextjs/cloudflare` **1.20.15**, published 2026-10-30. Only dist-tag is `latest`. Depends on `@opennextjs/aws` 4.1.14. | `npm view @opennextjs/cloudflare version peerDependencies dist-tags`; https://github.com/opennextjs/opennextjs-cloudflare/releases | npm, Issue |
| Peer dependencies | `next: ">=15.5.28 <16 \|\| >=16.4.1"`, `wrangler: "^4.148.0"`, `rclone.js: "^0.6.6"` | npm view | npm |
| Next.js 16 supported? | Yes, but only 16.4.1 and later per the peer range. The OpenNext page says "All minor and patch versions of Next.js 16 ... are supported"; the package is stricter. Release 1.20.12 (Oct 15) added Next 16.4 support and bumped Next "following the Next.js security update on Oct 14". Latest Next is 16.4.3. Committed lockfile: 16.1.6. The working tree currently shows an uncommitted bump to 16.4.3 from another session. | https://opennext.js.org/cloudflare ; release notes for 1.20.12 | Docs, Issue |
| Does the build run? | Yes. A copy of committed `web/` with Next 16.4.3, React 19.2.4, OpenNext 1.20.15 and wrangler 4.156.0 built in about 7 s with Turbopack on Node 26.12.1. Only warning: Node's `DEP0205 module.register()` deprecation. | local build | Tested |
| Runtime | Node.js runtime only. Remove any `export const runtime = "edge"`. TourGraph's OG routes already use `runtime = "nodejs"`. Node middleware (`proxy.ts`) is experimental; TourGraph has none. | https://opennext.js.org/cloudflare/get-started ; build log text "Node.js middleware support is experimental" | Docs, Source |
| Wrangler version | Peer `^4.148.0`. The CLI warns that Next 16.1+ needs wrangler 4.59.2 or later (a workerd `setImmediate` fix). The docs line "Wrangler 3.99.0 or later" is stale. | `dist/cli/utils/nextjs-support.js` | Source, Docs |
| Compatibility date and flags | OpenNext docs: `compatibility_date` 2024-09-23 or later, `nodejs_compat` required, `global_fetch_strictly_public` in the example. A date of 2025-05-05 or later is needed for `FinalizationRegistry`. From 2026-08-04, `nodejs_compat` and `nodejs_compat_v2` are on by default; keeping the flag listed is harmless ("Existing projects do not need to remove these flags"). Tested with date 2026-10-30 and both flags. | https://opennext.js.org/cloudflare/get-started ; https://opennext.js.org/cloudflare/troubleshooting ; https://developers.cloudflare.com/workers/runtime-apis/nodejs/ | Docs, Tested |
| Bundle size limit vs a real bundle | Limit: **64 MiB uncompressed, all plans; "There is no compressed size limit."** (limits page updated Oct 29, 2026; changelog 2026-09-04). TourGraph measured with `wrangler deploy` flags `dry-run` and `outdir`: **Total Upload 7,881.49 KiB / gzip 1,963.49 KiB**, 24 static asset files (864 KB). Other limits that matter: 1 s startup, 128 MB memory per isolate, CPU 30 s default on Paid. OpenNext's troubleshooting page still quotes 3 MiB / 10 MiB compressed. | https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/ | Docs, Tested |
| `next/og` `ImageResponse` | Works. OpenNext swaps in the edge build of `@vercel/og`, bundles `resvg.wasm` (1.38 MB, 529 KB gzip) and `yoga.wasm` (72 KB, needed from Next 16.2), and turns the fallback font (Geist Regular, 126 KB) into a `.bin` import. A test route with a remote TripAdvisor photo rendered a 1200x630 PNG in 0.44 s in local workerd (1.17 MB PNG). `fontFamily: "system-ui"` has no system fonts in Satori and falls back to the bundled font, as on the droplet today. | `dist/cli/build/patches/ast/patch-vercel-og-library.js`; local preview | Source, Tested, Inference |
| `next/image` | The IMAGES binding is optional. Source comment: "Image optimization is disabled and the original image is returned if `env.IMAGES` is undefined." The original is still proxied through the Worker at `/_next/image`. With the binding, optimization is billed as Images Transformed: 5,000 unique transformations a month included, then **$0.50 per 1,000**; on the free Images plan, new transformations past 5,000 fail with error `9422`. A unique transformation is one source image plus one parameter set per calendar month. Open issue #1125 reports high CPU from the binding. | `dist/cli/templates/images.js`; https://opennext.js.org/cloudflare/howtos/image ; https://developers.cloudflare.com/images/pricing/ ; issue #1125 | Source, Docs, Issue |
| `next/image` cost for TourGraph | 136,301 tours each have their own 720x480 JPEG on `media-cdn.tripadvisor.com`. Roulette is random, so most views hit a new source image, and each requested width is a new transformation. For example, 20,000 distinct photo and width pairs in a month would cost about $7.50, more than the droplet. Recommendation: set `images: { unoptimized: true }`. The CSP `img-src` already allows `https://*.tripadvisor.com`. | `data/tourgraph.db` (read only) | Inference |
| Incremental cache / ISR | Not required. "SSR route will work out of the box without any caching config." With nothing configured, OpenNext resolves the incremental cache, tag cache and queue to `"dummy"`, whose `get` throws an ignorable error, so every read is a miss. A queue is only needed for time-based revalidation; a tag cache only with `revalidateTag` or `revalidatePath`. TourGraph's build marks `/privacy`, `/story`, `/support`, robots and icons as static; everything else is dynamic. Locally, `/privacy` was served with `x-nextjs-cache: MISS`. Avoid `staticAssetsIncrementalCache` for now: open issue #1454 says prerendered dynamic routes return 404 with Next 15.5.27 and later. | https://opennext.js.org/cloudflare/caching ; `dist/api/config.js`; `@opennextjs/aws` `overrides/incrementalCache/dummy.js`; issue #1454 | Docs, Source, Tested, Issue |
| Reading bindings | `import { getCloudflareContext } from "@opennextjs/cloudflare"`. Sync: `getCloudflareContext().env.DB` inside a request. Async: `await getCloudflareContext({ async: true })`, required in SSG routes; sync mode throws during static generation or at module top level. Returns `{ env, cf, ctx }`, set per request by `cloudflareContextALS.run({ env, ctx, cf: request.cf }, ...)`. | https://opennext.js.org/cloudflare/bindings ; `dist/api/cloudflare-context.js`; `dist/cli/templates/init.js` | Docs, Source, Tested |
| Custom Worker entry | Documented. Create e.g. `custom-worker.ts`, `import { default as handler } from "./.open-next/worker.js"`, export `fetch` (and anything else), and point `main` at it. Re-export `DOQueueHandler` and `DOShardedTagCache` only if those caches are used. The docs do not show path routing, but nothing stops the custom `fetch` from sending `/api/v1/*` to a Hono app and everything else to `handler.fetch`. Routes handled that way skip Next, so `next.config.ts` headers do not apply to them. | https://opennext.js.org/cloudflare/howtos/custom-worker | Docs, Inference |
| `headers()` from `next.config.ts` | Applied by OpenNext's routing layer to Worker responses. Tested: `/privacy` and the OG route carried the CSP, HSTS, `X-Frame-Options` and `nosniff`. **Not applied to static assets**: "The worker doesn't run in front of static assets", so the `headers` option "doesn't apply to public files" or "immutable build files (like `_next/static`)". Tested: a `/_next/static` chunk came back with only `Cache-Control: public, max-age=0, must-revalidate`. Fix: a `public/_headers` file with `/_next/static/*` set to `public,max-age=31536000,immutable`, plus any security headers wanted on assets. | https://opennext.js.org/cloudflare/caching ; local preview | Docs, Tested |
| Local development | `next dev` works with bindings if `next.config.ts` calls `initOpenNextCloudflareForDev()`. `opennextjs-cloudflare preview` builds and serves the Worker in workerd through `wrangler dev`; its flag `remote` uses remote bindings. Package scripts per the docs: `preview`, `deploy`, `upload`, `cf-typegen`. Tested `preview` on port 8799: robots, static pages, chunks and OG route all served. | https://opennext.js.org/cloudflare/get-started ; `dist/cli/commands/preview.js` | Docs, Source, Tested |
| Known issues: React 19, Next 16, Turbopack | Turbopack builds work (tested). Open issues that could touch TourGraph: **#1381** (1102 after ~120 `force-dynamic` renders, see section 0); **#1468** (a route whose body stream errors before its first chunk hangs instead of returning 500); **#1382** (prerendered routes hang under Smart Placement, so leave Smart Placement off); **#1454** (static assets cache 404s). Checked and not hitting TourGraph: **#1344** (`noModule` script before `<!DOCTYPE html>`): local output starts with the doctype; **#1302** (CSP nonce): TourGraph uses no nonce; **#1329** (SSRF through `res.revalidate`): Pages Router only; **#1278** (deploy with `CLOUDFLARE_API_TOKEN` fails): only in the R2 cache population step. | https://github.com/opennextjs/opennextjs-cloudflare/issues | Issue, Tested |
| Alternatives | Cloudflare's own Next.js guide now leads with **vinext**, a Vite-based reimplementation that is "in beta", and points to OpenNext for compatibility gaps. Not a fit for a straight move. | https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ (updated Aug 25, 2026) | Docs |

## 2. D1

### 2.1 Size, pricing, limits

| Item | Value | Label |
|-|-|-|
| Max database size, Workers Paid | **10 GB** (Free: 500 MB). Storage per account 1 TB. | Docs |
| TourGraph database | 507,211,776 bytes on disk (123,831 pages of 4 KB), 0 free pages. Tables: `tours` 136,303 rows, `destinations` 3,380, `city_readings` 1,799, `trivia_pool` 1,235, `city_profiles` 910, `six_degrees_chains` 491, `indexer_state` 1; `superlatives`, `trivia_daily` and `trivia_scores` empty in the local copy. No virtual tables, no FTS. | Tested |
| Rows read | Paid: **25 billion a month included**, then $0.001 per million. Counts rows scanned, "regardless of the size of each row". | Docs |
| Rows written | Paid: **50 million a month included**, then $1.00 per million. Index updates add writes. | Docs |
| Storage | Paid: **5 GB included**, then $0.75 per GB-month. TourGraph fits inside the included amount. | Docs |
| Workers Paid plan | $5 a month minimum; 10 million requests and 30 million CPU ms included; then $0.30 per million requests and $0.02 per million CPU ms. Static asset requests free. Service binding calls add no request fee. Workers Logs: 20 million events included; pricing moves to Cloudflare Observability on Dec 1, 2026. | Docs |
| Query limits | 30 s per query; **100 bound parameters**; **100 KB statement**; 2 MB per string, BLOB or row; **50 MB result size from 2026-11-04**; 1,000 queries per invocation (a batch counts once); 6 simultaneous connections per invocation; 32 arguments per SQL function; 50 byte LIKE pattern. Each database is single threaded: "A 1 ms average allows up to 1,000 queries per second, and a 100 ms average allows up to 10." | Docs |
| Time Travel | 30 days on Paid. | Docs |

Sources: https://developers.cloudflare.com/d1/platform/limits/ (updated Oct 30, 2026), https://developers.cloudflare.com/d1/platform/pricing/ , https://developers.cloudflare.com/workers/platform/pricing/

### 2.2 Importing the 480 MB database

**Supported path.** Raw `.sqlite3` files cannot be imported; convert to SQL and run `wrangler d1 execute <db>` with flags `remote` and `file=<file>.sql` (5 GiB file limit). There is **no `wrangler d1 import` command**: `wrangler d1` lists create, info, list, delete, execute, export, time-travel, migrations and insights. [Docs, Tested] https://developers.cloudflare.com/d1/best-practices/import-export-data/

**What the remote path does.** In wrangler 4.156.0, a remote file run uses the D1 import API at `POST /accounts/{account_id}/d1/database/{database_id}/import`: `{action: "init", etag}`, then a `PUT` of the file to a presigned R2 URL, then `{action: "ingest", filename, etag}`, then `{action: "poll"}` until complete. It prints: "if the execution fails to complete, your DB will return to its original state and you can safely retry", and warns that the database "will be unavailable to serve queries" while it runs. [Source] `wrangler-dist/cli.js`; API reference https://developers.cloudflare.com/api/node/resources/d1/subresources/database/methods/import

**What breaks in a dump.**

| Problem | Evidence | Label |
|-|-|-|
| `BEGIN TRANSACTION` / `COMMIT` | "cannot start a transaction within a transaction"; docs say remove them | Docs |
| `_cf_KV` table | reserved; docs say remove it | Docs |
| `unistr()` | sqlite3 3.50+ `.dump` "makes use of the new unistr() SQL function to encode special characters" unless escape mode is off (https://sqlite.org/releaselog/3_50_0.html). This Mac has sqlite3 3.54.0: **89,148 of 144,247 dump lines** use it. Local D1 answered "not authorized to use function: unistr". workerd bundles SQLite 3.53.4, so the function exists but D1's authorizer blocks it. | Tested, Docs |
| `PRAGMA writable_schema=ON` | Emitted around the `sqlite_sequence` block. Local D1: "not authorized: SQLITE_AUTH". | Tested |
| `CREATE TABLE IF NOT EXISTS sqlite_sequence` | Local D1: "object name reserved for internal use: sqlite_sequence". | Tested |
| Statements over 100 KB | None. Largest row is 74,034 raw bytes; largest cleaned statement **74,141 bytes**; 0 over 100,000. | Tested |
| FTS5 and other virtual tables | D1 supports FTS5, but export fails with virtual tables. TourGraph has none. | Docs, Tested |
| Some functions | D1 also refused `sqlite_version()`; `random()` and `json_each` work. | Tested |

**Recipe that worked locally.** Read only against a copy, into a scratch folder:
1. Table DDL from `sqlite_master` where `type='table' AND name NOT LIKE 'sqlite_%'`.
2. Data per table with `sqlite3 -readonly -escape off -cmd ".mode insert <table>" db "SELECT * FROM <table>;"`. With `-escape off` the output has zero `unistr()` and zero `char(10)` calls; newlines stay literal inside quoted strings.
3. Index DDL last.

Result: 356 MB SQL, 144,119 INSERTs. Local import with flags `local` and `file`: **41 s wall time, 5.8 GB peak memory** (wrangler holds the whole file in memory for local runs). Row counts matched. [Tested]

`AUTOINCREMENT` counters are not carried over, because `sqlite_sequence` cannot be written. SQLite sets the counter to the highest inserted id, so new `trivia_scores` rows still get fresh ids. The dump's saved counters were higher than the max ids (for example `tours` 147,604), which only matters for tables that never get new rows. [Inference]

**Realistic remote time.** Not documented anywhere I found. It is an upload of 356 MB (bandwidth bound) plus server ingest; expect minutes, not hours. Do it before the switchover, since the database is unavailable during the import. [Inference]

**Writes counted.** About 144,000 rows plus index entries (`tours` has 10 indexes), so roughly 1.5 million rows written, well inside the 50 million included. [Inference]

### 2.3 `ORDER BY RANDOM()` and cheaper sampling

How TourGraph samples today (`backend/src/routes/*.ts`):
- Roulette builds a 20-tour hand with one `ORDER BY RANDOM() LIMIT n` query per weight category, plus an optional filler.
- Right Now runs one `ORDER BY RANDOM() LIMIT 1` per timezone.
- Chains and trivia pick one random row from small tables.

| Measure | Result | Label |
|-|-|-|
| Category sizes | exotic_location 87,304; most_expensive 25,787; highest_rated 9,338; cheapest_5star 5,771; unique 5,354; wildcard 1,428; most_reviewed 1,321 (sum = all 136,303 tours) | Tested |
| Query plan in local D1 | `SEARCH tours USING INDEX idx_tours_weight (weight_category=?)` then `USE TEMP B-TREE FOR ORDER BY`. So every row in the category is read and sorted. (macOS sqlite3 picked `idx_tours_status` instead; D1 picked the better index even before `ANALYZE`.) | Tested |
| Rows read per hand | About 136,000 (every category once) | Inference from plan and docs |
| Money | 25 billion included covers about 180,000 hands a month; beyond that about $0.00014 per hand. Negligible. | Inference |
| Time (local D1) | exotic_location 54 ms, most_expensive 19 ms, highest_rated 9 ms; about 80 to 100 ms of SQL per hand. One database runs one query at a time, so this caps throughput near 10 hands a second across all visitors. | Tested, Docs, Inference |
| Indexed random key | Add `rand_key REAL`, fill once with a random number, index `(weight_category, status, rand_key)`, and query `WHERE weight_category=? AND status='active' AND rand_key >= ? ORDER BY rand_key LIMIT n` with a random `?` from JavaScript (wrap to 0 if short). Plan: `SEARCH tours USING COVERING INDEX ...`. Time: **0 ms** reported, about n rows read. Slight bias from uneven gaps; fine for a toy. | Tested |
| Exclude list | The current `id NOT IN (?, ...)` can bind up to 220 values and will fail on D1's 100 limit. `AND id NOT IN (SELECT value FROM json_each(?))` with one JSON string works. | Tested |
| Superlatives | `ORDER BY duration_minutes` and `ORDER BY review_count` have no index: full scans of about 70 ms each locally, on every request. `from_price` is indexed: under 1 ms. Two indexes (or precomputing, since data is frozen) fix it. | Tested |

### 2.4 Read replication and Sessions API

- No extra cost; billing is the same rows read and written. [Docs]
- Without the Sessions API, "all queries will continue to be executed only by the primary database". Getting any benefit means `env.DB.withSession(...)` in code. [Docs]
- Replicas go to every region (ENAM, WNAM, WEUR, EEUR, APAC, OC). Disabling "takes up to 24 hours". Writes still go to the primary. The page does not say whether the feature is GA or beta. [Docs]
- Worth it here? Not for the straight move. The data is frozen, so replica lag never matters for reads, which makes it an easy later win for far-away visitors. Trivia writes would go to the primary as now. [Inference]
- Location hint at creation (`wrangler d1 create` with flag `location`): wnam, enam, weur, eeur, apac, oc. Not available for South America, Africa or the Middle East. Default is near where the create request is made. [Docs]

Sources: https://developers.cloudflare.com/d1/best-practices/read-replication/ (updated Aug 10, 2026), https://developers.cloudflare.com/d1/configuration/data-location/

## 3. Visitor country

| Question | Answer | Label |
|-|-|-|
| Field | `request.cf.country`: "The two-letter country code in the request", the same value as the `CF-IPCountry` header. Special values in that header: `XX` (no data), `T1` (Tor). The docs only exclude the dashboard and Playground preview from having `request.cf`. | Docs |
| On custom domains and routes | Present on every incoming request; nothing in the docs limits it by hostname type. | Docs, Inference |
| From OpenNext server code | `getCloudflareContext().cf?.country`. The generated Worker stores `cf: request.cf` in the per-request context. Tested in a route handler under `opennextjs-cloudflare preview`: returned `US`. | Source, Tested |
| `CF-IPCountry` header | Added to origin requests when the zone's IP Geolocation setting or the "Add visitor location headers" Managed Transform is on. Whether a Worker's own incoming request carries it is not documented. Use `request.cf` and do not depend on the header. | Docs, Inference |
| Through a service binding | A request the web Worker builds for the API Worker does not carry the visitor's `cf`. Pass the country explicitly (for example as `X-Country-Code`, the header the API reads today) if the web layer ever needs it. Trivia is called directly by the mobile apps, so the API Worker sees `request.cf` itself. | Inference |

Sources: https://developers.cloudflare.com/workers/runtime-apis/request/ , https://developers.cloudflare.com/fundamentals/reference/http-headers/ , https://developers.cloudflare.com/network/ip-geolocation/

## 4. Custom domains, redirects, certificates, HSTS, mail

**Current state (dig and curl, Nov 1):**
- Nameservers `walt` and `dorthy.ns.cloudflare.com`, so the zone is active on Cloudflare.
- `tourgraph.ai` and `www.tourgraph.ai`: A records to `143.244.186.165`, DNS only.
- MX `0 tourgraph-ai.mail.protection.outlook.com`.
- TXT `v=spf1 include:spf.protection.outlook.com -all` and a `google-site-verification` record.
- `autodiscover.tourgraph.ai` CNAME to `autodiscover.outlook.com`. [Tested]

| Question | Answer | Label |
|-|-|-|
| Attach over existing DNS-only A records | Docs: "You cannot create a Custom Domain on a hostname with an existing CNAME DNS record"; nothing about A records. Wrangler 4.156.0 `publishCustomDomains`: asks the server for a changeset; if records conflict, an interactive deploy asks "You already have DNS records that conflict for these Custom Domains ... Update them to point to this script instead?". **A non-interactive run sets `override_existing_dns_record: true` and `override_existing_origin: true` without asking.** | Docs, Source |
| API | `PUT /accounts/{account_id}/workers/domains`, body `hostname`, `service`, optional `zone_id` or `zone_name`, `enabled`, `previews_enabled`. No override field is documented, and the API's behavior on a conflicting A record is not documented. Detach: `DELETE /accounts/{account_id}/workers/domains/{domain_id}`. | Docs |
| Safe order | Delete the A record, then attach through the API or dashboard, then add the custom-domain route to the wrangler config so later deploys keep it. This is what Recurate did on Oct 31 on the same account (`recurate-platform/docs/deploy-runbook.md`). Keep the custom domain out of the wrangler config until that moment, because a non-interactive deploy would take the hostname. | Source, Inference |
| www | "Custom Domains require an exact hostname match", so the apex Worker never sees `www`. Option A: a Single Redirect rule (Free zone plan allows 10) for `https://www.tourgraph.ai/*` to `https://tourgraph.ai/${1}`, 301, keep the query string, plus a **proxied** placeholder record for `www` (A `192.0.2.0` or AAAA `100::`) replacing today's DNS-only A. Option B: attach `www` as a second Custom Domain and redirect in Worker code. | Docs |
| Certificate issuance | Each Custom Domain gets an Advanced Certificate, at no extra cost; issuance time is not documented. The edge already holds a Universal SSL certificate: a TLS handshake through a Cloudflare IP returned `CN=tourgraph.ai`, SAN `*.tourgraph.ai`, Let's Encrypt, expiring **2026-12-16**. So HTTPS should work as soon as the hostnames are proxied. Deleting a Custom Domain does not delete its certificate. | Docs, Tested, Inference |
| Rollback certificate | The droplet's own Let's Encrypt certificate expires **2026-11-27**. If the droplet is kept as a fallback, check that certbot still renews it. | Tested |
| HTTP to HTTPS | Zone setting "Always Use HTTPS" redirects every hostname; it needs an SSL mode other than Off. | Docs |
| HSTS | Today the site sends `max-age=63072000; includeSubDomains; preload` **twice** (nginx and Next). `hstspreload.org` reports status `unknown`, so the domain is not on the preload list. After the move, Next's `headers()` keeps sending it on Worker responses; static assets need it in `public/_headers` if wanted there. The zone HSTS setting (Edge Certificates) also exists, max age up to 12 months; the docs do not say how it combines with an app header. Recommendation: keep HSTS in the app only and leave the zone setting off, to avoid a third copy. | Tested, Docs, Inference |
| Mail records | A Custom Domain creates a record for its exact hostname only. MX and TXT records at the apex can sit beside an address record (only a CNAME cannot), and `autodiscover` is a different hostname. Whether wrangler's "conflicting" list could ever include apex MX or TXT records is not documented; I expect not, since conflicts are about address and CNAME records. Mitigation: export the zone's DNS records before, attach by API after deleting only the two A records, and diff the records after. | Docs, Inference |
| Propagation | Clients that cached the old A record keep hitting the droplet until its TTL expires. Records are DNS only, so the TTL is short (Auto is 300 s). Keep the droplet serving through the switch. | Inference |

Sources: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ (updated Sep 29, 2026), https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/update/ , https://developers.cloudflare.com/rules/url-forwarding/ , https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/ , https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/

## 5. Zone features that change HTML, and the CSP

| Feature | What it does | CSP need | Setting | Label |
|-|-|-|-|-|
| Rocket Loader | Rewrites script loading | `script-src ajax.cloudflare.com` | **Off** | Docs |
| Email Address Obfuscation (Scrape Shield) | Rewrites emails in HTML; adds an inline script | `script-src 'unsafe-inline'` | **Off**. Docs say it does not apply when "the HTML/JavaScript code is specifically added by a Worker" or with `Cache-Control: no-transform`; whether that covers a Worker that is the origin is unclear. | Docs, Inference |
| Web Analytics automatic setup | Injects the RUM beacon into HTML. "Enabled by default" for proxied sites once the site is added to Web Analytics. | `script-src static.cloudflareinsights.com`, `connect-src cloudflareinsights.com` | **Disable** for this site (GA4 is already used). TourGraph was DNS only, so it never had injection; it could start once proxied if the site exists in Web Analytics. | Docs, Inference |
| Auto Minify | Gone. End of life **Aug 5, 2024**; its API endpoints are deprecated. | none | nothing to do | Docs |
| Others that change bodies | Automatic HTTPS Rewrites, challenge pages, Cloudflare Fonts, Always Online, AI Labyrinth, Markdown for Agents, Replace insecure JS libraries | varies | Leave at defaults. A Configuration Rule with Response Body Buffering set to **None** stops all of them on matching requests if one ever misbehaves. | Docs |

**Pre-existing CSP bug (not caused by the move).** The live response header is `script-src 'self' 'unsafe-inline'`, and the live HTML includes `<script src="https://www.googletagmanager.com/gtag/js?id=G-LMSTJHBDPZ">`. Browsers will block that script, so GA4 most likely records nothing today. Google's CSP guidance lists `https://*.googletagmanager.com` for `script-src` and Google Analytics hosts for `connect-src` and `img-src`; confirm the exact list on Google's page when fixing. [Tested, Inference]

Sources: https://developers.cloudflare.com/fundamentals/reference/policies-compliances/content-security-policies/ , https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/ , https://developers.cloudflare.com/web-analytics/get-started/ , https://developers.cloudflare.com/web-analytics/faq/ , https://developers.cloudflare.com/rules/configuration-rules/response-body-inspection/ , https://developers.cloudflare.com/fundamentals/api/reference/deprecations/

## 6. Wrangler and Node 26

- **Version:** wrangler **4.156.0** (`latest`, published 2026-10-29), `engines.node >=22.0.0`. [npm view]
- **Node 26:** everything tested here ran on Node 26.12.1 with npm 11.20.0: `wrangler` version, local D1 queries, the full local import, a deploy dry run, the OpenNext build and `preview`. [Tested]
- **Known Node 26 issue:** only one found, workers-sdk #16522 (Miniflare Browser Rendering hangs on Node 26). TourGraph does not use Browser Rendering. [Issue]
- **npm 11 install scripts:** npm skipped the `postinstall` scripts of `workerd` and `esbuild` with "npm warn install-scripts", and both still worked. If a future version needs them, `npm install-scripts approve workerd esbuild`. [Tested]
- **Auth on this Mac:** per the Recurate runbook, the default wrangler login on this Mac belongs to another account; use an API token scoped to the right account. [Inference from sister project]

## 7. Other things that commonly bite this move

| Item | Detail | Label |
|-|-|-|
| Module-level timers | `roulette.ts` line 134 calls `setInterval` at import time. Workers: "Disallowed operation called within global scope. Asynchronous I/O ..., setting a timeout, and generating random values are not allowed within global scope." | Docs |
| In-memory rate limit | The per-IP `Map` in roulette is per isolate on Workers and means little. Replace with the Rate Limiting binding (`simple: { limit: 30, period: 10 }`; period must be 10 or 60; approximate, per location) or drop it. | Docs (via Recurate research), Inference |
| Client IP | `req.ip` and `x-forwarded-for` become the `CF-Connecting-IP` header. | Docs |
| Native `better-sqlite3` | Cannot run on Workers. Every query becomes `await env.DB.prepare(...).bind(...).all()`. Cloudflare documents running Express on Workers through `httpServerHandler` from `cloudflare:node` (tutorial updated Aug 25, 2026), so the routes could stay Express; Hono is the Workers-native choice Recurate made. | Docs |
| Per-request DB handles | "Cannot perform I/O on behalf of a different request" if a client is cached globally. Read `env.DB` per request. | Docs |
| nginx rewrites | `/api/ios/tour/(.+)` to `/api/v1/tours/$1/enrichment`, and `/api/ios/tours/batch` to `/api/v1/tours/batch`. Old app builds call these; the Worker must keep them. Also `www` to apex, HTTP to HTTPS, and the 1 MB body cap. | Tested (repo) |
| Web to API calls | `web/src/lib/api.ts` fetches `${API_URL}/api/v1` (default `http://localhost:3001`). On Workers that must change: a service binding (no public hop, no extra request fee), or an in-process call in a single Worker. A Worker can `fetch()` a Custom Domain on its own zone, and `global_fetch_strictly_public` sends such calls through the front door, but that adds a billed request and latency. | Docs, Inference |
| Silent sitemap loss | `sitemap.ts` wraps `getChainSlugs()` in `try {} catch {}` with the comment "API might not be available during build". If the call fails (wrong binding mode, unreachable API), the sitemap quietly drops all 491 chain URLs. It builds as dynamic today; after the move, check the deployed sitemap's URL count. | Tested (build output), Inference |
| Trivia daily pick | Today the pick is safe because better-sqlite3 is synchronous in one process. On D1 the SELECT, UPDATE and `INSERT OR IGNORE` are separate awaits, so two first-of-day requests can interleave. `INSERT OR IGNORE` keeps one row, but `used_date` can be set on two questions. Use one `db.batch` or accept it. | Inference |
| Static asset caching | Without `public/_headers`, hashed `/_next/static` files get `max-age=0, must-revalidate`. | Docs, Tested |
| Local dev with a custom-domain route | Recurate needed `wrangler dev` flag `local-upstream` so the Worker saw `localhost` and not the custom domain; without it every request redirected. Relevant if the Worker redirects non-canonical hosts. | Sister project runbook |
| Smart Placement | Leave off for now (OpenNext issue #1382). | Issue |
| Free tier D1 enforcement | Since Sep 1, 2026, D1 queries on Workers Free fail past daily limits. Not relevant on Paid. | Docs |

## 8. Recommendation (my proposal, not settled)

**Two Workers, one D1, no Images binding, no R2 or KV.**

- **`tourgraph-api` Worker.** A port of `backend/` to Workers: same routes and JSON, D1 instead of `better-sqlite3`, the two `/api/ios/*` rewrites, country from `request.cf.country`, client IP from `CF-Connecting-IP`, rate limiting through the Rate Limiting binding (or dropped).
  - Framework: Hono, for consistency with Recurate. Keeping Express through `httpServerHandler` is the lower-diff alternative, and worth a one-hour spike if the diff matters more than consistency.
  - Attached by a Workers **route** `tourgraph.ai/api/*` in front of the web Worker's Custom Domain. Docs confirm route Workers run before a Custom Domain Worker on the same hostname.
- **`tourgraph-web` Worker.** OpenNext 1.20.15 with Next 16.4.3 (at least 16.4.1). Custom Domain `tourgraph.ai`.
  - Calls the API through a service binding instead of `API_URL`; one change in `web/src/lib/api.ts`.
  - `images.unoptimized: true`; `public/_headers` for `/_next/static` caching; default dummy cache; Smart Placement off.
- **Why two Workers.** It mirrors today's two processes, so the move stays straight. It keeps the iOS and Android API on simple, well-understood code, away from OpenNext bug #1381 and future adapter regressions. Service bindings add no request fee. The cost is a second wrangler config and deploy.
  - A single Worker with a custom entry is workable and simpler to deploy, but it ties mobile app uptime to the Next.js adapter.
- **D1 vs alternatives.** D1. The database fits the included 5 GB, and the data is frozen.
  - Worker memory (128 MB) rules out loading the file into the Worker.
  - Durable Object SQLite would be the same engine with more code.
  - Hyperdrive with an external database adds a server again.
  - Create it with a location hint near most visitors (likely `wnam` or `enam`). Leave read replication for later.
- **Data changes worth making during the move.** These are small, and the data is frozen anyway:
  - Replace the `NOT IN (...)` exclude with `json_each(?)` (required).
  - Add an indexed `rand_key` for roulette and right-now sampling.
  - Add indexes on `duration_minutes` and `review_count`, or precompute the six superlatives.
  - The first is required; the others turn about 100 ms of serial SQL per page into about 1 ms.
- **Import.** Use the cleaned dump recipe in section 2.2 (`-escape off`, no `sqlite_*` objects, indexes last), test with flag `local`, then run once with flag `remote` before the switchover.
- **Zone.**
  - Rocket Loader, Email Obfuscation and Web Analytics injection off. Always Use HTTPS on.
  - `www` handled by a Single Redirect plus a proxied placeholder record.
  - HSTS from the app only.
  - Delete the two A records, then attach the Custom Domain by API. Diff DNS before and after for the mail records.
- **Gate before switchover.** On `workers.dev`, run a few hundred sequential and concurrent renders of `/`, `/right-now`, `/worlds-most` and `/six-degrees` and watch for 1102 errors in Workers Logs. If #1381 shows up, the choices are to wait for a fix, cut render weight, or keep the web on the droplet while only the API moves.
- **Separate fix, not part of the move:** add the GA4 hosts to the CSP, or remove GA4.
