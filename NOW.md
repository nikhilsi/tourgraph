# NOW — What To Work On Next

---
**Last Updated**: February 28, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history
---

## Current Phase: Testing Phases 1-3

Tour Roulette, Right Now Somewhere, and The World's Most ___ are all code-complete. Build and lint pass clean.

### Do Now

1. **Backfill one-liners** — `npm run backfill:oneliners` (seed is complete)
2. **Browser test all three features** — Visual check on mobile (375px) + desktop (1440px)
3. **Test OG images** for all routes: `/api/og/roulette/[id]`, `/api/og/right-now`, `/api/og/worlds-most/[slug]`
4. **Test share flow** — share link → OG preview → tap → detail → navigate between features

### Test Checklist

- [ ] `/` shows roulette + "Right now in..." teaser
- [ ] `/right-now` shows 6 golden-hour tours
- [ ] `/worlds-most` shows 6 superlative cards
- [ ] All 6 `/worlds-most/[slug]` pages render with correct stats
- [ ] OG images work for all routes
- [ ] FeatureNav links work bidirectionally
- [ ] Mobile responsive at 375px
- [ ] Incognito test: first card loads in < 2 seconds
- [ ] WCAG AA color contrast
- [ ] Affiliate URLs open in new tab with campaign tracking

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Tour Roulette | **Code complete** |
| 2 | Right Now Somewhere | **Code complete** |
| 3 | The World's Most ___ | **Code complete** |
| 4 | Six Degrees of Anywhere | Planned |
| 5 | Cross-feature polish, deploy | Planned |
| 6 | iOS app | Planned |
