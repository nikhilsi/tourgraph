# Project Proposal: AI-Powered Supplier Onboarding for the Agentic Travel Era

**Date:** February 15, 2026
**Updated:** February 18, 2026

---

## Executive Summary

Build a tool that lets non-technical tour operators make their inventory visible and bookable by AI agents (Claude, ChatGPT, Google Gemini) in minutes — not months. The tool combines AI-powered data extraction with a standardized distribution layer, solving two problems at once: the slow, manual supplier onboarding process that every travel marketplace struggles with, AND the emerging need for travel inventory to be machine-readable as AI agents become a primary booking channel.

---

## The Problem

### Problem 1: Supplier Onboarding is Broken

Every travel marketplace — Expedia, Booking.com, GetYourGuide, Viator, Klook — needs suppliers (tour operators, activity providers, attractions) to list their inventory on the platform. Today this process is:

- **Slow:** At Expedia, onboarding a new lodging supplier used to take 180 days. Even after optimization, it's 35 days. For tours/experiences, it's similarly painful.
- **Manual:** Operators fill out forms, upload photos, set pricing, configure availability — often on every platform separately.
- **Error-prone:** Inconsistent descriptions, wrong pricing, availability conflicts across channels.
- **Excludes small operators:** A family-run walking tour company doesn't have the time or technical knowledge to manage listings on 5 different OTA platforms.

The result: the tours & experiences market is $250-400 billion, but only 30% is sold online. The supply side is massively underserved.

### Problem 2: AI Agents Are Becoming a New Booking Channel

A fundamental shift is happening in travel distribution right now:

- **42% of travelers used AI tools for trip planning in 2025** (Amadeus research)
- **Google is building agentic AI booking** directly into AI Mode search
- **Amazon Alexa Plus** now supports voice-based travel booking
- **Microsoft partnered with Amadeus** to put a travel booking agent inside Teams
- **Expedia, Booking.com, and Marriott** are all building for AI-agent distribution
- **Turkish Airlines** has already launched an MCP server for live airline data

The industry term for this shift is "agentic AI" — AI that doesn't just suggest things but actually searches inventory, compares options, and completes bookings on the user's behalf.

**The catch:** Most travel inventory wasn't built for AI agents to consume. It was built for humans clicking through websites. Tour operators have websites with pretty photos and text descriptions — but no structured data that an AI agent can query, compare, and book from.

As Skift (the leading travel industry publication) put it in December 2025: *"In the agent era, not being machine-readable will be the fastest way to become invisible."*

### The Convergence

These two problems converge into one opportunity: **If you're going to help a tour operator get their inventory online anyway, why not make it AI-agent-ready from day one?**

---

## Competitive Landscape

**Nobody is building this specific combination.** The market has:

- **AI travel agents** (consumer-facing trip planners) — crowded, demand-side
- **Tour operator software** (Turpal, TourConnect, FareHarbor) — booking management, not AI-readiness
- **Channel managers** (HyperGuest) — traditional B2B distribution for hotels, not tours
- **Booking dynamic pricing** (Booko, YC-backed) — adjacent but different problem

The specific intersection — **supply-side onboarding automation + AI-agent distribution readiness for tours/experiences** — appears to be unoccupied. Everyone is building the AI agent (demand side). Almost nobody is building the infrastructure that makes supply discoverable by those agents.

### Existing Industry Standards

There have been efforts to standardize tour/experience data — but they've solved the wrong half of the problem:

- **OCTO (Open Connectivity for Tours, Activities & Attractions)** — The most relevant standard. An open-source API specification defining schemas and endpoints for booking, ticketing, and product definition in the experiences sector. Adopted by some channel managers and OTAs. Defines how structured data should look when exchanged *between* systems.
- **Schema.org Tourism Types** — W3C community group extensions (since 2015) for TouristAttraction, TouristDestination, and TouristTrip. Useful for SEO markup but thin — no pricing, availability, or booking details.
- **OpenTravel Alliance** — Comprehensive travel data standard since 2001 covering airlines, hotels, car rental, and tours. Enterprise-focused, XML-heavy. No small operator will ever implement it directly.

**The insight:** Standards exist for how systems talk to each other. Nobody has solved how to get operator data *into* those systems in the first place. OCTO defines what a well-structured tour listing should look like — but the walking tour company in Pioneer Square has a WordPress site and a phone number, not an OCTO-compatible API. The gap isn't the standard. The gap is getting unstructured, real-world data into any standard at all. That's exactly what TourGraph does.

**Strategic implication:** Our normalization layer should target OCTO-compatible output where possible. "We extract your data and normalize it to the industry standard" is a stronger pitch than a proprietary format — and it shows deep ecosystem understanding.

### Is MCP Real?

Yes. This is not web3. Key differences:

- **The underlying need is real:** AI agents need to connect to external data. That's not hypothetical.
- **Adoption is broad:** OpenAI, Google DeepMind, and Anthropic all support MCP. AWS, GitHub, Notion, Figma, Slack have built MCP servers.
- **MCP market expected to reach $1.8B in 2025** with enterprise adoption accelerating in 2026.
- **MCP is in the "real adoption" phase** — past initial hype, into production-grade usage.

Even if MCP evolves or gets competition from alternative standards, the problem it solves isn't going away. Skills and thinking transfer.

### Channel Manager API Landscape

Every major booking platform in the tours/experiences space has an API — but they're all gated behind partner/affiliate approval:

| Platform | Owner | API Access | Notable |
|----------|-------|-----------|---------|
| FareHarbor | Booking.com (since 2018) | Approved affiliates/partners only | REST API: companies, items, availabilities, bookings |
| Peek Pro | Independent | Partner/reseller access | Built on OCTO spec; Peek is founding OCTO committee member |
| Rezdy/Checkfront | Independent (merged 2023) | Expansion plan ($249/mo) | Three APIs: Agent, Supplier, RezdyConnect |
| Bókun | Tripadvisor (since 2018) | Partner access | Built-in Viator/GetYourGuide distribution |

**Key ownership insight:** The two biggest OTAs in experiences each own a channel manager — Booking.com owns FareHarbor, Tripadvisor owns Bókun. They bought the supply pipeline. Independent platforms (Peek, Rezdy) are the remaining alternatives.

**What this means:** Structured tour data already exists *inside* these booking platforms. The problem isn't that the data doesn't exist — it's that (a) it's locked behind partner agreements, and (b) none of these platforms expose inventory to AI agents via MCP or any agentic protocol.

### Three Paths to Structured Inventory

Research reveals three complementary paths for TourGraph to acquire structured tour/experience data:

**Path A — AI Extraction (core innovation):** Scrape public operator website → AI extracts → structured data. Works for ANY operator regardless of their booking system. Handles the long tail of operators who aren't on any OTA.

**Path B — Channel Manager Integration:** For operators already on FareHarbor, Peek, Rezdy, etc., the structured data already exists. With API access, pull it directly — no AI extraction needed. **Limitation:** All major channel manager APIs are gated behind partner/affiliate approval.

**Path C — OTA Affiliate APIs (bootstrapping shortcut):** Viator's Partner API provides free, immediate access to structured product data for 300,000+ experiences globally. Basic affiliate access requires no approval, no minimum traffic, and no cost. Product data includes descriptions, pricing by age band, product options/variants, availability schedules, reviews, photos, cancellation policies, and location details. GetYourGuide has a similar API (traffic-gated) with an open-source spec on GitHub.

**What Path C changes strategically:**

Path C means TourGraph doesn't have to extract data from websites OR negotiate channel manager access to cover ~80% of commercial operators. The data already exists in a queryable API. This could dramatically accelerate time-to-value:

| Path | Coverage | Access | Speed | Unique Value |
|------|----------|--------|-------|-------------|
| A — AI Extraction | 100% (any operator with a website) | No permission needed | Slow (build extraction engine first) | Handles undiscovered / non-OTA operators |
| B — Channel Manager APIs | ~70% of digitized operators | Partner approval required | Medium (negotiate access) | Direct, real-time, operator-authorized |
| C — OTA Affiliate APIs | ~80% of commercial operators | Free (Viator basic) | Fast (sign up and query) | Immediate structured data, no extraction |

**The critical limitation of Path C:** Viator's affiliate terms require that bookings redirect to Viator or occur through their transactional API. You can't simply take their data and build a competing distribution channel. The data is meant for merchandising on your platform → driving traffic/bookings to Viator.

**How the three paths work together:**

- **Path C (Viator API)** as the bootstrap layer — immediately populate the MCP server with structured inventory for operators already on Viator. Bookings flow through Viator. This gets TourGraph live fast.
- **Path A (AI Extraction)** as the differentiation layer — handle operators NOT on Viator: the small walking tour company, the new escape room, the local food tour that only has a WordPress site. This is the long-tail inventory that AI agents would uniquely surface. Path A becomes the competitive moat.
- **Path B (Channel Manager APIs)** as the premium layer — for operators who want direct booking without Viator's commission, integrate with their booking system directly. Higher value, requires operator participation and API access.
- **MCP distribution layer** on top of ALL three — regardless of how data arrives, the AI-agent interface is the same.

**The strategic insight:** Even Path C still needs the MCP layer on top. Viator has the structured data. Viator distributes to human-browsing channels (TripAdvisor, Booking.com, Expedia, travel agents). Viator does NOT distribute to AI agents. The MCP layer is the unique value regardless of which path feeds it.

### The Complete Distribution Pipeline

Research across Seattle operators reveals how tour inventory currently flows:

```
Operator → Booking System → Viator → TripAdvisor + Booking.com + Expedia + 4,000 affiliates
                         → Google GTTD (via connectivity partner)
                         → Direct website bookings
                         → [MISSING] AI Agents (Claude, ChatGPT, Gemini, etc.)
```

Every operator in the test set follows this pipeline. The booking systems (FareHarbor, Peek, RocketRez, Gatemaster) all integrate with Viator. Viator distributes to TripAdvisor + OTA network. Google GTTD is a newer channel (~25% adoption). **The AI agent channel does not exist.** That's TourGraph.

### Real-World Validation: Shutter Tours

To ground this analysis, one specific Seattle operator (Shutter Tours) was traced through the entire distribution chain:

- **Website:** shuttertours.com — marketing content, tour descriptions, photos. Unstructured.
- **Booking system:** FareHarbor — handles actual bookings, availability, pricing. Structured data lives here.
- **OTA distribution:** Already listed on Viator (TripAdvisor) and Expedia. Refund policy explicitly mentions both.
- **AI-agent distribution:** None. No MCP endpoint. No structured data accessible to Claude, ChatGPT, or any AI agent.

This one example validates the entire thesis: the data is structured inside FareHarbor, distributed to legacy OTAs, but invisible to the emerging AI-agent distribution channel.

### OpenAI / OpenClaw

OpenAI acquired OpenClaw (Feb 15, 2026) — the fastest-growing open-source AI agent framework (188K GitHub stars). **This validates the project, not threatens it.** OpenClaw is the agent (demand side). TourGraph makes supply available to agents like OpenClaw. The more powerful agents become, the more urgent the need for structured, AI-ready inventory.

---

## The Solution

### Component 1: Discovery Engine

**What it does:** Programmatically finds tour operators and activity providers in a target market — without any operator submitting anything.

**How it works:** Google Places API for business discovery, Viator API for existing OTA listings, DMO directories for local coverage. Deduplicates across sources, builds a master operator list with websites.

**Why this matters:** Solves the cold start problem. TourGraph doesn't wait for operators to come to it — it finds them. The Google Maps model: aggregate first, operators claim later.

### Component 2: AI-Powered Extraction Engine

**What it does:** Takes a tour operator's existing, messy, unstructured data and converts it into clean, structured inventory.

**How it works:**

- **Website extraction:** Operator's website URL → Firecrawl fetches and renders → Claude extracts structured data using OCTO-aligned schema and tourism-domain prompts → normalized JSON output.
- **Document upload (future):** Operator uploads brochures, PDF catalogs, or spreadsheets. Same extraction process.
- **Conversational setup (future):** Operator answers questions in a guided flow. The AI builds the inventory through conversation.

**The key insight:** The operator doesn't need to learn any new tools or fill out complex forms. Their public website is the input. AI does the structuring.

### Component 3: Data Aggregation & Normalization Layer

**What it does:** Combines data from all three paths (extraction, booking system APIs, OTA APIs) into one normalized, OCTO-aligned inventory.

**Standards alignment:** The normalization layer targets OCTO (Open Connectivity for Tours, Activities & Attractions), the existing open-source industry standard for tour/experience data exchange. Normalizing to OCTO means operator data is immediately compatible with any system that already speaks OCTO.

**The schema includes:**

- Experience details (name, description, categories, media)
- Pricing (base price, age bands, group discounts, seasonal variations)
- Availability (calendar, capacity, cutoff times, blackout dates)
- Logistics (meeting points, duration, languages, accessibility)
- Policies (cancellation, weather, minimum participants)

### Component 4: MCP Distribution Server

**What it does:** Exposes the aggregated inventory through the Model Context Protocol, making it queryable by any AI agent.

**Tools:** `search_tours`, `get_details`, `filter_by_type`, `search_by_area`, `get_availability`

**What MCP means in practice:** When a traveler asks Claude, ChatGPT, or any AI assistant "What walking tours are available in Seattle next Tuesday under $50 per person?", the AI agent can directly query TourGraph's inventory, get real structured data, and present it to the traveler — or eventually book it.

### Component 5: Operator Dashboard

**What it does:** Simple, non-technical interface where the operator can:

- Claim their listing (Google Maps model — data already extracted)
- Review and edit what the AI extracted
- See their inventory across all connected channels
- Monitor how AI agents are surfacing their tours

**Design principle:** This should feel like Shopify, not like enterprise software. If a tour operator can use Instagram, they can use this dashboard.

### Component 6: Distribution Connectors (Future)

**What it does:** Exposes the operator's inventory through additional channels:

1. **OTA adapters** — Formatted exports or API connections for Expedia's Rapid API, GetYourGuide's Supplier API
2. **Google Things to Do feed** — structured data upload to GTTD (only ~25% of operators are connected today)
3. **Embeddable widget** — A simple booking interface the operator can put on their own website

---

## Validation Strategy: Seattle-First

### Why Seattle

Every region in the world has tour operators. Seattle is the testing ground because:

- **In-person access:** Walk into their shop, take their tour, have a face-to-face conversation. Builds trust that email cannot.
- **Diverse operator types:** Walking tours, underground tours, harbor cruises, nature day trips, escape rooms, food tours. Good variety for testing extraction across experience types.
- **Manageable scale:** Enough operators to find 50-100+ through programmatic discovery. Small enough to build real relationships.
- **No competitive conflict:** Helping small operators get AI visibility doesn't compete with target employers — it complements them. Expedia, GetYourGuide, and Viator would all benefit from having more structured supply.

### How to Approach Operators

**Discovery phase:** No operator contact needed. Use their public websites only, discover programmatically. Public data — testing the tool, not asking permission.

**Validation phase:** Approach operators in person. The pitch is simple and non-threatening:

*"I'm building a free tool that helps tour operators like you get discovered by AI assistants like ChatGPT and Google. I already extracted your tour info from your website — can I show you what it looks like and get your feedback?"*

Offering them something (visibility), not asking for something (data). That's a different conversation than cold-emailing an operator in Rome.

---

## Product Potential

### The Case For

- **Market size:** $250-400B tours & experiences market, only 30% sold online
- **Fragmented supply:** Tens of thousands of small operators with no technical resources
- **Clear pain point:** OTA commissions are 20-30%. A flat monthly SaaS fee is cheaper.
- **Timing:** AI agents as a booking channel is emerging now — early mover advantage
- **Revenue model:** Freemium — free inventory structuring, paid for distribution connectors and AI agent visibility

### The Case Against

- **Chicken-and-egg:** Operators won't sign up until AI agents are actually booking tours. AI agents won't integrate until there's inventory. (Mitigated by discovery-first model.)
- **Data access moat is thin:** If this works, GetYourGuide, Viator, and Booking.com could build it themselves. (Mitigated by long-tail focus and first-mover advantage.)
- **Booking completion is hard:** Discovery is one thing. Actually handling payments, confirmations, cancellations through AI agents is complex.
- **Small operator willingness to pay:** Many small tour operators are not tech-forward and may not see value initially.

### The Smart Approach

Don't decide "project vs. product" upfront. Build it as a project with product-grade architecture. Use real data and real integrations. Don't invest in product infrastructure yet (auth, billing). Validate with Seattle operators in person. After validation, decide: continue building toward product, or transition to job search with this as the primary artifact.

---

## Technical Approach

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend API | Python / FastAPI | Fast to develop, industry standard |
| AI Extraction | Claude API + Firecrawl | Firecrawl for web fetching/rendering; Claude for tourism-specific extraction |
| Discovery | Google Places API + Viator API | Programmatic operator discovery |
| Schema | OCTO-aligned JSON | Industry standard for tours/experiences |
| MCP Server | Python MCP SDK | Anthropic's open standard for AI agent integration |
| Database | PostgreSQL | Reliable, good for structured inventory data |
| Operator Dashboard | React / Next.js | Professional, good for demo |
| Hosting | AWS | Industry standard |

**Build-vs-use principle:** General-purpose web extraction infrastructure (fetching, JS rendering, proxy rotation, anti-bot) is commoditized — tools like Firecrawl, Crawl4AI, and ScrapeGraphAI handle this well. What's NOT commoditized: tourism-specific extraction schemas (OCTO-aligned), domain-expert prompts, operator validation pipelines, and AI-agent distribution layers. Use existing infrastructure for the former, build the latter.

---

## Alternative Ideas Considered

For reference, these ideas were explored during the brainstorming process:

### Cruise Discovery Engine
- **Concept:** Aggregate and normalize publicly available cruise data for AI-powered comparison
- **Verdict:** Data access is the fatal flaw. Real-time pricing requires B2B API contracts. Validated through a real cruise planning exercise.

### Enterprise AI Adoption Diagnostic
- **Concept:** Assessment tool + framework for measuring enterprise AI copilot ROI
- **Verdict:** Strong publishing angle, broadest audience. Worth pursuing as a parallel thought leadership track.

### NDC Content Normalizer
- **Concept:** Normalize fragmented NDC airline responses into unified shopping experience
- **Verdict:** Real problem, but involves painful XML parsing, less visually compelling to demo.

### Platform Consolidation Playbook
- **Concept:** AI-powered tool for assessing platform merger complexity
- **Verdict:** Strong resume alignment but harder to productize. Better as a consulting offering.

### Anti-Copilot Task Eliminator
- **Concept:** AI agents that fully automate specific mundane engineering tasks
- **Verdict:** Highest startup potential if the right task is identified. Future project candidate.

---

*For the build plan, see [roadmap.md](roadmap.md). For strategic analysis and risk assessment, see [strategy.md](strategy.md). For product positioning and elevator pitches, see [pitch.md](pitch.md). For current build status, see [CURRENT_STATE.md](https://github.com/nikhilsi/tourgraph/blob/main/CURRENT_STATE.md).*
