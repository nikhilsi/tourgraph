# Changelog

All notable changes to this project will be documented in this file.

For Phase 0 history (extraction pipeline, Viator comparison, MkDocs site), see `archive/CHANGELOG.md`.

---

## [7.0.0] - 2026-03-03

### iOS App Store Submission

- Submitted TourGraph v1.0 (build 1) to App Store — waiting for review
- Registered bundle ID `com.nikhilsi.TourGraph`, App ID `6759991920`
- Archived and uploaded build via CLI (`xcodebuild archive` + `xcodebuild -exportArchive`)
- Metadata pushed via App Store Connect API: description, keywords, promotional text, subtitle, privacy URL, categories (Travel + Entertainment), review notes
- 10 screenshots uploaded via API (6.9" and 6.1" display sizes)
- App Store metadata files created in `appstore/metadata/`
- Privacy: "Data Not Collected", age rating 4+, free pricing, no encryption

---

## [6.3.0] - 2026-03-03

### Code Review — Tier 4 + Polish

**Accessibility:**
- VoiceOver labels on favorite buttons (TourDetailView, TourCardView, SixDegreesView)
- Accessibility labels on settings gear icon (4 tab views)
- `aria-label` on web FeatureNav `<nav>` element

**SEO:**
- Added `robots.ts` + `sitemap.ts` — 491 chain URLs, 6 superlative detail pages, static pages
- Sitemap gracefully handles missing slug column on first deploy

**Bug Fixes:**
- Fixed `displayDuration` — 36h now shows "1d 12h", 90min shows "1h 30m" (was "1 day" / "1 hr")
- TourDetailView error state replaces infinite spinner when tour not found
- Renamed "Surprise Me" → "Show Me Another", scrolls to top on click

**Performance:**
- Cache headers (24h) on iOS enrichment endpoints (`/api/ios/tour/[id]`, `/api/ios/tours/batch`)
- TourCard image `priority` default changed from `true` to `false` (enables lazy loading)

**Cleanup:**
- `error.tsx` now logs error message + digest to console
- Removed dead `batchIds` parameter from TourDetailView
- Removed duplicate `preferredColorScheme(.dark)` from ContentView
- Removed unused `Link` import from story page

---

## [6.2.0] - 2026-03-03

### Code Review — Tiers 1-3

**Performance (Tier 1):**
- Six Degrees chain lookup by slug (was full table scan of 491 chains per request)
- Added `slug` column to `six_degrees_chains` with auto-migration for existing DBs
- `getChainCount()`, `getRandomChain()`, `getChainBySlug()` — targeted queries instead of loading all chains

**Security (Tier 1):**
- Parameterized SQL in iOS `DatabaseService` — replaced string-interpolated NOT IN with `StatementArguments`
- Safe URL unwrapping in iOS share sheets (was force-unwrapped)
- Rate limiter hardened: TTL eviction at 10K entries, rightmost X-Forwarded-For IP
- Removed `unsafe-eval` from CSP headers

**Batch Queries (Tier 2):**
- `getToursByIds()` — single batch query replaces N+1 individual lookups (web + iOS)
- iOS `pickRandom()` — 1 batch query instead of 5 individual fetches

**Error Handling (Tier 2):**
- iOS error states + retry UI on WorldsMost, RightNow, SixDegrees views
- `TourEnrichmentService` — do/catch with logger instead of silent `try?`
- Removed dead `prefetchHand()` method

**Shared Components (Tier 3):**
- `ChainTimeline.tsx` — extracted from 2 Six Degrees pages (~96 duplicated lines each)
- `superlatives.ts` — extracted from 3 World's Most files (titles, descriptions, stat formatters)
- Restored missing `formatPrice`/`formatDurationLong` imports broken during extraction

**iOS Concurrency (Tier 3):**
- `@MainActor` isolation on `AppSettings`, `Favorites`, `DatabaseService` (was `@Observable + Sendable` — unsound)
- Guard-let on `DatabaseService.init()` (was force-unwrap)
- Fixed `.sheet()` inside conditional body → moved to outer VStack
- Fixed stale `FavoritesListView` with `.onChange(of: favorites.tourIds)`

**Polish (Tier 3):**
- Health endpoint: `GET /api/health`
- Non-null timezone assertion → safe fallback (`?? "UTC"`)
- Fixed duplicate diamond emoji → hidden gem uses star
- Updated About page Six Degrees description (was "Coming soon")
- Removed hardcoded server IPs from docs

---

## [6.1.0] - 2026-03-03

### iOS — Seed DB, Enrichment, Polish

**Seed DB + Enrichment:**
- Built 120MB seed DB (down from 479MB) — descriptions truncated to ~200 chars, image galleries NULLed, 5 unused tables dropped, VACUUM'd
- Per-tour enrichment: `TourEnrichmentService.swift` fetches full descriptions + photo galleries from server on detail tap, writes to local DB
- Server endpoints: `GET /api/ios/tour/[id]`, `POST /api/ios/tours/batch`
- `os.Logger` integration (subsystem: "ai.tourgraph", category: "enrichment")

**Six Degrees Polish:**
- Tour photos on each stop (AsyncImage, 16:9 aspect ratio)
- Card backgrounds (`Color.white.opacity(0.05)`)
- Bright colors: pure white titles, yellow connection text, orange theme capsules
- Favorite heart overlay on tour photos (ZStack pattern)
- Tour stats row (rating, price, duration) on each stop
- `ViewThatFits` for long city names (horizontal → vertical fallback)
- "Show Me Another" button positioned above chain header
- Fixed null `theme` decode crash — `ChainLink.theme` changed from `String` to `String?`
- Deleted dead `ChainDetailView.swift` (replaced by inline timeline)

**New Views:**
- `FavoritesListView.swift` — shows favorited tours as TourCardView cards, navigates to TourDetailView
- `AboutView.swift` — app info, features with icons, stats (tours/destinations/countries), links to tourgraph.ai

**Settings Wiring:**
- Favorites row is now NavigationLink → FavoritesListView
- "About TourGraph" NavigationLink → AboutView
- `enrichmentService` threaded through all 4 tabs → SettingsView → FavoritesListView

**Bug Fixes:**
- Fixed FavoritesListView navigation — tapping a tour pushed detail then immediately covered it with duplicate list. Root cause: value-based NavigationLink + `.navigationDestination` on a pushed child view. Fix: destination-closure NavigationLinks.

**World's Most Variety (iOS + Web):**
- Superlative queries now `LIMIT 10` instead of `LIMIT 1`, random pick from top 10
- Each visit shows a different extreme tour while staying genuinely top-tier (10 of 136K)

### Updated
- `docs/implementation/ios-architecture.md` — seed DB 120MB (was ~210MB), enrichment complete, ChainDetailView removed, project structure updated, implementation order current
- `docs/product_brief.md` — iOS section corrected (bundled DB, not direct API calls)
- All tracking docs (CURRENT_STATE.md, NOW.md, CHANGELOG.md) updated

---

## [6.0.0] - 2026-03-03

### Complete — All 4 Data Layers + Gallery Redesign
- City intelligence (Layer 3): 910 city profiles from 1,799 readings via Claude Sonnet 4.6
- Chain generation (Layer 4): 491 chains from 500 city pairs via two-stage Batch API pipeline
- Six Degrees gallery redesigned as chain roulette (single random chain with full inline timeline)

### Added — Chain Generation Pipeline
- `src/scripts/4-chains/generate-chains-v2.ts` — Two-stage pipeline: Stage 1 (city picker, ~125K cached system prompt) + Stage 2 (chain builder, 30 tours × 5 cities). Batch API + prompt caching.
- `src/scripts/4-chains/generate-pairs.ts` — Scored greedy pair generator (Jaccard theme distance + tier mixing)
- `src/scripts/4-chains/curate-city-pool.ts` — AI-assisted city pool curation from 910 profiles
- `src/scripts/4-chains/city-pool.json` — 100 curated endpoint cities (30 anchors, 40 gems, 30 surprises)
- `src/scripts/4-chains/chain-pairs.json` — 500 cross-continent city pairs
- Robust JSON parser with brace-depth tracking (handles Claude adding text after JSON)

### Changed — Six Degrees Gallery Redesign
- `src/app/six-degrees/page.tsx` — Replaced flat 491-card list with chain roulette: one random chain with full inline timeline (images, one-liners, stats, theme badges, connections)
- `src/app/six-degrees/SurpriseMeButton.tsx` — Simplified to `router.refresh()` (no slugs array)
- `src/components/ShareButton.tsx` — Added optional `url` prop for non-roulette share URLs
- `ios/.../SixDegreesView.swift` — Same chain roulette pattern: random chain with inline timeline + "Surprise Me"

### Updated
- All docs updated to reflect chain roulette design (six-degrees-chains.md, architecture.md, product_brief.md, ux_design.md, NOW.md, CURRENT_STATE.md)
- `docs/data-snapshot.md` — Layer 4 stats: 491 chains, ~$20 cost, ~2 hours
- `docs/data-schema.md` — Updated rebuild instructions for v2 generator

---

## [5.1.0] - 2026-03-02

### Complete — Data Fully Indexed
- Full indexer complete: 2,712 leaf destinations, 136,256 active tours, 474MB database (~20 hours)
- One-liner backfill complete: 136,256/136,256 tours (100% coverage) via Claude Haiku 4.5 (~14 hours)
- Batch backfill (126,498 tours) + retry (997 missed) + single-tour (15 holdouts) = zero gaps
- Word-boundary truncation fix: bumped max from 120→150 chars, clean cuts at word boundaries

### Added
- `docs/data-snapshot.md` — Complete data baseline: tour counts, field coverage, weight categories, continent/country/destination breakdowns, rating/price stats, one-liner quality metrics
- Privacy page (`/privacy`) — No-data-collection policy, matches site dark theme
- Support page (`/support`) — FAQ + contact, matches site dark theme
- `ios/TourGraph/.../PrivacyInfo.xcprivacy` — Apple privacy manifest (UserDefaults, CA92.1)
- `ios/ExportOptions.plist` — CLI archive/upload config (Team ID F66D7QPY4N)

### Updated
- All tracking docs (CURRENT_STATE.md, NOW.md, CHANGELOG.md) reflect data completion
- `docs/data-schema.md` — Updated rebuild instructions, deployment commands, current stats
- `docs/implementation/ios-app-store.md` — Bundle ID `com.nikhilsi.TourGraph`, signing info, pre-submission checklist progress

---

## [5.0.0] - 2026-03-01

### Deployed — https://tourgraph.ai is live!
- DigitalOcean droplet (Ubuntu 24.04, $6/mo, 1GB RAM, 1 vCPU)
- PM2 fork mode (single Next.js process, 800MB memory limit)
- Nginx reverse proxy with Let's Encrypt SSL (auto-renewal via certbot timer)
- HTTP → HTTPS redirect, www → non-www redirect
- UFW firewall (SSH + Nginx only) + fail2ban (SSH brute-force + nginx rate limit jails)
- Database deployed via SCP (158MB, 46K tours)
- All 17 routes verified 200 over HTTPS
- Server memory: ~300MB Next.js + ~150MB OS = ~450MB used, 500MB+ headroom

### Added — Deployment Infrastructure (11 files)
- `deployment/README.md` — Full deployment guide with architecture, troubleshooting
- `deployment/.env.production.example` — Environment variable template
- `deployment/nginx/tourgraph.conf` — Full SSL nginx config (HSTS, gzip, X-Forwarded-For)
- `deployment/nginx/tourgraph-pre-ssl.conf` — Temporary HTTP-only config for certbot
- `deployment/ecosystem.config.cjs` — PM2 config (fork mode, memory limit, logging)
- `deployment/scripts/setup.sh` — One-time: Node 20, PM2, nginx, build-essential, 1GB swap
- `deployment/scripts/setup-ssl.sh` — Let's Encrypt + auto-renewal
- `deployment/scripts/setup-firewall.sh` — UFW + fail2ban
- `deployment/scripts/deploy.sh` — Recurring: git pull, npm ci, build, pm2 reload
- `deployment/scripts/deploy-db.sh` — WAL checkpoint, SCP database to server
- `deployment/scripts/stream-logs.sh` — Stream PM2 logs from server

---

## [4.4.0] - 2026-03-01

### Added — Homepage Redesign & UX Polish
- Homepage tagline: "The world's most surprising tours. One tap at a time."
- Context line above roulette: "Press the button. Get a random tour from somewhere in the world."
- "More to explore" section with feature teaser cards (Right Now, World's Most, Six Degrees) pulling live data
- Tooltips (`title` attributes) across all pages: stats, buttons, FeatureNav links
- "Spin Your Own" viral loop closer on worlds-most and six-degrees detail pages

### Fixed
- FeatureNav: Six Degrees link pointed to `/` instead of `/six-degrees`

---

## [4.3.0] - 2026-03-01

### Added — Six Degrees UI (Phase 4)
- `src/app/six-degrees/page.tsx` — Gallery page: chain cards with city pair, summary quote, theme list, stop count, "Surprise Me" random button
- `src/app/six-degrees/SurpriseMeButton.tsx` — Client component for random chain navigation
- `src/app/six-degrees/[slug]/page.tsx` — Detail page: vertical timeline/stepper with numbered accent circles, tour cards with photos/stats, theme badge pills, italic connection text between stops
- `src/app/six-degrees/[slug]/not-found.tsx` — 404 with link back to gallery
- `src/app/api/og/six-degrees/[slug]/route.tsx` — OG image: dark bg, city pair headline, summary quote, mini chain visualization (numbered circles connected by line), city labels
- Chain query functions in `db.ts`: `getAllChains()`, `getChainBySlug()`, `chainSlug()`, types `ChainLink`, `ChainData`, `ChainWithMeta`
- v1 UI spec added to `docs/reference/phase4-six-degrees.md` with ASCII wireframes, design details, routes, data flow

### Status
- Full indexer running: ~613/2,712 destinations (22.6%), ~40K tours in DB
- Build + lint: zero errors (17 routes compile clean)

---

## [4.2.0] - 2026-03-01

### Added
- `src/scripts/4-chains/generate-chains.ts` — Production-grade Six Degrees chain generator: file logging, retries with backoff, chain validation (5 stops, unique cities/themes), dedup (skips existing), ETA tracking, final summary
- `src/scripts/4-chains/chain-pairs.json` — Config file for curated city pairs (placeholder, to be populated after data expansion)

### Fixed
- Duration display: "96 hrs" → "4 days", "1h" → "1 hr", "45m" → "45 min". Both `formatDurationShort` and `formatDurationLong` now normalize days/hours/minutes properly.

### Tested
- Basic UI sanity test: all 14 routes return 200 (homepage, right-now, worlds-most gallery + 6 detail pages, tour detail, hand API, 3 OG image endpoints)
- Data renders correctly across all features
- OG images generate on-demand (share preview requires deployed URL — expected)

---

## [4.1.0] - 2026-03-01

### Added — Phase 4 Research & Prototyping
- `docs/reference/phase4-six-degrees.md` — Full research doc: competitive analysis, thematic coverage, UX design, prompt engineering, test results
- `src/scripts/4-chains/test-chain.ts` — Chain generation test script (Claude Sonnet 4.6, ~$0.02/chain, ~12-14s)
- `data/chain-tests/` — 8 test chain outputs (6 v2, 2 v1 for comparison)
- Prompt v2 with "HARD RULES" — fixes chain length inconsistency and theme repetition (8/8 test runs produce exactly 5 stops with unique themes)

### Added — Indexer Hardening (Production-Scale)
- File logging: all output tees to `logs/indexer-<timestamp>.log` (no lost output)
- Leaf-node filtering: `--full` now indexes only leaf destinations (~2,712) instead of all 3,380 (skips countries/states that would cause duplicate tours)
- `--all-destinations` flag to override leaf filtering
- Per-destination timing with running ETA every 50 destinations
- Final summary block: start/finish, duration, destinations, tours, errors, API calls, DB size
- `getLeafDestinations()` in db.ts (LEFT JOIN to find destinations with no children)
- `getRequestCount()` public getter on ViatorClient
- `logs/` directory with `.gitkeep` (log files gitignored)

### Added — Reference
- `docs/reference/rate-limiting.md` — Viator API rate limiting documentation (16 req/10s per endpoint, rolling window)

### Discovered
- **Data gap**: Only 53 of 3,380 Viator destinations indexed (1.6%). `seed-dev-data.ts` hardcodes 43 destination IDs — was a dev seed, not production. Need to expand to ~2,712 leaf destinations (~100K tours expected).
- **Viator hierarchy**: Not country/state/city as assumed. Inconsistent depth (Rome at depth 1, San Francisco at depth 2). Correct approach: leaf nodes = destinations with no children.

---

## [4.0.0] - 2026-02-28

### Added — Phase 2: Right Now Somewhere
- `src/lib/timezone.ts` — Timezone helpers using `Intl.DateTimeFormat` (no external deps): golden hour detection, local time formatting, time-of-day labels
- `src/app/right-now/page.tsx` — Server component showing 6 golden-hour moment cards with local time + destination
- `src/app/api/og/right-now/route.tsx` — Dynamic OG image for Right Now feature page
- Homepage teaser: "Right now in {city}, it's {time}..." linking to `/right-now`
- `RightNowMoment` type, `getDistinctTimezones()`, `getRightNowTours()` queries in db.ts

### Added — Phase 3: The World's Most ___
- `src/app/worlds-most/page.tsx` — Superlatives gallery (6 cards: most expensive, cheapest 5-star, longest, shortest, most reviewed, hidden gem)
- `src/app/worlds-most/[slug]/page.tsx` — Superlative detail page with full tour info, stats, Viator booking link
- `src/app/worlds-most/[slug]/not-found.tsx` — 404 for invalid superlative slugs
- `src/app/api/og/worlds-most/[slug]/route.tsx` — Dynamic OG images with superlative badge + stat
- `SUPERLATIVE_QUERIES` map with data quality filters (price ≤ $50K, duration 30min-2wk, reviews ≥ 10 for gems)
- `SuperlativeType`, `SuperlativeConfig`, `SuperlativeResult` types
- `formatPrice()` utility in format.ts

### Changed
- Extracted `tourRowToRouletteTour()` from API route into shared `src/lib/db.ts`
- Updated `FeatureNav.tsx` hrefs: right-now → `/right-now`, worlds-most → `/worlds-most`
- Updated implementation plan with Phase 2+3 steps

---

## [3.1.0] - 2026-02-28

### Security
- Security headers: CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Permissions-Policy, Referrer-Policy
- In-memory rate limiting on `/api/roulette/hand` (30 req/10s per IP)
- SQL column allowlist in `updateTourFields` to prevent injection
- Input validation on tour detail page (positive integer, max 2^31)
- Exclude IDs capped at 200 (prevents URL length bomb + SQLite variable limit)

### Fixed
- SQLite `busy_timeout(5000)` prevents SQLITE_BUSY crashes with concurrent access
- globalThis singleton for DB/Claude clients survives Next.js HMR
- Readonly DB mode for web server reads (defense-in-depth)
- AbortController on fetch prevents race conditions on rapid clicks
- Proper UPSERT pattern (`ON CONFLICT DO UPDATE`) instead of read-then-write
- `??` instead of `||` for all numeric defaults (0 is valid)
- React `cache()` deduplicates `getTourById` in metadata + render
- Indexer resumes by destination ID instead of array index (reliable across list changes)
- Viator API retry with exponential backoff on 429/5xx
- Clean DB shutdown via `process.on("exit")`

### Added
- `src/lib/env.ts` — Shared dotenv loader (replaces hand-rolled loadEnv)
- `src/lib/format.ts` — Shared formatting utilities (duration, JSON parse)
- `src/app/error.tsx` — React error boundary with retry
- `src/app/api/og/roulette/[id]/route.tsx` — Dynamic OG images (1200x630, branded overlay)
- `src/scripts/2-oneliners/backfill-oneliners.ts` — Batch AI one-liner generation script
- `eslint.config.mjs` — ESLint 9 flat config with Next.js + TypeScript rules
- Favicon from existing brand icon
- Viator attribution footer in layout
- Campaign tracking (`&campaign=roulette`) on affiliate links
- Named constants for weight thresholds, hand quotas, contrast scores

### Changed
- Seed data: 43 verified destinations (was 37 with 14 wrong/missing IDs)
- `HAND_SELECT_COLUMNS`: only 15 columns instead of `SELECT *`
- Detail page OG image now uses dynamic `/api/og/roulette/[id]` endpoint

---

## [3.0.0] - 2026-02-28

### Added — Data Layer
- Next.js 16 scaffold (App Router, TypeScript strict, Tailwind CSS v4)
- `src/lib/types.ts` — All TypeScript types: TourRow, RouletteTour, TourDetail, WeightCategory, Viator API types
- `src/lib/db.ts` — SQLite database layer with auto-schema init, typed queries, Roulette Hand Algorithm with sequencing
- `src/lib/viator.ts` — Viator API client (searchProducts, getProduct, getDestinations, getTags)
- `src/lib/claude.ts` — Claude Haiku 4.5 integration for AI one-liner generation
- `src/lib/continents.ts` — Continent derivation from Viator's lookupId hierarchy
- `src/scripts/1-viator/seed-destinations.ts` — Seeds 3,380 destinations from Viator API
- `src/scripts/1-viator/indexer.ts` — Drip + Delta indexer with 4 sort strategies, delta detection, weight categories, one-liners
- `src/scripts/1-viator/seed-dev-data.ts` — Seeds diverse destinations across all continents

### Added — API Layer
- `GET /api/roulette/hand` — Returns ~20 curated, sequenced tours with category quotas and contrast sequencing

### Added — UI Layer
- `src/components/TourCard.tsx` — Photo-dominant tour card (dark theme, 3:2 aspect ratio)
- `src/components/RouletteView.tsx` — Interactive roulette: hand cycling, auto-refetch, skeleton loading
- `src/components/ShareButton.tsx` — Web Share API (mobile) + clipboard fallback (desktop)
- `src/components/TourCardSkeleton.tsx` — Shimmer loading skeleton
- `src/components/FeatureNav.tsx` — Subtle text navigation between features
- `src/app/page.tsx` — Homepage with Tour Roulette
- `src/app/roulette/[id]/page.tsx` — Tour detail page (server-rendered, OG meta tags, Viator booking link)
- `src/app/roulette/[id]/not-found.tsx` — 404 with "Spin a New One" link

### Added — Reference Docs
- `docs/implementation/implementation_plan.md` — 20-step Phase 1 plan with "Done when" criteria
- `docs/reference/viator-openapi.json` — Full Viator Partner API OpenAPI 3.0 spec
- `docs/reference/viator-api-reference.md` — Clean summary of 10 Basic-tier endpoints

### Fixed
- Viator destination endpoint: `/taxonomy/destinations` → `GET /destinations` (correct Basic-tier endpoint)
- Destination count: 2,500 → 3,380 (actual API response)
- Rate limiting docs: "150 req/10s" → per-endpoint, per-PUID rolling window
- Indexer sort strategies: match real Viator API options (TRAVELER_RATING, PRICE, DATE_ADDED)
- Key destination IDs corrected: Paris=479, London=737 (not 684)

### Researched
- Full Viator OpenAPI spec analysis: all 33 endpoints, 10 available at Basic tier
- Destination hierarchy: lookupId first segment encodes continent (1=Africa, 2=Asia, 3=Oceania, 4=Caribbean, 6=Europe, 8=North America, 9=South America)
- Search capabilities: 5 sort options, 6 filter flags, rating/price/duration/date filters, max 50 per page

---

## [2.2.0] - 2026-02-28

### Added
- `docs/architecture.md` — Complete technical architecture: SQLite schema, Drip + Delta indexer, Roulette Hand Algorithm, API integration details, Next.js project structure, deployment plan

### Decided
- SQLite over Redis for caching (persistence, queryability, zero cold cache)
- Drip + Delta indexer: spread API calls across 24 hours, delta detection via summary hashes, no burst traffic
- Roulette Hand Algorithm: curated batches of ~20 tours with category diversity (7 weight categories) and sequencing rules (no same category/continent back-to-back)
- All 3,380 Viator destinations indexed (no arbitrary limits)
- Haiku 4.5 for AI one-liners (~$0.003/batch), Sonnet 4.6 for Six Degrees chains
- Viator affiliate tracking auto-included in productUrl — no manual link creation needed
- Launch with Basic tier API access, apply for Full Access post-launch

### Researched
- Viator Partner API capabilities (Basic vs Full tier, endpoints, rate limits, response formats)
- News aggregator performance lessons (cold cache avoidance, pre-built index pattern)
- Affiliate link structure (pid=P00289313, mcid=42383 auto-embedded)

---

## [2.1.0] - 2026-02-28

### Added
- `docs/ux_design.md` — Complete UX design doc: 8 research-backed principles, 5 ASCII wireframes, interaction flows, OG card specs, tour card anatomy, all decisions resolved
- UX research covering Atlas Obscura, StumbleUpon, The Useless Web, Bored Button, Product Hunt, Tinder swipe patterns, Wikipedia rabbit holes

### Decided
- Homepage = Tour Roulette (one card, one button, full screen)
- Shared links carry feature context (`/roulette/[id]`, `/worlds-most/[slug]`)
- Tour card tappable → detail page with description + Viator affiliate link
- Right Now Somewhere = ambient teaser on Roulette + dedicated full page
- AI one-liners pre-generated and cached during batch indexing
- OG images = template-based composite (tour photo + branded context bar)
- Feature navigation via subtle text links (minimal chrome, non-competing)

## [2.0.0] - 2026-02-28

### Changed
- **Project pivot**: From supply-side infrastructure (AI extraction + MCP server) to consumer web app + iOS app
- Rewrote CLAUDE.md for new direction: four pillars, four features, Next.js stack
- Rewrote README.md for consumer app positioning
- Created fresh tracking docs (NOW.md, CURRENT_STATE.md, CHANGELOG.md)

### Added
- `docs/product_brief.md` — Full product vision, features, tech stack, build order
- `docs/thesis_validation.md` — Competitive analysis that killed the original thesis

### Archived
- Moved all Phase 0 work to `archive/`: scripts, results, schemas, prompts, old docs, MkDocs config
- Phase 0 work preserved for reference (83 products, 7 operators, 95% accuracy, Viator API patterns)

### Removed
- `site/` — Built MkDocs output (regenerable from archived source)
- MkDocs deployment workflow (will be replaced with Next.js deployment)
