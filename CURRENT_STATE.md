# Current State

---
**Last Updated**: March 1, 2026
**Purpose**: Quick onboarding for new sessions — what's built and how it fits together
---

## Phases 1-4: Code Complete, Polish In Progress

All four features built, sharing the same data layer (SQLite + Viator API). Basic route testing passed (17 routes compile clean). Homepage redesigned with tagline, context, and feature discovery teasers. Tooltips and viral loop closers ("Spin Your Own") added across all detail pages. In-depth testing (mobile, WCAG, share flow) deferred to post-deploy.

### Feature 1: Tour Roulette (Phase 1)

```
/ → RouletteView fetches /api/roulette/hand → ~20 tours weighted by category
→ "Show Me Another" cycles → Tap card → /roulette/[id] detail → Share → OG preview
```

### Feature 2: Right Now Somewhere (Phase 2)

```
/right-now → Server component queries tours by golden-hour timezones
→ 6 moment cards with local time + time-of-day label → Tap → /roulette/[id] detail
Homepage teaser: "Right now in {city}, it's {time}..."
```

### Feature 3: The World's Most ___ (Phase 3)

```
/worlds-most → 6 superlative cards (most expensive, cheapest 5-star, longest, etc.)
→ Tap → /worlds-most/[slug] detail page → Book on Viator → Share → OG preview
```

## Phase 4: Six Degrees — UI Complete, Needs Data

UI fully built: gallery page, detail page with vertical timeline visualization, OG image route. Waiting for chain data to populate.

```
/six-degrees → Gallery of curated chains (cards with city pair, summary, themes)
→ "Surprise Me" picks random chain → /six-degrees/[slug] detail
→ Vertical timeline: numbered circles, tour cards with photos, theme badges
→ Share → OG preview (dark bg, city pair, mini chain visualization)
```

**Chain generation script ready:** `src/scripts/generate-chains.ts` — reads pairs from `chain-pairs.json`, generates via Claude Sonnet 4.6, stores in `six_degrees_chains` table.

**Blocked on:** Data expansion (indexer running, ~22% done) → decide city pairs → generate chains.

## Data Expansion: Running

Full indexer running (`--full --no-ai`): ~613/2,712 leaf destinations (22.6%), ~40,004 tours in DB so far. ~15.5 hours remaining.

**After indexer completes:** Backfill one-liners → Decide city pairs → Generate chains.

### Architecture

```
src/
├── app/
│   ├── page.tsx                    # Homepage — Roulette + Right Now teaser
│   ├── roulette/[id]/              # Tour detail page
│   ├── right-now/                  # Right Now Somewhere page
│   ├── worlds-most/                # Superlatives gallery
│   ├── worlds-most/[slug]/         # Superlative detail page
│   ├── six-degrees/                # Six Degrees gallery
│   ├── six-degrees/[slug]/         # Chain detail (vertical timeline)
│   ├── about/                      # About page
│   ├── story/                      # Origin story page
│   ├── api/roulette/hand/          # Hand API (GET, ~20 tours)
│   ├── api/og/roulette/[id]/       # Roulette OG images
│   ├── api/og/right-now/           # Right Now OG image
│   ├── api/og/worlds-most/[slug]/  # Superlative OG images
│   └── api/og/six-degrees/[slug]/  # Six Degrees OG images
├── components/
│   ├── RouletteView.tsx            # Core game loop (client)
│   ├── TourCard.tsx                # Tour card display
│   ├── ShareButton.tsx             # Web Share / clipboard
│   ├── TourCardSkeleton.tsx        # Loading skeleton
│   └── FeatureNav.tsx              # Cross-feature navigation
├── lib/
│   ├── db.ts                       # SQLite layer + all queries
│   ├── timezone.ts                 # Timezone helpers (Intl.DateTimeFormat)
│   ├── format.ts                   # Shared formatting (price, duration)
│   ├── types.ts                    # All TypeScript types
│   ├── viator.ts                   # Viator API client (with rate limit handling)
│   └── claude.ts                   # AI one-liner generation
├── scripts/
│   ├── indexer.ts                  # Production indexer (logging, leaf filter, ETA, summary)
│   ├── test-chain.ts               # Six Degrees chain generation testing
│   ├── generate-chains.ts          # Production chain generator (logging, retries, dedup)
│   ├── chain-pairs.json            # City pairs config for chain generation
│   ├── seed-dev-data.ts            # Seeds 43 destinations (dev only)
│   └── backfill-oneliners.ts       # Batch AI one-liner generation
logs/
└── indexer-<timestamp>.log         # Indexer run logs (gitignored)
data/
└── tourgraph.db                    # SQLite (gitignored)
```

### Data (Expanding)

- **~40,000 tours** indexed from ~613 destinations (indexer running, targeting ~2,712)
- **~9,800 with AI one-liners** (original dev seed; new tours need backfill)
- **3,380 destinations** from Viator API (~2,712 are leaf nodes)
- **7 weight categories** for roulette variety
- **6 superlatives** queried live from tours table
- **20+ timezones** with global coverage for Right Now
- **0 chains** generated (waiting for data expansion to complete)

### Key Technical Choices

- **SQLite** (not Redis/Postgres) — single file, zero cold cache, deploys as-is. Confirmed capacity for ~100K tours at ~400MB.
- **Viator Basic tier** — free affiliate API, 300K+ experiences, 16 req/10s per endpoint
- **Claude Haiku 4.5** — fast/cheap one-liners during indexing (~$0.003/1000 tours)
- **Claude Sonnet 4.6** — Six Degrees chain generation (~$0.02/chain, 12-14s)
- **Next.js 16 App Router** — server components for SEO, client for interactivity
- **`Intl.DateTimeFormat`** — timezone math with no external library
- **Dark theme** — photos pop, feels premium

### Build Status

- `npm run build` — zero errors
- `npm run lint` — zero warnings
- TypeScript strict mode — clean

---

## Archived Phase 0

AI extraction pipeline for tour operators — thesis invalidated Feb 2026. All work in `archive/`. See `docs/thesis_validation.md` for why.
