# NOW — What To Work On Next

**Last Updated**: March 3, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Current Focus: iOS Seed DB → Enrichment → Test → Ship

Site is live at [tourgraph.ai](https://tourgraph.ai) with the full data asset deployed (136,256 tours, 491 chains, 910 city profiles, 479MB database). All four web features complete and web production tested. iOS app built, executing the path to App Store.

## Next — In Order

1. **Test on simulator** — All 4 features end-to-end with 120MB seed DB + enrichment working. Verify enrichment fills in full descriptions + photo galleries on detail tap. Deploy server enrichment endpoints to production first.
2. **Test on real device** — Hardware testing, haptics, performance.
3. **iOS polish** — Share card rendering (ImageRenderer), LogoWhite @2x/@3x retina variants, launch screen.
4. **iOS App Store submission** — Register bundle ID `com.nikhilsi.TourGraph`, create App Store Connect listing, screenshots. See `docs/implementation/ios-app-store.md`.

## Recently Completed

- [x] Six Degrees polish — tour photos (16:9), card backgrounds, bright colors, theme badges, connection text, ViewThatFits for long city names (March 3)
- [x] Favorites wiring — heart overlay on Six Degrees tour photos, FavoritesListView accessible from Settings (March 3)
- [x] AboutView — app info, features, stats, links to tourgraph.ai (March 3)
- [x] Settings wiring — NavigationLinks to FavoritesListView and AboutView, enrichmentService threaded through all tabs (March 3)
- [x] Deleted dead code — ChainDetailView.swift removed (replaced by inline timeline in SixDegreesView) (March 3)
- [x] Seed DB built — 120MB (479MB → 120MB via truncation + NULLing + VACUUM), bundled in iOS app (March 3)
- [x] Per-tour enrichment built — server endpoints + iOS TourEnrichmentService + wired into TourDetailView (March 3)
- [x] Web production testing — basic testing on mobile + desktop, all features looked good (March 3)
- [x] Code + DB deployed to production (March 3)
- [x] Six Degrees gallery redesign — chain roulette with inline timeline (web + iOS)
- [x] Chain generation pipeline (Layer 4) — 491/500 chains via two-stage Batch API
- [x] City intelligence (Layer 3) — 910 cities, 1,799 readings

## Open Decisions

- [ ] Dark-mode app icon variant
- [ ] Share card rendering approach (ImageRenderer vs. server-side)

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
| 8e | iOS testing (simulator + device) | **In progress** |
| 8f | iOS polish (share cards, launch screen) | Next |
| 9 | iOS App Store submission | Blocked on polish |
