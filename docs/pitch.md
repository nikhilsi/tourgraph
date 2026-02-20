# TourGraph — Pitch & Positioning

**Last Updated**: February 20, 2026
**Domain**: [tourgraph.ai](https://tourgraph.ai)
**GitHub**: [github.com/nikhilsi/tourgraph](https://github.com/nikhilsi/tourgraph)
**Purpose**: Product positioning, elevator pitches, and founder background.

---

## Why This Project Exists

This project serves three outcomes:

1. **Founder credibility** — Demonstrates strategic thinking and execution ability across technology, product, and market analysis
2. **Published thought leadership** — Fuels a LinkedIn article series that builds visibility in the travel tech space
3. **Potential product** — If validated with real operators, could become a real SaaS business

Either outcome is a win. Product → potential company. Thought leadership → industry visibility and a published article series that demonstrates deep expertise.

---

## The Pitches

### One-Liner

TourGraph is AI-powered distribution infrastructure that makes tour operator inventory visible and bookable across AI agents, OTAs, and Google — simultaneously.

### One-Sentence

*"I built a tool that takes a tour operator's website and makes their inventory discoverable by AI agents — solving the same supplier onboarding problem I tackled at Expedia, but with AI and for the agentic era."*

### 30-Second Version

I'm building TourGraph — a platform that takes tour operator inventory trapped on messy websites and makes it available everywhere: AI booking agents, OTAs like Expedia and GetYourGuide, and Google Things to Do. It uses AI to extract structured data from operator websites, normalizes it to the OCTO industry standard, and distributes it to multiple channels simultaneously. The tours and experiences market is $250-400 billion, 70% of it is invisible online, and nobody's building the supply-side infrastructure. I've already proven the extraction layer works — 83 products across 7 real operators, 95% accuracy.

### Full Pitch

I'm building TourGraph — it's a platform that solves a big emerging problem in travel. Right now, when you ask ChatGPT or Claude to plan a trip, they can't actually see what local tour companies offer. All that inventory is trapped on messy websites as unstructured text and photos. The tours and experiences market is $250-400 billion, but 70% of it is invisible online — and completely invisible to AI.

TourGraph has three layers. First, an AI extraction engine that reads operator websites and pulls out structured data — prices, schedules, inclusions, group sizes, cancellation policies. Second, a normalization layer that transforms that data into an industry standard called OCTO, so it's clean and consistent regardless of whether it came from a whale watching company or an escape room.

Third is the distribution layer — and this is where it gets big. Once operator inventory is structured and normalized, TourGraph can push it to multiple channels simultaneously. An MCP server so AI agents like Claude and ChatGPT can directly search and book tours. OTA adapters so operators can list on Expedia and GetYourGuide without the usual months of manual onboarding. A Google Things to Do feed — only 25% of operators are connected to Google's tours platform today, mostly because they can't format the data. And an embeddable widget for the operator's own website. One extraction, multiple distribution channels.

Nobody's building this. Everyone's building the AI agents — the demand side. Nobody's building the supply-side infrastructure that feeds those agents and these platforms. Viator distributes to the human web. TourGraph distributes everywhere — including the AI-agent channel that doesn't exist yet.

I've already proven the extraction layer works — 83 products across 7 real Seattle operators, 95% accuracy, zero pricing hallucinations — and I just bought tourgraph.ai.

---

## Why I'm Uniquely Positioned

This project sits at the intersection of:

- **Expedia experience** — Reduced supplier onboarding from 180 to 35 days. Deep understanding of the platform side.
- **Platform integration at scale** — Built VRBO-Expedia integration saving $45M. Knows how to connect systems.
- **AI building experience** — Built ScreenTrades.ai (AI-powered trading analysis platform) using the exact tech stack this requires.
- **Tours/experiences domain** — Domain knowledge from Expedia's experiences division.
- **Industry timing** — Agentic AI distribution is the #1 topic in travel tech. Everyone's talking about it. Few are building for the supply side.

### Network Relevance

| Company | Connections | Why It's Relevant |
|---------|------------|-------------------|
| Expedia Group | 44 (including VPs) | B2B grew 24% last quarter; Rapid API ecosystem; acquired Tiqets for experiences |
| Amazon/AWS | 74 | Alexa Plus travel; AWS travel architectures; agentic commerce |
| Google | 27 (including VPs) | Building agentic booking into AI Mode with travel partners |
| Microsoft | 131 | Amadeus/Teams travel agent; Copilot travel integrations |
| T-Mobile | 27 | Less direct, but platform consolidation experience resonates |

---

## What Makes This Different from Just Building an MCP Demo

A standalone MCP demo says: "Look, I can connect an API to an AI agent." That's technically interesting but not strategically compelling. Any senior engineer could do it.

This project says: "I identified a structural industry problem (supply-side fragmentation), connected it to an emerging technology shift (agentic distribution), and built a solution that addresses both — informed by my direct experience on both the platform side (Expedia) and the operator side."

The difference isn't the code. **The difference is the thinking.** The code is evidence of the thinking.

### Insights From Building

The most valuable outcome isn't the tool itself — it's the insights you gain from building it. Things like:

- Where does AI extraction break down? (Messy websites, inconsistent pricing, seasonal variations)
- What data do operators not realize they need to provide? (Accessibility info, cancellation policies, real-time availability)
- Why can't you just scrape and go? (Trust issues — operators want to review before anything goes live)
- What's actually hard about making inventory AI-agent-ready? (Dynamic pricing, booking confirmation, refund handling)
- Where does the standardization dream hit reality? (Every operator structures their business differently)

**None of those insights appear in any consulting deck.** They only come from building.

---

## Due Diligence

### What's Built (Phase 0 Results)

- Extraction pipeline: Firecrawl `/scrape` + Claude Opus + domain-specific OCTO-aligned prompts
- 7 operators tested (tours, cruises, escape rooms) — 83 products extracted
- ~95% core field accuracy, zero pricing hallucinations
- 5 booking platforms detected, 6 cross-operator bundles discovered
- Viator API comparison: 3/7 on Viator (10 products), 4/7 extraction-exclusive — paths are complementary
- Total cost: $8.28 for all 7 operators
- Go/no-go decision: GO — all 6 success criteria met

### Key Questions & Answers

**"How do you solve cold start?"**
The Google Maps model — discover operators programmatically (Google Places API, Viator API, DMO directories), extract from public websites without asking permission, build the inventory first, then operators claim their listings. See `strategy.md`.

**"What's your moat?"**
The aggregated dataset (no one else combines extraction + OTA APIs + directories), the long tail (operators not on any OTA), zero-friction onboarding model, and first-mover on the AI-agent distribution channel. Honest: moat is thin at inception, strengthens with scale. See `strategy.md`.

**"Why won't Expedia do this?"**
They make money on commission from bookings on expedia.com. Making inventory available to Claude and ChatGPT doesn't help Expedia's bottom line — it helps their competitors. Their cost structure doesn't support long-tail operators. And they move slowly (180 → 35 days took years).

**"Is there product-market fit?"**
TBD — Phase 3 validation. But the distribution gap is real (no AI-agent channel for tours exists), the long tail is confirmed (4/7 test operators aren't on Viator), and operator incentive exists (Viator markup is 10-17% higher than direct pricing).

---

## Potential Concerns

**"Will this clash with Expedia?"**
No — complementary. Expedia wants more structured supply. This helps operators get structured. Anyone evaluating this from the Expedia side would see it as understanding their ecosystem.

**"Will operators be suspicious?"**
Some will. That's fine — only need 3-5 who are curious for validation. Local, in-person, offering something free = much higher hit rate than cold outreach.

**"Is the data access moat defensible?"**
Honestly, not deeply — at inception. The technology is reproducible. The moat comes from the dataset scale, operator relationships, and being the standard that AI agents integrate with. First-mover advantage in a nascent channel.

---

*For the project proposal (shareable), see `project_proposal.md`. For strategic analysis and roadmap, see `strategy.md`.*
