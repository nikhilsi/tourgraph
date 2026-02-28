# TourGraph — API Landscape & Data Source Strategy

**Project:** TourGraph — AI-Powered Supplier Onboarding for the Agentic Travel Era
**Created:** February 16, 2026
**Updated:** February 18, 2026
**Status:** Research complete, Viator API tested, Path A vs Path C comparison done
**Trigger:** Recon observation that every test operator has TripAdvisor presence led to discovery of OTA APIs as structured data sources

---

## Executive Summary

During Phase 0 reconnaissance of Seattle tour operators, we discovered that the structured tour/experience data we're trying to create through AI extraction **already exists** in queryable APIs — specifically Viator's Partner API, which provides free affiliate access to 300,000+ structured product listings globally.

This introduces a "Path C" to the project strategy: using OTA affiliate APIs as a bulk structured data source to bootstrap the MCP distribution layer, while reserving AI extraction (Path A) for long-tail operators not covered by these platforms.

**This doesn't invalidate Path A — it reframes it.** AI extraction becomes the competitive differentiator for undiscovered operators, not the entire data pipeline.

---

## The Four API Sources

### 1. Viator Partner API — Primary Source (Path C)

**What it is:** The world's largest tours/activities marketplace API. Viator (a TripAdvisor company since 2014) has 300,000+ bookable experiences across 2,500+ destinations. 35M+ monthly visitors. Integrates with 100+ reservation systems.

**Access Tiers:**

| Tier | Cost | Approval | Data Access | Booking |
|------|------|----------|-------------|---------|
| Basic Affiliate | Free | Immediate | Product descriptions, images, ratings, pricing, availability schedules | Redirect to viator.com |
| Full Affiliate | Free | Viator approval required | + Real-time availability, reviews, bulk ingestion (`/products/modified-since`) | Redirect to viator.com |
| Full + Booking Affiliate | Free | Viator approval required | + Transactional booking on your platform | Viator processes payment |
| Merchant | Invoiced by Viator | Significant approval + infrastructure | Full catalog + booking + merchant of record | You process payment |

**Key Endpoints:**
- Product search by destination, category, attraction
- Product details: descriptions, structured metadata, pricing by age band, product options/variants
- Availability schedules: bulk or real-time queries
- Reviews and photos per product
- Locations/meeting points with coordinates
- Attraction associations (product → point of interest mapping)
- Modified-since: incremental updates for catalog ingestion

**Data Richness:**
- Tour name, description, highlights
- Pricing: by age band (adult, child, infant, senior — operator-defined ranges), per product option
- Product options: variants like different departure times, routes, or packages
- Duration, schedule, operating hours
- Inclusions / exclusions
- Cancellation policy (standardized)
- Photos (multiple per product)
- Reviews (with ratings, text, date)
- Meeting point / pickup locations with lat/long
- Itinerary details
- Attraction associations
- Languages offered
- Accessibility information

**Limitations:**
- Affiliate terms require bookings to flow through Viator (redirect or API checkout)
- Cannot use data to build a competing distribution channel outside Viator's ecosystem
- Data coverage limited to operators who have listed on Viator (~80% of commercial operators, but misses the long tail)
- No real-time availability at Basic tier
- Viator controls the data — terms could change

**Documentation:** docs.viator.com/partner-api/

### 2. GetYourGuide Partner API — Secondary Source

**What it is:** Second-largest tours/activities OTA. Berlin-based, strong European presence. 100M+ monthly visitors. OpenAPI spec published on GitHub.

**Access Tiers:**

| Tier | Requirement | Data Access |
|------|-------------|-------------|
| Basic (Teaser) | 100K visits or downloads | Generic descriptions, images, ratings, prices |
| Reading | 1M visits + 300 monthly bookings | Full descriptions, prices, options, availability |
| Booking | Partner manager approval | Full transactional access |
| Masterbill | Partner manager approval | Merchant of record |

**Key Differences from Viator:**
- Higher barrier to entry (traffic minimums vs. free)
- Stronger European market coverage
- Open-source API spec on GitHub: github.com/getyourguide/partner-api-spec
- Commission: 20-30%, negotiated per operator
- "GROUP" pricing category supports per-group (not per-person) pricing — relevant for operators like Totally Seattle

**Our Use:** Secondary data source. Higher barrier makes it less useful for bootstrapping, but the open-source spec is valuable for understanding industry-standard data models. Could target European expansion.

**Documentation:** code.getyourguide.com/partner-api-spec/ and integrator.getyourguide.com

### 3. TripAdvisor Content API — Enrichment Source

**What it is:** Access to TripAdvisor's location data, reviews, and photos. 8 million locations, 1 billion+ reviews.

**Access:**
- Free tier: 5,000 monthly API calls
- Returns: location details + up to 5 reviews + 5 photos per location
- Paid tier: per-request pricing beyond free quota

**Key Limitation:** Location-level data, NOT product-level tour data. If you query "Argosy Cruises Seattle," you get the business listing, overall rating, and some reviews — but NOT individual product details for Harbor Cruise vs. Locks Cruise vs. Christmas Ship Festival.

**Our Use:** Supplementary enrichment only. Add TripAdvisor ratings and review excerpts to inventory records from Path A or Path C. TripAdvisor reviews are the universal trust signal in tours/experiences — having them in our MCP responses adds credibility.

**Documentation:** tripadvisor-content-api.readme.io

### 4. Google Things to Do (GTTD) — Distribution Target (Not Data Source)

**What it is:** Google's tours/activities vertical within Google Travel. Displays bookable tours in Search and Maps.

**Critical Distinction:** GTTD is NOT a read API. It's a **write/ingest pipeline.** Partners upload structured product data TO Google (JSON via SFTP). Google does not expose this data back via API.

**How it works:**
- Operators cannot upload directly — must go through an approved Connectivity Partner
- Connectivity partners include: FareHarbor, Peek, RocketRez, Bókun, and ~30 others
- Data format: JSON feed with product titles, descriptions, prices, availability, booking links
- Full dataset must be re-uploaded each time (no incremental updates)
- Minimum upload frequency: every 30 days

**Four Modules:**
1. **Experiences Module** — tours/activities linked to points of interest
2. **Attractions Booking Module** — entry ticket pricing comparison
3. **Operator Booking Module (OBM)** — direct booking links in Google Business Profile
4. **Ads Module** — paid placement in Things to Do results

**Adoption Gap:** Only ~25% of tour operators and ~20% of activity operators are connected. Over half are unaware it exists.

**Industry AI Quote (Arival, Dec 2024):** "With Generative AI search, the live, structured product data is exactly what the LLM struggles with. If Google Things to do follows a similar path as Google Hotels, we should expect Google's generative AI search results to expand to include tickets and tours products."

**Our Use:** Future distribution target, not a data source. TourGraph could eventually become a Connectivity Partner that feeds structured operator data TO Google GTTD (alongside MCP distribution to AI agents). This would make TourGraph a multi-channel distribution hub: AI agents via MCP + Google via GTTD + OTAs via existing connectors.

---

## Strategic Analysis: Three Paths Combined

### The Path Matrix

| | Path A: AI Extraction | Path B: Channel Manager APIs | Path C: OTA Affiliate APIs |
|---|---|---|---|
| **Source** | Operator websites | FareHarbor, Peek, RocketRez, etc. | Viator, GetYourGuide |
| **Coverage** | 100% (any operator with a website) | ~70% of digitized operators | ~80% of commercial operators |
| **Access** | No permission needed | Partner approval required | Free (Viator basic) |
| **Speed to Data** | Slow (build extraction engine) | Medium (negotiate access) | Fast (sign up and query) |
| **Data Quality** | Variable (depends on website quality) | High (direct from booking system) | High (curated by OTA) |
| **Data Freshness** | Snapshot (re-extract to update) | Real-time | Near-real-time (modified-since) |
| **Independence** | Full — our own technology | Dependent on partner agreements | Dependent on OTA terms |
| **Unique Value** | Long-tail operators, undiscovered inventory | Direct booking, no OTA commission | Immediate breadth, reviews, established trust |
| **Key Risk** | Extraction quality may be insufficient | APIs are gated, may be denied | Terms could change, dependency on Viator |

### Recommended Strategy: Bootstrap → Differentiate → Independence

**Phase 1 (Bootstrap):** Use Path C (Viator Affiliate API) to populate the MCP server quickly with structured data for Seattle operators. Validate that the MCP layer works by making Viator's inventory AI-agent-queryable. Bookings redirect to Viator — this is a legitimate affiliate model.

**Phase 2 (Differentiate):** Layer Path A (AI Extraction) on top for operators NOT on Viator. The walking tour with just a WordPress site. The new escape room. The local food tour that only takes phone reservations. This is inventory that Viator doesn't have — and it's where AI agents can surface genuinely new discoveries for travelers.

**Phase 3 (Independence):** As operator relationships develop, offer Path B (direct channel manager integration) for operators who want bookings without Viator's 20-25% commission. This gives operators a reason to participate actively — lower distribution cost through an AI-agent channel.

### The Viator Dependency Question

**The risk:** If TourGraph bootstraps entirely on Viator's API, we're effectively a Viator affiliate with an MCP interface. Viator could change terms, add their own MCP support, or restrict data access.

**The mitigation:** Path A is the key. AI extraction capability ensures we're never fully dependent on any single data source. The operators NOT on Viator are our exclusive inventory — the differentiation that makes TourGraph more than a Viator wrapper.

**The long-term play:** TourGraph becomes the operator's AI-agent distribution dashboard. They connect their booking system (Path B), we extract and structure any missing data (Path A), and we supplement with OTA data for market context (Path C). The MCP layer serves all AI agents. The operator controls their listing. Viator becomes one of many data inputs, not the foundation.

---

## Phase 0 Implications

The discovery of Path C does NOT change what Phase 0 tests, but adds a valuable comparison dimension:

**Original Phase 0 scope (unchanged):** Test AI extraction (Path A) against real operator websites. Can we reliably extract structured tour data from Shutter Tours, Evergreen Escapes, Totally Seattle, Bill Speidel's, Argosy, Tours Northwest?

**New Phase 0.5 addition (optional but recommended):**
1. Sign up as a Viator affiliate (free, immediate)
2. Query Viator's API for the same operators we're extracting from
3. Compare: What does Viator have that our extraction missed? What did we extract that Viator doesn't have?
4. This comparison tells us:
   - Whether Path C is sufficient for the ~80% or needs enrichment from Path A
   - What unique data Path A captures (e.g., operator-specific policies, local context, undiscovered tours)
   - Whether the MCP layer can be built on Viator data alone as a fast prototype

---

## Viator API Test Results (2026-02-18)

### Setup & Authentication
- Signed up as Viator Basic Access affiliate (free, immediate approval)
- Production API key works immediately; sandbox key may take up to 48 hours to activate
- Authentication: `exp-api-key` header with API key value
- Required headers: `Accept: application/json;version=2.0`, `Content-Type: application/json`, `Accept-Language: en-US`
- Base URL: `https://api.viator.com/partner`
- Script: `scripts/viator_compare.py`

### API Quirks Discovered
- **Freetext search (`/search/freetext`)** results do NOT include `supplier` field — must call `/products/{code}` to get the supplier name
- **Destination filter bug**: Adding `productFiltering.destination` to freetext search silently returns 0 results — removing it works correctly
- **Two-step discovery required**: Search → pull full product details → match by supplier name (not possible from search results alone)
- **Product code prefixes**: Each supplier has a consistent prefix (Tours Northwest = `5396*`, Evergreen Escapes = `5412*`, Argosy Cruises = `2960*`)

### Operator Coverage Results

| Operator | On Viator? | Viator Products | Path A Products | Matched |
|----------|------------|-----------------|-----------------|---------|
| Tours Northwest | Yes | 4 | 17 | 4 |
| Evergreen Escapes | Yes | 4 | 19 | 2 |
| Argosy Cruises | Yes | 2 | 13 | 2 |
| Shutter Tours | **No** | 0 | 7 | 0 |
| Totally Seattle | **No** | 0 | 13 | 0 |
| Conundroom | **No** | 0 | 12 | 0 |
| Bill Speidel's | **No** | 0 | 2 | 0 |
| **Total** | **3/7** | **10** | **83** | **8** |

### Path A vs Path C: What Each Uniquely Provides

**Path A exclusive data (extraction captures what Viator doesn't):**
- Promo codes and active discounts (e.g., RAINIER10 for 10% off)
- Cross-operator bundles (e.g., Tours NW + Argosy combo)
- Booking system identification (FareHarbor, Peek Pro, Bookeo, etc.)
- Operator-authored FAQs with local knowledge
- Long-tail operators not on any OTA (4/7 in our test set)

**Path C exclusive data (Viator has what extraction can't get):**
- Reviews and ratings (up to 2,078 reviews per product, structured with averages)
- CDN-hosted professional images (10-31 per product vs 0-4 from extraction)
- Standardized pricing with age bands (ADULT, CHILD, INFANT, YOUTH, SENIOR)
- Product options/variants (up to 9 per product)
- Structured accessibility data
- Language guide information
- Cancellation policies (structured, not free-text)

### Pricing Comparison (Viator markup visible)

| Product | Path A (Direct) | Path C (Viator Retail) | Markup |
|---------|----------------|----------------------|--------|
| Tours NW Mt Rainier (Adult) | $179.00 | $208.56 | +17% |
| Evergreen Mt Rainier (Adult) | $295.00 | $344.00 | +17% |
| Evergreen Olympic NP (Adult) | $315.00 | $368.00 | +17% |
| Argosy Harbor Cruise (Adult) | $45.45 | $63.28 | +39%* |

*Argosy match was imperfect (Harbor Cruise matched to Locks Cruise in comparison).

### Strategic Conclusion

**Path A and Path C are complementary, not competing.** The test confirmed the hypothesis from this document's strategic analysis — both are needed:
- Path A for **coverage** (8x more products) and **unique data** (long tail, promos, bundles)
- Path C for **enrichment** (reviews, images, structured pricing)
- Combined: the strongest possible MCP server inventory

Full comparison report: `results/comparisons/path_a_vs_path_c.md`

---

## Key Takeaways

1. **Structured tour data already exists at scale** — in Viator's API, queryable for free. We don't have to build it from scratch for most commercial operators.

2. **AI extraction (Path A) is the differentiator, not the foundation.** The long-tail operators not on Viator are our unique inventory. The extraction engine is what makes TourGraph more than a Viator wrapper. **Confirmed by test:** 4/7 operators not on Viator, 8x product coverage from extraction.

3. **The MCP layer is the unique value regardless of data source.** Viator, FareHarbor, Peek, and Google GTTD all have structured data. None of them distribute to AI agents. The MCP interface is what TourGraph uniquely provides.

4. **The business model options expand.** TourGraph could be: (a) a Viator affiliate with MCP distribution, (b) an independent AI-extraction platform, (c) a multi-source aggregator, or (d) all of the above at different tiers.

5. **Google GTTD validates the thesis from the industry's own direction.** The move toward structured data feeds for tours/activities is an industry trend, not just our idea. The AI-agent distribution channel is the next step after Google.

6. **Viator pricing reveals the commission opportunity.** Direct prices are 10-39% lower than Viator retail. Operators have a clear incentive to distribute through channels with lower commission — like an AI-agent channel.

---

*This document is part of the TourGraph project. See also: project_proposal.md, phase0_spike.md, tooling_landscape.md, glossary.md*
