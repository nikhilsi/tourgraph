# TourGraph iOS App

SwiftUI app that surfaces delightful, surprising tours from a bundled SQLite database. No API keys, no backend, no accounts.

## Requirements

- Xcode 15+ (Swift 5.9+)
- iOS 17.0+ deployment target
- macOS for development (Xcode only)

## Setup

1. Open `ios/TourGraph/TourGraph.xcodeproj` in Xcode
2. Copy the database into the Resources directory:
   ```bash
   cp data/tourgraph.db ios/TourGraph/TourGraph/TourGraph/Resources/tourgraph.db
   ```
3. Build and run on Simulator or device (Cmd+R)

The app has one dependency — [GRDB.swift](https://github.com/groue/GRDB.swift) — added via Swift Package Manager. Xcode resolves it automatically on first open.

## Architecture

```
SwiftUI Views → @Observable State → DatabaseService (GRDB) → SQLite (read + write for enrichment)
                                   → TourEnrichmentService → tourgraph.ai API (per-tour detail data)
                                   → Viator CDN (photos only, no auth)
```

All tour data comes from a bundled 120MB SQLite database. All four features work offline. Per-tour enrichment fetches full descriptions and photo galleries from the server when users tap into detail views, writing back to the local DB. No API keys anywhere in the binary.

## Project Structure

```
TourGraph/
├── TourGraphApp.swift              # @main entry, database init, loading screen
├── ContentView.swift               # 4-tab TabView container
│
├── Models/
│   ├── Tour.swift                  # Core tour model (maps to tours table)
│   ├── Destination.swift           # Location with timezone (dead code — no queries use it)
│   ├── Chain.swift                 # Six Degrees chain + links
│   └── Superlative.swift           # Superlative type enum + display config
│
├── Services/
│   ├── DatabaseService.swift       # GRDB connection, all SQL queries + enrichment writes
│   ├── TourEnrichmentService.swift # Per-tour lazy enrichment from server
│   └── TimezoneHelper.swift        # Golden hour detection, timezone math
│
├── State/
│   ├── RouletteState.swift         # Hand algorithm, contrast sequencing, prefetch
│   ├── AppSettings.swift           # Haptics toggle → UserDefaults
│   └── Favorites.swift             # Saved tour IDs → UserDefaults
│
├── Views/
│   ├── Roulette/RouletteView.swift       # Swipe cards, rotation effect, haptics
│   ├── RightNow/RightNowView.swift       # Golden-hour tours by timezone
│   ├── WorldsMost/WorldsMostView.swift   # Superlative cards with stat highlights
│   ├── SixDegrees/
│   │   └── SixDegreesView.swift          # Chain roulette with inline timeline
│   ├── Detail/TourDetailView.swift       # Full tour info, image gallery, Viator link
│   ├── Settings/
│   │   ├── SettingsView.swift              # Preferences, stats, legal
│   │   ├── FavoritesListView.swift         # Saved tours list with navigation
│   │   └── AboutView.swift                 # App info, features, stats, links
│   └── Shared/
│       ├── TourCardView.swift            # Photo-dominant card with favorite heart
│       └── StatBadge.swift               # Rating/price/duration pill
│
├── Assets.xcassets/                # App icon, logo, accent color
└── Resources/
    └── tourgraph.db                # Bundled SQLite database (gitignored)
```

## Features

| Tab | Feature | Description |
|-----|---------|-------------|
| 1 | Tour Roulette | Swipe cards with weighted random selection. Haptic feedback. |
| 2 | Right Now | Tours in golden-hour timezones (sunrise/sunset). |
| 3 | World's Most | Six superlatives: most expensive, cheapest 5-star, longest, etc. |
| 4 | Six Degrees | City-to-city chains connected through thematic tour links. |

Settings is accessible via the gear icon in each tab's navigation bar.

## Key Design Decisions

- **GRDB, not SwiftData** — We read a pre-built database, not one the app creates. SwiftData fights you on "read a DB we didn't create."
- **@Observable, not ObservableObject** — Swift 5.9+ pattern. Simpler, no Combine dependency.
- **No API keys** — One-liners pre-generated, tour data pre-indexed, photos load from public CDN URLs.
- **iOS 17+ minimum** — Required for @Observable. Covers ~95% of active iPhones as of early 2026.
- **UserDefaults for persistence** — Favorites and settings. No cloud sync (intentional: zero friction, no accounts).

## Updating the Database

When new tours are indexed on the web side:

```bash
# 1. Run indexer + backfill one-liners (web side)
npx tsx src/scripts/1-viator/indexer.ts --full
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts

# 2. Copy updated DB to iOS resources
cp data/tourgraph.db ios/TourGraph/TourGraph/TourGraph/Resources/tourgraph.db

# 3. Rebuild app
```

## Related Docs

- [iOS Architecture](../docs/implementation/ios-architecture.md) — Full design document with seed DB strategy, per-tour enrichment, column analysis, GRDB safety
- [Product Brief](../docs/product_brief.md) — Product vision and four pillars
- [Data Schema](../docs/data-schema.md) — SQLite schema reference
