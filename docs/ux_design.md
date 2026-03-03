# TourGraph.ai — UX Design Document

---
**Last Updated**: March 1, 2026
**Status**: Locked — all major decisions resolved and implemented
**Source of Truth**: This doc governs UX/UI decisions. `product_brief.md` governs product scope.
---

## Design Philosophy

TourGraph is not a travel tool. It's a **delight machine**. The UX should feel like a friend texting you something amazing they found, not like browsing a booking site.

Every design decision filters through the four pillars:

1. **Zero Friction** — Delighted in 5 seconds. No learning curve.
2. **Instant Smile** — The content makes you feel something.
3. **Effortlessly Shareable** — The link preview alone makes people tap.
4. **Rabbit Hole Energy** — "One more" through curiosity, not manipulation.

---

## Research-Backed Design Principles

Based on analysis of Atlas Obscura, StumbleUpon, The Useless Web, Bored Button, Product Hunt, Tinder, and Wikipedia's rabbit hole patterns.

### Principle 1: One Big Button

The Useless Web and Bored Button prove that "press button, get surprise" is a fundamentally compelling pattern. StumbleUpon averaged 2,000 clicks per user with this mechanic. The homepage should be dominated by a single action: discover something.

### Principle 2: One Card at a Time

Tinder's one-at-a-time pattern eliminates choice paralysis. Showing one tour, full screen, forces a simple binary: "love it and share" or "show me another." No grid of options, no comparison shopping, no decision fatigue.

### Principle 3: Two Actions Only

After seeing a tour, the user has exactly two paths: **Share This** or **Show Me Another**. Nothing else competes for attention. StumbleUpon's binary simplicity (Stumble + Thumbs Up/Down) is the model.

### Principle 4: Variable Rewards, Not Pure Random

A random pick from 300K tours produces mediocre results. Every spin should be biased toward something share-worthy: highest rated, weirdest title, cheapest 5-star, most expensive, most exotic location. The unpredictability of WHAT kind of extreme you'll get creates the "one more spin" urge. This is the slot machine psychology — but ethical, because we're giving genuine delight, not extracting money.

### Principle 5: The Share Unit Carries Context

The shared page is NOT a generic tour detail page. It carries the feature's framing:

- **Roulette share**: "I pressed a button and the universe showed me THIS."
- **World's Most share**: "Today's most expensive tour on Earth is..."
- **Right Now share**: "Right now in Marrakech it's 7:12pm and you could be..."
- **Six Degrees share**: "It takes 4 tours to get from Reykjavik to Tokyo."

The same tour is boring as a Viator listing. It's hilarious/wonderful when framed by the feature that surfaced it. The witty AI one-liner, the context badge, and the feature framing are what make it shareable.

### Principle 6: The Shared Page Converts Viewers to Spinners

When someone lands on a shared link, they see that specific tour in its full glory. Below or beside it: a clear **"Spin Your Own"** or **"See What's Next"** button. This is how the viral loop closes: see a friend's share → visit the page → get pulled into the roulette → find your own thing to share.

**Implementation status:** "Spin Your Own" button added to all detail pages (roulette, worlds-most, six-degrees).

### Principle 7: Chrome Kills Delight

The most engaging discovery experiences have the least UI chrome. The tour card (photo + title + one-liner + stats + actions) should be 90%+ of the viewport on mobile. Navigation, branding, and feature switching should be minimal and non-competing.

### Principle 8: Don't Become a Portal

StumbleUpon died when it tried to become a content portal (Pinterest-like feed) instead of staying a discovery launcher. The core interaction must stay pure: button → card → share or spin. Resist the urge to add complexity.

---

## Site Structure

### Two Page Types

Every discovery site uses this dual architecture:

1. **Discovery Pages** — Where you encounter content (Roulette, Right Now, World's Most, Six Degrees)
2. **Tour Pages** — Where you share FROM (`/roulette/[id]`, `/worlds-most/[id]`, etc.)

The discovery page is the engine. The tour page is the shareable viral unit.

### URL Structure

```
/                           → Tour Roulette (homepage)
/roulette/[tour-id]         → Shared roulette result (carries roulette framing)
/right-now                  → Right Now Somewhere feature
/right-now/[tour-id]        → Shared "right now" result (carries time/place framing)
/worlds-most                → Today's superlatives
/worlds-most/[slug]         → Individual superlative card (e.g., /worlds-most/most-expensive)
/six-degrees                → Chain roulette (random chain with timeline)
/six-degrees/[slug]         → Chain detail (shareable link)
```

Each URL is a complete, shareable experience with proper OG tags.

### Navigation Between Features

**Resolved (D1):** Subtle text links below the card for launch. The features should feel like different "moods" of the same experience, not separate apps. See Resolved Decisions below.

---

## Screen Wireframes

### Screen 1: Homepage / Tour Roulette (Mobile)

The first thing anyone sees. A stranger should understand what to do in under 2 seconds.

```
┌─────────────────────────────┐
│  TourGraph                  │  ← Minimal brand mark, top-left
│                             │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │                         │ │
│ │      [Tour Photo]       │ │  ← Full-width hero image
│ │      Big, beautiful,    │ │     80%+ of card is photo
│ │      edge-to-edge       │ │
│ │                         │ │
│ │                         │ │
│ │─────────────────────────│ │
│ │ Fairy Hunting in        │ │  ← Tour title (bold, 20px)
│ │ Iceland with a          │ │
│ │ Certified Elf Spotter   │ │
│ │                         │ │
│ │ Reykjavik, Iceland      │ │  ← Location (lighter, 14px)
│ │                         │ │
│ │ "Because sometimes the  │ │  ← AI witty one-liner (italic)
│ │  best tours require you │ │
│ │  to believe in magic."  │ │
│ │                         │ │
│ │ ★ 4.8  · $247  · 4 hrs │ │  ← Stats row
│ │                         │ │
│ │  [  Share  ]            │ │  ← Share button (secondary)
│ └─────────────────────────┘ │
│                             │
│  ┌───────────────────────┐  │
│  │   Show Me Another ↻   │  │  ← THE button (large, primary)
│  └───────────────────────┘  │
│                             │
│   roulette · right now ·    │  ← Feature links (subtle, small)
│   world's most · six degrees│
│                             │
└─────────────────────────────┘
```

**Key decisions in this wireframe:**
- Photo dominates — it's the first and largest thing
- Title + one-liner do the emotional work
- Stats are compact (one row)
- "Show Me Another" is the primary CTA, large and obvious
- "Share" is on the card itself (close to the content)
- **The entire card is tappable** — tap to open the detail page (`/roulette/[id]`) with full description, booking link, and rabbit hole links
- Feature navigation is minimal text at the bottom, non-competing
- No "Book on Viator" on this screen — this is about delight, not commerce

### Screen 2: Homepage / Tour Roulette (Desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  TourGraph              roulette · right now · world's most · 6°│
│─────────────────────────────────────────────────────────────────-│
│                                                                  │
│        ┌────────────────────────────────────────────┐            │
│        │                                            │            │
│        │                                            │            │
│        │              [Tour Photo]                  │            │
│        │              Large, cinematic               │            │
│        │              Centered on page               │            │
│        │                                            │            │
│        │                                            │            │
│        │────────────────────────────────────────────│            │
│        │                                            │            │
│        │  Fairy Hunting in Iceland with a            │            │
│        │  Certified Elf Spotter                      │            │
│        │                                            │            │
│        │  Reykjavik, Iceland                         │            │
│        │                                            │            │
│        │  "Because sometimes the best tours          │            │
│        │   require you to believe in magic."         │            │
│        │                                            │            │
│        │  ★ 4.8  ·  $247  ·  4 hrs                  │            │
│        │                                            │            │
│        │  [ Share ]                                  │            │
│        └────────────────────────────────────────────┘            │
│                                                                  │
│              ┌──────────────────────────┐                        │
│              │   Show Me Another ↻      │                        │
│              └──────────────────────────┘                        │
│                                                                  │
│  Right now in Marrakech it's 7:12pm and you could be on a       │
│  rooftop cooking class under the stars. 4.9★                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Desktop differences:**
- Card is centered, not full-bleed (cinematic framing)
- Feature nav moves to top-right (horizontal, subtle)
- "Right Now Somewhere" as ambient text at bottom (see Decision D2)
- More breathing room around the card

### Screen 3: Tour Detail Page (`/roulette/[id]`)

This page serves two audiences:
- **Shared link visitor** — tapped a friend's link in iMessage/WhatsApp
- **Roulette user** — tapped the card to learn more

Same page, same URL. Both paths lead here.

```
┌─────────────────────────────┐
│  TourGraph                  │
│                             │
│  ┌───────────────────────┐  │
│  │ ↻ TOUR ROULETTE       │  │  ← Feature context badge
│  └───────────────────────┘  │
│                             │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │      [Tour Photo]       │ │
│ │      Same big,          │ │
│ │      beautiful photo    │ │
│ │                         │ │
│ │─────────────────────────│ │
│ │ Fairy Hunting in        │ │
│ │ Iceland with a          │ │
│ │ Certified Elf Spotter   │ │
│ │                         │ │
│ │ Reykjavik, Iceland      │ │
│ │                         │ │
│ │ "Because sometimes the  │ │
│ │  best tours require you │ │
│ │  to believe in magic."  │ │
│ │                         │ │
│ │ ★ 4.8  · $247  · 4 hrs │ │
│ └─────────────────────────┘ │
│                             │
│  Join a certified elf       │  ← Full description
│  spotter on a journey       │     (from Viator product data)
│  through Iceland's hidden   │
│  elf habitats. Visit the    │
│  Elf School, explore lava   │
│  fields, and learn about    │
│  the 13 types of elves...   │
│                             │
│  Highlights:                │
│  · Certified elf spotter    │
│  · Visit the Elf School     │
│  · Lava field exploration   │
│                             │
│  [  Share  ]                │
│                             │
│  ┌───────────────────────┐  │
│  │  Book on Viator →     │  │  ← Affiliate link
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  Spin Your Own ↻      │  │  ← Converts viewer to spinner
│  └───────────────────────┘  │
│                             │
│  More tours in Iceland →    │  ← Rabbit hole hook
│                             │
└─────────────────────────────┘
```

**Key decisions:**
- Feature badge at top ("TOUR ROULETTE") gives context — this came from somewhere fun
- Same card at top as roulette, so the experience feels consistent
- Full description + highlights below the card (the "tell me more" content)
- "Book on Viator" lives HERE, not on the roulette homepage. This is where intent exists.
- "Spin Your Own" converts shared-link visitors into roulette spinners
- "More tours in Iceland" is the rabbit hole hook

### Screen 4: World's Most (Mobile)

```
┌─────────────────────────────┐
│  TourGraph                  │
│                             │
│  TODAY'S SUPERLATIVES       │  ← Date: Feb 28, 2026
│                             │
│ ┌─────────────────────────┐ │
│ │ 🏷 MOST EXPENSIVE       │ │  ← Superlative badge
│ │                         │ │
│ │    [Tour Photo]         │ │
│ │                         │ │
│ │ Private Submarine to    │ │
│ │ the Titanic             │ │
│ │ St. John's, Canada      │ │
│ │                         │ │
│ │ "For when 'luxury       │ │
│ │  cruise' isn't enough   │ │
│ │  and you need to go     │ │
│ │  2.4 miles straight     │ │
│ │  down."                 │ │
│ │                         │ │
│ │ $45,000  · ★ 5.0        │ │
│ │                         │ │
│ │  [ Share ]              │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 💰 CHEAPEST 5-STAR      │ │  ← Next card (scroll)
│ │                         │ │
│ │    [Tour Photo]         │ │
│ │         ...             │ │
│ └─────────────────────────┘ │
│                             │
│         · · · · ·           │  ← More cards below
│                             │
└─────────────────────────────┘
```

**Key decisions:**
- Daily content — new superlatives each day
- Scrollable cards (unlike Roulette's one-at-a-time)
- Each card has its own share button
- The superlative badge IS the context/framing

### Screen 5: Six Degrees of Anywhere (Mobile)

```
┌─────────────────────────────┐
│  TourGraph                  │
│                             │
│  SIX DEGREES OF ANYWHERE    │
│                             │
│  ┌───────────┐ ┌──────────┐ │
│  │ Reykjavik │→│ Tokyo    │ │  ← Two city inputs
│  └───────────┘ └──────────┘ │
│                             │
│  ┌───────────────────────┐  │
│  │     Connect Them      │  │
│  └───────────────────────┘  │
│                             │
│  ── RESULT ──────────────── │
│                             │
│  ① Reykjavik              │
│  │  Ice Cave Exploration    │
│  │  "Frozen underworld..."  │
│  │                         │
│  ② ↓ connected by:         │
│  │  fermentation            │
│  │                         │
│  │  Icelandic Fermented     │
│  │  Food Tour               │
│  │  "Shark that's been      │
│  │   buried for months..."  │
│  │                         │
│  ③ ↓ connected by:         │
│  │  fermentation → sake     │
│  │                         │
│  │  Sake Brewery Tour       │
│  │  Kyoto, Japan            │
│  │                         │
│  ④ ↓ connected by:         │
│  │  Japanese food culture   │
│  │                         │
│  │  Tsukiji Fish Market     │
│  │  Tokyo, Japan            │
│  │                         │
│  ★ Tokyo                   │
│                             │
│  [ Share This Chain ]       │
│                             │
└─────────────────────────────┘
```

---

## OG Card Specification (Link Previews)

When a TourGraph link is shared on iMessage, WhatsApp, Twitter, etc., the preview must sell the click.

### Dimensions
- **Image**: 1200 x 630px (1.91:1 ratio — universal safe zone)
- **Format**: JPEG for photo-based cards
- **File size**: Under 150KB

### Content by Feature

**Tour Roulette (`/roulette/[id]`):**
```
┌──────────────────────────────────┐
│                                  │
│         [Tour Photo]             │
│         with subtle dark         │
│         gradient at bottom       │
│                                  │
│──────────────────────────────────│
│  ↻ Tour Roulette                 │
│  Fairy Hunting in Iceland        │
│  ★ 4.8 · $247 · Reykjavik       │
└──────────────────────────────────┘
```

**World's Most (`/worlds-most/[slug]`):**
```
┌──────────────────────────────────┐
│                                  │
│         [Tour Photo]             │
│                                  │
│──────────────────────────────────│
│  🏷 World's Most Expensive       │
│  Private Submarine to Titanic    │
│  $45,000 · St. John's, Canada   │
└──────────────────────────────────┘
```

**Six Degrees (`/six-degrees/[slug]`):**
```
┌──────────────────────────────────┐
│                                  │
│   Reykjavik ──→──→──→── Tokyo    │
│        5 stops, 4 connections    │
│                                  │
│──────────────────────────────────│
│  Six Degrees of Anywhere         │
│  Ice caves → fermentation →      │
│  sake → fish market              │
└──────────────────────────────────┘
```

### Required Meta Tags (Every Page)
```html
<meta property="og:type" content="website">
<meta property="og:url" content="https://tourgraph.ai/...">
<meta property="og:title" content="[Feature context] · [Tour title]">
<meta property="og:description" content="[Witty one-liner] · [Location] · [Key stat]">
<meta property="og:image" content="https://tourgraph.ai/og/[id].jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

---

## Tour Card Anatomy

The tour card is the atomic unit of the entire site. It appears everywhere: Roulette, shared pages, World's Most, and inside Six Degrees chains.

### Visual Hierarchy (scan order)

```
1. PHOTO          — First thing seen, largest element, emotional hook
2. TITLE          — "What is this?" — bold, 20-24px mobile
3. LOCATION       — "Where is this?" — lighter, 14px
4. ONE-LINER      — "Why should I care?" — italic, the personality
5. STATS ROW      — Rating, price, duration — compact, 14px
6. ACTIONS        — Share + context-specific CTA
```

### Rules
- Photo is always 60-80% of card height
- Title: max 2 lines, truncate with ellipsis
- One-liner: max 2 lines
- Stats: always one row, never wraps
- Minimum touch target: 48px for all buttons
- Consistent aspect ratio for photos (prevents layout shift)

---

## Interaction Patterns

### The Spin

When the user presses "Show Me Another":
- Current card exits (direction TBD — fade? slide? card flip?)
- Brief loading state (skeleton card with shimmer)
- New card enters
- The transition should feel satisfying — like pulling a slot machine, not like waiting for a page load

### Share Flow

1. User taps "Share" on a card
2. Native share sheet (mobile) or copy-link + social buttons (desktop)
3. Shared URL includes feature context (`/roulette/[id]`, `/worlds-most/[slug]`)

### First Visit → Loop

```
Land on homepage
    ↓
See Tour Roulette card (immediate, no splash screen)
    ↓
React ("ha!", "wow", "weird")
    ↓
Press "Show Me Another" (can't resist)
    ↓
2-3 more spins
    ↓
Find one worth sharing → Share
    ↓
OR discover other features via bottom links
```

### Shared Link → Loop

```
Tap link in iMessage/WhatsApp
    ↓
See specific tour with feature context
    ↓
React (same as above)
    ↓
See "Spin Your Own" button
    ↓
Now in the Roulette loop
```

---

## Resolved Decisions

### D1: Navigation Between Features
**Decision:** Subtle text links below the card for launch. Evolve to organic discovery (features surfacing naturally within each other) as the product matures.

Rationale: Minimal chrome, non-competing with the primary action. The features should feel like different moods of one experience, not a nav bar with four tabs.

### D2: Right Now Somewhere — Both
**Decision:** Ambient teaser on the Roulette page (a single evocative line, e.g., "Right now in Kyoto it's 6:47am...") that links to a full dedicated page with multiple "right now" moments.

Rationale: The ambient text creates atmosphere and grounds the randomness in reality. The full page is the deeper rabbit hole for anyone who wants more.

### D3: Spin Animation
**Deferred to prototyping.** Candidates: card flip, slide out/in, fade, shuffle, slot machine reel. The right answer will be obvious once we see it in a browser. Currently: instant swap (no animation).

### D4: Book on Viator Placement
**Decision:** The tour card on Roulette is **tappable**. Tapping opens the detail page (`/roulette/[id]`) which has the Viator affiliate link. The Roulette homepage itself has NO booking button — it stays pure play.

The flow:
```
Roulette homepage (play mode)
├── "Show Me Another" → next spin (primary action)
├── "Share" → share this tour (secondary action)
└── Tap the card itself → opens /roulette/[id] detail page
    ├── Same photo, title, one-liner, stats
    ├── Full description and highlights
    ├── "Book on Viator →" (affiliate link)
    ├── "Share"
    ├── "Spin Your Own ↻" (back to roulette)
    └── "More tours in [location] →" (rabbit hole)
```

Rationale: Keeps the play space clean. Booking intent surfaces naturally when someone is interested enough to tap for more. The detail page does double duty as both the "tell me more" destination and the shared link landing page.

### D5: Loading States
**Decision:** Pre-generate and cache AI one-liners during the batch tour indexing process. No visible loading state for captions.

Rationale: Perceived performance is everything for Pillar 1 (Zero Friction). Generating on-demand adds latency to every spin. Pre-caching means the card appears complete and instant.

### D6: OG Image Generation
**Decision:** Template-based composite — tour photo fills most of the image, small branded bar at bottom with feature context, title, and key stat.

Rationale: The photo does the emotional work. The branded bar adds context ("Tour Roulette" / "World's Most Expensive") that makes the share make sense. Pure photo with no context looks like a random travel ad.

---

## Implementation Notes

All wireframes and decisions in this doc have been implemented as of March 1, 2026:
- Homepage: tagline, roulette context line, "More to explore" feature teasers (live data)
- Tour detail pages: feature badge, description, inclusions, Book on Viator, Share, Spin Your Own
- Tooltips: HTML `title` attributes on stats (rating, price, duration), buttons, and FeatureNav links
- Six Degrees: chain roulette with inline timeline (random chain + "Surprise Me" to refresh — on-demand generation is V2)
- FeatureNav: subtle text links at bottom of every page with tooltip descriptions
- Not yet implemented: spin animation (D3), "More tours in [location]" rabbit hole link (needs location filtering)

## What's NOT in This Doc

- **Technical architecture** — How the caching works, API route structure, database schema. See `architecture.md`.
- **Visual design** — Colors, fonts, exact spacing. Needs a design pass once wireframes are validated.
- **Performance strategy** — Caching, pre-fetching, CDN. Important but separate concern.
- **iOS app UX** — App-specific patterns (swipe, widgets, haptics). Comes after web launch.

---

## References

UX research sources that informed these decisions:

- StumbleUpon history: "Stumbling Upon" — averaged 2,000 clicks/user, died when it became a portal
- Tinder swipe psychology: one-at-a-time eliminates choice paralysis, variable rewards drive engagement
- Wikipedia rabbit hole research (U. Penn): three browsing types — busybodies, hunters, dancers
- Atlas Obscura: place page structure — big photo, evocative title, share buttons, "nearby" rabbit holes
- The Useless Web / Bored Button: pure "one button" pattern proves minimal UI works
- Product Hunt: 60-character tagline constraint as the shareable hook
- Variable reward psychology: unpredictable quality across spins creates "one more" urge
- OG card best practices: 1200x630px, JPEG, under 150KB, og:title + og:description + og:image minimum
- Card UI design: 48px minimum touch targets, single primary CTA per card, photo-dominant hierarchy
