# NOW — What To Work On Next

---
**Last Updated**: February 28, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: Phase 1 Wrap-Up

Tour Roulette is functionally complete. Remaining work is data quality and polish.

### Do Now

1. **Wait for seed to finish** — 43 destinations indexing (target: 5K+ tours)
2. **Backfill one-liners** — `npm run backfill:oneliners` after seed completes
3. **Browser test** — Visual check on mobile (375px) + desktop (1440px)

### Polish Checklist (Step 20)

- [ ] Test OG image: visit `/api/og/roulette/[id]` in browser
- [ ] Test share flow: share link → OG preview → tap → detail → spin
- [ ] Incognito test: first card loads in < 2 seconds
- [ ] WCAG AA color contrast audit
- [ ] Card transitions feel smooth
- [ ] Affiliate URLs open in new tab
- [ ] Run `npx tsx src/scripts/check-db.ts` — verify 5K+ tours, good continent spread

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Tour Roulette | **Wrapping up** |
| 2 | Right Now Somewhere | Next |
| 3 | The World's Most ___ | Planned |
| 4 | Six Degrees of Anywhere | Planned |
| 5 | Cross-feature polish, deploy | Planned |
| 6 | iOS app | Planned |
