# Claude Code Development Guide

---
**Last Updated**: February 28, 2026
**Purpose**: Rules and workflow for working with this codebase
---

## Starting a New Session

**Read these docs in order:**

1. **CLAUDE.md** (this file) — Rules & workflow
2. **docs/product_brief.md** — Source of truth for what we're building
3. **CURRENT_STATE.md** — What's built and how it fits together
4. **NOW.md** — What to work on next
5. **`git log --oneline -10`** — Recent commits

**Optional** (if relevant to task):
- **docs/thesis_validation.md** — Why the original thesis was killed (context only)
- **archive/docs/api_landscape.md** — Viator API details, test results, response formats
- **archive/scripts/viator_compare.py** — Working Viator API call patterns

---

## Project Context

TourGraph was originally supply-side infrastructure for tour operators (AI extraction + MCP server). That thesis was invalidated in February 2026 — Peek, TourRadar, Magpie, and Expedia all shipped live MCP servers. Rather than kill the project ($200 invested, Viator API working), we pivoted to something radically different:

**TourGraph.ai is a zero-friction consumer site and iOS app that makes people smile using the world's tour data.**

Not a booking engine. Not a travel planner. Not a recommendation engine. A place you visit because it's fun, surprising, and shareable.

Full product vision: `docs/product_brief.md`
Why we pivoted: `docs/thesis_validation.md`

---

## The Four Pillars

Every feature, design decision, and code commit must pass all four tests. If it doesn't, it's out of scope.

### 1. Zero Friction
No signup, no login, no personal data, no cookies beyond essential function. A stranger lands on the site and is delighted within 5 seconds.

**Test:** Can my mom use this without asking me a single question?

### 2. Instant Smile
Every interaction should brighten someone's day. Warm, witty, wonder-filled — never snarky, cynical, or mean. The goal is "oh wow, I didn't know that existed."

**Test:** Would I text this to a friend just because it made me smile?

### 3. Effortlessly Shareable
Every piece of content has a unique URL and a beautiful Open Graph preview card. The viral loop is: see something delightful -> share it -> friend clicks -> friend is delighted -> friend shares.

**Test:** Does the link preview on iMessage/WhatsApp/Twitter look good enough to tap?

### 4. Rabbit Hole Energy
That "one more click" quality through genuine curiosity, not dark patterns. Wikipedia-style: you came for one thing, 20 minutes later you're somewhere unexpected and loving it.

**Test:** Did I just spend 10 minutes when I meant to spend 30 seconds?

---

## What We're Building

Four features, all shipping before launch. Website first, then iOS app.

### Feature 1: Tour Roulette (Core Loop)
One big button. Press it. Get a random tour from somewhere in the world — weighted toward extremes (highest rated, weirdest, most expensive, cheapest). Photo, title, destination, price, rating, and an AI-generated witty one-liner. Press again.

### Feature 2: Right Now Somewhere...
Time-zone-aware: shows a tour happening (or about to happen) where it's currently a beautiful time of day. "Right now in Kyoto it's 6:47am and you could be doing forest bathing with a Buddhist monk. 4.9 stars."

### Feature 3: The World's Most ___
Daily superlatives from the Viator catalog. Most expensive tour. Cheapest 5-star experience. Longest duration. Each one is a shareable card with photo, stat, and witty caption.

### Feature 4: Six Degrees of Anywhere
Type two cities. The site builds a chain of tours connecting them through surprising thematic links. Visualized as a simple graph (the name finally earns itself).

### What We're NOT Building
- A booking engine (Viator affiliate links handle bookings)
- A travel planning tool (no itineraries, no trip builders)
- A review aggregator
- A social network (no profiles, no followers)
- A recommendation engine (no "based on your history" — it's random, serendipitous)
- Anything that requires user accounts or personal data

---

## Build Order

| Phase | What | Platform | Timeframe |
|-------|------|----------|-----------|
| 1 | Tour Roulette | Web | Week 1 |
| 2 | Right Now Somewhere | Web | Week 1-2 |
| 3 | The World's Most ___ | Web | Week 2 |
| 4 | Six Degrees of Anywhere | Web | Week 2-3 |
| 5 | Polish, OG cards, sharing | Web | Week 3 |
| 6 | Launch website | Web | Week 3 |
| 7 | iOS app (all 4 features) | iOS/SwiftUI | Week 4-5 |
| 8 | App Store submission | iOS | Week 5-6 |

Timeframes are estimates, not commitments. This is supposed to be fun.

---

## Critical Rules

### Non-Negotiables
1. **Unauthorized commits** — NEVER commit without explicit approval
2. **Over-engineering** — KISS always. Ship simple, iterate fast.
3. **Pillar violations** — Every feature/decision must pass all four pillar tests
4. **Not reading the product brief** — `docs/product_brief.md` is the source of truth
5. **Scope creep** — If it's not one of the four features, it's not in scope
6. **Guessing** — Say "I don't know" if unsure
7. **Dark patterns** — No engagement tricks, no manipulative UX, no data harvesting
8. **Premature abstraction** — Don't build frameworks. Build features that work.

### How to Be a True Partner
- **Pillar check first** — Does this pass all four tests?
- **Fun matters** — If the code isn't fun to build, something's wrong
- **One feature at a time** — Complete, review, then proceed
- **KISS principle** — Simple > clever
- **Explicit permission** — Get approval before every commit
- **Challenge bad ideas** — Don't just agree
- **Think sharing** — Every piece of content needs a URL and OG card

---

## Tech Stack

### Website
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend | Next.js (React) | SSR for OG previews, fast, familiar |
| Hosting | DigitalOcean droplet (~$6/mo) | Already have infrastructure there |
| Data | Viator Partner API (Basic tier, free) | Already integrated, 300K+ experiences |
| AI Layer | Claude API | Witty captions, Six Degrees chains |
| Cache | SQLite | Pre-built local index, no API calls at request time |
| Domain | tourgraph.ai | Already owned and configured |

### iOS App (Phase 7-8)
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | SwiftUI | Already proven with GitaVani |
| Architecture | Self-contained (no shared backend) | Simplicity, independence |
| Data | Viator API (direct calls) | Same API, thin caching layer on device |
| AI Layer | Claude API (direct calls) | Same prompts, called from app |
| Local Storage | SwiftData or UserDefaults | Cache tours, favorites, recent spins |

---

## Architecture

```
                    ┌─────────────┐
                    │  tourgraph.ai│  (Next.js on DigitalOcean)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌────────────┐ ┌─────────┐ ┌──────────┐
       │ Viator API │ │ Claude  │ │ SQLite   │
       │ (tours,    │ │ API     │ │ (pre-    │
       │  photos,   │ │ (witty  │ │  built   │
       │  pricing,  │ │  lines, │ │  index)  │
       │  ratings)  │ │  chains)│ └──────────┘
       └────────────┘ └─────────┘
```

User flow: Visit site -> See delightful content -> Share link -> Friend visits -> Repeat

No user accounts. No databases of personal data. Just cached Viator responses + AI-generated captions.

---

## Data We Have (Viator Basic Tier)

- Product search by destination & category
- Product details: title, description, highlights
- Photos: 10-31 CDN-hosted images per product
- Pricing: by age band (adult/child/infant/senior)
- Ratings: star rating + review count (not review text at Basic)
- Duration, schedule, operating hours
- Categories and tags
- Location/meeting points with lat/long
- Attraction associations
- 300,000+ experiences across 3,380+ destinations

**Upgrade path (Full tier, also free, requires certification):** Adds review text, real-time availability, and bulk catalog ingestion.

---

## Design Principles

- **Dark mode default** — feels premium, photos pop
- **Big photos** — tour images do the heavy lifting
- **Minimal UI** — the content is the interface
- **Fast** — every interaction feels instant (pre-fetch, cache, skeleton loaders)
- **Mobile-first** — most sharing happens on phones
- **Playful typography** — not corporate, not childish, just warm

---

## Environment Setup

**Node.js (Next.js):**
```bash
node --version  # 18+ required
npm install     # or yarn/pnpm
npm run dev     # local development server
```

**API Keys** (in `.env.local`):
- `VIATOR_API_KEY` — https://viator.com/partners (Basic Access, free affiliate signup)
- `ANTHROPIC_API_KEY` — https://console.anthropic.com

**Existing Viator integration code:**
The `scripts/viator_compare.py` from Phase 0 has working API call patterns (endpoint URLs, auth headers, response parsing) that can be referenced when building the Next.js API routes. The Viator production API key in `.env` is already tested and working.

---

## Development Standards

### Code Quality
- **TypeScript** for all Next.js code — strict mode, proper types
- **React Server Components** where possible — minimize client JS
- **API routes** for Viator/Claude calls — never expose API keys to the client
- **OG image generation** — every shareable page needs proper meta tags

### Git Workflow
- **Atomic commits** — One logical change per commit
- **Clear messages** — Descriptive, explain the why
- **NO attribution** — Never include "Generated with Claude"
- **Working state** — Every commit leaves the site functional

### Core Principles
1. **Ship fast, iterate** — Working feature > perfect feature
2. **Cache aggressively** — Viator API has rate limits; cache everything
3. **Mobile-first** — Design for phones, enhance for desktop
4. **Share-first** — OG cards and unique URLs are not afterthoughts

---

## Documentation Structure

**Root Level:**
- **CLAUDE.md** — Rules & workflow (this file)
- **README.md** — Project overview
- **NOW.md** — Current priorities
- **CURRENT_STATE.md** — What's built & status
- **CHANGELOG.md** — Version history

**Docs:**
- **docs/product_brief.md** — Product vision (source of truth for what we're building)
- **docs/ux_design.md** — UX design: wireframes, design principles, interaction flows, resolved decisions
- **docs/thesis_validation.md** — Competitive analysis that killed the original thesis

**Archive (Phase 0 — reference only):**
- **archive/scripts/** — Extraction & Viator API scripts (API patterns reusable)
- **archive/results/** — 7 operators, 83 products, scorecards
- **archive/docs/** — Old strategy docs, MkDocs site content, API landscape
- **archive/schemas/** — OCTO extraction schema
- **archive/prompts/** — Domain-specific extraction prompts
- **archive/CHANGELOG.md** — Phase 0 version history

---

## Reusable Assets from Phase 0

| Asset | Location | What's Reusable |
|-------|----------|-----------------|
| Viator API patterns | `archive/scripts/viator_compare.py` | Endpoint URLs, auth headers, response parsing, product search, detail fetching |
| Working API key | `.env` | `VIATOR_API_KEY` (production, Basic tier) |
| Domain | tourgraph.ai | DNS currently points to GitHub Pages — needs re-pointing to DigitalOcean |
| GitHub Actions | `.github/workflows/` | Deployment workflow (needs rewriting for Next.js) |
| OG image approach | Previous MkDocs setup | Meta tag patterns for social sharing |

---

## Key Concepts

- **Viator Partner API** — Our primary data source. 300K+ experiences, free Basic tier. We're affiliates — bookings redirect to Viator and we earn commission.
- **OG Cards** — Open Graph meta tags that create rich previews when links are shared on social platforms. Critical for Pillar 3 (Effortlessly Shareable).
- **Tour Roulette** — The core engagement loop. Random tour discovery, weighted toward interesting extremes.
- **Six Degrees** — The graph feature. AI builds chains of tours connecting any two cities through thematic links. This is where the "graph" in TourGraph earns its name.

---

## Success Metrics (Vibes, Not KPIs)

- Friends texting each other TourGraph links
- Someone at a dinner party saying "have you seen this site?"
- A Reddit post titled "I just lost an hour on this weird tour website"
- The app becoming someone's "bored in line" go-to
- The developer having fun building it
