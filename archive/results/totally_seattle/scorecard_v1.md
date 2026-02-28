# Totally Seattle — Extraction Scorecard v1

**Extracted**: 2026-02-17
**Method**: Path 2 (Firecrawl `/scrape` + Claude Opus 4.6)
**Pages scraped**: 8 (homepage + private tours + tour enhancers + step-on + corporate + 3 tour detail pages)
**Cost**: 8 Firecrawl credits + $1.18 Claude API
**Ground truth source**: `docs/phase0_spike.md` Section 3 (Totally Seattle recon)
**Difficulty**: HARD — per-group tiered pricing, add-ons, B2B services

---

## Operator-Level Fields

| Field | Extracted | Ground Truth | Score |
|-------|-----------|-------------|-------|
| name | Totally Seattle & Beyond | Totally Seattle | ✅ |
| url | totallyseattle.com | totallyseattle.com | ✅ |
| phone | 206-522-5994 | Not in recon | ✅ (bonus) |
| email | info@totallyseattle.com | Not in recon | ✅ (bonus) |
| bookingSystem | FareHarbor | FareHarbor | ✅ |
| operatorType | Private/luxury tour operator | Private/custom driving tours + specialty | ✅ |
| otaPresence | TripAdvisor, Google, Facebook | Not in recon | ✅ |

**Operator score: 7/7**

---

## Product Detection

| Recon | Extracted | Notes |
|-------|-----------|-------|
| Tiered driving tours, add-ons, step-on, corporate, custom | 13 products found | Good coverage — driving tours, walking tours, day trips, B2B, corporate, custom |

### Products Found

| # | Product | Type | Notes |
|---|---------|------|-------|
| 1 | History & Landmarks City Tour | Private driving | Core product |
| 2 | Snoqualmie Falls & Cascade Mountain | Private driving | Nature tour |
| 3 | Seattle Art Gallery Tour | Private driving | Specialty |
| 4 | Pike Place Market Walking Tour | Private walking | Detailed extraction with FareHarbor link |
| 5 | Post Alaskan Cruise Tour | Private driving | Cruise-specific |
| 6 | Mt. Rainier National Park | Private day trip | $1,675 |
| 7 | Soar, Sip & Sail | Premium package | $8,250 |
| 8 | Olympic National Park & Whale Watching | Multi-day | $7,750 |
| 9 | Bainbridge Island & Kitsap Peninsula | Private day trip | $1,475 |
| 10 | Step-On Guide Service | B2B | Correctly identified as guide-only, no vehicle |
| 11 | Seattle's Best in a Day (walking) | Public tour | Correctly flagged as "COMING SOON" |
| 12 | Corporate Events | B2B | Quote-based |
| 13 | Custom Experiences | Custom | Quote-based |

---

## Key Extraction Questions (from recon)

### 1. Can AI handle tiered pricing (Silver/Gold/Platinum)?
**PARTIALLY** — The extraction correctly:
- Identified that Silver, Gold, and Platinum packages exist
- Used the "from" qualifier ("From $675 per booking")
- Noted "Exact package pricing not visible on pages provided"
- Captured that Silver/Platinum accommodate up to 12 guests, Gold up to 6

What it **missed** (from recon):
- Silver: $675/4hrs + $125/additional hr, up to 6 passengers
- Gold: $785/4hrs + $175/additional hr, up to 7 passengers
- Platinum: $1,250/4hrs + $250/additional hr, up to 6 passengers

**Verdict**: The AI was honest about what it couldn't see. If the tier pricing was on the `/private-tours/` page in the scraped markdown, this is a miss. If the pricing was in a JS widget or image, it's a scraping limitation, not an extraction failure. Need to verify.

### 2. How does AI represent add-ons?
**EXCELLENT** — Used `upgradeModifiers` array on relevant products. The Pike Place walking tour has 7 upgrade modifiers:
- 5-Attraction Ticket Package: $250/person
- Space Needle + Chihuly Combo: $90/person ✅ (matches recon: $90/person)
- Space Needle Only: $60/person
- Chihuly Only: $55/person
- MoPop: $45/person
- Pacific Science Center: $30/person
- Foreign Language Guide: $50/hour

This is the right schema pattern — add-ons as modifiers on the base product, not as separate products.

### 3. Per-group pricing?
**YES** — All private tours correctly use `PER_BOOKING` pricing model. The AI correctly distinguished between:
- Private driving tours: PER_BOOKING (per group) ✅
- Public walking tour: PER_UNIT ($109/adult, $99/child) ✅
- Step-on service: PER_BOOKING ($575/4hr minimum) ✅

This was THE key recon question and the extraction nailed the distinction.

### 4. Missing add-on prices?
**Partially tested** — The recon noted some add-ons have "—" for price. The extracted add-ons all have prices, which either means: (a) the AI only captured add-ons with prices, or (b) all visible add-ons had prices. Not a clear failure — would need to cross-reference the tour-enhancers page to verify.

### 5. Extra logistics fees?
**Not captured** — Recon noted:
- SeaTac Airport pickup: $100 (curbside) or $200 (baggage claim greeter)
- Cruise port pickup: $100
- Outside Seattle city limits: $50

These weren't extracted. The Post Cruise Tour does note "Cruise port pickup included" and has a higher base price ($795 vs $675), suggesting the fee is built in. But the individual surcharges weren't extracted as separate line items.

### 6. Step-on Services captured?
**YES** — Product #10 correctly identified as "Guide joins your own vehicle — no vehicle provided" with $575/4hr minimum and $75/additional hour. B2B offering correctly classified.

### 7. Corporate events?
**YES** — Identified as quote-based with notable clients (Boeing, Amazon, Netflix, etc.).

---

## Field-by-Field Scoring

| Field | Accuracy | Notes |
|-------|----------|-------|
| title | ✅ 13/13 | Clear, accurate product names |
| url | ✅ 13/13 | Correct URLs including tours not scraped (discovered from links) |
| pricingModel | ✅ 13/13 | PER_BOOKING vs PER_UNIT correctly assigned for every product |
| priceByUnit | ⚠️ | Base prices correct but Silver/Gold/Platinum tier breakdown missing |
| duration | ✅ 10/13 | Captured where available, correctly missing for premium/custom |
| seasonality | ✅ | Mt. Rainier "June-September", "COMING SOON" for public tour |
| features (inclusions) | ✅ | Detailed per product |
| features (exclusions) | ✅ | Tax, gratuity, meals correctly noted |
| upgradeModifiers | ✅ | 7+ add-ons with per-person pricing on walking tour. Excellent. |
| isPrivate | ✅ | 11 of 13 correctly flagged as PRIVATE |
| locations | ✅ | Pickup points captured where available |
| bookingSystem | ✅ | FareHarbor with booking URL for walking tour |
| accessibility | ✅ | Walking tour: "Not wheelchair accessible, moderate fitness required" |

---

## Summary

| Metric | Result |
|--------|--------|
| Products found | 13 (comprehensive — driving, walking, day trip, B2B, corporate, custom) |
| Per-group pricing | ✅ PER_BOOKING correctly used for all private tours |
| Tiered pricing (Silver/Gold/Platinum) | ⚠️ Acknowledged but specific tier prices not extracted |
| Add-on representation | ✅ Excellent — upgradeModifiers with per-person pricing |
| B2B products | ✅ Step-on and corporate both captured |
| Product status detection | ✅ "COMING SOON" flagged for public walking tour |
| Field coverage | High — 12/13 fields populated accurately |
| Notable win | PER_BOOKING vs PER_UNIT distinction, upgradeModifiers pattern |
| Notable gap | Tier-specific pricing ($675/$785/$1250), logistics surcharges |
| Cost | 8 credits + $1.18 |

**Overall assessment**: This was the HARD pricing test and the extraction handled it well. The fundamental challenge — per-group vs per-person pricing — was correctly classified for every product. Add-ons were represented as upgrade modifiers (the right schema pattern). The main gap is tier-specific pricing for Silver/Gold/Platinum packages; the AI acknowledged tiers exist but couldn't extract individual prices, noting they weren't visible in the provided pages. This could be a scraping limitation (pricing behind JS/widget) rather than an extraction failure. The "COMING SOON" detection and B2B product identification are strong bonus signals.
