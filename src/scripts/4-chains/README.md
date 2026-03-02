# Step 4: Six Degrees Chain Generation

Generates thematic tour chains connecting two cities through surprising intermediate stops. This is the "graph" in TourGraph.

## Scripts

### `generate-chains.ts` — Production Chain Generator

Reads city pairs from `chain-pairs.json`, calls Claude Sonnet to build 5-stop chains with thematic connections.

```bash
npx tsx src/scripts/4-chains/generate-chains.ts                          # All pairs in config
npx tsx src/scripts/4-chains/generate-chains.ts --pair "Tokyo" "Rome"    # One specific pair
npx tsx src/scripts/4-chains/generate-chains.ts --dry-run                # Preview pairs
npx tsx src/scripts/4-chains/generate-chains.ts --list-cities            # Show available cities
```

**Features:** File logging (`logs/chains-<timestamp>.log`), retries with exponential backoff, chain validation (5 stops, unique cities/themes), duplicate detection (skips existing pairs), ETA tracking, final summary.

### `test-chain.ts` — Chain Testing (Dev)

Quick chain generation for development. Same Claude prompt, no logging or retries.

```bash
npx tsx src/scripts/4-chains/test-chain.ts "Tokyo" "Rome"
npx tsx src/scripts/4-chains/test-chain.ts --random
npx tsx src/scripts/4-chains/test-chain.ts --list-cities
```

### `chain-pairs.json` — City Pair Config

Array of `[cityFrom, cityTo]` tuples. Currently placeholder — to be populated with ~500 curated cross-continent pairs.

## Pipeline Design

See `docs/six-degrees-chains.md` for full architecture:
- Stage 1: All 910 city profiles in system prompt, Claude picks 3 intermediates
- Stage 2: Detailed tours for 5 selected cities, Claude builds chain
- Batch API + prompt caching for efficiency

## Output

- `six_degrees_chains` table — ~500 chains (pending)
- Each chain: 5 cities, thematic connections, tour selections
- Model: Claude Sonnet 4.6
