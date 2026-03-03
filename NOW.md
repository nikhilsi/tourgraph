# NOW — What To Work On Next

**Last Updated**: March 3, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Current Focus: Production Testing & iOS

Site is live at [tourgraph.ai](https://tourgraph.ai) with the full data asset deployed (136,256 tours, 491 chains, 910 city profiles, 474MB database). All four web features complete including Six Degrees chain roulette. iOS app built, needs polish before App Store submission.

## Next — In Order

1. **Production testing** — Deep test all features on mobile + desktop. OG previews in iMessage/Slack/Twitter. Share flows on live URL. Six Degrees chain roulette UX. Verify chain data renders correctly.
2. **iOS seed DB** — Full DB is 474MB, Apple's cellular download limit is 200MB. Need to build a ~150MB seed DB (VACUUM + possibly strip columns) and a background enrichment service to download the full DB post-install. See `docs/implementation/ios-architecture.md` (decisions D5, "Seed DB" section).
3. **iOS polish** — Image caching, share card rendering (ImageRenderer), LogoWhite @2x/@3x retina variants, launch screen.
4. **iOS App Store submission** — Register bundle ID `com.nikhilsi.TourGraph`, create App Store Connect listing, screenshots, real device testing. See `docs/implementation/ios-app-store.md`.

## Recently Completed

- [x] Code + DB deployed to production (March 3)
- [x] Six Degrees gallery redesign — chain roulette with inline timeline (web + iOS)
- [x] Chain generation pipeline (Layer 4) — 491/500 chains via two-stage Batch API
- [x] City intelligence (Layer 3) — 910 cities, 1,799 readings

## Open Decisions

- [ ] iOS seed DB strategy — VACUUM alone enough, or need column stripping? Target ~150MB. See `docs/implementation/ios-architecture.md`.
- [ ] Dark-mode app icon variant

## Not Now (V2)

- Weekly data refresh (drip indexer on schedule)
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
| 8 | Production testing | Next |
| 9 | iOS App Store submission | Blocked on seed DB + polish |
