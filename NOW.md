# NOW — What To Work On Next

---
**Last Updated**: March 1, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: Data Expansion + Phase 4 Prep

Phases 1-3 are code-complete. Phase 4 (Six Degrees) research is done — prompt validated, strategy decided. Now expanding from 53 dev destinations to all ~2,712 leaf destinations before building Phase 4 UI.

### Immediate — In Order

1. **Wait for one-liner backfill to finish** — ~6,300/9,800 done, ~1 hour remaining. Do NOT run the indexer until this completes (both write to `tours` table — KISS, avoid SQLite contention).
2. **UI sanity test (Phases 1-3)** — Quick visual check with current 53-city data before expanding:
   - [ ] `/` shows roulette + "Right now in..." teaser
   - [ ] `/right-now` shows 6 golden-hour tours
   - [ ] `/worlds-most` shows 6 superlative cards
   - [ ] All 6 `/worlds-most/[slug]` pages render with correct stats
   - [ ] OG images render for all routes
   - [ ] FeatureNav links work bidirectionally
   - [ ] Mobile responsive at 375px
   - [ ] Affiliate URLs open in new tab with campaign tracking
3. **Run full indexer** — `npx tsx src/scripts/indexer.ts --full --no-ai` (~2,712 leaf destinations, estimated 10-16 hours). Indexer hardened with file logging, timing/ETA, and summary. Explicit user approval required before running.
4. **Backfill one-liners for new tours** — After indexer completes, run `npm run backfill:oneliners` for all new tours. Cost: ~$0.003 per 1,000 tours (Haiku 4.5).
5. **Generate curated Six Degrees chains** — Pick city pairs, run chain generation script. Cost: ~$0.02/chain (Sonnet 4.6). Quantity TBD (50-100+ depending on city coverage).
6. **Build Six Degrees UI** — Gallery page, detail page, chain visualization, OG images.

### Phase 4 — Open Decisions

- [ ] How many curated chains for launch? (50? 100? 200?)
- [ ] City pair selection strategy — by continent diversity? by hub city? by surprise factor?
- [ ] OG image design for chain cards
- [ ] Daily featured chain vs static gallery?
- [ ] Need Framer Motion for animations? Or pure CSS?

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
| 4a | Data expansion (all destinations) | **Ready to run** — indexer hardened |
| 4b | Six Degrees of Anywhere | Research complete, UI not started |
| 5 | Cross-feature polish, deploy | Planned |
| 6 | iOS app | Planned |
