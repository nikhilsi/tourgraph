# Project Glossary — Tours & Experiences AI Distribution

**Last updated:** February 18, 2026
**Purpose:** Shared vocabulary for all project conversations, code, documentation, and articles. Keep this current as definitions evolve.

---

## Industry Players

### Tour Operator
The company that actually *runs* the tour. They own or employ the guides, vehicles, and equipment. They design the itinerary and deliver the experience. They're the ones standing at the meeting point at 9am.

- Examples: A walking tour company in Seattle with 5 guides; a food tour company that designs and leads culinary experiences
- Key characteristic: They *create and deliver* the experience
- Typical size: 1-50 employees, often family-run or small business
- Our relationship: **Primary target user** — we help them get structured and distributed

### Activity / Experience Provider
Broader than "tour operator." Includes anyone offering a bookable experience — not just traditional guided tours. Encompasses whale watching, cooking classes, escape rooms, museum admissions, kayak rentals, harbor cruises, zip-lining, etc.

- Examples: Argosy Cruises (own the boats, run harbor cruises); a kayak rental outfitter; an escape room business
- Key characteristic: They offer a bookable, time-bound experience — but it may not involve a "guide" or "tour" in the traditional sense
- Our relationship: **Also a target user** — same onboarding and distribution problem as tour operators

### Hybrid Operator
Companies that blur lines — they operate experiences AND provide transportation or accommodation or packaging.

- Example: Clipper Vacations (Victoria Clipper) — operates the ferry service AND sells packaged day trips that include the crossing + activities
- Key characteristic: Multiple business lines, tours/experiences are one revenue stream among several
- Our relationship: Target user for their experience/tour inventory, though their needs may be more complex

### Aggregator / OTA (Online Travel Agency)
Does NOT run any tours. Aggregates inventory from many operators and sells it to consumers via their marketplace. Takes a commission (typically 20-30%).

- Examples: Expedia, GetYourGuide, Viator, Klook, Musement, Headout
- Key characteristic: They're the marketplace/distribution layer — they connect supply (operators) with demand (travelers)
- Our relationship: **Distribution destination** — we help operators get their inventory structured and formatted for these platforms. We are NOT competing with OTAs — we're feeding them structured supply.

### Reseller / Affiliate
Sells someone else's tours under their own brand or embedded in their platform. Doesn't operate anything, doesn't aggregate broadly — usually has partnerships with specific operators.

- Examples: Hotel concierge desk selling Argosy tickets; a travel blog with "book this tour" affiliate links; a cruise ship shore excursion desk
- Key characteristic: They're a sales channel, not an operator or platform
- Our relationship: Not a target user, but could eventually be a distribution channel

### Channel Manager
Software that helps operators distribute their inventory across multiple OTAs simultaneously. Manages availability synchronization so operators don't double-book across platforms.

- Examples: FareHarbor, Peek, Rezdy, Bókun (owned by Tripadvisor), Checkfront
- Key characteristic: They sit *between* the operator and the aggregators — middleware for distribution
- **All major channel managers have APIs** — but they are gated behind partner/affiliate approval, not open access
- **Ownership matters:** FareHarbor is owned by Booking.com (since 2018). Bókun is owned by Tripadvisor (since 2018). Peek and Rezdy/Checkfront remain independent. The two biggest OTAs in experiences each own a channel manager — they bought the supply pipeline.
- Our relationship: **Potential integration partner or eventual competitor** on the AI-agent distribution piece. A mature TourGraph product could pull structured data directly from these APIs (Path B) rather than extracting from websites (Path A). Either way, the MCP distribution layer on top is the unique value none of them currently offer.

### Destination Management Company (DMC)
B2B operators that package experiences for travel agencies, corporate groups, incentive travel, and events. They typically don't sell direct to consumers.

- Example: A company assembling a 3-day Seattle corporate retreat (tours, dining, transport, venues)
- Key characteristic: B2B, packaging, coordination across multiple suppliers
- Our relationship: Not a primary target, but could benefit from structured inventory for their packaging workflows

---

## Technology & Distribution Terms

### MCP (Model Context Protocol)
An open-source standard created by Anthropic (November 2024) that provides a universal way for AI models to connect to external tools and data sources. Think of it as USB for AI — one standardized plug that any AI agent can use to access any compatible system.

- Adopted by: OpenAI, Google DeepMind, Anthropic, and many tool/platform providers
- In our project: The protocol we use to make operator inventory discoverable and queryable by AI agents
- Status as of Feb 2026: Past initial hype, entering "real adoption" phase. Enterprise MCP market expected to reach $1.8B.

### Agentic AI
AI that doesn't just suggest or generate — it *acts*. It can search inventory, compare options, make decisions, and complete transactions on behalf of users. The shift from "AI as advisor" to "AI as executor."

- Examples: An AI that actually books a tour for you (not just recommends one); Expedia's AI service agent handling cancellations; Google's AI Mode completing hotel reservations
- In our project: The demand side — agentic AI systems are the *consumers* of the structured inventory we help operators create
- Not to be confused with: Chatbots (reactive, scripted) or generative AI (creates content but doesn't take action)

### Supplier Onboarding
The process of getting a new tour operator's inventory listed and live on an OTA or marketplace platform. Historically manual, slow, and error-prone.

- Traditional timeline: 30-180 days depending on platform complexity
- Our project's goal: Reduce this to minutes using AI-powered extraction
- Key friction points: Data formatting, content quality, availability configuration, API integration, quality review

### Inventory
In the tours/experiences context: the structured catalog of everything an operator offers. Includes tour details, pricing, availability, policies, media, and logistics. This is the core data asset.

- Not to be confused with: Physical goods inventory (hotel rooms, airline seats) — tour "inventory" is time-slot-based and capacity-limited
- Key challenge: Most operators' inventory lives in unstructured formats (websites, PDFs, spreadsheets, their heads)

### Distribution Channel
Any pathway through which a tour/experience reaches a consumer. Traditional channels include OTA listings, the operator's own website, walk-in sales, hotel concierge partnerships, and travel agency referrals. Emerging channels include AI agents (Claude, ChatGPT, Google Gemini, Alexa).

- Our project adds: AI agents as a new distribution channel via MCP

### Structured Data vs. Unstructured Data
- **Unstructured:** A tour operator's website with prose descriptions, embedded pricing in paragraphs, hours listed in a footer, policies buried on a subpage. Humans can read it; machines struggle.
- **Structured:** Clean JSON/database records with explicit fields: `{ "name": "Underground Seattle Tour", "price_per_person": 25, "duration_minutes": 90, "max_group_size": 15 }`. Machines can read, query, compare, and act on it.
- Our project's core function: Converting unstructured → structured

---

## Industry Standards

### OCTO (Open Connectivity for Tours, Activities & Attractions)
The most relevant existing standard for our project. OCTO is an open-source industry standard API specification specifically for tours, activities, and attractions. Defines agreed-upon schemas, endpoints, and capabilities for connecting platforms, resellers, OTAs, and booking systems.

- Developed by: OCTO Standards NP Inc. (non-profit, member-based)
- Open source: Free to use, no membership required to implement
- Scope: Booking, ticketing, availability, and product definition for the experiences sector
- GitHub: github.com/octotravel
- Our relationship: **Potential normalization target.** Rather than inventing our own schema, our extraction engine could normalize operator data into OCTO-compatible format. "We extract your data and normalize it to the industry standard" is a stronger pitch than a proprietary format.
- Key insight: OCTO defines how structured tour data should look when exchanged *between systems*. It does NOT solve how to get unstructured operator data *into* that format. That's our gap.

### Schema.org Tourism Types
Extensions to Schema.org (the web markup standard founded by Google, Microsoft, Yahoo, and Yandex) for tourism data. Developed by the W3C Tourism Structured Web Data Community Group starting in 2015.

Three main types:
- **TouristAttraction** — a place (museum, park, landmark)
- **TouristDestination** — a region containing attractions
- **TouristTrip** — an itinerary visiting multiple attractions

- Useful for: SEO markup (helping Google understand what's on a tourism webpage)
- Limitation: Thin — describes *what something is* but lacks operational booking details (no pricing, availability, capacity, cancellation policies)
- Our relationship: We could output Schema.org markup as one of our distribution formats, helping operators' SEO. But it's not sufficient as our core data model.

### OpenTravel Alliance
The oldest and broadest travel data standard, operating since 2001. Covers airlines, hotels, car rental, rail, and has expanded into tours/activities.

- Scope: Comprehensive data messaging standard for the entire travel industry
- Format: XML-heavy, enterprise-focused
- Adoption: Used by large GDS systems (Sabre, Amadeus), hotel chains, airlines
- Limitation: Massive, complex, and designed for enterprise players. A small walking tour operator will never implement OpenTravel directly.
- Our relationship: Reference only — useful to understand how the broader travel industry thinks about data standards, but not our normalization target.

### The Standards Gap (Key Project Insight)
Standards exist for how travel systems *talk to each other*. Nobody has solved how to get operator data *into* those systems in the first place. OCTO defines what a well-structured tour listing should look like. But the walking tour company in Pioneer Square doesn't have a system that speaks OCTO — they have a WordPress site and a phone number. The gap isn't "we need a standard." The gap is "we need a way to get unstructured, real-world operator data into any standard at all." That's exactly what TourGraph does.

---

## OTA & Platform APIs

### Viator Partner API
The most significant structured data source discovered during recon. Viator (owned by TripAdvisor since 2014) is the world's largest OTA for tours/activities — 300,000+ experiences, 35M+ monthly visitors, 2,500+ destinations. Their Partner API exposes the full product catalog.

**Three access tiers:**
- **Basic Access (Affiliate):** Free, immediate. Product descriptions, images, ratings, pricing, availability schedules. Good for merchandising. Sales must redirect to viator.com.
- **Full Access (Affiliate):** Requires approval. Adds real-time availability, reviews, bulk product ingestion (`/products/modified-since` endpoint). Can ingest the entire catalog.
- **Full + Booking / Merchant Access:** Requires approval + infrastructure. Transactional booking on your own platform. You become merchant of record.

**Data available:** Descriptive text, structured metadata, pricing by age band, product options/variants, inclusions/exclusions, photos, reviews, cancellation policies, locations/meeting points, itineraries, attraction associations.

**Tested (2026-02-18):** Basic Access production key working. Key endpoints used: `/search/freetext` (operator discovery), `/products/{code}` (full product details + supplier matching), `/products/tags` (connectivity test). Authentication via `exp-api-key` header. Found 10 products across 3/7 test operators. See `api_landscape.md` for full test results.

- Our relationship: **Confirmed "Path C" data source.** Tested against our 7 Phase 0 operators — 3/7 found on Viator, providing reviews, images, and structured pricing that extraction can't capture. 4/7 operators NOT on Viator, confirming Path A's value for the long tail. See `results/comparisons/path_a_vs_path_c.md`.
- Integrates with: FareHarbor, Peek, Bókun, Rezdy, RocketRez, and 100+ other booking systems
- Distribution network: Viator → TripAdvisor "Things to Do" + Booking.com + Expedia + 4,000+ affiliates + 240,000 travel agents

### GetYourGuide Partner API
Second-largest tours/activities OTA. Based in Berlin, strong European presence. 100M+ monthly visitors. OpenAPI spec published on GitHub (open source).

**Access tiers (traffic-gated):**
- **Basic (Teaser):** Requires 100K visits. Generic descriptions, images, ratings, prices.
- **Reading:** Requires 1M visits + 300 monthly bookings. Full descriptions, prices, options, availability.
- **Booking / Masterbill:** Full transactional access. Requires partner manager approval.

- Our relationship: Higher barrier to entry than Viator (traffic minimums), but the open-source API spec on GitHub is valuable for understanding their data model. Could be a secondary data source after Viator.
- Commission: 20-30%, negotiated per operator.

### TripAdvisor Content API
Provides access to TripAdvisor's location data, reviews, and photos. Covers 8 million locations, 1 billion+ reviews.

- **Free tier:** 5,000 monthly API calls. Returns location details + up to 5 reviews + 5 photos per location.
- **Paid tier:** Per-request pricing beyond free quota.
- **Limitation:** Location-level data, NOT product-level tour data. No pricing, availability, or booking info for individual tours. Good for reviews enrichment but not a primary inventory source.
- Our relationship: **Supplementary data source.** Could enrich extracted/ingested inventory with TripAdvisor ratings and reviews — a universal trust signal in the tours/experiences market.

### Google Things to Do (GTTD)
Google's tours/activities vertical within Google Travel. Launched 2021. Displays bookable tours and activities in Google Search and Google Maps.

- **NOT a read API** — it's a **write/ingest pipeline.** Partners upload structured product data to Google via SFTP (JSON format).
- **Access:** Operators cannot upload directly. Must go through an approved Connectivity Partner (FareHarbor, Peek, RocketRez, etc.) or integrate directly (requires approval for 100+ operators).
- **Adoption gap:** Only ~25% of operators are connected. Over half are unaware it exists.
- **AI relevance (key quote from Arival research):** "With Generative AI search, the live, structured product data is exactly what the LLM struggles with." — Industry analysts see the same gap TourGraph targets.
- Our relationship: **Validates our thesis from Google's own direction.** GTTD proves that the industry is moving toward structured data feeds. Also a potential future distribution channel — TourGraph could become a Connectivity Partner that feeds operator data TO Google GTTD (and to AI agents via MCP).

---

## Project-Specific Terms

### Discovery Engine (Component 1)
Programmatic operator discovery — finds tour/activity operators without them submitting anything. Sources: Google Places API, Viator API destination search, DMO directories (e.g., Visit Seattle), Yelp API. Outputs a master operator list with websites. Answers the cold start problem.

### Extraction Engine (Component 2)
The AI-powered system that takes an operator's unstructured data (website, PDF, spreadsheet) and converts it into structured inventory. Uses Firecrawl `/scrape` for fetching + Claude API with domain-specific OCTO-aligned prompts. The core technical bet of the project, validated in Phase 0.

### Aggregation & Normalization Layer (Component 3)
Combines data from multiple sources (Path A extraction, Path C OTA APIs, Path B booking systems) and maps it to a standardized OCTO-aligned schema. Handles deduplication, conflict resolution, and the fact that different sources provide different slices of data.

### MCP Distribution Server (Component 4)
The AI-agent-facing interface. An MCP server that exposes structured tour inventory to AI agents via tools like `search_tours`, `get_details`, `filter_by_type`, `search_by_area`. The distribution channel that doesn't exist yet.

### Operator Dashboard (Component 5)
The human-facing interface where operators claim, review, edit, and manage their structured inventory. Design principle: "If you can use Instagram, you can use this."

### Distribution Connectors (Component 6)
The output layer — adapters that push structured inventory to specific channels: OTA APIs (Expedia Rapid, GetYourGuide Supplier API), Google Things to Do feeds, embeddable widgets (for operator's own site).

### Feasibility Spike (Phase 0)
The initial 1-week test to determine if AI extraction works well enough on real operator websites to justify building the full system. The go/no-go gate for the project. Result: GO — 83 products, 95% accuracy, zero pricing hallucinations.

---

## Strategic Concepts

### Cold Start Problem
The chicken-and-egg challenge: operators won't submit to a platform nobody uses, AI agents won't integrate with a platform that has no inventory. Solved via the Google Maps Model (see below).

### Google Maps Model
TourGraph's cold start strategy. Instead of waiting for operators to submit their websites, we discover operators programmatically, extract from public websites without permission, build the inventory first, then operators "claim" their listing — exactly how Google Maps built business listings. Inverts the onboarding flow from "submit your data" to "we already have your data — want to make sure it's right?"

### Discovery Pipeline
The programmatic system for finding tour/activity operators in a target city. Sources include Google Places API, Viator API destination search, DMO directories, and Yelp API. Expected yield for Seattle: 50-150+ operators. See Component 1 (Discovery Engine).

### Long Tail
Operators not listed on any OTA. Phase 0 found 4/7 test operators (~57%) are not on Viator at all. At scale, estimated 30-40% of operators are on no OTA. These operators are TourGraph-exclusive inventory — the extraction path (Path A) is the only way to structure their data.

### Path A (Website Extraction)
AI extraction from operator websites. Firecrawl `/scrape` fetches clean markdown, Claude API extracts structured data using OCTO-aligned domain prompts. Proven in Phase 0: 83 products, 95% accuracy, $1.18/operator average. The primary data acquisition path and the only path for long-tail operators.

### Path B (Booking System APIs)
Direct integration with booking/channel management systems (FareHarbor, Peek Pro, Rezdy) via their APIs. Provides real-time availability and pricing — the data Path A can't capture from JS widgets. Gated behind partner approval. Phase 1+ exploration.

### Path C (OTA API Aggregation)
Structured data from OTA APIs, primarily Viator Partner API. Provides reviews, professional images, verified pricing, and booking links. Tested in Phase 0: 3/7 operators found on Viator (10 products). Complementary to Path A — neither source is sufficient alone.

---

## Business Model Terms

### OTA Commission
The percentage (typically 20-30%) that aggregators charge operators per booking. This is the cost operators pay for distribution — and the pain point that makes a flat SaaS fee attractive.

### Channel Conflict
When an operator's pricing or availability is inconsistent across different distribution channels (e.g., different price on their website vs. Viator vs. GetYourGuide). A major pain point that channel managers try to solve.

### AI-Agent Readiness
The state of having inventory structured, accessible, and queryable by AI agents. Currently, very few tour operators are AI-agent-ready. This is the core opportunity.

---

## Extraction Tooling & Infrastructure

### Firecrawl
YC-backed (W24) web data API for AI. Turns websites into LLM-ready markdown or structured JSON. Handles JS rendering, proxy rotation, anti-bot. Key endpoints: `/scrape` (single page), `/crawl` (whole site), `/extract` (structured data via schema), `/agent` (autonomous extraction). Open source (AGPL-3.0) but self-hosted version significantly limited vs. cloud. 83K+ GitHub stars. Used in Phase 0 as extraction infrastructure. See `tooling_landscape.md` for full analysis.

### Firecrawl Extract
Firecrawl's `/extract` endpoint. Accepts URLs + JSON schema + natural language prompt, returns structured JSON. Uses LLM to understand page content semantically (not CSS selectors). Beta status, being superseded by `/agent`. **Tested in Phase 0 on Tours Northwest and rejected** — 369 credits for one operator, hallucinated prices, missed promo codes and cross-operator bundles, systematic pricing model misclassification. Verdict: use Firecrawl `/scrape` for fetching + Claude API with our own domain prompt for extraction. See `results/tours_northwest/firecrawl_extract_comparison_v1.md`.

### Spark Models (Firecrawl)
Firecrawl's purpose-built extraction models (launched Jan 2026). Spark 1 Fast (instant retrieval), Spark 1 Mini (default, 60% cheaper), Spark 1 Pro (maximum accuracy). Self-reported recall: ~40% (Mini) to ~50% (Pro) — meaning roughly half of expected fields may be missed, validating the need for domain-specific prompts and ground truth validation.

### Crawl4AI
Open-source (Apache 2.0), Python-native web crawler for LLM extraction. Genuinely self-hostable (unlike Firecrawl). Uses Playwright for browser automation, connects to any LLM (OpenAI, Anthropic, Ollama). Phase 1 candidate if self-hosting becomes important.

### ScrapeGraphAI
Open-source (MIT) Python library using directed graph logic + LLMs for web scraping. Supports local models via Ollama (zero API cost). Self-healing scrapers that adapt to website changes. Phase 1+ candidate for cost optimization.

### Semantic Extraction
Using an LLM to understand page content by meaning (not HTML structure) and extract structured data. Contrasts with CSS-selector-based extraction which breaks when websites redesign. Firecrawl's `/extract` and our own Claude-based extraction both use this approach.

### Build vs. Use (Extraction)
The principle that general-purpose extraction infrastructure (fetching, rendering, anti-bot) is commoditized and should be used, not built. Tourism-specific intelligence (OCTO schema, domain prompts, validation, MCP distribution) is differentiated and should be built. "Firecrawl is the screwdriver; our schema and MCP layer are the furniture." **Decision confirmed in Phase 0:** Firecrawl `/extract` (the "use" option for structured extraction) was tested and rejected. Final approach: USE Firecrawl `/scrape` for fetching, BUILD our own extraction with Claude API + domain-specific prompt.

---

*Add new terms as they emerge during the build. This is a living document.*
