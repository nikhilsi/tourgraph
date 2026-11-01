# Current State

---
**Last Updated**: November 1, 2026
**Purpose**: Quick onboarding for new sessions — what's built and how it fits together
---

## Live at https://tourgraph.ai

All four features live. Since November 1, 2026 the site and the API run as one Cloudflare Worker (`tourgraph`) with the data in Cloudflare D1, on the OmSpark Cloudflare account, covered by the Workers Paid plan already in place. Before that: a $6/month DigitalOcean droplet with nginx and PM2 (retired; see "Deployment"). 136,256 active tours across 2,712 destinations, 100% AI one-liner coverage. The data has not been refreshed since March 2026, and no refresh is planned.

### Moved to Cloudflare: 2026-11-01

Straight move: same pages, URLs, API paths and JSON. The Express API was ported to Hono inside the Worker; Next.js (16.4.3) is built with OpenNext; pages call the API in-process. Pages that took 13 to 21 s on the droplet (no planner statistics, full scans of a 454 MB table on 1 GB of RAM) now render in well under a second. Checked before the switch: 55 unit tests, 177/177 API comparisons against the droplet, 39 live checks, a browser walk at desktop and phone size, and 1,600 requests of load testing. Small fixes on the way: the site-wide canonical tag, the Six Degrees share link, Right Now time zones with a `+`, and D1-specific trivia race fixes. Google Analytics counts visits since Nov 1, 2026 (it was blocked by the site's own CSP from June until then); the privacy page says so. Design: `docs/cloudflare-architecture.md`. Operations: `docs/deploy-runbook.md`. Reviews: `docs/reviews/`.

### Infrastructure review: 2026-04-24

Production environment file on the deployment host was audited and hardened. Build-time API keys (Viator, Anthropic) are no longer present at runtime on the server; those credentials remain in local-only storage for occasional ingestion-script runs. The live Express API and Next.js front-end read only from the pre-built SQLite database, so this change has zero effect on what visitors see. Re-running the data ingestion scripts will require restoring the keys locally for that session. Runtime behavior and API contracts are unchanged.

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
Internet → Cloudflare (TLS, Always Use HTTPS)
             └── Worker "tourgraph" (custom domains tourgraph.ai, www.tourgraph.ai)
                   ├── www.*                → 301 to https://tourgraph.ai
                   ├── /api/v1/*, /api/ios/* → API (Hono) ──→ D1 "tourgraph-db"
                   ├── static files          → Cloudflare asset store (public/_headers)
                   └── everything else       → Next.js (OpenNext) ── in-process ──→ API
```

- **Hosting:** Cloudflare Workers, OmSpark account, Workers Paid. No servers, no secrets in the Worker.
- **Database:** D1 `tourgraph-db` (493 MB): `tours`, `six_degrees_chains`, `trivia_pool`, `trivia_daily`, `trivia_scores`. `data/tourgraph.db` (Git LFS) stays the source of truth; `web/scripts/d1-load.mjs` loads and fingerprints it.
- **Deploy:** `cd web && node scripts/deploy.mjs` (tests, clean build, secret scan, wrangler deploy), then `node scripts/verify.mjs`. Token: `~/.secrets/cloudflare/tourgraph.env`. Never the Mac's default wrangler login.
- **Logs:** `npx wrangler tail tourgraph`, or Workers Logs in the dashboard. Traffic per day: Workers & Pages > tourgraph > Metrics.
- **Rollback:** `npx wrangler rollback`; D1 Time Travel for data. Full runbook: `docs/deploy-runbook.md`.
- **The droplet** (143.244.186.165) no longer receives traffic. It stays up until Nikhil deletes it; `backend/` and `deployment/` go with it.

### Architecture

`web/` is the whole Cloudflare Worker; `data/` holds the pipeline and the source database. (`backend/`, the droplet-era Express API, is kept until the droplet is deleted.)

```
web/                                  # Cloudflare Worker: Next.js site + API
├── worker.ts                         # Worker entry: hands requests to src/server/route.ts
├── wrangler.jsonc                    # Worker config: custom domains, D1, rate limiter, assets
├── migrations/                       # D1 schema (0001 tables + indexes, 0002 descending indexes)
├── scripts/                          # deploy, d1-load, verify, contract-diff, loadtest, walk/
├── test/                             # 55 API + routing tests in the Workers runtime
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
│   ├── server/
│   │   ├── route.ts                  # www/http redirects, API vs pages
│   │   └── api/                      # Hono API on D1: app.ts, env.ts, routes/ (roulette, tours,
│   │                                 #   right-now, superlatives, chains, trivia, health)
│   └── lib/
│       ├── api.ts                    # Typed client: calls the API in-process
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

- **One Cloudflare Worker**: Hono API plus Next.js via OpenNext, same API contract as the old Express server, camelCase responses
- **SQLite everywhere**: D1 in production (493 MB, indexes plus planner statistics), the Git LFS file as source of truth
- **Viator Basic tier** — free affiliate API, 300K+ experiences, 16 req/10s per endpoint
- **Claude Haiku 4.5** — fast/cheap one-liners during indexing (~$0.003/1000 tours)
- **Claude Sonnet 4.6** — City intelligence (Stage 0) + chain generation (Stages 1+2)
- **Next.js 16 App Router**: server components for SEO, client for interactivity; pages call the API in-process
- **`Intl.DateTimeFormat`** — timezone math with no external library
- **Dark theme** — photos pop, feels premium

### Build Status

- `cd web && npm test`: 55 tests pass
- `cd web && node scripts/deploy.mjs --dry-run`: clean build, secret scan passes
- `cd web && npm run lint`: zero errors (one existing unused-import warning)
- TypeScript strict mode: clean

---

## Archived Phase 0

AI extraction pipeline for tour operators — thesis invalidated Feb 2026. All work in `archive/`. See `docs/reference/thesis_validation.md` for why.
