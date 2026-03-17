# Current State

---
**Last Updated**: March 17, 2026
**Purpose**: Quick onboarding for new sessions — what's built and how it fits together
---

## Live at https://tourgraph.ai

All four features built and deployed. DigitalOcean droplet ($6/mo) running PM2 + Nginx + Let's Encrypt SSL. Standalone Express API backend + Next.js frontend. 136,256 tours across 2,712 destinations, all verified 200 over HTTPS. Data fully indexed with 100% AI one-liner coverage.

### Web Features (All Deployed)

| Feature | Route | Status |
|---------|-------|--------|
| Tour Roulette | `/`, `/roulette/[id]` | Live |
| Right Now Somewhere | `/right-now` | Live |
| The World's Most ___ | `/worlds-most`, `/worlds-most/[slug]` | Live |
| Six Degrees of Anywhere | `/six-degrees`, `/six-degrees/[slug]` | UI live, 491 chains, chain roulette gallery |
| About / Story | `/about`, `/story` | Live |
| Privacy / Support | `/privacy`, `/support` | Live |
| OG Images | `/api/og/*` | Live |
| Backend API | `/api/v1/health`, `/api/v1/roulette/hand`, `/api/v1/trivia/*`, etc. | Live (trivia pending deploy) |
| Health / SEO | `/robots.txt`, `/sitemap.xml` | Live |

### iOS App (v2 In Progress — Pivoting After Two 4.2.2 Rejections)

SwiftUI app with GRDB.swift reading from bundled SQLite database. v1.0 rejected March 5, v1.1 rejected March 11 — both Guideline 4.2.2 (Minimum Functionality). Pivoting to "travel awareness companion" for v2. See `docs/ios-v2-plan.md` for full plan and implementation progress.

| Feature | File(s) | Status |
|---------|---------|--------|
| Tour Roulette (swipe) | `RouletteView.swift`, `RouletteState.swift` | Built — swipe gesture, haptics, rotation effect |
| Right Now Somewhere | `RightNowView.swift`, `TimezoneHelper.swift` | Built — own tab, golden-hour detection |
| The World's Most ___ | `WorldsMostView.swift`, `Superlative.swift` | Built — own tab, stat highlights on cards |
| Six Degrees | `SixDegreesView.swift` | Built — own tab, chain roulette, timeline, theme badges |
| **World Map** | `WorldMapView.swift`, `MapPinView.swift`, `DestinationDetailSheet.swift` | **Built (v2)** — MapKit satellite globe, 2,694 destination pins, lazy viewport loading, explored tracking, milestone toasts |
| Tour Detail | `TourDetailView.swift` | Built — image gallery, highlights, Viator link |
| Favorites | `Favorites.swift`, `FavoritesListView.swift` | Built — UserDefaults persistence |
| Explored Destinations | `ExploredDestinations.swift` | **Built (v2)** — UserDefaults, green/orange pin states, milestone celebrations |
| Settings | `SettingsView.swift`, `AboutView.swift` | Built — haptics toggle, favorites list, about page |
| Widgets | `TourGraphWidgets/` | Built — 3 types (Right Now, Random Tour, Lock Screen) |
| Siri/Shortcuts | `Intents/` | Built — 3 intents, App Shortcuts provider |
| Spotlight | `SpotlightService.swift` | Built — favorited tours searchable |
| **Daily Trivia** | `TriviaTabView.swift`, `TriviaQuestionView.swift`, `TriviaResultsView.swift`, `TriviaState.swift`, `TriviaService.swift`, `TriviaModels.swift` | **Built (v2)** — Trivia tab, daily challenge (5Q), practice mode (format filter), streaks, Travel IQ, share results. API-driven. |
| **Travel Awareness** | `TravelAwarenessService.swift`, `CityVisit.swift`, `NearbyAlertsExplainer.swift`, `NotificationDelegate.swift` | **Built (v2)** — CLMonitor geofencing, nearest-20 rotation, city welcome notifications (6hr cooldown, 2/day cap), auto-map follow, progressive permissions (WIU → Always). |
| **Discover Tab** | `DiscoverView.swift` | **Built (v2)** — Combines Right Now + World's Most + Six Degrees with segmented picker. |
| **Profile Tab** | `ProfileView.swift` | **Built (v2)** — Travel IQ, streak, explored stats, travel journal, nearby alerts toggle, favorites, settings. |

**v2 progress:** Phase 1 (World Map + Daily Trivia) done. Phase 2 (Travel Awareness) done — CLMonitor geofencing, city welcome notifications, auto-map, progressive permissions, travel journal. Version 2.0. 5 tabs (Roulette, Discover, World Map, Trivia, Profile). Phase 3 (Polish + Resubmit) next. See `docs/ios-v2-plan.md`.
**Seed DB:** 123MB bundled. 136,256 tours with lat/lng, 2,694 destinations with lat/lng, 491 chains. DB versioning for seamless updates.
**Per-tour enrichment:** `TourEnrichmentService.swift` + server endpoints. Lazy fetch on detail tap.
**Bundle ID:** `com.nikhilsi.TourGraph`, App ID `6759991920`.

## Data Asset (5 IP Layers)

TourGraph's data is built in layers, each adding original intelligence. See `docs/data-snapshot.md` for full baseline stats.

| Layer | What | Count | Status |
|-------|------|-------|--------|
| 1. Raw Viator Data | Tour listings, photos, ratings, prices | 136,256 tours | **Complete** |
| 2. AI One-Liners | Witty personality captions per tour | 136,256 (100%) | **Complete** |
| 3. City Intelligence | City profiles: personality, standout tours, themes | 910 cities (1,799 readings) | **Complete** |
| 4. Chain Connections | Thematic chains connecting cities | 491 chains | **Complete** |
| 5. Trivia Pool | Pre-generated questions across 7 formats | 1,235 questions | **Complete** |

- **479 MB** database, 2,712 leaf destinations, 205 countries, 7 continents
- Layer 3 design: `docs/city-intelligence.md` | Layer 4 design: `docs/six-degrees-chains.md`

### Android App (Built — Release Pipeline Complete)

Native Android port using Kotlin + Jetpack Compose. Full iOS feature parity. Built, compiled (zero errors/warnings), tested on Pixel 7 emulator. Signed release APK, CI/CD on tag push, F-Droid MR submitted.

| Feature | File(s) | Status |
|---------|---------|--------|
| Tour Roulette (swipe) | `RouletteScreen.kt`, `TourGraphViewModel.kt` | Built — swipe gesture, contrast sequencing, haptics |
| Right Now Somewhere | `RightNowScreen.kt`, `TimezoneHelper.kt` | Built — golden hour detection, timezone-aware |
| The World's Most ___ | `WorldsMostScreen.kt` | Built — 6 superlatives, random from top 10 |
| Six Degrees | `SixDegreesScreen.kt` | Built — timeline, tour photos, theme badges |
| Tour Detail | `TourDetailScreen.kt` | Built — image gallery, enrichment, highlights |
| Favorites | `Favorites.kt`, `FavoritesScreen.kt` | Built — SharedPreferences, list view |
| Settings | `SettingsScreen.kt`, `AboutScreen.kt` | Built — haptics toggle, about, favorites |
| Widgets | `RightNowWidget.kt`, `RandomTourWidget.kt` | Built — Glance (2 types) |
| Share | `ShareUtils.kt`, `ShareCardRenderer.kt` | Built — rich 1200x630 image cards (matches iOS), FileProvider |
| Deep Linking | `MainActivity.kt`, `AndroidManifest.xml` | Built — `tourgraph://` scheme, tab + tour routing |
| App Shortcuts | `shortcuts.xml` | Built — 3 static shortcuts (long-press icon), matches iOS Siri Shortcuts |
| Search Indexing | `SearchIndexer.kt` | Built — favorited tours as dynamic shortcuts, searchable from launcher |

| Component | Technology |
|-----------|-----------|
| Language | Kotlin 2.1 |
| UI | Jetpack Compose (Material 3) |
| Database | Raw SQLiteDatabase (SQL from iOS verbatim) |
| Images | Coil 3 |
| HTTP | OkHttp 4 (enrichment) |
| Widgets | Glance (Jetpack) |
| Build | Gradle 8.11.1 + AGP 8.9.1 |

**Debug APK:** 53MB (120MB DB compresses well)
**Plan:** `docs/implementation/android-app.md` | **CI/CD:** `.github/workflows/android-release.yml`
**Signing:** Release keystore generated, GitHub Actions secrets configured for automated builds.
**F-Droid:** [MR #34392](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/34392) submitted, pending review. Summary/description pulled from distribution/fastlane metadata (not YAML). AutoUpdateMode configured.

## Deployment

```
Internet → Nginx (:443 SSL, :80 → redirect)
              ├── /api/v1/*  → proxy to :3001 (Express backend)
              ├── /api/ios/* → rewrite to /api/v1/* → :3001 (mobile compat)
              └── /*         → proxy to :3000 (Next.js frontend)

           PM2 manages two processes:
              ├── tourgraph-web (:3000) — next start
              └── tourgraph-api (:3001) — node dist/index.js
                       ↓ read-only
                  /opt/app/data/tourgraph.db (SQLite, WAL mode)
```

- **Server:** DigitalOcean droplet (Ubuntu 24.04, $6/mo)
- **Stack:** Node 20 + PM2 6 + Nginx 1.24 + Let's Encrypt
- **SSL:** Valid through May 30, 2026, auto-renewal enabled
- **Firewall:** UFW (SSH + Nginx only) + fail2ban
- **Deploy code:** `ssh root@143.244.186.165 "bash /opt/app/deployment/scripts/deploy.sh"`
- **Deploy DB:** `bash deployment/scripts/deploy-db.sh $SERVER_IP`
- **Stream logs:** `bash deployment/scripts/stream-logs.sh $SERVER_IP`

### Architecture

Three independent directories with clear responsibilities:

```
backend/                              # Express + TypeScript API server
├── src/
│   ├── index.ts                      # App entry, mounts /api/v1 router
│   ├── db.ts                         # Read-only + read-write (trivia) SQLite connections
│   ├── types.ts                      # Shared types (RouletteTour, TourDetail, etc.)
│   ├── transform.ts                  # Row-to-API transforms (snake_case → camelCase)
│   └── routes/
│       ├── roulette.ts               # GET /roulette/hand (quota sampling, contrast sequencing, rate limiting)
│       ├── tours.ts                  # GET /tours/:id, /tours/:id/enrichment, /tours/:id/card, POST /tours/batch
│       ├── right-now.ts              # GET /right-now/tours, /right-now/timezones
│       ├── superlatives.ts           # GET /superlatives, /superlatives/:type
│       ├── chains.ts                 # GET /chains, /chains/random, /chains/:slug, /chains/slugs, /chains/count
│       ├── trivia.ts                 # GET /trivia/daily, /trivia/practice, /trivia/stats, /trivia/results; POST /trivia/answer, /trivia/score
│       └── health.ts                 # GET /health, /stats

web/                                  # Next.js frontend (pure API consumer)
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Homepage — Roulette + Right Now teaser + superlatives
│   │   ├── roulette/[id]/            # Tour detail page
│   │   ├── right-now/                # Right Now Somewhere page
│   │   ├── worlds-most/              # Superlatives gallery + detail
│   │   ├── six-degrees/              # Six Degrees chain roulette + detail
│   │   ├── about/, story/            # Static pages
│   │   └── api/og/                   # OG image generation (roulette, right-now, worlds-most, six-degrees)
│   ├── components/
│   │   ├── RouletteView.tsx          # Core game loop (client, fetches /api/v1/roulette/hand)
│   │   ├── TourCard.tsx              # Tour card display
│   │   ├── ChainTimeline.tsx         # Shared Six Degrees timeline
│   │   ├── ShareButton.tsx           # Web Share / clipboard
│   │   └── ...                       # Logo, FeatureNav, TourCardSkeleton
│   └── lib/
│       ├── api.ts                    # Typed fetch client for all backend endpoints
│       ├── superlatives.ts           # Superlative constants + formatters
│       ├── timezone.ts               # Timezone helpers (Intl.DateTimeFormat)
│       ├── format.ts                 # Shared formatting (price, duration)
│       └── types.ts                  # Frontend-only types

data/                                 # Pipeline scripts + shared library
├── scripts/
│   ├── 1-viator/                     # Viator API indexing (destinations, tours, dev data)
│   ├── 2-oneliners/                  # AI caption generation (Claude Haiku 4.5)
│   ├── 3-city-intel/                 # City intelligence (readings → profiles merge)
│   ├── 4-chains/                     # Six Degrees chain generation
│   ├── 5-trivia/                     # Trivia pool generation (SQL generators + Haiku fakes)
│   └── utils/                        # Database audit tools
├── lib/                              # Shared library (db.ts, viator.ts, claude.ts, etc.)
├── tourgraph.db                      # Production SQLite database (479MB, Git LFS)
└── tourgraph-seed.db                 # iOS seed database (123MB, Git LFS)
```

### Data

See "Data Asset (4 IP Layers)" section above and `docs/data-snapshot.md` for full baseline stats.

### Key Technical Choices

- **Express 5 + TypeScript backend** — standalone API server, read-only SQLite, camelCase responses
- **SQLite** (not Redis/Postgres) — single file, zero cold cache, deploys as-is. 136K tours at 479MB.
- **Viator Basic tier** — free affiliate API, 300K+ experiences, 16 req/10s per endpoint
- **Claude Haiku 4.5** — fast/cheap one-liners during indexing (~$0.003/1000 tours)
- **Claude Sonnet 4.6** — City intelligence (Stage 0) + chain generation (Stages 1+2)
- **Next.js 16 App Router** — server components for SEO, client for interactivity. Pure API consumer.
- **`Intl.DateTimeFormat`** — timezone math with no external library
- **Dark theme** — photos pop, feels premium

### Build Status

- `cd web && npm run build` — zero errors
- `cd backend && npm run build` — zero errors
- `cd web && npm run lint` — zero errors
- TypeScript strict mode — clean

---

## Archived Phase 0

AI extraction pipeline for tour operators — thesis invalidated Feb 2026. All work in `archive/`. See `docs/reference/thesis_validation.md` for why.
