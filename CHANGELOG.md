# Changelog

All notable changes to this project will be documented in this file.

For Phase 0 history (extraction pipeline, Viator comparison, MkDocs site), see `archive/CHANGELOG.md`.

---

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
