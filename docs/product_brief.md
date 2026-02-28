# TourGraph.ai — Product Brief

**Version:** 1.1
**Date:** February 28, 2026
**Status:** Greenlit for development

---

## Why This Exists

TourGraph.ai was originally conceived as supply-side infrastructure for tour operators. That thesis was invalidated — existing MCP servers (Peek, TourRadar, Magpie, Expedia) and AI search already solve the problem. Rather than abandon the domain ($200 invested, Viator API already integrated), we're pivoting to something radically different: a zero-friction, feel-good consumer site and app that makes people smile using the world's tour data.

---

## The Four Pillars

Every feature, design decision, and code commit must pass all four of these tests. If it doesn't, it's out of scope.

### 1. Zero Friction

No signup. No login. No personal data. No cookies beyond essential function. A stranger lands on the site (or opens the app) and is delighted within 5 seconds. There is nothing to configure, no profile to create, no preferences to set. The site gives before it asks.

**Test:** Can my mom use this without asking me a single question?

### 2. Instant Smile

Every interaction should brighten someone's day. The tone is warm, witty, and wonder-filled — never snarky, cynical, or mean. We're showing people how weird, beautiful, and surprising the world is. The goal is that little hit of "oh wow, I didn't know that existed" or "ha, that's amazing."

**Test:** Would I text this to a friend just because it made me smile?

### 3. Effortlessly Shareable

Every piece of content the site generates should be individually shareable with a unique URL and a beautiful Open Graph preview card (image + title + description). On the app, native share sheets make this seamless. The viral loop is: see something delightful → share it → friend clicks → friend sees something delightful → friend shares. No "sign up to share" gates. No "download our app" interstitials.

**Test:** Does the link preview on iMessage/WhatsApp/Twitter look good enough that someone would actually tap it?

### 4. Rabbit Hole Energy

The site and app should have that "one more click" quality. Not through dark patterns or infinite scroll, but through genuine curiosity. Each experience should naturally make you wonder "what else is out there?" The best model is Wikipedia's rabbit hole effect — you came for one thing and 20 minutes later you're somewhere completely unexpected and loving it.

**Test:** Did I just spend 10 minutes on this when I only meant to spend 30 seconds?

---

## What We're Building

All four features ship before launch. Website first, then iOS app. This is the priority project — full focus until it's live.

### Feature 1: Tour Roulette (Core Loop)
One big button. Press it. Get a random tour from somewhere in the world — weighted toward the extremes (highest rated, most reviewed, weirdest, most expensive, cheapest). Shows the photo, title, destination, price, rating, and an AI-generated witty one-liner. Press again. And again. This is the addictive heart of the experience.

**On web:** Big centered button, full-bleed photo cards.
**On app:** Swipe-based UX (think Tinder for tours). Swipe for a new one, tap for details, share button always visible.

### Feature 2: Right Now Somewhere...
Time-zone-aware feature that shows a tour happening (or about to happen) in a place where it's currently a beautiful time of day. "Right now in Kyoto it's 6:47am and you could be doing forest bathing with a Buddhist monk. 4.9 stars." Refreshes to a new destination each time. Instant teleportation feeling.

**On web:** Hero section or dedicated page with auto-refresh.
**On app:** iOS home screen widget showing a rotating "right now" card. The kind of thing people screenshot and share.

### Feature 3: The World's Most ___
Daily superlatives generated from the Viator catalog. Most expensive tour today. Cheapest 5-star experience. Longest duration. Most reviewed tour you've never heard of. Each one is a shareable card with photo, stat, and witty caption. These are the social media bait — individually linkable, beautiful previews.

**On web:** Gallery of daily cards, each with its own URL and OG preview image.
**On app:** Scrollable daily feed. Push notification potential: "Today's weirdest tour: Fairy hunting in Iceland with a certified elf spotter. 4.8 stars."

### Feature 4: Six Degrees of Anywhere
Type two cities. The site builds a chain of tours connecting them through surprising thematic links — shared activities, cultural connections, overlapping cuisines, historical threads. Visualized as a simple graph (the name finally earns itself). This is the technically interesting feature and the deepest rabbit hole.

**On web:** Interactive graph visualization, animated chain reveal.
**On app:** Simplified chain view optimized for vertical scrolling, with tap-to-explore each link.

---

## Build Order

| Phase | What | Platform | Timeframe |
|-------|------|----------|-----------|
| 1 | Tour Roulette | Web | Week 1 |
| 2 | Right Now Somewhere | Web | Week 1-2 |
| 3 | The World's Most ___ | Web | Week 2 |
| 4 | Six Degrees of Anywhere | Web | Week 2-3 |
| 5 | Polish, OG cards, sharing | Web | Week 3 |
| 6 | Launch website | Web | Week 3 |
| 7 | iOS app (all 4 features) | iOS/SwiftUI | Week 4-5 |
| 8 | App Store submission | iOS | Week 5-6 |

Timeframes are estimates, not commitments. The goal is focused momentum, not deadline pressure. This is supposed to be fun.

---

## What We're NOT Building

- A booking engine (we're Viator affiliates — bookings redirect to Viator)
- A travel planning tool (no itineraries, no trip builders)
- A review aggregator (we surface reviews for delight, not comparison shopping)
- A social network (no profiles, no followers, no feeds)
- A recommendation engine (no "based on your history" — it's random, serendipitous)
- Anything that requires user accounts or personal data

---

## Platform Strategy

### Website (tourgraph.ai)
The website is the **sharing backbone**. Every piece of content has a unique URL with OG preview cards. When someone shares a TourGraph link on any platform, the preview looks beautiful and inviting. The website is also the discovery surface for people who don't have the app.

### iOS App (TourGraph)
The app is the **daily delight machine**. It's what people open when they're bored, waiting in line, or need a smile. The app is fully self-contained — it talks directly to Viator API and Claude API without depending on a shared backend with the website.

**App-exclusive features (post-launch possibilities):**
- Home screen widget: "Right Now Somewhere..." rotating card
- Push notifications: Daily "World's Most" superlative
- Haptic feedback on Tour Roulette spin
- Swipe-based Tour Roulette (vs. button-based on web)

**App shares with website:**
- Same Viator API integration patterns
- Same Claude prompts for witty captions
- Same visual design language (dark mode, big photos, playful typography)
- Shared URLs — app-generated content links to the website for non-app users

---

## Tech Stack

### Website
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend | Next.js (React) | SSR for OG previews, fast, familiar |
| Hosting | DigitalOcean droplet (~$6/mo) | Already have infrastructure there |
| Data | Viator Partner API (Basic tier, free) | Already integrated, 300K+ experiences |
| AI Layer | Claude API | Witty captions, six-degrees chains |
| Cache | SQLite | Pre-built local index, no API calls at request time |
| Domain | tourgraph.ai | Already owned and configured |

### iOS App
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | SwiftUI | Already proven with GitaVani |
| Architecture | Self-contained (no shared backend) | Simplicity, independence |
| Data | Viator API (direct calls) | Same API, thin caching layer on device |
| AI Layer | Claude API (direct calls) | Same prompts, called from app |
| Local Storage | SwiftData or UserDefaults | Cache tours, favorites, recent spins |
| Distribution | App Store | Free app |

---

## Data We Have (Viator Basic Tier)

- Product search by destination & category
- Product details: title, description, highlights
- Photos: 10-31 CDN-hosted images per product
- Pricing: by age band (adult/child/infant/senior)
- Ratings: star rating + review count (not review text at Basic)
- Duration, schedule, operating hours
- Categories and tags
- Location/meeting points with lat/long
- Attraction associations
- 300,000+ experiences across 3,380+ destinations

**Upgrade path (Full tier, also free, requires certification):** Adds review text, real-time availability, and bulk catalog ingestion via `/products/modified-since`.

---

## Design Principles

- **Dark mode default** — feels premium, photos pop
- **Big photos** — the tour images do the heavy lifting
- **Minimal UI** — the content is the interface
- **Fast** — every interaction feels instant (pre-fetch, cache, skeleton loaders)
- **Mobile-first** — most sharing happens on phones
- **Playful typography** — not corporate, not childish, just warm
- **Consistent across platforms** — same personality on web and app, adapted to each platform's strengths

---

## Success Metrics (Vibes, Not KPIs)

We're not optimizing for revenue or growth hacking. Success looks like:

- Friends texting each other TourGraph links
- Someone at a dinner party saying "have you seen this site?"
- A Reddit post titled "I just lost an hour on this weird tour website"
- The app becoming someone's "bored in line" go-to
- A home screen widget that makes someone smile every time they glance at their phone
- The developer (Nikhil) having fun building it

