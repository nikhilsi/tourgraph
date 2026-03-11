# Database Schema

---
**Database**: `data/tourgraph.db` (SQLite, WAL mode)
**Current stats**: 136,256 tours, 474MB — see `docs/data-snapshot.md`
**Gitignored**: Built locally from Viator API data, deployed to server via SCP
---

## Schema SQL

The following creates the full database from scratch. This matches what `web/src/lib/db.ts` generates via `initSchema()`.

```sql
-- =============================================================
-- tours — Main table. One row per Viator experience.
-- =============================================================
CREATE TABLE tours (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code      TEXT UNIQUE NOT NULL,   -- Viator product code (e.g., "5396MTR")
    title             TEXT NOT NULL,          -- Tour name
    description       TEXT,                   -- Full description from Viator
    one_liner         TEXT,                   -- AI-generated witty caption (Claude Haiku 4.5)

    -- Geography
    destination_id    TEXT,                   -- Viator destination ID (FK to destinations.id)
    destination_name  TEXT,                   -- City/region name (denormalized for query speed)
    country           TEXT,                   -- Derived from destination hierarchy
    continent         TEXT,                   -- Derived from lookupId first segment
    timezone          TEXT,                   -- IANA timezone (e.g., "Asia/Tokyo")
    latitude          REAL,
    longitude         REAL,

    -- Tour stats
    rating            REAL,                   -- 1.0–5.0 star rating
    review_count      INTEGER,               -- Number of reviews
    from_price        REAL,                   -- Starting price in currency
    currency          TEXT DEFAULT 'USD',     -- Price currency
    duration_minutes  INTEGER,               -- Tour length in minutes

    -- Media & content
    image_url         TEXT,                   -- Cover image URL (720x480 variant)
    image_urls_json   TEXT,                   -- JSON array of all image URLs
    highlights_json   TEXT,                   -- JSON array of highlight strings
    inclusions_json   TEXT,                   -- JSON array of what's included
    viator_url        TEXT,                   -- Affiliate booking link (includes pid/mcid)
    supplier_name     TEXT,                   -- Tour operator name
    tags_json         TEXT,                   -- JSON array of category tags

    -- Roulette & indexer
    weight_category   TEXT,                   -- One of 7 categories (see below)
    status            TEXT DEFAULT 'active',  -- "active" or "inactive"
    indexed_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    summary_hash      TEXT,                   -- MD5 of key fields for delta detection

    CHECK (rating >= 0 AND rating <= 5)
);

-- Weight categories: exotic_location, most_expensive, highest_rated,
--   cheapest_5star, unique, wildcard, most_reviewed

CREATE INDEX idx_tours_weight       ON tours(weight_category);
CREATE INDEX idx_tours_status       ON tours(status);
CREATE INDEX idx_tours_rating       ON tours(rating DESC);
CREATE INDEX idx_tours_price        ON tours(from_price);
CREATE INDEX idx_tours_destination  ON tours(destination_id);
CREATE INDEX idx_tours_timezone     ON tours(timezone);
CREATE INDEX idx_tours_indexed      ON tours(indexed_at);
CREATE INDEX idx_tours_product_code ON tours(product_code);


-- =============================================================
-- destinations — Viator's destination hierarchy (~3,380 entries).
-- Tree structure: Continent → Country → Region → City.
-- Leaf nodes (~2,712) are the ones we index tours for.
-- =============================================================
CREATE TABLE destinations (
    id        TEXT PRIMARY KEY,   -- Viator destination ID
    name      TEXT NOT NULL,      -- Display name (e.g., "Barcelona")
    parent_id TEXT,               -- Parent destination ID (NULL for top-level)
    timezone  TEXT,               -- IANA timezone
    latitude  REAL,
    longitude REAL
);


-- =============================================================
-- superlatives — Pre-computed daily superlatives.
-- Currently unused: Phase 3 queries live from tours table via
-- getSuperlative() / getAllSuperlatives() in db.ts.
-- =============================================================
CREATE TABLE superlatives (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL,                      -- e.g., "most_expensive", "cheapest_5star"
    tour_id         INTEGER REFERENCES tours(id),      -- FK to tours
    stat_value      TEXT,                               -- Display value (e.g., "$45,000")
    stat_label      TEXT,                               -- Display label (e.g., "Price")
    generated_date  DATE NOT NULL,
    UNIQUE(type, generated_date)
);

CREATE INDEX idx_superlatives_date ON superlatives(generated_date);


-- =============================================================
-- six_degrees_chains — City-to-city tour chains for Six Degrees.
-- Each chain connects two cities through ~5 tours with thematic links.
-- chain_json stores the full chain data (stops, themes, connections).
-- =============================================================
CREATE TABLE six_degrees_chains (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    city_from     TEXT NOT NULL,                        -- Starting city
    city_to       TEXT NOT NULL,                        -- Ending city
    chain_json    TEXT NOT NULL,                        -- Full chain data (JSON)
    slug          TEXT,                                 -- URL slug (auto-populated from city names)
    generated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city_from, city_to)
);

CREATE INDEX idx_chains_slug ON six_degrees_chains(slug);


-- =============================================================
-- city_readings — Append-only log of all AI readings per city.
-- Each batch run or sequential run produces one reading per city.
-- Permanent store — keeps growing as we re-run city intelligence.
-- Built by src/scripts/3-city-intel/backfill-city-readings.ts.
-- =============================================================
CREATE TABLE city_readings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_name    TEXT NOT NULL,                 -- City name, matches tours.destination_name
    batch_id            TEXT,                          -- Batch ID or "sequential-backfill"
    model               TEXT NOT NULL,                 -- Claude model used
    personality         TEXT NOT NULL,                 -- AI-generated one-line city personality
    themes_json         TEXT NOT NULL,                 -- JSON array of theme tags from this reading
    standout_tours_json TEXT NOT NULL,                 -- JSON array of standout tours from this reading
    generated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================
-- city_profiles — Materialized city intelligence (Stage 0).
-- One row per city with 50+ active tours (910 cities).
-- Rebuilt by merging all city_readings: personality from first
-- reading, themes = union of all readings, standout tours =
-- union deduped by tour_id.
-- See docs/city-intelligence.md for pipeline design.
-- =============================================================
CREATE TABLE city_profiles (
    destination_name    TEXT PRIMARY KEY,              -- City name, matches tours.destination_name
    country             TEXT NOT NULL,                 -- Country name
    continent           TEXT,                          -- Continent name
    tour_count          INTEGER NOT NULL,              -- Active tours with images at generation time
    personality         TEXT NOT NULL,                 -- AI-generated one-line city personality (<150 chars)
    themes_json         TEXT NOT NULL,                 -- JSON array of AI-curated theme tags (union of all readings)
    standout_tours_json TEXT NOT NULL,                 -- JSON array of standout tours (union deduped by tour_id)
    reading_count       INTEGER NOT NULL DEFAULT 1,    -- Number of readings merged into this profile
    generated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    model               TEXT NOT NULL                  -- Claude model used (e.g., "claude-sonnet-4-6")
);


-- =============================================================
-- indexer_state — Key-value store for indexer resume state.
-- Tracks last destination processed so indexer can resume on crash.
-- =============================================================
CREATE TABLE indexer_state (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Rebuilding From Scratch

```bash
npm run seed:destinations                      # Populate destinations (~3,380 rows, ~1 min)
npx tsx src/scripts/1-viator/indexer.ts --full           # Index all 2,712 leaf destinations (~20 hours)
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts # Generate AI one-liners (~14 hours)
npx tsx src/scripts/3-city-intel/build-city-profiles.ts      # Build city intelligence profiles (~1 hour via Batch API)
npx tsx src/scripts/3-city-intel/backfill-city-readings.ts <results.jsonl> [...]  # Load batch results into city_readings + merge
npx tsx src/scripts/4-chains/generate-chains-v2.ts       # Generate Six Degrees chains (~2 hours via Batch API, two-stage pipeline)
```

## Deploying to Server

```bash
bash deployment/scripts/deploy-db.sh $SERVER_IP  # WAL checkpoint → SCP → restart PM2
```

## Concurrent Access

The web server opens the DB in **read-only** mode. Scripts (indexer, backfill) open in read-write mode with `busy_timeout(5000)` to handle contention. PM2 runs in fork mode (single process) to avoid SQLite write conflicts.
