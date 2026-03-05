# Current State

---
**Last Updated**: March 3, 2026
**Purpose**: Quick onboarding for new sessions — what's built and how it fits together
---

## Live at https://tourgraph.ai

All four features built and deployed. DigitalOcean droplet ($6/mo) running PM2 + Nginx + Let's Encrypt SSL. 136,256 tours across 2,712 destinations, 19 routes, all verified 200 over HTTPS. Data fully indexed with 100% AI one-liner coverage.

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
| Health / SEO | `/api/health`, `/robots.txt`, `/sitemap.xml` | Live |

### iOS App (Adding Native Features for Resubmission)

SwiftUI app with GRDB.swift reading from bundled SQLite database. 4-tab layout, all four features implemented. v1.0 rejected March 5, 2026 (Guideline 4.2.2 — Minimum Functionality). Adding widgets, Siri, notifications, and Spotlight to differentiate from web. See `docs/implementation/app-store-resubmission.md` for full plan.

| Feature | File(s) | Status |
|---------|---------|--------|
| Tour Roulette (swipe) | `RouletteView.swift`, `RouletteState.swift` | Built — swipe gesture, haptics, rotation effect, logo header |
| Right Now Somewhere | `RightNowView.swift`, `TimezoneHelper.swift` | Built — own tab, golden-hour detection |
| The World's Most ___ | `WorldsMostView.swift`, `Superlative.swift` | Built — own tab, stat highlights on cards, random pick from top 10 per category |
| Six Degrees | `SixDegreesView.swift` | Built — own tab, chain roulette with inline timeline, tour photos, favorite hearts, theme badges |
| Tour Detail | `TourDetailView.swift` | Built — image gallery, highlights, Viator link |
| Favorites | `Favorites.swift`, `FavoritesListView.swift`, heart on cards | Built — UserDefaults persistence, clickable list from Settings |
| Settings | `SettingsView.swift`, `AboutView.swift` | Built — gear icon in nav bar, modal sheet, haptics toggle, favorites list, about page |
| App Icon | `AppIcon.appiconset/` | Set — 1024x1024 from archive assets |

**App Store status:** v1.0 rejected March 5, 2026 (4.2.2 Minimum Functionality). Adding native features (widgets, Siri, notifications, Spotlight) for v1.1 resubmission. Bundle ID `com.nikhilsi.TourGraph`, App ID `6759991920`.
**Seed DB built:** 120MB (down from 479MB production). 136,256 tours, 491 chains. Descriptions truncated to ~200 chars, image galleries NULLed, 5 unused tables dropped, VACUUM'd. Bundled in iOS app.
**Per-tour enrichment built:** `TourEnrichmentService.swift` + server endpoints (`/api/ios/tour/[id]`, `/api/ios/tours/batch`). Lazy fetch on detail tap — full descriptions + photo galleries load from server, written to local DB, persisted for future views.
**Code review complete:** 6-agent deep review (Tiers 1-4) — performance, security, accessibility, SEO, error handling all addressed. See CHANGELOG.md [6.2.0] and [6.3.0].

## Data Asset (4 IP Layers)

TourGraph's data is built in layers, each adding original intelligence. See `docs/data-snapshot.md` for full baseline stats.

| Layer | What | Count | Status |
|-------|------|-------|--------|
| 1. Raw Viator Data | Tour listings, photos, ratings, prices | 136,256 tours | **Complete** |
| 2. AI One-Liners | Witty personality captions per tour | 136,256 (100%) | **Complete** |
| 3. City Intelligence | City profiles: personality, standout tours, themes | 910 cities (1,799 readings) | **Complete** |
| 4. Chain Connections | Thematic chains connecting cities | 491 chains | **Complete** |

- **479 MB** database, 2,712 leaf destinations, 205 countries, 7 continents
- Layer 3 design: `docs/city-intelligence.md` | Layer 4 design: `docs/six-degrees-chains.md`

**Next:** Build native features (Tiers 1-4) → resubmit to App Store.

## Deployment

```
Internet → Nginx (:443 SSL, :80 → redirect)
              ↓ proxy_pass http://127.0.0.1:3000
           PM2 → next start (fork mode, single process)
              ↓
           /opt/app/data/tourgraph.db (SQLite, WAL mode)
```

- **Server:** DigitalOcean droplet (Ubuntu 24.04, $6/mo)
- **Stack:** Node 20 + PM2 6 + Nginx 1.24 + Let's Encrypt
- **SSL:** Valid through May 30, 2026, auto-renewal enabled
- **Firewall:** UFW (SSH + Nginx only) + fail2ban
- **Deploy code:** `ssh root@$SERVER_IP "cd /opt/app && bash deployment/scripts/deploy.sh"`
- **Deploy DB:** `bash deployment/scripts/deploy-db.sh $SERVER_IP`
- **Stream logs:** `bash deployment/scripts/stream-logs.sh $SERVER_IP`

### Architecture

```
src/
├── app/
│   ├── page.tsx                    # Homepage — Roulette + Right Now teaser
│   ├── roulette/[id]/              # Tour detail page
│   ├── right-now/                  # Right Now Somewhere page
│   ├── worlds-most/                # Superlatives gallery
│   ├── worlds-most/[slug]/         # Superlative detail page
│   ├── six-degrees/                # Six Degrees chain roulette
│   ├── six-degrees/[slug]/         # Chain detail (vertical timeline)
│   ├── about/                      # About page
│   ├── story/                      # Origin story page
│   ├── api/roulette/hand/          # Hand API (GET, ~20 tours)
│   ├── api/og/roulette/[id]/       # Roulette OG images
│   ├── api/og/right-now/           # Right Now OG image
│   ├── api/og/worlds-most/[slug]/  # Superlative OG images
│   └── api/og/six-degrees/[slug]/  # Six Degrees OG images
├── components/
│   ├── RouletteView.tsx            # Core game loop (client)
│   ├── TourCard.tsx                # Tour card display
│   ├── ChainTimeline.tsx           # Shared Six Degrees timeline
│   ├── ShareButton.tsx             # Web Share / clipboard
│   ├── TourCardSkeleton.tsx        # Loading skeleton
│   ├── FeatureNav.tsx              # Cross-feature navigation
│   └── Logo.tsx                    # Brand logo
├── lib/
│   ├── db.ts                       # SQLite layer + all queries
│   ├── superlatives.ts             # Shared superlative constants + formatters
│   ├── timezone.ts                 # Timezone helpers (Intl.DateTimeFormat)
│   ├── format.ts                   # Shared formatting (price, duration)
│   ├── types.ts                    # All TypeScript types
│   ├── viator.ts                   # Viator API client (with rate limit handling)
│   ├── claude.ts                   # AI one-liner generation
│   └── city-intel.ts               # City intelligence: merge logic, theme normalization
├── scripts/
│   ├── 1-viator/                   # Step 1: Viator API indexing
│   │   ├── seed-destinations.ts    #   Bootstrap destination hierarchy
│   │   ├── indexer.ts              #   Production indexer (logging, leaf filter, ETA)
│   │   └── seed-dev-data.ts        #   Seeds 43 destinations (dev only)
│   ├── 2-oneliners/                # Step 2: AI caption generation
│   │   ├── backfill-oneliners.ts   #   Single-tour one-liners (slow)
│   │   └── backfill-oneliners-batch.ts  #   Batch one-liners (fast)
│   ├── 3-city-intel/               # Step 3: City intelligence pipeline
│   │   ├── build-city-profiles.ts  #   Submit to Claude → city_readings → merge
│   │   └── backfill-city-readings.ts  #   Load JSONL files → city_readings → merge
│   ├── 4-chains/                   # Step 4: Six Degrees chain generation
│   │   ├── generate-chains-v2.ts   #   Two-stage pipeline (Batch API + caching)
│   │   ├── generate-chains.ts      #   Legacy single-shot generator
│   │   ├── generate-pairs.ts       #   Pair generator (scored greedy)
│   │   ├── curate-city-pool.ts     #   City pool curation (one-time)
│   │   ├── test-chain.ts           #   Chain testing (dev)
│   │   ├── chain-pairs.json        #   500 city pairs
│   │   └── city-pool.json          #   100 curated endpoint cities
│   └── utils/
│       └── check-db.ts             # Database audit
logs/
└── indexer-<timestamp>.log         # Indexer run logs (gitignored)
data/
└── tourgraph.db                    # SQLite (gitignored)
```

### Data

See "Data Asset (4 IP Layers)" section above and `docs/data-snapshot.md` for full baseline stats.

### Key Technical Choices

- **SQLite** (not Redis/Postgres) — single file, zero cold cache, deploys as-is. 136K tours at 474MB.
- **Viator Basic tier** — free affiliate API, 300K+ experiences, 16 req/10s per endpoint
- **Claude Haiku 4.5** — fast/cheap one-liners during indexing (~$0.003/1000 tours)
- **Claude Sonnet 4.6** — City intelligence (Stage 0) + chain generation (Stages 1+2)
- **Next.js 16 App Router** — server components for SEO, client for interactivity
- **`Intl.DateTimeFormat`** — timezone math with no external library
- **Dark theme** — photos pop, feels premium

### Build Status

- `npm run build` — zero errors
- `npm run lint` — zero errors (12 warnings in pipeline scripts only)
- TypeScript strict mode — clean

---

## Archived Phase 0

AI extraction pipeline for tour operators — thesis invalidated Feb 2026. All work in `archive/`. See `docs/reference/thesis_validation.md` for why.
