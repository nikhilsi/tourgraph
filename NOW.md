# NOW - Current Focus & Next Steps

---
**Last Updated**: February 17, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built
---

**Phase**: 0 — Feasibility Spike | **Status**: Extraction Complete

---

## Recently Completed

- Ran all 7 operators through Path 2 extraction (Firecrawl `/scrape` + Claude Opus 4.6)
- 83 products extracted, 7 scorecards written, zero pricing hallucinations
- Cross-operator scoring matrix and Phase 0 summary report produced
- **Go/no-go recommendation: GO** — all 6 success criteria met

---

## Next Priority

**Review Phase 0 results and decide: GO to Phase 1?**

Read: `results/phase0_summary/phase0_report.md`

---

## Deferred / Backlog

1. **Viator API comparison (Step 3)** — sign up at viator.com/partners, query for overlapping operators, produce Path A vs Path C comparison. Will produce `results/comparisons/path_a_vs_path_c.md`.
2. **Commit & push** all Phase 0 extraction results and reports
3. **CHANGELOG.md** update for Phase 0 completion
4. **Schema v0.2** — add `productStatus` enum, `departureCity`, `operatorDiscounts[]` (recommendations in report)
5. **Prompt v02** — address discount programs, tier pricing extraction
6. **Phase 1 planning** — auto-discovery, scoring automation, Path C integration, production packaging

---

## Reminders

- Firecrawl credits: ~218 remaining on free tier
- Claude Opus 4.6 is the extraction model ($1.18/operator average)
- All extraction JSONs and scorecards are on disk in `results/`
- Ground truth for all operators is in `docs/phase0_spike.md`

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | CLAUDE.md | docs/
