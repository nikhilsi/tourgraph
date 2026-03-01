# NOW — What To Work On Next

---
**Last Updated**: March 1, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: iOS App Development + Data Expansion

**Site is live at https://tourgraph.ai.** iOS app built with all 4 features, 4-tab layout, App Store metadata drafted. Full indexer nearing completion (~134K tours, 2,672/2,712 destinations).

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

### In Progress

1. **Full indexer running** — `--full --no-ai`, 2,672/2,712 destinations (98.5%), ~134K tours. Almost done.

### Next — In Order

1. **Backfill one-liners for new tours** — Batch script ready (`backfill-oneliners-batch.ts`). ~120K tours need one-liners. Estimated ~12 hours.
2. **Decide city pairs for Six Degrees** — Review available cities, pick curated pairs.
3. **Generate curated Six Degrees chains** — Run chain generator. Cost: ~$0.02/chain.
4. **Redeploy database** — `bash deployment/scripts/deploy-db.sh 143.244.186.165`
5. **iOS polish** — Image caching, share card rendering (ImageRenderer), DB enrichment service, LogoWhite @2x/@3x retina variants.
6. **iOS App Store submission** — Register bundle ID, create App Store Connect listing, screenshots, real device testing. See `docs/ios-app-store.md`.
7. **Production testing** — Mobile, OG previews in iMessage/Slack/Twitter, share flow on live URL.

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
| 4a | Data expansion | **98.5%** — 2,672/2,712 destinations, ~134K tours |
| 4b | Six Degrees of Anywhere (web) | **UI complete** — needs chain data |
| 5 | Deploy to production | **Live** — https://tourgraph.ai |
| 6 | iOS app | **Built** — all 4 features, 4-tab layout, favorites, App Store metadata |
| 7 | iOS App Store submission | **Next** — bundle ID + screenshots remaining |
