# NOW - Current Focus & Next Steps

---
**Last Updated**: February 20, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built, docs/roadmap.md for the build plan
---

**Phase**: 0 Complete → Phase 1 Next

---

## Recently Completed

- Phase 0 extraction: 83 products across 7 operators, 95% accuracy, zero pricing hallucinations
- Viator API comparison: 3/7 on Viator (10 products), 4/7 Path A exclusive
- Strategic direction set: discovery-first approach, MCP pulled forward (see `docs/strategy.md`)
- Docs restructured: proposal (shareable) / strategy (roadmap + risk) / pitch (positioning)
- Article 1 written and published: "I Asked AI to Plan My Mediterranean Cruise. It Confidently Made Everything Up"
- MkDocs Material site live at [tourgraph.ai](https://tourgraph.ai) with blog, docs, and landing page
- GitHub Pages deployment via GitHub Actions (auto-deploys on push to main)
- Repo made public under MIT License

---

## Next Priority

**Phase 1A: Data Audit + Normalization**

See [docs/roadmap.md](docs/roadmap.md) for the full phased plan and rationale.

---

## Publishing Track

- [x] Article 1 published on tourgraph.ai
- [ ] Article 2 planning (discovery pipeline — what happens when you try to find every tour operator in a city)

## Backlog

1. **Schema v0.2** — add `productStatus` enum, `departureCity`, `operatorDiscounts[]`
2. **Prompt v02** — address discount programs, tier pricing extraction
3. **Operator dashboard** — claim/review/edit listings (Phase 2)
4. **Path B research** — FareHarbor/Peek Pro API access requirements

---

## Reminders

- Firecrawl credits: ~218 remaining on free tier
- Claude Opus 4.6 is the extraction model ($1.18/operator average)
- Viator production API key active (Basic Access)
- Google Places API — need to scope request volume and pricing
- All extraction data on disk in `results/`

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | docs/strategy.md
