# Current State

---
**Last Updated**: February 28, 2026
**Purpose**: Project context for new Claude Code sessions
**What's Next**: See NOW.md
---

**Phase**: Consumer Web App | **Status**: Pre-development (architecture discussion)

---

## What Happened

TourGraph started as AI-powered supply-side infrastructure for the tours & experiences industry — extracting structured data from operator websites and making it queryable by AI agents via MCP.

After thorough competitive validation in February 2026, that thesis was killed. Peek, TourRadar, Magpie, and Expedia all have live MCP servers. The "nobody is building this" claim was factually wrong.

**The pivot**: A zero-friction consumer site and iOS app that makes people smile using the world's tour data. Four features (Tour Roulette, Right Now Somewhere, The World's Most ___, Six Degrees of Anywhere) filtered through four pillars (Zero Friction, Instant Smile, Effortlessly Shareable, Rabbit Hole Energy).

Full analysis: `docs/thesis_validation.md`
Full product vision: `docs/product_brief.md`

---

## What Exists

### Working Assets
- Viator Partner API key (Basic tier, production, tested)
- tourgraph.ai domain (owned, DNS configured — currently points to GitHub Pages)
- DigitalOcean hosting (existing droplets at ~$6/mo)
- CLAUDE.md rewritten for new direction

### Archived (Phase 0 Work)
All Phase 0 extraction work preserved in `archive/`:
- 83 products extracted across 7 Seattle operators (95% accuracy)
- Viator API comparison scripts with working call patterns
- OCTO-aligned schema, extraction prompts, scorecards
- MkDocs site content, blog post, strategy docs
- Full history in `archive/CHANGELOG.md`

---

## What's Next

1. Architecture discussion (Next.js structure, caching, deployment)
2. Tour Roulette — the core loop (Phase 1)
3. Ship all four features on web
4. iOS app

---

**For more details**: See NOW.md | CLAUDE.md | docs/product_brief.md
