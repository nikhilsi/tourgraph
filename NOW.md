# NOW — What To Work On Next

---
**Last Updated**: March 1, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: Deployed + Data Expansion Running

**Site is live at https://tourgraph.ai.** All four feature UIs built. Deployed on DigitalOcean droplet ($6/mo, 1GB RAM) with PM2 + Nginx + SSL. Full indexer still running locally — once complete, backfill one-liners, generate Six Degrees chains, and redeploy DB.

### Completed

1. ~~One-liner backfill~~ — **Done** (all ~9,800 tours)
2. ~~UI sanity test (Phases 1-3)~~ — **Done.** 14/14 routes return 200. Duration display fixed.
3. ~~Build chain generation script~~ — **Done.** `src/scripts/generate-chains.ts`
4. ~~Build Six Degrees UI~~ — **Done.** Gallery, detail page (vertical timeline), OG images.
5. ~~About & Story pages~~ — **Done.**
6. ~~Favicon fix~~ — **Done.**
7. ~~Homepage redesign~~ — **Done.** Tagline, context line, feature teaser cards.
8. ~~Tooltips~~ — **Done.** HTML `title` attributes across all pages.
9. ~~UX doc cross-check~~ — **Done.** FeatureNav fix, "Spin Your Own" viral loop closers.
10. ~~Deploy to DigitalOcean~~ — **Done.** PM2 + Nginx + Let's Encrypt SSL. HTTP→HTTPS redirect, www→non-www redirect. UFW + fail2ban. All routes verified 200 over HTTPS.

### In Progress

1. **Full indexer running** — `--full --no-ai`, ~613/2,712 destinations (22.6%), ~40K tours. PID 29290. `caffeinate` preventing sleep.

### Next — In Order

1. **Backfill one-liners for new tours** — After indexer completes. ~30K+ new tours need one-liners. Cost: ~$0.003 per 1,000 tours (Haiku 4.5).
2. **Decide city pairs for Six Degrees** — Review available cities from expanded data, pick curated pairs. Update `src/scripts/chain-pairs.json`.
3. **Generate curated Six Degrees chains** — Run `npx tsx src/scripts/generate-chains.ts`. Cost: ~$0.02/chain (Sonnet 4.6). Quantity TBD.
4. **Redeploy database** — `bash deployment/scripts/deploy-db.sh 143.244.186.165` after data is complete.
5. **In-depth testing on production** — Mobile (375px), WCAG AA contrast, share flow end-to-end, OG preview on live URL (iMessage/Slack/Twitter).

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
| 5 | Cross-feature polish, deploy | **Deployed** — https://tourgraph.ai |
| 6 | iOS app | Planned |
