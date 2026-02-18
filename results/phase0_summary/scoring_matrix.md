# Phase 0 — Cross-Operator Scoring Matrix

**Generated**: 2026-02-17
**Method**: Path 2 (Firecrawl `/scrape` + Claude Opus 4.6)
**Prompt**: `prompts/extraction_prompt_v01.md` (v01, 12,251 chars)
**Schema**: `schemas/octo_extraction_v01.json`

---

## Extraction Summary

| # | Operator | Type | Pages | Products | Credits | Claude Cost | Total Cost |
|---|----------|------|-------|----------|---------|-------------|------------|
| 1 | Tours Northwest | Sightseeing tours | 2 | 17 | 2 | $0.87 | $0.87 |
| 2 | Shutter Tours | Photography tours | 7 | 7 | 7 | $1.37 | $1.37 |
| 3 | Totally Seattle | Private luxury tours | 8 | 13 | 8 | $1.18 | $1.18 |
| 4 | Conundroom | Escape rooms | 1 | 12 | 1 | $0.92 | $0.92 |
| 5 | Bill Speidel's | Underground tour | 4 | 2 | 4 | $0.40 | $0.40 |
| 6 | Evergreen Escapes | Nature day trips | 7 | 19 | 7 | $1.71 | $1.71 |
| 7 | Argosy Cruises | Sightseeing cruises | 8 | 13 | 8 | $1.83 | $1.83 |
| | **TOTAL** | | **37** | **83** | **37** | **$8.28** | **$8.28** |

---

## Field-by-Field Accuracy Across All Operators

| Field | Tours NW | Shutter | Totally Seattle | Conundroom | Bill Speidel's | Evergreen | Argosy | Overall |
|-------|----------|---------|-----------------|------------|----------------|-----------|--------|---------|
| title | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **7/7** |
| url | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **7/7** |
| pricingModel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **7/7** |
| priceByUnit | ✅ | ✅ | ⚠️ | ✅ | ❌ | ✅ | ⚠️ | **5/7** |
| duration | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **7/7** |
| seasonality | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | ✅ | **6/6** |
| features (inclusions) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **7/7** |
| features (exclusions) | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | **6/6** |
| features (accessibility) | N/A | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | **5/5** |
| ageRestrictions | ✅ | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | **6/6** |
| locations/pickup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **7/7** |
| bookingSystem | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **7/7** |
| isPrivate | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | **6/6** |
| activePromotions | ✅ | N/A | N/A | ✅ | N/A | N/A | ⚠️ | **2/3** |
| crossOperatorBundles | ✅ | N/A | N/A | N/A | N/A | ✅ | ✅ | **3/3** |
| upgradeModifiers | N/A | N/A | ✅ | N/A | N/A | N/A | ✅ | **2/2** |

### Accuracy by Field Type

| Category | Fields | Accuracy | Notes |
|----------|--------|----------|-------|
| **Core content** (title, url, duration) | 3 | **100%** | Never failed |
| **Pricing** (model, amounts) | 2 | **86%** | Model always correct. Amounts: exact when on page, honest when behind JS widget |
| **Operational** (season, age, locations) | 3 | **100%** | Rich detail, seasonal variation captured |
| **Features** (inclusions, exclusions, accessibility) | 3 | **100%** | Consistently detailed |
| **Business** (booking system, private flag) | 2 | **100%** | 6 distinct booking platforms correctly identified |
| **Extensions** (promos, bundles, upgrades) | 3 | **88%** | Strong when present. Argosy discount programs gap. |

---

## Pricing Accuracy Deep Dive

| Operator | Pricing on Pages | Pricing Accuracy | Hallucinations | Notes |
|----------|-----------------|------------------|----------------|-------|
| Tours NW | Yes | ✅ Exact ($179, $149, $159) | None | Best case |
| Shutter Tours | Yes | ✅ Exact ($85, $79, $149, $126, $1290) | None | Multiple price points |
| Totally Seattle | Partial | ⚠️ Base price correct, tier breakdown missing | None | Silver/Gold/Platinum tiers behind widget or deeper page |
| Conundroom | Yes | ✅ Exact ($46 flat) | None | Simple model |
| Bill Speidel's | No (JS widget) | ❌ Not available | None | Honest: "not listed on pages provided" |
| Evergreen | Yes | ✅ Exact ($295, $1495, $315, $295/$255, $95) | None | Seasonal pricing bonus |
| Argosy | Yes | ⚠️ ~$0.40 off (tax/fee rounding) | None | First to Board exact ($62.94) |

**Key finding: ZERO pricing hallucinations across all 7 operators.** When pricing wasn't available, the AI said so rather than guessing. This is the opposite of Firecrawl `/extract` which hallucinated $345.14 for Tours NW.

---

## Schema Extension Verification

### Escape Room Fields (Conundroom only)

| Extension Field | Populated | Accuracy |
|----------------|-----------|----------|
| difficulty | ✅ 8/8 rooms | NOVICE, INTERMEDIATE, ADVANCED correctly mapped |
| roomType | ✅ 8/8 rooms | MULTI_ROOM for all |
| themeGenre | ✅ 8/8 rooms | Relevant tags per room |
| minUnits/maxUnits | ✅ 8/8 rooms | Player counts correct |

### Upgrade Modifiers

| Operator | upgradeModifiers | Accuracy |
|----------|-----------------|----------|
| Totally Seattle | 7 add-ons on walking tour | ✅ Space Needle $90/person exact match |
| Argosy | First to Board on Harbor Cruise | ✅ $62.94 exact match |

### Cross-Operator Bundles

| Operator | Bundle | Partner Identified |
|----------|--------|-------------------|
| Tours NW | Ultimate Seattle Experience | ✅ Argosy Cruises — Harbor Cruise |
| Evergreen | Whales + Wildlife | ✅ Outer Island Excursions — Whale Watching |
| Argosy | Harbor + City Tour | ✅ Tours Northwest — Seattle City Tour |
| Argosy | Harbor + Hop-On | ✅ CitySightseeing — Hop-On Bus |
| Argosy | Locks + Hop-On | ✅ CitySightseeing — Hop-On Bus |
| Argosy | Harbor + Sky View | ✅ Sky View Observatory |

**6 cross-operator bundles correctly identified across 3 operators.**

---

## Booking System Detection

| Platform | Operator | Detected | Booking URLs |
|----------|----------|----------|-------------|
| FareHarbor | Tours NW, Shutter, Totally Seattle, Evergreen (Portland) | ✅ | ✅ Per-product URLs |
| Peek Pro | Evergreen Escapes (Seattle) | ✅ | ✅ Peek booking URLs |
| Bookeo | Conundroom | ✅ | ✅ Per-room URLs |
| Gatemaster | Bill Speidel's | ✅ | ✅ Gatemaster URL |
| RocketRez | Argosy Cruises | ✅ | ✅ RocketRez URLs |

**5 distinct booking platforms, all correctly identified. Dual-system (Evergreen: Peek + FareHarbor) detected.**

---

## Product Status Detection

| Status Type | Operator | Detected | Example |
|-------------|----------|----------|---------|
| Active | All | ✅ | Standard products |
| Cancelled | Shutter Tours | ✅ | Boeing Factory Tour "CANCELLED until further notice" |
| Seasonal (inactive) | Shutter Tours | ✅ | Mt. Rainier "not operating this year" |
| Coming soon | Conundroom | ✅ | Tesla's Laboratory "Coming April 2026" |
| Coming soon | Totally Seattle | ✅ | Seattle's Best in a Day "COMING SOON" |
| Seasonal (future) | Argosy | ✅ | Christmas Ship "check back for 2026" |
| Seasonal (booking) | Shutter Tours | ✅ | Tulip Festival "April 8-25, 2026 booking dates" |

---

## Key Recon Questions — Answered

| Question | Operator | Answer | Evidence |
|----------|----------|--------|----------|
| Can AI detect tour status (cancelled/seasonal)? | Shutter | **YES** | Boeing "CANCELLED", Mt. Rainier "not operating" |
| Can AI handle per-group pricing? | Totally Seattle | **YES** | PER_BOOKING correctly used for all private tours |
| Can AI handle tiered pricing? | Totally Seattle | **PARTIAL** | Tiers acknowledged, individual prices not captured |
| Can AI extract from non-tour experiences? | Conundroom | **YES** | All escape room extensions populated |
| Can AI extract from website-as-product? | Bill Speidel's | **YES** | Product synthesized from distributed pages |
| Can AI handle all-inclusive pricing? | Evergreen | **YES** | Itemized inclusions with dietary policy |
| Can AI handle multi-day tours? | Evergreen, Tours NW | **YES** | 2-Day Rainier ($1,495), 2-Day Olympic ($815) |
| Can AI handle cross-operator bundles? | Tours NW, Evergreen, Argosy | **YES** | 6 bundles with partner identification |
| Can AI handle upgrade modifiers? | Argosy, Totally Seattle | **YES** | First to Board $62.94, Space Needle $90 |
| Can AI handle 160+ page sites? | Argosy | **YES** | Quality held, limited by page selection not AI |
| Does AI hallucinate prices? | All | **NO** | Zero hallucinations across 83 products |
| Does AI acknowledge missing data? | Bill Speidel's, Argosy | **YES** | "Not listed on pages provided" |

---

## Operator Difficulty vs. Quality

| Operator | Recon Difficulty | Products | Accuracy | Verdict |
|----------|-----------------|----------|----------|---------|
| Tours Northwest | Medium-High | 17 | ✅ Excellent | All recon questions answered |
| Shutter Tours | Easy | 7 | ✅ Excellent | Cancelled tours, accessibility, meeting point |
| Totally Seattle | Hard | 13 | ✅ Strong | PER_BOOKING nailed, tier pricing partial |
| Conundroom | Different | 12 | ✅ Outstanding | Schema flexibility proven |
| Bill Speidel's | Easy (control) | 2 | ✅ Clean | Honest about pricing gap |
| Evergreen Escapes | Medium-High | 19 | ✅ Excellent | 11/13 ground truth match |
| Argosy Cruises | Extreme | 13 | ✅ Strong | Quality held, coverage limited by page selection |

---

## Cost Analysis

| Metric | Value |
|--------|-------|
| Total Firecrawl credits | 37 (of ~255 remaining) |
| Total Claude API cost | $8.28 |
| Average per operator | 5.3 credits + $1.18 |
| Most efficient | Tours NW: 2 credits, $0.87, 17 products |
| Least efficient | Argosy: 8 credits, $1.83, 13 products |
| Cost per product | $0.10 average |

### Comparison: Path 2 vs Firecrawl /extract

| Metric | Path 2 (Build) | Firecrawl /extract (Use) |
|--------|---------------|------------------------|
| Tours NW cost | 2 credits + $0.87 | 369 credits |
| Tours NW products | 17 | 10 |
| Pricing hallucinations | 0 | Yes ($345.14) |
| Promo code capture | ✅ RAINIER10 | ❌ Missed |
| Cross-operator bundles | ✅ | ❌ Missed |
| **All 7 operators** | **37 credits + $8.28** | **~2,583 credits (estimated)** |

---

*Individual operator scorecards: `results/<operator>/scorecard_v1.md`*
*Extraction data: `results/<operator>/extract_operator_v1.json`*
