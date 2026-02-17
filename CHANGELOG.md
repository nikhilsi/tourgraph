# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0] - 2026-02-17

### Added
- Project documentation suite: proposal, Phase 0 spike methodology, tooling landscape, API landscape, glossary
- OCTO-aligned extraction schema v0.1 (core fields + Surfaced extensions)
- Manual extraction test: Tours Northwest — 89% field accuracy on detail pages
- Firecrawl `/scrape` integration test — content quality comparison with manual extraction
- Firecrawl comparison report: identified banner/nav stripping issue, hybrid approach recommended
- Ground truth data for all 7 test operators (from manual recon)
- Build-vs-use decision matrix for extraction tooling
- CLAUDE.md, README.md, CURRENT_STATE.md, NOW.md project scaffolding

### Key Findings
- Core fields (title, pricing, duration) extract at ~100% from well-structured sites
- Firecrawl strips promotional banners (promo codes), navigation menus (product catalog), and footers (contact info)
- FareHarbor JS booking widget locks tiered pricing — neither extraction method captures child/infant pricing
- Path A (extraction) and Path C (Viator API) are complementary, not competing
