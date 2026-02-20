# TourGraph — Strategy

**Created:** February 18, 2026
**Status:** Draft — actively evolving
**Purpose:** Strategic thinking, competitive analysis, and risk assessment. Living document for product decisions, due diligence, and article source material. For the build plan, see [roadmap.md](roadmap.md).

---

## Strategic Foundation

### What Phase 0 Proved

Seven Seattle operators. 83 products extracted. $8.28 total cost. Three data paths tested.

The results reframed the project:

| Finding | Strategic Implication |
|---------|---------------------|
| 95% extraction accuracy, zero pricing hallucinations | Path A (extraction) works. The technology bet is validated. |
| 4/7 operators not on Viator at all | The long tail is real. Extraction isn't optional — it's the only path for ~40%+ of operators. |
| 83 products (extraction) vs 10 (Viator) for the same operators | Extraction captures 8x more inventory than OTA APIs alone. |
| Paths A and C are complementary | Neither source is sufficient alone. The value is in combining them. |
| Viator prices are 10-17% higher than direct | Operators have a financial incentive to distribute through lower-commission channels. |

### The Core Thesis

Tour operator inventory is trapped in unstructured websites, invisible to AI agents. TourGraph structures it, normalizes it, and makes it queryable — creating the distribution channel that doesn't exist yet.

**The one-sentence version:** TourGraph is the data infrastructure layer between tour operators and AI agents.

---

## The Two Hard Questions

### 1. Cold Start: How do you build supply without operator participation?

**The problem:** Operators won't submit their websites to a platform nobody uses. AI agents won't integrate with a platform that has no inventory. Classic chicken-and-egg.

**The solution: The Google Maps model.**

Google Maps doesn't wait for businesses to submit their information. It aggregates from public sources, builds the listing, and then businesses "claim" their profile. TourGraph does the same:

1. **Discover operators programmatically** — Google Places API, Viator API, DMO directories, tourism board registrations
2. **Extract their data from public websites** — Path A, already proven at $1.18/operator
3. **Enrich with OTA data** — Path C (Viator) for reviews, images, structured pricing
4. **Build the inventory first** — comprehensive, city-wide, without asking permission
5. **Then approach operators** — "We've already structured your data. Come claim and review your listing."

This inverts the cold start. Instead of "submit your website," it's "we already have your data — want to make sure it's right?"

**Discovery sources (Seattle pilot):**

| Source | What it provides | Coverage |
|--------|-----------------|----------|
| Google Places API | Business name, website, category, rating, location | Most comprehensive — any business with a Google listing |
| Viator API (we have this) | Product catalog, supplier names, structured data | ~60-80% of commercial operators |
| Visit Seattle directory | Local operator listings, curated | DMO-vetted operators |
| Yelp API | Business listings, reviews, categories | Good for cross-referencing |
| TripAdvisor Content API | Location-level data, reviews | Enrichment, not discovery |

**Expected yield for Seattle:** 50-150+ tour/activity operators.

### 2. Moat: Why won't Expedia just do this?

**What's NOT a moat (be honest):**
- The extraction technology — anyone can call Claude + Firecrawl
- The Viator API data — anyone can sign up for free
- An MCP server — open standard, any engineer can build one
- The OCTO schema — open industry standard

**What IS the moat (or could become one):**

**A. The aggregated dataset.**
Nobody else combines website extraction + OTA APIs + booking system data + directory listings into one normalized catalog. Viator has their slice. FareHarbor has theirs. Google GTTD has theirs. The operator's website has details none of them capture (promo codes, FAQs, bundles). TourGraph is the first to aggregate ALL sources into one queryable inventory. The combination is the value.

**B. The long tail.**
4/7 test operators aren't on Viator. At scale, ~30-40% of operators aren't on any OTA. Expedia doesn't care about a 2-person walking tour company — the economics don't justify their sales team's time. But AI agents should surface them. These operators are TourGraph-exclusive inventory.

**C. The friction model.**
Even if Expedia could do this, they won't do "we scrape your website and you're live in 30 minutes." Their model requires contracts, content teams, compliance review, account managers. TourGraph's model is zero-friction — structure public data, operator claims later. Fundamentally different go-to-market.

**D. First-mover on a new channel.**
The AI-agent distribution channel doesn't exist yet. Whoever builds the standard inventory source and gets adopted by AI agents first has a network effect: more operators → more comprehensive → AI agents prefer it → more operators want in. Being first matters when the channel itself is nascent.

**E. Why Expedia specifically won't prioritize this:**
- They make money on commission from bookings on expedia.com
- Making operator inventory available to Claude and ChatGPT doesn't help Expedia's bottom line — it helps their competitors
- They're building demand-side AI (chatbots, trip planners), not supply-side infrastructure for other AI agents
- Their cost structure doesn't support long-tail operators ($35/day onboarding cost doesn't work for a $50/tour operator)

**Honest assessment:** The moat is thin at inception. It strengthens with scale (more data, more operators, more AI agent integrations). The window of opportunity is while the AI-agent distribution channel is still being defined — before incumbents decide to build it.

---

## Roadmap

See **[roadmap.md](roadmap.md)** for the full phased build plan. This is the single source of truth for what we're building and in what order.

**Current phase:** 1A — Data Audit + Normalization

---

## Things We Need to Think Through (Not Build)

These are depth-of-thinking topics for interviews, articles, and eventual product decisions. Analysis, not code.

### Legal & Terms of Service
- **Website extraction:** Public websites are publicly accessible. No login required, no terms agreed to. Standard web scraping legal territory. But operators could object — what's the opt-out mechanism?
- **Viator affiliate terms:** Data is meant to drive bookings to Viator, not build a competing distribution channel. Is an MCP server that surfaces Viator data (with booking links to Viator) within terms? Probably yes for Basic Access. Needs legal review at scale.
- **Google Places API terms:** Usage for business discovery is within terms. Storing and redisplaying business data may have restrictions.

### Data Freshness
- Extraction is a snapshot. Operator websites change — prices, seasonal tours, new products.
- Options: periodic re-extraction (weekly? monthly?), change detection on websites, operator self-service updates after claiming.
- Viator data has `/products/modified-since` endpoint (Full Access tier) — incremental updates.
- Freshness tolerance depends on data type: descriptions change rarely, prices change seasonally, availability changes daily.

### Business Model (Eventual)
- **Freemium SaaS:** Free listing + extraction, paid for premium distribution (priority in MCP results, OTA export, analytics).
- **Commission:** Take a cut of bookings that flow through the MCP channel. Simpler alignment with operator value.
- **Affiliate revenue:** Viator affiliate commission on bookings redirected through Path C data. Immediate revenue, no operator payment needed.
- **Enterprise/API:** Charge AI agent companies (or OTAs) for access to the structured inventory API.
- **Hybrid:** Start with affiliate revenue (Viator), layer in operator SaaS as the dashboard matures.

### Viator Dependency Risk
- What if Viator builds their own MCP server? They'd expose their 300K products directly to AI agents.
- **Mitigation:** Path A (long-tail operators not on Viator) is TourGraph-exclusive. The aggregation across ALL sources is the differentiator. Viator's MCP would only serve Viator's inventory.
- **Deeper mitigation:** Build operator relationships (Phase 3). Operators who claim their TourGraph listing and maintain it directly creates a data source independent of any OTA.

### Multi-City Scaling
- Seattle is the pilot. What changes at 10 cities? 100 cities?
- Discovery pipeline is city-parameterized (Google Places API takes location, Viator takes destination ID). Extraction pipeline is city-agnostic.
- The real scaling question is quality — can extraction maintain 95% accuracy across diverse operator website styles globally?
- Prioritization: major US tourist cities first (NYC, SF, LA, Chicago, Miami, Orlando), then international.

### Accuracy & Trust
- Operators need to trust that their extracted data is correct. 95% accuracy means 5% errors.
- The "claim and review" model handles this — operators fix errors when they claim their listing.
- But what about unclaimed listings? AI agents could serve slightly wrong information.
- Possible solution: confidence scores per field, disclaimers on unclaimed listings, periodic re-extraction.

---

## Article Series

Non-negotiable. The journey, learnings, and observations should be documented regardless of product vs. interview outcome.

### Article 1: "I Asked AI to Plan My Mediterranean Cruise. It Confidently Made Everything Up." — PUBLISHED
- **Published:** [tourgraph.ai/blog](https://tourgraph.ai/blog/making-tour-inventory-ai-agent-ready/)
- **Source material:** Phase 0 extraction results, Viator comparison, Mediterranean cruise cold open
- **Key insights:** Where AI extraction works vs. where it fails, why domain-specific prompting matters, the Viator coverage gap, the long tail
- **Angle:** Practical builder's perspective — personal frustration → experiment → findings

### Article 2: "The Cold Start Problem Nobody's Solving in AI Travel"
- **Source material:** Discovery pipeline, cold start analysis
- **Key insights:** Everyone's building the AI agent (demand side). Nobody's building the structured supply. How we discovered and extracted 100+ operators without asking anyone's permission.
- **Angle:** Strategic/contrarian — what the industry is getting wrong

### Article 3: "What Happens When an AI Agent Can Actually Search Tour Inventory"
- **Source material:** MCP server demo, before/after comparison
- **Key insights:** The live demo of Claude querying real Seattle tours. What changes when inventory is machine-readable. The distribution channel that doesn't exist yet.
- **Angle:** Vision piece with working evidence

### Article 4: "From 180 Days to 30 Minutes: Lessons from Expedia to AI-Powered Onboarding"
- **Source material:** Personal Expedia experience + TourGraph results
- **Key insights:** The supplier onboarding problem at scale (lived it). How AI changes the economics. Why the platform companies won't solve this for the long tail.
- **Angle:** Senior leader perspective — thinking AND building

### Publishing Plan
- Platform: LinkedIn (primary distribution) + tourgraph.ai/blog (canonical home)
- Cadence: One article per phase completion (roughly every 2-3 weeks)
- Tone: Opinion-driven with evidence. Builder's perspective, not tutorials.
- Target audience: CTOs, VPs of Engineering, Product leaders

---

## Open Questions

1. **Google Places API pricing** — Free tier gives 200 requests/day. Is that enough for Seattle discovery, or do we need a paid tier? Need to scope the request volume.
2. **MCP adoption** — Which AI agents actually support MCP tool use today? Claude does natively. What about ChatGPT, Gemini? Does the demo need to work across multiple agents?
3. **Operator outreach strategy** — When we reach Phase 3, how do we approach operators? Cold email? In-person? Through the DMO? What's the pitch for claiming their listing?
4. **Legal review** — At what point does scraping operator websites at scale need a formal legal opinion? Before or after public launch?

---

*This is a living document. Updated as strategy evolves through build phases.*
