# TourGraph

## AI-powered supplier onboarding for the tours & experiences industry

TourGraph extracts structured inventory data from tour operator websites and makes it queryable by AI agents — bridging the gap between the $250-400B experiences market and the emerging agentic travel booking channel.

---

## The Problem

Two converging industry problems create one opportunity:

**Supplier onboarding is broken.** Tour operators manually list inventory on every platform (Viator, GetYourGuide, Expedia) separately. It takes 30-180 days. It's error-prone. And it excludes the long tail of small operators entirely. Only 30% of the tours & experiences market is sold online.

**AI agents can't find tour inventory.** 42% of travelers used AI for trip planning in 2025. Google, Amazon, and Microsoft are building agentic booking. But most tour inventory lives on operator websites as unstructured HTML — invisible to AI agents.

If you're going to help operators get structured anyway, **why not make their inventory AI-agent-ready from day one?**

---

## What We've Proven (Phase 0)

We ran a feasibility spike across 7 real Seattle-area tour operators — from walking tours to harbor cruises to escape rooms:

| Metric | Result |
|--------|--------|
| **Products extracted** | 83 across 7 operators |
| **Core field accuracy** | ~95% |
| **Pricing hallucinations** | Zero |
| **Booking platforms identified** | 5 distinct systems |
| **Cross-operator bundles found** | 6 |
| **Total cost** | $8.28 Claude API + 37 Firecrawl credits |

The extraction pipeline uses [Firecrawl](https://firecrawl.dev) for web fetching and Claude API with domain-specific, OCTO-aligned prompts for structured data extraction.

We also compared against Viator's API: only 3 of 7 operators were listed on Viator (10 products vs. our 83). The long tail — operators not on any OTA — is bigger than expected.

**Verdict: GO for Phase 1.**

[Read the full Phase 0 report](https://github.com/nikhilsi/tourgraph/blob/main/results/phase0_summary/phase0_report.md){ .md-button }
[View on GitHub](https://github.com/nikhilsi/tourgraph){ .md-button .md-button--primary }

---

## How It Works

```
Operator Website (HTML/JS)
        │
        ▼
Firecrawl /scrape ─── fetch, render JS, strip to clean markdown
        │
        ▼
Claude API ───────── domain-specific OCTO-aligned prompt
        │
        ▼
Structured JSON ──── queryable, comparable, bookable
```

The pipeline handles diverse experience types — guided tours, harbor cruises, escape rooms, wine tours, photo tours — using a single OCTO-aligned schema and domain-specific extraction prompt.

---

## What's Next

| Phase | Goal | Status |
|-------|------|--------|
| **Phase 0: Spike** | Can AI extract structured tour data reliably? | **Complete** |
| Phase 1A: Data Audit | Normalize extracted data, load into SQLite | Next |
| Phase 1B: MCP Server | AI-agent-queryable inventory via MCP | Planned |
| Phase 1C: Discovery | Programmatic operator discovery + scale extraction | Planned |
| Phase 2: Product | Operator dashboard, distribution connectors | Planned |
| Phase 3: Validation | Real operator feedback, go/no-go | Planned |

[Full roadmap with rationale](roadmap.md){ .md-button }

---

## Writing

We're documenting the entire journey — what works, what breaks, and what we learn along the way.

- [**I Asked AI to Plan My Mediterranean Cruise. It Confidently Made Everything Up.**](blog/making-tour-inventory-ai-agent-ready) — What happened when we tried to extract structured tour data from 7 real operator websites using AI.

---

## Get Involved

TourGraph is open source under the MIT License.

- [GitHub Repository](https://github.com/nikhilsi/tourgraph)
- [Project Proposal](project_proposal.md)
- [Roadmap](roadmap.md)
- [Strategy](strategy.md)
