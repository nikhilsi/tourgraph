# TourGraph — Data Acquisition Strategy

**Created:** February 21, 2026
**Author:** Nikhil Singhal
**Status:** Research complete, informing Phase 1 architecture
**Audience:** Technical co-founder, product leadership

---

## Executive Summary

TourGraph's Phase 0 proved that AI can reliably extract structured tour data from operator websites — 83 products across 7 Seattle operators, 95% core field accuracy, zero pricing hallucinations. But a data audit revealed a critical gap: **40% of extracted products are "stubs"** with only a title and URL. The extraction engine works; the problem is that we were feeding it incomplete inputs.

This document captures the research we conducted to answer a deeper question: **what's the right architecture for getting high-quality, near-complete tour data at scale?** The answer isn't just "scrape better." It's a multi-path strategy that combines web extraction, booking system APIs, and OTA affiliate data — each contributing the fields it's best at.

The key findings:

1. **The stub problem is a crawl strategy problem, not an extraction problem.** We manually picked URLs to scrape. For operators where we scraped every detail page, data quality was excellent. For operators where we only scraped the listing page, we got stubs. Automated URL discovery fixes this.

2. **Two of our five booking systems have accessible APIs.** Peek Pro (used by Evergreen Escapes) has a native OCTO-standard API. Bookeo (used by Conundroom) has a fully documented REST API. FareHarbor (3 operators) requires $50K in transaction volume before they'll talk to you.

3. **Viator is more powerful than we realized.** At our current (free) Basic tier, we get product content. Upgrading to Full Access (also free, requires certification) unlocks real-time availability, pricing, reviews, and bulk catalog ingestion — and Viator's data for connected operators comes directly from their booking systems (FareHarbor, Peek Pro) in real-time.

4. **OCTO is the multiplier.** The industry's open API standard is implemented by 130+ organizations. Building one OCTO integration gives us Peek Pro + RocketRez + Ventrata + dozens of other booking systems. There's a free sandbox (Ventrata's EdinExplore) for development.

5. **No one else is building this.** There is no existing tool that crawls tour operator websites and produces OCTO-compatible structured data. The niche is genuinely unoccupied.

---

## The Problem: Why 40% of Our Data Is Incomplete

### What Phase 0 Proved

We built an extraction pipeline (Firecrawl for web crawling + Claude Opus for structured extraction) and tested it against 7 Seattle tour operators. The results were strong:

- **83 products** extracted across 7 operators
- **95% core field accuracy** (title, pricing, duration, description)
- **Zero pricing hallucinations** — the AI never made up a price
- **Schema flexibility** — same pipeline handles tours, cruises, and escape rooms
- **Total cost:** $8.28 in Claude API + 37 Firecrawl credits

### What the Data Audit Revealed

When we audited the 83 products, we found a stark pattern:

| Operator | Pages Scraped | Products Found | Complete | Stubs | Completion Rate |
| --- | --- | --- | --- | --- | --- |
| Shutter Tours | 7 (all detail pages) | 7 | 6 | 1 | 86% |
| Totally Seattle | 8 (all detail pages) | 13 | 11 | 2 | 85% |
| Conundroom | 1 (single-page site) | 13 | 11 | 2 | 85% |
| Tours Northwest | 2 (listing + 1 detail) | 17 | 9 | **8** | 53% |
| Argosy Cruises | 8 (mixed) | 13 | 7 | **6** | 54% |
| Evergreen Escapes | 7 (listing + 6 detail) | 19 | 6 | **13** | 32% |
| Bill Speidel's | 4 (all pages) | 2 | 0 | **2** | 0% |

The pattern is clear: **operators where we scraped every detail page have 85%+ completion. Operators where we only scraped listing pages have massive gaps.** The extraction quality is fine — Claude does great work with the data it receives. The bottleneck is which pages we feed it.

The remaining gaps fall into three categories:

1. **Missing detail pages** (21 stubs) — We scraped the listing page, which gave us product titles and URLs, but never scraped the individual tour pages that contain pricing, duration, and descriptions. This is purely a crawl strategy problem.

2. **Legitimately unavailable data** (6 stubs) — Seasonal products with unpublished 2026 pricing, "coming soon" products, and quote-based corporate experiences. These stubs are correct.

3. **Pricing behind JavaScript widgets** (2 stubs) — Bill Speidel's pricing lives inside a Gatemaster booking widget that loads via JavaScript. Static scraping can't reach it. This requires a different approach entirely.

### The Deeper Question

Fixing the stubs by scraping more pages is straightforward. But it raised a strategic question: **if we need to scale beyond 7 operators to hundreds, is "scrape everything and hope the AI figures it out" really the right approach?**

The answer is no. The right approach is multi-path: web extraction for what's on the website, booking system APIs for real-time pricing and availability, and OTA data for reviews, images, and market coverage. Each path contributes what it's best at.

---

## The Three Data Paths

### Path A: Web Extraction (What We Built in Phase 0)

**How it works:** Crawl operator websites → convert to markdown → extract structured data with Claude and our domain-specific prompt.

**What it's uniquely good at:**
- **Universal coverage** — works for any operator with a website, no partnership required
- **Operator voice** — captures the operator's own descriptions, not an OTA rewrite
- **Promo codes and discounts** — site-wide banners, seasonal deals (e.g., "RAINIER10 for 10% off")
- **Cross-operator bundles** — combo products that span multiple operators (6 discovered across our test set)
- **Booking system identification** — detects FareHarbor, Peek Pro, Bookeo from embed URLs
- **Long-tail operators** — the walking tour with a WordPress site, the new escape room that isn't on any OTA

**What it can't do:**
- Real-time availability or dynamic pricing
- Pricing locked behind JavaScript booking widgets (the "FareHarbor Wall")
- Reviews, ratings, or professional photography
- Age-band pricing breakdown (adult/child/infant)

**Current gap:** Manual URL selection. We need automated URL discovery and page classification.

### Path B: Booking System APIs

**How it works:** Query the operator's reservation system (FareHarbor, Peek Pro, Bookeo, etc.) directly via API for product data, pricing, and availability.

**What it's uniquely good at:**
- **Real-time pricing and availability** — the definitive source of truth
- **Structured age-band pricing** — adult, child, infant, senior with operator-defined age ranges
- **Capacity and scheduling** — actual time slots, remaining seats
- **Booking capability** — can create reservations programmatically

**The landscape across our 7 operators:**

| Booking System | Operators | API Access | OCTO Standard? | Feasibility |
| --- | --- | --- | --- | --- |
| **FareHarbor** | Tours NW, Shutter Tours, Totally Seattle | Requires $50K transaction volume, EUR 1K fees, signed agreement | No (proprietary) | Blocked until we have volume |
| **Peek Pro** | Evergreen Escapes | Request OCTO API key, operator opts in | Yes (Founding Member) | Accessible now |
| **Bookeo** | Conundroom | Self-serve developer signup, operator authorizes | No (but well-documented REST) | Easy |
| **RocketRez** | Argosy Cruises | Enterprise pricing ($15K+/yr), partner approval | Yes (Technology Member) | Too expensive for now |
| **Gatemaster** | Bill Speidel's | No API whatsoever | No | Dead end |

**Key discovery: OCTO is the multiplier.** OCTO (Open Connectivity for Tours, Activities & Attractions) is an open-source API standard implemented by 130+ organizations. Building one OCTO integration client gives us compatibility with Peek Pro, RocketRez, Ventrata, Xola, Zaui, Bokun, and dozens more. Ventrata offers a free sandbox environment (EdinExplore) for development and testing.

**FareHarbor is the elephant in the room.** It's the dominant North American booking system (20,000+ clients) and covers 3 of our 7 test operators. But as a Booking Holdings subsidiary, they've heavily gated API access — $50K minimum transaction volume, EUR 1K connection fees, per-operator consent, and a 2% API fee on third-party bookings. This is a Phase 2+ problem that resolves itself as TourGraph gains traction.

### Path C: OTA Affiliate APIs (Viator, GetYourGuide)

**How it works:** Query Viator's Partner API (free affiliate access) for structured product data, reviews, images, and (at higher tiers) real-time availability.

**What it's uniquely good at:**
- **Reviews and ratings** — up to 2,078 reviews per product in our test data
- **Professional images** — 10-31 CDN-hosted photos per product vs. 0-4 from extraction
- **Structured pricing** — age-band breakdown (adult/child/infant/senior)
- **Cancellation policies** — standardized, not free-text
- **Meeting points with coordinates** — lat/long for navigation
- **Immediate breadth** — 400,000+ experiences across 2,500+ destinations

**Viator API access tiers:**

| Tier | Cost | What You Get | What's Missing |
| --- | --- | --- | --- |
| **Basic** (what we have) | Free, immediate | Product search, details, images, pricing | No availability, no reviews, no booking |
| **Full** (next step) | Free, requires certification | + Real-time availability, reviews, bulk ingestion | No booking |
| **Full + Booking** | Free, requires certification | + Create bookings, earn 8% commission | Must direct bookings through Viator |

**Critical insight: Viator reflects live booking system data.** FareHarbor and Peek Pro are Viator Connectivity Partners. When an operator's FareHarbor system shows availability, that syncs to Viator's API in real-time. So even though we can't access FareHarbor's API directly, **Viator gives us a window into it** for the 3/7 operators listed on the platform.

**The markup tells the business story.** Our Phase 0 comparison revealed Viator's pricing markup:

| Product | Direct Price | Viator Price | Markup |
| --- | --- | --- | --- |
| Tours NW Mt Rainier (Adult) | $179.00 | $208.56 | +17% |
| Evergreen Mt Rainier (Adult) | $295.00 | $344.00 | +17% |
| Argosy Harbor Cruise (Adult) | $45.45 | $63.28 | +39% |

Operators pay Viator 20-25% commission. An AI-agent distribution channel at lower commission is a compelling operator value proposition.

**Viator coverage gap:** Only 3 of our 7 test operators are on Viator (43%). The 4 missing operators — Shutter Tours, Totally Seattle, Conundroom, Bill Speidel's — are exactly the long-tail operators that Path A extraction serves. This validates the multi-path thesis: neither path alone is sufficient.

---

## The Multi-Path Architecture

No single data source gives us everything. The right architecture combines all three paths and picks the best source for each field:

```text
              ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
              │   Path A     │   │   Path B     │   │   Path C     │
              │  Extraction  │   │ Booking APIs │   │  OTA APIs    │
              │  (websites)  │   │ (OCTO/REST)  │   │  (Viator)    │
              └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
                     │                  │                   │
                     └─────────┬────────┴───────────────────┘
                               │
                     ┌─────────▼──────────┐
                     │    Merge Layer     │
                     │  Best source per   │
                     │  field, per product│
                     └─────────┬──────────┘
                               │
                     ┌─────────▼──────────┐
                     │   OCTO-Aligned DB  │
                     └─────────┬──────────┘
                               │
                     ┌─────────▼──────────┐
                     │    MCP Server      │
                     │  (AI agent layer)  │
                     └────────────────────┘
```

### Field-Level Source Priority

The merge layer doesn't blindly prefer one path. It picks the best source for each field based on data quality:

| Field | Best Source | Why |
| --- | --- | --- |
| Product title | Path A (extraction) | Operator's own naming, not OTA rewrite |
| Description | Path A | Operator voice and local knowledge |
| Pricing | Path B > Path C > Path A | Real-time booking system > OTA curated > extracted |
| Availability | Path B > Path C | Live inventory from booking system |
| Reviews & ratings | Path C (Viator) | Not available from websites or booking APIs |
| Professional images | Path C > Path A | CDN-hosted, curated vs. scraped |
| Age-band pricing | Path B > Path C > Path A | Booking APIs have structured age bands |
| Promo codes | Path A only | Not exposed in any API |
| Cross-operator bundles | Path A only | Not in any API |
| Cancellation policy | Path B > Path C > Path A | APIs have standardized policies |
| Meeting point coordinates | Path C > Path B > Path A | Viator has lat/long |
| Booking system ID | Path A only | Detected from website embed URLs |

### Per-Operator Data Strategy

For each of our 7 test operators, this is the realistic plan:

| Operator | Path A | Path B | Path C | Expected Coverage |
| --- | --- | --- | --- | --- |
| **Tours Northwest** | Re-scrape all detail pages | FareHarbor blocked | Viator (4 products) | High — extraction + Viator enrichment |
| **Shutter Tours** | Nearly complete (1 stub) | FareHarbor blocked | Not on Viator | Good — Path A is sufficient |
| **Totally Seattle** | Nearly complete (2 quote-based) | FareHarbor blocked | Not on Viator | Good — Path A is sufficient |
| **Conundroom** | Nearly complete (2 legitimate stubs) | Bookeo accessible | Not on Viator | High — Path A + optional Bookeo |
| **Bill Speidel's** | Complete but no pricing | No API (Gatemaster) | Not on Viator | Permanent gap — pricing requires JS widget or manual entry |
| **Evergreen Escapes** | Re-scrape 13 detail pages | Peek Pro OCTO accessible | Viator (4 products) | Excellent — all three paths available |
| **Argosy Cruises** | Re-scrape detail pages | RocketRez too expensive | Viator (2 products) | Good — extraction + Viator enrichment |

Evergreen Escapes is the most interesting operator for Phase 1: it's the only one where all three data paths are accessible right now. It becomes our reference implementation for the multi-path architecture.

---

## Web Crawling: Fixing the Extraction Gap

### The Crawling Landscape (2025-2026)

Our Phase 0 used Firecrawl (cloud service, 1 credit per page, 500 free credits/month). The landscape has matured:

| Tool | Throughput | Cost per 1K Pages | Key Strength |
| --- | --- | --- | --- |
| **Crawl4AI** | 19 pages/sec | Free (self-hosted) | Deep crawl strategies (BFS/DFS/Best-First), LLM extraction built in, 58K GitHub stars |
| **Firecrawl** | 27 pages/sec | $0.83-$5.33 | Managed service, /map endpoint for URL discovery, FIRE-1 browser agent (beta) |
| **Spider** | 182 pages/sec | ~$0.65 | Raw speed champion, highest success rate (99.9%) |

**Crawl4AI is the leading candidate for Phase 1+.** It's open-source (Apache 2.0), runs locally (no credit constraints), and has built-in deep crawling with intelligent URL filtering. The trade-off is lower success rates on anti-bot-protected sites (72% vs. Firecrawl's 88%), but tour operator sites generally don't have heavy anti-bot protections.

### The Missing Piece: Automated URL Discovery

Our Phase 0 approach was manual: a human picked which URLs to scrape. This doesn't scale. The fix:

1. **Discover** — Use `sitemap.xml` (free) or Firecrawl `/map` (1 credit) or Crawl4AI (free) to find all URLs on an operator's site
2. **Classify** — Filter by URL pattern (regex, free) + optional LLM classification (Haiku, ~$0.0001/page) to identify listing pages, detail pages, deals pages, and irrelevant pages
3. **Scrape** — Scrape every relevant page, not a sample. Convert to clean markdown.
4. **Extract** — Claude Opus with our domain prompt, batching 3-5 pages per call

This is the standard "map-then-scrape" pattern used across the industry. The key insight: **scrape every detail page, not a cherry-picked sample.** At ~$1-2 per operator for extraction, the cost of completeness is trivial.

### Cost Optimization at Scale

Several proven patterns reduce cost as we scale beyond 7 operators:

- **Markdown over HTML** — 67-96% token reduction (we already do this)
- **Model cascading** — Cheap model for page classification, expensive model only for confirmed tour pages (87% cost reduction in practice)
- **Map-then-scrape** — Discover URLs first, filter, scrape selectively
- **Batching** — Group multiple detail pages per Claude API call
- **Model distillation** (future) — Fine-tune a small model on extraction outputs. Recent research showed a 1.7B parameter model matching 30B+ model performance for extraction tasks after fine-tuning on ~94K examples.

---

## The OCTO Standard: Build Once, Connect Many

OCTO (Open Connectivity for Tours, Activities & Attractions) is an open-source, royalty-free API specification for the experiences industry. 130+ organizations implement it.

### Why It Matters for TourGraph

Building one OCTO client gives us compatibility with multiple booking systems:

| OCTO-Compliant System | Relevance |
| --- | --- |
| **Peek Pro** | Covers Evergreen Escapes (our test operator) |
| **RocketRez** | Covers Argosy Cruises (our test operator) |
| **Ventrata** | Free sandbox for development; enterprise operators |
| **Xola** | US tour operators |
| **Zaui** | Canadian/international operators |
| **Bokun** (TripAdvisor) | Global, 1.5% for API bookings |

### OCTO Data Model

The standard defines endpoints for products, availability, and bookings. With optional capabilities (`octo/pricing` and `octo/content`), you get:

- Product details with title, descriptions, duration, timezone
- Feature arrays typed as INCLUSION, EXCLUSION, HIGHLIGHT, ACCESSIBILITY, etc.
- Media with CDN URLs, types, and gallery relationships
- Locations with coordinates, postal addresses, and external place IDs (Google, TripAdvisor, Yelp)
- Unit types: ADULT, CHILD, INFANT, YOUTH, SENIOR, STUDENT, MILITARY, FAMILY, OTHER
- Per-unit and per-booking pricing with original/retail/net amounts and included taxes

This aligns closely with TourGraph's extraction schema (by design — we built our schema to be OCTO-aligned from day one).

### Development Path

1. Build and test against **Ventrata's EdinExplore sandbox** (free, documented, 2-10 day development)
2. Connect to **Peek Pro** for Evergreen Escapes as the first real operator
3. As more operators come on OCTO-compliant systems, the same client works without modification

---

## Recommendations

### Immediate (Phase 1A)

1. **Upgrade Viator to Full Access** — Free, biggest immediate data quality win. Unlocks real-time availability, reviews, and bulk ingestion for our 3 Viator-listed operators.

2. **Fix the extraction stubs** — Use Firecrawl `/map` or Crawl4AI to discover all pages per operator. Re-scrape the ~21 missing detail pages. Target: eliminate every stub that has a detail page.

3. **Build the Viator merge** — For Tours Northwest, Evergreen Escapes, and Argosy Cruises, merge Viator reviews, images, and structured pricing into our extraction data. We already have this data in `results/viator_mapped/`.

### Near-Term (Phase 1B)

4. **Build an OCTO client** against Ventrata's sandbox. This is the foundation for all Path B integrations.

5. **Connect Peek Pro** — Request OCTO API access for Evergreen Escapes. This gives us the first operator with all three data paths active: extraction + OCTO booking API + Viator.

6. **Evaluate Crawl4AI** — Test against 1-2 operators to determine if it can replace Firecrawl (removes the credit constraint entirely).

### Medium-Term (Phase 2+)

7. **FareHarbor access** — Becomes viable once TourGraph has transaction volume. Covers 3 operators and the dominant North American booking system.

8. **Operator discovery** — Expand beyond our 7 test operators to full Seattle coverage using Google Places API + automated crawl pipeline.

9. **Model distillation** — Fine-tune a small extraction model on our growing dataset to reduce per-operator extraction cost toward zero.

---

## Appendix: Detailed API Research

### Viator Partner API

- **Documentation:** docs.viator.com/partner-api/technical/
- **Current access:** Basic Affiliate (free, immediate)
- **Authentication:** `exp-api-key` header
- **Product data:** Descriptions, images (10-31 per product), pricing by age band, product options/variants (up to 9), inclusions/exclusions, cancellation policies, itineraries, meeting points with coordinates, languages, accessibility
- **Reviews:** Up to 2,078 per product with structured averages (requires Full Access)
- **Real-time availability:** `/availability/check` — true live pricing and slot availability (requires Full Access)
- **Bulk ingestion:** `/products/modified-since` for incremental catalog updates (requires Full Access)
- **Booking commission:** 8% of retail price per completed experience
- **Rate limits:** Rolling 10-second window, specific limits per tier (not publicly documented)
- **Connectivity partners:** FareHarbor, Peek Pro, RocketRez, and 100+ other reservation systems sync availability to Viator in real-time

### GetYourGuide Partner API

- **Documentation:** code.getyourguide.com/partner-api-spec/ (open-source OpenAPI spec on GitHub)
- **Access:** Requires 100K visits/downloads (Basic) or 1M visits + 300 monthly bookings (Reading)
- **Catalog:** ~150,000 experiences, 35,000+ suppliers, strong in Europe
- **Rate limit:** 130 calls/minute
- **Commission:** 8% base, negotiable to 10-12% for high performers
- **Note:** Higher barrier than Viator but useful for European expansion

### FareHarbor External API

- **Documentation:** developer.fareharbor.com/api/external/v1/
- **Access requirements:** $50K trailing 12-month transaction volume, EUR 1K connection + EUR 1K annual fee, signed data license, per-operator consent
- **Endpoints:** Companies, Items (products), Availabilities (by date range), Bookings
- **2% API fee** on third-party bookings (introduced 2023)
- **20,000+ clients** — dominant in North American tours/activities
- **Not OCTO-compliant** — proprietary API
- **Lightframe embed system** loads pricing via JavaScript — the "FareHarbor Wall" that blocks static scraping

### Peek Pro OCTO API

- **Documentation:** octodocs.peek.com
- **Access:** Request OCTO API key, Bearer token auth, operator must enable products per reseller
- **Endpoints (OCTO standard):** Products, Availability Calendar, Availability, Bookings
- **Pricing:** Requires `Octo-Capabilities: octo/pricing` header (not in base response)
- **3% reseller hub fee**
- **OCTO Founding Member** — native implementation

### Bookeo API

- **Documentation:** bookeo.com/api (OpenAPI spec at bookeo.com/apiref/openapi.json)
- **Access:** Self-serve developer registration, OAuth-style per-account authorization
- **Endpoints:** Settings/Products (listings, prices, options), Availability, Bookings, Webhooks
- **No API fee** — SaaS model (operator pays monthly subscription)
- **Not OCTO-compliant** — proprietary REST API

### RocketRez

- **Access:** Enterprise only ($15K+/yr), partner approval required
- **OCTO Technology Member** — likely supports OCTO queries
- **Integrations:** Viator, GetYourGuide, Google Things to Do
- **Series B funded** ($15M, August 2025)

### Gatemaster

- **No public API.** Legacy POS system. No developer portal, no OTA integrations. Dead end for data access.

### OCTO Standard

- **Specification:** docs.octo.travel
- **GitHub:** github.com/octotravel
- **130+ implementing organizations**
- **Core endpoints:** Suppliers, Products, Availability (calendar + per-time), Bookings (create, confirm, cancel)
- **Optional capabilities:** Pricing, Content, Pickups, Dropoffs, Notifications
- **Authentication:** Bearer token (one API key per supplier connection)
- **Ventrata sandbox:** Free EdinExplore environment for development and testing

---

*This document is part of the TourGraph project. See also: [API Landscape](api_landscape.md) | [Tooling Landscape](tooling_landscape.md) | [Project Proposal](project_proposal.md) | [Roadmap](roadmap.md)*
