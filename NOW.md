# NOW - Current Focus & Next Steps

---
**Last Updated**: February 18, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built
---

**Phase**: 0 — Feasibility Spike | **Status**: Complete — All 5 Steps Done

---

## Recently Completed

- Ran all 7 operators through Path 2 extraction (Firecrawl `/scrape` + Claude Opus 4.6)
- 83 products extracted, 7 scorecards written, zero pricing hallucinations
- Cross-operator scoring matrix and Phase 0 summary report produced
- **Go/no-go recommendation: GO** — all 6 success criteria met
- Viator Partner API comparison (Step 3) completed:
  - 3/7 operators found on Viator (Tours NW, Evergreen, Argosy) — 10 products total
  - 4/7 operators are Path A exclusive (not on Viator)
  - Path A vs Path C report: `results/comparisons/path_a_vs_path_c.md`
  - Paths are complementary — extraction has 8x coverage, Viator adds reviews/images/pricing

---

## Next Priority

**Phase 1 Planning & Kickoff**

Phase 0 is complete. All 5 steps done, GO recommended. Time to plan Phase 1.

Key Phase 1 workstreams:
1. **Auto-discovery** — crawl operator sitemaps to find product pages automatically
2. **Scoring automation** — programmatic accuracy measurement vs. ground truth
3. **Path C integration** — Viator data as enrichment layer (reviews, images, pricing gap fill)
4. **FastAPI backend** — productionize extraction behind an API
5. **Operator review dashboard** — basic UI for reviewing/editing extracted data

---

## Backlog

1. **Schema v0.2** — add `productStatus` enum, `departureCity`, `operatorDiscounts[]` (recommendations in Phase 0 report)
2. **Prompt v02** — address discount programs, tier pricing extraction
3. **Expand test set** — more Seattle operators, different cities
4. **Path B research** — FareHarbor/Peek Pro API access requirements

---

## Reminders

- Firecrawl credits: ~218 remaining on free tier
- Claude Opus 4.6 is the extraction model ($1.18/operator average)
- Viator production API key active (Basic Access) — sandbox key may need 48hrs to activate
- All extraction JSONs, scorecards, and Viator comparison data are on disk in `results/`
- Ground truth for all operators is in `docs/phase0_spike.md`

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | CLAUDE.md | docs/
