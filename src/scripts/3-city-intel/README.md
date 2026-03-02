# Step 3: City Intelligence Pipeline

Transforms raw tour data into curated city profiles. For each city with 50+ tours, Claude Sonnet reads every tour and produces: a personality line, 5 standout tours, and theme tags.

This is TourGraph's intellectual core — the layer that turns commodity API data into original IP.

## Architecture

```
Claude Sonnet → city_readings (append-only, permanent)
                     ↓ merge
                city_profiles (materialized view)
```

**`city_readings`** — Every AI analysis is stored permanently. Multiple runs produce multiple readings per city. This table only grows.

**`city_profiles`** — One row per city, rebuilt by merging all readings:
- `personality` — From the first (oldest) reading
- `themes_json` — Union of all readings (strictly more data)
- `standout_tours_json` — Union deduped by tour_id (bigger pool)
- `reading_count` — How many readings were merged

Shared merge logic lives in `src/lib/city-intel.ts`.

## Scripts

### `build-city-profiles.ts` — City Profile Generator

Sends all tours for each eligible city to Claude Sonnet. Writes results to `city_readings`, then runs merge into `city_profiles`.

```bash
npx tsx src/scripts/3-city-intel/build-city-profiles.ts                    # Batch mode (recommended, ~1 hour)
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --sequential       # One at a time (~7.5 hours)
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --resume <batch-id> # Resume a completed batch
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --dry-run          # Preview without calling API
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --limit 5          # First 5 cities only
```

**Batch mode** uses the Anthropic Batch API (50% cost savings, ~1 hour for 910 cities). Sequential mode makes direct API calls (useful for gap-filling or debugging).

**Batch IDs:**
- Batch mode: Anthropic batch ID (e.g., `msgbatch_01Pg6...`)
- Sequential mode: `sequential-<timestamp>`
- Resume mode: The batch ID passed via `--resume`

### `backfill-city-readings.ts` — Load External Batch Results

Use when you downloaded batch result files from the Anthropic Console (`console.anthropic.com/settings/batches`).

```bash
npx tsx src/scripts/3-city-intel/backfill-city-readings.ts <file1.jsonl> [file2.jsonl ...]
npx tsx src/scripts/3-city-intel/backfill-city-readings.ts --merge-only    # Just re-merge readings → profiles
```

Extracts batch ID from filename (e.g., `msgbatch_01Pg6...`). Maps custom_id back to real city names via the `tours` table.

## Theme Normalization

Claude sometimes produces non-canonical theme names. These are normalized automatically:

| Claude says | We store |
|-------------|----------|
| geology | geological |
| food | cuisine |
| nature | hiking |
| history | ancient-history |
| craft / crafts | craftsmanship |

Valid themes: cuisine, street-food, drinks, sacred, markets, street-art, nightlife, water, hiking, dance, music, craftsmanship, wildlife, dark-tourism, photography, wellness, architecture, ancient-history, colonial-history, festivals, geological.

## Validation

Two-tier: hard errors (reject) and soft warnings (save anyway, log).

**Hard errors:** personality missing or >200 chars, themes missing/empty, fewer than 3 standout tours, standout tour missing fields.

**Soft warnings:** personality 150-200 chars, unknown themes, tour_id not in DB, duplicate tour_id.

## Output

- `city_readings` — 1,799 readings (910 cities, avg 2.0 readings each)
- `city_profiles` — 910 cities, avg 11.6 themes, avg 6.0 standout tours
- Model: Claude Sonnet 4.6
- Cost: ~$12 (Batch API at 50% discount + prompt caching)

See `docs/city-intelligence.md` for full pipeline design.
