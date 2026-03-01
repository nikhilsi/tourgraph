# Changelog

All notable changes to this project will be documented in this file.

For Phase 0 history (extraction pipeline, Viator comparison, MkDocs site), see `archive/CHANGELOG.md`.

---

## [4.1.0] - 2026-03-01

### Added — Phase 4 Research & Prototyping
- `docs/phase4-six-degrees.md` — Full research doc: competitive analysis, thematic coverage, UX design, prompt engineering, test results
- `src/scripts/test-chain.ts` — Chain generation test script (Claude Sonnet 4.6, ~$0.02/chain, ~12-14s)
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
- `docs/Rate_limiting.md` — Viator API rate limiting documentation (16 req/10s per endpoint, rolling window)

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
- `src/scripts/backfill-oneliners.ts` — Batch AI one-liner generation script
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
- `src/scripts/seed-destinations.ts` — Seeds 3,380 destinations from Viator API
- `src/scripts/indexer.ts` — Drip + Delta indexer with 4 sort strategies, delta detection, weight categories, one-liners
- `src/scripts/seed-dev-data.ts` — Seeds diverse destinations across all continents

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
- `docs/implementation_plan.md` — 20-step Phase 1 plan with "Done when" criteria
- `docs/viator-openapi.json` — Full Viator Partner API OpenAPI 3.0 spec
- `docs/viator-api-reference.md` — Clean summary of 10 Basic-tier endpoints

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
