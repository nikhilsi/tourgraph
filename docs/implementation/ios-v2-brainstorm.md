# iOS v2 Brainstorm — Breaking the 4.2.2 Rejection Cycle

---
**Created**: March 10, 2026
**Status**: Brainstorm — needs narrowing
**Context**: v1.0 and v1.1 both rejected under Guideline 4.2.2 (Minimum Functionality). Same boilerplate rejection both times. Adding widgets, Siri, Spotlight wasn't enough — Apple sees the app as a content aggregator regardless of native platform hooks.
---

## The Core Insight

Apple doesn't care about native *features bolted onto* a content viewer. They care about apps that **couldn't exist as a website**. The app needs to sense context, act on it, and build a personal story over time.

**Apps Apple loves (pattern):**
- **Shazam** — listens, identifies, remembers. Personal history.
- **Flighty** — passive tracking, proactive alerts, beautiful data viz.
- **Slopes** — auto-detects skiing, tracks runs, builds a season story.
- **Citymapper** — goes beyond maps with real-time transit + step-by-step.

**The pattern:** They all sense context, act proactively, and build a personal story over time. The app becomes smarter the longer you have it.

## Concept: Travel Awareness Layer

TourGraph becomes a **travel awareness companion** that knows where you are, where you've been, and what's around you — and it surprises you. Not just when you're traveling. *Always.*

The app doesn't wait for you to open it. It comes to you.

---

## Building Blocks

### 1. Passive Travel Detection + Auto-Journal

- **Significant location monitoring** (battery-free, ~500m precision via CoreLocation)
- App auto-detects: "You were in Rome March 3-7, Barcelona March 8-11"
- Builds a travel timeline automatically — zero manual input
- Shows tours you *could have done* in each city you visited
- "You spent 4 days in Rome and missed a secret catacombs tour with 4.9 stars"
- **Native why:** Background location monitoring is impossible in Safari. The journal builds itself while the app is closed.

### 2. Geofenced Discovery ("The Whisper")

- Pre-load geofences for top destinations near user's location
- Walk near a tour hotspot → contextual lock screen notification
- Not spammy — configurable frequency (once per new city, daily, etc.)
- "You're 200m from a tour where you drink wine in ancient underground tunnels. 4.9 stars, $67"
- Land in a new city (significant location change) → welcome notification with city personality + weirdest tour
- **Native why:** Geofencing + local notifications triggered by physical movement. A website tab is dead when Safari closes.

### 3. Augmented Reality Layer

- Point camera at a street → see floating pins for nearby tours
- Uses ARKit + destination coordinates (city-level, not street-level — but effective in city centers)
- Tap a floating pin → tour card overlay
- **Native why:** ARKit is native-only. WebXR exists but is terrible and unsupported on iOS Safari.

### 4. Live Activities for Active Travel

- When detected in a travel destination, a Live Activity appears on lock screen and Dynamic Island
- Rotating tour suggestions throughout your stay
- Dynamic Island shows: current city + micro-suggestion ("Try the catacombs tour")
- **Native why:** Live Activities and Dynamic Island are iOS-exclusive system-level features.

### 5. Personal Travel Score + Identity

- Based on cities detected, tours explored in-app, favorites patterns
- "You've been to 3 continents. You gravitate toward food tours and sacred spaces."
- Evolving traveler archetype: "Shrine Seeker," "Night Market Wanderer," "Adrenaline Chaser"
- Shareable identity card (ImageRenderer)
- Gamification: badges, milestones, exploration streaks
- **Native why:** Built from on-device location history + usage patterns. Deeply personal. Gets better over time.

### 6. Personal World Map

- Beautiful dark-mode MapKit globe you can spin
- 3,380 glowing destination dots
- Cities you've visited light up differently from cities you've only explored in-app
- Completionist energy: "You've explored 47/3,380 destinations"
- **Native why:** MapKit with CoreLocation integration. The map knows where you physically are.

---

## Additional Free Data Sources

Enriching beyond Viator to make the experience richer and more contextual:

| Source | Data | Cost | Adds What |
|--------|------|------|-----------|
| Wikipedia API | City/landmark articles | Free | Cultural context, history blurbs |
| OpenWeatherMap | Current weather | Free tier (1000 calls/day) | "22C and sunny in Kyoto — perfect for forest bathing" |
| REST Countries | Country facts, currencies, languages | Free | Travel practical info |
| Existing timezone data | Already in DB | Zero | Golden hour, local time (already used) |
| Wikimedia Commons | Landmark photos | Free | Visual richness beyond Viator images |
| Open Exchange Rates | Currency conversion | Free tier | "This $89 tour is 7,400 INR" |
| Public Holidays API | Local festivals/events | Free | "It's cherry blossom season in Tokyo" |

## Location Data Status

- **Tours:** 0/136K have lat/lng (all NULL)
- **Destinations:** 3,380/3,380 have lat/lng (100% coverage)
- **Solution:** Join through `tours.destination_id → destinations.id` for city-level coordinates
- City-level precision is sufficient for geofencing, "near me," and map features
- Could optionally backfill `tours.latitude/longitude` from destination table for query speed

---

## The Pitch to Apple

TourGraph isn't a content viewer. It's a **travel awareness companion** that uses CoreLocation, geofencing, ARKit, Live Activities, and WidgetKit to proactively surface discoveries as you move through the world. It builds a personal travel identity over time. None of this is possible in a browser.

Five deep native integrations working together around one concept — not bolted on, core to the experience:

1. **Passive travel detection** (CoreLocation significant monitoring)
2. **Geofenced alerts** (local notifications triggered by physical movement)
3. **Augmented reality** (ARKit tour pins in camera view)
4. **Live Activities** (Dynamic Island + lock screen during travel)
5. **Personal travel journal** (auto-built from location history)

---

## Open Questions

- [ ] Which building blocks to include in v2 vs. defer?
- [ ] Cost analysis for additional data sources
- [ ] How much Haiku usage is acceptable? (personality generation, quiz questions, etc.)
- [ ] AR: city-level coordinates enough, or need more precise data?
- [ ] Privacy implications of background location tracking (need clear opt-in UX)
- [ ] Does the trivia/game mechanic fit this concept or is it a distraction?
- [ ] What's the minimum viable set that breaks the rejection cycle?

---

## What We're NOT Changing

The four pillars still apply:
1. **Zero Friction** — no signup, no login
2. **Instant Smile** — warm, witty, wonder-filled
3. **Effortlessly Shareable** — every piece of content has a URL and beautiful preview
4. **Rabbit Hole Energy** — "one more click" through genuine curiosity

The existing four features (Roulette, Right Now, World's Most, Six Degrees) stay. V2 adds a native layer on top that makes the app *proactive* rather than *reactive*.

---

## Research: What Makes Apple Love Apps

### 1. Apple's Own Guidelines (Read the Nuance)
- **App Store Review Guidelines 4.2** — read the full section, not just 4.2.2. Understand what "minimum functionality" really means to reviewers.
- **Apple Design Awards winners** — study what Apple celebrates each year. Pattern: deep native integration, beautiful design, novel use of hardware.

### 2. Developer Forums / Rejection War Stories
- Search **"4.2.2 rejection"** on the Apple Developer Forums — dozens of threads with what worked and what didn't.
- **r/iOSProgramming** on Reddit — search "minimum functionality rejected" — real developer stories about what they changed to get approved.

### 3. Podcasts / Articles
- **Under the Radar** podcast (David Smith + Marco Arment) — indie developers who've navigated App Review for years.
- **Appfigures blog** — app store strategy and rejection patterns.

### 4. Apple's WWDC Sessions
- "What's new in App Store Connect" sessions hint at what Apple values.
- Platform State of the Union talks — they highlight the native capabilities they want developers to use (Live Activities, WidgetKit, App Intents were all heavily promoted).

### 5. The Appeal Process
- You can **request a phone call** with App Review — hearing a human explain *why* they rejected can be more valuable than any blog post.
- Available for 4.2.2 rejections specifically.
