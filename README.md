# TourGraph — The World's Tour Data, Made Delightful

A zero-friction site and mobile app that makes people smile using the world's tour data. Available on web, iOS, and Android. 136,000+ tours across 2,700+ destinations, AI-generated witty captions, and four ways to discover something surprising.

**Live at [tourgraph.ai](https://tourgraph.ai)**

## Features

- **Tour Roulette** — One button. Random tour. Weighted toward the extremes: highest rated, weirdest, cheapest, most expensive. AI-generated witty one-liner. Swipe or press again.
- **Right Now Somewhere...** — Time-zone-aware. Shows tours happening right now where it's golden hour. "Right now in Kyoto it's 6:47am and you could be doing forest bathing with a Buddhist monk."
- **The World's Most ___** — Superlatives from 136,000+ experiences. Most expensive tour. Cheapest 5-star. Longest duration. Each one a shareable card.
- **Six Degrees of Anywhere** — 491 pre-generated chains connecting cities through surprising thematic links. Chain roulette with vertical timeline.

Plus: favorites, home screen widgets, rich share cards, app shortcuts, search indexing, haptics, and deep linking.

## Design Philosophy

Every decision passes four tests:

1. **Zero Friction** — No signup, no login, no personal data. Delighted in 5 seconds.
2. **Instant Smile** — Warm, witty, wonder-filled. Never snarky or cynical.
3. **Effortlessly Shareable** — Every piece of content has a unique URL and beautiful preview card.
4. **Rabbit Hole Energy** — "One more click" through genuine curiosity, not dark patterns.

## Download

### Android
- **Direct APK**: Download from [GitHub Releases](https://github.com/nikhilsi/tourgraph/releases) — install directly on any Android 8.0+ device
- **F-Droid**: Coming soon

### iOS
- **App Store**: v1.1 submitted, pending review

### Web
- **[tourgraph.ai](https://tourgraph.ai)** — works on any device with a browser

## Tech Stack

| Platform | Technology |
|----------|-----------|
| Web | Next.js 16 (App Router, TypeScript strict), Tailwind CSS v4 |
| iOS | Swift / SwiftUI (iOS 17+), GRDB.swift, WidgetKit |
| Android | Kotlin 2.1 / Jetpack Compose (Material 3, min API 26) |
| Database | SQLite everywhere (better-sqlite3 on web, GRDB on iOS, raw SQLiteDatabase on Android) |
| Hosting | DigitalOcean ($6/mo droplet) |
| Data | Viator Partner API (136,000+ experiences, 2,700+ destinations) |
| AI | Claude API (Haiku 4.5 for captions, Sonnet 4.6 for city intelligence + chains) |
| Domain | [tourgraph.ai](https://tourgraph.ai) |

## Data Asset (4 Layers)

| Layer | What | Count |
|-------|------|-------|
| 1. Raw Viator Data | Tour listings, photos, ratings, prices | 136,256 tours |
| 2. AI One-Liners | Witty personality captions per tour | 136,256 (100%) |
| 3. City Intelligence | City profiles: personality, standout tours, themes | 910 cities |
| 4. Chain Connections | Thematic chains connecting cities | 491 chains |

## Project Structure

```
tourgraph/
├── .github/workflows/       # CI/CD (Android release on tag push)
├── src/                     # Next.js web app
│   ├── app/                 # Pages + API routes
│   ├── components/          # React components
│   ├── lib/                 # Database, types, formatting
│   └── scripts/             # Data pipeline (4 stages)
│       ├── 1-viator/        # Viator API indexing
│       ├── 2-oneliners/     # AI caption generation
│       ├── 3-city-intel/    # City intelligence pipeline
│       └── 4-chains/        # Six Degrees chain generation
├── ios/TourGraph/           # SwiftUI iOS app
├── android/TourGraph/       # Kotlin + Jetpack Compose Android app
├── fastlane/                # F-Droid metadata
├── docs/                    # Architecture, design, data docs
├── data/                    # SQLite databases (Git LFS)
└── archive/                 # Phase 0 work (preserved for reference)
```

## Getting Started

### Web App

```bash
node --version              # 18+ required
npm install
cp .env.example .env.local  # Add VIATOR_API_KEY + ANTHROPIC_API_KEY
npm run dev                 # http://localhost:3000
```

### iOS App

Open `ios/TourGraph/TourGraph.xcodeproj` in Xcode and run on simulator or device (iOS 17+).

### Android App

Open `android/TourGraph/` in Android Studio and run on emulator or device (API 26+).

```bash
# Build debug APK
cd android/TourGraph && ./gradlew assembleDebug

# Build signed release APK
cd android/TourGraph && ./gradlew assembleRelease
```

### Data Pipeline

```bash
# Full rebuild from scratch (see src/scripts/README.md for details)
npx tsx src/scripts/1-viator/seed-destinations.ts
npx tsx src/scripts/1-viator/indexer.ts
npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts
npx tsx src/scripts/3-city-intel/build-city-profiles.ts
npx tsx src/scripts/4-chains/generate-chains-v2.ts
```

## Background

TourGraph started as AI-powered supply-side infrastructure for the tours & experiences industry. After competitive validation revealed that Peek, TourRadar, Magpie, and Expedia had all shipped live MCP servers, the original thesis was killed and the project pivoted to this consumer experience. The Phase 0 extraction work is preserved in `archive/` for reference.

Full story: [docs/reference/thesis_validation.md](docs/reference/thesis_validation.md)

## License

MIT License. See [LICENSE](LICENSE) for details.
