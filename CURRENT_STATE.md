# Current State

---
**Last Updated**: March 1, 2026
**Purpose**: Quick onboarding for new sessions — what's built and how it fits together
---

## Phases 1-3: Code Complete

Three features built, all sharing the same data layer (SQLite + Viator API).

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

## Phase 4: Six Degrees — Research Complete

Chain generation prototyped and validated. Prompt v2 produces 5-stop chains with unique themes reliably (8/8 test runs). See `docs/phase4-six-degrees.md` for full research findings.

**Blocked on:** Data expansion (need more than 53 cities for interesting chains).

## Data Expansion: Ready to Run

**Critical discovery:** Only 53 of 3,380 Viator destinations indexed (1.6%). The `seed-dev-data.ts` hardcodes 43 destination IDs — this was a dev seed, not production data.

**Indexer hardened for production run:**
- File logging to `logs/indexer-<timestamp>.log`
- Leaf-node filtering (~2,712 destinations, skips countries/states)
- Per-destination timing + batch ETA
- Final summary block (duration, counts, errors, API calls, DB size)
- Smoke-tested with `--dest 704` (Seattle)

**Expected result:** ~100K tours, ~400MB SQLite DB, 10-16 hours runtime.

**Sequence:** Wait for one-liner backfill → Run full indexer → Backfill new one-liners → Generate chains → Build UI.

### Architecture

```
src/
├── app/
│   ├── page.tsx                    # Homepage — Roulette + Right Now teaser
│   ├── roulette/[id]/              # Tour detail page
│   ├── right-now/                  # Right Now Somewhere page
│   ├── worlds-most/                # Superlatives gallery
│   ├── worlds-most/[slug]/         # Superlative detail page
│   ├── api/roulette/hand/          # Hand API (GET, ~20 tours)
│   ├── api/og/roulette/[id]/       # Roulette OG images
│   ├── api/og/right-now/           # Right Now OG image
│   └── api/og/worlds-most/[slug]/  # Superlative OG images
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
│   ├── seed-dev-data.ts            # Seeds 43 destinations (dev only)
│   └── backfill-oneliners.ts       # Batch AI one-liner generation
logs/
└── indexer-<timestamp>.log         # Indexer run logs (gitignored)
data/
└── tourgraph.db                    # SQLite (gitignored)
```

### Data (Current — Dev Seed)

- **~9,800 tours** indexed from 53 destinations
- **~6,300 with AI one-liners** (backfill in progress)
- **3,380 destinations** from Viator API (~2,712 are leaf nodes)
- **7 weight categories** for roulette variety
- **6 superlatives** queried live from tours table
- **20+ timezones** with global coverage for Right Now

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
