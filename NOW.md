# NOW — What To Work On Next

**Last Updated**: March 5, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Current Focus: Android App + Waiting for App Store Review

### Android App — Building

Building native Android app (Kotlin + Jetpack Compose) with full iOS feature parity. Same 120MB bundled SQLite, all 4 features, widgets, haptics, share cards, deep linking, enrichment. Distribution: GitHub Releases + F-Droid + Google Play.

**Full plan**: `docs/implementation/android-app.md`

### iOS App Store — Waiting

v1.1 submitted to App Review on March 5, 2026. Added 8 native iOS capabilities after v1.0 was rejected under Guideline 4.2.2.

**iOS plan**: `docs/implementation/app-store-resubmission.md`

## Completed — In Order

### Tier 1: Home Screen Widgets (WidgetKit) — DONE

- [x] 1a. App Group entitlements (`group.com.nikhilsi.TourGraph`) for main app + widget extension
- [x] 1b. DB path migrated to shared App Group container
- [x] 1c. `Shared/` directory — Tour.swift, TimezoneHelper.swift, Superlative.swift, SharedConstants.swift
- [x] 1d. Widget Extension target (`TourGraphWidgetsExtension`) with GRDB dependency
- [x] 1e. `WidgetDatabase.swift` — lightweight read-only DB for widget extension
- [x] 1f. "Right Now Somewhere" widget (small + medium) — golden-hour tour, photo, 30-min refresh
- [x] 1g. "Random Tour" widget (small + medium) — tour photo, interactive "Surprise Me" button (iOS 17+)
- [x] 1h. Lock Screen widget (accessoryRectangular) — text-only Right Now moment
- [x] 1i. Deep link from widget tap → correct tab in main app (`tourgraph://` URL scheme)
- [x] 1j. Tested on real device (iPhone 15 Pro Max) — all 5 widget sizes working with photos

### Tier 2: App Intents + Siri Shortcuts — DONE

- [x] 2a. ShowRandomTourIntent — opens app to Roulette tab
- [x] 2b. ShowRightNowIntent — opens app to Right Now tab
- [x] 2c. ShowChainIntent — opens app to Six Degrees tab (replaced GetTourFact — more engaging)
- [x] 2d. AppShortcutsProvider with consistent "Show me [X] in TourGraph" Siri phrases
- [x] 2e. Modal sheet deep linking — `tourgraph://tour/{id}` shows TourDetailView as fullScreenCover (all 4 widgets + intents)
- [x] 2f. Tested on real device (iPhone 15 Pro Max) — all 3 shortcuts, all 3 Siri phrases, all 4 widget→tour modals

### Tier 3: Local Notifications — SKIPPED

Decided to skip. Daily notifications don't fit TourGraph's "bored in line" usage pattern — they'd be annoying, not delightful. Widgets already provide persistent home screen presence. Not needed for Apple review.

### Tier 4: Spotlight + Polish — DONE

- [x] 4a. Spotlight indexing — favorited tours searchable from home screen, tap opens tour modal
- [x] 4b. Enhanced haptics — context-aware patterns (favorite, unfavorite, superlative, chain, swipe)
- [x] 4c. Spring animations — card entrance slide-up, favorite heart bounce

### Resubmission — DONE

- [x] Test all features on simulator + real device (iPhone 15 Pro)
- [x] New screenshots — 8 total (6 in-app + shortcuts + widgets from real device)
- [x] Update App Store metadata (promo text, description, keywords, review notes)
- [x] Archive v1.1 (build 2) + upload via CLI with `-allowProvisioningUpdates`
- [x] Reply to Apple in Resolution Center with feature list + widget screenshot
- [x] Resubmit to App Review — **Waiting for Review** (March 5, 2026)

## Recently Completed

- [x] App Store resubmission — v1.1 submitted March 5, 2026. 8 screenshots, updated metadata, reply to Apple with feature list (March 5)
- [x] Tier 4: Spotlight + Polish — Spotlight indexing, enhanced haptics (5 patterns), spring animations, tested on iPhone 15 Pro Max (March 5)
- [x] Tier 2: App Intents + Siri Shortcuts — 3 intents (Random Tour, Right Now, Random Chain), Siri phrases, modal sheet deep linking for all widgets, tested on iPhone 15 Pro Max (March 5)
- [x] Tier 1: Home Screen Widgets — 3 widget types (Right Now, Random Tour, Lock Screen), 5 sizes, tour photos, interactive Surprise Me, deep links, tested on iPhone 15 Pro Max (March 5)
- [x] iOS App Store submission — v1.0 rejected (4.2.2 Minimum Functionality), resubmission in progress (March 5)
  - Bundle ID registered, app record created, metadata + screenshots uploaded via API
  - Build archived, exported, uploaded via CLI (`xcodebuild`)
  - Privacy, age rating, pricing, encryption compliance all set
- [x] 6-agent code review — Tiers 1-4 complete, all deployed to production (March 3)
  - Tier 1: Chain perf (slug column), SQL injection, URL safety, rate limiter
  - Tier 2: Batch queries, CSP, error states, dead code
  - Tier 3: Shared components, concurrency safety, health endpoint, polish
  - Tier 4: Accessibility (VoiceOver), SEO (robots/sitemap), duration bug, cache headers, dead code
- [x] iOS tested on real device (iPhone 15 Pro Max) — all 4 features working (March 3)
- [x] "Show Me Another" button fix — renamed from "Surprise Me", scrolls to top (March 3)
- [x] iOS polish — share card rendering, logo retina, branded launch screen (March 3)
- [x] Fixed favorites navigation bug — destination-closure NavigationLinks (March 3)
- [x] World's Most variety — random pick from top 10 (March 3)
- [x] Six Degrees polish — tour photos, card backgrounds, bright colors, theme badges (March 3)
- [x] Seed DB + enrichment — 120MB bundled, lazy server fetch on detail tap (March 3)
- [x] All 4 data layers + gallery redesign deployed to production (March 3)

## Open Decisions

- [ ] Dark-mode app icon variant

## Not Now (V2)

- Weekly data refresh (drip indexer on schedule) + delta sync to iOS app
- On-demand chain generation (user types two cities)
- iPad layout
- City discovery pages (`/cities/takayama`)
- Theme browsing (filter by `craftsmanship`, `sacred`, etc.)

## Roadmap

| Phase | Feature | Status |
| ----- | ------- | ------ |
| 1 | Tour Roulette (web) | **Deployed** |
| 2 | Right Now Somewhere (web) | **Deployed** |
| 3 | The World's Most (web) | **Deployed** |
| 4a | Data expansion + one-liners | **Complete** — 136,256 tours, 100% one-liners |
| 4b | Six Degrees of Anywhere (web) | **Complete** — 491 chains, chain roulette |
| 5 | Deploy to production | **Live** — [tourgraph.ai](https://tourgraph.ai) |
| 6 | iOS app | **Built** — all 4 features, 4-tab layout |
| 7a | City intelligence (Layer 3) | **Complete** — 910 cities, 1,799 readings |
| 7b | Chain generation (Layer 4) | **Complete** — 491 chains from 500 pairs |
| 8a | Production testing (web) | **Done** — basic testing passed |
| 8b | iOS seed DB build | **Done** — 120MB (479MB → 120MB) |
| 8c | Per-tour enrichment (server + iOS) | **Done** — endpoints + TourEnrichmentService |
| 8d | Six Degrees polish + favorites + about | **Done** — images, cards, colors, FavoritesListView, AboutView |
| 8e | iOS testing (simulator + device) | **Done** — real device tested |
| 8f | iOS polish (share cards, launch screen) | **Done** |
| 8g | Code review (6-agent, Tiers 1-4) | **Done** — perf, security, a11y, SEO |
| 9 | iOS App Store submission | **Rejected** — 4.2.2 Minimum Functionality (March 5) |
| 10 | Native features (widgets, Siri/Shortcuts, Spotlight, haptics, animations) | **Complete** |
| 11 | App Store resubmission | **Submitted** — v1.1 waiting for review (March 5) |
| 12 | Android app | **Planning** — full plan in `docs/implementation/android-app.md` |
