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

---

## Current Priority

**Architecture discussion** — before writing any code, align on:

1. Next.js project structure (App Router, RSC strategy for OG generation)
2. Viator API caching layer (Redis vs SQLite, how to build the "interesting tours" index for weighted Roulette)
3. Claude API integration (pre-computed one-liners during batch indexing)
4. Deployment (DigitalOcean droplet setup, DNS cutover from GitHub Pages)

Then: **Phase 1 — Tour Roulette on web** (Week 1)

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
