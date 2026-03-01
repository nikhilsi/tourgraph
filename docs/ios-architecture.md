# TourGraph iOS App — Architecture

---
**Last Updated**: March 1, 2026
**Status**: Design complete, implementation not started
**Reference apps**: GitaVani (all-local pattern), ClearNews (API + caching pattern)
---

## One-Line Summary

A self-contained SwiftUI app that reads from a bundled SQLite database — no API keys, no backend, no accounts. Ship a ~150MB seed DB under Apple's cellular download limit, silently enrich with the full ~400MB dataset on first launch.

---

## Architecture

```
App Store (~180MB total)
  └── Seed SQLite DB (~150MB, ~50K tours, all features work)

First Launch:
  App → tourgraph.ai/data/tourgraph-full.db.gz → decompress → replace seed DB
  (background, non-blocking, all features work during download)

Runtime:
  SwiftUI Views → Services (@Observable) → SQLite (GRDB.swift, read-only)
                                          → Viator CDN (photos only)
                                          → No API keys anywhere
```

---

## Data Strategy: Seed + Enrich

### Seed DB (~150MB, bundled in app binary)

Ships with the app. All four features work instantly on first open.

| What's included | Why |
|-----------------|-----|
| All tour rows (core columns: id, title, one_liner, destination, country, continent, rating, review_count, from_price, duration_minutes, image_url, viator_url, weight_category) | Roulette, Right Now, World's Most all work |
| All destinations + timezones | Right Now timezone queries work |
| All Six Degrees chains | Six Degrees gallery + detail works |
| All one-liners | Every tour card has its witty caption |
| All superlative-eligible data (price, rating, duration, review_count) | World's Most queries work |

**What's excluded from seed** (saves ~250MB):
- Extended descriptions, highlights[], inclusions[]
- Additional image URLs (seed keeps 1 per tour, full DB has up to 31)
- Supplier details, meeting points, itineraries
- Any tours added after the app was submitted

### Enrichment DB (~400MB, downloaded on first launch)

Replaces the seed DB silently in background. User never waits.

```
First open → all features work instantly (seed DB)
Background → download full DB (~250MB gzipped) from tourgraph.ai
           → decompress → swap atomically → done
           → detail pages now show full descriptions, more photos, etc.
```

**Hosting**: Static file on the DigitalOcean droplet. Nginx serves it.
**Update cadence**: New DB version whenever we re-index. App checks a version endpoint on launch.
**Fallback**: If download fails, seed DB works indefinitely. Retry next launch.

### DB Versioning

```
GET https://tourgraph.ai/api/ios/db-version
→ { "version": "2026-03-15", "url": "https://tourgraph.ai/data/tourgraph-ios.db.gz", "size_bytes": 268435456 }
```

App stores current DB version in UserDefaults. On launch, checks version endpoint. If newer, downloads in background. No forced updates.

---

## Design Decisions

### D1: SQLite library — GRDB.swift (not raw C API, not Core Data, not SwiftData)

**Decision**: Use [GRDB.swift](https://github.com/groue/GRDB.swift) for SQLite access.

**Why not SwiftData**: SwiftData is an ORM that manages its own schema. We have a pre-built DB with a fixed schema from the web app's indexer. SwiftData would require schema migration, model generation, and fights us on "read a DB we didn't create." GRDB reads arbitrary SQLite databases natively.

**Why not raw SQLite C API**: Too low-level. GRDB provides type-safe row mapping, query building, and thread safety without the boilerplate.

**Why not Core Data**: Same ORM mismatch as SwiftData. Designed for apps that own their data, not apps that read pre-built databases.

### D2: No API keys in the app

**Decision**: Zero API keys shipped in the binary. No Viator key, no Claude key.

**Why**: One-liners are pre-generated in the DB. Tour data is pre-indexed. Photos load from Viator's public CDN URLs (no auth needed). The only network calls are: (1) photo loading, (2) DB enrichment download, (3) version check. All unauthenticated.

**Implication**: No API rate limiting concerns, no key rotation, no secrets management, no risk of key extraction from the binary.

### D3: @Observable pattern (matching GitaVani + ClearNews)

**Decision**: Use Swift 5.9+ `@Observable` macro for all shared state. No Combine, no ObservableObject.

**Why**: Both existing apps use this pattern successfully. Simpler than `@StateObject` + `@EnvironmentObject`. Views automatically react to property changes.

### D4: Swipe-based roulette (not button-based like web)

**Decision**: Tour Roulette uses horizontal swipe gestures (Tinder-style) instead of a "Show Me Another" button.

**Why**: Native gesture on iOS. More tactile, more fun. Haptic feedback on swipe adds physicality. The button works on web where swipe isn't natural.

**Fallback**: Button still exists for accessibility. Swipe is the primary interaction.

### D5: Seed DB size target — ~150MB

**Decision**: Keep seed DB under 150MB so total app binary stays under ~200MB (Apple's cellular download limit).

**Why**: TourGraph is a "casual delight" app discovered via shared links. If someone taps a link and the App Store says "requires WiFi to download," we lose them. Under 200MB = instant cellular download = zero friction (Pillar 1).

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
│   ├── TourGraphApp.swift              # @main entry, initializes services
│   ├── ContentView.swift               # Root TabView
│   │
│   ├── Models/
│   │   ├── Tour.swift                  # Core tour model (maps to tours table)
│   │   ├── Destination.swift           # Destination with timezone
│   │   ├── Chain.swift                 # Six Degrees chain + links
│   │   ├── Superlative.swift           # Superlative type + config
│   │   └── WeightCategory.swift        # Weight category enum
│   │
│   ├── Services/
│   │   ├── DatabaseService.swift       # GRDB connection, all queries
│   │   ├── RouletteService.swift       # Hand algorithm, contrast sequencing
│   │   ├── RightNowService.swift       # Timezone math, golden hour detection
│   │   ├── SuperlativeService.swift    # Superlative queries (6 types)
│   │   ├── ChainService.swift          # Six Degrees chain queries
│   │   ├── ImageCache.swift            # NSCache + disk cache for tour photos
│   │   └── DBEnrichmentService.swift   # Background DB download + swap
│   │
│   ├── State/
│   │   ├── AppSettings.swift           # Theme, haptics toggle → UserDefaults
│   │   ├── Favorites.swift             # Saved tour IDs → UserDefaults
│   │   └── RecentSpins.swift           # Last N tour IDs → UserDefaults
│   │
│   ├── Views/
│   │   ├── Roulette/
│   │   │   ├── RouletteView.swift      # Swipe-based card stack
│   │   │   ├── TourCardView.swift      # Photo-dominant card (matches web)
│   │   │   └── SwipeGesture.swift      # Custom swipe + haptic feedback
│   │   │
│   │   ├── RightNow/
│   │   │   ├── RightNowView.swift      # Golden-hour moments grid
│   │   │   └── MomentCardView.swift    # City + time + tour card
│   │   │
│   │   ├── WorldsMost/
│   │   │   ├── WorldsMostView.swift    # Superlatives gallery
│   │   │   └── SuperlativeCardView.swift
│   │   │
│   │   ├── SixDegrees/
│   │   │   ├── SixDegreesView.swift    # Chain gallery
│   │   │   ├── ChainDetailView.swift   # Vertical timeline (matches web)
│   │   │   └── ChainCardView.swift     # City pair + summary card
│   │   │
│   │   ├── Detail/
│   │   │   └── TourDetailView.swift    # Full tour info + Viator link
│   │   │
│   │   └── Shared/
│   │       ├── ShareCardView.swift     # Rendered to image for sharing
│   │       ├── SkeletonView.swift      # Loading placeholders
│   │       └── StatBadge.swift         # Rating, price, duration pills
│   │
│   ├── Widgets/
│   │   └── RightNowWidget/
│   │       ├── RightNowWidget.swift    # Home screen widget
│   │       └── RightNowEntry.swift     # Timeline entry
│   │
│   └── Resources/
│       └── tourgraph-seed.db           # Bundled seed database (~150MB)
│
├── TourGraphTests/
└── TourGraphWidgetExtension/
```

---

## Data Models (Swift)

These map directly to the web app's SQLite schema.

### Tour (primary model)

```swift
struct Tour: Identifiable, Codable, FetchableRecord {
    let id: Int
    let productCode: String
    let title: String
    let oneLiner: String?
    let description: String?         // enrichment data
    let destinationId: String
    let destinationName: String
    let country: String?
    let continent: String?
    let timezone: String?
    let rating: Double?
    let reviewCount: Int
    let fromPrice: Double?
    let currency: String
    let durationMinutes: Int?
    let imageUrl: String?
    let imageUrls: String?           // JSON array, enrichment data
    let highlights: String?          // JSON array, enrichment data
    let inclusions: String?          // JSON array, enrichment data
    let viatorUrl: String?
    let weightCategory: String?
}
```

### Destination

```swift
struct Destination: Identifiable, Codable, FetchableRecord {
    let id: String
    let name: String
    let parentId: String?
    let timezone: String?
    let latitude: Double?
    let longitude: Double?
    let lookupId: String?
}
```

### Chain (Six Degrees)

```swift
struct Chain: Identifiable, Codable, FetchableRecord {
    let id: Int
    let cityA: String
    let cityB: String
    let slug: String
    let summary: String?
    let links: String               // JSON array of ChainLink
    let createdAt: String
}

struct ChainLink: Codable {
    let city: String
    let tourTitle: String
    let tourId: Int?
    let theme: String
    let connection: String
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

    // DB management
    func replaceDatabase(with url: URL) throws  // atomic swap for enrichment
}
```

### RouletteService

Mirrors the web's hand algorithm: weighted random selection with category quotas and contrast sequencing (no same category or continent back-to-back).

```swift
@Observable
final class RouletteService {
    var currentTour: Tour?
    var hand: [Tour] = []
    private var handIndex = 0
    private var seenIds: Set<Int> = []

    func spin()           // next tour from hand, refetch when exhausted
    func prefetchHand()   // load next batch in background
}
```

### DBEnrichmentService

Downloads full DB on first launch, swaps atomically.

```swift
@Observable
final class DBEnrichmentService {
    var status: EnrichmentStatus = .idle  // .idle, .downloading(progress), .complete, .failed

    func checkAndEnrich()  // called on app launch
    // 1. Check version endpoint
    // 2. If newer, download gzipped DB to temp file
    // 3. Decompress
    // 4. Validate (check tour count > seed count)
    // 5. Atomic swap: close DB → move file → reopen
    // 6. Update stored version in UserDefaults
}
```

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

- Gallery of pre-computed chains (same as web)
- Detail: vertical timeline matching web's stepper design
- "Surprise Me" button picks random chain

---

## Navigation

```
TabView (3 tabs)
├── Roulette (default tab)
│   ├── RouletteView (swipe cards)
│   └── → TourDetailView (push)
│
├── Explore
│   ├── Right Now section
│   │   └── → TourDetailView (push)
│   ├── World's Most section
│   │   └── → TourDetailView (push)
│   └── Six Degrees section
│       └── → ChainDetailView (push)
│           └── → TourDetailView (push)
│
└── Settings
    ├── Haptics toggle
    ├── About / Story
    └── App version + DB version
```

**Why 3 tabs not 4**: Roulette is the core loop (its own tab). The other three discovery features group naturally into "Explore." Settings is minimal.

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
| No internet, first launch | All features work (seed DB). Photos show placeholders. |
| No internet, enriched | All features work. Cached photos show, uncached show placeholders. |
| Airplane mode | Fully functional except photo loading. |
| Spotty connection | Photos load progressively. No spinners or error states for data. |

The app should **never** show a "no connection" error screen. Data is always local. Only photos need network.

---

## Build & Distribution

- **Xcode project**: Standard SwiftUI app, no SPM workspace complexity
- **Dependencies**: GRDB.swift (SQLite, via SPM), nothing else
- **Minimum target**: iOS 17.0
- **Devices**: iPhone only (iPad layout is a V2 enhancement)
- **App Store**: Free, no in-app purchases
- **Size**: ~180MB download (150MB seed DB + 30MB app binary)
- **Category**: Travel (with "Entertainment" as secondary)
- **Privacy**: No data collected. App Privacy label = "Data Not Collected."

---

## DB Build Pipeline (for App Releases)

When preparing a new app version:

```bash
# 1. Ensure indexer has completed and one-liners are backfilled
# 2. Build seed DB (strip enrichment columns to reduce size)
sqlite3 data/tourgraph.db ".dump tours" | grep -v "description\|highlights\|inclusions\|image_urls" > seed.sql
# (actual script TBD — may be simpler to just copy full DB and VACUUM)

# 3. Or: just ship the full DB if it's under 200MB after VACUUM
sqlite3 data/tourgraph.db "VACUUM;"
ls -lh data/tourgraph.db  # check size

# 4. Copy to Xcode project resources
cp data/tourgraph.db ios/TourGraph/TourGraph/Resources/tourgraph-seed.db

# 5. Build full DB for enrichment endpoint
gzip -k data/tourgraph.db
scp data/tourgraph.db.gz root@143.244.186.165:/opt/app/public/data/
```

If the full DB after VACUUM is under ~180MB, skip the seed/enrich split entirely and just bundle the full DB. Simpler is better.

---

## What This Doc Does NOT Cover (V2)

- Push notifications (daily superlative) — requires APNs setup
- Home screen widget implementation details — requires WidgetKit timeline provider
- iPad layout
- App Store screenshots and metadata
- Analytics / crash reporting
- Universal links (deep linking from website to app)
- On-demand chain generation (user types two cities)
- Favorites sync across devices (iCloud)

---

## Implementation Order

| Step | What | Estimated Effort |
|------|------|-----------------|
| 1 | Xcode project + GRDB + seed DB + DatabaseService | Half day |
| 2 | Tour model + RouletteService + RouletteView (swipe UI) | 1 day |
| 3 | TourDetailView + sharing + image loading | Half day |
| 4 | RightNowService + RightNowView (timezone math port) | Half day |
| 5 | SuperlativeService + WorldsMostView | Half day |
| 6 | ChainService + SixDegreesView + ChainDetailView | Half day |
| 7 | Explore tab (combine features 2-4) | Quarter day |
| 8 | Settings, about, polish, haptics | Quarter day |
| 9 | DBEnrichmentService (background download) | Half day |
| 10 | App Store assets + submission | Half day |

**Total: ~5 days** (matches the product brief's Week 4-5 estimate)

---

## Key Files to Reference

| What | Where |
|------|-------|
| SQLite schema + all queries | `src/lib/db.ts` |
| TypeScript types → Swift models | `src/lib/types.ts` |
| Roulette hand algorithm | `src/lib/db.ts:getRouletteHand()` |
| Timezone / golden hour logic | `src/lib/timezone.ts` |
| Superlative queries | `src/lib/db.ts:SUPERLATIVE_QUERIES` |
| Chain data structure | `src/lib/db.ts:getChainBySlug()` |
| Weight categories + quotas | `src/lib/db.ts:CATEGORY_QUOTAS` |
| GitaVani app structure | `~/src/gh/gitavani/ios/GitaVani/` |
| ClearNews API client pattern | `~/src/gh/news-aggregator/ios/ClearNews/` |
| Product brief (iOS section) | `docs/product_brief.md` |
| UX design (interaction patterns) | `docs/ux_design.md` |
