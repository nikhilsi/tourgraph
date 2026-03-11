# Data Pipeline Playbook

Step-by-step guide to building TourGraph's 4-layer data asset from scratch.

---

## Pipeline Overview

```
1-viator/     → Viator API    → tours table          (136K tours)
2-oneliners/  → Claude Haiku  → tours.one_liner      (AI captions)
3-city-intel/ → Claude Sonnet → city_readings → city_profiles (910 cities)
4-chains/     → Claude Sonnet → six_degrees_chains   (~500 chains)
```

**Design principle:** All AI outputs are written to append-only tables first (`city_readings`), then merged into materialized views (`city_profiles`). Raw readings are permanent — they grow with every run.

---

## Full Rebuild (from scratch)

```bash
# All commands run from the web/ directory
cd web
# Step 1: Bootstrap destinations (~1 min)
npm run seed:destinations

# Step 2: Index all tours from Viator API (~20 hours)
npm run index:full

# Step 3: Generate AI one-liners (~14 hours)
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts

# Step 4: Build city intelligence (~1 hour via Batch API)
npx tsx src/scripts/3-city-intel/build-city-profiles.ts

# Step 5: Generate Six Degrees chains (~1 hour via Batch API)
npx tsx src/scripts/4-chains/generate-chains.ts

# Step 6: Deploy database to production
bash deployment/scripts/deploy-db.sh $SERVER_IP
```

**Total time:** ~36 hours | **Total cost:** ~$13

---

## Step 1: Viator Data (`1-viator/`)

### `seed-destinations.ts` — Bootstrap Destination Hierarchy

Fetches all ~3,380 Viator destinations (continents → countries → regions → cities).

```bash
npm run seed:destinations
```

### `indexer.ts` — Index Tours

The core data pipeline. Searches Viator for tours, detects changes, fetches details, generates AI captions, assigns weight categories.

```bash
npm run index:full                     # Index all 2,712 leaf destinations
npx tsx src/scripts/1-viator/indexer.ts --dest 704          # Index one destination (Seattle)
npx tsx src/scripts/1-viator/indexer.ts --full --limit 10   # First 10 destinations
npx tsx src/scripts/1-viator/indexer.ts --continue           # Resume from last position
npx tsx src/scripts/1-viator/indexer.ts --full --no-ai       # Skip AI one-liners
```

**How it works:** Search (4 sort strategies per destination) → Classify (new/changed/unchanged via summary_hash) → Fetch details → Enrich (AI one-liner) → Categorize (weight category).

**Resume:** Saves last-processed destination ID in `indexer_state` table.

### `seed-dev-data.ts` — Development Dataset

Indexes 43 curated destinations for quick UI development (~5,000 tours).

```bash
npm run seed:data              # With AI one-liners
npm run seed:data -- --no-ai   # Fast mode, skip AI
```

---

## Step 2: AI One-Liners (`2-oneliners/`)

### `backfill-oneliners-batch.ts` — Batch Caption Generator (Recommended)

Sends 20 tours per Claude Haiku API call. ~2.5 tours/sec. Logs to `logs/`.

```bash
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts                # All missing
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts --limit 1000   # First 1000
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts --dry-run      # Preview
```

### `backfill-oneliners.ts` — Single-Tour Caption Generator

One tour at a time. Good for small batches or debugging. ~0.7 tours/sec.

```bash
npm run backfill:oneliners                  # All missing
npm run backfill:oneliners -- --limit 100   # First 100
```

---

## Step 3: City Intelligence (`3-city-intel/`)

### `build-city-profiles.ts` — City Profile Generator

For each city with 50+ tours, sends all tours to Claude Sonnet. Gets back: personality line, 5 standout tours, theme tags.

**Writes to `city_readings` (append-only), then merges into `city_profiles`.**

```bash
npx tsx src/scripts/3-city-intel/build-city-profiles.ts                    # Batch mode (recommended)
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --sequential       # One at a time
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --resume <batch-id> # Resume batch
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --dry-run          # Preview
npx tsx src/scripts/3-city-intel/build-city-profiles.ts --limit 5          # First 5 cities
```

### `backfill-city-readings.ts` — Load Batch Results from JSONL

Use when you have downloaded batch result files from the Anthropic Console.

```bash
npx tsx src/scripts/3-city-intel/backfill-city-readings.ts <file1.jsonl> [file2.jsonl ...]
npx tsx src/scripts/3-city-intel/backfill-city-readings.ts --merge-only    # Just re-merge
```

### Data Flow

```
Claude Sonnet → city_readings (append-only, permanent)
                     ↓ merge
                city_profiles (materialized view)
                  - personality: first reading
                  - themes_json: union of all readings
                  - standout_tours_json: union deduped by tour_id
                  - reading_count: how many readings merged
```

---

## Step 4: Six Degrees Chains (`4-chains/`)

### `generate-chains.ts` — Chain Generator

Reads city pairs from `chain-pairs.json`, calls Claude Sonnet to build thematic tour chains.

```bash
npx tsx src/scripts/4-chains/generate-chains.ts                          # All pairs
npx tsx src/scripts/4-chains/generate-chains.ts --pair "Tokyo" "Rome"    # One pair
npx tsx src/scripts/4-chains/generate-chains.ts --dry-run                # Preview
npx tsx src/scripts/4-chains/generate-chains.ts --list-cities            # Show cities
```

### `test-chain.ts` — Chain Testing (Dev)

Quick chain generation for development and testing.

```bash
npx tsx src/scripts/4-chains/test-chain.ts "Tokyo" "Rome"
npx tsx src/scripts/4-chains/test-chain.ts --random
```

### `chain-pairs.json` — City Pair Config

Array of `[cityFrom, cityTo]` tuples for chain generation.

---

## Utilities (`utils/`)

### `check-db.ts` — Database Audit

Weight categories, tour count, one-liner coverage, continent spread, top destinations.

```bash
npx tsx src/scripts/utils/check-db.ts
```

---

## API Rate Limiting

All Viator scripts respect rate limits:
- 50 requests before a 1-second pause
- Exponential backoff on 429 responses (1s, 2s, 4s)
- 500ms pause between destinations
- Reads `RateLimit-Remaining` header for proactive throttling

---

## Shared Library

City intelligence logic shared between scripts lives in `src/lib/city-intel.ts`:
- `THEME_ALIASES` / `VALID_THEMES` — Theme normalization constants
- `normalizeThemes()` — Apply aliases to raw AI output
- `saveCityReading()` — Insert one reading into `city_readings`
- `mergeReadings()` — Rebuild `city_profiles` from all readings
- `getCityInfo()` — Get city metadata for merge step
