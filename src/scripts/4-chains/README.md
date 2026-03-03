# Step 4: Six Degrees Chain Generation

Generates thematic tour chains connecting two cities through surprising intermediate stops. This is the "graph" in TourGraph.

## Pipeline Architecture

Two-stage pipeline where each stage does what it's best at:

```
chain-pairs.json (500 pairs)
    │
    ▼
Stage 1 (City Picker) — Claude sees ALL 910 city profiles (~125K tokens)
    picks 3 intermediate cities per pair
    │
    ▼
stage1-results-<ts>.json (intermediate storage on disk)
    │
    ▼
Stage 2 (Chain Builder) — Claude gets 30 tours × 5 cities
    builds full chain with thematic connections
    │
    ▼
six_degrees_chains table
```

Both stages use **Batch API** (50% cost reduction) + **prompt caching** (90% on Stage 1 system prompt). See `docs/six-degrees-chains.md` for full architecture.

## Scripts

### `generate-chains-v2.ts` — Production Two-Stage Pipeline

The primary chain generator. Reads city pairs from `chain-pairs.json`, runs two-stage pipeline via Batch API.

```bash
# Full pipeline (all 500 pairs via Batch API)
npx tsx src/scripts/4-chains/generate-chains-v2.ts

# Test single pair (sequential, immediate feedback)
npx tsx src/scripts/4-chains/generate-chains-v2.ts --pair "Tokyo" "Rome"

# Test batch of N pairs
npx tsx src/scripts/4-chains/generate-chains-v2.ts --limit 20

# Preview without API calls
npx tsx src/scripts/4-chains/generate-chains-v2.ts --dry-run

# Resume Stage 1 polling (if process interrupted)
npx tsx src/scripts/4-chains/generate-chains-v2.ts --resume-stage1 msgbatch_abc123

# Skip Stage 1, use existing results for Stage 2
npx tsx src/scripts/4-chains/generate-chains-v2.ts --from-stage1 logs/stage1-results-*.json

# Resume Stage 2 polling
npx tsx src/scripts/4-chains/generate-chains-v2.ts --resume-stage2 msgbatch_xyz --stage1-file logs/stage1-results-*.json

# Overwrite existing chains
npx tsx src/scripts/4-chains/generate-chains-v2.ts --regenerate
```

**Features:** Two-stage Batch API pipeline, prompt caching (~125K system prompt cached after first call), Stage 1 intermediate storage on disk (resumable), Stage 2 retry logic, chain validation (5 stops, unique cities/themes), file logging, final summary with stats.

### `generate-chains.ts` — Legacy Single-Shot Generator

Original generator that randomly picks 20 intermediate cities and asks Claude to build a chain in one shot. Kept for reference. Use `generate-chains-v2.ts` instead.

### `generate-pairs.ts` — Pair Generator

Creates ~500 cross-continent pairs from the 100-city endpoint pool. Scored greedy algorithm with Jaccard theme distance + tier mixing bonus.

```bash
npx tsx src/scripts/4-chains/generate-pairs.ts                # Scored approach (default)
npx tsx src/scripts/4-chains/generate-pairs.ts --compare      # Compare random vs scored
npx tsx src/scripts/4-chains/generate-pairs.ts --dry-run      # Stats only
```

### `curate-city-pool.ts` — City Pool Curation (one-time)

AI-assisted curation of 100 endpoint cities from 910 city profiles. Already run — output in `city-pool.json`.

### `test-chain.ts` — Chain Testing (Dev)

Quick single-pair generation for development. Same prompt as legacy generator, no logging or retries.

```bash
npx tsx src/scripts/4-chains/test-chain.ts "Tokyo" "Rome"
npx tsx src/scripts/4-chains/test-chain.ts --random
```

## Data Files

| File | Contents |
|------|----------|
| `city-pool.json` | 100 curated endpoint cities (30 anchors, 40 gems, 30 surprises) |
| `chain-pairs.json` | 500 cross-continent pairs as `[cityFrom, cityTo]` tuples |

## Output

- `six_degrees_chains` table — chains stored as JSON with city_from, city_to, chain stops, summary
- `logs/chains-v2-*.log` — execution logs
- `logs/stage1-results-*.json` — intermediate city selections (resumable)
- Model: Claude Sonnet 4.6

## Generation History

**Full run (March 3, 2026):** 500 pairs → 453 chains (90.6%) on first pass. 50 failures retried with improved JSON parser.

| Stage | Submitted | Succeeded | Failed |
|-------|-----------|-----------|--------|
| Stage 1 (City Picker) | 482 | 448 | 34 |
| Stage 2 (Chain Builder) | 448 | 432 | 16 |

**Failure categories:** JSON parse errors (21 — Claude added text after JSON, fixed with robust parser), invalid city names (19 — "Havana" 7x, "Bali" 3x, etc.), duplicate themes (7), duplicate cities (3), wrong chain length (1).

**Retry strategy:** Re-run the script — it automatically skips existing chains (`UNIQUE(city_from, city_to)` constraint) and only processes missing pairs.
