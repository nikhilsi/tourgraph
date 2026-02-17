# Current State

---
**Last Updated**: February 17, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: 0 — Feasibility Spike | **Status**: In Progress (Step 2 of 5)

---

## Phase 0 Progress

| Step | Description | Status |
|------|-------------|--------|
| Step 1 | Define OCTO-aligned extraction schema (v0.1) | ✅ Complete |
| Step 2 | Extraction tests — 7 operators | 🔄 1 of 7 complete (Tours Northwest) |
| Step 3 | Viator API comparison (Path A vs. Path C) | Not started |
| Step 4 | Systematic extraction — all 7 operators | Not started |
| Step 5 | Analysis & go/no-go decision | Not started |

---

## What's Built

### Documentation
- ✅ Project proposal, Phase 0 spike methodology, tooling landscape, API landscape, glossary
- ✅ Ground truth data for all 7 test operators (in `docs/phase0_spike.md`)

### Schema & Prompt
- ✅ OCTO-aligned JSON Schema v0.1 (`schemas/octo_extraction_v01.json`)
- ✅ Domain-specific extraction prompt v0.1 (`prompts/extraction_prompt_v01.md`)

### Scripts
- ✅ `scripts/firecrawl_extract.py` — Firecrawl `/extract` test script (Pydantic schema, CLI args, dry-run mode)
- ⏳ `scripts/extract_operator.py` — Path 2 extraction script — not yet built

### Operator Results
- ✅ Tours Northwest — manual extraction (89% field accuracy), Firecrawl `/scrape` test, Firecrawl `/extract` test
- Results in `results/tours_northwest/`

### Tooling Decisions (Complete)
- ✅ Firecrawl `/scrape` for fetching (1 credit/page, clean markdown, JS rendering)
- ✅ Firecrawl `/extract` tested and **rejected** (369 credits/operator, hallucinated prices, missed domain-critical data)
- ✅ Build-vs-use decided: **BUILD** domain extraction (Firecrawl `/scrape` + Claude API + our prompt)
- Full comparison: `results/tours_northwest/firecrawl_extract_comparison_v1.md`

### Dev Environment
- Python 3.11 venv with firecrawl-py, anthropic, requests, python-dotenv, pydantic
- `.env` with Firecrawl API key (Anthropic key still needed)
- GitHub repo, all docs and results committed

---

## Key Findings

1. **Core field extraction works** — title, pricing, duration extract at ~100% from clean sites
2. **OCTO schema fits naturally** — field mapping is straightforward
3. **Domain-specific prompts are essential** — generic LLM extraction (Firecrawl `/extract`) hallucinated prices, missed promos, misclassified pricing models
4. **Firecrawl strips nav/banner/footer** — promo codes (RAINIER10) lost by both `/scrape` and `/extract`
5. **FareHarbor is the wall** — tiered pricing locked in JS widget regardless of method
6. **Path A + Path C are complementary** — extraction gets operator-specific data, Viator gets standardized pricing

---

## Firecrawl Credits

| Used | Remaining | Tier |
|------|-----------|------|
| 538 | **-38** (exhausted) | Free (500 total) |

Need new API key or Hobby tier ($16/mo) before further API calls. Path 2 needs ~30 credits for remaining operators.

---

## Key Files

| Purpose | File |
|---------|------|
| Extraction schema | `schemas/octo_extraction_v01.json` |
| Extraction prompt | `prompts/extraction_prompt_v01.md` |
| Firecrawl /extract script | `scripts/firecrawl_extract.py` |
| Tours NW manual extraction | `results/tours_northwest/tours_northwest_extraction_v1.json` |
| Tours NW /extract results | `results/tours_northwest/firecrawl_extract_v1.json` |
| Tours NW /extract scorecard | `results/tours_northwest/firecrawl_extract_comparison_v1.md` |
| Tours NW /scrape comparison | `results/tours_northwest/firecrawl_comparison_v1.md` |
| Tours NW manual scorecard | `results/tours_northwest/tours_northwest_scorecard_v1.md` |
| Ground truth data | `docs/phase0_spike.md` (operator recon sections) |

---

**For more details**: See NOW.md | CHANGELOG.md | CLAUDE.md | docs/
