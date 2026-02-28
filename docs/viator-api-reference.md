# Viator Partner API — Basic Tier Reference

---
**Last Updated**: February 28, 2026
**Source**: `docs/viator-openapi.json` (OpenAPI 3.0 spec from Viator)
**Tier**: Basic-Access Affiliate (free)
---

## Quick Facts

- **Base URL**: `https://api.viator.com/partner`
- **Sandbox URL**: `https://api.sandbox.viator.com/partner`
- **Auth header**: `exp-api-key: <VIATOR_API_KEY>`
- **Version header**: `Accept: application/json;version=2.0`
- **Rate limiting**: Per-endpoint, per-PUID, 10-second rolling window
- **Rate limit headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`

---

## Basic-Tier Available Endpoints (10)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | `GET` | `/products/{product-code}` | Full product details |
| 2 | `POST` | `/products/search` | Search products by destination |
| 3 | `GET` | `/products/tags` | Tag definitions (category labels) |
| 4 | `GET` | `/destinations` | All 3,380+ destinations |
| 5 | `POST` | `/exchange-rates` | Currency conversion rates |
| 6 | `POST` | `/attractions/search` | Find attractions by destination |
| 7 | `GET` | `/attractions/{attraction-id}` | Attraction details |
| 8 | `GET` | `/availability/schedules/{product-code}` | Pricing & schedule |
| 9 | `POST` | `/locations/bulk` | Resolve location references |
| 10 | `POST` | `/search/freetext` | Free-text product search |

### NOT Available at Basic Tier

| Method | Endpoint | Requires |
|--------|----------|----------|
| `GET` | `/products/modified-since` | Full-access |
| `POST` | `/products/bulk` | Full-access |
| `POST` | `/reviews/product` | Full-access |
| All | `/bookings/*` | Full-access (merchants) |
| All | `/availability/check` | Full-access |

---

## Endpoints We Use

### 1. GET /destinations

Returns all destinations with rich metadata. **3,380+ destinations** (not 2,500 as originally estimated).

**Response fields per destination:**
```
destinationId        integer    Used as filtering.destination in /products/search (as string)
name                 string     e.g. "Seattle"
type                 string     CITY | COUNTRY | REGION | STATE | ISLAND | etc.
parentDestinationId  integer    Parent in hierarchy
lookupId             string     Full hierarchy path e.g. "8.77.278.672.59070"
timeZone             string     IANA timezone e.g. "US/Pacific"
center.latitude      number     Geo coordinates
center.longitude     number
defaultCurrencyCode  string     e.g. "EUR"
iataCodes[]          string[]   Airport codes
destinationUrl       string     Affiliate URL
```

**Cache policy**: Refresh weekly.

---

### 2. POST /products/search

Search products within a destination. Max 50 results per page.

**Request body:**
```json
{
  "filtering": {
    "destination": "704",           // REQUIRED — destinationId as string
    "tags": [21972],                // optional — products must match ALL
    "flags": ["FREE_CANCELLATION"], // optional
    "rating": { "from": 4 },       // optional
    "lowestPrice": 10,              // optional
    "highestPrice": 500             // optional
  },
  "sorting": {
    "sort": "TRAVELER_RATING",      // DEFAULT | PRICE | TRAVELER_RATING | ITINERARY_DURATION | DATE_ADDED
    "order": "DESCENDING"           // ASCENDING | DESCENDING (TRAVELER_RATING only allows DESCENDING)
  },
  "pagination": {
    "start": 1,                     // 1-based
    "count": 50                     // max 50
  },
  "currency": "USD"                 // REQUIRED
}
```

**Available sort options:**
| Sort | Ascending | Descending |
|------|-----------|------------|
| `DEFAULT` | ✓ | ✓ |
| `PRICE` | ✓ | ✓ |
| `TRAVELER_RATING` | ✗ | ✓ only |
| `ITINERARY_DURATION` | ✓ | ✓ |
| `DATE_ADDED` | ✓ | ✓ |

**Available filter flags:**
`NEW_ON_VIATOR`, `FREE_CANCELLATION`, `SKIP_THE_LINE`, `PRIVATE_TOUR`, `SPECIAL_OFFER`, `LIKELY_TO_SELL_OUT`

**Response fields per product:**
```
productCode          string
title                string
description          string
images[]             { isCover, caption, variants[]: { height, width, url } }
reviews              { totalReviews, combinedAverageRating }
duration             { fixedDurationInMinutes, variableDurationFromMinutes/To }
pricing.summary      { fromPrice, fromPriceBeforeDiscount }
pricing.currency     string
productUrl           string     Affiliate URL (already has tracking)
destinations[]       [{ ref, primary }]
tags[]               integer[]
flags[]              string[]   e.g. ["FREE_CANCELLATION", "LIKELY_TO_SELL_OUT"]
confirmationType     "INSTANT" | "MANUAL" | "INSTANT_THEN_MANUAL"
itineraryType        "STANDARD" | "ACTIVITY" | "MULTI_DAY_TOUR" | etc.
```

---

### 3. GET /products/{product-code}

Full product details. Much richer than search results.

**Key fields beyond search results:**
```
timeZone             string     IANA timezone
itinerary            object     Detailed itinerary with duration, skipTheLine, privateTour
inclusions[]         { category, type, typeDescription, otherDescription }
exclusions[]         Same shape as inclusions
additionalInfo[]     Facts for travelers
logistics            Start/end points, pickup info
supplier             { name, reference }
cancellationPolicy   Cancellation details
bookingQuestions[]    Required booking info
productOptions[]     Tour grades/variants
images[]             Full image set (10-31 images typically)
reviews              { totalReviews, combinedAverageRating, sources[], reviewCountTotals[] }
```

---

### 4. GET /products/tags

Tag definitions for resolving tag IDs from search/detail results.

**Response:**
```json
{
  "tags": [
    {
      "tagId": 21972,
      "parentTagIds": [21911],
      "allNamesByLocale": { "en": "Food & Drink", "fr": "Gastronomie" }
    }
  ]
}
```

**Cache policy**: Refresh weekly.

---

### 5. POST /exchange-rates

Convert between currencies. All availability pricing is in supplier's currency.

**Cache policy**: Refresh based on `expiry` field (daily updates).

---

### 6. GET /availability/schedules/{product-code}

Live pricing and schedule. Returns pricing in **supplier's native currency** (not USD).

Useful for: accurate per-person pricing, available days of week, seasonal pricing.

---

## Integration Notes

1. **Destination IDs are strings in search** — `filtering.destination` expects a string even though IDs are integers from `/destinations`.

2. **`fromPrice` in search** is based on recommended retail price for 2+ adults, looking 384 days ahead. Not a guaranteed booking price.

3. **`productUrl` already has affiliate tracking** — no need to append affiliate parameters manually.

4. **Rate limiting is per-endpoint** — hitting the limit on `/products/search` doesn't affect `/products/{code}`. Read `RateLimit-Remaining` header to throttle intelligently.

5. **3,380 destinations, not 2,500** — the actual count from the API is higher than our earlier estimates.

6. **Sorting note**: Our 4-query indexer strategy should use `DEFAULT`, `PRICE` (ascending), `TRAVELER_RATING` (descending), and `DATE_ADDED` (descending) — these map to Viator's actual sort options.
