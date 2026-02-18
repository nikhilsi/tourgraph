# Project Proposal: AI-Powered Supplier Onboarding for the Agentic Travel Era

**Prepared for:** Nikhil Singhal
**Date:** February 15, 2026
**Status:** Active — Phase 0 Complete (GO), Phase 1 Planning

---

## Executive Summary

Build a tool that lets non-technical tour operators make their inventory visible and bookable by AI agents (Claude, ChatGPT, Google Gemini) in minutes — not months. The tool combines AI-powered data extraction with a standardized distribution layer, solving two problems at once: the slow, manual supplier onboarding process that every travel marketplace struggles with, AND the emerging need for travel inventory to be machine-readable as AI agents become a primary booking channel.

This project serves three purposes:

1. **Job search artifact** — Demonstrates CTO-level strategic thinking to target companies
2. **Published thought leadership** — Fuels a LinkedIn/Medium article series that builds visibility
3. **Potential product** — If validated, could become a real SaaS business

---

## The Problem (In Plain English)

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

**The insight:** Standards exist for how systems talk to each other. Nobody has solved how to get operator data *into* those systems in the first place. OCTO defines what a well-structured tour listing should look like — but the walking tour company in Pioneer Square has a WordPress site and a phone number, not an OCTO-compatible API. The gap isn't the standard. The gap is getting unstructured, real-world data into any standard at all. That's exactly what Surfaced does.

**Strategic implication:** Our normalization layer should target OCTO-compatible output where possible. "We extract your data and normalize it to the industry standard" is a stronger pitch than a proprietary format — and it shows deep ecosystem understanding.

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

Research reveals three complementary paths for Surfaced to acquire structured tour/experience data:

**Path A — AI Extraction (our core innovation):** Scrape public operator website → AI extracts → structured data. Works for ANY operator regardless of their booking system. This is the novel technology and the Phase 0 test. Handles the long tail of operators who aren't on any OTA.

**Path B — Channel Manager Integration:** For operators already on FareHarbor, Peek, Rezdy, etc., the structured data already exists. With API access, pull it directly — no AI extraction needed. This is a faster path for operators who are already digitized. **Limitation:** All major channel manager APIs are gated behind partner/affiliate approval.

**Path C — OTA Affiliate APIs (the bootstrapping shortcut):** Viator's Partner API provides free, immediate access to structured product data for 300,000+ experiences globally. Basic affiliate access requires no approval, no minimum traffic, and no cost. Product data includes descriptions, pricing by age band, product options/variants, availability schedules, reviews, photos, cancellation policies, and location details. GetYourGuide has a similar API (traffic-gated) with an open-source spec on GitHub.

**What Path C changes strategically:**

Path C means Surfaced doesn't have to extract data from websites OR negotiate channel manager access to cover ~80% of commercial operators. The data already exists in a queryable API. This could dramatically accelerate time-to-value:

| Path | Coverage | Access | Speed | Unique Value |
|------|----------|--------|-------|-------------|
| A — AI Extraction | 100% (any operator with a website) | No permission needed | Slow (build extraction engine first) | Handles undiscovered / non-OTA operators |
| B — Channel Manager APIs | ~70% of digitized operators | Partner approval required | Medium (negotiate access) | Direct, real-time, operator-authorized |
| C — OTA Affiliate APIs | ~80% of commercial operators | Free (Viator basic) | Fast (sign up and query) | Immediate structured data, no extraction |

**The critical limitation of Path C:** Viator's affiliate terms require that bookings redirect to Viator or occur through their transactional API. You can't simply take their data and build a competing distribution channel. The data is meant for merchandising on your platform → driving traffic/bookings to Viator.

**How the three paths work together in a mature Surfaced product:**
- **Path C (Viator API)** as the bootstrap layer — immediately populate the MCP server with structured inventory for operators already on Viator. Bookings flow through Viator. This gets Surfaced live and demonstrable fast.
- **Path A (AI Extraction)** as the differentiation layer — handle operators NOT on Viator: the small walking tour company, the new escape room, the local food tour that only has a WordPress site. This is the long-tail inventory that AI agents would uniquely surface. Path A becomes the competitive moat, not the entire product.
- **Path B (Channel Manager APIs)** as the premium layer — for operators who want direct booking without Viator's commission, integrate with their booking system directly. Higher value, but requires operator participation and API access.
- **MCP distribution layer** on top of ALL three — regardless of how data arrives (extracted, pulled from a channel manager, or ingested from Viator), the AI-agent interface is the same.

**The strategic insight remains:** Even Path C still needs our MCP layer on top. Viator has the structured data. Viator distributes to human-browsing channels (TripAdvisor, Booking.com, Expedia, travel agents). Viator does NOT distribute to AI agents. The MCP layer is the unique value regardless of which path feeds it.

### The Complete Distribution Pipeline (As Discovered)

Research across six Seattle operators reveals the full picture of how tour inventory currently flows:

```
Operator → Booking System → Viator → TripAdvisor "Things to Do" + Booking.com + Expedia + 4,000 affiliates
                         → Google GTTD (via connectivity partner)
                         → Direct website bookings
                         → [MISSING] AI Agents (Claude, ChatGPT, Gemini, etc.)
```

Every operator in our test set follows this pipeline. The booking systems (FareHarbor, Peek, RocketRez, Gatemaster) all integrate with Viator. Viator distributes to TripAdvisor + OTA network. Google GTTD is a newer channel (~25% adoption). **The AI agent channel does not exist.** That's Surfaced.

### Real-World Validation: Shutter Tours

To ground this analysis, we traced a specific Seattle operator (Shutter Tours) through the entire distribution chain:

- **Website:** shuttertours.com — marketing content, tour descriptions, photos. Unstructured.
- **Booking system:** FareHarbor — handles actual bookings, availability, pricing. Structured data lives here.
- **OTA distribution:** Already listed on Viator (TripAdvisor) and Expedia. Refund policy explicitly mentions both.
- **AI-agent distribution:** None. No MCP endpoint. No structured data accessible to Claude, ChatGPT, or any AI agent.

This one example validates the entire thesis: the data is structured inside FareHarbor, distributed to legacy OTAs, but invisible to the emerging AI-agent distribution channel.

### OpenAI / OpenClaw

OpenAI just acquired OpenClaw (Feb 15, 2026) — the fastest-growing open-source AI agent framework (188K GitHub stars). **This validates our project, not threatens it.** OpenClaw is the agent (demand side). Our project makes supply available to agents like OpenClaw. The more powerful agents become, the more urgent the need for structured, AI-ready inventory.

---

## The Solution: What You Would Build

### Component 1: AI-Powered Intake Engine

**What it does:** Takes a tour operator's existing, messy, unstructured data and converts it into clean, structured inventory.

**How it works:**

- **Option A — Website scraper:** Operator provides their website URL. The AI reads every page, extracts tour names, descriptions, pricing, duration, locations, group sizes, inclusions/exclusions, and organizes it into structured data.
- **Option B — Document upload:** Operator uploads their brochures, PDF catalogs, or spreadsheets. Same extraction process.
- **Option C — Conversational setup:** Operator answers questions in a guided flow: "What tours do you offer? How much does each cost? What's your availability?" The AI builds the inventory through conversation.

**The key insight:** The operator doesn't need to learn any new tools or fill out complex forms. They give you what they already have, and AI does the structuring.

### Component 2: Normalization Layer

**What it does:** Takes the extracted data and maps it into a standardized schema that works across platforms.

**Why this matters:** Every OTA has a different data format. GetYourGuide wants data structured one way, Expedia another, Viator another. Today, operators (or their channel managers) manually translate their data for each platform. This layer does it automatically.

**Standards alignment:** The normalization layer should target OCTO (Open Connectivity for Tours, Activities & Attractions), the existing open-source industry standard for tour/experience data exchange. Rather than inventing a proprietary schema, normalizing to OCTO means operator data is immediately compatible with any system that already speaks OCTO — and demonstrates ecosystem awareness.

**The schema would include:**
- Experience details (name, description, categories, media)
- Pricing (base price, group discounts, seasonal variations, dynamic rules)
- Availability (calendar, capacity, cutoff times, blackout dates)
- Logistics (meeting points, duration, languages, accessibility)
- Policies (cancellation, weather, minimum participants)

### Component 3: Distribution Connectors

**What it does:** Exposes the operator's inventory through multiple channels simultaneously.

**Channels include:**

1. **OTA adapters** — Formatted exports or API connections for Expedia's Rapid API, GetYourGuide's Supplier API, and other platforms
2. **MCP endpoint** — A standardized connector (using Anthropic's Model Context Protocol) that lets any AI agent query the operator's inventory directly. This is the forward-looking piece.
3. **Embeddable widget** — A simple booking interface the operator can put on their own website

**What MCP means in practice:** When a traveler asks Claude, ChatGPT, or any AI assistant "What walking tours are available in Seattle next Tuesday under $50 per person?", the AI agent can directly query this operator's inventory, get real-time availability and pricing, and present it to the traveler — or even book it.

### Component 4: Operator Dashboard

**What it does:** Simple, non-technical interface where the operator can:

- Review and edit what the AI extracted from their website/documents
- See their inventory across all connected channels in one place
- Monitor bookings and availability
- Get alerts when something needs attention (availability conflict, pricing discrepancy)

**Design principle:** This should feel like Shopify, not like enterprise software. If a tour operator can use Instagram, they can use this dashboard.

---

## Why This Idea — The Strategic Logic

### It Sits at the Right Intersection

This project sits at the intersection of:

- **Your Expedia experience** — You literally reduced supplier onboarding from 180 to 35 days. You know this problem from the platform side.
- **Your operator-side experience** — As a former tour company CTO, you understand operator pain points firsthand.
- **Your ScreenTrades.ai experience** — You've built AI-powered platforms from scratch using the exact tech stack this requires.
- **Industry timing** — Agentic AI distribution is the #1 topic in travel tech right now. Every company is talking about it. Few are building it for the supply side.

### It's Relevant to Your Network

| Company | Connections | Why It's Relevant |
|---------|------------|-------------------|
| Expedia Group | 44 (including VPs) | B2B grew 24% last quarter; Rapid API ecosystem; acquired Tiqets for experiences |
| Amazon/AWS | 74 | Alexa Plus travel; AWS travel architectures; agentic commerce |
| Google | 27 (including VPs) | Building agentic booking into AI Mode with travel partners |
| Microsoft | 131 | Amadeus/Teams travel agent; Copilot travel integrations |
| T-Mobile | 27 | Less direct, but platform consolidation experience resonates |

### It Can Be Explained in One Sentence

*"I built a tool that takes a tour operator's website and makes their inventory bookable by AI agents in 30 minutes — solving the same supplier onboarding problem I tackled at Expedia, but with AI and for the agentic era."*

---

## What Makes This Different from Just Building an MCP Demo

A standalone MCP demo says: "Look, I can connect an API to an AI agent." That's technically interesting but not strategically compelling. Any senior engineer could do it.

This project says: "I identified a structural industry problem (supply-side fragmentation), connected it to an emerging technology shift (agentic distribution), and built a solution that addresses both — informed by my direct experience on both the platform side (Expedia) and the operator side."

The difference isn't the code. **The difference is the thinking.** The code is evidence that you've done the thinking.

### What You Learn By Building (Interview Gold)

The most valuable outcome isn't the tool itself — it's the insights you gain from building it. Things like:

- Where does AI extraction break down? (Messy websites, inconsistent pricing, seasonal variations)
- What data do operators not realize they need to provide? (Accessibility info, cancellation policies, real-time availability)
- Why can't you just scrape and go? (Trust issues — operators want to review before anything goes live)
- What's actually hard about making inventory AI-agent-ready? (Dynamic pricing, booking confirmation, refund handling)
- Where does the standardization dream hit reality? (Every operator structures their business differently)

**None of those insights appear in any consulting deck.** They only come from building.

---

## Phased Build Plan

Each phase delivers something independently valuable. If you stop after any phase, you still have something to show.

### Phase 0: Feasibility Spike (1 week) — COMPLETE

**The gate question:** Can AI reliably extract structured tour data from real websites?

**Answer: YES.** All 6 decision gate criteria met. See `results/phase0_summary/phase0_report.md`.

**What was done:**
- 7 Seattle operators selected (city tours, cruises, escape rooms, nature tours, attractions)
- OCTO-aligned extraction schema v0.1 defined (29 product fields + Surfaced extensions)
- Firecrawl `/extract` tested and rejected (hallucinated prices, 369 credits/operator)
- Path 2 extraction pipeline built: Firecrawl `/scrape` + Claude Opus 4.6 with domain prompt
- All 7 operators extracted, scored against manual ground truth

**Results:**
- **83 products** extracted across 7 operators
- **~95% core field accuracy** (title, pricing, duration, description)
- **Zero pricing hallucinations** — when data wasn't on the page, the AI said so
- **Schema flexibility proven** — same pipeline handles tours, cruises, and escape rooms
- **Total cost: 37 Firecrawl credits + $8.28 Claude API** ($1.18/operator average)
- **5 booking platforms detected**, 6 cross-operator bundles discovered
- All failure patterns are systematic and addressable (input coverage, JS widgets — not AI comprehension)

**Decision: GO — proceed to Phase 1.**

### Phase 1: The Extraction Engine (2 weeks)

**Goal:** Productionize what you learned in the spike.

**Activities:**
- Build FastAPI backend: input a URL → scrape → Claude extraction → structured JSON output
- Handle edge cases discovered in Phase 0 (see below)
- Build simple operator review UI: "Here's what we extracted — is this right? Edit anything that's wrong."
- Store extracted inventory in PostgreSQL

**Phase 0 learnings that inform Phase 1:**
- **Auto-discovery needed**: Phase 0 required manually selecting URLs per operator. Phase 1 should parse sitemaps and classify URLs (product vs. info vs. fleet pages) automatically.
- **Schema v0.2**: Add `productStatus` enum (AI already detects active/cancelled/seasonal/coming-soon), `departureCity` (for multi-city operators), `operatorDiscounts[]` (distinct from product-level promos). Consider dropping `successRate` (never populated) and `priceTiers[]` (better as `upgradeModifiers`).
- **Prompt v0.2**: Enhance extraction of discount programs and tier-specific pricing. Current prompt handles core extraction well but misses operator-level discount structures.
- **Path C integration**: Viator API for pricing gap fill where JS widgets block extraction. Requires affiliate signup (needs a website/landing page).
- **Scoring automation**: Build structured ground truth for automated accuracy measurement instead of manual scorecards.
- **Batch processing**: Error recovery, result aggregation, multi-operator runs.

**Deliverable:** Working tool where you paste a URL and get structured tour inventory back, with a review/edit interface.

**Parallel: Write Article 1** — based on spike learnings ("I tried to make tour inventory AI-agent-ready. Here's where it broke.")

### Phase 2: The MCP Server (2 weeks)

**Goal:** Make extracted inventory queryable by AI agents.

**Activities:**
- Learn MCP SDK (first few days — study alongside Phase 1 if possible)
- Build MCP server exposing inventory with tools like: search_tours, get_availability, get_pricing, check_capacity
- Build live demo: Claude querying your MCP server vs. trying to get same info from operator's messy website (the "before/after")
- Test with multiple AI models if possible (Claude, ChatGPT)

**Deliverable:** Working demo showing AI agent discovering and querying real Seattle tour inventory through MCP.

**Parallel: Write Article 2** — MCP learning journey ("What I learned building my first MCP server for travel")

### Phase 3: Dashboard + Distribution (2-3 weeks)

**Goal:** Make it feel like a product.

**Activities:**
- Operator dashboard (React): review inventory, edit details, manage listings
- Export adapter for at least one real OTA format (GetYourGuide Supplier API or Expedia Rapid API)
- Analytics view: how is inventory being queried by AI agents?
- End-to-end demo: "paste URL → AI extracts → operator reviews → inventory is live for AI agents"

**Deliverable:** Complete end-to-end demo from raw website to AI-agent-bookable inventory.

**Parallel: Write Article 3 or 4**

### Phase 4: Validation + Decision (1-2 weeks)

**Goal:** Determine if this is a portfolio piece or a product.

**Activities:**
- Show prototype to 3-5 real Seattle tour operators (in-person meetings — see Validation Strategy below)
- Show to 2-3 people in Expedia/Amazon/Google network for industry feedback
- Gather structured feedback on: value proposition, willingness to pay, missing features
- Honest assessment: is there product-market fit signal?

**Deliverable:** Go/no-go decision — continue building toward product, or transition to job search mode with this as your primary artifact.

### Timeline Overview

| Phase | Duration | Key Output | Status | Article |
|-------|----------|-----------|--------|---------|
| Phase 0: Spike | Week 1 | Extraction feasibility results | **Complete — GO** | — |
| Phase 1: Engine | Weeks 2-3 | Working extraction tool + review UI | Planning | Article 1 |
| Phase 2: MCP | Weeks 4-5 | AI-agent-queryable inventory demo | Planned | Article 2 |
| Phase 3: Dashboard | Weeks 6-8 | End-to-end product demo | Planned | Article 3 |
| Phase 4: Validation | Weeks 8-9 | Go/no-go decision | Planned | Article 4 |

### Parallel Tracks (Throughout)

- **MCP Learning:** Start reading docs during Phase 0, so you're not cold when Phase 2 begins
- **Writing:** Draft articles alongside each phase — writing while building forces clarity
- **OTA API Research:** Review GetYourGuide/Expedia supplier API docs during Phase 1

---

## Validation Strategy: Seattle-First Approach

### Why Seattle

Every region in the world has tour operators. Seattle is the testing ground because:

- **In-person access:** You can walk into their shop, take their tour, have a face-to-face conversation. This builds trust that email/phone cannot.
- **Diverse operator types:** Seattle has everything from whale watching tours to underground city tours to food tours to mountain excursions — good variety for testing extraction across different experience types.
- **Manageable scale:** Enough operators to find 5-10 willing participants, small enough to build real relationships.
- **No competitive conflict:** These are small local operators, not Expedia-scale companies. Helping them get more visibility through AI agents doesn't compete with your target employers — it complements them. Expedia, GetYourGuide, and Viator would all benefit from having more structured supply.

### How to Approach Operators

**Phase 0 (Spike):** No operator contact needed. Use their public websites only. This is all publicly available data — you're testing your extraction tool, not asking permission.

**Phase 4 (Validation):** Approach operators in person. The pitch is simple and non-threatening:

*"I'm building a free tool that helps tour operators like you get discovered by AI assistants like ChatGPT and Google. I already extracted your tour info from your website — can I show you what it looks like and get your feedback?"*

You're offering them something (visibility), not asking for something (data). That's a different conversation than cold-emailing an operator in Rome.

### Potential Concerns

**"Will this clash with Expedia?"** No — these are complementary. Expedia wants more structured supply. You're helping operators get structured. If anything, an Expedia interviewer would see this as understanding their ecosystem.

**"Will operators be suspicious?"** Some will. That's fine — you only need 3-5 who are curious. Local, in-person, offering something free = much higher hit rate than cold outreach to strangers.

---

## Publishing Strategy: The LinkedIn Article Series

Building this project generates material for a thought leadership series. The project and the publishing reinforce each other — the project gives you material to write about, the writing gives you visibility, the visibility opens doors.

### Proposed Article Series

**Article 1: "I Spent 20 Years in Travel Tech. Here's What Nobody's Talking About in the Agentic AI Rush."**
- Your perspective on what the industry is getting wrong
- The supply-side problem that everyone's ignoring
- Hook: Contrarian take from someone with real credentials

**Article 2: "I Tried to Make Tour Inventory AI-Agent-Ready. Here's Where It Broke."**
- Lessons from actually building the intake engine
- Where AI extraction works and where it fails
- Practical insights, not theoretical hand-waving

**Article 3: "The Real Problem with AI in Travel Isn't the AI — It's the Data."**
- What you learned about data quality, standardization, trust
- Why operators are skeptical and what it takes to earn their trust
- Connects to the broader enterprise AI adoption challenge

**Article 4: "From 180 Days to 30 Minutes: What Expedia Taught Me About Supplier Onboarding."**
- Your Expedia story as the foundation
- How AI changes the equation
- Forward-looking vision

### Publishing Principles

- Write about the **learning journey**, not the code
- Position yourself as a **senior leader who thinks AND builds**
- Keep articles **opinion-driven with evidence**, not tutorials
- Target audience: **CTOs, VPs of Engineering, Product leaders** — the people who hire you
- Post on LinkedIn first (your network sees it), cross-post to Medium for broader reach
- **Start writing during Phase 0/1** — don't wait until everything is done

---

## Product Potential: Could This Become a Company?

### The Case For

- **Market size:** $250-400B tours & experiences market, only 30% sold online
- **Fragmented supply:** Tens of thousands of small operators with no technical resources
- **Clear pain point:** OTA commissions are 20-30%. A flat monthly SaaS fee is cheaper.
- **Timing:** AI agents as a booking channel is emerging NOW — early mover advantage
- **Revenue model:** Freemium — free inventory structuring, paid for distribution connectors and AI agent visibility
- **Your credibility:** Expedia supplier onboarding + tours/experiences CTO = uniquely qualified founder

### The Case Against

- **Chicken-and-egg:** Operators won't sign up until AI agents are actually booking tours. AI agents won't integrate until there's inventory.
- **Data access moat is thin:** If this works, GetYourGuide, Viator, and Booking.com will build it themselves.
- **Booking completion is hard:** Discovery is one thing. Actually handling payments, confirmations, cancellations through AI agents is complex.
- **Small operator willingness to pay:** Many small tour operators are not tech-forward and may not see value initially.

### The Smart Approach

Don't decide "project vs. product" upfront. Build it as a project with product-grade architecture:

- Use real data (Seattle operators' public websites) and real integrations
- Build it well enough that it *could* become a product
- Don't invest in product infrastructure yet (auth, billing, onboarding)
- Validate with Seattle operators in person (Phase 4)
- Write the article series as you build
- After ~9 weeks, you'll know if there's a real product here

Either outcome is a win. If it's a product — you might have a company. If it's not — you have the best CTO interview artifact in the market plus a published article series that established your thought leadership.

---

## Technical Approach (High Level)

### Technology Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend API | Python / FastAPI | You know it; it's fast to develop; industry standard |
| AI Extraction | Claude API + Firecrawl | Firecrawl for web fetching/rendering/anti-bot (commodity infrastructure); Claude for tourism-specific structured extraction with our OCTO-aligned schema (differentiated domain intelligence). See `tooling_landscape.md` for build-vs-use analysis. |
| MCP Server | Python MCP SDK | Anthropic's open standard; cutting edge; shows you're current |
| Database | PostgreSQL | Reliable, you know it, good for structured inventory data |
| Operator Dashboard | React / Next.js | You know it; professional; good for the demo |
| Hosting | AWS | Your certifications; industry standard |

**Build-vs-use principle:** General-purpose web extraction infrastructure (fetching, JS rendering, proxy rotation, anti-bot) is commoditized — tools like Firecrawl, Crawl4AI, and ScrapeGraphAI handle this well. What's NOT commoditized: tourism-specific extraction schemas (OCTO-aligned), domain-expert prompts, operator validation pipelines, and AI-agent distribution layers. We use existing infrastructure for the former and build the latter.

### What You'd Need to Learn

- **MCP basics** — Python SDK, tool definition, server implementation. Estimated: 2-3 days of learning.
- **Agentic AI patterns** — How AI agents use tools, context management, multi-step reasoning. Estimated: 1-2 days of reading/experimentation.
- ~~**Firecrawl API** — Extract endpoint, schema-based extraction, credit management. Estimated: 0.5 day.~~ ✅ Done (Phase 0). Learned `/scrape`, `/extract`, `/map` endpoints. Key findings: `/extract` requires Pydantic-generated schemas and is too expensive/inaccurate for production; `/scrape` at 1 credit/page is the right approach paired with our own Claude extraction.
- **GetYourGuide/Expedia Supplier APIs** — Public documentation available. Estimated: 1-2 days to understand the schemas.

### What You Already Know

- FastAPI backend development (ScreenTrades.ai)
- React frontend development (ScreenTrades.ai, news aggregator)
- Claude API integration (ScreenTrades.ai)
- AWS deployment and architecture (certified)
- Travel domain deeply (Expedia, tours/experiences)
- Supplier onboarding workflows (Expedia — you designed them)
- iOS development (GitaVani, news aggregator — if mobile component needed)

---

## Alternative Ideas Considered

For reference, these ideas were also explored during the brainstorming process:

### Cruise Discovery Engine
- **Concept:** Aggregate and normalize publicly available cruise data for AI-powered comparison
- **Verdict:** Data access is the fatal flaw. Real-time pricing requires B2B API contracts. Validated this through a real cruise planning exercise.

### Enterprise AI Adoption Diagnostic
- **Concept:** Assessment tool + framework for measuring enterprise AI copilot ROI
- **Verdict:** Strong publishing angle, broadest audience. Worth pursuing as a parallel thought leadership track (article series on AI adoption) even if not the primary build project.

### NDC Content Normalizer
- **Concept:** Normalize fragmented NDC airline responses into unified shopping experience
- **Verdict:** Real problem, but involves painful XML parsing, less visually compelling to demo, and targets companies with weaker network connections.

### Platform Consolidation Playbook
- **Concept:** AI-powered tool for assessing platform merger complexity
- **Verdict:** Strong resume alignment (VRBO + Metro/T-Life) but harder to productize. Better as a consulting offering than a SaaS tool.

### Anti-Copilot Task Eliminator
- **Concept:** AI agents that fully automate specific mundane engineering tasks
- **Verdict:** Highest startup potential if the right task is identified. Worth keeping on the radar for a future project.

---

## Open Questions

1. ~~**Schema definition:** What fields are essential for the MVP extraction schema? Start minimal and expand, or try to be comprehensive from day one?~~ ✅ Answered. Went comprehensive with OCTO-aligned v0.1 (29 product fields + Surfaced extensions). Tested across 7 operators — schema v0.2 recommendations documented in `results/phase0_summary/phase0_report.md`.

2. ~~**Which OTA APIs to target first?**~~ ✅ Answered. Viator Partner API is the primary Path C source — free affiliate access, no traffic minimums, structured data for 300K+ experiences. Signup deferred to Phase 1 (requires website URL). See `api_landscape.md`.

3. **MCP vs. simpler approach:** Should the AI agent layer use MCP specifically, or would a standard API with good documentation serve the same demo purpose? (Current thinking: MCP — the learning value alone justifies it.)

4. **Publishing cadence:** Start writing before building is complete (build in public), or wait until there are concrete results to share? (Current thinking: start during Phase 1. Phase 0 results provide strong material for Article 1.)

5. **Operator outreach timing:** When to approach Seattle operators — after Phase 0 spike (early signal), or after Phase 3 when there's a polished demo? (Current thinking: Phase 4, with complete demo in hand.)

6. **Privacy:** Given this will be shown in interviews and potentially published — what company-specific details need to be kept generic?

---

## Personal Growth Dimensions

This project develops specific skills and capabilities:

- **New skills:** MCP/Agentic AI architecture, AI-powered data extraction, web scraping pipelines, two-sided platform product thinking, published thought leadership
- **Sharpened skills:** Claude API integration, FastAPI/React full-stack, AWS architecture
- **Meta-skill:** Confidence in identifying market problems, forming opinions, and executing independently — the muscle that big company roles let atrophy

---

## Next Steps

*Updated February 17, 2026 — Phase 0 complete. GO decision pending review.*

### Phase 0 (Complete)
1. ~~**Identify test operators**~~ ✅ Done. 7 Seattle operators selected.
2. ~~**Define extraction schema**~~ ✅ Done. OCTO-aligned v0.1 with 29 product fields + extensions.
3. ~~**Test Firecrawl `/extract`**~~ ✅ Done. Rejected — too expensive, hallucinated prices, missed domain-critical data.
4. ~~**Build-vs-use decision**~~ ✅ Done. BUILD: Firecrawl `/scrape` + Claude API with our domain prompt.
5. ~~**Build Path 2 extraction script**~~ ✅ Done. `scripts/extract_operator.py` — Firecrawl `/scrape` + Claude Opus 4.6.
6. ~~**Extract all 7 operators**~~ ✅ Done. 83 products, 7 scorecards, zero pricing hallucinations.
7. ~~**Cross-operator scoring & summary report**~~ ✅ Done. GO recommended — all 6 criteria met.
8. **Viator API comparison** — Deferred to Phase 1 (affiliate signup requires website URL).

### Phase 1 (Up Next)
9. **Review Phase 0 go/no-go report** — Read `results/phase0_summary/phase0_report.md`, confirm GO.
10. **Schema v0.2** — Add `productStatus`, `departureCity`, `operatorDiscounts[]`.
11. **Auto-discovery** — Sitemap parsing + URL classification to replace manual URL selection.
12. **FastAPI backend** — Production extraction endpoint.
13. **Operator review UI** — Simple interface for operators to verify extracted data.
14. **Viator API integration** — Path C for pricing gap fill and coverage comparison.

See **NOW.md** for current priorities.

---

*This document is a living record of the Surfaced project. Updated as the project progresses through phases.*
