# Current State

**Last Updated**: February 17, 2026
**Phase**: 0 — Feasibility Spike
**Status**: In Progress (Step 2 of 5)

---

## Phase 0 Progress

| Step | Description | Status |
|------|-------------|--------|
| Step 1 | Define OCTO-aligned extraction schema (v0.1) | ✅ Complete |
| Step 2 | Manual extraction test — 7 operators | 🔄 1 of 7 complete |
| Step 3 | Viator API comparison (Path A vs. Path C) | Not started |
| Step 4 | Systematic extraction — all 7 operators | Not started |
| Step 5 | Analysis & go/no-go decision | Not started |

---

## Completed Work

### Documentation (Complete)
- ✅ Project proposal — strategic rationale, phased plan, validation strategy
- ✅ Phase 0 spike methodology — 7 operators, OCTO schema, ground truth data for all operators
- ✅ Tooling landscape — Firecrawl deep analysis, competitor comparison, build-vs-use matrix
- ✅ API landscape — Viator, GetYourGuide, OCTO standard research
- ✅ Glossary — shared vocabulary across all docs

### Schema & Prompt (Complete)
- ✅ OCTO-aligned extraction target v0.1 defined
- ✅ Core fields: title, description, pricing, duration, features, locations, FAQs
- ✅ Surfaced extensions: difficulty, successRate, upgradeModifiers, crossOperatorBundles, activePromotions
- ✅ Clear OCTO field mapping documented
- ✅ JSON Schema v0.1 created (`schemas/octo_extraction_v01.json`)
- ✅ Domain-specific extraction prompt v0.1 created (`prompts/extraction_prompt_v01.md`)

### Operator 1: Tours Northwest (Complete)
- ✅ Manual extraction — 8 of 15 products extracted
- ✅ Detail page accuracy: **89%** (16/18 fields correct)
- ✅ Listing page accuracy: **75%** (core fields)
- ✅ Firecrawl `/scrape` test — content quality comparable, but strips nav/banner/footer
- ✅ Firecrawl `/extract` test — 10 unique products, but critical failures (see below)
- ✅ Key finding: promo codes (RAINIER10) captured by manual, stripped by Firecrawl (both `/scrape` and `/extract`)
- ✅ Key finding: child pricing locked in FareHarbor JS widget (neither method captures)
- ✅ Scorecard, `/scrape` comparison, and `/extract` comparison all documented

### Tooling Decisions (Complete)
- ✅ Firecrawl selected for fetching (commodity infrastructure)
- ✅ Hybrid approach: Firecrawl `/scrape` for main content + raw fetch for nav/banner/footer
- ✅ Firecrawl `/extract` tested — **rejected** (see Build-vs-Use Verdict below)
- ✅ Build-vs-use decided: **BUILD** domain extraction (Firecrawl `/scrape` + Claude API + our prompt)
- ✅ Build-vs-use matrix: build domain intelligence, use commodity infrastructure

### Scripts (In Progress)
- ✅ `scripts/firecrawl_extract.py` — Firecrawl `/extract` endpoint test script (Pydantic schema, CLI args, dry-run mode)
- ⏳ `scripts/extract_operator.py` — Path 2 extraction script (Firecrawl `/scrape` + Claude API) — not yet built

---

## Build-vs-Use Verdict: Firecrawl `/extract`

Tested on Tours Northwest with full OCTO-aligned Pydantic schema + domain prompt. **Result: Not viable.**

| Issue | Detail |
|-------|--------|
| **Cost** | 369 credits for ONE operator (73% of free tier). Projected: ~2,583 credits for 7 operators. |
| **Promo codes** | RAINIER10 not captured — Firecrawl strips banners before LLM sees them |
| **Cross-operator bundles** | Argosy combo product missed entirely |
| **Pricing hallucination** | Fabricated price $345.14 for Private SUV Seattle (correct: $400) |
| **Pricing model errors** | Systematic PER_UNIT → PER_BOOKING misclassification |
| **Duplicates** | 4 duplicate products across 14 total (no cross-page merge) |
| **Missing products** | Pre-Cruise Tour and 2 other products not found |

**Decision: Build Path 2** — Firecrawl `/scrape` (1 credit/page) + Claude API with our domain prompt. ~90% cheaper, full control over extraction quality.

Full comparison: `results/tours_northwest/firecrawl_extract_comparison_v1.md`

---

## Key Findings So Far

1. **Core field extraction works** — title, pricing, duration, age restrictions, seasonality all extract at ~100% from clean sites
2. **OCTO schema fits naturally** — field mapping is straightforward, not forced
3. **Pricing model classification works** — correctly distinguishes PER_UNIT vs. PER_BOOKING (manual), but Firecrawl `/extract` misclassifies systematically
4. **Cross-operator detection works** — Argosy combo product identified with partner details (manual only; Firecrawl missed it)
5. **Promo code extraction works** — RAINIER10 captured by manual extraction, stripped by both Firecrawl `/scrape` and `/extract`
6. **FareHarbor is the wall** — tiered pricing (child, infant) locked in JS widget regardless of fetching method
7. **Path A + Path C are complementary** — extraction gets operator-specific data, Viator gets standardized pricing
8. **Generic LLM extraction misses domain nuance** — Firecrawl `/extract` hallucinated prices, missed cross-operator bundles, misclassified pricing models. Domain-specific prompts are essential.
9. **Firecrawl `/extract` cost is prohibitive** — 369 credits/operator makes free tier nonviable. `/scrape` at 1 credit/page is 50× cheaper.

---

## Firecrawl Credits

| Action | Credits | Running Total | Remaining |
|--------|---------|---------------|-----------|
| Initial balance | — | 0 | 500 |
| `/scrape` tests (2 pages) | 2 | 2 | 498 |
| `/extract` minimal schema test | 27 | 29 | 471 |
| `/extract` Pydantic schema test | 140 | 169 | 331 |
| `/extract` full site wildcard | 369 | 538 | **-38** |

**Free tier is exhausted.** Next step: new API key or Hobby tier upgrade ($16/mo, 3,000 credits). Path 2 (`/scrape` only) needs ~30 credits for remaining 6 operators.

---

## What's Next

See **NOW.md** for current priorities.
