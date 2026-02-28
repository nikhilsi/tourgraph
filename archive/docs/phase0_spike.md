# TourGraph — Phase 0: Feasibility Spike

**Project:** TourGraph — AI-Powered Supplier Onboarding for the Agentic Travel Era
**Phase:** 0 — Feasibility Spike
**Duration:** ~1 week
**Status:** Complete — All 5 steps done, GO recommended

---

## Objective

Answer one critical question before investing further: **Can AI reliably extract structured tour/experience data from real operator websites?**

This is the gate. If extraction doesn't work well enough, we pivot before sinking weeks into the project. If it does, everything else (MCP server, dashboard, distribution connectors) is plumbing built on top of a proven foundation.

### What "Works Well Enough" Means

- **>70% accuracy** on core fields (name, price, duration, description) across varied website types
- **Consistent output format** — the AI returns structured data in a predictable schema regardless of source website quality
- **Identifiable failure patterns** — we can clearly see *where* and *why* extraction breaks down, not just that it sometimes fails
- **Edge cases are manageable** — complex pricing, seasonal availability, and custom/private tours may not extract perfectly, but the failures are predictable and fixable

### What We're NOT Testing in Phase 0

- MCP integration (that's Phase 2)
- Operator-facing UI (that's Phase 1/3)
- OTA export formats (that's Phase 3)
- Real-time availability (out of scope — we're extracting catalog/listing data only)
- Booking functionality (way out of scope)

---

## Greater Seattle Experience Provider Landscape

The Seattle metro area has a rich and diverse set of tour operators and experience providers. These represent the types of businesses that TourGraph would serve. Understanding the full landscape helps us select a representative test set.

### Category 1: City Walking / Sightseeing Tours

Operators who run guided tours of Seattle neighborhoods, landmarks, and history. Typically small businesses, 2-15 employees, seasonal guides.

| Operator | Notes |
|----------|-------|
| Shutter Tours | Family-owned, 17 years, photography-focused tours. 1,400+ five-star TripAdvisor reviews. Top 10% worldwide. |
| Totally Seattle | Private/custom walking tours. Pike Place Market PDA licensed. Personalized experiences. |
| Show Me Seattle | Small group city tours. Longtime operator. |
| Bill Speidel's Underground Tour | Iconic Pioneer Square underground tour. One of Seattle's most well-known experiences. |
| Beneath the Streets | Competing underground tour operator in Pioneer Square. |
| Seattle Free Walking Tours | Pay-what-you-want model. Four topic areas: Pike Place, historic Seattle, city highlights. |
| City Sightseeing Seattle | Hop-on/hop-off open-top bus. 16 stops around the city. |

### Category 2: Day Trips / Nature / Outdoor

Operators offering full-day excursions from Seattle to Mt. Rainier, Olympic National Park, Snoqualmie Falls, and other PNW natural destinations.

| Operator | Notes |
|----------|-------|
| Evergreen Escapes | Small group nature tours since 2006. Mt. Rainier, Olympic, San Juan Islands. All-inclusive model. Also Portland departures. |
| Tours Northwest | 30+ year family business. City tours + Mt. Rainier. Partnered with Argosy for combo tours. Pre-cruise city tours. |

### Category 3: Water-Based Experiences

Harbor cruises, whale watching, ferry trips, and kayaking. Range from large commercial operations to small outfitters.

| Operator | Notes |
|----------|-------|
| Argosy Cruises | Largest Seattle cruise operator. Five tour options including signature Harbor Cruise. Dinner cruises, holiday events. |
| Clipper Vacations (Victoria Clipper) | High-speed ferry to Victoria BC. Day trip packages, whale watching combos. Hybrid: transportation + experience. |
| Kenmore Air | Floatplane scenic flights. 20-minute tours over downtown Seattle. Also scheduled service to San Juans. |
| Seattle Seaplanes | Similar floatplane tours from Lake Union. |
| Various whale watching operators | Primarily San Juan Islands based, departing from Anacortes or Friday Harbor. |
| Kayak tour operators | Urban kayaking (Lake Union, Elliott Bay) and San Juan Islands sea kayaking. |

### Category 4: Air / Adventure

Helicopter tours, hot air balloons, and other aerial experiences.

| Operator | Notes |
|----------|-------|
| Seattle HeliTours | Helicopter tours departing from Auburn Municipal Airport. Three routes. |
| Atomic Helicopters | Georgetown-based. Four itineraries covering city, Snoqualmie Falls, Lake Washington, Puget Sound. |
| Seattle Ballooning | Semi-private and private hot air balloon rides. Champagne toast. Premium pricing. |

### Category 5: Food & Drink

Culinary tours, coffee tours, and wine experiences. Seattle's food scene and proximity to Woodinville wine country make this a strong category.

| Operator | Notes |
|----------|-------|
| Various Pike Place Market food tours | Multiple competing operators. Walking + tasting format. |
| Seattle coffee tours | Multiple operators capitalizing on Seattle's coffee culture. |
| Woodinville wine tour operators | Wine country is 30 minutes from downtown. Multiple tour companies. |

### Category 6: Entertainment / Venues

Experience providers that aren't "tours" in the traditional sense — escape rooms, interactive experiences, cocktail labs, etc.

| Operator | Notes |
|----------|-------|
| Escape room operators (Redmond area) | Personal contact has 1 location, opening 2 more. Good validation candidate for Phase 4. |
| Cocktail experience labs | Hands-on mixology classes. Spotted on TripAdvisor listings. |
| Various museums/attractions | Museum of Pop Culture, Chihuly Garden, etc. These are venues, not operators — different data structure. |

### Category 7: Cruise Pre/Post Tours

A distinct sub-market. Seattle is a major Alaska cruise departure port. Several operators specifically offer half-day or full-day tours targeting cruise passengers.

| Operator | Notes |
|----------|-------|
| Tours Northwest | Has specific pre-cruise city tour product with cruise port shuttle included. |
| Multiple operators | This is a time-sensitive, logistics-heavy segment — interesting extraction challenge. |

---

## Phase 0 Test Set — Selected Operators

Seven operators selected to provide variety across experience type, website quality, pricing complexity, and business model.

### 1. Shutter Tours
- **URL:** shuttertours.com
- **Sitemap:** shuttertours.com/sitemap.xml
- **Booking system:** FareHarbor (fareharbor.com/embeds/book/shuttertours/)
- **OTA presence:** Listed on Viator and Expedia. Refund policy explicitly references both.
- **Type:** City / photography tours
- **Why selected:** Professional, well-established site. Multiple tours. Rich content (descriptions, reviews, photos). Should be the "easy case" — if extraction fails here, we have a problem.
- **Extraction challenge:** Multiple tours with different pricing, seasonal schedules.
- **Recon notes:**
  - ~5-6 tours offered, some cancelled until further notice (can AI detect tour status?)
  - Tour pages are individual PHP pages (e.g., snoqualmie-falls-tour.php)
  - Meeting point clearly described (Pike Place Market Information booth, near Rachel the pig)
  - 4-hour tours, pricing per person, group discounts available by phone
  - Hotel pickups offered for downtown Seattle hotels
  - Accessibility info present (foldable wheelchairs OK, no motorized)
  - Offers free e-book on direct booking (incentive to book direct vs. OTA)
  - Data flow: Website (marketing) → FareHarbor (booking/structured data) → Viator/Expedia (OTA distribution) → No AI agent access

### 2. Evergreen Escapes
- **URL:** evergreenescapes.com
- **Sitemap:** evergreenescapes.com/sitemap.xml
- **Booking system:** Peek Pro (book.peek.com) — primary. Also has a FareHarbor link for gift certificates (possible legacy or dual system).
- **Type:** Nature day trips (Mt. Rainier, Olympic, etc.)
- **Why selected:** Well-structured site, different pricing model (all-inclusive), multiple departure cities (Seattle + Portland). Tests extraction of complex logistics.
- **Extraction challenge:** All-inclusive pricing, seasonal availability, varying group sizes, tiered pickup locations, dietary accommodations.
- **Recon notes:**
  - ~15+ tour products across Seattle and Portland departures, including multi-day tours (2-day, 3-day, 4-day, 5-day)
  - Tours categorized by season (summer vs. winter), destination, and theme
  - Mt. Rainier tour page is extremely data-rich — excellent extraction test:
    - Price: $295/person + WA state taxes
    - Duration: 8:00a to 6:30p (~10.5 hours)
    - Schedule: May-Oct daily, Nov-April Saturdays + Mondays
    - Group size: 10 or fewer
    - Age restriction: 10 years and up
    - Pickup: Downtown Seattle + centralized SeaTac/Tacoma with specific hotel addresses
    - All-inclusive: breakfast, lunch (dietary accommodations with 48hr notice), snacks, beverages, transportation, entrance fees, permits, gear
    - Vehicle details: Ford Transit vans, 2020+, built for 15 but limited to 10 seats
    - Private tour option available
    - Hour-by-hour sample itinerary
  - Part of a family of companies: Bicycle Adventures, San Juan Kayak, Cycle Portland, Seattle Mountain Bike Tours, Sacred Rides
  - Peek embed uses iframe/lightframe pattern — booking widget loads from book.peek.com but renders within evergreenescapes.com domain
  - WordPress site (standard for this market)
  - This tour page alone has more extractable data than most operators' entire websites — good stress test for schema depth

### 3. Totally Seattle
- **URL:** totallyseattle.com
- **Booking system:** FareHarbor (fareharbor.com/embeds/book/totallyseattle/)
- **Type:** Private/custom driving tours + specialty experiences
- **Why selected:** Completely different pricing model from operators 1 and 2 — per-group not per-person, tiered packages, extensive add-ons. Tests whether extraction handles non-standard pricing and high complexity.
- **Extraction challenge:** Multi-tier pricing, add-on experiences, custom/private model, per-group vs. per-person pricing.
- **Recon notes:**
  - This is a HARD extraction test. The pricing model is fundamentally different:
    - **Three package tiers** for the same tour:
      - Silver (Self-guided with driver): $675/4hrs + $125/additional hr, up to 6 passengers
      - Gold (Expert driver-guide): $785/4hrs + $175/additional hr, up to 7 passengers
      - Platinum (Guide + dedicated chauffeur): $1,250/4hrs + $250/additional hr, up to 6 passengers, foreign language option +$50/hr
    - Pricing is per GROUP not per person — fundamental schema difference from Shutter Tours ($X/person) and Evergreen ($295/person)
  - **15+ add-on experiences** with per-person pricing and recommended time additions:
    - Space Needle + Chihuly: $90/person (+2hrs)
    - Underground Tour: $50/person (+2hrs)
    - Pike Place Market tastings: $25/person (+1hr)
    - Some add-ons have no listed price (just recommended time)
  - **Extra fees for logistics:**
    - SeaTac Airport pickup: $100 (curbside) or $200 (baggage claim greeter)
    - Cruise port pickup: $100
    - Outside Seattle city limits: $50
  - **Inclusions/exclusions clearly listed** but different per package tier
  - Tour highlights are descriptive (15 stops listed) but without individual timing
  - Custom experiences and corporate events are separate product lines
  - "Step-on Services" — a B2B offering where they provide guides for other companies' vehicles
  - WordPress site, built by Tourism Marketing Agency
  - Founding member of Tourpreneur (industry community)
  - **Key extraction questions this raises:**
    - Can AI handle tiered pricing (Silver/Gold/Platinum) as one tour with variants vs. three separate tours?
    - How to represent add-ons in a structured schema? They're not separate tours — they're modifiers.
    - Per-group pricing doesn't fit the per-person model that OCTO and most OTAs assume
    - Some add-on prices are blank ("—") — how does AI handle missing data vs. intentionally free?

### 4. Bill Speidel's Underground Tour
- **URL:** undergroundtour.com
- **Sitemap:** undergroundtour.com/sitemap_index.xml
- **Booking system:** Gatemaster Tickets (gatemastertickets.com) — NOT FareHarbor or Peek. Gatemaster is a ticketing/admissions platform used by attractions, museums, and events. Different category from tour-specific channel managers.
- **Type:** Single iconic experience — underground walking tour of Pioneer Square
- **Why selected:** Simplest possible case — one main tour product, one location. If AI can't extract this cleanly, the approach has fundamental issues. Also tests extraction when the entire website IS the product page (no dedicated tour detail page).
- **Extraction challenge:** Minimal — this is the control case.
- **Recon notes:**
  - **One product.** The entire website is essentially a single tour page. No separate /tours/underground-tour URL — the homepage and the product ARE the same thing.
  - No dedicated tour detail page structure — extraction needs to work from the homepage/general site content
  - Booking system is a third type in our test set (Gatemaster vs. FareHarbor vs. Peek) — confirms the ecosystem is fragmented beyond the big channel managers
  - As an "attraction with scheduled entry times," this is closer to a museum/venue model than a guided-tour-from-a-meeting-point model
  - WordPress site (fourth in a row — WordPress is clearly the default for this market)
  - **Key extraction questions:**
    - Can AI extract a structured tour definition when there's no dedicated tour page — just a website about one thing?
    - How does extraction handle a site where the product info is spread across multiple pages (about, FAQ, etc.) rather than consolidated on one page?
    - Different booking platform (Gatemaster) means different data sits in a different system — further validates that Path A (website extraction) is necessary since not everyone is on FareHarbor/Peek

### 5. Argosy Cruises
- **URL:** argosycruises.com
- **Sitemap:** argosycruises.com/sitemap_index.xml — massive site with MULTIPLE sub-sitemaps:
  - `cruises-sitemap.xml` — 60+ URLs (cruise products, individual sights/landmarks, vessel pages)
  - `page-sitemap.xml` — 100+ URLs (deals, combos, menus, discounts, events, FAQ, etc.)
  - `cruise-types-sitemap.xml` — taxonomy pages (sightseeing, fleet, groups, special events)
  - `cruise-tags-sitemap.xml` — additional tagging taxonomy
- **Booking system:** RocketRez (rocketrez.com) — confirmed via `secure.rocket-rez.com` links in combo ticket purchase URLs. RocketRez is a **fifth** booking platform type in our test set — a cloud-based ticketing & operations platform designed for mid-market tours and attractions (zoos, aquariums, museums, cruise/ferry operators). Series B funded ($15M, Aug 2025). Integrates directly with Viator, GetYourGuide, Google Things to Do. Has dynamic pricing, membership management, F&B POS, retail, events — far more enterprise than FareHarbor/Peek. Founded by former attraction operators.
- **OTA presence:** Viator/TripAdvisor (strong presence, multiple products listed), CityPASS (official partner — Harbor Cruise is one of the 5 CityPASS attractions), Seattle Premier Attractions consortium, Yelp (900+ reviews).
- **AI-agent distribution:** None. No MCP endpoint.
- **Type:** Large-scale cruise/experience operator — fleet of 6 named vessels, 75+ year history, PNW's largest charter fleet
- **Why selected:** By far the most complex operator in our test set. Tests every edge case: large product catalog, seasonal/event-based products, multiple pricing models, discount/combo layers, separate charter/B2B business, and a massive content-rich website where extraction must distinguish "products" from "sights" and "vessels."
- **Extraction challenge:** EXTREME — this is the stress test.
- **Recon notes:**

  **Core Sightseeing Products (year-round, bookable online):**
  - **Harbor Cruise** — 1 hour, Elliott Bay. Adult $45.45, Youth (4-12) $25.64, Kid (3-under) Free. Prices include taxes + online ticketing fee. Departs Pier 55.
  - **Locks Cruise** — 2 hours, ONE-WAY journey (Puget Sound to Lake Union through Ballard Locks). Departs from Pier 54 or AGC Marina depending on direction. Return Bus add-on available ($35.50 adult / $30.50 youth as CityPASS upgrade).
  - **Summer Views Cruise** — 1.5 hours, seasonal summer offering.
  - **Private Views Cruise** — 1.5-hour budget-friendly private group option.

  **Upgrade Layer — "First to Board":**
  - Add-on for Harbor Cruise: $62.94 vs $45.45 (standard). Skip the line, first to bar, 15% off drinks. Youth/Kid price unchanged.
  - This is an UPSELL MODIFIER, not a separate product — tests whether extraction understands upgrade tiers.

  **Seasonal/Event Products (not always active):**
  - Christmas Ship Festival (Nov-Dec) — multiple sub-products: Follow Boat, Opening Night, Grand Finale, 21+ Follow Boat, Parade of Boats
  - New Year's Eve — 21+ Party Cruise AND Fireworks Viewing Cruise (two different products, same night)
  - 4th of July Fireworks viewing
  - Seafair Blue Angels viewing
  - Husky Football Sailgating — season passes + single game, from Carillon Point in Kirkland
  - 2026 Summer Soccer — tied to FIFA Club World Cup in Seattle, both sightseeing and private charter pages
  - Halloween on the Waterfront
  - Boatoberfest

  **Deals & Discounts Layer (MASSIVE extraction complexity):**
  - WA State Resident Discount: $4 off sightseeing cruises (show state ID at boarding)
  - Game Day Discount: 12% off Harbor and Locks on professional Seattle sports game days
  - Boeing Employees Discount (dedicated page)
  - AAA Discount (dedicated page)
  - Teacher Discount (dedicated page)
  - CityPASS integration — Harbor Cruise included in Seattle CityPASS, separate redemption flow
  - Combo tickets sold via RocketRez:
    - Harbor Cruise + Hop-On Hop-Off bus
    - Locks Cruise + Hop-On Hop-Off bus
    - Harbor Cruise + Sky View Observatory
    - Harbor Cruise + Seattle City Tour (with Tours Northwest!)
  - Concierge Discount (hotel/tourism partners)
  - Cyber Monday deals, Flash Sales, Presale events
  - Group rates (20+ minimum)
  - Gift cards via online shop

  **Private Charters (quote-based, no online pricing):**
  - Corporate events, weddings, school events (proms/graduation), holiday parties
  - 6-vessel fleet: Salish Explorer, Spirit of Seattle, Lady Mary, Goodtime II, Goodtime III, Queen's Launch — each with different capacity (up to 400 guests)
  - Charter book PDF available for download
  - All pricing is "Request a Quote" — fundamentally different from bookable sightseeing products

  **Other Business Lines:**
  - Blake Island excursions (kayaking, camping, boater access)
  - School educational programs
  - Onboard food & beverage (separate menus per vessel: SOS menu, GT3 menu, SX menu, Husky menu)
  - Online gift shop (shop.argosycruises.com — separate subdomain)
  - Community giving / donation requests
  - Employment / careers (jobs.argosycruises.com)

  **Website Architecture Challenge:**
  - WordPress site (consistent with all other operators)
  - The `cruises-sitemap.xml` mixes PRODUCT PAGES with SIGHT PAGES and VESSEL PAGES:
    - Product: `/argosy-cruises/harbor-cruise/` (bookable tour)
    - Sight: `/argosy-cruises/seattle-skyline/`, `/argosy-cruises/mount-rainier/` (informational landmark pages)
    - Vessel: `/argosy-cruises/spirit-of-seattle/`, `/argosy-cruises/lady-mary/` (fleet pages)
    - Event: `/argosy-cruises/christmas-ship-festival/` (seasonal product)
    - B2B: `/argosy-cruises/corporate-events/` (charter inquiry page)
  - AI extraction must CLASSIFY each URL before extracting — not everything is a bookable product
  - 160+ total pages across sub-sitemaps, but probably only 5-10 are actual bookable sightseeing products

  **Key Extraction Questions:**
  - Can AI distinguish between a bookable product page, a landmark info page, a vessel profile page, and a charter inquiry page — all under the same `/argosy-cruises/` URL prefix?
  - How to handle the upgrade layer (First to Board) — separate product or modifier on Harbor Cruise?
  - How to handle 10+ different discount programs that modify base pricing?
  - Seasonal products that are dormant most of the year — extract from page content or mark as inactive?
  - Combo products that bundle Argosy with third-party operators (e.g., Harbor Cruise + Seattle City Tour with Tours Northwest)
  - Quote-based charter business has no extractable pricing — how does the schema represent "pricing: contact for quote"?
  - Multiple departure locations for the same cruise (Locks Cruise departs from two different piers depending on direction) — location is not static
  - RocketRez as booking system is enterprise-grade with API, dynamic pricing, OTA distribution — furthest from "small operator with a website" in our test set

### 6. Tours Northwest
- **URL:** toursnorthwest.com
- **Sitemap:** toursnorthwest.com/sitemap.xml (XML) + toursnorthwest.com/sitemap/ (human-readable HTML sitemap page — nice touch)
- **Booking system:** FareHarbor — confirmed via `fareharbor.com/embeds/book/toursnorthwest/` embed links and "Powered by FareHarbor" footer
- **OTA presence:** TripAdvisor (2025 Certificate of Excellence badge displayed in footer), Yelp, Visit Seattle member
- **Type:** Mid-size family operator — 30+ year business, public tours + private SUV tours + national park tours + group/charter
- **Why selected:** Clean, well-organized site with clear product taxonomy. Combo products that bundle with Argosy Cruises. Pre-cruise specific products targeting Alaska cruise passengers. Private tours split by group size (SUV 1-5 vs. Transit 6+). Tests extraction of cross-operator partnerships and logistics-heavy products.
- **Extraction challenge:** Medium-High — cross-operator combo products, vehicle-based capacity tiers, seasonal availability, promo codes.
- **Recon notes:**

  **Product Catalog (~15 distinct products, well-organized into categories):**

  *Public Tours (7 products):*
  - Seattle City Tour Package PLUS Hotel Pickup
  - Seattle Highlights: Seattle City Tour Bus
  - Snoqualmie Falls Tours from Seattle
  - Pre-Alaska Cruise Transportation and City Tour — cruise port shuttle included
  - Ultimate Seattle Experience: City Tour, Pike Place, Argosy Harbor Cruise — COMBO with Argosy ($159 adult / $139 child / free infants 0-3, 7 hours, seasonal May 15-Sep 14)
  - Seattle Photo Safari
  - Mt. Rainier Tour from Seattle — $179 adult (13+) / $149 child (5-12), 10-11 hours, year-round. Active promo code: RAINIER10 for 10% off (displayed in site banner).

  *Private SUV Tours (Group 1-5, 6 products):*
  - Private Seattle in One Day Tour
  - Private Mt. Rainier Tour
  - Private Snoqualmie Falls Tour
  - Private SUV Seattle Tour
  - Private Boeing Factory Tour
  - Private SUV Tour: Museum of Glass Tacoma

  *Private Group Tours (6+):*
  - Private Small Group Seattle Tour (Transit vehicle)

  *National Park Tours:*
  - Olympic National Park 2-day Tour (multi-day!)
  - Mt. Rainier Tour (also listed under public)

  *B2B/Custom:*
  - Group Tours & Seattle Charter Bus Rentals (quote-based)
  - Seattle Team Building Corporate Outing (quote-based)
  - Custom Tour Request Form

  **Pricing Structure (clean, per-person):**
  - Mt. Rainier: Adult $179, Child $149 (ages 5-12), ages 5+ minimum
  - Ultimate Seattle Experience: Adult $159, Child $139, Infants/Toddlers (0-3) Free
  - Pricing displayed directly on tour pages, no ambiguity
  - Active promo code visible on site (RAINIER10) — tests whether AI extracts promotional pricing

  **Cross-Operator Partnership — Argosy:**
  - "Ultimate Seattle Experience" explicitly bundles Tours Northwest city tour + 1-hour Argosy Harbor Cruise + Pike Place Market time + optional Space Needle
  - The Argosy portion is described in detail on Tours Northwest's page, including Argosy's own product description
  - This is the SAME combo product visible on Argosy's deals page — seen from both sides of the partnership
  - **Extraction question:** Does the AI understand this is a bundled product containing another operator's offering? How should the schema represent cross-operator combos?

  **Pre-Cruise Logistics Product:**
  - "Pre-Alaska Cruise Transportation and City Tour" specifically targets cruise passengers
  - Includes cruise port drop-off — transportation is part of the product, not just a tour
  - Tests extraction of logistics/transportation components embedded in tour products

  **Vehicle-Based Capacity:**
  - Private tours split into SUV (1-5 guests) vs. Transit (6+ guests)
  - Same destination tour offered in two vehicle tiers — similar to Totally Seattle's tier model but vehicle-based rather than service-level-based

  **Website Quality:**
  - WordPress site (sixth for six — universal in this market)
  - Very clean, well-organized navigation with clear categories
  - Human-readable sitemap page is a nice UX touch
  - Each tour page has consistent structure: images, pricing, quick details (ages, duration, schedule), description, booking embed
  - "Meet Your Guide" page (personalized operator branding)
  - Active blog with SEO content
  - **This is the best-organized site in our test set — should produce the cleanest extraction results**

  **Key Extraction Questions:**
  - Can AI handle the cross-operator combo (Tours NW + Argosy) as a single product with embedded third-party components?
  - Does AI extract the promo code (RAINIER10) and recognize it as a temporary discount vs. permanent pricing?
  - How does extraction handle the vehicle tier split — are "Private Mt. Rainier Tour" and "Mt. Rainier Tour from Seattle" recognized as related but distinct products?
  - Multi-day product (Olympic National Park 2-day) — does the schema handle overnight tours?
  - Transportation-included products (cruise port shuttle) — is that an inclusion or a separate line item?

### 7. Conundroom Escape Rooms — conundroom.us
- **URL:** https://conundroom.us/
- **Type:** Entertainment venue / non-tour experience — escape rooms
- **Booking system:** Bookeo (bookeo.com/conundroom and bookeo.com/conundroomdowntown) — dominant booking platform for escape rooms, analogous to FareHarbor for tours. Sixth distinct booking platform in test set. Month-to-month SaaS, no commission, no consumer fees. Less OTA-integrated than FareHarbor/Peek.
- **Website platform:** LP-based site (lpcdn.site) — clean single-page design with all rooms listed on one page
- **Location:** Three locations, all in Redmond, WA:
  - Downtown Redmond: 16261 Redmond Way, #150 (The Vault, Luck & Key Bar, Frankenstein)
  - 14824 NE 95th St (School of Magic, Crafted, Party room)
  - 16088 NE 85th St (Alice in Wonderland, Ghost Ship, Zeppelin)
- **Why selected:** Not a "tour" at all — tests whether extraction works for broader experience providers. Different data model (rooms, difficulty levels, player count, time slots vs. tour dates/times). Clean site with well-structured data makes it a fair extraction test. Local/family-owned, represents small business archetype.
- **Product catalog (10 rooms across 3 locations):**
  - The Vault 67 — 3-8 players, Challenging difficulty, $46/player, 60min, multi-room
  - Dr. Frankenstein: The Final Experiment — 3-6 players, Medium difficulty, $46/player, 60min, multi-room, scary theme
  - Luck & Key Bar: The Heist — details on site
  - School of Magic — details on site
  - Crafted — details on site
  - Alice in Wonderland — reimagined 2024 with local Seattle artists, all ages, multi-room
  - Ghost Ship — details on site
  - Zeppelin — details on site
  - Pirate Galleon (family choice) — details on site
  - Plus party room (not a game, venue rental)
- **Pricing model:** Flat $46/player across rooms. Simple, no group-size variations.
- **Key attributes per room:** Player count (min-max), difficulty level, duration (60min standard), theme/genre tags, multi-room flag, age restrictions (14+ for most, with adult accompaniment rule for under-14), wheelchair accessibility, detailed narrative descriptions.
- **Cross-business:** Same ownership runs Pacific Axes (axe throwing) at pacificaxes.com — shows experience business diversification.
- **Policies:** Soft cancellation (credit for future game even on no-show). All games private (no strangers).
- **Extraction challenge:** Completely different data structure from tours. Room-based, not route-based. Fixed location, not meeting-point-based. Room-specific attributes (difficulty, success rate, player count, room count) don't map to standard tour schemas. Tests schema flexibility. Three separate locations for one operator — multi-location handling. Good test case because data is well-structured on the page (embedded in image captions with consistent formatting: MINUTES, Players, Room type, Difficulty, Price).

**NOTE — FLEE Escape (fleeescape.com) retained as "worst case" stress test reference:**
FLEE was the original escape room candidate but swapped out for extraction testing due to extremely messy Squarespace site (20+ dead event pages from 2017-2018, test pages in sitemap, duplicate pages, JS-loaded content, expired promos). Also runs TWO separate booking systems (Bookeo for escape rooms + Zero Latency VR's own platform for VR games) and has 7+ business lines (escape rooms, free-roam VR, portable games, AR outdoor games, virtual games, facility rental, summer camp). Useful as a stress test for how AI handles maximum noise-to-signal ratio, but not a fair baseline extraction test. FLEE pricing: $40/player ($45 for groups of 2 — reverse group discount). 6 rooms, all 60min, all private. On TripAdvisor/Viator despite the website mess — pattern holds.

---

## Spike Methodology

### Step 1: Define Extraction Schema (Day 1)

Before extracting anything, define what we're trying to extract. The schema is informed by OCTO (Open Connectivity for Tours, Activities & Attractions) — the industry's open standard for experience data exchange — but scoped to what's realistically extractable from public websites.

**OCTO alignment rationale:** OCTO is adopted by 114+ trading partners including Peek Pro, Xola, Zaui, Ventrata, and connected to Viator, GetYourGuide, Expedia, Klook, and Tiqets. Aligning our extraction schema to OCTO's field naming and structure means our output is already industry-compatible. In Phase 1, we can map directly to full OCTO for booking system integration (Path B).

**Schema: TourGraph Extraction Target v0.1 (OCTO-aligned + extensions)**

*Core Fields (OCTO Content Capability aligned — high extraction confidence):*

| Field | OCTO Equivalent | Type | Description | Expected Accuracy |
|-------|----------------|------|-------------|-------------------|
| `title` | `Product.title` | string | Public product/experience name | Very High |
| `shortDescription` | `Product.shortDescription` | string | 1-2 sentence summary | High (AI-generated from page content) |
| `description` | `Product.description` | string | Full narrative description | High |
| `features` | `Product.features[]` | array | Typed list: INCLUSION, EXCLUSION, HIGHLIGHT, ACCESSIBILITY_INFORMATION, CANCELLATION_TERM, ADDITIONAL_INFORMATION | Medium-High (depends on site structure) |
| `locations` | `Product.locations[]` | array | Typed: START (meeting point), END (drop-off), POINT_OF_INTEREST | Medium (addresses yes, coordinates need geocoding) |
| `media` | `Product.media[]` | array | Image URLs with type and caption | Medium (extractable but noisy) |
| `faqs` | `Product.faqs[]` | array | Question/answer pairs | Low-Medium (only some sites have FAQ sections) |

*Pricing Fields (OCTO Pricing Capability aligned — medium extraction confidence):*

| Field | OCTO Equivalent | Type | Description | Expected Accuracy |
|-------|----------------|------|-------------|-------------------|
| `pricingModel` | `Product.pricingPer` | enum | PER_UNIT (per person) or PER_BOOKING (per group) | High |
| `currency` | `Product.defaultCurrency` | string | ISO currency code (USD for all test set) | Very High (inferred) |
| `priceByUnit` | `Unit.pricing` | array | Price per unit type: [{unitType: "adult", amount: 4000}, {unitType: "child", amount: 2500}] — amounts in cents | Medium (visible on some sites, in booking widget on others) |
| `priceTiers` | — (TourGraph extension) | array | Group-size pricing tiers: [{minUnits: 1, maxUnits: 2, pricePerUnit: 4500}, ...] | Low-Medium (Puzzle Break, FLEE have this; most don't) |

*Operational Fields (partially extractable — track what we get):*

| Field | OCTO Equivalent | Type | Description | Expected Accuracy |
|-------|----------------|------|-------------|-------------------|
| `duration` | — (not in OCTO core, in Content) | integer (minutes) | Experience duration | High |
| `restrictions.minUnits` | `Option.restrictions.minUnits` | integer | Minimum group/player count | Medium |
| `restrictions.maxUnits` | `Option.restrictions.maxUnits` | integer | Maximum group/player count | Medium-High |
| `ageRestrictions` | — (TourGraph extension) | object | Min age, accompanied-by-adult rules | Medium |
| `schedule` | `Option.availabilityLocalStartTimes` | array | Known departure/start times | Low (usually in booking widget) |
| `seasonality` | — (TourGraph extension) | object | Operating months/seasons if stated | Low-Medium |
| `cancellationPolicy` | `features[type=CANCELLATION_TERM]` | string | Free-text policy as stated on site | Medium |

*TourGraph Extensions (not in OCTO — for escape rooms and edge cases):*

| Field | Type | Description | Applies To |
|-------|------|-------------|-----------|
| `difficulty` | enum (NOVICE, INTERMEDIATE, ADVANCED, EXPERT) | Difficulty rating | Escape rooms |
| `successRate` | float (0-1) | Percentage of groups that complete | Escape rooms |
| `roomType` | enum (SINGLE_ROOM, MULTI_ROOM) | Physical room configuration | Escape rooms |
| `themeGenre` | array of strings | Theme tags (mystery, action, adventure, horror) | Escape rooms, themed tours |
| `isPrivate` | boolean | Whether experience is private (no strangers) | Escape rooms, private tours |
| `upgradeModifiers` | array | Upsell options (e.g., Argosy "First to Board") | Tours with premium tiers |
| `crossOperatorBundles` | array | Combo products bundling multiple operators | Tours NW + Argosy combo |
| `activePromotions` | array | Current promo codes/discounts visible on site | Any operator |
| `bookingSystem` | object | Identified booking platform: {name, url} | All (from recon) |

**What we're NOT trying to extract (Path B/C territory):**
- Real-time availability slots
- Booking transaction flow
- Delivery formats (QR codes, tickets)
- Payment processing details
- Internal reference codes

**Schema evolution:** This v0.1 will be refined after Step 2 (manual extraction). Fields that consistently fail to extract get demoted or removed. Fields the AI naturally surfaces that we didn't anticipate get added.

### Step 2: Manual Extraction Test (Day 1-3)

Test extraction quality manually across all 7 operators. We have detailed recon with **known ground truth** for each operator, so we can score accuracy precisely.

**Process:**
1. For each operator, fetch the main content pages using web_fetch/curl (product pages, FAQ, about, policies — typically 2-5 pages per operator)
2. Note which content is JS-rendered and invisible to plain fetch (FareHarbor booking widgets, Bookeo embeds, dynamically-loaded FAQs)
3. Feed fetched content to Claude API with the extraction schema as a structured prompt
4. Compare extracted JSON against our recon ground truth
5. Score each field: ✅ Correct, ⚠️ Partially correct, ❌ Wrong/Missing

**Multi-page extraction approach:** Recon showed that operator data lives across multiple pages (e.g., Argosy has product pages, deals pages, fleet pages, policy pages). Test two strategies:
- **Single-page:** Extract from just the main product page. How much do we get?
- **Multi-page:** Concatenate content from 2-5 pages. How much more do we get? Is the noise manageable?

**Operator test order (easiest → hardest):**
1. Tours Northwest — cleanest site, well-organized, should produce best results
2. Shutter Tours — small, simple catalog
3. Totally Seattle — tests per-person vs. per-group pricing split
4. Conundroom — tests escape room schema extensions, data-in-captions extraction
5. Bill Speidel's — heritage attraction, single product, JS-rendered booking
6. Evergreen Escapes — premium multi-day tours, complex inclusions
7. Argosy Cruises — extreme complexity stress test (save for last)

**Why manual, not scripted:** We're testing AI comprehension, not scraping infrastructure. If Claude can't extract good data from pasted content, a script won't fix that. Building a scraper is plumbing — save it for Phase 1 once we've proven the extraction quality.

**Target: All 7 operators tested manually by end of Day 3.**

### Step 3: Viator API Comparison (Day 3-4)

> **STATUS (2026-02-18):** ✅ Complete. Viator affiliate signup done, production API key active (Basic Access). Comparison script built (`scripts/viator_compare.py`), full Path A vs Path C report produced (`results/comparisons/path_a_vs_path_c.md`).
>
> **Results:** 3/7 operators found on Viator (Tours Northwest: 4 products, Evergreen Escapes: 4, Argosy Cruises: 2). 4/7 operators NOT on Viator at all (Shutter Tours, Totally Seattle, Conundroom, Bill Speidel's). Path A has 8x product coverage (83 vs 10). Paths are complementary — extraction captures the long tail, Viator adds reviews/images/pricing.

Sign up as a Viator affiliate (free, immediate) and query their Partner API for the same operators we just extracted from. Compare Path A (our extraction) against Path C (Viator's structured data).

**Process:**
1. Register as a Viator Basic Affiliate at viator.com/partners
2. Query product search for "Seattle" + operator keywords
3. Retrieve product details for 3-4 operators that are on Viator (Shutter Tours, Argosy, Tours NW, Bill Speidel's confirmed; Conundroom/FLEE may be there too)
4. For each overlapping operator, produce a side-by-side comparison:

| Field | Path A (Our Extraction) | Path C (Viator API) | Delta |
|-------|------------------------|--------------------|----|
| title | What we extracted | What Viator has | Same/Different? |
| description | ... | ... | ... |
| pricing | ... | ... | ... |
| inclusions | ... | ... | ... |
| locations | ... | ... | ... |
| reviews | ❌ (not on operator site) | ✅ (Viator has reviews) | Path C advantage |
| ... | ... | ... | ... |

**Key questions this answers:**
- **Does Path A add value over Path C?** If Viator already has everything, extraction is less important.
- **What does Path A capture that Path C misses?** (e.g., operator-specific policies, local context, promo codes, upgrade modifiers, accessibility details — things operators put on their site but don't push to Viator)
- **What does Path C have that Path A can't get?** (e.g., reviews, standardized pricing, availability, photos from Viator's CDN)
- **Is Viator's data sufficient to power an MCP server?** Or does it need enrichment from Path A?
- **Which operators are NOT on Viator?** That's Path A's exclusive territory.

**This comparison is the most strategically valuable output of Phase 0.** It answers: "Should TourGraph lead with extraction or lead with API aggregation?"

**Target: Viator comparison for 3-4 operators by end of Day 4.**

### Step 4: Systematic Extraction — All 7 Operators (Day 4-6)

After refining the prompt and schema from Steps 2-3, run a clean extraction pass across all 7 operators.

> **UPDATE (2026-02-17):** The two-path comparison originally planned here has been resolved early. Firecrawl `/extract` (Path 1) was tested on Tours Northwest during Step 2 and **rejected** — 369 credits for one operator, pricing hallucination, missed domain-critical data, systematic errors. The build-vs-use decision is made: **BUILD Path 2** (Firecrawl `/scrape` + Claude API with our domain prompt). See `results/tours_northwest/firecrawl_extract_comparison_v1.md` for the full analysis.
>
> Step 4 will now run Path 2 only across all 7 operators.

**Process — Path 2 (BUILD):**
1. Use Firecrawl `/scrape` to get clean markdown for each operator's key pages (1 credit/page)
2. Supplement with raw HTML fetch for nav menus, banners, and footers (Firecrawl strips these)
3. Feed markdown + raw HTML to Claude API with our domain-specific extraction prompt (`prompts/extraction_prompt_v01.md`) and OCTO-aligned schema
4. Parse JSON response, validate against schema
5. Score against ground truth from recon

```python
from firecrawl import FirecrawlApp
import anthropic

app = FirecrawlApp(api_key="fc-YOUR_API_KEY")
claude = anthropic.Anthropic()

# Get clean markdown via Firecrawl /scrape
page = app.scrape("https://www.toursnorthwest.com/tours/mt-rainier/", formats=["markdown"])

# Extract with our domain-specific prompt
response = claude.messages.create(
    model="claude-opus-4-6",
    messages=[{"role": "user", "content": f"{extraction_prompt}\n\n{page['markdown']}"}]
)
```

**Why Path 2 only (build-vs-use resolved):** Firecrawl `/extract` failed on cost (369 credits/operator vs. ~7 for `/scrape` + Claude), quality (hallucinated $345.14 price, missed RAINIER10 promo, missed Argosy combo), and control (black-box LLM pipeline strips domain-critical content before extraction). Our domain prompt + Claude API is more accurate and ~90% cheaper. This validates the tooling landscape thesis: general-purpose extraction misses domain nuance.

**JS-rendered content:** Firecrawl `/scrape` handles this automatically — no need for separate Playwright strategy. FareHarbor widgets, Bookeo embeds, and Gatemaster JS content should all be rendered by Firecrawl's headless browser.

**Estimated credit usage:**
- `/scrape` for 7 operators: ~35-50 credits (5-7 pages per operator)
- Claude API: ~$0.10/operator (~$0.70 total)
- **Total: ~35-50 Firecrawl credits + ~$0.70 Claude API**
- **Note:** Free tier has ~255 credits remaining (500 monthly). Sufficient for remaining operators.

**Run against all 7 operators. Target: complete by end of Day 6.**

### Step 5: Analysis & Decision (Day 6-7)

> **STATUS (2026-02-17):** Complete. Scoring matrix and summary report written. **GO recommended** — all 6 decision gate criteria met. See `results/phase0_summary/phase0_report.md`.

**Per-operator scoring matrix:**

| Field | Tours NW | Shutter | Totally | Conundroom | Bill Speidel's | Evergreen | Argosy |
|-------|----------|---------|---------|------------|---------------|-----------|--------|
| title | ✅/⚠️/❌ | ... | ... | ... | ... | ... | ... |
| shortDescription | ... | ... | ... | ... | ... | ... | ... |
| description | ... | ... | ... | ... | ... | ... | ... |
| pricing | ... | ... | ... | ... | ... | ... | ... |
| duration | ... | ... | ... | ... | ... | ... | ... |
| features | ... | ... | ... | ... | ... | ... | ... |
| locations | ... | ... | ... | ... | ... | ... | ... |
| restrictions | ... | ... | ... | ... | ... | ... | ... |
| *escape room extensions* | N/A | N/A | N/A | ... | N/A | N/A | N/A |

**Cross-cutting analysis:**
- **Accuracy by operator type:** Tours vs. cruise vs. escape room — does extraction work equally well?
- **Accuracy by field type:** Which OCTO-aligned fields extract reliably? Which don't?
- **Accuracy by website quality:** Clean sites (Tours NW) vs. messy sites (Argosy) — how much does site quality matter?
- **Multi-page vs. single-page:** How much does feeding multiple pages improve results?
- **Path A vs. Path C comparison:** For operators on Viator, which data source is more complete? What does each uniquely provide?

**Produce a summary report with:**
1. Overall accuracy rate per field across all operators
2. Operator-by-operator extraction quality ranking
3. Path A vs. Path C comparison matrix (for overlapping operators)
4. Identified failure patterns and whether they're systematic (fixable) or random
5. Schema v0.2 recommendations — which fields to keep, drop, or add
6. Strategic recommendation: lead with Path A, Path C, or combined approach
7. Go/no-go decision

---

## Decision Gate

At the end of Phase 0, we make a go/no-go decision:

**GO — proceed to Phase 1 if:**
- Core fields (title, pricing, duration, description, features) extract at >70% accuracy across tours
- Escape room extraction achieves >60% accuracy (lower bar for this different product type)
- Failure patterns are identifiable and addressable (systematic, not random)
- Path A extraction provides meaningful value beyond what Path C (Viator) already offers
- The OCTO-aligned schema is viable as an extraction target

**PIVOT if:**
- Extraction accuracy is below 50% on core fields
- Failures are unpredictable and random (not systematic)
- Path C (Viator API) provides equivalent or better data for 80%+ of operators, making Path A unnecessary for initial launch
- Website scraping itself is the bottleneck (too many JS-heavy sites, anti-scraping measures)

**ADJUST if:**
- Some operator types work great, others don't — narrow the target market (e.g., tours yes, escape rooms later)
- Some fields extract well, others don't — simplify the schema to what works
- Path A + Path C combined provides a complete picture — design the product as a hybrid from the start
- Manual content (PDFs, brochures) extracts better than websites — change the intake model

---

## Tools & Prerequisites

**What you need before starting:**
- **Firecrawl free tier account** (firecrawl.dev/signin — no credit card required, 500 one-time credits). See `tooling_landscape.md` for detailed product analysis.
- Claude API key (you have this from ScreenTrades — needed for comparison: Firecrawl Extract vs. our own Claude prompt)
- Python environment with: `firecrawl-py`, `anthropic` SDK, `requests` (for Viator API)
- Viator affiliate account (free signup at viator.com/partners — do this on Day 1)
- A simple way to capture and compare results (JSON files + spreadsheet for scoring)
- The recon ground truth from this document (known products, prices, features for all 7 operators)

**Extraction approach (updated after Firecrawl `/extract` test — 2026-02-17):**
- Use Firecrawl `/scrape` for web page fetching + JS rendering + clean markdown output (1 credit/page)
- Use Claude API with our domain-specific extraction prompt (`prompts/extraction_prompt_v01.md`) for structured extraction
- Supplement Firecrawl markdown with raw HTML fetch for nav menus, banners, footers (Firecrawl strips these — missed RAINIER10 promo code)
- Firecrawl `/extract` tested and **rejected** — too expensive (369 credits/operator), hallucinated prices, missed domain-critical data. See `results/tours_northwest/firecrawl_extract_comparison_v1.md`.
- Estimated credit usage for remaining work: ~35-50 Firecrawl credits + ~$0.70 Claude API
- **Note:** Free tier has ~255 credits remaining (500 monthly). Sufficient for remaining operators.

**What you DON'T need:**
- BeautifulSoup / Playwright / custom scraping infrastructure (Firecrawl handles this)
- Proxy rotation or anti-bot management (Firecrawl handles this)
- Database setup
- Any frontend
- AWS deployment
- MCP SDK
- GetYourGuide API access (traffic-gated, not available for Phase 0)

This spike runs entirely local with cloud API calls. No infrastructure, no hosting, no self-managed dependencies. Firecrawl free tier + Viator affiliate API are the only external services, both free.

---

## Notes

- Schema definition is intentionally deferred until after manual extraction tests (Step 1-2). The Tour Guy experience showed that a full "tour" definition spans multiple pages of data. We'll let the extraction results tell us what's realistic before defining what we want.
- Escape room slot filled: Conundroom (conundroom.us) selected as primary test case — clean site, Bookeo booking system, 10 rooms across 3 Redmond locations. FLEE Escape (fleeescape.com) retained in notes as worst-case stress test reference.
- All websites are publicly accessible. No operator permission needed for Phase 0.

### Recon Finding: The TripAdvisor/Viator Distribution Pipeline

**Observation:** Every single operator in our test set has a TripAdvisor presence. This is not coincidental — it's structural.

**How it works:** TripAdvisor acquired Viator in 2014. Viator is the world's largest OTA for tours and activities (300,000+ experiences, 35M+ monthly visitors). When an operator lists on Viator, their products automatically appear on TripAdvisor's "Things to Do" pages. Viator also distributes to 4,000+ affiliate partners including Booking.com, Expedia, and 240,000+ travel agents. Viator integrates directly with all the major booking platforms — FareHarbor, Peek Pro, Bókun, Rezdy, RocketRez — over 100 reservation systems.

**The distribution chain confirmed across our test set:**
| Operator | Booking System | → Viator/TripAdvisor | → Other OTAs |
|----------|---------------|---------------------|--------------|
| Shutter Tours | FareHarbor | ✓ (Viator + Expedia) | Expedia |
| Evergreen Escapes | Peek Pro | ✓ (likely via Peek→Viator) | TBD |
| Totally Seattle | FareHarbor | ✓ (likely) | TBD |
| Bill Speidel's | Gatemaster | ✓ (TripAdvisor listing confirmed) | TBD |
| Argosy Cruises | RocketRez | ✓ (strong Viator presence, CityPASS) | CityPASS, Seattle Attractions |
| Tours Northwest | FareHarbor | ✓ (2025 Certificate of Excellence) | Yelp, Visit Seattle |
| Conundroom | Bookeo | TBD (likely TripAdvisor listing) | TBD |

**What this means for TourGraph:**
1. **The existing distribution pipeline is: Operator → Booking System → Viator → TripAdvisor + OTA network.** This is well-established and works.
2. **The MISSING pipeline is: Operator → ??? → AI Agents.** No equivalent of Viator exists for AI distribution. That's the gap TourGraph fills.
3. **Viator charges 20-25% commission on bookings.** This is the going rate for OTA distribution. TourGraph's pricing model should be informed by this benchmark.
4. **Viator already has structured data for these operators** (because the booking systems feed it). But Viator doesn't expose this data via MCP or any agentic protocol. Same pattern as the booking systems themselves — structured data exists, but not for AI agents.
5. **TripAdvisor reviews are essentially universal.** Any schema we build should consider linking to or referencing TripAdvisor review data, as it's the de facto trust signal for tours/experiences.
6. **The competitive framing is clear:** Viator is the dominant distributor for the human-browsing era. TourGraph aims to be the equivalent for the AI-agent era. We don't compete with Viator — we extend distribution into a channel Viator doesn't serve.

### Recon Finding: OTA APIs as Structured Data Sources (Path C)

**Discovery:** Follow-up research on the TripAdvisor observation revealed that Viator, GetYourGuide, and TripAdvisor all expose APIs with structured tour/experience data. This introduces a "Path C" that fundamentally changes the Phase 0 strategy.

**Viator Partner API (the big one):**
- Free affiliate signup, no traffic minimums for Basic Access
- Basic Access provides: product descriptions, images, ratings, pricing, availability schedules, product options/variants
- Full Access (requires approval) adds: real-time availability, reviews, bulk catalog ingestion via `/products/modified-since`
- Full + Booking Access adds: transactional booking on your own platform
- Data includes: structured metadata, pricing by age band, inclusions/exclusions, cancellation policies, meeting points, itineraries, attraction associations
- Integrates with 100+ reservation systems including all five in our test set
- **This is essentially the structured tour catalog we'd be trying to build through AI extraction — and it already exists for any operator listed on Viator.**

**GetYourGuide Partner API:**
- Traffic-gated: Basic requires 100K visits, Reading requires 1M visits + 300 monthly bookings
- OpenAPI spec published on GitHub (open source — useful for understanding the data model)
- Higher barrier to entry but covers European market well

**TripAdvisor Content API:**
- Free tier: 5,000 monthly calls, returns location details + up to 5 reviews + photos
- Location-level, NOT product-level — good for reviews enrichment only

**Google Things to Do (GTTD):**
- NOT a read API — a write/ingest pipeline (SFTP JSON feeds to Google)
- Operators must go through approved Connectivity Partners
- Only ~25% of operators connected — massive adoption gap
- **Key industry quote:** "With Generative AI search, the live, structured product data is exactly what the LLM struggles with." — This is the exact same gap we're targeting.

**IMPLICATIONS FOR PHASE 0:**

This doesn't eliminate the need for AI extraction testing (Path A), but it reframes what Phase 0 is proving:

1. **Phase 0 still tests Path A** — can AI extract from operator websites? This remains essential because Path A handles operators NOT on Viator (the long tail, undiscovered operators, new businesses).

2. **A new Phase 0.5 could test Path C** — sign up as a Viator affiliate, query their API for the same operators we're extracting from, and COMPARE results. This would tell us:
   - How complete is Viator's data vs. what we can extract from websites?
   - What does Viator's structured data MISS that website extraction captures?
   - Is Viator's data sufficient to power an MCP server, or does it need enrichment?

3. **The "Two Paths" framework in the Project Proposal has been updated to "Three Paths"** — see project_proposal.md for the full strategic analysis.

4. **Viator's affiliate terms are the key constraint.** Data from Path C is meant to drive bookings TO Viator. TourGraph as a "Viator affiliate that distributes via MCP" is a valid business model but makes us dependent on Viator's terms. Path A (extraction) + Path B (channel manager) provide independence.

5. **The strongest position combines all three:** Path C for fast bootstrap (80% coverage), Path A for differentiation (long-tail operators), Path B for premium direct integration. The MCP layer is the unique value on top of all of them.

See also: `api_landscape.md` for the detailed API comparison and strategic analysis.

---

*This document is part of the TourGraph project. See also: project_proposal.md, tooling_landscape.md, api_landscape.md, glossary.md*
