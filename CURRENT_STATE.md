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

### Schema (Complete)
- ✅ OCTO-aligned extraction target v0.1 defined
- ✅ Core fields: title, description, pricing, duration, features, locations, FAQs
- ✅ Surfaced extensions: difficulty, successRate, upgradeModifiers, crossOperatorBundles, activePromotions
- ✅ Clear OCTO field mapping documented

### Operator 1: Tours Northwest (Complete)
- ✅ Manual extraction — 8 of 15 products extracted
- ✅ Detail page accuracy: **89%** (16/18 fields correct)
- ✅ Listing page accuracy: **75%** (core fields)
- ✅ Firecrawl `/scrape` test — content quality comparable, but strips nav/banner/footer
- ✅ Key finding: promo codes (RAINIER10) captured by manual, stripped by Firecrawl
- ✅ Key finding: child pricing locked in FareHarbor JS widget (neither method captures)
- ✅ Scorecard and comparison documented

### Tooling Decisions (In Progress)
- ✅ Firecrawl selected for fetching (commodity infrastructure)
- ✅ Hybrid approach: Firecrawl for main content + raw fetch for nav/banner/footer
- ⏳ Firecrawl `/extract` not yet tested (LLM-powered extraction)
- ✅ Build-vs-use matrix: build domain intelligence, use commodity infrastructure

---

## Key Findings So Far

1. **Core field extraction works** — title, pricing, duration, age restrictions, seasonality all extract at ~100% from clean sites
2. **OCTO schema fits naturally** — field mapping is straightforward, not forced
3. **Pricing model classification works** — correctly distinguishes PER_UNIT vs. PER_BOOKING
4. **Cross-operator detection works** — Argosy combo product identified with partner details
5. **Promo code extraction works** — RAINIER10 captured (but Firecrawl strips it)
6. **FareHarbor is the wall** — tiered pricing (child, infant) locked in JS widget regardless of fetching method
7. **Path A + Path C are complementary** — extraction gets operator-specific data, Viator gets standardized pricing

---

## Firecrawl Credits

| Used | Remaining | Tier |
|------|-----------|------|
| 2 | 498 | Free (500 total, no expiry) |

---

## What's Next

See **NOW.md** for current priorities.
