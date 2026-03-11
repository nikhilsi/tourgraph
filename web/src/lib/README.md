# src/lib/ — Core Library Modules

Shared modules used by both the web server (Next.js) and CLI scripts.

## Files

### `db.ts` — Database Layer
SQLite connection management, schema auto-init, and all tour/destination queries.

**Key design decisions:**
- **globalThis singleton**: DB connection survives Next.js Hot Module Replacement in dev mode. Without this, each hot reload leaks a connection.
- **Read-only mode**: `getDb(true)` opens a non-cached readonly connection for web server reads. Defense-in-depth — even if a bug tries to write, SQLite blocks it.
- **`busy_timeout(5000)`**: Prevents `SQLITE_BUSY` errors when the indexer writes while the web server reads.
- **UPSERT pattern**: `insertOrUpdateTour()` uses `ON CONFLICT(product_code) DO UPDATE` with `COALESCE` for `one_liner` (AI-generated, expensive to regenerate — never overwrite with NULL).
- **Column allowlist**: `updateTourFields()` validates column names against a whitelist to prevent SQL injection from dynamic field names.

**Roulette Hand Algorithm** (`getRouletteHand()`):
1. Draws tours by category quotas (4 highest_rated, 3 unique, 3 cheapest_5star, etc.)
2. Sequences them via greedy contrast maximization — no same category or continent back-to-back, alternates price levels.

**Right Now queries** (`getRightNowTours()`):
- One quality tour per timezone (rating ≥ 4.0, has image), randomized order

**Superlative queries** (`getSuperlative()`, `getAllSuperlatives()`):
- 6 SQL queries with data quality filters (price ≤ $50K, duration 30min-2wk, reviews ≥ 10 for gems)
- Queried live from tours table — no separate computation step needed

**Shared transformation** (`tourRowToRouletteTour()`):
- Converts nullable `TourRow` (SQLite) to required-field `RouletteTour` (API/UI). Used by the Hand API, Right Now page, and World's Most pages.

### `viator.ts` — Viator API Client
Wraps the Viator Partner API (Basic tier). Ported from Phase 0 Python script (`archive/scripts/viator_compare.py`).

**Key design decisions:**
- **Retry with backoff**: 429/5xx responses trigger exponential backoff (1s, 2s, 4s). Reads `Retry-After` and `RateLimit-Remaining` headers.
- **Proactive throttling**: Pauses for 1s every 50 requests, even without rate limit errors.
- **Image variant selection**: Prefers 720x480 (mobile-optimized, fast loading). Falls back to largest available variant.

### `claude.ts` — AI One-Liner Generation
Calls Claude Haiku 4.5 to generate witty, warm tour captions under 120 characters.

**Key design decisions:**
- **Haiku model**: Fastest and cheapest Claude model. One-liners don't need deep reasoning — they need speed and warmth.
- **Silent null on error**: Returns `null` instead of throwing so the indexer can continue. Tours with failed one-liners get retried by the backfill script.
- **Quote cleanup**: Claude often wraps responses in quotes — we strip them.

### `types.ts` — TypeScript Definitions
All shared types: database rows, API response shapes, Viator API types, weight categories.

**Notable patterns:**
- `TourRow` has nullable fields (matches SQLite). `RouletteTour` has required fields (camelCase, used by the client API).
- JSON arrays (images, tags, inclusions) are stored as strings in SQLite and parsed at read time via `safeJsonParse()`.
- `WeightCategory` is a closed union of 7 strings that must match the `ROULETTE_HAND_QUOTAS` keys in `db.ts`.
- `RightNowMoment` — tour + timezone + formatted time for Right Now cards.
- `SuperlativeType` — 6-member union of superlative slugs. `SuperlativeConfig` and `SuperlativeResult` for the World's Most feature.

### `continents.ts` — Continent Mapping
Maps Viator's `lookupId` first segment to continent names. The lookupId format is `"continent.country.region.city"` where continent codes are: 1=Africa, 2=Asia, 3=Oceania, 4=Caribbean, 6=Europe, 8=North America, 9=South America.

Derived by analyzing all 3,380 Viator destinations. Hardcoded mapping — if Viator changes this, it would break silently.

### `env.ts` — Environment Loader
Loads `.env.local` then `.env` via dotenv. Only needed for CLI scripts — Next.js loads env files automatically for the web server.

### `timezone.ts` — Timezone Helpers (Phase 2)
All timezone logic for "Right Now Somewhere" — no external library, uses `Intl.DateTimeFormat` exclusively.

**Key functions:**
- `getCurrentHour(tz)` — current hour (0-23) in any IANA timezone
- `formatLocalTime(tz)` — "6:47 AM" style string
- `getTimeOfDayLabel(hour)` — human label: "sunrise" (6-8), "golden hour" (16-18), "morning" (9-11), "afternoon" (12-15)
- `getGoldenTimezones(allTimezones)` — filters to timezones in sunrise or golden hour right now
- `getPleasantTimezones(allTimezones)` — fallback: daytime hours (9-15)

### `format.ts` — Formatting Utilities
Pure functions: `formatPrice()` ($44,120 / $0.35), `formatDurationShort()` ("2h 15m"), `formatDurationLong()` ("2 hours 15 minutes"), `safeJsonParse()` (JSON.parse with fallback, never throws).
