# NOW — What To Work On Next

---
**Last Updated**: March 2, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: Six Degrees Chain Generation + iOS Polish

**Site is live at https://tourgraph.ai.** Data fully indexed: 136,256 tours, 100% AI one-liner coverage, 474MB database. iOS app built with all 4 features. Next: generate Six Degrees chains and redeploy DB.

### Web — Completed

1. ~~Tour Roulette~~ — **Done.** Weighted hand algorithm, contrast sequencing, OG images.
2. ~~Right Now Somewhere~~ — **Done.** Golden-hour timezone detection, moment cards.
3. ~~The World's Most ___~~ — **Done.** 6 superlatives, detail pages, OG images.
4. ~~Six Degrees of Anywhere~~ — **Done.** Gallery, vertical timeline detail, OG images.
5. ~~Homepage, About, Story~~ — **Done.** Tagline, feature teasers, viral loop closers.
6. ~~Deploy to DigitalOcean~~ — **Done.** PM2 + Nginx + SSL. All 19 routes verified 200.
7. ~~Privacy + Support pages~~ — **Done.** Required for App Store submission.
8. ~~Logo on all pages~~ — **Done.** White logo on transparent bg, reusable component.

### iOS — In Progress

1. ~~Xcode project + GRDB + models~~ — **Done.** All models, DatabaseService, TimezoneHelper.
2. ~~Tour Roulette (swipe cards)~~ — **Done.** Swipe gesture, haptics, hand cycling, rotation effect.
3. ~~Right Now Somewhere~~ — **Done.** Golden-hour detection, moment cards.
4. ~~World's Most ___~~ — **Done.** Superlative cards with stat highlights.
5. ~~Six Degrees~~ — **Done.** Chain gallery, vertical timeline detail, "Surprise Me" button.
6. ~~4-tab layout~~ — **Done.** Roulette | Right Now | World's Most | Six Degrees. Settings as gear icon sheet.
7. ~~Favorites~~ — **Done.** Heart button on cards + detail, persisted to UserDefaults.
8. ~~App icon~~ — **Done.** Existing 1024x1024 icon from archive assets.
9. ~~PrivacyInfo.xcprivacy + ExportOptions.plist~~ — **Done.** Required for App Store submission.
10. ~~App Store metadata~~ — **Done.** Description, keywords, privacy policy, review notes in `docs/ios-app-store.md`.

### Completed

1. ~~One-liner backfill~~ — **Done.** 136,256/136,256 tours (100%). Batch + retry + single-tour. See `docs/data-snapshot.md`.

### Next — In Order

#### A. Pre-generation (Architecture & Design)

2. **Show one-liner on chain detail cards** — Web: add `tour.one_liner` below tour title on chain detail page (`src/app/six-degrees/[slug]/page.tsx`). iOS: add to `ChainDetailView.swift`. Data already in DB via `getTourById()` → `SELECT *`, just not rendered. Quick win.

3. **Curate city pool** — Hand-pick ~100 cities across 3 tiers: Anchors (~25-30 iconic), Gems (~30-40 aspirational), Surprises (~20-30 "wait, THAT exists?"). Use thematic richness analysis in `docs/six-degrees-chains.md` § "City Pool Design". Save as `src/scripts/city-pool.json`.

4. **Build tour catalog** — Script (`build-tour-catalog.ts`) extracts 15 tours per pool city (top 8 by rating + 7 random), formats as structured plain text → `data/tour-catalog.txt` (~75K tokens). This is the shared context Claude sees for every chain.

5. **Generate cross-continent pairs** — Script (`generate-pairs.ts`) creates ~500 pairs from pool. Math: 100 cities × ~10 chains each ÷ 2 endpoints = ~500. Rules: cross-continent only, no same-country, each city in 8-12 chains, mix of anchor↔gem/surprise pairings.

6. **Build v2 chain generator** — Rewrite generator to use Batch API + prompt caching. Every request shares the full tour catalog in the system prompt (cached). Claude sees all 100 cities for every chain → eliminates random intermediate selection, geographic clustering, quality inconsistency. See `docs/six-degrees-chains.md` § "Generation Architecture".

7. **Test batch (small)** — Generate ~10-20 chains with v2 architecture, review quality carefully against checklist.

#### B. Generation

8. **Generate ~500 chains** — Submit all pairs via Batch API. Spot-check ~10% for quality.

#### C. Display & Polish

9. **Redesign Six Degrees gallery** — Current gallery dumps all chains as flat card list. Redesign to match World's Most superlatives pattern: curated groupings (categories TBD) with representative chains, plus "Surprise Me" from full pool.

10. **Redeploy database** — `bash deployment/scripts/deploy-db.sh 143.244.186.165`

#### D. iOS & Launch

11. **iOS polish** — Image caching, share card rendering (ImageRenderer), DB enrichment service, LogoWhite @2x/@3x retina variants.
12. **iOS App Store submission** — Register bundle ID `com.nikhilsi.TourGraph`, create App Store Connect listing, screenshots, real device testing. See `docs/ios-app-store.md`.
13. **Production testing** — Mobile, OG previews in iMessage/Slack/Twitter, share flow on live URL.

### Decided

- [x] **Generation architecture**: v2 — shared tour catalog (~75K tokens) in cached system prompt. Claude sees all ~100 curated cities for every chain. Eliminates random intermediate selection and geographic clustering. Quality-driven decision.
- [x] **Intermediate city selection**: Solved by v2 — Claude picks from the full curated pool, not a random subset.
- [x] **Claude API approach**: Batch API (async, ~1 hr) + prompt caching (shared catalog) + optionally Files API for upload. Driven by quality (full context), not cost.
- [x] **Chain count**: ~500 for launch, evaluate then expand to 1,000+ if needed
- [x] **Show one-liner on chain detail**: Yes, both web and iOS
- [x] **Gallery UX**: Curated display (like World's Most superlatives), not a wall of 500 cards. "Surprise Me" draws from full pool.
- [x] **v3 prompt**: one-liner context, mixed tour selection, surprise bias, theme = connection between cities, summary under 120 chars

### Open Decisions

- [ ] **City pool composition** — Which ~100 cities? Thematic richness data in `docs/six-degrees-chains.md`.
- [ ] **Gallery categories** — By continent pair? By theme? Editor's picks?
- [ ] **Tours per city in catalog** — 15 (top 8 + 7 random) seems right. Could test with 20 or 10.
- [ ] **Batch vs. sequential** — Batch faster (~1 hr) but variable cache hits. Sequential slower but near-100% hits.
- [ ] iOS seed DB size — full DB may fit under 200MB after VACUUM
- [ ] Dark-mode app icon variant

### Not Now (V2)

- Weekly data refresh (drip indexer on schedule)
- On-demand chain generation (user types two cities)
- iOS widgets (RightNow home screen widget)
- Push notifications (daily superlative)
- iPad layout

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
| 7 | iOS App Store submission | **Next** — bundle ID + screenshots remaining |
