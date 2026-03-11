# Step 2: AI One-Liner Generation

Generates witty, personality-rich captions for every tour using Claude Haiku 4.5. These one-liners are the voice of TourGraph — they turn boring tour titles into something people want to share.

## Scripts

### `backfill-oneliners-batch.ts` — Batch Generator (Recommended)

Sends 20 tours per Claude Haiku API call with JSON response format. ~3.5x faster than single-tour mode.

```bash
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts                # All missing
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts --limit 1000   # First 1000
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts --dry-run      # Preview
```

**Speed:** ~2.5 tours/sec | **Max length:** 150 chars, truncated at word boundary | **Safety:** Stops after 5 consecutive batch errors.

Logs to `logs/backfill-batch-<timestamp>.log` with ETA tracking.

### `backfill-oneliners.ts` — Single-Tour Generator

One tour at a time. Good for small batches or debugging individual results.

```bash
npm run backfill:oneliners                  # All missing
npm run backfill:oneliners -- --limit 100   # First 100
npm run backfill:oneliners -- --dry-run     # Preview
```

**Speed:** ~0.7 tours/sec (200ms between calls).

## Output

- `tours.one_liner` column — 136,256 captions (100% coverage)
- Average length: ~84 chars
- Model: Claude Haiku 4.5
- Cost: ~$0.40 for all 136K tours
