# Changelog

All notable changes to this project will be documented in this file.

---

## [0.2.0] - 2026-02-17

### Added
- OCTO-aligned JSON Schema v0.1 (`schemas/octo_extraction_v01.json`) — full draft-07 schema with operator, products (29 fields), extractionMetadata
- Domain-specific extraction prompt v0.1 (`prompts/extraction_prompt_v01.md`) — explicit instructions for nav/banner/footer content, pricing classification rules, feature taxonomy, multi-page merge logic
- Firecrawl `/extract` test script (`scripts/firecrawl_extract.py`) — Pydantic schema generation, CLI args, dry-run mode, structured output
- Firecrawl `/extract` results for Tours Northwest (`results/tours_northwest/firecrawl_extract_v1.json`) — 10 unique products, 369 credits
- Firecrawl `/extract` comparison scorecard (`results/tours_northwest/firecrawl_extract_comparison_v1.md`) — field-by-field analysis vs. manual extraction
- Python venv with dependencies (firecrawl-py, anthropic, requests, python-dotenv, pydantic)
- `.env` configuration with Firecrawl API key

### Changed
- Renamed all docs to match CLAUDE.md conventions (e.g., `Surfaced_Phase0_Spike.md` → `phase0_spike.md`)
- Updated 7 cross-references across docs to use new filenames

### Key Findings
- **Firecrawl `/extract` rejected for production use.** 369 credits/operator (73% of free tier on one operator), hallucinated price ($345.14), missed promo codes, missed cross-operator bundles, 4 duplicate products, systematic pricing model misclassification.
- **Build-vs-use decision made: BUILD.** Firecrawl `/scrape` (1 credit/page) + Claude API with our domain prompt. ~90% cheaper, full control over extraction quality.
- Firecrawl `/extract` found 3 products manual extraction missed (Boeing Factory, Museum of Glass, Olympic 2-day) — breadth is a strength, but accuracy and domain nuance failures outweigh it.
- Firecrawl requires Pydantic-generated schemas ($ref/$defs style) — hand-written JSON Schema draft-07 is rejected by their API.
- Free tier exhausted: 538/500 credits used. Path 2 needs ~30 credits for remaining operators.

### Decided
- Path 2 is the extraction approach: Firecrawl `/scrape` + Claude API + our domain-specific prompt
- Firecrawl `/extract` will NOT be used for remaining 6 operators

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
