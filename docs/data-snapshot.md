# Data Snapshot

---
**Snapshot Date**: March 2, 2026 — 7:30 AM PST
**Database File**: `data/tourgraph.db` (474 MB)
**Purpose**: Baseline for tracking deltas on future data refreshes
---

## Summary

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
| Six Degrees chains | 0 (not yet generated) |
| Database size | 474 MB |

## Field Coverage (Active Tours)

| Field | Count | Coverage |
|-------|-------|----------|
| One-liner (AI) | 136,256 | 100.0% |
| Image URL | 136,256 | 100.0% |
| Price | 136,256 | 100.0% |
| Description | 136,256 | 100.0% |
| Viator URL | 136,256 | 100.0% |
| Duration | 135,084 | 99.1% |
| Rating | 91,098 | 66.9% |
| Highlights | 0 | 0.0% (not fetched at Basic tier) |

## Weight Categories

| Category | Tours | % |
|----------|-------|---|
| exotic_location | 87,289 | 64.1% |
| most_expensive | 25,779 | 18.9% |
| highest_rated | 9,336 | 6.9% |
| cheapest_5star | 5,767 | 4.2% |
| unique | 5,353 | 3.9% |
| wildcard | 1,411 | 1.0% |
| most_reviewed | 1,321 | 1.0% |

## Continent Distribution

| Continent | Tours | % |
|-----------|-------|---|
| Europe | 46,591 | 34.2% |
| Asia | 28,779 | 21.1% |
| North America | 23,578 | 17.3% |
| Africa | 13,752 | 10.1% |
| South America | 13,092 | 9.6% |
| Oceania | 5,548 | 4.1% |
| Caribbean | 4,916 | 3.6% |

## Top 15 Countries

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

## Top 15 Destinations

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

## Rating Stats (91,098 tours with ratings)

| Metric | Value |
|--------|-------|
| Average rating | 4.76 |
| Min rating | 1.0 |
| Max rating | 5.0 |
| Rated 4.5+ | 76,791 (84.3%) |
| Perfect 5.0 | 45,748 (50.2%) |

## Price Stats

| Metric | Value |
|--------|-------|
| Average price | $490.41 |
| Min price | $0.06 |
| Max price | $3,270,000.00 |
| Under $25 | 16,538 (12.1%) |
| Over $1,000 | 14,261 (10.5%) |

## One-Liner Stats

| Metric | Value |
|--------|-------|
| Coverage | 136,256 / 136,256 (100%) |
| Average length | 83.9 chars |
| Min length | 27 chars |
| Max length | 149 chars |
| Truncated (ends with …) | 4 |
| Duplicate one-liners | 62 unique phrases shared by 138 tours |

## How This Data Was Built

| Step | Tool | Duration | Notes |
|------|------|----------|-------|
| Destination seeding | Viator API `/destinations` | ~1 min | 3,380 destinations |
| Full indexing | `indexer.ts --full` | ~20 hours | 2,712 leaf destinations, 148,634 API calls |
| One-liner backfill | `backfill-oneliners-batch.ts` | ~14 hours | 126,498 tours at 2.5/sec via Claude Haiku 4.5 |
| One-liner retry | `backfill-oneliners-batch.ts` | ~7 min | 997 missed tours |
| One-liner singles | `backfill-oneliners.ts --limit 15` | ~1 min | Final 15 holdouts |

**Total indexing cost estimate**: ~$0.40 (Claude Haiku 4.5 for one-liners)
**Total indexing time**: ~34 hours

---

## For Future Data Refreshes

Compare against these baselines:
- **Tour count delta**: How many new/removed tours vs 136,256?
- **Destination count delta**: Any new leaf destinations vs 2,712?
- **One-liner gap**: How many new tours need one-liners?
- **DB size delta**: Growth from 474 MB baseline?
- **Rating coverage**: Still ~67% or improving?
