# NOW — What To Work On Next

---
**Last Updated**: March 1, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: iOS App Development + Data Expansion

**Site is live at https://tourgraph.ai.** iOS app scaffold built with all 4 features. Full indexer running locally (~116K tours, 2,250 destinations so far).

### Web — Completed

1. ~~Tour Roulette~~ — **Done.** Weighted hand algorithm, contrast sequencing, OG images.
2. ~~Right Now Somewhere~~ — **Done.** Golden-hour timezone detection, moment cards.
3. ~~The World's Most ___~~ — **Done.** 6 superlatives, detail pages, OG images.
4. ~~Six Degrees of Anywhere~~ — **Done.** Gallery, vertical timeline detail, OG images.
5. ~~Homepage, About, Story~~ — **Done.** Tagline, feature teasers, viral loop closers.
6. ~~Deploy to DigitalOcean~~ — **Done.** PM2 + Nginx + SSL. All 17 routes verified 200.

### iOS — In Progress

1. ~~Xcode project + GRDB + models~~ — **Done.** All models, DatabaseService, TimezoneHelper.
2. ~~Tour Roulette (swipe cards)~~ — **Done.** Swipe gesture, haptics, hand cycling, rotation effect.
3. ~~Right Now Somewhere~~ — **Done.** Golden-hour detection, moment cards.
4. ~~World's Most ___~~ — **Done.** Superlative cards with stat highlights.
5. ~~Six Degrees~~ — **Done.** Chain gallery, vertical timeline detail, "Surprise Me" button.
6. ~~Explore tab~~ — **Done.** Combines Right Now, World's Most, Six Degrees as sections.
7. ~~Favorites~~ — **Done.** Heart button on cards + detail, persisted to UserDefaults.
8. ~~App icon~~ — **Done.** Existing 1024x1024 icon from archive assets.
9. ~~Settings~~ — **Done.** Haptics toggle, favorites count, tour/destination stats.

### In Progress

1. **Full indexer running** — `--full --no-ai`, ~2,250/2,712 destinations (83%), ~116K tours. PID 29290.

### Next — In Order

1. **Backfill one-liners for new tours** — After indexer completes. ~100K+ new tours need one-liners.
2. **Decide city pairs for Six Degrees** — Review available cities, pick curated pairs.
3. **Generate curated Six Degrees chains** — Run chain generator. Cost: ~$0.02/chain.
4. **Deep code review** — Public repo audit: remove secrets/comments/debug code, check for exposed API keys in git history, review security headers, sanitize error messages, audit dependencies, clean up dead code and TODOs.
5. **Redeploy database** — `bash deployment/scripts/deploy-db.sh 143.244.186.165`
6. **iOS polish** — Image caching, share card rendering (ImageRenderer), DB enrichment service.
7. **iOS App Store prep** — Launch screen, screenshots, App Store metadata, real device testing.
8. **Production testing** — Mobile, OG previews in iMessage/Slack/Twitter, share flow on live URL.

### Open Decisions

- [ ] How many curated chains for launch? (50? 100? 200?)
- [ ] City pair selection strategy
- [ ] iOS seed DB size — full DB may fit under 200MB after VACUUM
- [ ] Dark-mode app icon variant (current has white bg — may want dark bg for dark mode)

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
| 4a | Data expansion | **Running** — 2,250/2,712 (83%) |
| 4b | Six Degrees of Anywhere (web) | **UI complete** — needs chain data |
| 5 | Deploy to production | **Live** — https://tourgraph.ai |
| 6 | iOS app scaffold | **Built** — all 4 features + favorites |
| 7 | iOS polish + App Store | **Next** |
