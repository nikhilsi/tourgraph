# src/scripts/ — CLI Scripts

Standalone TypeScript scripts for data pipeline operations. Run with `npx tsx` or via npm scripts.

## Scripts

### `indexer.ts` — Drip + Delta Indexer
The core data pipeline. Searches Viator for tours, detects changes, fetches details, generates AI captions, and assigns weight categories.

```bash
npx tsx src/scripts/indexer.ts --dest 704          # Index Seattle
npx tsx src/scripts/indexer.ts --full --limit 10   # Index first 10 destinations
npx tsx src/scripts/indexer.ts --continue           # Resume from last position
npx tsx src/scripts/indexer.ts --full --no-ai       # Skip AI one-liners
```

**How it works:**
1. **Search** — Queries each destination with 4 sort strategies (DEFAULT, TOP_RATED, PRICE_ASC, PRICE_DESC) to get broad coverage. Deduplicates by product code.
2. **Classify** — Compares search results against DB via `summary_hash` (MD5 of title + price + rating + reviews). Categorizes each product as new, changed, unchanged, or missing.
3. **Fetch** — Calls Viator product detail API for new/changed tours. Extracts title, description, images, rating, price, duration, tags, inclusions, affiliate URL.
4. **Enrich** — Generates AI one-liner via Claude Haiku 4.5 (skipped with `--no-ai`).
5. **Categorize** — Assigns one of 7 weight categories:
   - `highest_rated` — rating ≥ 4.9 with 50+ reviews
   - `most_reviewed` — 1,000+ reviews
   - `most_expensive` — price ≥ $500
   - `cheapest_5star` — rating ≥ 4.8 and price ≤ $30
   - `unique` — has specific Viator "unique experience" tags
   - `exotic_location` — not in the top ~50 destinations
   - `wildcard` — everything else

**Resume mechanism:** Saves the last-processed destination ID (not array index) in `indexer_state` table so resume works correctly even if the destination list changes.

### `seed-destinations.ts` — Destination Seeder
Fetches all ~3,380 Viator destinations and inserts into the `destinations` table. Runs spot checks (Seattle=704, Paris=479, Tokyo=334) and prints stats by type and continent.

```bash
npm run seed:destinations
```

### `seed-dev-data.ts` — Development Data Seeder
Indexes 43 curated destinations across all continents to build a 5,000+ tour dataset. Uses `processDestination()` from the indexer.

```bash
npm run seed:data              # With AI one-liners
npm run seed:data -- --no-ai   # Fast mode, skip AI
```

**Destination list** (43 cities): Paris, London, Amsterdam, Rome, Lisbon, Barcelona, Prague, Vienna, Edinburgh, Athens, Dubrovnik, Istanbul, NYC, Seattle, Las Vegas, San Francisco, LA, Cancun, Mexico City, Tokyo, Kyoto, Bangkok, Phuket, Bali, Singapore, Seoul, Ho Chi Minh City, Mumbai, Cape Town, Dubai, Cairo, Marrakech, Nairobi, Zanzibar, Petra, Rio de Janeiro, Buenos Aires, Cusco, Lima, Cartagena, Sydney, Queenstown, Reykjavik.

### `backfill-oneliners.ts` — AI Caption Generator
Generates Claude Haiku one-liners for tours missing them. Prioritizes by review count (popular tours first).

```bash
npm run backfill:oneliners                  # All missing
npm run backfill:oneliners -- --limit 100   # First 100
npm run backfill:oneliners -- --dry-run     # Preview without writing
```

Rate limited: 200ms between API calls, progress logged every 20 tours.

### `check-db.ts` — Database Audit
Quick stats: weight category distribution, tour count, one-liner coverage, continent spread, top destinations.

```bash
npx tsx src/scripts/check-db.ts
```

## API Rate Limiting

All scripts respect Viator's rate limits:
- 50 requests before a 1-second pause
- Exponential backoff on 429 responses (1s, 2s, 4s)
- 500ms pause between destinations
- Reads `RateLimit-Remaining` header for proactive throttling
