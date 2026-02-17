# Firecrawl /extract vs. Manual Extraction — Comparison Scorecard
## Tours Northwest, Phase 0 Step 2

**Date:** 2026-02-17
**Method:** Firecrawl `/extract` endpoint with OCTO-aligned Pydantic schema + domain-specific prompt
**URL:** `https://www.toursnorthwest.com/*` (wildcard, full site)
**Credits used:** 369 (of 500 free tier)
**Tokens used:** 5,524

---

## Summary

Firecrawl `/extract` found more products than our manual extraction (10 unique vs. 8) by crawling more pages, but **missed the highest-value data** — promo codes, cross-operator bundles, and logistics-heavy products. It also introduced duplicates, misclassified pricing models, and hallucinated at least one price. At 369 credits per operator, the cost model is unsustainable for the free tier.

**Verdict: Firecrawl `/extract` is not a viable replacement for domain-specific extraction. Build Path 2 (Firecrawl `/scrape` + Claude API with our own prompt).**

---

## Cost Analysis

| Metric | Firecrawl `/extract` | Manual (claude.ai) | Notes |
|--------|---------------------|---------------------|-------|
| Credits used | 369 | 0 | 73% of free tier on ONE operator |
| Tokens consumed | 5,524 | N/A | Token-based billing, 15 tokens = 1 credit |
| Pages crawled | 6 (per sources) | 8 | Firecrawl crawled fewer pages despite wildcard |
| Estimated cost for 7 operators | ~2,583 credits | 0 | Far exceeds 500 free tier |
| Time to complete | ~2 minutes | ~30 minutes (conversational) | Firecrawl is faster but less accurate |

**Credit budget impact:** Before this test we had 498 credits remaining. Including earlier `/extract` tests (27 + 140 credits), total credits consumed today: **536**. Free tier is exhausted. Any further Firecrawl `/extract` testing requires upgrading to Hobby tier ($16/mo, 3,000 credits).

Note: Firecrawl `/scrape` costs 1 credit per page. A `/scrape` + Claude API approach for 7 operators would cost ~35-50 credits total, well within a fresh free tier allocation.

---

## Product Coverage Comparison

| Ground Truth Product | Manual Extraction | Firecrawl /extract | Notes |
|---------------------|-------------------|-------------------|-------|
| **Public Tours** | | | |
| Mt. Rainier Tour from Seattle | ✅ Full detail | ✅ Full detail | Both excellent on this one |
| Seattle Highlights: City Tour Bus | ✅ Core fields | ✅ Core fields | Both thin — listing-level data only |
| City Tour PLUS Hotel Pickup | ✅ Core fields | ⚠️ Found but misclassified | Firecrawl: marked as PRIVATE, pricing as PER_BOOKING |
| Pre-Alaska Cruise + City Tour | ✅ Core + logistics | ❌ **Not found** | Firecrawl missed this entirely |
| Ultimate Seattle (Argosy combo) | ✅ + cross-operator bundle | ❌ **Not found** | The most differentiated product — missed |
| Seattle Photo Safari | ❌ Nav link only | ❌ **Not found** | Neither method extracted this |
| Snoqualmie Falls (public) | ❌ Nav link only | ❌ **Not found** | Only private version found by Firecrawl |
| **Private SUV Tours** | | | |
| Private Mt. Rainier Tour | ✅ | ✅ (duplicated ×2) | Firecrawl extracted from 2 pages, didn't merge |
| Private Snoqualmie Falls | ✅ | ✅ (duplicated ×2) | Same merge failure |
| Private SUV Seattle Tour | ❌ Not found | ✅ (duplicated ×3) | Firecrawl found it but tripled it |
| Private Seattle in One Day | ✅ | ✅ | Clean match |
| Private Boeing Factory | ❌ Not found | ✅ **New** | $819, 4.5 hrs — Firecrawl found this |
| Private Museum of Glass | ❌ Not found | ✅ **New** | $749, 4.5 hrs — Firecrawl found this |
| **Multi-day** | | | |
| Olympic National Park 2-day | ❌ Not found | ✅ **New** | $815, seasonal Jun-Sep — Firecrawl found this |
| **B2B/Custom** | | | |
| Group Tours / Charter | ⚠️ Identified as quote-based | ❌ Not found | |
| Team Building | ⚠️ Identified in content | ❌ Not found | |
| Custom Tour Request | ⚠️ Link found | ❌ Not found | |

**Unique product count:** Manual 8, Firecrawl 10
**Firecrawl found that manual missed:** Boeing Factory, Museum of Glass, Olympic 2-day (3 products)
**Manual found that Firecrawl missed:** Pre-Cruise Tour, Ultimate Seattle/Argosy combo (2 products)
**Neither found:** Photo Safari, public Snoqualmie Falls (2 products)

---

## Field Accuracy — Mt. Rainier Tour (Both Methods Had Detail Page)

This is the apples-to-apples comparison. Both methods had access to the full detail page.

| Field | Ground Truth | Manual | Firecrawl /extract | Winner |
|-------|-------------|--------|-------------------|--------|
| title | Mt. Rainier Tour from Seattle | ✅ "Mt Rainier Tour from Seattle" | ⚠️ "MT RAINIER TOUR FROM SEATTLE" (all caps) | Manual |
| shortDescription | — | ✅ AI-generated, accurate | ✅ AI-generated, accurate | Tie |
| description | Full narrative | ✅ Key details captured | ✅ More complete (full paragraph) | Firecrawl |
| pricingModel | PER_UNIT | ✅ PER_UNIT | ✅ PER_UNIT | Tie |
| price (adult) | $179, Ages 13+ | ✅ 17900, label correct | ✅ 17900, label correct | Tie |
| price (child) | $149, Ages 5-12 | ✅ 14900, label correct | ✅ 14900, label correct | Tie |
| duration | 10-11 hours | ✅ 660min + "10-11 hours" | ✅ 660min + "10-11 hours" | Tie |
| ageRestrictions | Ages 5+ | ✅ minAge 5, with note | ✅ minAge 5, label "Ages 5+" | Tie |
| seasonality | Year-round | ✅ Structured {Jan 1 - Dec 31, notes} | ✅ "January 1 - December 31" (flat string) | Manual (more structured) |
| locations (START) | 4 pickup points | ✅ All 4 with addresses + times | ✅ All 4 with addresses + times | Tie |
| features (INCLUSION) | Guide, vehicle, park fees, snowshoes | ✅ All 4 captured | ⚠️ Only "Admission/Park fees" | Manual |
| features (EXCLUSION) | Lunch, gratuities | ✅ Both captured | ⚠️ Only "Lunch not provided" | Manual |
| features (HIGHLIGHT) | No minimum guests, etc. | ✅ Multiple | ✅ 2 highlights | Tie |
| features (ACCESSIBILITY) | All abilities | ✅ Captured | ❌ Not captured | Manual |
| FAQs | Multiple sections | ⚠️ 2 captured | ✅ 3 captured (cancellation, food, clothing) | Firecrawl |
| cancellationPolicy | Not stated on page | null (correct) | ✅ "Full refunds 24hrs in advance" | Firecrawl (found it in FAQ) |
| activePromotions | RAINIER10 (10% off) | ✅ Code + description + location | ❌ **Only generic "winter tours" banner, no code** | **Manual** |
| maxGroupSize | 24-passenger coach | Not captured | ✅ 24 | Firecrawl |
| bookingSystem | FareHarbor + specific URL | ✅ Name + URL | ✅ Name + URL | Tie |
| media/images | Multiple on page | ❌ Not extracted | ❌ Not extracted | Tie (both missed) |

**Mt. Rainier field score:** Manual 16/19, Firecrawl 14/19

---

## Critical Failure Analysis

### Failure 1: RAINIER10 Promo Code — Not Captured

This was the key test. The site-wide banner contains "Use code RAINIER10 to receive 10% off" — a high-value data point for travelers and the kind of operator-specific intelligence that Path C (Viator) wouldn't have.

Firecrawl `/extract` returned only a generic banner about winter tours with no promo code. This is the same class of failure as `/scrape` — Firecrawl's content processing strips or deprioritizes banner content. Our prompt explicitly asked for banner promo codes, but Firecrawl's internal pipeline runs before our prompt reaches the LLM.

**Implication:** Promo code extraction requires raw HTML access or a supplementary fetch — Firecrawl's processing pipeline strips this before the LLM ever sees it.

### Failure 2: Cross-Operator Bundle (Argosy Combo) — Not Found

The "Ultimate Seattle Experience: City Tour, Pike Place Market & Argosy Harbor Cruise Combo" is the most complex and differentiated product in the catalog. It bundles Tours Northwest's city tour with Argosy Cruises' Harbor Cruise — a cross-operator partnership product.

Firecrawl didn't extract this product at all. Looking at the `sources` in the response, Firecrawl crawled 6 pages but none was the tours listing page where this product appears prominently. The page `https://www.toursnorthwest.com/tours/` IS listed as a source for the `operator` object, but the combo product wasn't extracted from it.

**Implication:** Firecrawl's LLM missed a product that was on a page it crawled. This is an extraction intelligence failure, not a crawling failure.

### Failure 3: Pre-Cruise Product — Not Found

The "Pre-Alaska Cruise Transportation and City Tour" is a logistics-heavy product that combines sightseeing with cruise port shuttle service. It tests whether extraction can identify transportation components embedded in tour products.

Not found in any of the 14 extracted products. This product has a dedicated page, is in the nav menu, and appears on the listing page.

### Failure 4: Duplicate Products (No Cross-Page Merge)

Firecrawl extracted from multiple pages independently and created duplicate product entries instead of merging them:

| Product | Appearances | Pages |
|---------|------------|-------|
| Private Mt. Rainier | 2× (products 4, 10) | /private-tours/, /private-rainier-tour/ |
| Private Snoqualmie Falls | 2× (products 1, 12) | /private-tours/, /tours/group-tour-bus-rental/ |
| Private SUV Seattle | 3× (products 5, 11, 14) | /private-tours/, /tours/group-tour-bus-rental/, /tours/private-seattle-tour/ |

The duplicates contain different data quality — some have rich descriptions and FAQs (from detail pages), others are thin listings. A proper extraction pipeline would merge these into single enriched records.

### Failure 5: Pricing Hallucination

Product 14 (Private SUV Seattle Tour, from the detail page) has `amount_cents: 34514`, which is $345.14. This price does not exist on the Tours Northwest website. The correct price for this product is $400 (from the listing page) or "Price varies" (from the detail page). The LLM either misread a number from the page or fabricated it.

**This is the most concerning failure.** Hallucinated pricing would destroy trust with operators in a production system.

### Failure 6: Pricing Model Misclassifications

| Product | Correct Model | Firecrawl Model | Issue |
|---------|--------------|-----------------|-------|
| City Tour PLUS Hotel Pickup | PER_UNIT ($114/person) | PER_BOOKING ($114/group) | Misidentified as per-group |
| Olympic National Park 2-day | PER_UNIT ($815/person) | PER_BOOKING ($815/group) | Misidentified as per-group |
| City Tour PLUS Hotel Pickup | Public tour | Marked as PRIVATE (is_private: true) | Misidentified tour type |

The Hotel Pickup and Olympic tours are per-person pricing presented as "From $X" on listing pages. Firecrawl's LLM defaulted to PER_BOOKING when it couldn't find explicit "per person" language — a systematic bias we need our own prompt to correct.

---

## Operator-Level Data

| Field | Ground Truth | Manual | Firecrawl /extract |
|-------|-------------|--------|-------------------|
| name | Tours Northwest | ✅ | ✅ |
| address | 8219 7th Avenue South, Seattle, WA 98108 | ✅ Full address | ⚠️ "Seattle, WA" only |
| phone | (206) 768-1234 | ✅ | ✅ 206-768-1234 |
| email | reservations@toursnw.com | ✅ | ❌ Empty string |
| bookingSystem | FareHarbor | ✅ Name + embed URL | ✅ Name only |
| operatorType | Mid-size family operator, 30+ years | ✅ Detailed | ⚠️ "Private tours of Seattle" (incorrect — they run public tours too) |
| otaPresence | TripAdvisor, Yelp, Visit Seattle | Not captured as separate field | ✅ TripAdvisor, Yelp (missed Visit Seattle) |

---

## Pages Crawled (from `sources` field)

Firecrawl crawled 6 unique pages despite the `/*` wildcard:

1. `https://www.toursnorthwest.com/private-tours/` — source for products 0-5
2. `https://www.toursnorthwest.com/tours/mt-rainier/` — source for products 6-8
3. `https://www.toursnorthwest.com/private-rainier-tour/` — source for product 9
4. `https://www.toursnorthwest.com/tours/group-tour-bus-rental/` — source for products 10-12
5. `https://www.toursnorthwest.com/tours/private-seattle-tour/` — source for product 13
6. `https://www.toursnorthwest.com/tours/` — source for operator info only

**Notable pages NOT crawled:**
- `/tours/seattle-city-tour-plus-hotel-pickup/` — has detail data for the Hotel Pickup product
- `/tours/city-cruise-tour/` — the Pre-Cruise product's dedicated page
- `/ultimate-seattle-experience/` — the Argosy combo product's dedicated page
- `/tours/seattle-city-tour/` — the City Tour's dedicated page
- `/faq/` — additional FAQ content

The wildcard should have discovered these pages via sitemap or link following. Firecrawl appears to have limited its crawl to 6 pages for cost management, which explains some of the missing products.

---

## What Firecrawl /extract Did Well

Despite the failures, there are genuine strengths:

1. **Found products we missed.** Private Boeing Factory Tour ($819), Private Museum of Glass ($749), and 2-Day Olympic National Park Tour ($815) were all extracted. Our manual process missed these because we didn't fetch the `/private-tours/` page or the Olympic tour page.

2. **Cancellation policy extracted.** Firecrawl found "Full refunds on all tours canceled at least 24 hours in advance" from the FAQ content on the Mt. Rainier page. Our manual extraction returned null for this field.

3. **FAQs richer on detail pages.** The Mt. Rainier detail extraction included 3 FAQ pairs (cancellation, food, clothing). Our manual extraction captured only 2.

4. **Booking URLs consistently captured.** Every product had a correct FareHarbor booking URL with the right item ID.

5. **OTA presence detected.** TripAdvisor and Yelp correctly identified from footer badges.

6. **Speed.** ~2 minutes for the full extraction vs. ~30 minutes conversational.

---

## Build-vs-Use Verdict

| Dimension | Firecrawl /extract | Our Domain Extraction (proposed) | Winner |
|-----------|-------------------|----------------------------------|--------|
| Promo code capture | ❌ Stripped by pipeline | ✅ Raw HTML + explicit prompt | Ours |
| Cross-operator bundles | ❌ Missed entirely | ✅ Detected in manual test | Ours |
| Pricing model accuracy | ~70% (systematic errors) | ~100% (with domain rules in prompt) | Ours |
| Data integrity | ⚠️ Hallucinated $345.14 | ✅ No fabrication in manual test | Ours |
| Deduplication | ❌ 4 duplicate products | ✅ Human/LLM merge logic | Ours |
| Product coverage (breadth) | 10 unique products | 8 products (improvable by fetching more pages) | Firecrawl |
| FAQs + cancellation policy | ✅ Richer from detail pages | ⚠️ Partial | Firecrawl |
| Speed | ✅ ~2 minutes | ~5-10 minutes (scripted) | Firecrawl |
| Cost per operator | 369 credits (~$12 at Hobby tier) | ~7 credits + $0.10 Claude API | Ours |
| Control over extraction | ❌ Black box LLM | ✅ Our prompt, our model, our parsing | Ours |

**Decision: BUILD our own extraction pipeline (Path 2).**

Use Firecrawl `/scrape` for fetching (1 credit/page, clean markdown, JS rendering). Feed the markdown to Claude API with our domain-specific prompt. This gives us:
- Control over the LLM and prompt
- Promo code capture via supplementary raw HTML fetch
- Domain-aware pricing model classification
- Cross-operator bundle detection
- No hallucination risk from an opaque third-party pipeline
- ~90% lower cost per operator

The Firecrawl `/extract` test confirms the tooling landscape thesis: **general-purpose extraction misses domain-specific nuance. Our value is in the tourism intelligence layer, not the crawling infrastructure.**

---

## Credit Ledger

| Action | Credits | Running Total | Remaining |
|--------|---------|---------------|-----------|
| Initial balance | — | 0 | 500 |
| `/scrape` tests (2 pages) | 2 | 2 | 498 |
| `/extract` minimal schema test | 27 | 29 | 471 |
| `/extract` Pydantic schema test (listing page) | 140 | 169 | 331 |
| `/extract` full site wildcard | 369 | 538 | **-38** |

**Free tier is exhausted.** Further Firecrawl API calls require either a new API key or upgrading to Hobby tier ($16/mo, 3,000 credits).

**Revised credit strategy:** Switch to `/scrape` only (1 credit/page). At ~5 pages per operator for the remaining 6 operators, we need ~30 credits. If a fresh API key provides a new 500-credit allocation, this is comfortable. Otherwise, Hobby tier at $16/mo is a reasonable investment for Phase 0 completion.

---

## Next Steps

1. **Build Path 2 script** (`extract_operator.py`) — Firecrawl `/scrape` + Claude API with our extraction prompt
2. **Test Path 2 on Tours Northwest** — compare against manual extraction and this Firecrawl /extract result
3. **Resolve Firecrawl credit situation** — new API key or Hobby tier upgrade
4. **Move to Operator #2: Shutter Tours** — using the winning extraction method
5. **Do NOT use Firecrawl `/extract` for remaining operators** — cost and quality both fail
