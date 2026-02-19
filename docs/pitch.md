# TourGraph — Project Pitch

**Last Updated**: February 17, 2026
**Domain**: [tourgraph.ai](https://tourgraph.ai)
**GitHub**: [github.com/nikhilsi/tourgraph](https://github.com/nikhilsi/tourgraph)

---

## One-Liner

TourGraph is AI-powered distribution infrastructure that makes tour operator inventory visible and bookable across AI agents, OTAs, and Google — simultaneously.

---

## 30-Second Version

I'm building TourGraph — a platform that takes tour operator inventory trapped on messy websites and makes it available everywhere: AI booking agents, OTAs like Expedia and GetYourGuide, and Google Things to Do. It uses AI to extract structured data from operator websites, normalizes it to the OCTO industry standard, and distributes it to multiple channels simultaneously. The tours and experiences market is $250-400 billion, 70% of it is invisible online, and nobody's building the supply-side infrastructure. I've already proven the extraction layer works — 83 products across 7 real operators, 95% accuracy.

---

## Full Pitch

I'm building TourGraph — it's a platform that solves a big emerging problem in travel. Right now, when you ask ChatGPT or Claude to plan a trip, they can't actually see what local tour companies offer. All that inventory is trapped on messy websites as unstructured text and photos. The tours and experiences market is $250-400 billion, but 70% of it is invisible online — and completely invisible to AI.

TourGraph has three layers. First, an AI extraction engine that reads operator websites and pulls out structured data — prices, schedules, inclusions, group sizes, cancellation policies. Second, a normalization layer that transforms that data into an industry standard called OCTO, so it's clean and consistent regardless of whether it came from a whale watching company or an escape room.

Third is the distribution layer — and this is where it gets big. Once operator inventory is structured and normalized, TourGraph can push it to multiple channels simultaneously. An MCP server so AI agents like Claude and ChatGPT can directly search and book tours. OTA adapters so operators can list on Expedia and GetYourGuide without the usual months of manual onboarding. A Google Things to Do feed — only 25% of operators are connected to Google's tours platform today, mostly because they can't format the data. And an embeddable widget for the operator's own website. One extraction, multiple distribution channels.

Nobody's building this. Everyone's building the AI agents — the demand side. Nobody's building the supply-side infrastructure that feeds those agents and these platforms. Viator distributes to the human web. TourGraph distributes everywhere — including the AI-agent channel that doesn't exist yet.

I've already proven the extraction layer works — 83 products across 7 real Seattle operators, 95% accuracy, zero pricing hallucinations — and I just bought tourgraph.ai.

---

## Interview Context

**Why this project exists (the strategic thinking):**
- Two converging problems: supplier onboarding is broken (180 days → still 35 days at Expedia), and AI agents can't find tour inventory
- 42% of travelers used AI for trip planning in 2025; Google, Amazon, Microsoft all building agentic booking
- The industry quote that frames it: "In the agent era, not being machine-readable will be the fastest way to become invisible" (Skift, Dec 2025)

**Why I'm uniquely positioned:**
- Reduced Expedia supplier onboarding from 180 to 35 days — I know the platform side
- Built VRBO-Expedia integration saving $45M — I know platform integration at scale
- Built ScreenTrades.ai (AI-powered trading platform) — I know the AI tech stack
- Tours/experiences domain knowledge from Expedia's experiences division

**What's built (Phase 0 results):**
- Extraction pipeline: Firecrawl `/scrape` + Claude Opus + domain-specific OCTO-aligned prompts
- 7 operators tested (tours, cruises, escape rooms) — 83 products extracted
- ~95% core field accuracy, zero pricing hallucinations
- 5 booking platforms detected, 6 cross-operator bundles discovered
- Viator API comparison: 3/7 on Viator (10 products), 4/7 extraction-exclusive — paths are complementary
- Total cost: $8.28 for all 7 operators
- Go/no-go decision: GO — all 6 success criteria met

**What's next:**
- **Phase 1 (Weeks 2-3):** Auto-discovery of operator pages, Path C enrichment layer (Viator reviews/images), operator review dashboard, FastAPI backend
- **Phase 2 (Weeks 4-5):** MCP server prototype — the first AI-agent-queryable tour inventory
