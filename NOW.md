# NOW - Current Focus & Next Steps

---
**Last Updated**: February 18, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built, docs/strategy.md for roadmap rationale
---

**Phase**: 0 Complete → Phase 1 Next

---

## Recently Completed

- Phase 0 extraction: 83 products across 7 operators, 95% accuracy, zero pricing hallucinations
- Viator API comparison: 3/7 on Viator (10 products), 4/7 Path A exclusive
- Strategic direction set: discovery-first approach, MCP pulled forward (see `docs/strategy.md`)
- Docs restructured: proposal (shareable) / strategy (roadmap + risk) / pitch (positioning)

---

## Next Priority

**Phase 1: Discovery + Scale + MCP**

See `docs/strategy.md` for full rationale.

### Phase 1A: Discovery Pipeline (1-2 weeks)
- Google Places API → find all tour/activity operators in Seattle
- Viator API destination search → find all Viator-listed operators
- DMO directories → Visit Seattle operator listings
- Deduplicate, build master operator list with websites
- **Goal:** 50-100+ operators discovered programmatically. Cold start answered.

### Phase 1B: Extraction at Scale (1-2 weeks)
- Run Path A extraction on all discovered operators
- Run Path C enrichment for Viator overlaps
- PostgreSQL storage (graduate from JSON files)
- **Goal:** Comprehensive Seattle tour inventory.

### Phase 1C: MCP Server (1-2 weeks)
- MCP server on top of the inventory
- Tools: `search_tours`, `get_details`, `filter_by_type`, `search_by_area`
- **Goal:** Claude can query real Seattle tours. The demo moment.

---

## Backlog

1. **Schema v0.2** — add `productStatus` enum, `departureCity`, `operatorDiscounts[]`
2. **Prompt v02** — address discount programs, tier pricing extraction
3. **Operator dashboard** — claim/review/edit listings (Phase 2)
4. **Article series** — start writing during/after Phase 1 (see `docs/strategy.md`)
5. **Path B research** — FareHarbor/Peek Pro API access requirements

---

## Reminders

- Firecrawl credits: ~218 remaining on free tier
- Claude Opus 4.6 is the extraction model ($1.18/operator average)
- Viator production API key active (Basic Access)
- Google Places API — need to scope request volume and pricing
- All extraction data on disk in `results/`

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | docs/strategy.md
