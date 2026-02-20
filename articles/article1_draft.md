# I Asked AI to Plan My Mediterranean Cruise. It Confidently Made Everything Up.

*Then I spent a week figuring out why.*

---

Last summer I tried to plan a Mediterranean cruise using ChatGPT and Claude. I wanted something specific — a 7-day cruise out of Barcelona, with shore excursions that included local food tours, not the standard "bus to ruins" packages.

Both AIs were happy to help. They gave me itineraries, suggested tour companies at each port, quoted prices, recommended specific excursion packages. It all sounded great. Authoritative, even.

Then I started clicking links.

Half the companies didn't offer what the AI described. Some of the tours didn't exist. Prices were wrong. One operator had closed during COVID and never reopened. Claude confidently recommended a "sunset food walk in Dubrovnik" from a company whose website was a single page that hadn't been updated since 2019.

The AI wasn't broken. The models are genuinely impressive at reasoning, synthesizing, comparing options. The problem was upstream: **there's no structured data for them to work with.** These tour operators have websites with pretty photos and paragraph-long descriptions. An AI can read those words and sound confident about them. But it can't verify prices, check availability, or know that the Saturday tour was cancelled for winter.

I filed it away as a frustration. Then I noticed the same pattern somewhere else.

---

## The Pattern

I'd been building [ScreenTrades.ai](https://screentrades.ai) — an AI-powered trading analysis platform. You enter a stock ticker, it pulls data from 20+ financial APIs, runs it through Claude, and gives you a BUY/HOLD/SELL recommendation with reasoning. The AI layer worked well. Where things got messy was getting structured, reliable real-world data into the system. Not the model. Not the prompting. The data infrastructure underneath.

That got me thinking: is this just a financial data problem? Or is it structural?

I looked at the industry I know best. I spent years at Expedia, including time in the tours and experiences division. I'd seen the supplier onboarding problem from the inside — getting a new tour operator's inventory listed on the platform used to take 180 days. We eventually got it down to 35. It was one of the hardest operational challenges I worked on.

So I knew two things: tour operator data is a mess, and nobody has fixed the supply side. The demand side is getting all the attention — everyone's building AI travel agents. Google is putting agentic booking into AI Mode. Amazon's Alexa Plus does voice-based travel booking. Expedia, Booking.com, Marriott — they're all building AI assistants.

But here's the thing nobody's asking: **what are those AI agents going to search?**

A tour operator in Seattle has a WordPress site with a photo of Mt. Rainier and a paragraph that says "Join us for an unforgettable journey through the Pacific Northwest's most stunning landscapes." Beautiful. Completely useless to a machine.

I decided to test it. Not theoretically — empirically. Could AI actually extract structured, reliable data from real tour operator websites? And if so, how good would it be?

---

## The Experiment

I picked 7 real tour operators in the Seattle area. Not cherry-picked easy cases — a deliberate spread of complexity:

- **Tours Northwest** — a well-organized multi-tour operator (17 products)
- **Shutter Tours** — photo tours with some cancelled seasonal products
- **Totally Seattle** — private tours with tiered, per-group pricing
- **Conundroom** — escape rooms, single-page site, all data in image captions
- **Bill Speidel's Underground Tour** — a single iconic product, no dedicated tour page
- **Evergreen Escapes** — data-rich wine and nature tours across two states
- **Argosy Cruises** — 160+ page site, harbor cruises, seasonal events, complex pricing

The pipeline was simple:

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

Use [Firecrawl's](https://firecrawl.dev) `/scrape` endpoint to fetch each operator's website as clean markdown (handling JavaScript rendering, anti-bot measures, the usual web scraping headaches). Then feed that markdown to Claude with a domain-specific prompt aligned to the OCTO industry standard — the open schema that tour platforms use to exchange data.

No fine-tuning. No custom models. Just a well-crafted prompt that knows what tour operator data looks like. Here's a snippet of the domain-specific instructions:

```text
Pricing classification rules:
- "per person" / "per guest" / "$X adult, $Y child" = PER_UNIT
- "per group" / "per vehicle" / "flat rate for up to N guests" = PER_BOOKING
- Private tours priced as a flat rate for a group = PER_BOOKING

Extract what's there, don't invent. If a field isn't on the page,
omit it or set to null. Never fabricate data.

Detect pricing model from context. Don't assume PER_UNIT.
Private tours with flat group rates are PER_BOOKING.

Capture cross-operator bundles. If a product includes another
company's service (e.g., "includes 1-hour Argosy Harbor Cruise"),
create a crossOperatorBundles entry.
```

The prompt also tells the extraction engine to look beyond main content — navigation menus reveal the product catalog, site-wide banners contain promo codes, footers have contact info and OTA badges. These are exactly the regions that generic extraction tools skip.

Total cost for all 7 operators: **$8.28** in Claude API calls and **37 Firecrawl credits**.

---

## What Worked (Surprisingly Well)

**83 products extracted across 7 operators.** That alone surprised me — several operators had more products than I'd found during manual research.

The accuracy on core fields was around 95%. Titles, descriptions, durations, pricing models, age restrictions, inclusions/exclusions — almost all correct.

| Operator | Type | Products | Credits | Cost |
|----------|------|----------|---------|------|
| Tours Northwest | Guided tours | 17 | 2 | $0.87 |
| Shutter Tours | Photo tours | 7 | 4 | $1.37 |
| Totally Seattle | Private tours | 13 | 6 | $1.18 |
| Conundroom | Escape rooms | 12 | 1 | $0.92 |
| Bill Speidel's | Underground tour | 2 | 4 | $0.40 |
| Evergreen Escapes | Wine & nature | 19 | 12 | $1.71 |
| Argosy Cruises | Harbor cruises | 13 | 8 | $1.83 |
| **Total** | | **83** | **37** | **$8.28** |

But the interesting part wasn't the aggregate number. It was the specific wins:

**It found things I missed.** Tours Northwest had a "Pre-Alaska Cruise Transportation and City Tour" — a product specifically designed for cruise passengers needing port drop-off. I hadn't caught that during manual research. The AI read the product page and understood what it was.

**It captured promotional codes.** Tours Northwest displays a site-wide banner offering RAINIER10 — 10% off Mt. Rainier tours. The extraction caught it with full context. This matters because promo codes are high-value operator data that no OTA captures.

**It detected cross-operator bundles.** Three different operators had combination products with each other. Tours Northwest sells an "Ultimate Seattle Experience" package that includes an Argosy Harbor Cruise. Argosy sells the same combo from their side. The extraction caught both, including exact pricing — $159 adult, $139 child.

**It handled schema diversity without breaking.** Conundroom is an escape room business. Completely different from a walking tour — difficulty levels, player counts, room themes, age restrictions per room. The extraction prompt was designed for tours, but it adapted. 12 escape rooms extracted with difficulty levels (Novice/Intermediate/Advanced), correct player counts, per-room age restrictions. The OCTO-aligned schema was flexible enough to hold it.

**It identified booking platforms.** Every operator uses a different booking system — FareHarbor, Peek Pro, Bookeo, Gatemaster, RocketRez. The extraction correctly identified which platform each operator uses and captured the booking embed URLs. Five distinct booking platforms across seven operators. That's the kind of fragmentation that makes this industry hard.

**It caught cancelled and seasonal products.** Shutter Tours had a Boeing Factory Tour marked "CURRENTLY CANCELLED until further notice" and a Mt. Rainier tour that "Tours have ended for the season." The AI flagged both correctly rather than listing them as available. Nobody told it to look for cancellation status — it inferred that from the page content.

---

## What the Output Actually Looks Like

Here's a real extraction result — the Mt. Rainier tour from Tours Northwest. This is what came out of the pipeline, unedited:

```json
{
  "title": "Mt Rainier Tour from Seattle",
  "shortDescription": "Full-day guided tour from Seattle to Mt. Rainier
    National Park featuring old-growth forests, wildflower meadows, and
    waterfalls with 4 convenient pickup locations.",
  "url": "https://www.toursnorthwest.com/tours/mt-rainier/",
  "pricingModel": "PER_UNIT",
  "currency": "USD",
  "priceByUnit": [
    { "unitType": "adult", "label": "Ages 13+", "amount": 17900 },
    { "unitType": "child", "label": "Ages 5-12", "amount": 14900 }
  ],
  "duration": 630,
  "durationDisplay": "10-11 hours",
  "seasonality": {
    "startDate": "January 1",
    "endDate": "December 31",
    "notes": "Year-round. Summer and winter routes differ."
  },
  "features": [
    { "type": "INCLUSION", "value": "Park admission fees included" },
    { "type": "INCLUSION", "value": "Complimentary snowshoe rentals (winter)" },
    { "type": "EXCLUSION", "value": "Lunch not provided" }
  ],
  "activePromotions": [
    {
      "code": "RAINIER10",
      "description": "10% off Mt. Rainier Tour",
      "displayLocation": "Site-wide banner"
    }
  ],
  "bookingSystem": {
    "name": "FareHarbor",
    "bookingUrl": "https://fareharbor.com/embeds/book/toursnorthwest/..."
  }
}
```

Compare that to what an AI agent gets today when it visits toursnorthwest.com: paragraphs of prose, photos, and a FareHarbor "Book Now" button. The structured version is queryable, comparable, and bookable.

> *Screenshot: [toursnorthwest.com/tours/mt-rainier](https://www.toursnorthwest.com/tours/mt-rainier/) — the same tour as the JSON above. What a human sees: hero photo, paragraphs of description, a "Book Now" widget. What an AI agent needs: the JSON.*

---

## Where It Broke (Predictably and Interestingly)

**The FareHarbor Wall.** This was the biggest systematic failure, and it's instructive.

Many tour operators use embedded booking widgets from platforms like FareHarbor and Peek Pro. The actual pricing lives inside a JavaScript widget that loads dynamically — it's not in the page HTML. Bill Speidel's Underground Tour, for example: the extraction correctly identified the tour, its history, its format, its group sizes. But for pricing? "Specific pricing not listed on the website pages provided."

This is honest and correct. The price literally isn't on the page in a way that any text-based extraction can see. It's locked inside a JS iframe that requires user interaction to reveal.

What's interesting: the AI didn't hallucinate a price. Across all 83 products and 7 operators — **zero pricing hallucinations.** When it couldn't find a price, it said so. That matters more than getting the price right, because a hallucinated price in a production system would destroy operator trust instantly.

**Tiered pricing behind widgets.** Totally Seattle offers private tours with Silver/Gold/Platinum tiers. The extraction knew the tiers existed and got the names right, but the specific dollar amounts for each tier were buried in the booking widget. Same pattern as the FareHarbor wall — the data exists, it's just not in the HTML.

**Discount programs at scale.** Argosy Cruises offers discounts for WA residents ($4 off), Boeing employees, AAA members, teachers, and a game-day promo (12% off during Seahawks games). The extraction missed these entirely. They were either in a separate discounts page that wasn't scraped or embedded in fine print the prompt didn't know to look for.

**Page coverage on large sites.** Argosy has 160+ pages. I scraped 8. The extraction quality held — 13 products captured accurately — but I know I missed seasonal events and some product variants. This isn't an AI problem; it's a crawling strategy problem. Which pages do you scrape when a site has hundreds?

---

## The Expensive Lesson: Why I Didn't Use "Easy Mode"

Before settling on this approach, I tested Firecrawl's built-in `/extract` endpoint — the "just give it a schema and let it figure it out" option. On paper, it's the obvious choice. Less code. Less work. Let the platform handle the AI.

On Tours Northwest alone, it burned 369 Firecrawl credits. That's 73% of the entire free tier — on a single operator. My approach used 2 credits for the same operator.

But cost wasn't the worst part.

It hallucinated a price of $345.14 for a "Private SUV Seattle Tour." That price doesn't exist. It's not on the website. The model made it up.

It missed the RAINIER10 promo code entirely. It missed cross-operator bundles. It created duplicate products — the Private Mt. Rainier tour appeared twice, Private Snoqualmie appeared twice, Private SUV Seattle appeared three times.

| | Firecrawl /extract (generic) | Firecrawl /scrape + Claude (domain-specific) |
|---|---|---|
| **Credits used** | 369 | 2 |
| **Cost per operator** | ~$12 | $0.87 |
| **Pricing hallucinations** | Yes ($345.14 fabricated) | Zero |
| **Promo codes captured** | No | Yes (RAINIER10) |
| **Cross-operator bundles** | 0 found | 6 found |
| **Duplicate products** | 7 duplicates | 0 |

Here's why this matters beyond my specific project: **generic AI extraction tools fail on domain-specific data.** The Firecrawl extract pipeline runs the content through their internal model before your prompt ever reaches it. By then, the domain context is gone. A general-purpose LLM doesn't know that "per-person" and "per-group" pricing are fundamentally different business models for a tour operator. It doesn't know that a promotional code in a banner is high-value data. It doesn't know that an Argosy-Tours Northwest combo product represents a business relationship worth capturing.

The fix was straightforward: use Firecrawl only for fetching (which it's great at — handles JS rendering, anti-bot, clean markdown output), then run extraction through Claude with a prompt that actually understands the domain.

The lesson generalizes: if you're extracting structured data from any specialized industry, you probably need domain-specific prompting. Generic "scrape and structure" tools will get you 60-70% of the way there. The last 30% — the part that actually matters for trust and accuracy — requires knowing what you're looking for and why it matters.

---

## The Viator Reality Check

After extraction, I ran a comparison against Viator's API — the world's largest OTA for tours and activities, with 300,000+ experiences listed.

Of my 7 test operators, **only 3 were on Viator.** The other 4 — a photo tour company, a private tour operator, an escape room business, a historic underground tour — simply don't exist in Viator's catalog. They're invisible to anyone relying solely on OTA data.

| Operator | Extraction (Path A) | Viator API (Path C) |
|----------|---|---|
| Tours Northwest | 17 products | 3 products |
| Shutter Tours | 7 products | — not on Viator |
| Totally Seattle | 13 products | — not on Viator |
| Conundroom | 12 products | — not on Viator |
| Bill Speidel's | 2 products | — not on Viator |
| Evergreen Escapes | 19 products | 4 products |
| Argosy Cruises | 13 products | 3 products |
| **Total** | **83 products** | **10 products** |

4 out of 7 operators don't exist on Viator at all. The long tail is bigger than expected.

For the 3 operators that were on Viator, the comparison was revealing. Extraction found 83 products across all 7 operators. Viator had 10 products across 3 operators. That's an 8:1 coverage gap.

But Viator had things extraction couldn't touch: **1,829 verified reviews** for one Mt. Rainier tour. Professional photos — 21 images vs. 2 from extraction. Structured age-band pricing from the actual booking system.

And Viator revealed the economics. A Mt. Rainier tour priced at $295 on the operator's website was listed at $319 on Viator. That 10-17% markup across the board is the OTA commission made visible. It's also the reason operators would want alternative distribution channels that don't take a 20-30% cut.

Neither source alone gives you the full picture. The operator's website has promo codes, FAQs, cross-operator bundles, and accessibility policies. Viator has reviews, professional images, and verified pricing. A complete inventory needs both.

---

## What I Actually Learned

Here's what a week of extracting real tour operator data taught me — things that don't show up in any product demo or pitch deck:

**The AI works. The data infrastructure doesn't exist.** The models are good enough to extract structured data from messy websites with high accuracy. That's not the bottleneck. The bottleneck is that nobody has built the pipeline to do this systematically — discover operators, extract their data, normalize it to a standard format, and make it queryable.

**Domain expertise beats model sophistication.** A well-crafted prompt that understands tour operator pricing models outperformed a more expensive, more automated extraction tool by a wide margin — on cost, accuracy, and completeness. The model matters less than what you tell it to look for.

**The "long tail" is bigger than I expected.** 4 out of 7 operators weren't on any major OTA. If that ratio holds at scale, 30-40% of the tours and experiences market is completely invisible to aggregators — and to any AI agent that relies on OTA data. A family-run escape room, a niche photo tour, a historic walking tour — these are exactly the kind of authentic local experiences travelers want, and they're the hardest to find.

**Honest failure is more valuable than hallucinated success.** The AI saying "pricing not available on this page" is infinitely more useful than fabricating a price. Zero hallucinations across 83 products means you can trust the system to tell you what it doesn't know. That's the foundation of any production system.

**The real competition isn't other startups.** It's inertia. Most operators don't know they have a distribution problem. They don't know AI agents are becoming a booking channel. They don't know that 42% of travelers used AI for trip planning last year. The hard part isn't building the technology — it's convincing a walking tour operator in Pioneer Square that the way people find and book tours is about to fundamentally change.

---

*This is Part 1 of a series on building AI infrastructure for the tours and experiences industry. Next up: what happens when you try to discover every tour operator in a city — programmatically.*

*The extraction pipeline, schema, and results referenced in this article are open source at [github.com/nikhilsi/tourgraph](https://github.com/nikhilsi/tourgraph).*
