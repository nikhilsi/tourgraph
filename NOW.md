# NOW — What To Work On Next

---
**Last Updated**: March 3, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Focus: Redeploy & Polish

**Site is live at https://tourgraph.ai.** All four web features deployed, iOS app built. Data fully indexed: 136,256 tours, 100% AI one-liner coverage, 474MB database.

**Gallery redesign done.** Six Degrees now uses chain roulette pattern (single random chain with full inline timeline + "Surprise Me"). Next: redeploy DB with full data asset, then iOS polish.

---

### Next — In Order

#### A. Chain Generation Pipeline (Layer 4)

1. ~~**Curate endpoint pool**~~ — **DONE.** 100 cities (30 anchors, 40 gems, 30 surprises) in `src/scripts/4-chains/city-pool.json`. AI-curated from 910 city profiles, manually rebalanced for continent coverage.

2. ~~**Generate cross-continent pairs**~~ — **DONE.** 500 pairs in `src/scripts/4-chains/chain-pairs.json`. Scored greedy algorithm: Jaccard theme distance + tier mixing bonus, round-robin balanced selection. 97/100 cities in 8-12 range, avg thematic distance 0.574, 71% cross-tier pairs.

3. ~~**Build Stage 1 + Stage 2 generator**~~ — **DONE.** `generate-chains-v2.ts` — two-stage pipeline. Stage 1: ~125K token system prompt (910 city profiles, cached), Claude picks 3 intermediates. Stage 2: 30 tours × 5 cities, Claude builds chain. Batch API + prompt caching. Tested: Tokyo→Rome, Buenos Aires→Reykjavik.

4. ~~**Test batch (small)**~~ — **DONE.** 20 pairs via Batch API, 18/20 succeeded (2 validation failures: duplicate theme, malformed JSON). Quality reviewed — chains are high quality with surprising intermediates.

5. ~~**Generate ~500 chains**~~ — **DONE.** Full 500-pair run via Batch API. First pass: 453/500 chains generated (90.6%). Improved JSON parser to handle text-after-JSON errors (21 of 50 failures). Retry of 50 remaining pairs in progress.

#### B. Display & Polish

6. ~~**Redesign Six Degrees gallery**~~ — **DONE.** Chain roulette: single random chain with full inline timeline + "Surprise Me" to refresh. Both web and iOS.

7. **Redeploy database** — `bash deployment/scripts/deploy-db.sh 143.244.186.165`

#### C. iOS & Launch

8. **iOS polish** — Image caching, share card rendering (ImageRenderer), DB enrichment service, LogoWhite @2x/@3x retina variants.
9. **iOS App Store submission** — Register bundle ID `com.nikhilsi.TourGraph`, create App Store Connect listing, screenshots, real device testing. See `docs/implementation/ios-app-store.md`.
10. **Production testing** — Mobile, OG previews in iMessage/Slack/Twitter, share flow on live URL.

---

### Decided

- [x] **Three-stage pipeline** — Stage 0 (city intelligence) → Stage 1 (city picker) → Stage 2 (chain builder). Each stage optimized for its job.
- [x] **Intermediates unconstrained** — Claude sees all 910 cities in Stage 1. No artificial limits on which cities can appear as intermediate stops.
- [x] **Batch API + prompt caching** — For quality (full context) and efficiency. Architecture driven by quality, not cost.
- [x] **Chain count** — ~500 for launch, evaluate then expand to 1,000+ if needed.
- [x] **Show one-liner on chain detail** — Yes, both web and iOS. Committed.
- [x] **City intelligence (Layer 3)** — 910 cities, 1,799 readings merged. Batch API + sequential gap fill + multi-batch merge.
- [x] **Gallery UX** — Chain roulette: single random chain with full inline timeline + "Surprise Me" to refresh. Simpler than initially planned 6-category approach.
- [x] **v3 prompt** — one-liner context, mixed tour selection, surprise bias, theme = connection between cities, summary under 120 chars.

### Open Decisions

- [x] **Endpoint pool composition** — 100 cities curated: 30 anchors, 40 gems, 30 surprises. AI + manual rebalancing.
- [x] **Gallery design** — Chain roulette (single random chain + refresh). Evolved from planned 6-category approach to simpler pattern matching Tour Roulette's core loop.
- [x] **Batch vs. sequential** — Batch. Full 500-pair run completed in ~40 min (Stage 1) + ~1 hr (Stage 2). Prompt caching confirmed on Stage 1.
- [ ] iOS seed DB size — full DB may fit under 200MB after VACUUM.
- [ ] Dark-mode app icon variant.

### Not Now (V2)

- Weekly data refresh (drip indexer on schedule)
- On-demand chain generation (user types two cities)
- iOS widgets (RightNow home screen widget)
- Push notifications (daily superlative)
- iPad layout
- City discovery pages (`/cities/takayama`)
- Theme browsing (filter by `craftsmanship`, `sacred`, etc.)

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Tour Roulette (web) | **Deployed** |
| 2 | Right Now Somewhere (web) | **Deployed** |
| 3 | The World's Most ___ (web) | **Deployed** |
| 4a | Data expansion + one-liners | **Complete** — 136,256 tours, 100% one-liners, 474MB |
| 4b | Six Degrees of Anywhere (web) | **Complete** — 491 chains, chain roulette gallery |
| 5 | Deploy to production | **Live** — https://tourgraph.ai |
| 6 | iOS app | **Built** — all 4 features, 4-tab layout, favorites, App Store metadata |
| 7a | City intelligence (Layer 3) | **Complete** — 910 cities, 1,799 readings |
| 7b | Chain generation (Layer 4) | **Complete** — 491 chains from 500 pairs |
| 8 | iOS App Store submission | Blocked on polish |
