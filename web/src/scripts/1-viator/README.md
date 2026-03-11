# Step 1: Viator Data Ingestion

Fetches and indexes tour data from the Viator Partner API into the `tours` and `destinations` tables.

## Scripts

### `seed-destinations.ts` — Bootstrap Destination Hierarchy

One-time setup. Fetches all ~3,380 Viator destinations and populates the `destinations` table. Derives country/continent from lookupId hierarchy. Runs spot checks (Seattle=704, Paris=479, Tokyo=334).

```bash
npm run seed:destinations
```

### `indexer.ts` — Core Tour Indexer

The main data pipeline. For each leaf destination (~2,712):
1. **Search** — 4 sort strategies (DEFAULT, TOP_RATED, PRICE_ASC, PRICE_DESC) for broad coverage
2. **Classify** — Compare against DB via `summary_hash` (MD5 of title + price + rating + reviews)
3. **Fetch** — Detail API for new/changed tours (title, images, rating, price, duration, tags, affiliate URL)
4. **Enrich** — AI one-liner via Claude Haiku 4.5 (skip with `--no-ai`)
5. **Categorize** — Assign weight category (highest_rated, most_reviewed, most_expensive, cheapest_5star, unique, exotic_location, wildcard)

```bash
npm run index:full                                          # All destinations (~20 hours)
npx tsx src/scripts/1-viator/indexer.ts --dest 704          # One destination (Seattle)
npx tsx src/scripts/1-viator/indexer.ts --full --limit 10   # First 10
npx tsx src/scripts/1-viator/indexer.ts --continue           # Resume from last position
npx tsx src/scripts/1-viator/indexer.ts --full --no-ai       # Skip AI one-liners
```

**Resume:** Saves last-processed destination ID (not array index) in `indexer_state` table.

**Rate limiting:** 50 requests before 1s pause, exponential backoff on 429, 500ms between destinations, reads `RateLimit-Remaining` header.

**Exports:** `processDestination()` — used by `seed-dev-data.ts`.

### `seed-dev-data.ts` — Development Dataset

Indexes 43 curated cities across all 7 continents to build ~5,000 tours for UI development.

```bash
npm run seed:data              # With AI one-liners
npm run seed:data -- --no-ai   # Fast mode, skip AI
```

**Cities:** Paris, London, Amsterdam, Rome, Lisbon, Barcelona, Prague, Vienna, Edinburgh, Athens, Dubrovnik, Istanbul, NYC, Seattle, Las Vegas, San Francisco, LA, Cancun, Mexico City, Tokyo, Kyoto, Bangkok, Phuket, Bali, Singapore, Seoul, Ho Chi Minh City, Mumbai, Cape Town, Dubai, Cairo, Marrakech, Nairobi, Zanzibar, Petra, Rio de Janeiro, Buenos Aires, Cusco, Lima, Cartagena, Sydney, Queenstown, Reykjavik.

## Output

- `destinations` table — 3,380 rows
- `tours` table — 136,256 active tours with images, prices, ratings, weight categories
- Logs in `logs/indexer-<timestamp>.log`
