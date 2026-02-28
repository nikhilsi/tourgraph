# Current State

---
**Last Updated**: February 28, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Consumer Web App | **Status**: UX locked, architecture locked, ready to build

---

## What Happened

TourGraph started as AI-powered supply-side infrastructure for the tours & experiences industry — extracting structured data from operator websites and making it queryable by AI agents via MCP.

After thorough competitive validation in February 2026, that thesis was killed. Peek, TourRadar, Magpie, and Expedia all have live MCP servers. The "nobody is building this" claim was factually wrong.

**The pivot**: A zero-friction consumer site and iOS app that makes people smile using the world's tour data. Four features (Tour Roulette, Right Now Somewhere, The World's Most ___, Six Degrees of Anywhere) filtered through four pillars (Zero Friction, Instant Smile, Effortlessly Shareable, Rabbit Hole Energy).

Full analysis: `docs/thesis_validation.md`
Full product vision: `docs/product_brief.md`

---

## What Exists

### Working Assets
- Viator Partner API key (Basic tier, production, tested)
- tourgraph.ai domain (owned, DNS configured — currently points to GitHub Pages)
- DigitalOcean hosting (existing droplets at ~$6/mo)
- CLAUDE.md rewritten for new direction

### UX Design (Locked)
- `docs/ux_design.md` — Complete UX doc with wireframes and resolved decisions
- Homepage = Tour Roulette (one card, one button, full screen)
- Shared links carry feature context (`/roulette/[id]`, `/worlds-most/[slug]`)
- Tour card is tappable → detail page with full description + Viator booking link
- Right Now Somewhere = ambient teaser on Roulette + its own full page
- AI one-liners pre-generated and cached (no loading state)
- OG images = template-based composite (tour photo + branded bar)
- Navigation between features via subtle text links (minimal chrome)

### Architecture (Locked)
- `docs/architecture.md` — Full technical architecture with all decisions resolved
- SQLite caching layer (pre-built index, user never waits for Viator API)
- Drip + Delta indexer (spread API calls over 24 hours, ~60/hour ongoing, delta detection)
- Roulette Hand Algorithm (curated ~20 tour batches with diversity + sequencing rules)
- All 2,500 Viator destinations indexed
- Haiku 4.5 for AI one-liners, Sonnet 4.6 for Six Degrees chains
- Viator Basic tier sufficient for launch (affiliate tracking auto-included in URLs)
- Next.js App Router, TypeScript strict, Server Components for OG generation

### Archived (Phase 0 Work)
All Phase 0 extraction work preserved in `archive/`:
- 83 products extracted across 7 Seattle operators (95% accuracy)
- Viator API comparison scripts with working call patterns
- OCTO-aligned schema, extraction prompts, scorecards
- MkDocs site content, blog post, strategy docs
- Full history in `archive/CHANGELOG.md`

---

## What's Next

1. **Tour Roulette** — the core loop (Phase 1)
2. Ship remaining three features on web
3. Polish, OG cards, sharing
4. Launch website
5. iOS app

---

**For more details**: See NOW.md | CLAUDE.md | docs/product_brief.md
