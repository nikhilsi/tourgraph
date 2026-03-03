# NOW — What To Work On Next

**Last Updated**: March 3, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Current Focus: iOS Polish → App Store

Site is live at [tourgraph.ai](https://tourgraph.ai) with the full data asset deployed (136,256 tours, 491 chains, 910 city profiles, 479MB database). All four web features complete. iOS app built, tested on real device, 6-agent code review complete (Tiers 1-4). SEO (robots.txt, sitemap.xml), accessibility (VoiceOver labels), performance, and security all addressed.

## Next — In Order

1. **iOS polish** — Share card rendering (ImageRenderer), launch screen.
2. **iOS App Store submission** — Register bundle ID `com.nikhilsi.TourGraph`, create App Store Connect listing, screenshots. See `docs/implementation/ios-app-store.md`.

## Recently Completed

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
- iOS widgets (RightNow home screen widget)
- Push notifications (daily superlative)
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
| 9 | iOS App Store submission | Next |
