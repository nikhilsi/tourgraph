# NOW — What To Work On Next

---
**Last Updated**: March 2, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Focus: Six Degrees Chain Generation

**Site is live at https://tourgraph.ai.** All four web features deployed, iOS app built. Data fully indexed: 136,256 tours, 100% AI one-liner coverage, 474MB database.

**Next milestone:** Generate chain connections (Layer 4), then redeploy DB with the full data asset. Layer 3 (city intelligence) is complete — 910 cities, 1,799 readings merged.

---

### Next — In Order

#### A. Chain Generation Pipeline (Layer 4)

1. **Curate endpoint pool** — Hand-pick ~100 cities across 3 tiers: Anchors (~25-30 iconic), Gems (~30-40 aspirational), Surprises (~20-30 "wait, THAT exists?"). Save as `src/scripts/4-chains/city-pool.json`.

2. **Generate cross-continent pairs** — Script (`generate-pairs.ts`) creates ~500 pairs. Rules: cross-continent only, no same-country, each city in 8-12 chains, mixed pairings. Save as `src/scripts/4-chains/chain-pairs.json`.

3. **Build Stage 1 + Stage 2 generator** — Rewrite `src/scripts/4-chains/generate-chains.ts` to use three-stage pipeline. Stage 1: all 910 city profiles in system prompt (~190K tokens), Claude picks 3 intermediates. Stage 2: detailed tours for 5 selected cities, Claude builds chain. Batch API + prompt caching. See `docs/six-degrees-chains.md`.

4. **Test batch (small)** — Generate ~10-20 chains with new architecture, review quality against checklist in `docs/six-degrees-chains.md`.

5. **Generate ~500 chains** — Submit all pairs via Batch API. Spot-check ~10% for quality.

#### B. Display & Polish

6. **Redesign Six Degrees gallery** — Current gallery is a flat card list. Redesign to match World's Most superlatives pattern: curated groupings with representative chains, plus "Surprise Me" from full pool.

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
- [x] **Gallery UX** — Curated display (like World's Most superlatives), not a wall of 500 cards. "Surprise Me" draws from full pool.
- [x] **v3 prompt** — one-liner context, mixed tour selection, surprise bias, theme = connection between cities, summary under 120 chars.

### Open Decisions

- [ ] **Endpoint pool composition** — Which ~100 cities? Use city profiles from Stage 0 to inform selection.
- [ ] **Gallery categories** — By continent pair? By theme? Editor's picks?
- [ ] **Batch vs. sequential** — Batch faster (~1 hr) but variable cache hits. Sequential slower but near-100% hits.
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
| 4b | Six Degrees of Anywhere (web) | **UI complete** — needs chain data |
| 5 | Deploy to production | **Live** — https://tourgraph.ai |
| 6 | iOS app | **Built** — all 4 features, 4-tab layout, favorites, App Store metadata |
| 7a | City intelligence (Layer 3) | **Complete** — 910 cities, 1,799 readings |
| 7b | Chain generation (Layer 4) | **Next** — Stages 1+2 pipeline |
| 8 | iOS App Store submission | Blocked on chain data + polish |
