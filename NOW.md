# NOW - Current Focus & Next Steps

---
**Last Updated**: February 28, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, docs/product_brief.md for the full vision
---

**Phase**: Pivot complete. Building the consumer web app.

---

## Just Completed

- Competitive validation killed the original supply-side infrastructure thesis (see `docs/thesis_validation.md`)
- Product brief finalized for the consumer pivot (see `docs/product_brief.md`)
- Repo cleaned up: Phase 0 work archived in `archive/`, fresh start for new direction
- CLAUDE.md rewritten for the four pillars and four features
- **UX design doc locked** (`docs/ux_design.md`) — wireframes, design principles, interaction flows, all decisions resolved
- **Architecture doc complete** (`docs/architecture.md`) — all decisions resolved:
  - SQLite for caching (not Redis) — persistence, queryability, simplicity
  - Drip + Delta indexer — spread API calls across 24 hours, delta detection via summary hashes
  - Roulette Hand Algorithm — curated batches of ~20 tours with category diversity and sequencing rules
  - All 2,500 Viator destinations indexed (no arbitrary limits)
  - Haiku 4.5 for one-liners, Sonnet 4.6 for Six Degrees chains
  - Viator affiliate tracking auto-included in productUrl (no manual link creation needed)
  - Launch with Basic tier, apply for Full Access post-launch

---

## Current Priority

**Phase 1 — Tour Roulette on web**

Architecture and UX are locked. Time to build.

1. Initialize Next.js project (App Router, TypeScript strict)
2. Set up SQLite + Drip indexer (seed the tours database)
3. Build the Roulette Hand API (`GET /api/roulette/hand`)
4. Build the Roulette UI (one card, one button, full screen)
5. Build the detail page (tap card → description + Viator booking link)
6. OG meta tags for shared roulette links

---

## Build Order

| Phase | What | Platform | Status |
|-------|------|----------|--------|
| 1 | Tour Roulette | Web | Next |
| 2 | Right Now Somewhere | Web | Planned |
| 3 | The World's Most ___ | Web | Planned |
| 4 | Six Degrees of Anywhere | Web | Planned |
| 5 | Polish, OG cards, sharing | Web | Planned |
| 6 | Launch website | Web | Planned |
| 7 | iOS app (all 4 features) | iOS/SwiftUI | Planned |
| 8 | App Store submission | iOS | Planned |

---

## Existing Assets

- Viator production API key (Basic tier, tested and working — in `.env`)
- tourgraph.ai domain (DNS currently points to GitHub Pages — needs re-pointing)
- DigitalOcean droplets available (~$6/mo)
- Viator API patterns in `archive/scripts/viator_compare.py` (endpoint URLs, auth, parsing)

---

**For more details**: See CLAUDE.md | docs/product_brief.md | CHANGELOG.md
