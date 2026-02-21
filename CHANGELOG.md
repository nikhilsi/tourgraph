# Changelog

All notable changes to this project will be documented in this file.

---

## [0.7.0] - 2026-02-20

### Added
- TourGraph logo (diamond graph icon with location pin, horizontal + stacked wordmarks)
- Favicon (`tourgraph-icon.png`) and site header logo (`tourgraph-icon.svg`) wired into MkDocs
- Social preview card (OG image, 1200x630) for LinkedIn/Twitter link sharing
- Template override (`docs/overrides/main.html`) for OG meta tags
- GitHub repo social preview configured

### Changed
- Consolidated roadmap into single source of truth (`docs/roadmap.md`), all other docs reference it
- Reordered phases: MCP Server (1B) pulled before Discovery (1C) — validate query layer with existing data first
- Fixed LinkedIn URL in site footer

---

## [0.6.0] - 2026-02-20

### Added
- MkDocs Material site with dark/light theme toggle, blog plugin, and full documentation nav
- Blog article: "I Asked AI to Plan My Mediterranean Cruise. It Confidently Made Everything Up"
- GitHub Actions workflow for automated deployment to GitHub Pages
- Custom domain configuration (tourgraph.ai) with CNAME
- Site landing page (`docs/index.md`) with Phase 0 results, architecture diagram, and roadmap

### Changed
- Removed duplicate `articles/` directory — blog version in `docs/blog/posts/` is canonical
- Updated all tracking docs (CURRENT_STATE, NOW, CHANGELOG, CLAUDE.md) to reflect site launch

---

## [0.5.0] - 2026-02-20

### Added
- MIT License
- Article 1 draft (`articles/article1_draft.md`) — Mediterranean cruise cold open, Phase 0 findings, Viator comparison

### Changed
- Rewrote `docs/pitch.md` — "Pitch & Interview Prep" → "Pitch & Positioning", removed job-search-specific language, reframed interview Q&A as due diligence
- Cleaned up CLAUDE.md — "What Pisses Me Off" → "Non-Negotiables", updated terminology
- Updated NOW.md, project_proposal.md, strategy.md references from "interview prep" to "positioning"
- README.md updated with MIT license, 1A/1B/1C phase structure

---

## [0.4.0] - 2026-02-18

### Added
- Viator Partner API comparison script (`scripts/viator_compare.py`) — 3-phase pipeline: operator discovery via freetext search, deep product pull with OCTO mapping, field-by-field Path A vs Path C comparison
- Viator API integration — production key authenticated, `exp-api-key` header, `Accept: application/json;version=2.0`
- Path A vs Path C comparison report (`results/comparisons/path_a_vs_path_c.md`) — field-by-field analysis for 3 overlapping operators
- Raw Viator API responses stored in `results/viator_raw/` per operator
- OCTO-mapped Viator products in `results/viator_mapped/` per operator
- Machine-readable comparison data (`results/comparisons/path_a_vs_path_c.json`)

### Key Findings
- **3/7 operators found on Viator** — Tours Northwest, Evergreen Escapes, Argosy Cruises
- **4/7 operators are Path A exclusive** — Shutter Tours, Totally Seattle, Conundroom, Bill Speidel's (not on Viator at all)
- **83 products (Path A) vs 10 products (Path C)** — 8x coverage advantage for extraction
- **Path A captures what Viator can't**: promo codes (RAINIER10), cross-operator bundles, booking system IDs, operator FAQs, long-tail operators
- **Path C captures what extraction can't**: reviews (up to 2078), professional images (10-31 per product), structured age-band pricing, accessibility data, product options/variants
- **Viator markup visible**: $179 direct → $208.56 on Viator (Tours NW Mt Rainier), $295 → $344 (Evergreen Mt Rainier)
- **Complementary, not competing** — both paths needed for strongest MCP server

### Viator API Learnings
- Sandbox key activation may take up to 48 hours; production key works immediately
- Freetext search results do NOT include `supplier` field — must call `/products/{code}` for supplier matching
- Adding `productFiltering.destination` to freetext search silently returns 0 results (API quirk)
- Two-step discovery pattern required: freetext search → full product pull → match by supplier name
- Viator product code prefixes: Tours Northwest = `5396*`, Evergreen Escapes = `5412*`, Argosy Cruises = `2960*`

### Changed
- Updated all project documentation to reflect Viator comparison completion (Phase 0 Step 3)
- `.env.example` updated with Viator API key entries

### Decided
- **Path A + Path C are complementary** — extraction handles 8x more products and the long tail; Viator adds reviews, images, and structured pricing
- Phase 0 Step 3 complete — all 5 Phase 0 steps now finished

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
