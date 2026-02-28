# Phase 1 Implementation Plan: Tour Roulette on Web

## Context

TourGraph.ai is a zero-friction consumer site that surfaces delightful tours from Viator's 300K+ catalog. Phase 1 is Tour Roulette — the core loop: one button, one random tour card, press again. All design decisions are locked in `docs/ux_design.md` and `docs/architecture.md`.

**Current state (Feb 28, 2026):** Steps 1-17 and 19 complete. Step 11 (data seeding) in progress. Steps 18 and 20 remaining. See status markers on each step below.

---

## 20 Steps — Each a Natural Commit Point

### Step 1: Scaffold Next.js Project [DONE]

Initialize Next.js with App Router, TypeScript strict mode. Add core dependencies (`better-sqlite3`, `@anthropic-ai/sdk`, `tsx`). Set up `.env.local` from existing `.env`. Create `src/` directory structure per architecture doc. Placeholder homepage.

**Files created:** `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local`, `src/app/layout.tsx`, `src/app/page.tsx`
**Files modified:** `.gitignore` (add `data/`), `.env.example` (add `DATABASE_PATH`)

**Done when:** `npm run dev` serves localhost:3000, `npm run build` succeeds with zero errors, TypeScript strict mode enabled.

---

### Step 2: Define TypeScript Types [DONE]

Shared type definitions derived from architecture doc's schema and API response shapes.

**Files created:** `src/lib/types.ts`

Types: `TourRow` (matches SQLite schema), `RouletteTour` (API response shape), `RouletteHandResponse`, `ViatorSearchProduct`, `ViatorProductDetail`, `ViatorDestination`, `WeightCategory`.

**Done when:** File compiles, all types match architecture doc schema and real Viator response at `archive/results/viator_raw/tours_northwest/5396MTR_product.json`.

---

### Step 3: SQLite Database Layer [DONE]

Database module with connection management, auto-schema initialization, typed query helpers. Uses `better-sqlite3` (synchronous).

**Files created:** `src/lib/db.ts`

Key functions: `getDb()`, `initSchema()`, `insertTour()`, `updateTour()`, `getTourById()`, `getTourByProductCode()`, `getActiveTourCount()`, `insertDestination()`, `getAllDestinations()`.

Schema: exactly as defined in `docs/architecture.md` (tours, superlatives, destinations, six_degrees_chains tables with all indexes). No staging table (removed per review).

**Done when:** `npx tsx src/lib/db.ts` (self-test block) creates `./data/tourgraph.db`, creates all tables, inserts a test tour, queries it back, deletes it.

---

### Step 4: Viator API Client [DONE]

TypeScript client ported from working Python patterns in `archive/scripts/viator_compare.py`. Production base URL, `exp-api-key` header, rate-limit awareness.

**Files created:** `src/lib/viator.ts`

Methods: `searchProducts(destId, sort?, count?)`, `getProduct(productCode)`, `getDestinations()`, `getTags()`.

Reference: `archive/scripts/viator_compare.py` lines 126-193 for headers, endpoints, error handling. Rate limiting: pause every 50 requests.

**Done when:** `npx tsx src/lib/viator.ts` (self-test) calls `getDestinations()` (prints count ~3,380), `getTags()`, `searchProducts('704')` (prints first 3 Seattle products), `getProduct('5396MTR')` (prints title + rating). All succeed against production API.

---

### Step 5: Seed Destinations Table [DONE]

Fetch all Viator destinations via `GET /destinations`, insert into `destinations` table. Build a `countryToContinent` lookup mapping since Viator doesn't provide continent data.

**Files created:** `src/scripts/seed-destinations.ts`, `src/lib/continents.ts`
**Files modified:** `src/lib/db.ts` (add `upsertDestination()`)

**Done when:** Running script populates 3,380+ destination rows. Spot checks pass: "704" = Seattle, "479" = Paris, "737" = London.

---

### Step 6: Index Single Destination (Search Only) [DONE]

First piece of the indexer: search one destination with 4 sort strategies (DEFAULT, TRAVELER_RATING desc, PRICE asc, PRICE desc), collect unique product codes, compute summary hashes for delta detection. No detail fetches yet.

**Files created:** `src/scripts/indexer.ts` (first version)

Key functions: `computeSummaryHash()`, `searchDestination(destId)`, `classifyProducts(searchResults, cachedTours)` → returns `{ new, changed, unchanged, missing }`.

**Done when:** `npx tsx src/scripts/indexer.ts --dest 704` outputs product count and classification. All products classified as "new" since DB is empty.

---

### Step 7: Fetch Full Product Details [DONE]

Extend indexer to fetch `GET /products/{code}` for new products and insert into tours table. Extract: title, description, cover image (720x480 variant), rating, reviews, duration, timezone, destination, tags, supplier, affiliate URL, inclusions, highlights.

**Files modified:** `src/scripts/indexer.ts`, `src/lib/db.ts` (add `insertOrUpdateTour()`)

Field extraction reference: `archive/results/viator_raw/tours_northwest/5396MTR_product.json` for exact nesting.

**Done when:** `npx tsx src/scripts/indexer.ts --dest 704 --limit 5` inserts 5 Seattle tours. Spot-check "5396MTR": title matches, rating ~4.86, image_url is CDN URL, viator_url contains "mcid=42383".

---

### Step 8: AI One-Liner Generation [DONE]

Integrate Claude Haiku 4.5 for witty one-liners during indexing. System prompt and user template from architecture doc lines 292-328.

**Files created:** `src/lib/claude.ts`
**Files modified:** `src/scripts/indexer.ts` (call `generateOneLiner()` for new tours)

Model: `claude-haiku-4-5-20251001`. Max tokens: 100. One-liner constraint: under 120 chars, no emojis, no hashtags, warm and witty.

**Done when:** `npx tsx src/scripts/indexer.ts --dest 704 --limit 3` produces 3 tours with non-null `one_liner` values that are under 120 chars and read as warm/witty.

---

### Step 9: Weight Category Assignment [DONE]

Classify each tour into one of 7 weight categories during indexing: `highest_rated`, `most_reviewed`, `most_expensive`, `cheapest_5star`, `unique`, `exotic_location`, `wildcard`.

**Files modified:** `src/scripts/indexer.ts` (add `assignWeightCategory()`)

Classification rules (priority order): rating >= 4.9 + 50 reviews → highest_rated, reviews >= 1000 → most_reviewed, price >= $500 → most_expensive, rating >= 4.8 + price <= $30 → cheapest_5star, unique experience tags → unique, non-top-50 destination → exotic_location, everything else → wildcard.

**Done when:** All tours have non-null `weight_category`. `SELECT weight_category, COUNT(*) FROM tours GROUP BY weight_category` shows distribution across multiple categories.

---

### Step 10: Full Drip Indexer Loop [DONE]

Extend from single-destination to full drip loop. Modes: `--full` (all destinations), `--continue` (resume), `--dest <id>` (single). State tracking, delta detection, graceful shutdown.

**Files modified:** `src/scripts/indexer.ts`
**Files modified:** `package.json` (add `"index"` and `"index:full"` scripts)

Features: position tracking, configurable interval (`INDEXER_INTERVAL_MINUTES`), delta detection via `summary_hash`, mark missing products inactive, progress logging.

**Done when:** `npx tsx src/scripts/indexer.ts --full --limit 10` processes 10 destinations, shows delta output, can resume with `--continue`.

---

### Step 11: Seed Development Data [IN PROGRESS]

Run indexer on ~50 diverse destinations across all continents to build ~500-1000 tour dataset for UI development. This is a run step, not a code step.

Target destinations: Paris, Tokyo, NYC, London, Barcelona, Reykjavik, Marrakech, Bangkok, Sydney, Cape Town, Cusco, Dubai, Rome, Istanbul, Bali, plus ~35 more across all continents.

**Done when:** 500+ active tours in DB, 5+ continents represented, weight categories distributed, 90%+ tours have one-liners.

---

### Step 12: Roulette Hand API Route [DONE]

`GET /api/roulette/hand` — returns ~20 curated, sequenced tours. Implements the Hand Algorithm from architecture doc.

**Files created:** `src/app/api/roulette/hand/route.ts`

Algorithm: draw by category quotas (4 highest_rated, 3 unique, 3 cheapest_5star, 3 most_expensive, 3 exotic_location, 2 most_reviewed, 2 wildcard), sequence with constraints (no same category or continent back-to-back), support `?exclude=1,2,3` to avoid repeats.

**Done when:** `curl localhost:3000/api/roulette/hand` returns ~20 tours, no consecutive same-category or same-continent, response under 100ms, second call with `?exclude=` returns different tours.

---

### Step 13: Tour Card Component [DONE]

The atomic visual unit. Add Tailwind CSS in this step. Mobile-first, dark theme, photo-dominant. Start with hardcoded mock data.

**Files created:** `src/components/TourCard.tsx`, `tailwind.config.ts`, `postcss.config.mjs`
**Files modified:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

Tour card anatomy (from UX doc): photo (60-80% of card, 3:2 aspect), title (bold, max 2 lines), location (lighter), one-liner (italic, warm tone), stats row (rating + price + duration), share button. Card wrapped in link (tappable to detail page).

**Done when:** localhost:3000 shows a beautiful dark-mode tour card matching the wireframe. Looks good at 375px mobile and 1440px desktop.

---

### Step 14: Spin Button and Hand Cycling [DONE]

Interactive roulette: fetch hand from API, show one card at a time, cycle on button press.

**Files created:** `src/components/SpinButton.tsx` (client), `src/components/RouletteView.tsx` (client)
**Files modified:** `src/app/page.tsx`

Behavior: fetch hand on load, show skeleton during fetch, advance on button press (no network call), pre-load next image, auto-fetch new hand when exhausted (pass `?exclude=` with seen IDs). Simple CSS transition between cards.

**Done when:** Homepage shows real tour from API. "Show Me Another" cycles through ~20 cards. After exhaustion, new hand fetched automatically. Card transitions under 300ms.

---

### Step 15: Share Button [DONE]

Web Share API on mobile (native sheet), clipboard copy on desktop.

**Files created:** `src/components/ShareButton.tsx` (client)

Share URL: `/roulette/{tour.id}`. Share text: tour title + one-liner.

**Done when:** Mobile share opens native sheet, desktop copies URL with "Copied!" feedback.

---

### Step 16: Tour Detail Page [DONE]

`/roulette/[id]` — shared link landing page and "tap to learn more" destination. Server Component reading from SQLite.

**Files created:** `src/app/roulette/[id]/page.tsx`

Content: feature badge ("TOUR ROULETTE"), tour card, full description, highlights, "Share", "Book on Viator →" (affiliate link with `&campaign=roulette`, opens new tab), "Spin Your Own" (link to `/`), "More tours in [location]" (links to `/` for now).

Includes `generateMetadata()` for SSR OG tags.

**Done when:** `/roulette/{id}` renders full detail page. Tapping card on homepage navigates here. Content visible in page source (server-rendered).

---

### Step 17: Feature Navigation [DONE]

Subtle text links establishing navigation pattern. Mostly placeholder for Phase 1.

**Files created:** `src/components/FeatureNav.tsx`
**Files modified:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/roulette/[id]/page.tsx`

Mobile: horizontal text below spin button. Desktop: top-right header. Current feature highlighted. Non-roulette links go to `/` with "Coming Soon" or similar.

**Done when:** Nav appears on homepage and detail page, "roulette" highlighted, matches wireframe aesthetic.

---

### Step 18: OG Image Generation [TODO]

Dynamic OG images via Next.js `ImageResponse`. Tour photo composited with branded overlay.

**Files created:** `src/app/api/og/roulette/[id]/route.tsx`
**Files modified:** `src/app/roulette/[id]/page.tsx` (update `generateMetadata` to point OG image here)

Spec: 1200x630px, tour photo fills image, dark gradient at bottom, "Tour Roulette" badge + title + key stat + TourGraph brand mark.

**Done when:** `/api/og/roulette/{id}` returns a 1200x630 PNG. Detail page `og:image` meta tag points here. Preview looks good in an OG testing tool.

---

### Step 19: Skeleton Loaders and Error States [DONE]

Loading and error UX for robustness.

**Files created:** `src/components/TourCardSkeleton.tsx`, `src/app/roulette/[id]/not-found.tsx`

Skeleton: same layout as TourCard with CSS shimmer animation. Errors: hand fetch fails → "Try again?" with retry, invalid tour ID → 404 with "Spin a new one?", empty DB → "Getting ready, check back soon."

**Done when:** Skeleton shows on slow network before first card. `/roulette/99999` shows not-found page. No layout shift when skeleton replaced by real card.

---

### Step 20: Polish and End-to-End Verification [TODO]

Final pass against all four pillars.

1. **Zero Friction:** Incognito → first card in < 2 seconds, no popups/banners
2. **Instant Smile:** Read 10 one-liners, 8+ make you smile
3. **Effortlessly Shareable:** Share → link works → OG preview looks tappable
4. **Rabbit Hole:** Spin 5x → tap card → detail → "Spin Your Own" → loop feels natural

Polish: consistent fonts, color contrast (WCAG AA), favicon, viewport meta, affiliate URLs open in new tab, image lazy loading, `npm run build` zero errors.

**Done when:** All 4 pillar tests pass. Complete flow works end-to-end: land → spin → tap → detail → share → recipient sees OG card → taps → sees tour → "Spin Your Own" → loop.

---

## Dependency Chain

```
1 scaffold → 2 types → 3 db → 4 viator client → 5 destinations
  → 6 search → 7 details → 8 one-liners → 9 weights → 10 drip loop → 11 seed data
  → 12 hand API → 13 tour card → 14 spin button → 15 share
  → 16 detail page → 17 nav → 18 OG images → 19 skeletons → 20 polish
```

Steps 1-11 = data layer, 12 = API layer, 13-17 = UI layer, 18 = sharing layer, 19-20 = resilience + polish.

---

## Future Phases (Reference Only)

**Phase 2: Right Now Somewhere** — Query tours by timezone for "beautiful" time of day, ambient teaser on Roulette homepage, dedicated `/right-now` page + detail page + OG images.

**Phase 3: The World's Most ___** — Daily superlative computation (pure SQL), `/worlds-most` gallery page + `/worlds-most/[slug]` cards, superlative badge styling, OG images.

**Phase 4: Six Degrees of Anywhere** — City pair input, Claude Sonnet 4.6 chain generation, vertical timeline visualization, cache in `six_degrees_chains` table, OG images.

---

## Key Reference Files

| File | Used For |
|------|----------|
| `docs/architecture.md` | SQLite schema, indexer design, hand algorithm, API shapes |
| `docs/ux_design.md` | Wireframes, tour card anatomy, interaction patterns, OG specs |
| `archive/scripts/viator_compare.py` | Viator API patterns to port (auth, endpoints, parsing) |
| `archive/results/viator_raw/tours_northwest/5396MTR_product.json` | Real Viator response for type definitions |
| `.env` | Working API keys (copy to `.env.local`) |

## Verification

After Step 20, the complete flow should work:
1. `npm run build` — zero errors
2. `npm run dev` — homepage loads with real tour card in < 2 seconds
3. Press "Show Me Another" 20+ times — cards cycle, new hand auto-fetches
4. Tap a card — detail page with description, highlights, booking link
5. Share — OG preview shows tour photo with branded overlay
6. Open shared link — tour page renders, "Spin Your Own" works
7. `curl localhost:3000/api/roulette/hand` — returns ~20 sequenced tours in < 100ms
