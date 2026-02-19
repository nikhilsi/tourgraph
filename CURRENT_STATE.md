# Current State

---
**Last Updated**: February 18, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: 0 — Feasibility Spike | **Status**: Complete — All 5 steps done, **GO recommended**

---

## Phase 0 Progress

| Step | Description | Status |
|------|-------------|--------|
| Step 1 | Define OCTO-aligned extraction schema (v0.1) | ✅ Complete |
| Step 2 | Extraction tests — 7 operators | ✅ Complete — 83 products, 7 scorecards |
| Step 3 | Viator API comparison (Path A vs. Path C) | ✅ Complete — 3/7 on Viator, 10 products compared |
| Step 4 | Systematic extraction — all 7 operators | ✅ Merged with Step 2 — all 7 run with Path 2 |
| Step 5 | Analysis & go/no-go decision | ✅ Report written — **GO recommended** |

---

## What's Built

### Scripts
- ✅ `scripts/extract_operator.py` — Path 2 extraction pipeline (Firecrawl `/scrape` + Claude Opus 4.6 + domain prompt)
- ✅ `scripts/viator_compare.py` — Path C comparison pipeline (Viator Partner API discovery + deep pull + field-by-field comparison)
- ✅ `scripts/firecrawl_extract.py` — Firecrawl `/extract` test script (tested and rejected)

### Schema & Prompt
- ✅ OCTO-aligned JSON Schema v0.1 (`schemas/octo_extraction_v01.json`)
- ✅ Domain-specific extraction prompt v0.1 (`prompts/extraction_prompt_v01.md`)

### Operator Results — All 7 Complete

| Operator | Products | Pricing | Key Test | Score |
|----------|----------|---------|----------|-------|
| Tours Northwest | 17 | ✅ Exact | Promo code, cross-operator bundle | Excellent |
| Shutter Tours | 7 | ✅ Exact | Cancelled tour detection | Excellent |
| Totally Seattle | 13 | ⚠️ Partial | PER_BOOKING vs PER_UNIT, add-ons | Strong |
| Conundroom | 12 | ✅ Exact | Escape room schema extensions | Outstanding |
| Bill Speidel's | 2 | ❌ JS widget | Website-as-product extraction | Clean |
| Evergreen Escapes | 19 | ✅ Exact | All-inclusive, dual booking system | Excellent |
| Argosy Cruises | 13 | ⚠️ Tax rounding | Upgrade modifiers, 4 cross-operator bundles | Strong |

### Viator API Comparison (Path A vs Path C)
- ✅ 3/7 operators found on Viator: Tours Northwest (4 products), Evergreen Escapes (4), Argosy Cruises (2)
- ✅ 4/7 operators NOT on Viator: Shutter Tours, Totally Seattle, Conundroom, Bill Speidel's
- ✅ Field-by-field comparison report (`results/comparisons/path_a_vs_path_c.md`)
- ✅ Raw Viator data stored (`results/viator_raw/`, `results/viator_mapped/`)

### Phase 0 Summary
- ✅ Cross-operator scoring matrix (`results/phase0_summary/scoring_matrix.md`)
- ✅ Phase 0 summary report with go/no-go (`results/phase0_summary/phase0_report.md`)

### Tooling Decisions (Complete)
- ✅ Firecrawl `/scrape` for fetching (1 credit/page)
- ✅ Firecrawl `/extract` tested and **rejected**
- ✅ Claude Opus 4.6 selected (quality > cost, validated vs Sonnet)
- ✅ Build-vs-use decided: **BUILD** domain extraction

---

## Key Findings

### Extraction (Path A)
1. **Zero pricing hallucinations** across 83 products and 7 operators
2. **~95% core field accuracy** (title, pricing, duration, description)
3. **Schema flexibility proven** — same pipeline handles tours, cruises, and escape rooms
4. **6 cross-operator bundles discovered** across 3 operators
5. **5 booking platforms detected** — FareHarbor, Peek Pro, Bookeo, Gatemaster, RocketRez
6. **JS widget pricing is the wall** — real but manageable via Path C (Viator API)
7. **Domain prompting is essential** — generic extraction (Firecrawl /extract) fails
8. **Total cost**: 37 credits + $8.28 for all 7 operators

### Viator Comparison (Path A vs Path C)
9. **Path A has 8x coverage**: 83 products vs 10 on Viator
10. **4/7 operators are Path A exclusive** — not on Viator at all (the long tail)
11. **Path A captures unique data**: promo codes, cross-operator bundles, booking system IDs, FAQs
12. **Path C captures unique data**: reviews (up to 2078), images (10-31/product), age-band pricing, accessibility
13. **Viator markup visible**: direct pricing is 10-17% lower than Viator retail prices
14. **Paths are complementary** — both needed for strongest MCP server

---

## Firecrawl Credits

| Used | Remaining | Tier |
|------|-----------|------|
| ~282 | ~218 | Free (500 monthly) |

---

## Key Files

| Purpose | File |
|---------|------|
| **Phase 0 report** | `results/phase0_summary/phase0_report.md` |
| **Scoring matrix** | `results/phase0_summary/scoring_matrix.md` |
| **Path A vs C comparison** | `results/comparisons/path_a_vs_path_c.md` |
| Extraction script | `scripts/extract_operator.py` |
| Viator comparison script | `scripts/viator_compare.py` |
| Extraction prompt | `prompts/extraction_prompt_v01.md` |
| Extraction schema | `schemas/octo_extraction_v01.json` |
| Ground truth data | `docs/phase0_spike.md` |
| Per-operator results | `results/<operator>/extract_operator_v1.json` |
| Per-operator scorecards | `results/<operator>/scorecard_v1.md` |
| Viator raw API data | `results/viator_raw/<operator>/` |
| Viator OCTO-mapped data | `results/viator_mapped/<operator>/` |

---

**For more details**: See NOW.md | CHANGELOG.md | CLAUDE.md | docs/
