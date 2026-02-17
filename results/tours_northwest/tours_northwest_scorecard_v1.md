# Tours Northwest — Manual Extraction Scorecard
## Phase 0, Step 2: First Extraction Test

**Operator:** Tours Northwest  
**Method:** Claude manual extraction from web_fetch + web_search content (no Firecrawl)  
**Pages used:** 8 (1 full listing page, 1 full detail page, 6 search snippets)  
**Date:** 2026-02-17

---

## Product Catalog Coverage

| Ground Truth (from recon) | Extracted? | Notes |
|---------------------------|-----------|-------|
| **Public Tours (7)** | | |
| Seattle City Tour PLUS Hotel Pickup | ✅ | Title, price ($114), duration, description, locations |
| Seattle Highlights: Seattle City Tour Bus | ✅ | Title, price ($89), duration, description, locations |
| Snoqualmie Falls Tours from Seattle | ❌ | Listed in nav menu but no detail fetched |
| Pre-Alaska Cruise Transportation and City Tour | ✅ | Title, price ($114), duration, seasonality, logistics detail |
| Ultimate Seattle Experience (Argosy combo) | ✅ | Title, price ($159), duration, seasonality, cross-operator bundle identified |
| Seattle Photo Safari | ❌ | Listed in nav menu only, no content available |
| Mt. Rainier Tour from Seattle | ✅ | **Full extraction** — richest product (detail page fetched) |
| **Private SUV Tours (6)** | | |
| Private Seattle in One Day Tour | ✅ | Title, price ($1,049), duration |
| Private Mt. Rainier Tour | ✅ | Title, price ($1,399), duration |
| Private Snoqualmie Falls Tour | ✅ | Title, price ($400), duration |
| Private SUV Seattle Tour | ❌ | Listed in nav but no content in fetched pages |
| Private Boeing Factory Tour | ❌ | Listed in nav only |
| Private Museum of Glass Tacoma | ❌ | Listed in nav only |
| **Private Group (6+)** | | |
| Private Small Group Seattle Tour (Transit) | ❌ | Listed in nav only |
| **Multi-day** | | |
| Olympic National Park 2-day Tour | ❌ | Not found in any fetched content |
| **B2B/Custom (3)** | | |
| Group Tours / Charter Bus Rentals | ⚠️ | Identified in nav, correctly noted as quote-based |
| Team Building Corporate Outing | ⚠️ | Identified in content, noted as custom |
| Custom Tour Request Form | ⚠️ | Link found in nav |

**Product coverage: 8/15 fully extracted (53%), 3 partially identified, 7 missing**

---

## Field Accuracy — Mt. Rainier Tour (detail page available)

This is the gold standard test — we had the full detail page.

| Field | Ground Truth | Extracted | Score |
|-------|-------------|-----------|-------|
| title | Mt. Rainier Tour from Seattle | ✅ Mt Rainier Tour from Seattle | ✅ |
| shortDescription | — | ✅ AI-generated, accurate | ✅ |
| description | Long narrative | ✅ Captured key details | ✅ |
| pricingModel | PER_UNIT (per person) | ✅ PER_UNIT | ✅ |
| price (adult) | $179 (ages 13+) | ✅ $179 / 17900 cents | ✅ |
| price (child) | $149 (ages 5-12) | ✅ $149 / 14900 cents | ✅ |
| duration | 10-11 hours | ✅ 660 min + "10-11 hours" | ✅ |
| ageRestrictions | Ages 5+ | ✅ minAge: 5, with note | ✅ |
| seasonality | Year-round | ✅ Jan 1 - Dec 31, summer/winter noted | ✅ |
| locations (START) | 3 downtown + 1 SeaTac | ✅ All 4 with addresses and times | ✅ |
| features (INCLUSION) | Guide, vehicle, park fees, snowshoes | ✅ All 4 captured | ✅ |
| features (EXCLUSION) | Lunch, gratuities | ✅ Both captured | ✅ |
| features (ACCESSIBILITY) | All abilities | ✅ Captured | ✅ |
| FAQs | Multiple FAQ sections | ✅ 2 captured (hotels, parking) | ⚠️ |
| activePromotions | RAINIER10 (10% off) | ✅ Code, description, display location | ✅ |
| cancellationPolicy | Not stated explicitly | null (correct) | ✅ |
| bookingSystem | FareHarbor | ✅ Name + specific booking URL | ✅ |
| media/images | Multiple images on page | ❌ Not extracted (URLs in HTML but not structured) | ❌ |

**Mt. Rainier field accuracy: 16/18 correct (89%), 1 partial, 1 missing**

---

## Field Accuracy — Listing Page Products (limited data)

For products extracted from the listing page only (no detail page fetched):

| Field | Seattle City Tour | Hotel Pickup | Pre-Cruise | Ultimate Experience | Avg |
|-------|------------------|--------------|-----------|-------------------|-----|
| title | ✅ | ✅ | ✅ | ✅ | 100% |
| price (adult) | ✅ $89 | ✅ $114 | ✅ $114 | ✅ $159 | 100% |
| price (child) | ❌ not on page | ❌ not on page | ❌ not on page | ❌ not on page | 0% |
| duration | ✅ 3hr | ✅ 3hr | ✅ 3hr | ✅ 7hr | 100% |
| ageRestrictions | ✅ 3+ | ✅ All ages | ✅ 3+ | ✅ All ages | 100% |
| seasonality | ✅ Year-round | ✅ Year-round | ✅ Apr-Oct | ✅ May 15-Sep 14 | 100% |
| description | ✅ | ✅ | ✅ | ✅ | 100% |
| locations | ⚠️ partial | ⚠️ hotel pickup noted | ⚠️ hotel + cruise terminal | ❌ none | 25% |
| features | ⚠️ 1-2 highlights | ⚠️ basic | ✅ logistics detail | ⚠️ basic | 50% |
| crossOperatorBundles | N/A | N/A | N/A | ✅ Argosy identified | 100% |

**Listing page product accuracy: ~75% on available fields. Key gap: child pricing hidden in booking widget (JS-rendered, FareHarbor).**

---

## Field Accuracy — Private Tours (listing page only)

| Field | Private Rainier | Private Snoqualmie | Private One Day | Avg |
|-------|----------------|-------------------|----------------|-----|
| title | ✅ | ✅ | ✅ | 100% |
| price | ✅ $1,399 | ✅ $400 | ✅ $1,049 | 100% |
| pricingModel | ✅ PER_BOOKING | ✅ PER_BOOKING | ✅ PER_BOOKING | 100% |
| duration | ✅ 10hr | ✅ 2.5hr | ✅ 6hr | 100% |
| isPrivate | ✅ | ✅ | ✅ | 100% |
| maxUnits | ✅ 5 | ✅ 5 | ✅ 5 | 100% |
| vehicle | ✅ Suburban LTZ | ✅ Suburban LTZ | ✅ Suburban LTZ | 100% |

**Private tour accuracy: ~100% on available fields. Clean extraction from listing page.**

---

## Key Findings

### What worked well:
1. **Core fields extract reliably** — title, adult pricing, duration, age restrictions, seasonality all at ~100%
2. **Pricing model classification** — correctly distinguished PER_UNIT (public) vs. PER_BOOKING (private)
3. **Cross-operator detection** — Argosy combo product correctly identified with partner details
4. **Promo code extraction** — RAINIER10 captured with context (10% off, displayed in banner)
5. **Logistics extraction** — Pre-cruise product's transportation component correctly identified as inclusion
6. **Location details** — When available, pickup points extracted with addresses, times, and parking tips
7. **OCTO alignment** — Schema fields map cleanly to OCTO equivalents

### What failed or degraded:
1. **Child pricing invisible** — FareHarbor booking widget is JS-rendered, pricing tiers beyond "From $X" not in static HTML
2. **Product coverage gaps** — 7 of 15 products not extracted (not in fetched content)
3. **Images not structured** — Alt text captured but image URLs not systematically extracted
4. **FAQs incomplete** — Only captured 2 of ~6 FAQ sections from detail page
5. **Cancellation policy** — Not explicitly stated on any page (may be in FareHarbor widget or email confirmation)

### Critical insight — the FareHarbor wall:
The biggest data gap is **child/tiered pricing locked inside FareHarbor's JS booking widget**. The listing page shows "From $X" (adult price only). Full pricing tiers (adult, child, infant, senior) only appear when you interact with the booking calendar. This is exactly the kind of data that:
- **Path A (extraction) struggles with** — needs JS rendering + widget interaction
- **Path C (Viator API) likely has** — Viator receives full pricing from operators
- **FareHarbor API could provide** — if we can get partner access

This validates the Phase 0 hypothesis: Path A and Path C are complementary, not competing.

### Extraction quality by data source:
| Source | Fields Extracted | Quality |
|--------|-----------------|---------|
| Detail page (full fetch) | 16-18 fields | Excellent (89%) |
| Listing page (full fetch) | 6-8 fields per product | Good (75%) |
| Search snippets | 3-5 fields supplementary | Fair (fills gaps) |
| JS widgets (not fetched) | 0 | None — this is the gap |

---

## Scoring Summary

| Metric | Score | Notes |
|--------|-------|-------|
| Product catalog coverage | 53% (8/15) | Need to fetch more pages |
| Core field accuracy (detail page) | 89% (16/18) | Very strong |
| Core field accuracy (listing page) | 75% | Good but missing child pricing |
| Schema fit (OCTO alignment) | High | Fields map cleanly |
| Cross-operator detection | ✅ | Argosy combo identified |
| Promo code extraction | ✅ | RAINIER10 captured |
| Private/public distinction | ✅ | Pricing model correctly classified |

## Next Steps
1. **Fetch individual tour detail pages** to improve coverage (estimate: +5-6 products at detail-page quality)
2. **Test Firecrawl** on same pages — compare its markdown quality to our web_fetch
3. **Test Firecrawl Extract** with our OCTO schema — does it match this manual extraction?
4. **Investigate FareHarbor widget** — can we fetch the embed URL directly for pricing data?
5. **Move to Operator #2: Shutter Tours** — second extraction test
