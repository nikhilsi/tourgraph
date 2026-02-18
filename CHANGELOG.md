# Changelog

All notable changes to this project will be documented in this file.

---

## [0.3.1] - 2026-02-17

### Changed
- Renamed project from "Surfaced" to "TourGraph" (domain: tourgraph.ai, repo: github.com/nikhilsi/tourgraph)
- Global find-and-replace across all documentation, schema, prompts, and config files
- Updated git clone URL, project structure references, and all project name mentions
- Added `docs/pitch.md` — project pitch document

---

## [0.3.0] - 2026-02-17

### Added
- Path 2 extraction pipeline (`scripts/extract_operator.py`) — Firecrawl `/scrape` + Claude Opus 4.6 with domain-specific prompt, CLI with `--url` (repeatable), `--operator`, `--model`, `--include-raw-html`, `--dry-run`
- All 7 operators extracted — 83 products total:
  - Tours Northwest: 17 products ($0.87)
  - Shutter Tours: 7 products ($1.37) — cancelled tour detection
  - Totally Seattle: 13 products ($1.18) — PER_BOOKING vs PER_UNIT classification
  - Conundroom: 12 products ($0.92) — escape room schema extensions
  - Bill Speidel's: 2 products ($0.40) — honest about JS widget pricing gaps
  - Evergreen Escapes: 19 products ($1.71) — dual booking system, seasonal pricing
  - Argosy Cruises: 13 products ($1.83) — upgradeModifiers, 4 cross-operator bundles
- Per-operator scorecards (`results/<operator>/scorecard_v1.md`) — field-by-field accuracy against ground truth
- Cross-operator scoring matrix (`results/phase0_summary/scoring_matrix.md`)
- Phase 0 summary report (`results/phase0_summary/phase0_report.md`) — GO recommended, all 6 decision gate criteria met

### Changed
- Switched default extraction model from `claude-sonnet-4-5-20250929` to `claude-opus-4-6` (quality > cost)
- Bumped `MAX_TOKENS` from 8192 to 16384 for Opus
- Updated CURRENT_STATE.md, NOW.md, phase0_spike.md to reflect extraction completion

### Key Findings
- **Zero pricing hallucinations** across 83 products and 7 operators
- **~95% core field accuracy** (title, pricing, duration, description)
- **Schema flexibility proven** — same pipeline handles tours, cruises, and escape rooms
- **6 cross-operator bundles discovered** across 3 operators
- **5 booking platforms detected** — FareHarbor, Peek Pro, Bookeo, Gatemaster, RocketRez
- **JS widget pricing is the wall** — real but manageable via Path C (Viator API)
- **Total cost: 37 Firecrawl credits + $8.28 Claude API** for all 7 operators

### Decided
- **Phase 0 GO recommendation** — proceed to Phase 1
- Viator API comparison (Step 3) deferred to Phase 1 — needs website for affiliate signup

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
- Renamed all docs to match CLAUDE.md conventions (e.g., `TourGraph_Phase0_Spike.md` → `phase0_spike.md`)
- Updated 7 cross-references across docs to use new filenames

### Key Findings
- **Firecrawl `/extract` rejected for production use.** 369 credits/operator (73% of free tier on one operator), hallucinated price ($345.14), missed promo codes, missed cross-operator bundles, 4 duplicate products, systematic pricing model misclassification.
- **Build-vs-use decision made: BUILD.** Firecrawl `/scrape` (1 credit/page) + Claude API with our domain prompt. ~90% cheaper, full control over extraction quality.
- Firecrawl `/extract` found 3 products manual extraction missed (Boeing Factory, Museum of Glass, Olympic 2-day) — breadth is a strength, but accuracy and domain nuance failures outweigh it.
- Firecrawl requires Pydantic-generated schemas ($ref/$defs style) — hand-written JSON Schema draft-07 is rejected by their API.
- Free tier credits used: ~282/500 on `/extract` test. ~218 remaining for Path 2 (sufficient — Path 2 used only 37 total).

### Decided
- Path 2 is the extraction approach: Firecrawl `/scrape` + Claude API + our domain-specific prompt
- Firecrawl `/extract` will NOT be used for remaining 6 operators

---

## [0.1.0] - 2026-02-17

### Added
- Project documentation suite: proposal, Phase 0 spike methodology, tooling landscape, API landscape, glossary
- OCTO-aligned extraction schema v0.1 (core fields + TourGraph extensions)
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
