# TourGraph.ai — Technical Architecture

---
**Last Updated**: February 28, 2026
**Status**: Locked — all decisions resolved
**Depends on**: `ux_design.md` (UX decisions), `product_brief.md` (product scope)
---

## System Overview

TourGraph is a read-heavy, pre-cached consumer site. The user never triggers an API call. Every interaction serves from a pre-built local index.

```
┌──────────────────────────────────────────────────────────────────┐
│                    DRIP + DELTA INDEXER                            │
│               (continuous, spread over 24 hours)                  │
│                                                                  │
│   1. Cycle through all 2,500 destinations over ~7 days           │
│   2. Search Viator API, compare with cached data (delta detect)  │
│   3. Fetch full details only for new/changed products            │
│   4. Generate AI one-liners via Claude Haiku for new tours       │
│   5. Recompute daily superlatives (World's Most ___)             │
│   6. Update rows in place — DB is always live and servable       │
│                                                                  │
│   Viator calls: ~1,450/day (~60/hour)  |  Claude: ~$0.003/day   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                         SQLite DB                                 │
│                    (single file on disk)                          │
│                                                                  │
│   tours         ~5,000-10,000 share-worthy tours                 │
│   superlatives  daily "World's Most ___" computed from cache     │
│   destinations  ~2,500 Viator destinations with timezones        │
│   six_degrees   cached chain results (grows over time)           │
│                                                                  │
│   Resilience: stale data is fine. Tours don't change daily.      │
│   If indexer fails, existing data serves until it recovers.      │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       NEXT.JS APP                                 │
│                   (App Router, TypeScript)                        │
│                                                                  │
│   Server Components:                                             │
│     /                      → Tour Roulette (homepage)            │
│     /roulette/[id]         → Tour detail (shared link landing)   │
│     /right-now             → Right Now Somewhere                 │
│     /right-now/[id]        → Right Now detail                    │
│     /worlds-most           → Today's superlatives                │
│     /worlds-most/[slug]    → Individual superlative              │
│     /six-degrees           → City pair input                     │
│     /six-degrees/[c1]/[c2] → Chain result                       │
│                                                                  │
│   API Routes:                                                    │
│     /api/roulette/hand     → batch of ~20 sequenced tours       │
│     /api/right-now         → tour by timezone (< 50ms)          │
│     /api/worlds-most       → today's superlatives (< 50ms)      │
│     /api/six-degrees       → Claude API call (~2-5s, cached)    │
│                                                                  │
│   OG Image Generation:                                           │
│     /api/og/[type]/[id]    → dynamic OG images (Next.js ImageResponse)
│                                                                  │
│   Every response except Six Degrees: < 50ms (local DB read)     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Layer: SQLite

### Why SQLite (not Redis)

- **Persistence** — survives server restarts. No cold cache, ever.
- **Queryable** — SQL makes complex queries easy (random weighted tour, tours by timezone, superlative rankings)
- **Simple** — no separate process, no connection management, one file
- **Inspectable** — can open and debug data directly
- **Sufficient** — single server, read-heavy workload, ~5,000 rows. SQLite handles millions.

### Schema

```sql
-- Core tour data (pre-indexed from Viator)
CREATE TABLE tours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE NOT NULL,      -- Viator product code (e.g., "5396MTR")
    title TEXT NOT NULL,
    description TEXT,
    one_liner TEXT,                          -- AI-generated witty caption

    -- Location
    destination_id TEXT,                     -- Viator destination ref (e.g., "704")
    destination_name TEXT,                   -- "Seattle"
    country TEXT,
    continent TEXT,                          -- "Europe", "Asia", "Americas", "Africa", "Oceania"
    timezone TEXT,                           -- "America/Los_Angeles"
    latitude REAL,
    longitude REAL,

    -- Stats
    rating REAL,                            -- Combined average (e.g., 4.86)
    review_count INTEGER,
    from_price REAL,                        -- USD, from search results
    currency TEXT DEFAULT 'USD',
    duration_minutes INTEGER,               -- From itinerary.duration

    -- Content
    image_url TEXT,                          -- Cover image, largest variant (720x480)
    image_urls_json TEXT,                    -- JSON array of all image URLs
    highlights_json TEXT,                    -- JSON array of highlight strings
    inclusions_json TEXT,                    -- JSON array of inclusions

    -- Viator
    viator_url TEXT,                         -- Affiliate link (already contains pid/mcid)
    supplier_name TEXT,
    tags_json TEXT,                          -- JSON array of tag IDs

    -- Indexer metadata
    weight_category TEXT,                   -- "highest_rated", "most_expensive", "cheapest_5star",
                                            -- "unique", "best_value", "most_reviewed"
    status TEXT DEFAULT 'active',           -- "active" or "inactive" (missing from search results)
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Last time search results included this tour
    summary_hash TEXT,                      -- Hash of title+price+rating for delta detection

    CHECK (rating >= 0 AND rating <= 5)
);

CREATE INDEX idx_tours_weight ON tours(weight_category);
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_rating ON tours(rating DESC);
CREATE INDEX idx_tours_price ON tours(from_price);
CREATE INDEX idx_tours_destination ON tours(destination_id);
CREATE INDEX idx_tours_timezone ON tours(timezone);
CREATE INDEX idx_tours_indexed ON tours(indexed_at);

-- Daily superlatives (pre-computed each indexer run)
CREATE TABLE superlatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                     -- "most_expensive", "cheapest_5star",
                                            -- "longest", "shortest", "most_reviewed",
                                            -- "highest_rated_unknown"
    tour_id INTEGER REFERENCES tours(id),
    stat_value TEXT,                        -- The notable stat ("$45,000", "4 mins", "2,078 reviews")
    stat_label TEXT,                        -- "Most Expensive Tour on Earth"
    generated_date DATE NOT NULL,

    UNIQUE(type, generated_date)
);

CREATE INDEX idx_superlatives_date ON superlatives(generated_date);

-- Viator destinations (refreshed weekly)
CREATE TABLE destinations (
    id TEXT PRIMARY KEY,                    -- Viator destination ref
    name TEXT NOT NULL,
    parent_id TEXT,
    timezone TEXT,
    latitude REAL,
    longitude REAL
);

-- Cached Six Degrees chains (grows over time)
CREATE TABLE six_degrees_chains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_from TEXT NOT NULL,
    city_to TEXT NOT NULL,
    chain_json TEXT NOT NULL,               -- Full chain with tours, connections, descriptions
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(city_from, city_to)
);

### Staleness Monitoring

```sql
-- Check data freshness
SELECT MAX(indexed_at) as last_index FROM tours;

-- If > 48 hours old, alert
-- If > 7 days old, something is seriously wrong
```

---

## Viator API Integration

### Access Level

**Basic Access** (current, free, immediate). Sufficient for launch.

Full Access upgrade deferred until post-launch — requires certification and we have everything we need at Basic.

### Endpoints Used

| Endpoint | Purpose | Tier |
|----------|---------|------|
| `POST /products/search` | Find interesting tours by destination, sort, tags | Basic |
| `GET /products/{code}` | Full tour details, images, reviews, description | Basic |
| `GET /availability/schedules/{code}` | Pricing and schedule data | Basic (single product) |
| `GET /taxonomy/destinations` | All 2,500+ destinations | Basic |
| `GET /products/tags` | Tag definitions for filtering | Basic |
| `POST /locations/bulk` | Resolve location refs to lat/long | Basic |

### Authentication

```
Headers:
  exp-api-key: <VIATOR_API_KEY>
  Accept: application/json;version=2.0
  Accept-Language: en-US
  Content-Type: application/json

Base URL: https://api.viator.com/partner
Rate limit: 150 requests per 10 seconds
```

### Affiliate Links

The `productUrl` field in API responses already contains affiliate tracking:

```
https://www.viator.com/tours/Seattle/Mt-Rainier-Day-Tour/d704-5396MTR
  ?mcid=42383
  &pid=P00289313
  &medium=api
  &api_version=2.0
```

- `pid=P00289313` — TourGraph's partner/affiliate ID
- `mcid=42383` — merchant/campaign ID
- These are auto-included by the API based on our API key

**Campaign tracking:** We can append `&campaign=roulette` or `&campaign=worlds-most` to distinguish which feature drives bookings. The Viator dashboard (Tools > Links) also supports manual campaign tracking, but for programmatic use we append directly.

### Key Data Fields (What We Cache)

From `/products/{code}`:
- `title`, `description` — core content
- `images[].variants[]` — CDN-hosted photos, up to 10 sizes, largest 720x480
- `reviews.combinedAverageRating`, `reviews.totalReviews` — aggregate rating
- `itinerary.duration` — minutes (fixed or variable range)
- `destinations[].ref` — destination ID
- `supplier.name` — operator name
- `productUrl` — affiliate link with tracking
- `timeZone` — for Right Now Somewhere feature
- `tags` — for weighting/categorization
- `inclusions`, `logistics`, `additionalInfo` — for detail pages

From `/products/search`:
- `fromPrice` — display price (available at Basic in search results)

### Image Strategy

Viator serves images via TripAdvisor CDN with 10 size variants per image:

| Size | Use Case |
|------|----------|
| 720x480 | Tour card hero image (mobile + desktop) |
| 674x446 | OG card base image |
| 480x320 | Thumbnail / list view |
| 400x400 | Square variant if needed |

We cache the URL strings, not the images themselves. The CDN handles delivery.

For OG cards: We'll use Next.js `ImageResponse` to composite the tour photo (fetched from CDN) with our branded overlay at generation time.

---

## Claude API Integration

### Model Selection

| Use Case | Model | Why | Est. Cost |
|----------|-------|-----|-----------|
| Witty one-liners | **Haiku 4.5** (`claude-haiku-4-5-20251001`) | Fastest, cheapest, sufficient quality for short creative output | ~$0.003/run (4,000 tours) |
| Six Degrees chains | **Sonnet 4.6** (`claude-sonnet-4-6`) | Needs reasoning ability to build thematic connections across cities | ~$0.02/chain |

### Haiku Pricing (One-Liners)

- Input: $1 / MTok
- Output: $5 / MTok
- Per tour: ~500 input tokens (title + description + location) → ~50 output tokens (one-liner)
- 4,000 tours: ~2M input tokens ($0.002) + ~200K output tokens ($0.001) = **~$0.003/run**
- Even daily runs cost < $0.10/month

### One-Liner Generation (Batch, During Indexing)

```
System prompt:
  You write witty, warm, one-line descriptions of tours and experiences.
  Your tone is wonder-filled and playful — never snarky or mean.
  The goal is to make someone smile and want to share this with a friend.
  Keep it under 120 characters. No hashtags, no emojis.

User prompt:
  Tour: {title}
  Location: {destination_name}, {country}
  Rating: {rating} stars ({review_count} reviews)
  Price: ${from_price}
  Duration: {duration}
  Description: {first 200 chars of description}

  Write one witty line about this tour.
```

Example outputs:
- "Because sometimes the best tours require you to believe in magic."
- "For when 'luxury cruise' isn't enough and you need to go 2.4 miles straight down."
- "4.9 stars from people who voluntarily woke up at 5am on vacation."

### Six Degrees Chain Generation (On-Demand, Cached)

```
System prompt:
  You connect two cities through a chain of real tours, finding surprising
  thematic links between them. Each link should feel like a delightful
  "oh, I see the connection!" moment. Use only tours from the provided list.

User prompt:
  Connect {city_from} to {city_to} using these available tours:
  {JSON list of tours in relevant destinations}

  Build a chain of 3-6 tours, each connected by a thematic link
  (shared activity, cultural connection, cuisine, historical thread).

  Return JSON: { chain: [{ tour_id, connection_to_next }] }
```

Model: Sonnet 4.6 for reasoning quality. Cache every result in `six_degrees_chains` table. Popular city pairs can be pre-generated during batch indexing.

---

## Next.js Application

### Framework Choices

| Choice | Rationale |
|--------|-----------|
| **App Router** | `generateMetadata` for per-page OG tags, Server Components by default, route handlers for API |
| **TypeScript strict** | Type safety for API responses and DB queries |
| **Server Components** | All pages are server-rendered (OG tags must be in HTML for crawlers) |
| **Client Components** | Only for interactive elements: spin button, share sheet, Six Degrees input |

### Project Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout (dark theme, minimal nav)
│   ├── page.tsx                   # Homepage = Tour Roulette
│   ├── roulette/
│   │   └── [id]/
│   │       └── page.tsx           # Tour detail page (shared link landing)
│   ├── right-now/
│   │   ├── page.tsx               # Right Now Somewhere
│   │   └── [id]/
│   │       └── page.tsx           # Right Now detail
│   ├── worlds-most/
│   │   ├── page.tsx               # Today's superlatives
│   │   └── [slug]/
│   │       └── page.tsx           # Individual superlative
│   ├── six-degrees/
│   │   ├── page.tsx               # City pair input
│   │   └── [city1]/
│   │       └── [city2]/
│   │           └── page.tsx       # Chain result
│   └── api/
│       ├── roulette/
│       │   └── route.ts           # GET: random weighted tour from SQLite
│       ├── right-now/
│       │   └── route.ts           # GET: tour by current timezone
│       ├── worlds-most/
│       │   └── route.ts           # GET: today's superlatives
│       ├── six-degrees/
│       │   └── route.ts           # POST: generate/fetch chain
│       └── og/
│           └── [type]/
│               └── [id]/
│                   └── route.ts   # GET: dynamic OG image generation
│
├── components/
│   ├── TourCard.tsx               # The atomic tour card (used everywhere)
│   ├── SpinButton.tsx             # "Show Me Another" (client component)
│   ├── ShareButton.tsx            # Native share / copy link (client component)
│   └── FeatureNav.tsx             # Subtle bottom nav links
│
├── lib/
│   ├── db.ts                      # SQLite connection + query helpers
│   ├── viator.ts                  # Viator API client (used by indexer only)
│   ├── claude.ts                  # Claude API client (one-liners + chains)
│   └── types.ts                   # Shared TypeScript types
│
├── scripts/
│   └── indexer.ts                 # Drip + Delta indexer (continuous background process)
│
└── public/
    └── fonts/                     # Playful typography (TBD)
```

### API Route Design

**`GET /api/roulette/hand`**

```typescript
// Returns a "hand" of ~20 tours, pre-sequenced for maximum contrast.
// Client cycles through them locally — no network call per spin.
// When exhausted, fetch a new hand.

// Response: < 50ms (single SQLite query + shuffle)
{
  hand: [
    {
      id: number,
      productCode: string,
      title: string,
      oneLiner: string,
      destinationName: string,
      country: string,
      continent: string,
      rating: number,
      reviewCount: number,
      fromPrice: number,
      durationMinutes: number,
      imageUrl: string,
      viatorUrl: string,      // with affiliate tracking + campaign param
      weightCategory: string  // "highest_rated", "unique", "most_expensive", etc.
    },
    // ... ~20 tours total
  ]
}
```

See "Roulette Hand Algorithm" section below for how the hand is built and sequenced.

**`GET /api/right-now`**

```typescript
// No params needed — server determines current "beautiful" timezones

// Response: < 50ms
{
  tour: { ...same as roulette },
  localTime: string,      // "6:47am"
  timeDescription: string // "golden hour" / "sunset" / "morning light"
}
```

**`GET /api/worlds-most`**

```typescript
// Response: array of today's superlatives, < 50ms
{
  superlatives: [
    {
      type: "most_expensive",
      label: "Most Expensive Tour on Earth",
      statValue: "$45,000",
      tour: { ...same as roulette }
    },
    ...
  ]
}
```

**`POST /api/six-degrees`**

```typescript
// Request:
{ cityFrom: string, cityTo: string }

// Response: 2-5 seconds (Claude API call, or instant if cached)
{
  chain: [
    {
      tour: { ...tour data },
      connectionToNext: "fermentation"  // thematic link
    },
    ...
  ],
  cached: boolean
}
```

### OG Image Generation

Using Next.js `ImageResponse` (built on Satori):

```typescript
// GET /api/og/roulette/[id]
// Returns 1200x630 PNG

// Composites:
// 1. Tour photo (fetched from Viator CDN, fills most of image)
// 2. Dark gradient overlay at bottom
// 3. Feature badge ("Tour Roulette" / "World's Most Expensive")
// 4. Tour title
// 5. Key stat (rating, price, location)
// 6. TourGraph brand mark (small, bottom corner)
```

Each shared URL includes `<meta property="og:image">` pointing to this endpoint. The image is generated on first request and can be cached at the CDN/edge level.

---

## Indexer: Drip + Delta

### Design Principles

1. **Be a good API citizen.** No burst traffic. Spread calls evenly. Look like a normal affiliate, not a scraper.
2. **Don't re-fetch what hasn't changed.** Tours are stable for weeks. Use search summaries as a delta signal.
3. **The DB is always live.** No staging/swapping. Individual rows are updated in place. Data is always servable.

### Two Modes

**Initial Fetch (first run only):**

The first time the indexer runs, there's no cached data. This is the slow, full crawl — spread over ~24 hours to avoid any API spikes.

```
Spread over 24 hours:
  ~100 destinations per hour
  Per destination:
    4 search queries (by rating, price asc, price desc, unique tags)
    → ~200 search calls/hour
    → Fetch full details for all discovered products
    → Generate one-liners for each

  Hourly API calls: ~200 search + ~500 detail + ~500 Claude = ~1,200
  Viator rate: ~200 search + ~500 detail = ~700 calls/hour
    (well under 150 req/10s = 54,000/hour max)

  After 24 hours: full index of all 2,500 destinations built
  Total tours indexed: estimated ~5,000-10,000 share-worthy tours
```

**Ongoing Refresh (every run after initial):**

After the initial build, most data is stable. The indexer uses search results as a delta signal to minimize API calls.

```
Cycle: all 2,500 destinations refreshed over ~7 days
Schedule: ~350 destinations per day, ~15 per hour (every 4 minutes)

Per destination refresh:
  1. Run /products/search (4 queries × sort/tag)
     → Returns summaries: productCode, title, price, rating, cover image

  2. COMPARE with cached data in SQLite:
     → Known product, unchanged summary → SKIP (no detail fetch)
     → Known product, summary changed   → UPDATE price/rating in DB
     → New productCode (never seen)     → FETCH full details
     → Cached product missing from results → mark inactive

  3. For NEW products only:
     → GET /products/{code} for full details
     → Call Claude Haiku for one-liner
     → INSERT into tours table

  4. Recompute superlatives (World's Most ___) once daily
     → Pure SQL queries on existing data, no API calls
```

### API Call Budget (Ongoing)

```
Daily:
  Search queries:    ~350 destinations × 4 queries = ~1,400 calls
  Detail fetches:    ~50 new/changed products = ~50 calls
  Claude one-liners: ~50 new products = ~50 calls
  ──────────────────────────────────────────────────
  Total Viator:      ~1,450 calls/day (~60/hour)
  Total Claude:      ~50 calls/day

vs. previous plan:   ~4,400 calls in 15 minutes (every night!)
Reduction:           ~70% fewer calls, spread over 24 hours
```

### How Delta Detection Works

The `/products/search` response returns summary data for each product. We compare this against our cached records:

```
Search result for product "5396MTR":
  title: "Mt. Rainier Day Tour from Seattle"
  fromPrice: 208.56
  rating: 4.86
  reviewCount: 1829

Cached record for "5396MTR":
  title: "Mt. Rainier Day Tour from Seattle"  ← match
  fromPrice: 208.56                           ← match
  rating: 4.86                                ← match
  reviewCount: 1829                           ← match

Result: SKIP — no detail fetch needed. Saved one API call.
```

After the initial build, 80-90% of products will match on every refresh cycle.

### Destination Refresh Priority

Not all destinations need the same refresh frequency:

```
Tier 1 (top 50 by tour volume):    refresh every 2 days
  Paris, Tokyo, NYC, London, Barcelona, etc.
  Most likely to have new tours added

Tier 2 (next 200 mid-tier):        refresh every 5 days
  Reykjavik, Marrakech, Medellín, etc.

Tier 3 (remaining ~2,250):         refresh every 7-10 days
  Small/exotic destinations
  Rarely get new tours, but that's where the gems are
```

### Failure & Resilience

```
Indexer tick fails   → That batch of destinations retries next cycle
                       DB is untouched, all existing data still serves
Viator API down      → Indexer pauses, retries in 1 hour
                       Stale data serves fine (tours don't change hourly)
Claude API down      → New tours indexed without one-liners
                       One-liners generated on next successful cycle
Full DB intact       → Even if indexer is broken for a week,
                       users see week-old data. Still perfectly valid.
Manual re-run        → npm run index (or equivalent)
```

### Superlatives Computation

Daily "World's Most ___" — computed from existing cached data, no API calls:

```sql
-- Most Expensive Tour on Earth
SELECT * FROM tours WHERE status = 'active'
  ORDER BY from_price DESC LIMIT 1;

-- Cheapest 5-Star Experience
SELECT * FROM tours WHERE status = 'active'
  AND rating >= 4.8 ORDER BY from_price ASC LIMIT 1;

-- Longest Duration
SELECT * FROM tours WHERE status = 'active'
  ORDER BY duration_minutes DESC LIMIT 1;

-- Most Reviewed
SELECT * FROM tours WHERE status = 'active'
  ORDER BY review_count DESC LIMIT 1;

-- Highest Rated Hidden Gem (amazing but undiscovered)
SELECT * FROM tours WHERE status = 'active'
  AND rating >= 4.9 AND review_count < 100
  ORDER BY rating DESC, review_count ASC LIMIT 1;

-- Shortest Duration (quickest experience)
SELECT * FROM tours WHERE status = 'active'
  AND duration_minutes > 0
  ORDER BY duration_minutes ASC LIMIT 1;
```

Run once daily (e.g., midnight UTC). Results stored in `superlatives` table.

---

## Performance Strategy

### The Core Principle

**No API call at request time** (except Six Degrees).

| Action | Data Source | Expected Latency |
|--------|-----------|-----------------|
| Spin roulette | SQLite query | < 50ms |
| Load tour detail | SQLite query | < 50ms |
| Load Right Now | SQLite query | < 50ms |
| Load World's Most | SQLite query | < 50ms |
| Generate OG image | SQLite + CDN image fetch | < 500ms (then cached) |
| Six Degrees chain | Claude API (or cache) | 2-5s (instant if cached) |

### Client-Side Performance

- **Batch delivery** — `/api/roulette/hand` delivers ~20 tours at once. Client cycles through them locally with zero network latency per spin. Fetch a new hand when exhausted.
- **Image pre-loading** — while user views current card, pre-load the next card's image in the background
- **Skeleton loaders with shimmer** — only shown on initial page load and new hand fetch
- **Image optimization** — Next.js `<Image>` component with lazy loading, proper sizing
- **Minimal JS** — Server Components by default, client JS only for spin button, share sheet, Six Degrees input

### Lessons from News App (What NOT to Do)

| News App Problem | TourGraph Solution |
|-----------------|-------------------|
| Cold cache on first load → 6-10s wait | Pre-built SQLite — no cold cache ever |
| API calls at request time | All data pre-indexed, served from local DB |
| Frontend retries blindly on partial data | All data complete before serving |
| No client-side caching | Pre-fetch next tour while viewing current |
| Server restart = empty cache | SQLite persists on disk, instant recovery |

---

## Deployment

### Infrastructure

```
DigitalOcean Droplet (~$6/mo)
├── Node.js (Next.js production server)
├── SQLite (database file on disk)
├── Drip indexer (continuous background process via PM2/systemd)
├── nginx (reverse proxy, SSL termination)
└── PM2 or systemd (process management)
```

### DNS Cutover

Current: tourgraph.ai → GitHub Pages (MkDocs site)
Target:  tourgraph.ai → DigitalOcean droplet IP

Steps:
1. Deploy Next.js app to droplet
2. Configure nginx + SSL (Let's Encrypt)
3. Update DNS A record to droplet IP
4. Verify OG cards work (social platform crawlers must reach the server)

### CI/CD

GitHub Actions:
1. Push to main → build Next.js
2. Deploy to droplet (rsync or Docker)
3. Run indexer if schema changed
4. Health check

---

## Roulette Hand Algorithm

The core insight: variety between consecutive spins is what makes Roulette addictive. Like a DJ set — each spin should contrast with the last. This is achieved by dealing from a curated, sequenced "hand" rather than random picks.

### Building a Hand

Each hand contains ~20 tours, drawn from the index by category:

```
HAND COMPOSITION (~20 tours):
  4  highest_rated      — 4.9+ stars, crowd-validated quality
  3  unique             — "Once in a Lifetime" / "Unique Experiences" tags
  3  cheapest_5star     — amazing value, low price + high rating
  3  most_expensive     — jaw-dropping price tags
  3  exotic_location    — unusual destinations, off the beaten path
  2  most_reviewed      — social proof, "how have I not heard of this?"
  2  wildcard           — random picks from the full pool
```

### Sequencing for Contrast

After drawing the 20 tours, the server sequences them with constraints:

```
SEQUENCING RULES:
  1. No two tours from the same category back-to-back
  2. No two tours from the same continent back-to-back
  3. Alternate price extremes where possible
     (expensive → cheap → mid → expensive)

ALGORITHM:
  1. Group tours by category
  2. Interleave categories in a shuffled rotation
  3. Within each category slot, pick a tour that differs
     in continent from the previous tour
  4. If constraints can't be satisfied, relax and pick randomly
     (perfect is the enemy of good)
```

### Example Hand Sequence

```
 1. [most_expensive]  $12,000 Private Yacht, Santorini (Europe)
 2. [cheapest_5star]  $9 Street Food Walk, Bangkok (Asia)
 3. [unique]          Fairy Hunting w/ Elf Spotter, Iceland (Europe — ok, different vibe)
 4. [highest_rated]   5.0★ Cooking Class, Oaxaca (Americas)
 5. [exotic_location] Volcano Boarding, Nicaragua (Americas — different country)
 6. [most_reviewed]   12,000 reviews, Colosseum Skip-the-Line (Europe)
 7. [cheapest_5star]  $11 Sunrise Hike, Bali (Asia)
 8. [most_expensive]  $45,000 Submarine to Titanic (Americas)
 9. [wildcard]        Night Kayaking, New Zealand (Oceania)
10. [highest_rated]   4.97★ Northern Lights, Tromsø (Europe)
11. [unique]          Truffle Hunting w/ Trained Dog, Tuscany (Europe)
12. [exotic_location] Camel Trek, Sahara (Africa)
13. ...
```

Every 2-3 spins, the price, location, and "type of interesting" shifts. The user never settles into a pattern.

### Delivery

```
Client loads page → GET /api/roulette/hand → receives 20 tours
User spins → client shows next card from hand (instant, no network call)
Hand exhausted → GET /api/roulette/hand → new 20 tours (no overlap with previous)
```

This also solves the repeat problem — tours within a hand are unique, and subsequent hands exclude previously seen IDs.

---

## Resolved Decisions

### D2: Roulette Weighting → Hand Algorithm
See "Roulette Hand Algorithm" section above. Server builds a sequenced "hand" of ~20 tours with guaranteed category and geographic contrast. Client cycles through locally — zero network calls per spin.

### D3: Avoiding Repeats → Solved by Hand Delivery
Tours within a hand are unique. Subsequent hand requests can pass previously seen IDs to avoid repeats across hands.

### D4: Destination Count → All 2,500
Index everything. The drip approach spreads the load over 7 days, so there's no burst. The obscure destinations are where the best "wait, THAT exists?" moments come from. More variety = better Roulette.

---

## What's NOT in This Doc

- **Visual design** — Colors, fonts, spacing. Separate design pass.
- **iOS app architecture** — Comes after web launch.
- **Monitoring/observability** — Logging, error tracking. Add when deploying.
- **SEO strategy** — Beyond OG cards. Not a priority for launch.

---

## Environment Variables

```bash
# .env.local (Next.js)
VIATOR_API_KEY=<production key>
ANTHROPIC_API_KEY=<Claude API key>
DATABASE_PATH=./data/tourgraph.db

# Optional
INDEXER_INTERVAL_MINUTES=4        # Time between destination refreshes (~15/hour)
CLAUDE_MODEL_ONELINER=claude-haiku-4-5-20251001
CLAUDE_MODEL_SIXDEGREES=claude-sonnet-4-6
```

---

## Cost Estimate (Monthly)

| Item | Cost |
|------|------|
| DigitalOcean droplet | ~$6 |
| Claude API (Haiku, nightly one-liners) | < $0.10 |
| Claude API (Sonnet, Six Degrees on-demand) | ~$1-5 (depends on usage) |
| Viator API | Free |
| Domain (tourgraph.ai) | Already paid |
| **Total** | **~$7-12/month** |
