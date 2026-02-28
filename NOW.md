# NOW - Current Focus & Next Steps

---
**Last Updated**: February 28, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, docs/product_brief.md for the full vision
---

**Phase**: Phase 1 (Tour Roulette) — nearly complete

---

## Just Completed

- Full Phase 1 implementation plan (`docs/implementation_plan.md`) — 20 steps, each a commit point
- Viator API deep research — OpenAPI spec saved, all Basic-tier endpoints mapped (`docs/viator-api-reference.md`)
- **Data layer (Steps 1-10):**
  - Next.js scaffold (App Router, TypeScript strict, Tailwind CSS v4)
  - SQLite database with full schema, typed query helpers, Roulette Hand Algorithm
  - Viator API client (all 4 endpoints verified: destinations, search, product detail, tags)
  - 3,380 destinations seeded with timezone, geo coordinates, continent derivation from lookupId hierarchy
  - Drip + Delta indexer with 4 sort strategies, delta detection, weight categories, AI one-liners
  - Claude Haiku 4.5 integration for witty one-liner generation
- **API layer (Step 12):**
  - `GET /api/roulette/hand` — returns 20 curated, sequenced tours
- **UI layer (Steps 13-17, 19):**
  - Tour Card component (photo-dominant, dark theme, 3:2 aspect)
  - Spin Button + RouletteView (hand cycling, auto-refetch on exhaustion)
  - Share Button (Web Share API on mobile, clipboard on desktop)
  - Tour Detail page (`/roulette/[id]`) with OG meta tags, booking link, server-rendered
  - Feature Nav, Skeleton loader, Not-Found page

---

## In Progress

- **Data seeding (Step 11):** Indexer running across 38 diverse destinations. ~1,700+ tours indexed so far. Expect ~3,500-4,500 when complete. Currently no-AI mode; one-liner backfill needed after.
- **One-liner backfill:** Only 10 of ~1,700 tours have AI one-liners. Need a backfill script to generate one-liners for existing tours.

---

## Remaining (Phase 1)

1. **OG Image Generation (Step 18)** — Dynamic `ImageResponse` endpoint for branded 1200x630 previews. Critical for Pillar 3 (shareable link previews).
2. **One-liner backfill** — Generate one-liners for all indexed tours via Claude Haiku.
3. **Polish & E2E verification (Step 20):**
   - Visual testing in browser (mobile + desktop)
   - Card transition animations
   - WCAG AA color contrast audit
   - Favicon and viewport meta
   - Image lazy loading for non-priority images
   - Full four-pillar test pass
4. **First commit** — nothing has been committed yet. All work is local.

---

## After Phase 1

| Phase | What | Platform | Status |
|-------|------|----------|--------|
| 1 | Tour Roulette | Web | **In progress** |
| 2 | Right Now Somewhere | Web | Planned |
| 3 | The World's Most ___ | Web | Planned |
| 4 | Six Degrees of Anywhere | Web | Planned |
| 5 | Polish, OG cards, sharing | Web | Planned |
| 6 | Launch website | Web | Planned |
| 7 | iOS app (all 4 features) | iOS/SwiftUI | Planned |
| 8 | App Store submission | iOS | Planned |

---

**For more details**: See CLAUDE.md | docs/implementation_plan.md | CHANGELOG.md
