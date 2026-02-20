# TourGraph — Roadmap

**Last Updated:** February 20, 2026
**Purpose:** Single source of truth for TourGraph's build plan. All other docs reference this file.

---

## Guiding Principle

Every phase answers a specific question. The build demonstrates the thinking; the thinking justifies the build.

---

## Phase 0: Feasibility Spike — COMPLETE

**Question:** Can AI extract structured tour data reliably?

**Result:** 83 products across 7 Seattle-area operators, ~95% core field accuracy, zero pricing hallucinations. Total cost: $8.28 Claude API + 37 Firecrawl credits. Viator comparison confirmed 4/7 operators are not on any OTA — the long tail is real.

**Verdict:** GO for Phase 1.

**Deliverables:**
- Extraction pipeline: Firecrawl `/scrape` + Claude with domain-specific OCTO-aligned prompts
- 7 operator scorecards + cross-operator scoring matrix
- Viator API comparison (Path A vs Path C)
- Phase 0 summary report: [phase0_report.md](https://github.com/nikhilsi/tourgraph/blob/main/results/phase0_summary/phase0_report.md)

---

## Phase 1A: Data Audit + Normalization — Next

**Question:** Is the extracted data clean enough to query?

- Audit all 7 operator JSON extractions — field consistency, gaps, nulls
- Normalize to a consistent OCTO-aligned schema
- Identify extraction prompt improvements needed
- Merge Viator data for the 3 overlapping operators (reviews, images, verified pricing)
- Load into SQLite

**Goal:** Clean, queryable dataset from existing Phase 0 output.

---

## Phase 1B: MCP Server

**Question:** Can AI agents meaningfully query tour inventory?

- Build local MCP server on top of normalized data
- Tools: `search_tours`, `get_details`, `filter_by_type`, `search_by_area`
- Test with Claude Desktop — iterate on tool design
- Demo: "I have 4 hours in Seattle with two kids. What should we do?" → real answers from real operators

**Goal:** Claude can query real Seattle tours. The demo moment.

---

## Phase 1C: Discovery + Scale

**Question:** Can we build supply without operator participation?

- Google Places API — find all tour/activity operators in Seattle
- Viator API destination search — find all Viator-listed operators
- DMO directories — Visit Seattle operator listings
- Deduplicate, build master operator list with websites
- Run extraction on discovered operators
- Grow inventory from 7 → 50-100+ operators
- Migrate to PostgreSQL if scale demands

**Goal:** Comprehensive Seattle tour inventory. Cold start validated.

---

## Phase 2: Product

**Question:** Can you build for real users, not just demos?

- Operator dashboard — claim your listing, review/edit extracted data
- Distribution connectors — OTA export adapter, Google Things to Do feed
- Article series continuation

---

## Phase 3: Validation

**Question:** Do real operators find this valuable?

- Show to 3-5 real Seattle operators (in-person)
- Show to 2-3 network contacts at Expedia/Amazon/Google
- Structured feedback on value prop, willingness to pay, missing features
- Go/no-go: portfolio piece or product?

---

## Why This Order

The original plan was Discovery → Scale → MCP. We reordered after Phase 0 because:

1. **The riskiest assumption is the MCP server, not discovery.** Google Places API will find operators — that's well-understood. Whether an MCP server for tour inventory delivers a compelling AI agent experience is unproven.
2. **Existing data is sufficient.** 83 products across 7 diverse operator types is enough to build and validate the query layer.
3. **Avoid premature scaling.** If the MCP demo isn't compelling with 7 operators, discovering 100 more doesn't fix it.
4. **Better story.** Article 2 becomes "I made Claude able to search real tours" instead of "I found 100 operators" — the demo moment is more compelling.

Discovery moves to 1C — once the MCP server proves the concept, then scale the data.

---

*For strategic analysis (moat, competitive landscape, risk), see [strategy.md](strategy.md). For current build status, see [CURRENT_STATE.md](https://github.com/nikhilsi/tourgraph/blob/main/CURRENT_STATE.md).*
