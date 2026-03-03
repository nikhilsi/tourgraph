# NOW — What To Work On Next

**Last Updated**: March 3, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Current Focus: iOS Seed DB & Polish

Site is live at [tourgraph.ai](https://tourgraph.ai) with the full data asset deployed (136,256 tours, 491 chains, 910 city profiles, 479MB database). All four web features complete and web production tested. iOS app built, needs seed DB + polish before App Store submission.

## Next — In Order

1. **iOS seed DB** — Build ~210MB seed DB from production 479MB. Strategy decided: drop 5 unused tables, NULL `image_urls_json`/`inclusions_json`/`supplier_name`, truncate `description` to ~200 chars at word boundary, drop redundant indexes, VACUUM. Concrete build script in `docs/implementation/ios-architecture.md` ("Seed DB Build Script" section). Current bundled DB is stale (367MB, 110K tours, 0 chains) — must rebuild from production data.
2. **iOS testing** — Test all 4 features on simulator + real device with seed DB. Verify Six Degrees chains render, roulette works, Right Now timezone logic, World's Most superlatives.
3. **iOS polish** — Image caching, share card rendering (ImageRenderer), LogoWhite @2x/@3x retina variants, launch screen.
4. **iOS App Store submission** — Register bundle ID `com.nikhilsi.TourGraph`, create App Store Connect listing, screenshots, real device testing. See `docs/implementation/ios-app-store.md`.

## Recently Completed

- [x] Web production testing — basic testing on mobile + desktop, all features looked good (March 3)
- [x] iOS seed DB strategy decided — ~210MB target via column NULLing + description truncation (March 3)
- [x] iOS architecture doc updated with verified DB research — column analysis, query traces, build script (March 3)
- [x] Code + DB deployed to production (March 3)
- [x] Six Degrees gallery redesign — chain roulette with inline timeline (web + iOS)
- [x] Chain generation pipeline (Layer 4) — 491/500 chains via two-stage Batch API
- [x] City intelligence (Layer 3) — 910 cities, 1,799 readings

## Open Decisions

- [ ] Dark-mode app icon variant
- [ ] Per-tour enrichment — designed (lazy fetch on detail view tap), not built. Server API endpoints + iOS TourEnrichmentService needed. Not required for App Store v1.

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
| 8b | iOS seed DB build | Next — strategy decided, ~210MB target |
| 8c | iOS testing + polish | Blocked on seed DB |
| 9 | iOS App Store submission | Blocked on testing + polish |
