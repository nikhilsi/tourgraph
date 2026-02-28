# NOW - Current Focus & Next Steps

---
**Last Updated**: February 21, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built, docs/roadmap.md for the build plan
---

**Phase**: 0 Complete → Phase 1 In Progress

---

## Recently Completed

- Phase 0 extraction: 83 products across 7 operators, 95% accuracy, zero pricing hallucinations
- Viator API comparison: 3/7 on Viator (10 products), 4/7 Path A exclusive
- MkDocs Material site live at [tourgraph.ai](https://tourgraph.ai) with blog, docs, and landing page
- Logo, favicon, social preview card, GitHub repo preview all set up
- **Phase 1A data audit**: audited all 83 products, found 40% are stubs (title + URL only) — directly correlated with how many pages were scraped per operator
- **Data acquisition research** (`docs/data_acquisition_research.md`):
  - Crawling landscape: Crawl4AI (free, self-hosted) as Firecrawl alternative; Firecrawl `/map` for URL discovery (1 credit)
  - Booking system APIs: Peek Pro has OCTO API (accessible), Bookeo has open REST API, FareHarbor requires $50K volume (blocked), Gatemaster has no API (dead end)
  - Viator Full Access (free upgrade) unlocks real-time availability, reviews, bulk ingestion
  - OCTO standard: build one client → connect Peek, RocketRez, Ventrata, and 130+ others
  - Multi-path architecture designed: Path A (extraction) + Path B (booking APIs) + Path C (Viator) with field-level merge

---

## Next Priority

**Waiting on Yuvraj's feedback** on data acquisition strategy doc before committing to Phase 1A implementation approach.

Likely next steps (pending alignment):

1. **Upgrade Viator to Full Access** — free, unlocks real-time availability + reviews for 3 operators
2. **Fix extraction stubs** — use Firecrawl `/map` or Crawl4AI for URL discovery, re-scrape ~21 missing detail pages
3. **Merge Viator data** — combine reviews, images, structured pricing for Tours NW, Evergreen, Argosy
4. **Build OCTO client** — develop against Ventrata sandbox, then connect Peek Pro for Evergreen Escapes
5. **Normalize into SQLite** — load merged multi-path data

See [docs/data_acquisition_research.md](docs/data_acquisition_research.md) for the full strategy and rationale.

---

## Publishing Track

- [x] Article 1 published on tourgraph.ai
- [ ] LinkedIn teaser post (scheduled for Tue Feb 24)
- [ ] Article 2 planning (discovery pipeline — what happens when you try to find every tour operator in a city)

## Backlog

1. **Schema v0.2** — add `productStatus` enum, `departureCity`, `operatorDiscounts[]`
2. **Prompt v02** — address discount programs, tier pricing extraction
3. **Operator dashboard** — claim/review/edit listings (Phase 2)
4. **Path B research** — FareHarbor/Peek Pro API access requirements ✅ Done (see data_acquisition_research.md)

---

## Reminders

- Firecrawl credits: ~218 remaining on free tier
- Claude Opus 4.6 is the extraction model ($1.18/operator average)
- Viator production API key active (Basic Access — upgrade to Full is free)
- Google Places API — need to scope request volume and pricing
- All extraction data on disk in `results/`
- Ventrata EdinExplore sandbox available for OCTO development (free)

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | docs/data_acquisition_research.md | docs/strategy.md
