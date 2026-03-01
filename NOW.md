# NOW — What To Work On Next

---
**Last Updated**: March 1, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: Data Expansion (Running) + Phase 4 UI Complete

Phases 1-3 code-complete. Phase 4 (Six Degrees) UI built — gallery, detail page with vertical timeline, OG images. Full indexer running (~613/2,712 destinations, ~40K tours so far). Waiting for indexer to finish before generating chains.

### Completed

1. ~~One-liner backfill~~ — **Done** (all ~9,800 tours)
2. ~~UI sanity test (Phases 1-3)~~ — **Done.** 14/14 routes return 200. Duration display fixed. More in-depth testing deferred to post-deploy.
3. ~~Build chain generation script~~ — **Done.** `src/scripts/generate-chains.ts`
4. ~~Build Six Degrees UI~~ — **Done.** Gallery page, detail page with vertical timeline/stepper, SurpriseMeButton, not-found page, OG image route. All compile clean (lint + build zero errors). Will populate once chains are generated.
5. ~~About & Story pages~~ — **Done.** Professional pages for portfolio. Footer with GitHub + LinkedIn.
6. ~~Favicon fix~~ — **Done.** Removed white background from icon.svg.

### In Progress

1. **Full indexer running** — `--full --no-ai`, ~613/2,712 destinations (22.6%), ~40K tours, ~15.5h remaining. PID 29290. `caffeinate` preventing sleep. Non-critical `updated_at` error self-resolved after first 10%.

### Next — In Order

1. **Backfill one-liners for new tours** — After indexer completes. ~30K+ new tours need one-liners. Cost: ~$0.003 per 1,000 tours (Haiku 4.5).
2. **Decide city pairs for Six Degrees** — Review available cities from expanded data, pick curated pairs. Update `src/scripts/chain-pairs.json`.
3. **Generate curated Six Degrees chains** — Run `npx tsx src/scripts/generate-chains.ts`. Cost: ~$0.02/chain (Sonnet 4.6). Quantity TBD.
4. **In-depth testing** — Mobile (375px), WCAG AA contrast, share flow end-to-end, OG preview on deployed URL.
5. **Deploy** to DigitalOcean.

### Phase 4 — Open Decisions

- [ ] How many curated chains for launch? (50? 100? 200?)
- [ ] City pair selection strategy — by continent diversity? by hub city? by surprise factor?
- [ ] Daily featured chain vs static gallery?

### Not Now (V2)

- Weekly data refresh (drip indexer on schedule) — design exists in `docs/architecture.md` but not needed for launch
- On-demand chain generation (user types two cities, AI generates live)
- Six Degrees open-ended (any city pair)

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Tour Roulette | **Code complete** |
| 2 | Right Now Somewhere | **Code complete** |
| 3 | The World's Most ___ | **Code complete** |
| 4a | Data expansion (all destinations) | **Running** — 613/2,712 (22.6%) |
| 4b | Six Degrees of Anywhere | **UI complete** — needs chain data |
| 5 | Cross-feature polish, deploy | Planned |
| 6 | iOS app | Planned |
