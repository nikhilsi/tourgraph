# Data Snapshot

---
**Snapshot Date**: March 2, 2026 — 7:30 AM PST
**Database File**: `data/tourgraph.db` (474 MB)
**Schema**: `docs/data-schema.md`
**Purpose**: Baseline for tracking deltas on future data refreshes
---

## The Data Asset (4 IP Layers)

TourGraph's data is built in layers. Each layer adds original intelligence on top of the previous one.

| Layer | What | Source | Count | Status |
|-------|------|--------|-------|--------|
| 1. Raw Viator Data | Tour listings: titles, photos, ratings, prices, locations | Viator Partner API | 136,256 tours | **Complete** |
| 2. AI One-Liners | Witty personality captions per tour | Claude Haiku 4.5 | 136,256 (100%) | **Complete** |
| 3. City Intelligence | City profiles: personality, standout tours, themes | Claude Sonnet 4.6 | 910 cities (1,799 readings) | **Complete** |
| 4. Chain Connections | Thematic chains connecting cities around the world | Claude Sonnet 4.6 | ~500 chains | **Pending** |

Layer 1 is commodity — anyone with a Viator API key has it. Layer 2 is derivative IP — Viator doesn't have these. Layers 3 and 4 are original intelligence that couldn't be reproduced with the same results. Together, they form a unique understanding of the world's tour landscape that exists nowhere else.

For Layer 3 design: `docs/city-intelligence.md`. For Layer 4 design: `docs/six-degrees-chains.md`.

---

## Layer 1: Raw Viator Data

### Summary

| Metric | Value |
|--------|-------|
| Total tours (all statuses) | 136,303 |
| Active tours | 136,256 |
| Inactive tours | 47 |
| Destinations (total) | 3,380 |
| Leaf destinations (indexed) | 2,712 |
| Countries | 205 |
| Continents | 7 |
| Timezones | 289 |
| Database size | 474 MB |

### Field Coverage (Active Tours)

| Field | Count | Coverage |
|-------|-------|----------|
| Image URL | 136,256 | 100.0% |
| Price | 136,256 | 100.0% |
| Description | 136,256 | 100.0% |
| Viator URL | 136,256 | 100.0% |
| Duration | 135,084 | 99.1% |
| Rating | 91,098 | 66.9% |
| Highlights | 0 | 0.0% (not fetched at Basic tier) |

### Continent Distribution

| Continent | Tours | % |
|-----------|-------|---|
| Europe | 46,591 | 34.2% |
| Asia | 28,779 | 21.1% |
| North America | 23,578 | 17.3% |
| Africa | 13,752 | 10.1% |
| South America | 13,092 | 9.6% |
| Oceania | 5,548 | 4.1% |
| Caribbean | 4,916 | 3.6% |

### Weight Categories

| Category | Tours | % |
|----------|-------|---|
| exotic_location | 87,289 | 64.1% |
| most_expensive | 25,779 | 18.9% |
| highest_rated | 9,336 | 6.9% |
| cheapest_5star | 5,767 | 4.2% |
| unique | 5,353 | 3.9% |
| wildcard | 1,411 | 1.0% |
| most_reviewed | 1,321 | 1.0% |

### Top 15 Countries

| Country | Tours |
|---------|-------|
| USA | 16,766 |
| Italy | 8,078 |
| Mexico | 4,420 |
| India | 4,356 |
| Japan | 4,347 |
| China | 4,169 |
| France | 4,137 |
| United Kingdom | 3,837 |
| Spain | 3,609 |
| Australia | 2,948 |
| Greece | 2,901 |
| Vietnam | 2,781 |
| Indonesia | 2,549 |
| Portugal | 2,475 |
| Canada | 2,392 |

### Top 15 Destinations

| Destination | Country | Tours |
|-------------|---------|-------|
| Portland | USA | 272 |
| London | United Kingdom | 200 |
| Buenos Aires | Argentina | 199 |
| Krakow | Poland | 199 |
| Rio de Janeiro | Brazil | 199 |
| Bangkok | Thailand | 198 |
| Cusco | Peru | 198 |
| Las Vegas | USA | 198 |
| Mexico City | Mexico | 198 |
| Prague | Czech Republic | 198 |
| Ubud | Indonesia | 198 |
| Barcelona | Spain | 197 |
| Dubai | United Arab Emirates | 197 |
| Porto | Portugal | 197 |
| Singapore | Singapore | 197 |

### Rating Stats (91,098 tours with ratings)

| Metric | Value |
|--------|-------|
| Average rating | 4.76 |
| Min rating | 1.0 |
| Max rating | 5.0 |
| Rated 4.5+ | 76,791 (84.3%) |
| Perfect 5.0 | 45,748 (50.2%) |

### Price Stats

| Metric | Value |
|--------|-------|
| Average price | $490.41 |
| Min price | $0.06 |
| Max price | $3,270,000.00 |
| Under $25 | 16,538 (12.1%) |
| Over $1,000 | 14,261 (10.5%) |

---

## Layer 2: AI One-Liners

| Metric | Value |
|--------|-------|
| Coverage | 136,256 / 136,256 (100%) |
| Average length | 83.9 chars |
| Min length | 27 chars |
| Max length | 149 chars |
| Truncated (ends with ...) | 4 |
| Duplicate one-liners | 62 unique phrases shared by 138 tours |
| Model | Claude Haiku 4.5 |
| Cost | ~$0.40 |

---

## Layer 3: City Intelligence — Complete

| Metric | Value |
|--------|-------|
| Cities profiled | 910 |
| Total readings | 1,799 (stored in `city_readings`) |
| Avg readings per city | 2.0 |
| Personality avg length | ~140 chars |
| Themes per city | avg 11.6 (union of all readings) |
| Standout tours per city | avg 6.0 (union deduped by tour_id) |
| Model | Claude Sonnet 4.6 |
| Cost | ~$12 (Batch API at 50% discount + prompt caching) |
| Duration | ~16 min batch + ~10 min sequential gap fill |

### Theme Distribution (Top 20)

| Theme | Cities |
|-------|--------|
| photography | 864 |
| wildlife | 783 |
| water | 782 |
| cuisine | 752 |
| ancient-history | 707 |
| hiking | 689 |
| architecture | 564 |
| street-food | 563 |
| geological | 539 |
| colonial-history | 539 |
| drinks | 500 |
| craftsmanship | 500 |
| wellness | 464 |
| dark-tourism | 437 |
| nightlife | 358 |
| festivals | 345 |
| sacred | 327 |
| markets | 303 |
| music | 195 |
| street-art | 176 |

### Continent Coverage

| Continent | Cities | Tours Covered | Avg Tours/City |
|-----------|--------|---------------|----------------|
| Europe | 307 | 38,127 | 124 |
| Asia | 196 | 23,771 | 121 |
| North America | 165 | 19,689 | 119 |
| Africa | 89 | 11,623 | 131 |
| South America | 82 | 9,981 | 122 |
| Caribbean | 36 | 4,172 | 116 |
| Oceania | 34 | 3,735 | 110 |

See `docs/city-intelligence.md` for full pipeline design.

---

## Layer 4: Chain Connections — Pending

~500 thematic chains connecting cities around the world through surprising tour connections. Stored in the `six_degrees_chains` table.

See `docs/six-degrees-chains.md` for full generation architecture.

---

## How This Data Was Built

| Step | Tool | Duration | Notes |
|------|------|----------|-------|
| Destination seeding | Viator API `/destinations` | ~1 min | 3,380 destinations |
| Full indexing | `indexer.ts --full` | ~20 hours | 2,712 leaf destinations, 148,634 API calls |
| One-liner backfill | `backfill-oneliners-batch.ts` | ~14 hours | 126,498 tours at 2.5/sec via Claude Haiku 4.5 |
| One-liner retry | `backfill-oneliners-batch.ts` | ~7 min | 997 missed tours |
| One-liner singles | `backfill-oneliners.ts --limit 15` | ~1 min | Final 15 holdouts |
| City profiles (batch) | `build-city-profiles.ts` | ~16 min | 893/904 via Batch API (Sonnet 4.6) |
| City profiles (gap fill) | `build-city-profiles.ts --sequential` | ~10 min | 46/47 remaining via sequential |
| Chain generation | `generate-chains.ts` | TBD | ~500 chains via Batch API |

**Total indexing time (Layers 1-3)**: ~34.5 hours
**Total indexing cost (Layers 1-3)**: ~$12.40 (Haiku 4.5 for one-liners, Sonnet 4.6 for city profiles)

---

## For Future Data Refreshes

Compare against these baselines:
- **Tour count delta**: How many new/removed tours vs 136,256?
- **Destination count delta**: Any new leaf destinations vs 2,712?
- **One-liner gap**: How many new tours need one-liners?
- **City profile gap**: How many new cities need profiles?
- **Chain freshness**: Do chains reference tours that no longer exist?
- **DB size delta**: Growth from 474 MB baseline?
- **Rating coverage**: Still ~67% or improving?
