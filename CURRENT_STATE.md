# Current State

---
**Last Updated**: February 28, 2026
**Purpose**: Quick onboarding for new sessions — what's built and how it fits together
---

## Phase 1: Tour Roulette — Functionally Complete

### How It Works

```
User visits / → RouletteView fetches /api/roulette/hand → API queries SQLite
→ Returns ~20 tours (weighted by category, sequenced for contrast)
→ User presses "Show Me Another" to cycle → Taps card → /roulette/[id] detail
→ Shares link → OG image generated at /api/og/roulette/[id] → Friend sees preview
```

### Architecture

```
src/
├── app/                    # Next.js App Router (see src/app/README.md)
│   ├── page.tsx            # Homepage — Tour Roulette
│   ├── roulette/[id]/      # Tour detail page (server-rendered)
│   ├── api/roulette/hand/  # Hand API (GET, returns ~20 tours)
│   └── api/og/roulette/    # Dynamic OG images (1200x630)
├── components/             # React components (see src/components/README.md)
│   ├── RouletteView.tsx    # Core game loop (client)
│   ├── TourCard.tsx        # Tour card display
│   ├── ShareButton.tsx     # Web Share / clipboard
│   └── TourCardSkeleton.tsx
├── lib/                    # Core modules (see src/lib/README.md)
│   ├── db.ts               # SQLite layer + Roulette Hand Algorithm
│   ├── viator.ts           # Viator API client
│   ├── claude.ts           # AI one-liner generation
│   └── types.ts            # All TypeScript types
├── scripts/                # CLI tools (see src/scripts/README.md)
│   ├── indexer.ts           # Drip + Delta indexer
│   ├── seed-dev-data.ts     # Seeds 43 destinations
│   └── backfill-oneliners.ts
data/
└── tourgraph.db            # SQLite (gitignored, see data/README.md)
```

### Data

- **~4,200+ tours** indexed (seed running to 5K+ from 43 destinations)
- **3,380 destinations** from Viator API
- **7 weight categories** for roulette variety
- **AI one-liners** pending backfill (most tours don't have them yet)

### Key Technical Choices

- **SQLite** (not Redis/Postgres) — single file, zero cold cache, deploys as-is
- **Viator Basic tier** — free affiliate API, 300K+ experiences, 10 endpoints
- **Claude Haiku 4.5** — fast/cheap one-liners during indexing
- **Next.js 16 App Router** — server components for SEO, client components for interactivity
- **Dark theme** — photos pop, feels premium, CSS custom properties in `globals.css`

### Build Status

- `npm run build` — zero errors
- `npm run lint` — zero warnings
- TypeScript strict mode — clean

---

## Archived Phase 0

AI extraction pipeline for tour operators — thesis invalidated Feb 2026. All work in `archive/`. See `docs/thesis_validation.md` for why.
