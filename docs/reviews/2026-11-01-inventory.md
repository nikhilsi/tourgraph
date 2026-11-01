# TourGraph: inventory for the Cloudflare move

Source of truth: committed code at `a9fe9d0` on branch `cloudflare-move` (Next.js 16.1.6, Express 5.2.1, better-sqlite3 12.6.2, cors 2.8.6 per the committed lockfiles). Written 2026-11-01. Read only: nothing in the repo was changed except this file.

How the facts were gathered:

- Code: every file under `backend/src/` (1,344 lines) and `web/src/`, plus `web/next.config.ts`, `deployment/nginx/tourgraph.conf`, `deployment/ecosystem.config.cjs`, `deployment/scripts/`, and the local build manifests in `web/.next/` (built 2026-06-09 from the same commit).
- Database: the local `data/tourgraph.db` (507,211,776 bytes), opened only as `file:data/tourgraph.db?mode=ro&immutable=1`. Production `/health` reports the same active tour count (136,256), so the tour data matches. The trivia tables are empty locally; production trivia state was not read.
- Rows scanned: SQLite 3.54.0 `.scanstats on` and `EXPLAIN QUERY PLAN` against that file. "Rows visited" below is what SQLite reports per loop. D1 bills rows scanned, so treat these as the right order of magnitude for D1 `rows_read`, not exact billing numbers.
- Experiments that needed writes (ANALYZE, slim copy) ran on a copy in the session scratch directory, since deleted.
- Live: 13 GET requests to `https://tourgraph.ai` at about 06:23 UTC. No POSTs. `/trivia/daily` and `/trivia/results` were not called because they write to the database.
- Cloudflare limits: checked against developers.cloudflare.com on 2026-11-01 (D1 limits and pricing, Workers limits, OpenNext and vinext guides).
- Note: `web/package.json`, `web/package-lock.json` and a new `web/src/server/` directory changed on disk during this review (another session). They are not covered here.

Conventions: `file:line` points at the code. Observations are numbered O1 to O28 and collected in section 7. Strings in the code that contain an em dash are written here with `(U+2014)` in its place.


## Key facts

1. The API has 22 endpoints under `/api/v1`. All return JSON. All are read only except four trivia paths. The web server calls 10 of them; the browser calls 1 (`/roulette/hand`).
2. The slowness has one main cause. SQLite has no statistics (`sqlite_stat1` is absent), so the planner uses `idx_tours_status` (99.97% of rows are active) for the roulette and superlative queries. Each such query visits all 136,256 rows and does a row lookup into a 454 MiB table. Live: `/api/v1/superlatives` took 13.05 s, `/api/v1/right-now/timezones` 2.32 s, while primary key lookups take about 0.24 s. One homepage view visits about 1.9 million rows.
3. Running ANALYZE (D1 recommends `PRAGMA optimize`) plus two new indexes cuts that to about 184,000 rows per homepage view.
4. D1 limits that matter: 100 bound parameters per query (roulette can send up to 221), 500 MB per database on the Free plan (the full file is 507 MB), 5 million rows read per day on Free, and 10 ms CPU per request on Workers Free.
5. The backend reads 5 of 11 tables and 22 of 29 `tours` columns. A slim database with only those is about 437 MB at 4 KB pages (320 MB of payload). The columns needed for cards alone are 70 MB.
6. The roulette rate limiter lives in process memory and uses a module scope `setInterval`. Workers forbids timers at global scope, and per isolate memory makes the limit meaningless.
7. Trivia daily assembly is race free today only because one synchronous Node process does it. On D1 two first requests of a day can assemble different sets.
8. Google Analytics is blocked by the CSP. The privacy page also says "No analytics, no tracking". The owner should decide which one is right.
9. Every page's `<link rel="canonical">` points at the homepage (layout metadata), confirmed live on `/roulette/2`.
10. DNS for tourgraph.ai is already on Cloudflare nameservers. The apex and www A records point straight at the droplet (143.244.186.165, not proxied). MX goes to Outlook and must be kept.


## 1. Backend API contract

### 1.1 App level behavior (applies to every endpoint)

| Behavior | Detail | Ref |
|:-|:-|:-|
| Mount | All routes under `/api/v1`. Anything else on port 3001 is a 404. | `backend/src/index.ts:20-29` |
| CORS | `cors()` with defaults. Every response carries `Access-Control-Allow-Origin: *`. `OPTIONS` on any path returns 204 with `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE` and echoes `Access-Control-Request-Headers`. | `index.ts:16` |
| Body parsing | `express.json()`: 100 kb limit, parses only `Content-Type: application/json`. In Express 5 `req.body` is `undefined` when not parsed, so a POST without that content type throws inside the handler and returns the handler's 500 body (O13). Malformed JSON gives a 400 HTML page; an oversize body gives a 413 HTML page. | `index.ts:17` |
| Unknown path | 404, `text/html`, body `<pre>Cannot GET /api/v1/nope</pre>`, headers `Content-Security-Policy: default-src 'none'` and `X-Content-Type-Options: nosniff`. Confirmed live. | Express default |
| Headers on every API response | `X-Powered-By: Express`, `Access-Control-Allow-Origin: *`, weak `ETag` (conditional GET returns 304), `Content-Type: application/json; charset=utf-8`. nginx adds HSTS. No other security headers. Confirmed live on `/health` and `/tours/2`. | Express defaults |
| Routing | Case insensitive, trailing slash tolerated (`/api/v1/health/` works), HEAD served by GET handlers. | Express defaults |
| Query parsing | Express 5 "simple" parser (Node `querystring`). `+` decodes to a space. A repeated key becomes an array, which crashes the `.split()` calls (O13). | Express 5 default |
| Error body | Handlers return `{"error": "<message>"}`. Roulette adds `"hand": []`. | each route |

### 1.2 Shared response shapes

`RouletteTour` (`backend/src/transform.ts:4-21`). Nulls are replaced with the defaults shown.

| Field | Type | Source column | Null default |
|:-|:-|:-|:-|
| `id` | number | `id` | |
| `productCode` | string | `product_code` | |
| `title` | string | `title` | |
| `oneLiner` | string | `one_liner` | `""` |
| `destinationName` | string | `destination_name` | `""` |
| `country` | string | `country` | `""` |
| `continent` | string | `continent` | `""` |
| `rating` | number | `rating` (raw REAL, for example `4.8365993`) | `0` |
| `reviewCount` | number | `review_count` | `0` |
| `fromPrice` | number | `from_price` | `0` |
| `durationMinutes` | number | `duration_minutes` | `0` |
| `imageUrl` | string | `image_url` | `""` |
| `viatorUrl` | string | `viator_url` | `""` |
| `weightCategory` | string | `weight_category` | `"wildcard"` |

`TourDetail` (`transform.ts:24-33`) is `RouletteTour` plus `description` (string, `""`), `highlights` (string[] parsed from `highlights_json`; always `[]` because that column is NULL in every row), `inclusions` (string[]), `imageUrls` (string[]), `supplierName` (string, `""`). Unparseable JSON becomes `[]` (`transform.ts:35-43`).

`ChainWithMeta` (`backend/src/routes/chains.ts:20-28`): the stored `chain_json` object spread out, then `id`, `slug`, `generated_at`. Keys are snake case, unlike tours:

```
{ "city_from": str, "city_to": str,
  "chain": [ { "city": str, "country": str, "tour_title": str, "tour_id": int,
               "connection_to_next": str | null, "theme": str } ],
  "summary": str, "id": int, "slug": str, "generated_at": "YYYY-MM-DD HH:MM:SS" }
```

Trivia question (`backend/src/routes/trivia.ts:137-145`): `{id, format, question, options: [{label, text, tourId?}], correctIndex, reveal: {fact, imageUrl?, imageUrls?}}`. The public variant drops `correctIndex` and `reveal` (`trivia.ts:150-152`) but keeps `options[].tourId` (O7).

### 1.3 Endpoints

All paths below are relative to `/api/v1`. "500 body" is the handler's catch block.

| Endpoint | Input, validation, defaults | 200 body | Other statuses and bodies | Cache-Control |
|:-|:-|:-|:-|:-|
| `GET /health` (`health.ts:6-21`) | none | `{"status":"ok","tours":int,"uptime":float}` (`process.uptime()` seconds). Live: `{"status":"ok","tours":136256,"uptime":12467407.74}` (about 144 days). | 503 `{"status":"error"}` | none |
| `GET /stats` (`health.ts:24-43`) | none | `{"tours":int,"destinations":int,"countries":int}`. Local data: 136,256 / 2,645 / 205. | 500 `{"error":"Failed to fetch stats"}` | `public, max-age=3600, s-maxage=3600` |
| `GET /roulette/hand` (`roulette.ts:176-203`) | `exclude`: comma list, each `parseInt`, NaN dropped, first 200 kept (`:184-192`). Rate limit checked first (1.5). | `{"hand": RouletteTour[]}`, normally 20 tours: quotas highest_rated 4, unique 3, cheapest_5star 3, most_expensive 3, exotic_location 3, most_reviewed 2, wildcard 2 (`:12-20`), filler only if a category runs short (`:106-121`), then reordered for contrast from a random start (`:42-79`). | 429 `{"hand":[],"error":"Too many requests"}`; 500 `{"hand":[],"error":"Failed to fetch tours"}` | `private, no-store` |
| `GET /tours/:id` (`tours.ts:11-33`) | `parseInt(id)`; NaN or <= 0 gives 400. `"2abc"` parses as 2. | `TourDetail`. No status filter: the 47 inactive tours are served too (O10). Live `/tours/2` confirmed the shape. | 400 `{"error":"Invalid tour ID"}`; 404 `{"error":"Tour not found"}`; 500 `{"error":"Failed to fetch tour"}` | `public, max-age=3600, s-maxage=3600` |
| `GET /tours/:id/enrichment` (`tours.ts:36-64`) | same id check; active only | `{"id":int,"description":str\|null,"image_urls_json":str\|null}` (raw column text, JSON not parsed). Confirmed live via `/api/ios/tour/2`. | 400, 404 as above; 500 `{"error":"Failed to fetch tour data"}` | `public, max-age=86400, s-maxage=86400` |
| `POST /tours/batch` (`tours.ts:67-106`) | body `{"ids": number[]}`. Not an array or empty: 400. Keeps positive integers, first 50 (`:76-78`). None left: 400. | `{"tours":[{"id","description","image_urls_json"}]}`, active only, in rowid order (not request order), missing ids omitted | 400 `{"error":"ids array required"}`; 400 `{"error":"No valid IDs"}`; 500 `{"error":"Failed to fetch tour data"}` (also when Content-Type is not JSON) | `public, max-age=86400, s-maxage=86400` (on a POST) |
| `GET /tours/:id/card` (`tours.ts:109-131`) | same id check; active only | `RouletteTour` | 400, 404 as `/tours/:id`; 500 `{"error":"Failed to fetch tour"}` | `public, max-age=3600, s-maxage=3600` |
| `GET /right-now/tours` (`right-now.ts:15-71`) | `timezones` required (comma list, trimmed). `count`: `parseInt`, 0 or NaN becomes 8, capped at 20; a negative count returns `[]` (`:18`). Input is shuffled; one query per timezone until `count` results; the loop stops (`break`) at the first duplicate timezone (`:39`, O12). | `{"tours":[RouletteTour + "timezone": str]}` | 400 `{"error":"timezones parameter required"}`; a list of only commas gives 200 `{"tours":[]}` with no Cache-Control; 500 `{"error":"Failed to fetch tours"}` | `private, no-store` |
| `GET /right-now/timezones` (`right-now.ts:74-90`) | none | `{"timezones": str[]}`, 289 entries in SQLite DISTINCT order (live starts `America/Los_Angeles`, `Europe/Paris`). Live 2.32 s. | 500 `{"error":"Failed to fetch timezones"}` | `public, max-age=86400, s-maxage=86400` |
| `GET /superlatives` (`superlatives.ts:61-78`) | none | `{"superlatives":[{"type":str,"tour":RouletteTour}]}` in fixed order most-expensive, cheapest-5star, longest, shortest, most-reviewed, hidden-gem. Each tour is a random pick from that query's top 10 (`:51-58`). A type with no candidates is omitted. Live 13.05 s. | 500 `{"error":"Failed to fetch superlatives"}` | `private, no-store` |
| `GET /superlatives/:type` (`superlatives.ts:81-101`) | `type` must be one of the six | `{"type":str,"tour":TourDetail}` | 400 `{"error":"Invalid type. Valid: most-expensive, cheapest-5star, longest, shortest, most-reviewed, hidden-gem"}`; 404 `{"error":"No tour found for this superlative"}`; 500 `{"error":"Failed to fetch superlative"}` | `private, no-store` |
| `GET /chains` (`chains.ts:31-44`) | none | `{"chains": ChainWithMeta[]}`, 491 entries by id, about 0.9 MB (`chain_json` totals 876,215 bytes) | 500 `{"error":"Failed to fetch chains"}` | `public, max-age=3600, s-maxage=3600` |
| `GET /chains/slugs` (`chains.ts:47-60`) | none | `{"slugs": str[]}` (491) | 500 `{"error":"Failed to fetch chain slugs"}` | `public, max-age=86400, s-maxage=86400` |
| `GET /chains/count` (`chains.ts:63-76`) | none | `{"count":491}` | 500 `{"error":"Failed to fetch chain count"}` | `public, max-age=3600, s-maxage=3600` |
| `GET /chains/random` (`chains.ts:79-97`) | none | `ChainWithMeta` | 404 `{"error":"No chains found"}`; 500 `{"error":"Failed to fetch chain"}` | `private, no-store` |
| `GET /chains/:slug` (`chains.ts:100-119`) | exact slug match. `slugs`, `count`, `random` are shadowed by the routes above. | `ChainWithMeta` | 404 `{"error":"Chain not found"}`; 500 `{"error":"Failed to fetch chain"}` | `public, max-age=3600, s-maxage=3600` |
| `GET /trivia/daily` (`trivia.ts:158-173`) | none. Date is UTC today. May write (section 3). | `{"date":"YYYY-MM-DD","questions":[{"id","format","question","options"}],"questionCount":int}` | 500 `{"error":"Failed to fetch daily trivia"}` | `public, max-age=60` |
| `POST /trivia/answer` (`trivia.ts:179-210`) | body `questionId` and `selectedIndex` must be `typeof number`. Any pool question can be answered, not only today's. | `{"correct":bool,"correctIndex":int,"reveal":{...}}` | 400 `{"error":"questionId and selectedIndex required"}`; 404 `{"error":"Question not found"}`; 500 `{"error":"Failed to check answer"}` | none |
| `GET /trivia/results` (`trivia.ts:216-236`) | `date` optional, any string, not validated; default UTC today. Runs the same lazy assembly, so an unseen date writes (O6). | `{"date":str,"questions":[{"id","format","question","options","correctIndex","reveal"}]}`. No check that the caller finished the quiz. | 500 `{"error":"Failed to fetch results"}` | none |
| `POST /trivia/score` (`trivia.ts:242-290`) | body `date` truthy (any value), `score` `typeof number` in 0..5 (fractions accepted), `sessionHash` truthy, `answers` optional (stored as JSON text). Country from header `X-Country-Code` or null (`:257-258`). | `{"saved":true}` | 400 `{"error":"date, score, and sessionHash required"}`; 400 `{"error":"score must be 0-5"}`; 409 `{"error":"Score already submitted for this date"}`; 500 `{"error":"Failed to save score"}` | none |
| `GET /trivia/stats` (`trivia.ts:296-367`) | `date` optional (default UTC today); `score` optional, `parseInt` | `{"date","totalPlayers":int,"avgScore":num\|null,"maxScore":int\|null,"minScore":int\|null,"distribution":[{"score","count"}],"countryStats":[{"country_code","players","avgScore"}],"percentile":int\|null}`. `countryStats` only when totalPlayers >= 10, per country >= 3 players, sorted by avgScore descending. `percentile` is the share of players with a lower score, rounded. Live today: zero players, nulls and empty arrays. | 500 `{"error":"Failed to fetch stats"}` | `public, max-age=30` |
| `GET /trivia/practice` (`trivia.ts:373-420`) | `format` optional, exact match, any string. Excludes today's daily ids if today is assembled. Read only. | `{"id","format","question","options"}` | 404 `{"error":"No questions available"}` (also for an unknown format); 500 `{"error":"Failed to fetch practice question"}` | none |

### 1.4 Who calls what

| Caller | Endpoints |
|:-|:-|
| Web server components, via `web/src/lib/api.ts` | `/stats`, `/right-now/timezones`, `/right-now/tours`, `/superlatives`, `/superlatives/:type`, `/tours/:id`, `/chains/random`, `/chains/:slug`, `/chains/count`, `/chains/slugs` |
| Browser | `/roulette/hand` only (`web/src/components/RouletteView.tsx:31`) |
| iOS and Android (never published) | `/api/ios/tour/:id`, `/api/ios/tours/batch`, `/trivia/daily`, `/trivia/answer`, `/trivia/score`, `/trivia/stats`, `/trivia/practice` (`ios/.../Services/TriviaService.swift:20-81`) |
| Nobody in the repo | `/health` (manual checks), `/tours/:id/card`, `/chains`, `/trivia/results`. `api.ts` also defines `getRouletteHand` and `getTourCard`, which nothing calls. |

### 1.5 The `/api/ios` rewrites (nginx, not Express)

From `deployment/nginx/tourgraph.conf:84-93`:

- `^/api/ios/tour/(.+)$` is rewritten to `/api/v1/tours/$1/enrichment` (`:85`). The query string is kept. Confirmed live: `/api/ios/tour/2` returns the enrichment shape with `public, max-age=86400, s-maxage=86400`.
- `^/api/ios/tours/batch$` is rewritten to `/api/v1/tours/batch` (`:86`).
- Any other `/api/ios/*` path is proxied unchanged and gets Express's 404 HTML. (The project memory note that `/api/ios/*` maps to `/api/v1/*` is broader than the config.)
- This location does not set `X-Country-Code`.

### 1.6 State in process memory

| State | Where | Today | On Workers |
|:-|:-|:-|:-|
| Roulette rate limiter: `Map<ip, {count, windowStart}>`, fixed 10 s window, 30 requests per IP, 31st gets 429 | `roulette.ts:130-154` | One PM2 process (`ecosystem.config.cjs:40`), so the limit is global | Breaks. Each isolate has its own Map, so there is no real limit. |
| Cleanup timer: `setInterval(..., 60_000)` at module scope | `roulette.ts:134-141` | Runs forever | Not allowed: Workers rejects "setting a timeout" in global scope. Must be removed. |
| Client IP: rightmost `X-Forwarded-For` entry that is not 10.x, 192.168.x, any 172.x, or 127.0.0.1; else first entry; else `req.ip` | `roulette.ts:156-170` | nginx appends the real IP | Use `CF-Connecting-IP` if any limiter is kept |
| DB handles: lazy singletons, one read only, one read write with `journal_mode = WAL` and `busy_timeout = 5000`; closed on `process.on("exit")` | `backend/src/db.ts:10-38` | | Replaced by the D1 binding; the pragmas do not apply |
| `process.uptime()` in `/health` | `health.ts:16` | Process age | No meaningful value; keep the field as a number |
| Trivia assembly atomicity | `trivia.ts:48-121` | Guaranteed by one synchronous process | Not guaranteed (section 3) |

The web app holds no module level state. It uses React `cache()` per request (`roulette/[id]/page.tsx:17`, `worlds-most/[slug]/page.tsx:18-20`, `six-degrees/[slug]/page.tsx:16`). The Next image optimizer keeps a disk cache in `.next/cache/images` on the droplet.


## 2. SQL queries

### 2.1 Indexes in the database

`tours`: `sqlite_autoindex_tours_1` (product_code UNIQUE), `idx_tours_product_code` (same column again, redundant), `idx_tours_weight`, `idx_tours_status`, `idx_tours_rating` (DESC), `idx_tours_price`, `idx_tours_destination`, `idx_tours_timezone`, `idx_tours_indexed`. There is no index on `duration_minutes` or `review_count`.

Others: `six_degrees_chains` UNIQUE(city_from, city_to) and `idx_chains_slug`; `trivia_pool` `idx_trivia_pool_format`, `idx_trivia_pool_used`; `trivia_daily` primary key on `date`; `trivia_scores` `idx_trivia_scores_date`, `idx_trivia_scores_country` (no unique constraint on date plus session_hash); `superlatives` UNIQUE(type, generated_date) and `idx_superlatives_date`.

There is no `sqlite_stat1` table. Without statistics the planner assumes `status = 'active'` is selective and picks `idx_tours_status`, even though 136,256 of 136,303 rows match.

### 2.2 Query inventory

Counts used below: 136,256 active tours; weight categories exotic_location 87,289, most_expensive 25,779, highest_rated 9,336, cheapest_5star 5,767, unique 5,353, wildcard 1,411, most_reviewed 1,321; 289 distinct timezones (average 472 tours each, largest Europe/Rome 7,936); 491 chains; 1,235 trivia questions (200 per format except numbers_game 35).

| # | Where (route) | Tables and columns | Current plan | Rows visited per run | Runs per request |
|:-|:-|:-|:-|:-|:-|
| Q1 | `health.ts:10` (`/health`) and `:28` (`/stats`) | tours.status | covering `idx_tours_status` | 136,256 (index only) | 1 |
| Q2 | `health.ts:31` (`/stats`) | tours.status, destination_name; COUNT(DISTINCT) | `idx_tours_status` + row lookup | 136,256 | 1 |
| Q3 | `health.ts:34` (`/stats`) | tours.status, country; COUNT(DISTINCT) | `idx_tours_status` + row lookup | 136,256 | 1 |
| Q4 | `roulette.ts:90-98` (`/roulette/hand`), per category | reads 15 card columns; filters weight_category, status, `id NOT IN (...)`; `ORDER BY RANDOM() LIMIT n` | `idx_tours_status` + row lookup + temp sort | 136,256 | 7, so 953,792 per hand |
| Q5 | `roulette.ts:110-118` filler | same, no category | covering `idx_tours_status` + temp sort | 136,256 | 0 normally (only if a category runs short) |
| Q6 | `tours.ts:20` (`/tours/:id`) | `SELECT *` | rowid | 1 | 1 |
| Q7 | `tours.ts:46` (`/enrichment`) | id, description, image_urls_json, status | rowid | 1 | 1 |
| Q8 | `tours.ts:87-92` (`/tours/batch`) | same as Q7, `id IN (...)` | rowid | up to 50 | 1 |
| Q9 | `tours.ts:118` (`/card`) | `SELECT *` | rowid | 1 | 1 |
| Q10 | `right-now.ts:41-52` (`/right-now/tours`) | 16 card columns incl. timezone; filters status, timezone, image_url, rating >= 4.0; `ORDER BY RANDOM() LIMIT 1` | `idx_tours_timezone` + temp sort | size of that timezone group (avg 472, max 7,936) | one per timezone tried until `count` hits |
| Q11 | `right-now.ts:77-82` (`/right-now/timezones`) | DISTINCT timezone | `idx_tours_status` + row lookup + temp sort | 136,256 | 1 |
| Q12 | `superlatives.ts:15-46` (`/superlatives`, `/superlatives/:type`) | 15 card columns; six fixed queries filtering price, rating, review_count, duration; `ORDER BY ... LIMIT 10` | `idx_tours_status` + row lookup + temp sort (all six) | 136,256 each | 6 for the list (817,536), 1 for a single type |
| Q13 | `chains.ts:35` (`/chains`) | `SELECT *` | full scan | 491 | 1 |
| Q14 | `chains.ts:51` (`/chains/slugs`) | slug | covering `idx_chains_slug` | 491 | 1 |
| Q15 | `chains.ts:67` (`/chains/count`) | COUNT(*) | covering `idx_chains_slug` | 491 | 1 |
| Q16 | `chains.ts:83` (`/chains/random`) | `SELECT * ORDER BY RANDOM() LIMIT 1` | full scan + temp sort | 491 | 1 |
| Q17 | `chains.ts:105` (`/chains/:slug`) | `SELECT * WHERE slug = ?` | `idx_chains_slug` | 1 | 1 |
| Q18 | `trivia.ts:52-54`, `:379-381` | trivia_daily.question_ids_json by date | primary key | 1 | 1 |
| Q19 | `trivia.ts:85-91` (assembly) | trivia_pool.id by format, `used_date IS NULL`, `ORDER BY RANDOM()` | `idx_trivia_pool_format` + temp sort | up to 200 | 5 on the first request of a day |
| Q20 | `trivia.ts:95`, `:106` (assembly) | UPDATE trivia_pool.used_date by id | rowid | 1 written | up to 5 |
| Q21 | `trivia.ts:100-103` (assembly fallback) | oldest used question of a format | `idx_trivia_pool_format` + temp sort | up to 200 | only when a format is exhausted |
| Q22 | `trivia.ts:116-118` (assembly) | INSERT OR IGNORE trivia_daily | | 1 written | 1 |
| Q23 | `trivia.ts:127-129` | trivia_pool id, format, question_json `IN (...)` | rowid | 5 | 1 |
| Q24 | `trivia.ts:189-191` (`/answer`) | question_json by id | rowid | 1 | 1 |
| Q25 | `trivia.ts:263-265` (`/score`) | trivia_scores by date and session_hash | `idx_trivia_scores_date` | rows for that date | 1 |
| Q26 | `trivia.ts:272-283` (`/score`) | INSERT trivia_scores | | 1 written | 1 |
| Q27 | `trivia.ts:302-350` (`/stats`) | trivia_scores aggregates; GROUP BY score; GROUP BY country with `HAVING players >= 3` (alias in HAVING); percentile count | `idx_trivia_scores_date` | rows for that date | 2 to 4 |
| Q28 | `trivia.ts:394-400` (`/practice`) | trivia_pool with optional format and `id NOT IN (...)`, `ORDER BY RANDOM()` | covering `idx_trivia_pool_used` scan (no format) or `idx_trivia_pool_format` | 1,235 or up to 200 | 1 |

### 2.3 What that costs per page view

| Page or call | API calls behind it | Rows visited now | After ANALYZE plus indexes on duration_minutes and review_count (2.4) |
|:-|:-|:-|:-|
| `/` (server render) | timezones, right-now (count 1), superlatives, chains/count | about 955,000 | about 48,000 |
| `/` (browser) | roulette/hand | 953,792 | about 136,000 |
| `/` total | | about 1.9 million | about 184,000 |
| `/right-now` | timezones, right-now (count 6) | about 140,000 | about 3,000 |
| `/worlds-most` | superlatives | 817,536 | about 46,000 |
| `/worlds-most/[slug]` | superlatives/:type | 136,256 | 10 to 46,000 |
| `/about` | stats | 408,768 | 408,768 (COUNT DISTINCT still scans) |
| `/roulette/[id]` | tours/:id (deduplicated by React cache) | 1 | 1 |
| `/six-degrees` | chains/random + 5 tours/:id | about 500 | about 500 |
| `/six-degrees/[slug]` | chains/:slug + 5 tours/:id | 6 | 6 |
| `/sitemap.xml` | chains/slugs | 491 | 491 |
| OG images | right-now: like `/right-now` count 1; worlds-most: one superlative; roulette and six-degrees: 1 | up to 136,256 | small |

Local timings on a warm cache show the shape: one 136K row `idx_tours_status` query takes about 75 ms; the same roulette query forced onto `idx_tours_weight` for the wildcard category takes about 1 ms. On the droplet the tours table (454 MiB) competes for 1 GB of RAM with two Node processes, which likely explains why the same work takes seconds there (13.05 s for six superlative queries).

### 2.4 Effect of statistics (tested on a scratch copy)

After creating the same indexes on a copy and running `PRAGMA optimize=0x10002` (which runs ANALYZE):

| Query | Plan after | Rows visited |
|:-|:-|:-|
| Roulette category | `idx_tours_weight` | category size (wildcard 1,428; exotic_location 87,300). A full hand still visits about 136K rows in total, because `ORDER BY RANDOM()` reads the whole category. |
| most-expensive | `idx_tours_price` range | 10 |
| cheapest-5star | `idx_tours_price` | 39 |
| hidden-gem | `idx_tours_rating` (rating >= 4.8) | 46,100 |
| longest, shortest, most-reviewed | still `idx_tours_status` | 136,256 each (no index on duration_minutes or review_count) |
| DISTINCT timezone | skip scan on `idx_tours_timezone` | 289 |
| `/stats` COUNT DISTINCT | still `idx_tours_status` | 136,256 each |

Adding indexes on `duration_minutes` and `review_count` should turn the three remaining superlatives into short index range scans (estimate, not measured).

### 2.5 D1 compatibility notes

- **Bound parameters: limit 100 per query.** Roulette binds the category, every excluded id and the limit. The client sends up to 200 seen ids (`RouletteView.tsx:8`, server cap `roulette.ts:191`), plus up to 19 ids picked earlier in the same hand. Worst case 221 parameters. On D1 this fails once a visitor has spun about 80 tours in one session (O3). Batch (50 + 0) and practice (at most 6) are fine.
- SQL statement length (100 KB), result size (50 MB, enforced from 2026-11-04; the largest result is `/chains` at about 0.9 MB), query duration (30 s): all fine.
- Functions and syntax used: `RANDOM()`, `COUNT(DISTINCT)`, `ROUND`, `AVG`, `MAX`, `MIN`, `HAVING` on a select alias, `INSERT OR IGNORE`, `WHERE 1=1`, `IN (...)` lists. All core SQLite, which D1 runs. The backend parses all JSON columns in JavaScript; it uses no SQLite JSON functions.
- `db.ts` pragmas (`journal_mode = WAL`, `busy_timeout`) and the `readonly: true` connection have no D1 equivalent; drop them.
- `AUTOINCREMENT` tables mean a `sqlite_sequence` table exists (4 rows). The `tours` table has a `CHECK (rating >= 0 AND rating <= 5)` constraint. Both are ordinary SQLite.
- The code uses no explicit transactions. D1 offers atomic groups only through `db.batch()`.
- D1 retries read only queries automatically, never writes.
- Queries per Worker invocation: 50 on Free, 1,000 on Paid. `/right-now/tours` issues one query per timezone tried, bounded only by the input list.


## 3. Trivia

### 3.1 How the date is computed

- `todayUTC()` is `new Date().toISOString().slice(0, 10)` (`trivia.ts:39-41`): the UTC calendar day. The day rolls over at 00:00 UTC. Cloudflare's Free plan daily limits reset at the same moment.
- `dayNum` is whole days since 2026-01-01 UTC (`trivia.ts:70-73`).
- Five slots (`trivia.ts:75-80`): warm up (`higher_or_lower` on even days, `odd_one_out` on odd), geography (`where_in_world` even, `city_personality` odd), `real_or_fake`, `the_connection`, and a wild card that cycles `numbers_game`, `higher_or_lower`, `odd_one_out`, `where_in_world`, `city_personality` by `dayNum % 5`. Two slots can share a format (for example days with `dayNum % 10 == 6`); the second still gets a different question because the first is already marked used.

### 3.2 Write paths

| Write | When | Code |
|:-|:-|:-|
| `trivia_pool.used_date = <date>` for each picked question | first assembly of a date | `trivia.ts:95`, `:106` |
| Pick rule: a random unused question of the format; if none, the oldest used one (`ORDER BY used_date ASC LIMIT 1`), which is stamped again | same | `trivia.ts:85-107` |
| `INSERT OR IGNORE INTO trivia_daily (date, question_ids_json)` with a JSON array of up to 5 ids | same | `trivia.ts:116-118` |
| `INSERT INTO trivia_scores (date, score, session_hash, country_code, answers_json)` after a SELECT for duplicates | `POST /trivia/score` | `trivia.ts:263-283` |

Assembly is triggered by `GET /trivia/daily` and by `GET /trivia/results` for any `date` string. The five UPDATEs and the INSERT are separate auto commits. If the process dies midway, the stamped questions are burned and the next request assembles a fresh set. If the pool yields nothing, it returns `[]` and writes no daily row (`trivia.ts:111-113`).

Pool budget: `real_or_fake` and `the_connection` are used every day (200 each, so about 200 days). `numbers_game` (35 questions) is used every fifth day, so it lasts about 175 days. After that the fallback recycles the oldest question. Locally every `used_date` is NULL; production values were not read.

Country: `X-Country-Code` is set by nginx from MaxMind GeoLite2 Country for `/api/v1/` (`tourgraph.conf:7-10`, `:72`). nginx overrides any client supplied value and sends no header when the lookup is empty, which the code stores as NULL. On Cloudflare the equivalent is `request.cf.country` (same value as `CF-IPCountry`), which uses `XX` for unknown and `T1` for Tor.

### 3.3 Races

- **Today: none.** One API process (`ecosystem.config.cjs:40`) and synchronous better-sqlite3 calls mean `getOrAssembleDaily` runs start to finish without another request interleaving.
- **On D1: assembly can split.** Every statement becomes an `await`. Two first requests of a day (in any isolates) can both find no `trivia_daily` row, both pick and stamp questions (up to 10 burned), and both run `INSERT OR IGNORE`. The first insert wins. The second request returns its own picks, which differ from the stored set: that player sees a different daily quiz than everyone else, and a later `/trivia/results` returns the stored set. Cheap fix: after the insert, read `trivia_daily` back and return the stored ids.
- **On D1: duplicate scores.** The duplicate check is SELECT then INSERT, and the schema has no unique constraint on (date, session_hash). Two concurrent submissions from one session can both insert. Cheap fix: a unique index plus `INSERT OR IGNORE`, returning 409 when nothing was written.
- **Any date assembles.** `GET /trivia/results?date=<anything new>` stamps up to five pool questions and stores a `trivia_daily` row under that key. A value that is not a date makes `dayNum` NaN: four slots resolve (`odd_one_out`, `city_personality`, `real_or_fake`, `the_connection`) and get stamped, then the wild card slot is `undefined`. How better-sqlite3 handles binding `undefined` was not tested here (the package is not installed locally); if it throws, the request returns 500 after four writes and can be repeated. About 250 such requests would drain the pool (O6).


## 4. Data sizing

### 4.1 Tables

File: 507,211,776 bytes (483.7 MiB), 123,831 pages of 4,096 bytes, freelist 0, UTF-8. Sizes from `dbstat`, including overflow pages.

| Table | Rows | Bytes on disk | Read by backend |
|:-|:-|:-|:-|
| tours | 136,303 (136,256 active, 47 inactive) | 476,073,984 (454.0 MiB) | yes |
| tours indexes (9, listed in 2.1) | | 25,083,904 total (largest `idx_tours_indexed` 4,329,472) | weight, status, timezone used; `idx_tours_indexed`, `idx_tours_destination`, `idx_tours_product_code` unused |
| city_readings | 1,799 | 2,453,504 | no |
| city_profiles | 910 | 1,298,432 (+24,576 index) | no |
| six_degrees_chains | 491 | 1,019,904 (+36,864 indexes) | yes |
| trivia_pool | 1,235 | 864,256 (+49,152 indexes) | yes |
| destinations | 3,380 | 200,704 (+49,152 index) | no |
| trivia_daily | 0 locally | 4,096 | yes, read and write |
| trivia_scores | 0 locally | 4,096 (+8,192 indexes) | yes, read and write |
| superlatives | 0 | 4,096 | no (never populated) |
| indexer_state | 1 | 4,096 | no |
| sqlite_sequence | 4 | 4,096 | no |

Inside `tours`, the leaf pages hold 300.7 MB of payload and 131.8 MB of unused space; overflow pages hold another 39.7 MB. The unused space comes mostly from wide rows (about 2.5 KB average) on 4 KB pages, not from deleted data: a fresh copy has the same ratio.

### 4.2 Large columns in `tours` (sum of byte lengths)

| Column | Bytes | Read by backend |
|:-|:-|:-|
| image_urls_json | 148,690,311 (avg 1,091, max 71,557) | yes (detail, enrichment) |
| description | 84,067,364 (avg 614, max 3,609) | yes (detail, enrichment) |
| viator_url | 20,852,394 | yes |
| inclusions_json | 18,405,629 | yes (detail) |
| image_url | 11,741,406 | yes |
| one_liner | 11,481,677 | yes |
| tags_json | 7,361,932 | no |
| title | 6,912,740 | yes |
| summary_hash | 4,360,176 | no |
| supplier_name | 2,753,042 | yes (detail) |
| indexed_at, last_seen_at | 2,589,757 each | no |
| timezone | 1,942,672 | yes |
| weight_category | 1,933,487 | yes |
| destination_name | 1,170,423 | yes |
| product_code | 1,152,236 | yes |
| continent | 1,037,345 | yes |
| country | 946,240 | yes |
| status | 817,912 | yes |
| destination_id | 587,782 | no |
| currency | 408,909 | selected, never returned |
| highlights_json | NULL in every row | selected via `SELECT *`, always `[]` |

Numeric columns (id, rating, review_count, from_price, duration_minutes, latitude, longitude) are small. latitude and longitude are not read by the backend.

Image hosts: 136,301 `image_url` values are on `media-cdn.tripadvisor.com` and 2 on `dynamic-media-cdn.tripadvisor.com`; every `image_urls_json` entry is on tripadvisor.com.

### 4.3 What the backend actually reads

- Tables: `tours`, `six_degrees_chains`, `trivia_pool`, `trivia_daily`, `trivia_scores`.
- `tours` columns: id, product_code, title, description, one_liner, destination_name, country, continent, timezone, rating, review_count, from_price, currency, duration_minutes, image_url, image_urls_json, highlights_json, inclusions_json, viator_url, supplier_name, weight_category, status (22 of 29).
- Not read: destination_id, latitude, longitude, tags_json, indexed_at, last_seen_at, summary_hash (about 20 MB together).

### 4.4 Slim database (measured on a scratch copy)

| Variant | Size |
|:-|:-|
| Full file today | 507,211,776 bytes |
| Slim: 5 tables, 22 `tours` columns, all 136,303 rows, no secondary indexes, 4 KB pages | 437,346,304 bytes |
| Same, 16 KB pages (`VACUUM INTO`) | 352,829,440 bytes |
| `tours` payload in the slim copy | about 320 MB |
| SQL text dump of the slim `tours` table | 331,919,041 bytes |
| Secondary indexes the queries need (weight, status, timezone, price, rating, plus duration_minutes and review_count) | about 15 to 20 MB (estimate from current index sizes) |
| Card columns only (the 16 columns roulette, right-now and superlatives read) | 70,238,208 bytes |
| Detail only columns (description, image_urls_json, inclusions_json, supplier_name) | 253,916,346 bytes of payload |

So a slim D1 database is about 0.45 GB. That fits the Free plan's 500 MB per database cap only narrowly; the full file does not fit. On Workers Paid the cap is 10 GB, and 5 GB of storage is included.


## 5. Web app

### 5.1 Pages

All pages are server components unless noted. "Dynamic" means rendered per request: every data fetch uses `cache: "no-store"` (`web/src/lib/api.ts:9`), and the build's prerender manifest lists only `/privacy`, `/story`, `/support`, `/robots.txt`, the icons and the not-found pages as static.

| Route | Rendering | api.ts calls | Metadata and OG | Notes |
|:-|:-|:-|:-|:-|
| `/` (`app/page.tsx`) | dynamic | `getTimezones` + `getRightNowTours(tzs, 1)` inside try/catch (`:20-34`); `getAllSuperlatives`, `getChainCount` without a catch (`:37-41`) | layout defaults only | Renders client `RouletteView`, which fetches `/api/v1/roulette/hand` from the browser. Teaser copy bug (O11). |
| `/roulette/[id]` | dynamic | `getTourDetail` via React `cache()` shared by `generateMetadata` and the page (`:17`) | title, description from `oneLiner`, og:image `/api/og/roulette/<raw id>`, og:type article, twitter summary_large_image (`:29-59`) | Invalid or unknown id calls `notFound()` (`:64`, `:67`) and renders `roulette/[id]/not-found.tsx`. Live: 0.39 s, 47 KB. |
| `/right-now` | `force-dynamic` (`:21`) | `getTimezones`, `getRightNowTours(tzs, 6)` | static metadata, og:image `/api/og/right-now` (`:23-40`) | No catch: API failure shows the error boundary. |
| `/worlds-most` | `force-dynamic` (`:11`) | `getAllSuperlatives` | static, og:image `/api/og/worlds-most/most-expensive` | Copy says "Superlatives from 4,000+ tours" (`:43`). |
| `/worlds-most/[slug]` | `force-dynamic` (`:55`) | `getSuperlative` via `cache()` | dynamic; description `"<title>: <tour> (U+2014) <stat>"` (`:35`); og:image `/api/og/worlds-most/<slug>` | Unknown slug: `notFound()` (`:59`). `web/src/app/README.md` mentions `generateStaticParams`, which the code does not have. |
| `/six-degrees` | `force-dynamic` (`:11`) | `getRandomChain`, then `getTourDetail` for each of the 5 stops (`:50-51`) | static; openGraph has no image (`:13-28`) | Client `SurpriseMeButton` calls `router.refresh()` to get another random chain. |
| `/six-degrees/[slug]` | dynamic | `getChainBySlug` via `cache()`, then 5 `getTourDetail` | title `"<from> to <to> (U+2014) Six Degrees"` (`:24`), og:image `/api/og/six-degrees/<slug>` | `notFound()` (`:48`). Share button bug (O11). |
| `/about` | dynamic (no-store fetch) | `getStats` | openGraph without image | No catch. |
| `/story`, `/privacy`, `/support` | static | none | static | |
| `/robots.txt` (`robots.ts`) | static | none | | Allow all; sitemap `https://tourgraph.ai/sitemap.xml`. Live: served with `x-nextjs-cache: HIT`. |
| `/sitemap.xml` (`sitemap.ts`) | dynamic | `getChainSlugs` (in a try/catch) | | Live: 503 URLs = 6 static pages + 6 superlative pages + 491 chains. Tour pages, `/privacy` and `/support` are not listed. |
| `/icon.svg`, `/apple-icon.png` | static file routes | | | |

Errors: `app/error.tsx` is a client error boundary ("Something went wrong") returning HTTP 500. Three dynamic routes have their own `not-found.tsx`.

Not used anywhere in `web/src`: `headers()`, `cookies()`, `searchParams`, `revalidate`, `generateStaticParams`, server actions, `after()`, `draftMode`. No middleware (the build's middleware manifest is empty).

### 5.2 OG image routes

| Route | Data | Remote fetches at render | Errors |
|:-|:-|:-|:-|
| `/api/og/roulette/[id]` | `getTourDetail` | `<img src={tour.imageUrl}>` (TripAdvisor) | 404 text `Not found` |
| `/api/og/right-now` | `getTimezones`, `getRightNowTours(tzs, 1)` | tour image | 404 text `No tours available`; an API error is not caught, so 500 |
| `/api/og/worlds-most/[slug]` | `getSuperlative` (its own random pick, which may differ from the page, O15) | tour image | 404 `Invalid superlative type`, 404 `No tour found for this superlative` |
| `/api/og/six-degrees/[slug]` | `getChainBySlug` | none (text only) | 404 `Chain not found` |

All four set `export const runtime = "nodejs"` and render 1200x630 with `next/og` `ImageResponse`. None loads a font or reads a file itself; `fontFamily: "system-ui, sans-serif"` matches no supplied font, so `next/og` falls back to its bundled default font, which its Node build reads with `readFileSync`, and renders with `yoga.wasm` and `resvg.wasm`. (Checked in the Next 16.4.3 now present in `web/node_modules`, where the bundled font is `Geist-Regular.ttf`; the committed lockfile pins 16.1.6, which was not inspected.) For glyphs missing from that font (the star in the roulette stats, the arrow in six-degrees) `next/og` can fetch font subsets from `fonts.googleapis.com` at render time. Live: `/api/og/six-degrees/rome-tokyo` took 0.96 s and returned a 71 KB PNG with `Cache-Control: public, max-age=0, must-revalidate` and all the Next security headers, so OG images are re-rendered on every crawler hit.

### 5.3 Images

`next/image` is used in `Logo.tsx:11-17` (local `/logo-white.png`, priority), `TourCard.tsx`, `ChainTimeline.tsx`, `roulette/[id]/page.tsx` (hero plus up to 4 gallery images), `right-now/page.tsx`, `worlds-most/page.tsx` and `worlds-most/[slug]/page.tsx`. The default loader routes every image through `/_next/image` (confirmed live for the logo). Build settings: `formats: ["image/webp"]`, `minimumCacheTTL: 14400`. `remotePatterns` allow `**.tripadvisor.com`, `**.cloudfront.net`, `**.viator.com` (`next.config.ts:4-19`); the data only uses tripadvisor.com. The source images are already 720x480 JPEGs from TripAdvisor's CDN.

Public files: `logo-white.png` (34,867 bytes), `social-card.png` (51,842 bytes, the site default og:image), `social-card.html` (2,533 bytes, publicly reachable at `/social-card.html`).

### 5.4 Browser side fetches

Only one: `RouletteView.tsx:31` fetches `/api/v1/roulette/hand?exclude=<ids>` (same origin, allowed by `connect-src 'self'`). It keeps the last 200 seen ids (`:8`, `:68`) and aborts in-flight requests. `ShareButton` uses `navigator.share` or the clipboard; no network.

### 5.5 Environment variables

| Variable | Read by | Value in production |
|:-|:-|:-|
| `API_URL` | `web/src/lib/api.ts:4` | Not set in `ecosystem.config.cjs:11-14`, so the default `http://localhost:3001` is used |
| `NODE_ENV`, `PORT` | Next and Express | set by PM2 (`ecosystem.config.cjs:12-13`, `:44-45`) |
| `PORT` | `backend/src/index.ts:13` | 3001 |
| `DATABASE_PATH` | `backend/src/db.ts:14` | `/opt/app/data/tourgraph.db` (`ecosystem.config.cjs:46`) |

Next loads `web/.env` and `web/.env.local` automatically. They hold only pipeline variables (names: `FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY`, `VIATOR_API_KEY`, `VIATOR_SANDBOX_KEY`, `DATABASE_PATH`, `INDEXER_INTERVAL_MINUTES`), which no web code reads. Both files are git ignored. `dotenv` is a web dependency but `web/src` never imports it.

### 5.6 Node only APIs

Web app code: none besides `process.env.API_URL`. The OG routes declare the Node runtime; the `fs` use is inside `next/og`. Backend: `path`, `process.env`, `process.uptime`, `process.on("exit")`, module scope `setInterval`, and the native `better-sqlite3` module.

### 5.7 Security headers (`next.config.ts:22-52`, all routes)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; img-src 'self' https://*.tripadvisor.com https://*.cloudfront.net https://*.viator.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'
```

The layout loads `https://www.googletagmanager.com/gtag/js?id=G-LMSTJHBDPZ` with `next/script` `afterInteractive`, plus an inline `gtag` setup (`layout.tsx:145-154`). The inline part runs (`'unsafe-inline'`), but `script-src` does not allow googletagmanager.com and `connect-src` does not allow Google's collection endpoints, so no analytics can load or send (O5). The JSON-LD block (`layout.tsx:155-158`) is data, not script, and is unaffected.


## 6. Deploy behaviors to replicate

### 6.1 nginx (`deployment/nginx/tourgraph.conf`)

| # | Behavior | Ref | Live |
|:-|:-|:-|:-|
| N1 | `http://tourgraph.ai/*` and `http://www.tourgraph.ai/*` return 301 to `https://tourgraph.ai$request_uri` | `:13-25` | `http://tourgraph.ai/about?x=1` gave 301 to `https://tourgraph.ai/about?x=1` |
| N2 | `https://www.tourgraph.ai/*` returns 301 to the apex, path and query kept; no HSTS on this response | `:28-36` | confirmed |
| N3 | TLS 1.2 and 1.3; HTTP/2 on the apex | `:40-50` | HTTP/2 seen |
| N4 | HSTS `max-age=63072000; includeSubDomains; preload` on every apex response, errors included (`always`). Next sends the same header, so web responses carry it twice. | `:53` | duplicate seen |
| N5 | gzip for text, CSS, JSON, JS, XML, SVG of 1,000 bytes or more | `:56-59` | |
| N6 | Request body cap 1 MB (413 above it) | `:62` | |
| N7 | `/api/v1/` to Express; everything else to Next | `:65-116` | |
| N8 | `/api/ios/` rewrites (1.5) | `:84-93` | confirmed |
| N9 | `X-Country-Code` from GeoIP2 on `/api/v1/` only, overriding any client value | `:72` | |
| N10 | `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` to both upstreams | `:68-71`, `:89-92`, `:101-104` | |
| N11 | Upstream read timeouts: API 30 s, web 60 s (then 504) | `:74-76`, `:108-110` | |
| N12 | `Server: nginx/1.24.0 (Ubuntu)` | | seen |
| N13 | ACME challenge path for Let's Encrypt | `:18-20`, `:119-121` | |

### 6.2 Express (API responses)

`Access-Control-Allow-Origin: *` and 204 preflights, per route `Cache-Control` (table in 1.3), `X-Powered-By: Express`, weak ETag with 304s, 404 HTML for unknown paths. Of these, the CORS header and the Cache-Control values are the ones a client could depend on.

### 6.3 Next.js

| # | Behavior | Live |
|:-|:-|:-|
| X1 | Security headers in 5.7 on every Next response, including OG images and the sitemap | seen on `/sitemap.xml`, `/api/og/...` |
| X2 | `X-Powered-By: Next.js` | seen on `/roulette/2` |
| X3 | Dynamic pages: `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` | seen on `/roulette/2` |
| X4 | Static routes, sitemap and OG images: `public, max-age=0, must-revalidate` | seen |
| X5 | `Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch` plus `Accept-Encoding` | seen |
| X6 | `/_next/static/*` long lived immutable caching; trailing slash URLs redirect to the slashless form (308) | Next defaults, not measured |
| X7 | `/_next/image` optimizer | seen in HTML |
| X8 | Metadata routes `/robots.txt`, `/sitemap.xml`, `/icon.svg`, `/apple-icon.png` | seen |

### 6.4 DNS (looked up 2026-11-01)

Nameservers `dorthy.ns.cloudflare.com` and `walt.ns.cloudflare.com`. A records for the apex and www both point at 143.244.186.165; responses carry no `cf-ray`, so they are not proxied. MX `tourgraph-ai.mail.protection.outlook.com`, SPF for Outlook, and a Google site verification TXT record also live in this zone and must stay.


## 7. Observations

Severity is about impact today. "Move" says whether the move should handle it.

| # | Observation | Severity | Move |
|:-|:-|:-|:-|
| O1 | No `sqlite_stat1`, so the planner scans `idx_tours_status` for roulette, superlatives, timezones and stats (section 2). This is the main cause of 13 to 21 s homepages. | High | Yes. Cheap: run `PRAGMA optimize` after import and add indexes on `duration_minutes` and `review_count`. |
| O2 | Home (`page.tsx:37-41`), `/right-now`, `/worlds-most`, `/about` and the right-now OG image do not catch API errors. A slow or failed API call becomes the error boundary (HTTP 500). Likely source of the 500 seen on the homepage. | Medium | O1 removes the cause. Adding catches is optional. |
| O3 | Roulette can bind up to 221 parameters; D1 allows 100. | High on D1 | Yes. Pass the exclude list as one JSON parameter (`id NOT IN (SELECT value FROM json_each(?))`), which keeps the API unchanged. |
| O4 | In-memory roulette rate limiter with a module scope `setInterval` (1.6). | Blocks the move | Yes. Remove, or replace with a Cloudflare rate limiting rule. |
| O5 | CSP blocks Google Analytics, so nothing has been collected since it was added on 2026-06-09. The privacy page says "No analytics, no tracking, no advertising identifiers, no cookies, and no third-party SDKs" (`privacy/page.tsx:33-35`), and the about page and site description say "No tracking". Making GA work would make the privacy page false. | Medium | Owner decides: remove GA, or allow it in the CSP and rewrite the privacy page. |
| O6 | `GET /trivia/daily` and `GET /trivia/results` write. `/trivia/results` accepts any `date` and burns up to five pool questions per new value (3.3). | Low (unused) | Cheap while porting: validate `date` as an existing assembled day or today. |
| O7 | `options[].tourId` appears only on the correct option in all 200 `real_or_fake` and all 200 `where_in_world` questions, so `/trivia/daily` and `/trivia/practice` reveal those answers. | Low (unused) | No for a straight move (changes JSON). Owner decides. |
| O8 | Trivia assembly race and duplicate score race once on D1 (3.3). | Low today | Yes, cheap (read back after insert; unique index). |
| O9 | `/trivia/results` returns answers for today with no completion check. | Low | No. |
| O10 | `/tours/:id` serves the 47 inactive tours; `/card` and `/enrichment` do not. | Low | No; keep behavior and keep those rows. |
| O11 | Content bugs: the Six Degrees detail Share button passes `tourId={chain.id}` with no `url` (`six-degrees/[slug]/page.tsx:92-96`), so it shares `/roulette/<chain id>`, a random tour. The homepage teaser says "The longest takes X" using the most expensive tour's duration (`page.tsx:100-102`). | Low to medium | Share button is a one line fix; optional. |
| O12 | Right Now sends timezones unencoded (`api.ts:108`). `Etc/GMT+7` arrives as `Etc/GMT 7`, so its 5 tours never appear. A duplicate timezone ends the loop instead of skipping it (`right-now.ts:39`). | Low | Encode if this code is touched. |
| O13 | Express 5 edge cases: POST without a JSON content type returns 500 instead of 400; a repeated query key (`?exclude=1&exclude=2`) returns 500. | Low | Rewritten handlers fix this naturally. |
| O14 | Every page declares `<link rel="canonical" href="https://tourgraph.ai">` because the layout sets `alternates.canonical` (`layout.tsx:16-18`) and no page overrides it. Confirmed live on `/roulette/2`. Search engines are told every page duplicates the homepage. | Medium (SEO) | Cheap: drop it from the layout or set it per page. Worth doing if the layout is touched. |
| O15 | The worlds-most OG image picks its own random top 10 tour, so the preview can show a different tour than the page. | Low | No. |
| O16 | Pages that set `openGraph` without `images` (`/six-degrees`, `/about`, `/story`) replace the layout's openGraph, so their previews have no image. | Low | No. |
| O17 | Stale numbers in copy: "4,000+ tours" (`worlds-most/page.tsx:43`), "300K+" (FeatureNav, homepage fallback text), "3,380 destinations" (`layout.tsx:7`) against 136,256 tours and 2,645 destinations from `/stats`. | Low | No. |
| O18 | `highlights` is always `[]`: `highlights_json` is NULL in every row. | Info | No. |
| O19 | `POST /tours/batch` sends a public Cache-Control on a POST, and returns rows in rowid order, not request order. | Info | No. |
| O20 | Unused surface: `/tours/:id/card`, `/chains`, `/trivia/results`; `getRouletteHand` and `getTourCard` in `api.ts`. | Info | Keep for a straight move, or drop with the owner's agreement. |
| O21 | `idx_tours_product_code` duplicates the UNIQUE autoindex (2.6 MB). `idx_tours_indexed` and `idx_tours_destination` are unused by the backend. | Info | Skip them in the slim database. |
| O22 | Next image optimization resizes TripAdvisor images that are already 720x480, on a single small droplet. | Low | See R6. |
| O23 | OG images are not cached (`max-age=0`), so each crawler hit re-renders and re-fetches the remote photo. | Low | Optional. |
| O24 | Pipeline API keys sit in `web/.env` (names in 5.5) and are loaded by Next at build time although the web app never reads them. | Low | Make sure they are not copied into Worker variables or secrets. |
| O25 | `deployment/scripts/deploy-db.sh:37`, `:48` stop and start a PM2 app named `tourgraph`, which no longer exists (the apps are `tourgraph-web` and `tourgraph-api`). | Info | Goes away with the droplet. |
| O26 | `getClientIp` treats all of 172.0.0.0/8 as private; only 172.16.0.0/12 is. | Info | Goes away with the limiter. |
| O27 | HSTS is sent twice on web responses; the www redirect sends none. | Info | Goes away. |
| O28 | `data/tourgraph.db` and its `-shm` file show modification times from today (01:17 and 01:24 EST), from a process other than this review. git reports the LFS file unchanged. | Info | Check that nothing writes to the canonical file before the D1 import. |


## 8. What this means for the move (recommendations)

These are recommendations, not decisions.

- **R1. Plan: Workers Paid ($5 per month).** The Free plan does not fit: 10 ms CPU per request is too little for Next server rendering and OG image rendering; the full database (507 MB) exceeds the 500 MB per database cap; 5 million rows read per day lasts about 2 to 3 homepage views with today's queries (about 27 after O1 is fixed); and importing 136,303 tour rows plus index entries exceeds 100,000 rows written per day. Paid includes 10 GB per database, 25 billion rows read and 50 million rows written per month.
- **R2. Import a slim database.** Five tables (`tours`, `six_degrees_chains`, `trivia_pool`, `trivia_daily`, `trivia_scores`), all 136,303 tour rows (the inactive ones are reachable via `/tours/:id`), and at least the 22 columns the backend reads. Skip `destinations`, `city_profiles`, `city_readings`, `superlatives`, `indexer_state`; they stay in the Git LFS file. Expect about 0.45 GB. Create only the indexes the queries use (weight, status, timezone, price, rating) plus `duration_minutes` and `review_count`, then run `PRAGMA optimize`. Decide whether production trivia rows matter; since nobody uses trivia, starting from the empty local tables is reasonable.
- **R3. Fix the query plans as part of the import (O1).** This is the cheapest change with the largest effect and needs no API change. A roulette hand still reads about 136,000 rows because of `ORDER BY RANDOM()` over whole categories; on Paid that is affordable, so leave the sampling alone unless cost data says otherwise.
- **R4. Keep the API contract byte for byte where clients could notice:** paths, status codes, JSON field names and types, `{"error": ...}` bodies, the `/api/ios` rewrites, `Access-Control-Allow-Origin: *`, and the per route Cache-Control values. Things no client depends on (`X-Powered-By`, ETags, the HTML 404 body) can change.
- **R5. Required code changes on Workers:** remove the in-memory limiter and its `setInterval` (O4; if a limit is wanted, use a Cloudflare rate limiting rule on `/api/v1/roulette/hand`); pass the roulette exclude list as one JSON parameter (O3); read the country from `request.cf.country` and store `XX` as NULL to match today's behavior; make trivia assembly read back the stored row after `INSERT OR IGNORE` and add a unique index for score de-duplication (O8); drop the SQLite pragmas.
- **R6. Images: set `images.unoptimized: true`.** The TripAdvisor CDN already serves sized JPEGs, the CSP already allows `*.tripadvisor.com`, and it avoids a Cloudflare Images binding and its per transformation billing. Image URLs change from `/_next/image?...` to the CDN URL; pages look the same.
- **R7. One Worker if the toolchain allows.** Today the web server calls the API over HTTP on localhost. On Cloudflare, have server components call the data layer in process (or through a service binding) instead of fetching the public URL, so a page render is not several Worker to Worker hops. Cloudflare now recommends vinext over OpenNext for new Next.js apps, but documents OpenNext as supported (including image optimization via Cloudflare Images). Either way, verify `next/og` `ImageResponse` (wasm plus its bundled font) on the chosen adapter early, because it is the piece most likely to differ from Node.
- **R8. Edge behaviors to recreate (section 6):** turn on "Always Use HTTPS" and HSTS (or keep it in Next headers); proxy the apex and www records; add a Redirect Rule for www to the apex (301, keep path and query); keep the MX, SPF and verification records. Compression is automatic. The 1 MB body cap and the 30 s and 60 s upstream timeouts do not need recreating. If the adapter serves static assets without running the Worker, Next's `headers()` will not apply to them; check, and use a `_headers` file if the CSP should cover them.
- **R9. Small fixes worth doing only because the code is being touched anyway:** the canonical tag (O14), the Six Degrees share link (O11), and encoding the Right Now timezone list (O12). Leave the other observations for later.
- **R10. Decide the analytics question before touching the layout (O5).** My suggestion is to remove the GA script: it has collected nothing since June, and keeping it would require changing the privacy policy.
- **R11. After the cut over:** confirm the live JSON for the deterministic endpoints (`/health` shape, `/tours/2`, `/chains/count`, `/right-now/timezones`, `/sitemap.xml` with 503 URLs, `/api/ios/tour/2`) against this document, then delete the droplet. The data pipeline still writes to local SQLite, so any future data refresh needs a new export and import step; with no refresh planned, the LFS file stays the source of truth.
