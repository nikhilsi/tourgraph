# NOW — What To Work On Next

**Last Updated**: March 3, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Current Focus: Redeploy & Polish

Site is live at [tourgraph.ai](https://tourgraph.ai). All four web features deployed, iOS app built. Data fully indexed: 136,256 tours, 100% AI one-liner coverage, 491 chains, 474MB database.

Gallery redesign done. Six Degrees uses chain roulette (single random chain with full inline timeline + "Surprise Me"). All data layers complete. Next: redeploy DB, then iOS polish.

## Next — In Order

1. **Redeploy database** — `bash deployment/scripts/deploy-db.sh 143.244.186.165`. Production DB is missing chains (Layer 4) and city profiles (Layer 3).
2. **iOS polish** — Image caching, share card rendering (ImageRenderer), DB enrichment service, LogoWhite @2x/@3x retina variants.
3. **iOS App Store submission** — Register bundle ID `com.nikhilsi.TourGraph`, create App Store Connect listing, screenshots, real device testing. See `docs/implementation/ios-app-store.md`.
4. **Production testing** — Mobile, OG previews in iMessage/Slack/Twitter, share flow on live URL.

## Done (This Sprint)

- [x] **Chain generation pipeline (Layer 4)** — 491 chains from 500 pairs via two-stage Batch API. `generate-chains-v2.ts`.
- [x] **Gallery redesign** — Chain roulette: single random chain with full inline timeline + "Surprise Me". Both web and iOS.
- [x] **City intelligence (Layer 3)** — 910 cities, 1,799 readings merged. `build-city-profiles.ts`.

## Decided

- [x] Three-stage pipeline — Stage 0 (city intelligence) → Stage 1 (city picker) → Stage 2 (chain builder)
- [x] Intermediates unconstrained — Claude sees all 910 cities in Stage 1
- [x] Batch API + prompt caching — 50% cost + 90% cache on Stage 1 system prompt
- [x] Chain count — ~500 for launch, expand later if needed
- [x] Gallery UX — Chain roulette (evolved from planned 6-category approach)
- [x] Endpoint pool — 100 cities (30 anchors, 40 gems, 30 surprises)
- [x] One-liner on chain detail — Yes, both web and iOS

## Open Decisions

- [ ] iOS seed DB size — full DB may fit under 200MB after VACUUM
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
| 8 | iOS App Store submission | Blocked on polish |
