# TourGraph iOS App — Architecture

---
**Last Updated**: March 3, 2026
**Status**: Complete — submitted to App Store March 3, 2026 (App ID 6759991920), waiting for review.
**Reference apps**: GitaVani (all-local pattern), ClearNews (API + caching pattern)
---

## One-Line Summary

A self-contained SwiftUI app that reads from a bundled SQLite database — no API keys, no backend, no accounts. Ships a 120MB seed DB with all 136K tours (descriptions truncated, single cover photo per tour). Per-tour enrichment fetches full descriptions and photo galleries on demand when users tap into detail views.

---

## Architecture

```
App Store (~150MB total)
  └── Seed SQLite DB (120MB, 136K tours, all features work)

On Tour Detail Tap (lazy enrichment):
  If image_urls_json IS NULL or description ends with "..."
    → GET /api/ios/tour/{id} → update this tour in local DB → UI refreshes
  If already enriched → show full data immediately (persisted from previous view)

Runtime:
  SwiftUI Views → Services (@Observable) → SQLite (GRDB.swift, read + write for enrichment)
                                          → Viator CDN (photos only)
                                          → tourgraph.ai API (per-tour enrichment only)
                                          → No API keys anywhere
```

---

## Data Strategy: Seed + Enrich

### iOS DB Requirements (Verified)

The iOS app queries exactly **2 tables**. Everything else is pipeline/web-only infrastructure.

| Table | Queried? | By | Notes |
|-------|----------|-----|-------|
| `tours` | **YES** | All 4 features + settings stats | The only data table that matters |
| `six_degrees_chains` | **YES** | Six Degrees tab | 491 chains, self-contained JSON blobs |
| `city_profiles` | NO | — | Used during chain *generation* (Stage 1), not at display time |
| `city_readings` | NO | — | Append-only pipeline log for city intelligence |
| `destinations` | NO | — | `Destination.swift` model exists but is dead code — no query uses it |
| `superlatives` | NO | — | Empty table; superlatives computed live from `tours` |
| `indexer_state` | NO | — | Indexer resume key — web pipeline only |

### Column Usage Analysis

`DatabaseService.swift` has two query patterns for tours:

**Pattern 1 — Card queries** (Roulette hand, Right Now tours): explicit column list.
```sql
SELECT id, product_code, title, one_liner, destination_name, country,
       continent, rating, review_count, from_price, currency,
       duration_minutes, image_url, viator_url, weight_category
FROM tours WHERE ...
```
Right Now adds `timezone` to the SELECT.

**Pattern 2 — Detail page** (`getTourById`): `SELECT * FROM tours WHERE id = ?`
Decodes into the full `Tour` struct via GRDB's `FetchableRecord`.

**What TourDetailView actually renders from the `SELECT *`:**
- `title` — heading
- `oneLiner` — italic caption
- `destinationName` + `country` — location line
- `rating`, `reviewCount`, `fromPrice`, `durationMinutes` — stat badges
- `description` — body text paragraph (the expensive column)
- `imageUrlsJson` → horizontal photo gallery, up to 10 images (the other expensive column)
- `highlightsJson` → bullet list — but **100% NULL in DB** (Viator Basic tier doesn't provide this)
- `viatorUrl` — "Book on Viator" button

**Columns in Tour struct but never rendered in any view:**
- `productCode` — in model, never displayed
- `inclusionsJson` — in model, never displayed
- `supplierName` — in model, never displayed
- `destinationId` — in model, never displayed (only `destinationName` is shown)

**Columns in DB but not in the Tour struct at all** (GRDB safely ignores these):
- `latitude`, `longitude` — all NULL anyway (never populated)
- `tags_json`, `summary_hash`, `indexed_at`, `last_seen_at`
- `status` — used in WHERE clauses only, not decoded into model

### Seed DB (120MB, bundled in app binary)

Ships with the app. All four features work instantly — every tour, every chain, every one-liner.

**What's in the seed DB:**

| What | Size | Why |
|------|------|-----|
| All 136K active tours (core columns) | ~90 MB | Roulette, Right Now, World's Most, Six Degrees tour lookups |
| `description` truncated to ~200 chars | ~15 MB | Detail page shows 1-2 sentence preview (avg tour desc is 614 chars) |
| All 491 Six Degrees chains | ~1 MB | Six Degrees gallery + timeline |
| Indexes (weight, status, rating, price, destination, timezone) | ~14 MB | Query performance |

**What's excluded from seed** (saves ~270MB):

| Column/Table | Saved | Impact |
|--------------|-------|--------|
| `image_urls_json` (NULLed) | ~142 MB | Detail page shows single cover photo instead of 10-photo gallery |
| `description` truncation (614→200 chars) | ~60 MB | Detail page shows preview paragraph + "..." instead of full text |
| `inclusions_json` (NULLed) | ~18 MB | Never displayed in any view |
| `supplier_name` (NULLed) | ~2 MB | Never displayed in any view |
| 5 unused tables dropped | ~4 MB | Zero impact — app never queries them |
| Unused columns NULLed (tags_json, summary_hash, indexed_at, last_seen_at) | ~19 MB | Not in Tour struct |
| Redundant indexes dropped | ~7 MB | idx_tours_indexed + idx_tours_product_code never queried by app |
| 47 inactive tours deleted | negligible | Filtered out by `WHERE status = 'active'` anyway |
| VACUUM | ~10-15% | Reclaims freed space |

**Key decisions:**
- **Description**: Truncated to ~200 chars at word boundary + "..." — not NULLed. Tested with 30 random tours; 200 chars consistently captures 1-2 complete thoughts. Between the one-liner (~84 chars) and the truncated description, the detail page has enough personality.
- **image_urls_json**: NULLed entirely. The cover photo (`image_url`, ~12 MB, always kept) displays on every card in every feature. Detail page gracefully falls through to single hero image via `if tour.imageURLs.count > 1 { gallery } else { heroImage }`.
- **Column schema preserved**: Columns are NULLed, not dropped from the table. This keeps GRDB's `FetchableRecord` Codable decoding working — Optional properties decode as nil when data is NULL. The 3 non-optional Tour properties (`id`, `productCode`, `title`) are always populated.

**Actual size: 120MB** (479MB → 120MB after truncation + NULLing + VACUUM). Well below Apple's 200MB cellular download limit — no prompt for cellular downloads.

### Per-Tour Enrichment — COMPLETE

Lazy, on-demand enrichment that progressively fills in full data as the user explores. **Status: Built and integrated.** Server endpoints deployed, `TourEnrichmentService.swift` wired into `TourDetailView.onAppear`.

The seed DB ships with truncated descriptions (~200 chars) and NULL `image_urls_json`. All card views (Roulette, Right Now, World's Most, Six Degrees) display perfectly with seed data. TourDetailView triggers enrichment on first view — subsequent views show full data from local DB.

**How it works:**

```
User taps tour card → TourDetailView opens
  → Show seed DB data immediately (truncated description, single photo)
  → If image_urls_json IS NULL or description ends with "..."
      GET /api/ios/tour/{id}
        → Returns { id, description, image_urls_json } (~2KB)
        → Write to local DB via DatabaseService.enrichTour()
        → UI refreshes in place — detail page now shows full description + photo gallery
  → If already enriched from a previous view → full data shown immediately
```

**What enrichment restores per tour:**
- Full description (replacing truncated ~200-char preview)
- `image_urls_json` (enabling multi-photo gallery on detail pages)

**Server endpoints (Next.js API routes):**
- `GET /api/ios/tour/[id]` — returns `{ id, description, image_urls_json }` for one tour
- `POST /api/ios/tours/batch` — accepts `{ ids: [1, 2, 3] }`, returns `{ tours: [...] }`

**Progressive enrichment:** The app gets richer the more you use it. Only tours the user actually views get enriched — no wasted bandwidth. Over time, frequently browsed tours have full data cached locally.

**Offline graceful:** If no network, seed data displays fine. Enrichment simply doesn't happen until next time with connectivity. No error states needed.

### Data Refresh — V2 (NOT DESIGNED)

Broader data refresh (new tours from Viator re-indexing, updated one-liners, new chains) is a separate concern from per-tour enrichment. Not needed until we actually start running periodic indexer updates on the production DB. No design work done yet — will address when we build the drip indexer (see "Not Now" in NOW.md).

### GRDB Safety Notes

- **SELECT \* with NULLed columns**: GRDB's Codable decoder handles `Optional` properties as `nil` when the column value is NULL. The 3 non-optional Tour properties (`id: Int`, `productCode: String`, `title: String`) must always have real data — they do, across all 136K tours.
- **Strategy**: NULL column *data* rather than dropping columns from the schema. This keeps `FetchableRecord` decoding working without Swift code changes.
- **Extra DB columns**: Columns in the DB but not in the Tour struct's `CodingKeys` (e.g., `tags_json`, `indexed_at`) are safely ignored by GRDB during decoding. No crash, no error.
- **Write access for enrichment**: The DB connection needs to be read-write (not read-only) to support per-tour enrichment writing `description` and `image_urls_json` back. GRDB supports this — just use `DatabaseQueue` instead of read-only mode.

---

## Design Decisions

### D1: SQLite library — GRDB.swift (not raw C API, not Core Data, not SwiftData)

**Decision**: Use [GRDB.swift](https://github.com/groue/GRDB.swift) for SQLite access.

**Why not SwiftData**: SwiftData is an ORM that manages its own schema. We have a pre-built DB with a fixed schema from the web app's indexer. SwiftData would require schema migration, model generation, and fights us on "read a DB we didn't create." GRDB reads arbitrary SQLite databases natively.

**Why not raw SQLite C API**: Too low-level. GRDB provides type-safe row mapping, query building, and thread safety without the boilerplate.

**Why not Core Data**: Same ORM mismatch as SwiftData. Designed for apps that own their data, not apps that read pre-built databases.

### D2: No API keys in the app

**Decision**: Zero API keys shipped in the binary. No Viator key, no Claude key.

**Why**: One-liners are pre-generated in the DB. Tour data is pre-indexed. Photos load from Viator's public CDN URLs (no auth needed). The only network calls are: (1) photo loading, (2) per-tour enrichment (lazy, on detail view tap). All unauthenticated — no API keys in the binary.

**Implication**: No API rate limiting concerns, no key rotation, no secrets management, no risk of key extraction from the binary.

### D3: @Observable pattern (matching GitaVani + ClearNews)

**Decision**: Use Swift 5.9+ `@Observable` macro for all shared state. No Combine, no ObservableObject.

**Why**: Both existing apps use this pattern successfully. Simpler than `@StateObject` + `@EnvironmentObject`. Views automatically react to property changes.

### D4: Swipe-based roulette (not button-based like web)

**Decision**: Tour Roulette uses horizontal swipe gestures (Tinder-style) instead of a "Show Me Another" button.

**Why**: Native gesture on iOS. More tactile, more fun. Haptic feedback on swipe adds physicality. The button works on web where swipe isn't natural.

**Fallback**: Button still exists for accessibility. Swipe is the primary interaction.

### D5: Seed DB size — 120MB

**Decision**: Seed DB is 120MB after stripping unused tables, NULLing non-displayed columns, truncating descriptions to ~200 chars, and VACUUM. Total app binary ~150MB.

**Result**: Well below Apple's 200MB cellular download limit. The 200-char truncation preserves 1-2 meaningful sentences. Per-tour enrichment restores full descriptions and photo galleries lazily as users browse.

### D6: No user accounts, no sync, no backend

**Decision**: Favorites and recent spins stored in UserDefaults. No cloud sync.

**Why**: Pillar 1 (Zero Friction) — no signup, no login. If someone gets a new phone, they lose their favorites. That's fine. This isn't a productivity app. The delight is in discovery, not collection.

### D7: Minimum iOS version — iOS 17+

**Decision**: Target iOS 17 minimum.

**Why**: `@Observable` macro requires iOS 17. As of early 2026, iOS 17+ covers ~95% of active iPhones. Both GitaVani and ClearNews target iOS 17+.

---

## Project Structure

```
ios/TourGraph/
├── TourGraph.xcodeproj
├── TourGraph/
│   ├── TourGraphApp.swift              # @main entry, database init, loading screen
│   ├── ContentView.swift               # 4-tab TabView container
│   │
│   ├── Models/
│   │   ├── Tour.swift                  # Core tour model (maps to tours table)
│   │   ├── Destination.swift           # Destination with timezone (dead code — no queries use it)
│   │   ├── Chain.swift                 # Six Degrees chain + links
│   │   └── Superlative.swift           # Superlative type + display config
│   │
│   ├── Services/
│   │   ├── DatabaseService.swift       # GRDB connection, all queries + enrichment writes
│   │   ├── TourEnrichmentService.swift # Per-tour lazy enrichment (fetch from server, write to DB)
│   │   └── TimezoneHelper.swift        # Golden hour detection, timezone math
│   │
│   ├── State/
│   │   ├── RouletteState.swift         # Hand algorithm, contrast sequencing, prefetch
│   │   ├── AppSettings.swift           # Haptics toggle → UserDefaults
│   │   └── Favorites.swift             # Saved tour IDs → UserDefaults
│   │
│   ├── Views/
│   │   ├── Roulette/
│   │   │   └── RouletteView.swift      # Swipe cards, rotation effect, logo header
│   │   │
│   │   ├── RightNow/
│   │   │   └── RightNowView.swift      # RightNowTab + RightNowSection + MomentCardView
│   │   │
│   │   ├── WorldsMost/
│   │   │   └── WorldsMostView.swift    # WorldsMostTab + WorldsMostSection + SuperlativeCardView
│   │   │
│   │   ├── SixDegrees/
│   │   │   └── SixDegreesView.swift    # SixDegreesTab + SixDegreesSection (inline chain timeline)
│   │   │
│   │   ├── Detail/
│   │   │   └── TourDetailView.swift    # Full tour info, image gallery, Viator link
│   │   │
│   │   ├── Settings/
│   │   │   ├── SettingsView.swift      # Modal sheet: haptics, favorites, about, stats, legal
│   │   │   ├── FavoritesListView.swift # Saved tours list with TourCardView cards
│   │   │   └── AboutView.swift         # App info, features, stats, links to web
│   │   │
│   │   └── Shared/
│   │       ├── TourCardView.swift      # Photo-dominant card with favorite heart
│   │       └── StatBadge.swift         # Rating, price, duration pills
│   │
│   ├── Assets.xcassets/                # App icon, LogoWhite, accent color
│   │
│   └── Resources/
│       └── tourgraph.db               # Bundled SQLite database (gitignored)
```

**V2 ideas**: Widgets, RecentSpins.

---

## Data Models (Swift)

These map to the SQLite schema. Updated March 3, 2026 to match actual code in `ios/.../Models/`.

### Tour (primary model) — `Tour.swift`

```swift
struct Tour: Identifiable, Codable, FetchableRecord, Sendable {
    let id: Int                     // NON-OPTIONAL — must always exist
    let productCode: String         // NON-OPTIONAL — must always exist
    let title: String               // NON-OPTIONAL — must always exist
    let oneLiner: String?           // AI caption (~84 chars avg)
    let description: String?        // Truncated to ~200 chars in seed DB
    let destinationId: String?      // Never displayed, but in model
    let destinationName: String?
    let country: String?
    let continent: String?
    let timezone: String?           // IANA timezone, used by Right Now
    let rating: Double?             // NULL for 33% of tours (no reviews)
    let reviewCount: Int?
    let fromPrice: Double?
    let currency: String?
    let durationMinutes: Int?
    let imageUrl: String?           // Cover photo — always populated, always kept
    let imageUrlsJson: String?      // JSON array — NULLed in seed DB
    let highlightsJson: String?     // JSON array — 100% NULL (Basic tier)
    let inclusionsJson: String?     // JSON array — NULLed in seed DB, never displayed
    let viatorUrl: String?          // Affiliate link
    let supplierName: String?       // Never displayed in any view
    let weightCategory: String?     // Roulette category quotas
}
// CodingKeys map snake_case DB columns → camelCase Swift (e.g., product_code → productCode)
```

### Destination — `Destination.swift` (DEAD CODE)

Model exists but **no query in DatabaseService.swift references the `destinations` table**. The `destinations` table is dropped from the seed DB. This file can be removed during cleanup.

```swift
struct Destination: Identifiable, Codable, FetchableRecord, Sendable {
    let id: String
    let name: String
    let parentId: String?
    let timezone: String?
    let latitude: Double?
    let longitude: Double?
}
```

### Chain (Six Degrees) — `Chain.swift`

The chain structure uses a raw DB row + parsed JSON pattern:

```swift
// Raw row from six_degrees_chains table
struct ChainRow: Identifiable, Codable, FetchableRecord, Sendable {
    let id: Int
    let cityFrom: String            // city_from column
    let cityTo: String              // city_to column
    let chainJson: String           // Full chain data as JSON blob
    let generatedAt: String?
}

// One stop in a chain (parsed from chainJson)
struct ChainLink: Codable, Sendable {
    let city: String
    let country: String
    let tourTitle: String           // tour_title
    let tourId: Int?                // Optional — used to fetch Tour for one-liner display
    let connectionToNext: String?   // connection_to_next — narrative bridge to next stop
    let theme: String?              // Thematic category (e.g., "craftsmanship") — null on last stop
}

// Parsed JSON structure
struct ChainData: Codable, Sendable {
    let cityFrom: String
    let cityTo: String
    let chain: [ChainLink]          // 5 stops
    let summary: String             // Narrative summary of entire chain
}

// Display-ready chain (slug computed from city names)
struct Chain: Identifiable, Sendable {
    let id: Int
    let cityFrom: String
    let cityTo: String
    let summary: String
    let links: [ChainLink]
    let slug: String                // "tokyo-rome" (for share URLs)
    let generatedAt: String?

    init(row: ChainRow)             // Decodes chainJson → ChainData → properties
}
```

### Superlative — `Superlative.swift`

```swift
enum SuperlativeType: String, CaseIterable, Sendable {
    case mostExpensive = "most-expensive"
    case cheapest5Star = "cheapest-5star"
    case longest, shortest
    case mostReviewed = "most-reviewed"
    case hiddenGem = "hidden-gem"
}

struct SuperlativeResult: Identifiable, Sendable {
    let type: SuperlativeType
    let tour: Tour                  // Full tour fetched via superlative query
}
```

---

## Key Services

### DatabaseService

Central read-only GRDB connection. All queries go through here.

```swift
@Observable
final class DatabaseService {
    private let db: DatabaseQueue

    // Roulette
    func getRouletteHand(excludeIds: [Int], handSize: Int) -> [Tour]

    // Right Now
    func getDistinctTimezones() -> [String]
    func getRightNowTours(timezones: [String], count: Int) -> [Tour]

    // World's Most
    func getSuperlative(_ type: SuperlativeType) -> Tour?
    func getAllSuperlatives() -> [SuperlativeResult]

    // Six Degrees
    func getAllChains() -> [Chain]
    func getChainBySlug(_ slug: String) -> Chain?

    // Detail
    func getTourById(_ id: Int) -> Tour?

    // Enrichment (write back to local DB)
    func enrichTour(id: Int, description: String?, imageUrlsJson: String?) throws
}
```

### RouletteState

Mirrors the web's hand algorithm: weighted random selection with category quotas and contrast sequencing (no same category or continent back-to-back).

```swift
@Observable
final class RouletteState {
    let database: DatabaseService
    var currentTour: Tour?
    var hand: [Tour] = []
    private var handIndex = 0
    private var seenIds: Set<Int> = []

    func fetchHand()      // load batch from DB, apply contrast sequencing
    func nextTour()       // advance to next tour in hand, refetch when exhausted
}
```

### TourEnrichmentService — COMPLETE

Lazy per-tour enrichment. Fetches full description + image gallery when user views a tour detail.

```swift
@Observable @MainActor
final class TourEnrichmentService {
    private let baseURL: URL       // defaults to https://tourgraph.ai
    private let database: DatabaseService

    func enrichIfNeeded(tourId: Int) async
    // 1. Read tour from DB — if imageUrlsJson != nil, already enriched, return
    // 2. GET {baseURL}/api/ios/tour/{tourId} → decode { id, description, image_urls_json }
    // 3. Write to local DB via database.enrichTour() → UI refreshes in place
}
```

Called from `TourDetailView.task`. Uses `os.Logger` (subsystem: "ai.tourgraph", category: "enrichment") for production logging — debug for skips, info for success + timing, error for failures.

---

## Roulette Hand Algorithm (iOS Port)

The web's algorithm in `db.ts` (getRouletteHand) must be ported to Swift. Core logic:

1. **Category quotas**: Each hand of ~20 tours has targets per weight category (highest_rated: 4, most_reviewed: 3, most_expensive: 2, cheapest_5star: 3, unique: 3, exotic_location: 3, wildcard: 2)
2. **Weighted random**: Within each category, pick randomly (ORDER BY RANDOM())
3. **Exclude seen**: Pass `seenIds` to avoid repeats until the pool thins
4. **Contrast sequencing**: Reorder the hand so no two adjacent tours share the same category or continent
5. **Refetch**: When hand is exhausted, fetch a new one

This is pure SQL + Swift logic. No API calls.

---

## Feature-Specific Notes

### Tour Roulette (Swipe UI)

```
┌─────────────────────┐
│                     │
│   [Tour Photo]      │  ← Full-bleed 3:2 image
│                     │
│   Tour Title        │
│   "Witty one-liner" │
│   📍 City, Country  │
│   ⭐ 4.8 · $49 · 3h │
│                     │
│   ← Swipe for next  │
│                     │
│   [Share]  [Detail] │
└─────────────────────┘
```

- Horizontal swipe = next tour (with haptic pulse)
- Tap card = push to TourDetailView
- Share button = native UIActivityViewController
- Card stack: current + next 2 pre-rendered behind

### Right Now Somewhere

- Uses Foundation `TimeZone` + `Calendar` for golden hour detection (port of web's `timezone.ts`)
- Golden hour = local time between 5:30-7:30 AM or 4:30-7:00 PM
- Queries tours from destinations in golden-hour timezones
- Widget extension reads same DB, updates every 15 minutes

### The World's Most ___

- Same 6 superlative queries as web (most-expensive, cheapest-5star, longest, shortest, most-reviewed, hidden-gem)
- Vertical scrolling cards
- Push notification (post-launch): daily superlative at 9am local time

### Six Degrees of Anywhere

- Chain roulette: one random chain displayed inline with full vertical timeline
- Each stop shows tour photo (16:9), title, one-liner, stats (rating/price/duration), and favorite heart overlay
- Theme badges on stops, yellow connection text between stops with chevron icons
- `ViewThatFits` handles long city names (horizontal → vertical fallback)
- "Show Me Another" button loads a new random chain

---

## Navigation

```
TabView (4 tabs)
├── Roulette (default tab)
│   ├── RouletteView (swipe cards, logo header)
│   └── → TourDetailView (push)
│
├── Right Now
│   ├── RightNowTab (golden-hour moments)
│   └── → TourDetailView (push)
│
├── World's Most
│   ├── WorldsMostTab (superlatives gallery)
│   └── → TourDetailView (push)
│
└── Six Degrees
    ├── SixDegreesTab (inline chain timeline, "Show Me Another")
    └── Tour photos link to favorites (heart overlay)

Settings: gear icon in each tab's nav bar → modal sheet with Done button
  ├── Favorites → FavoritesListView → TourDetailView
  └── About → AboutView
```

**Why 4 tabs, not 3 + Explore**: Each feature deserves direct one-tap access — matches the web's navigation. Settings is minimal and doesn't warrant a tab; it opens as a sheet from any tab's gear icon.

---

## Sharing

Every shareable unit links to the **website** (not a deep link into the app):

| Content | Share URL |
|---------|-----------|
| Tour | `https://tourgraph.ai/roulette/{id}` |
| Superlative | `https://tourgraph.ai/worlds-most/{slug}` |
| Chain | `https://tourgraph.ai/six-degrees/{slug}` |
| Right Now | `https://tourgraph.ai/right-now` |

**Why website URLs, not deep links**: Recipients may not have the app. Website works for everyone. OG previews already generate beautiful cards. App Store link can appear on the web page ("Get the app").

**Share card rendering**: Use SwiftUI `ImageRenderer` (like GitaVani) to generate a branded image for share sheets. The image + URL go into `UIActivityViewController`.

---

## Image Loading

Tour photos from Viator CDN (public URLs, no auth). Strategy:

1. **AsyncImage** for simple cases (SwiftUI built-in)
2. **NSCache (in-memory)** for current roulette hand (~20 images)
3. **URLCache (disk)** for recently viewed tours
4. **No third-party library** (Kingfisher, SDWebImage not needed — AsyncImage + URLCache is sufficient for our use case)

---

## Offline Behavior

| Scenario | Behavior |
|----------|----------|
| No internet, first launch | All features work (seed DB). Photos show placeholders. Detail pages show truncated descriptions. |
| No internet, some tours enriched | Enriched tours show full data. Unenriched tours show seed data. No errors. |
| Airplane mode | Fully functional except photo loading and enrichment. |
| Spotty connection | Photos load progressively. Enrichment fails silently, retries on next view. |

The app should **never** show a "no connection" error screen. Data is always local. Only photos need network.

---

## Build & Distribution

- **Xcode project**: Standard SwiftUI app, no SPM workspace complexity
- **Dependencies**: GRDB.swift (SQLite, via SPM), nothing else
- **Minimum target**: iOS 17.0
- **Devices**: iPhone only (iPad layout is a V2 enhancement)
- **App Store**: Free, no in-app purchases
- **Size**: ~150MB download (120MB seed DB + ~30MB app binary)
- **Category**: Travel (with "Entertainment" as secondary)
- **Privacy**: No data collected. App Privacy label = "Data Not Collected."

---

## Seed DB Build Script

Concrete steps to build the seed DB from the production database. Run before each App Store submission.

```bash
# 1. Copy production DB (never modify the original)
cp data/tourgraph.db data/tourgraph-seed.db

# 2. Drop unused tables (app never queries these)
#    NOTE: Keep destinations — needed for World Map feature (3,380 pins with lat/lng)
sqlite3 data/tourgraph-seed.db "
  DROP TABLE IF EXISTS city_readings;
  DROP TABLE IF EXISTS city_profiles;
  DROP TABLE IF EXISTS superlatives;
  DROP TABLE IF EXISTS indexer_state;
"

# 3. Truncate descriptions to ~200 chars at word boundary + "..."
#    (Pure SQL word-boundary truncation is awkward — use a small Node script
#    or this SQLite approximation that finds last space before char 200)
sqlite3 data/tourgraph-seed.db "
  UPDATE tours SET description =
    SUBSTR(description, 1,
      MAX(
        INSTR(SUBSTR(REVERSE(SUBSTR(description, 1, 200)), 1, 200), ' '),
        200 - INSTR(SUBSTR(description, 1, 200), SUBSTR(description, 200, 1))
      )
    ) || '...'
  WHERE description IS NOT NULL AND LENGTH(description) > 200;
"
#    Note: If pure-SQL truncation is unreliable, write a 10-line Node script:
#      rows.forEach(r => { let i = r.description.lastIndexOf(' ', 200); ... })
#    Either way: verify with SELECT SUBSTR(description,1,50), LENGTH(description) FROM tours LIMIT 20;

# 4. NULL out expensive columns the app never displays
sqlite3 data/tourgraph-seed.db "
  UPDATE tours SET
    image_urls_json = NULL,
    inclusions_json = NULL,
    supplier_name = NULL;
"

# 5. NULL out columns not needed for app display
#    NOTE: Keep latitude/longitude — needed for World Map feature
sqlite3 data/tourgraph-seed.db "
  UPDATE tours SET
    tags_json = NULL,
    summary_hash = NULL,
    indexed_at = NULL,
    last_seen_at = NULL;
"

# 6. Delete inactive tours (47 rows, filtered by WHERE status='active' anyway)
sqlite3 data/tourgraph-seed.db "DELETE FROM tours WHERE status != 'active';"

# 7. Drop redundant indexes (never queried by app)
sqlite3 data/tourgraph-seed.db "
  DROP INDEX IF EXISTS idx_tours_indexed;
  DROP INDEX IF EXISTS idx_tours_product_code;
"

# 8. Reclaim space
sqlite3 data/tourgraph-seed.db "VACUUM;"

# 9. Verify
echo "=== Seed DB size ==="
ls -lh data/tourgraph-seed.db
echo "=== Row counts ==="
sqlite3 data/tourgraph-seed.db "
  SELECT 'tours' as tbl, COUNT(*) FROM tours;
  SELECT 'chains' as tbl, COUNT(*) FROM six_degrees_chains;
"
echo "=== Sample truncated description ==="
sqlite3 data/tourgraph-seed.db "SELECT id, LENGTH(description), SUBSTR(description,1,80) FROM tours WHERE description IS NOT NULL LIMIT 5;"

# 10. Copy to iOS bundle
cp data/tourgraph-seed.db ios/TourGraph/TourGraph/TourGraph/Resources/tourgraph.db
```

**Actual result:** 120MB seed DB (down from 479MB). All 4 features fully functional. Detail pages show truncated descriptions and single cover photos. Per-tour enrichment restores full data on demand.

---

## What This Doc Does NOT Cover (V2)

- Push notifications (daily superlative) — requires APNs setup
- Home screen widget implementation details — requires WidgetKit timeline provider
- iPad layout
- App Store screenshots and metadata
- Analytics / crash reporting
- Universal links (deep linking from website to app)
- On-demand chain generation (user types two cities)
- Data refresh / delta sync (new tours, updated one-liners, new chains from re-indexing)
- Favorites sync across devices (iCloud)

---

## Implementation Order

| Step | What | Status |
|------|------|--------|
| 1 | Xcode project + GRDB + seed DB + DatabaseService | Done |
| 2 | Tour model + RouletteState + RouletteView (swipe UI) | Done |
| 3 | TourDetailView + sharing + image gallery | Done |
| 4 | RightNowSection + TimezoneHelper (golden hour) | Done |
| 5 | WorldsMostSection + superlative stat highlights | Done |
| 6 | SixDegreesSection + inline chain timeline + "Show Me Another" | Done |
| 7 | 4-tab layout (each feature its own tab) + Settings as sheet | Done |
| 8 | Favorites + App Icon | Done |
| 8b | Build seed DB (120MB from 479MB) | Done |
| 8c | TourEnrichmentService + server API endpoints | Done |
| 8d | Six Degrees polish (images, cards, colors, favorites) | Done |
| 8e | FavoritesListView + AboutView + Settings wiring | Done |
| 9 | Simulator + device testing | Done |
| 10 | iOS polish (share cards, launch screen) | Done |
| 11 | App Store assets + submission | **Submitted** March 3, 2026 |

---

## Key Files to Reference

| What | Where |
|------|-------|
| SQLite schema + all queries | `web/src/lib/db.ts` |
| TypeScript types → Swift models | `web/src/lib/types.ts` |
| Roulette hand algorithm | `web/src/lib/db.ts:getRouletteHand()` |
| Timezone / golden hour logic | `web/src/lib/timezone.ts` |
| Superlative queries | `web/src/lib/db.ts:SUPERLATIVE_QUERIES` |
| Chain data structure | `web/src/lib/db.ts:getChainBySlug()` |
| Weight categories + quotas | `web/src/lib/db.ts:CATEGORY_QUOTAS` |
| GitaVani app structure | `~/src/gh/gitavani/ios/GitaVani/` |
| ClearNews API client pattern | `~/src/gh/news-aggregator/ios/ClearNews/` |
| Product brief (iOS section) | `docs/product_brief.md` |
| UX design (interaction patterns) | `docs/ux_design.md` |
