# data/ — SQLite Database

This directory holds the SQLite database file (`tourgraph.db`). It's gitignored — each environment builds its own from Viator API data.

## Schema

### `tours` (main table)
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `product_code` | TEXT UNIQUE | Viator product code (e.g., "5396MTR") |
| `title` | TEXT | Tour name |
| `description` | TEXT | Full description from Viator |
| `one_liner` | TEXT | AI-generated witty caption (Claude Haiku 4.5) |
| `destination_id` | TEXT | Viator destination ID |
| `destination_name` | TEXT | City/region name |
| `country` | TEXT | Derived from destination hierarchy |
| `continent` | TEXT | Derived from lookupId first segment |
| `weight_category` | TEXT | One of 7 categories for roulette balancing |
| `status` | TEXT | "active" or "inactive" |
| `summary_hash` | TEXT | MD5 of key fields for delta detection |
| `rating`, `review_count`, `from_price`, `duration_minutes` | REAL/INT | Tour stats |
| `image_url` | TEXT | Cover image (720x480 variant) |
| `image_urls_json`, `highlights_json`, `inclusions_json`, `tags_json` | TEXT | JSON arrays stored as strings |
| `viator_url` | TEXT | Affiliate booking link |

### `destinations`
Viator's destination hierarchy (~3,380 entries). Parent-child tree: Continent → Country → Region → City.

### `indexer_state`
Key-value store for indexer resume state (last destination ID processed, timestamp).

### `superlatives` / `six_degrees_chains`
Future Phase 3 and Phase 4 tables. Schema created but empty.

## Rebuilding

```bash
npm run seed:destinations   # Populate destinations table (~3,380 rows)
npm run seed:data -- --no-ai  # Index 43 destinations (~5K+ tours, skip AI)
npm run backfill:oneliners  # Generate AI one-liners for all tours
```

## Concurrent Access

The web server opens the DB in **read-only** mode. Scripts (indexer, seeder) open in read-write mode with `busy_timeout(5000)` to handle contention.
