# Bill Speidel's Underground Tour — Extraction Scorecard v1

**Extracted**: 2026-02-17
**Method**: Path 2 (Firecrawl `/scrape` + Claude Opus 4.6)
**Pages scraped**: 4 (homepage + what-to-expect + groups + history)
**Cost**: 4 Firecrawl credits + $0.40 Claude API
**Ground truth source**: `docs/phase0_spike.md` Section 4 (Bill Speidel's recon)
**Difficulty**: EASY — single iconic product, control case

---

## Operator-Level Fields

| Field | Extracted | Ground Truth | Score |
|-------|-----------|-------------|-------|
| name | Bill Speidel's Underground Tour | Bill Speidel's Underground Tour | ✅ |
| url | undergroundtour.com | undergroundtour.com | ✅ |
| address | 614 1st Avenue, Pioneer Square, Seattle, WA | Not in recon | ✅ (bonus) |
| phone | 206-682-4646 | Not in recon | ✅ (bonus) |
| bookingSystem | Gatemaster | Gatemaster Tickets | ✅ |
| operatorType | Historical underground walking tour | Single iconic experience — underground walking tour | ✅ |
| otaPresence | TripAdvisor | TripAdvisor (confirmed in recon) | ✅ |

**Operator score: 7/7**

---

## Product Detection

| Recon | Extracted | Notes |
|-------|-----------|-------|
| One product | 2 products | Main tour + Private Group Tour (bonus — discovered from /groups/ page) |

### Products Found

| # | Product | Notes |
|---|---------|-------|
| 1 | Bill Speidel's Underground Tour | Core product — the control case |
| 2 | Private Underground Tour (Groups) | Bonus — quote-based, min 10 adults, corporate/events/education |

---

## Key Extraction Questions (from recon)

### 1. Can AI extract from a site where the website IS the product?
**YES** — No dedicated /tours/ or /underground-tour/ page exists. The extraction correctly synthesized product data from the homepage and what-to-expect page into a single coherent product definition. This was the fundamental test and it passed.

### 2. How does extraction handle distributed info across pages?
**WELL** — The homepage provided the booking link and basic info. The what-to-expect page provided duration (75 min), accessibility info, and scheduling details. The groups page yielded a second product (private group tours). The history page provided context for the operator description. All synthesized correctly.

### 3. Gatemaster as a different booking system?
**YES** — Correctly identified as Gatemaster with the full booking URL. Third distinct booking platform type in our test set (alongside FareHarbor and Bookeo). Validates that Path A extraction works regardless of booking system.

### 4. Pricing captured?
**NO** — "Specific pricing not listed on the website pages provided." This is the **FareHarbor/Gatemaster wall** in action. Ticket pricing lives inside the Gatemaster JS widget, which Firecrawl's markdown output doesn't capture. The AI was honest about the gap rather than hallucinating a price.

This confirms a key finding: pricing behind JS booking widgets is the primary extraction gap. The AI handles the absence correctly (no hallucination), but the data simply isn't in the scraped content.

### 5. Museum/venue model vs. tour model?
**HANDLED** — The extraction correctly treated this as a scheduled attraction with entry times rather than a departure-based guided tour. Season/schedule data is rich: seasonal hours, holiday closures, summer extra-tour windows. This is more "attraction hours" than "tour departure times."

---

## Field-by-Field Scoring

| Field | Accuracy | Notes |
|-------|----------|-------|
| title | ✅ 2/2 | Main tour + group tour |
| url | ✅ 2/2 | Homepage and /groups/ |
| pricingModel | ✅ | PER_UNIT for main, quote-based for groups |
| priceByUnit | ❌ | Not on website — Gatemaster widget pricing |
| duration | ✅ | 75 minutes |
| seasonality | ✅ | Detailed seasonal hours, holiday closures |
| features (inclusions) | ✅ | Guided tour + underground access |
| features (accessibility) | ✅ | Stairs, uneven terrain, no high heels |
| features (highlights) | ✅ | TripAdvisor award, humorous guides |
| bookingSystem | ✅ | Gatemaster with URL |
| isPrivate | ✅ | Group tour correctly flagged |
| locations | ✅ | 614 1st Avenue as START |
| ageRestrictions | ✅ | Children 6 and under free |

---

## Summary

| Metric | Result |
|--------|--------|
| Products found | 2 (1 expected + group tour bonus) |
| Website-as-product extraction | ✅ Passed — no dedicated tour page needed |
| Distributed info synthesis | ✅ Data from 4 pages correctly combined |
| Gatemaster detection | ✅ Third booking platform type |
| Pricing | ❌ Missing — behind Gatemaster JS widget |
| Schedule/hours | ✅ Seasonal hours, summer extras, holiday closures |
| Honesty on missing data | ✅ "Not listed on pages provided" — no hallucination |
| Field coverage | 11/13 (pricing gap is scraping limitation, not extraction failure) |
| Cost | 4 credits + $0.40 |

**Overall assessment**: The control case passed cleanly. The extraction correctly handled the fundamental challenge: a website where the product IS the website, with information distributed across multiple pages. Gatemaster booking system was correctly identified. The only gap is pricing — locked behind the Gatemaster JS widget. Importantly, the AI was honest about this gap ("not listed on pages provided") rather than guessing. This pricing gap is structural (JS widget wall) and affects all booking platforms, confirming the Path A + Path C complementary model: extraction captures everything except widget-locked pricing, which comes from Viator/OTA APIs.
