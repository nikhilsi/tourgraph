# Current State

---
**Last Updated**: February 28, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Phase 1 (Tour Roulette) | **Status**: Core loop built, polish remaining

---

## What Happened

TourGraph started as AI-powered supply-side infrastructure for the tours & experiences industry. After competitive validation in February 2026 (Peek, TourRadar, Magpie, Expedia all shipped MCP servers), the thesis was killed.

**The pivot**: A zero-friction consumer site and iOS app that makes people smile using the world's tour data. Four features filtered through four pillars.

Full analysis: `docs/thesis_validation.md`
Full product vision: `docs/product_brief.md`

---

## What's Built (Phase 1 — Tour Roulette)

### Data Layer
- **SQLite database** (`src/lib/db.ts`) — tours, destinations, superlatives, six_degrees_chains, indexer_state tables with full indexes. Roulette Hand Algorithm with sequencing for contrast.
- **Viator API client** (`src/lib/viator.ts`) — `searchProducts()`, `getProduct()`, `getDestinations()`, `getTags()`. All verified against production API.
- **3,380 destinations** seeded with timezone, geo coordinates, continent (derived from Viator's lookupId hierarchy — see `src/lib/continents.ts`).
- **Drip + Delta indexer** (`src/scripts/indexer.ts`) — 4 search strategies per destination, delta detection via summary hashes, weight category assignment (7 categories), AI one-liner generation via Claude Haiku 4.5.
- **~1,700+ tours indexed** (growing — seeding in progress across 38 diverse destinations, 7 continents).

### API Layer
- `GET /api/roulette/hand` — Returns ~20 curated, sequenced tours drawn by category quotas. Supports `?exclude=1,2,3` for repeat avoidance.

### UI Layer
- **Homepage** (`/`) — Tour Roulette: card + "Show Me Another" button + feature nav
- **Tour Card** (`src/components/TourCard.tsx`) — Photo-dominant, dark theme, 3:2 aspect, title, location, one-liner, stats, share button
- **RouletteView** (`src/components/RouletteView.tsx`) — Client component: fetches hand, cycles cards, auto-refetches on exhaustion, skeleton loading state
- **Share Button** (`src/components/ShareButton.tsx`) — Web Share API (mobile) / clipboard copy (desktop)
- **Detail Page** (`/roulette/[id]`) — Server-rendered with OG meta tags, full description, inclusions, image gallery, Viator booking link, "Spin Your Own" CTA
- **Not-Found** (`/roulette/[id]/not-found.tsx`) — 404 with "Spin a New One" link
- **Feature Nav** (`src/components/FeatureNav.tsx`) — Subtle text links (roulette highlighted, others link to `/` for now)
- **Skeleton Loader** (`src/components/TourCardSkeleton.tsx`) — Shimmer animation matching card layout

### Reference Docs
- `docs/viator-openapi.json` — Full Viator Partner API OpenAPI 3.0 spec (2.2MB)
- `docs/viator-api-reference.md` — Clean summary of 10 Basic-tier endpoints we can use
- `docs/implementation_plan.md` — 20-step Phase 1 plan with "Done when" criteria per step

### Build Status
- `npm run build` — **zero errors**
- `npm run dev` — serves homepage with real tour data
- TypeScript strict mode — clean

---

## What's Not Done Yet

1. **OG image generation** — Dynamic branded 1200x630 preview images (Step 18). Currently uses raw Viator photo in OG tags.
2. **One-liner backfill** — ~1,700 tours indexed without AI one-liners (ran `--no-ai` for speed). Need backfill pass.
3. **Visual polish** — Card transitions, WCAG contrast, favicon, browser testing
4. **No commits made** — All Phase 1 work is uncommitted

---

## Key Technical Details

- **Viator API**: Basic-tier affiliate. 10 endpoints available. Correct destination endpoint is `GET /destinations` (not `/taxonomy/destinations`). Rate limiting is per-endpoint, per-PUID, 10-second rolling window.
- **Continent mapping**: Derived from Viator's `lookupId` hierarchy. First segment = continent code (1=Africa, 2=Asia, 3=Oceania, 4=Caribbean, 6=Europe, 8=North America, 9=South America).
- **Key IDs**: Seattle=704, Paris=479, London=737, Tokyo=334, Cape Town=318
- **Database is prod-ready**: No difference between "dev" and "prod" data. Same API, same indexer. SQLite file deploys as-is.

---

## Archived (Phase 0 Work)

All Phase 0 extraction work preserved in `archive/`:
- 83 products extracted across 7 Seattle operators (95% accuracy)
- Viator API comparison scripts with working call patterns
- OCTO-aligned schema, extraction prompts, scorecards
- MkDocs site content, blog post, strategy docs
- Full history in `archive/CHANGELOG.md`

---

**For more details**: See NOW.md | CLAUDE.md | docs/implementation_plan.md
