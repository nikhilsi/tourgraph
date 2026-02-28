# Changelog

All notable changes to this project will be documented in this file.

For Phase 0 history (extraction pipeline, Viator comparison, MkDocs site), see `archive/CHANGELOG.md`.

---

## [2.2.0] - 2026-02-28

### Added
- `docs/architecture.md` — Complete technical architecture: SQLite schema, Drip + Delta indexer, Roulette Hand Algorithm, API integration details, Next.js project structure, deployment plan

### Decided
- SQLite over Redis for caching (persistence, queryability, zero cold cache)
- Drip + Delta indexer: spread API calls across 24 hours, delta detection via summary hashes, no burst traffic
- Roulette Hand Algorithm: curated batches of ~20 tours with category diversity (7 weight categories) and sequencing rules (no same category/continent back-to-back)
- All 2,500 Viator destinations indexed (no arbitrary limits)
- Haiku 4.5 for AI one-liners (~$0.003/batch), Sonnet 4.6 for Six Degrees chains
- Viator affiliate tracking auto-included in productUrl — no manual link creation needed
- Launch with Basic tier API access, apply for Full Access post-launch

### Researched
- Viator Partner API capabilities (Basic vs Full tier, endpoints, rate limits, response formats)
- News aggregator performance lessons (cold cache avoidance, pre-built index pattern)
- Affiliate link structure (pid=P00289313, mcid=42383 auto-embedded)

---

## [2.1.0] - 2026-02-28

### Added
- `docs/ux_design.md` — Complete UX design doc: 8 research-backed principles, 5 ASCII wireframes, interaction flows, OG card specs, tour card anatomy, all decisions resolved
- UX research covering Atlas Obscura, StumbleUpon, The Useless Web, Bored Button, Product Hunt, Tinder swipe patterns, Wikipedia rabbit holes

### Decided
- Homepage = Tour Roulette (one card, one button, full screen)
- Shared links carry feature context (`/roulette/[id]`, `/worlds-most/[slug]`)
- Tour card tappable → detail page with description + Viator affiliate link
- Right Now Somewhere = ambient teaser on Roulette + dedicated full page
- AI one-liners pre-generated and cached during batch indexing
- OG images = template-based composite (tour photo + branded context bar)
- Feature navigation via subtle text links (minimal chrome, non-competing)

## [2.0.0] - 2026-02-28

### Changed
- **Project pivot**: From supply-side infrastructure (AI extraction + MCP server) to consumer web app + iOS app
- Rewrote CLAUDE.md for new direction: four pillars, four features, Next.js stack
- Rewrote README.md for consumer app positioning
- Created fresh tracking docs (NOW.md, CURRENT_STATE.md, CHANGELOG.md)

### Added
- `docs/product_brief.md` — Full product vision, features, tech stack, build order
- `docs/thesis_validation.md` — Competitive analysis that killed the original thesis

### Archived
- Moved all Phase 0 work to `archive/`: scripts, results, schemas, prompts, old docs, MkDocs config
- Phase 0 work preserved for reference (83 products, 7 operators, 95% accuracy, Viator API patterns)

### Removed
- `site/` — Built MkDocs output (regenerable from archived source)
- MkDocs deployment workflow (will be replaced with Next.js deployment)
