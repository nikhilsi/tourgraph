# Current State

---
**Last Updated**: February 28, 2026
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
│   ├── viator.ts                   # Viator API client
│   └── claude.ts                   # AI one-liner generation
├── scripts/
│   ├── indexer.ts                  # Drip + Delta indexer
│   ├── seed-dev-data.ts            # Seeds 43 destinations
│   └── backfill-oneliners.ts       # Batch AI one-liner generation
data/
└── tourgraph.db                    # SQLite (gitignored)
```

### Data

- **4,200+ tours** indexed from 43 destinations
- **3,380 destinations** from Viator API
- **7 weight categories** for roulette variety
- **6 superlatives** queried live from tours table
- **20+ timezones** with global coverage for Right Now

### Key Technical Choices

- **SQLite** (not Redis/Postgres) — single file, zero cold cache, deploys as-is
- **Viator Basic tier** — free affiliate API, 300K+ experiences
- **Claude Haiku 4.5** — fast/cheap one-liners during indexing
- **Next.js 16 App Router** — server components for SEO, client for interactivity
- **`Intl.DateTimeFormat`** — timezone math with no external library
- **Dark theme** — photos pop, feels premium

### Build Status

- `npm run build` — zero errors, all 11 routes registered
- `npm run lint` — zero warnings
- TypeScript strict mode — clean

---

## Archived Phase 0

AI extraction pipeline for tour operators — thesis invalidated Feb 2026. All work in `archive/`. See `docs/thesis_validation.md` for why.
