# iOS v2 Plan — Travel Awareness Companion

---
**Created**: March 11, 2026
**Last Updated**: March 17, 2026
**Status**: In progress (Phase 1a done, Phase 1b done, Phase 2 next)
**Context**: v1.0 and v1.1 both rejected under Guideline 4.2.2 (Minimum Functionality). Same boilerplate both times. Native features bolted onto a content viewer don't change Apple's perception. v2 needs to be a fundamentally different kind of app.
**Role**: Partner-level architect. Think critically, don't rush, challenge bad ideas, maintain quality bar.
---

## Why v1.1 Failed

Apple sees thousands of apps that bolt WidgetKit and Siri onto content viewers. They can smell it. What they want is an app where **the iOS capabilities are load-bearing** — remove them and the app doesn't make sense.

The apps Apple celebrates share a pattern:

- **Flighty** doesn't just display flight data. It tracks your flights *passively* and alerts you *proactively*. The app is alive when it's closed.
- **Slopes** doesn't just show ski stats. It *auto-detects* when you're skiing and builds your season story without you touching it.
- **Dark Sky** didn't just show weather. It said "rain starting in 12 minutes *at your location*."

**The formula: context-aware + proactive + personal over time + impossible without the phone's sensors.**

TourGraph v1.1 failed this test. The widgets and Siri were decorative, not structural. The app worked exactly the same without them.

---

## What TourGraph Uniquely Has

- 136,256 tours across 3,380 geolocated destinations (100% lat/lng on destinations)
- 910 city personalities with themes ("sacred spaces," "street food," "adrenaline")
- 491 chains connecting cities through surprising thematic links
- AI one-liners for every tour — witty, warm, shareable
- Ratings, prices, durations, categories — structured and queryable

This is a **knowledge graph about the world's experiences**. Not content to browse — a dataset an intelligent companion can reason about.

---

## The Product Vision

**TourGraph v2 = "The app that knows where you are in the world and makes you curious about it."**

Not a content viewer with native sprinkles. A personal travel companion that lives on your phone, knows where you are, knows where you've been, and surprises you.

---

## Three Pillars

### Pillar A: Travel Awareness (always on, zero effort)

The app is alive when it's closed. It detects where you are, welcomes you to new cities, and builds your travel history automatically.

- Passive location detection → auto-journal of your travels
- Geofenced city welcome → a whisper when you arrive somewhere new
- Live Activity during travel → persistent lock screen companion
- **Why it matters:** This is structurally impossible on the web. Safari closes, the tab dies. This app lives on your phone.

### Pillar B: Personal World Map (visual, emotional)

A beautiful dark-mode MapKit globe that becomes *yours* over time. Your travel life visualized.

- 3,380 destination dots on a spinnable globe
- Auto-fills from travel detection + in-app exploration
- Travel identity / personality that evolves ("Shrine Seeker," "Night Market Wanderer")
- Shareable identity card (viral mechanic)
- **Why it matters:** Completionist energy + emotional attachment. This gives users a reason to keep the app forever.

### Pillar C: Daily Challenge (engagement, retention)

A daily travel trivia game that transforms our data from content to consume into content to play with.

- Fresh questions daily from our 136K tours, 910 cities, 491 chains
- Streaks, score history, progression
- Location-aware bonus rounds ("You're in Rome! Bonus round: Roman tours")
- **Why it matters:** This gives users a reason to open the app every day. Apple loves games. It's the difference between reading an encyclopedia and playing Trivial Pursuit.

### How the Pillars Connect

The existing four features (Roulette, Right Now, World's Most, Six Degrees) become the **discovery engine** that feeds into the map and identity. Every tour you see, every chain you explore, lights up your map and shapes your identity.

```
┌─────────────────────────────────────────────────┐
│            PILLAR A: Travel Awareness            │
│  (CoreLocation, geofencing, Live Activities)     │
│  "The app is alive when it's closed"             │
└──────────────────────┬──────────────────────────┘
                       │ feeds cities visited
                       ▼
┌─────────────────────────────────────────────────┐
│           PILLAR B: Personal World Map           │
│  (MapKit, travel identity, shareable card)       │
│  "Your travel life, visualized"                  │
│                                                  │
│  ◄── also fed by in-app exploration              │
│      (Roulette, Right Now, World's Most,         │
│       Six Degrees — the discovery engine)         │
└──────────────────────┬──────────────────────────┘
                       │ shapes identity
                       ▼
┌─────────────────────────────────────────────────┐
│           PILLAR C: Daily Challenge              │
│  (trivia game, streaks, location bonuses)        │
│  "Come back every day"                           │
│                                                  │
│  ◄── location-aware bonus rounds from Pillar A   │
│  ──► exploration feeds back into Pillar B         │
└─────────────────────────────────────────────────┘
```

---

## The 10 Ideas — Evaluated and Mapped

### 1. Passive Travel Detection + Auto-Journal → Pillar A (core)

**What:** Significant location monitoring (CoreLocation, battery-free, ~500m). The app auto-detects "you were in Rome March 3-7" and builds a travel timeline. Shows tours you *could have done* in each city. "You spent 4 days in Rome and missed a secret catacombs tour with 4.9 stars."

**Honest take:** The **single strongest piece**. It makes the app alive when it's closed. It builds something personal over time with zero user effort. Structurally impossible on the web — not "hard," but literally impossible. Safari can't monitor your location in the background. Gets more valuable the longer you have the app.

**Risk:** Privacy sensitivity. Needs clear opt-in UX. But Apple's own apps do this (Photos memories, Maps significant locations), so the pattern is established.

**Verdict: Must build. This is the backbone of Pillar A.**

---

### 2. Geofenced Discovery ("The Whisper") → Pillar A (core)

**What:** When you arrive in a city with tours, a notification: "Welcome to Barcelona. 197 tours here. The weirdest one involves eating in complete darkness. 4.8 stars."

**Honest take:** Strong native signal — geofencing + local notifications triggered by physical movement. Our coordinates are city-level, not street-level. We can't say "you're 200m from this tour." We *can* say "you just arrived in a city we know about." That's actually the right granularity — a welcome moment, not a spammy ping every block.

Key design question: how often? Once per city visit is delightful. Every hour is annoying. The *whisper*, not the *shout*.

**Risk:** Getting frequency wrong turns delight into annoyance. Configurable frequency + smart defaults solve this.

**Verdict: Build — pairs perfectly with #1. Together they make the app location-aware at all times.**

---

### 3. Augmented Reality Layer → Deferred

**What:** Point camera at a street, see floating pins for nearby tours.

**Honest take: Skip for v2.** With city-level coordinates, all AR pins cluster at the city center. Without street-level data, AR is a gimmick — impressive for 5 seconds, useless after. Apple can tell the difference between genuine AR (IKEA Place, Measure) and "we added ARKit to impress you." It would actually hurt our case if the AR experience is shallow.

**Verdict: Defer until we have street-level tour coordinates (Viator full tier might provide these).**

---

### 4. Live Activities + Dynamic Island → Pillar A (component)

**What:** When the app detects you're in a travel destination, a Live Activity appears on your lock screen with rotating local tour suggestions. Dynamic Island shows city name + micro-suggestion.

**Honest take:** Strong native signal — Live Activities are Apple's pride. But thin on its own. Best as a *component* of the travel detection system. When you arrive in Barcelona and the geofence fires, a Live Activity persists on your lock screen for your visit showing contextual suggestions. That's coherent.

**Risk:** Live Activities are meant for time-bounded events. "You're traveling" is arguably time-bounded (trip has a start and end), but Apple might push back if it runs for days.

**Verdict: Build as part of Pillar A, not standalone.**

---

### 5. Personal Travel Identity / Score → Pillar B (emotional layer)

**What:** Based on cities visited, tours explored, favorites patterns — build an evolving traveler archetype. "You're a Shrine Seeker & Night Market Wanderer." Shareable identity card.

**Honest take:** The **emotional hook**. People love being told who they are (Myers-Briggs, Spotify Wrapped). A travel identity that evolves over time gives users a reason to keep the app and come back. The shareable card is a viral mechanic — "I'm a Shrine Seeker, what are you?"

Could use Haiku on the server to generate personality descriptions from usage patterns — pennies per user, runs infrequently.

**Risk:** Needs enough signal to be meaningful. Graceful degradation needed — start vague, get specific.

**Verdict: Build — this is the retention and sharing layer of Pillar B. Needs #1 and #6 feeding data into it.**

---

### 6. Personal World Map → Pillar B (core)

**What:** Beautiful dark-mode MapKit globe. 3,380 destination dots. Cities you've physically visited glow one color, cities you've explored in-app glow another, unexplored cities are dim. Completionist energy.

**Honest take:** Visually stunning and deeply personal. "You've explored 47 of 3,380 destinations" triggers completionist instinct. The map becomes *yours*. Combined with auto-detection (#1), cities light up automatically as you travel. Combined with in-app exploration, you can "discover" cities from your couch too.

This is the kind of screen people screenshot and share. MapKit is native-only done right.

**Risk:** MapKit with 3,380 pins needs clustering at zoom levels. Solvable, standard pattern.

**Verdict: Build — this is the visual centerpiece of Pillar B.**

---

### 7. Daily Travel Trivia Game → Pillar C (core)

**What:** "Which city has a tour where you eat tarantulas?" "Which costs more: helicopter over Grand Canyon or cooking class in Tokyo?" Daily challenges, streaks, score history.

**Honest take:** The **sleeper hit**. Consider:
- Uses ALL our data (136K tours, 910 city profiles, 491 chains)
- Natural daily retention (streaks — the mechanic that makes Duolingo and Wordle sticky)
- Genuinely fun (passes the "Instant Smile" pillar)
- Haiku can generate fresh questions server-side for pennies
- Apple **loves** games and interactive experiences
- Location-aware bonus: "You're in Rome! Bonus round: Roman tours"
- Transforms data from *content to consume* into *content to play with*

This could single-handedly change Apple's perception. A content viewer shows you data. A trivia game makes you *engage* with data. The difference between reading an encyclopedia and playing Trivial Pursuit.

**Risk:** Needs good question generation. Haiku handles this — pre-generate daily question sets server-side, ~$0.01/day.

**Verdict: Strongly recommended. The most important feature for changing Apple's perception. Core of Pillar C.**

---

### 8. Fitness / HealthKit Mashup → Skip

**What:** "You walked 8,000 steps today — that's enough to complete the Cinque Terre coastal trail."

**Honest take:** Cute but forced. The connection between step count and tour duration is tenuous. Would make someone smile once, then be ignored. Apple would see through this as a HealthKit integration for the sake of having one.

**Verdict: Skip. Doesn't serve the core vision.**

---

### 9. Collaborative Swiping / SharePlay → Skip for v2

**What:** Two friends swipe tours together in real-time, build a shared mood board.

**Honest take:** Requires 2 people. Apple tests solo. If the reviewer can't experience the feature alone, it doesn't help. Complex build for uncertain payoff.

**Verdict: Skip for v2. Revisit if the app builds a user base.**

---

### 10. Additional Data Sources (Weather, Festivals, Currency) → Context Enhancer for Pillars A + C

**What:** Enrich with OpenWeatherMap, public holidays, exchange rates.

| Source | Data | Cost | Enhances What |
|--------|------|------|---------------|
| Wikipedia API | City/landmark articles | Free | City welcome notifications, trivia questions |
| OpenWeatherMap | Current weather | Free tier (1000/day) | "22C and sunny — perfect for forest bathing" |
| REST Countries | Country facts, currencies, languages | Free | Travel context, trivia questions |
| Wikimedia Commons | Landmark photos | Free | Visual richness |
| Open Exchange Rates | Currency conversion | Free tier | Prices in local currency when abroad |
| Public Holidays API | Local festivals/events | Free | "Cherry blossom season in Tokyo" |

**Honest take:** These are *context enhancers*, not standalone features. Weather + seasonal context make geofenced notifications richer. Currency makes prices relevant when abroad. They don't justify the app alone but make every other feature better.

**Verdict: Layer in selectively. Don't over-engineer.**

---

## Summary: What's In, What's Out

| # | Idea | Verdict | Maps To |
|---|------|---------|---------|
| 1 | Passive travel detection + auto-journal | **Build** | Pillar A — core |
| 2 | Geofenced city welcome | **Build** | Pillar A — core |
| 3 | Augmented reality | **Defer** | — |
| 4 | Live Activities + Dynamic Island | **Build** | Pillar A — component |
| 5 | Travel identity / score | **Build** | Pillar B — emotional layer |
| 6 | Personal world map | **Build** | Pillar B — core |
| 7 | Daily travel trivia | **Build** | Pillar C — core |
| 8 | Fitness / HealthKit | **Skip** | — |
| 9 | Collaborative swiping | **Skip** | — |
| 10 | Additional data sources | **Enhance** | Pillars A + C — context |

---

## Location Data Status

- **Tours:** 136,303/136,303 have lat/lng (100% — backfilled from destinations in Phase 1a)
- **Destinations:** 3,380/3,380 have lat/lng (100% coverage)
- **Map shows:** 2,694 destinations (filtered to those with active tours)
- City-level precision is sufficient for geofencing, "near me," and map features

---

## The Pitch to Apple

TourGraph isn't a content viewer. It's a **travel awareness companion** that uses CoreLocation, geofencing, MapKit, Live Activities, WidgetKit, and local notifications as *structural elements* of a personal travel companion. It builds a personal travel identity over time. None of this is possible in a browser.

Five deep native integrations working as a coherent system:

1. **Passive travel detection** — the app knows where you've been (CoreLocation significant monitoring)
2. **Geofenced city welcome** — the app greets you when you arrive somewhere (local notifications)
3. **Live Activities** — the app lives on your lock screen during travel (Dynamic Island)
4. **Personal world map** — your travel life on a MapKit globe (gets richer over time)
5. **Daily trivia game** — come back every day, location-aware bonus rounds (streaks + engagement)

---

## What We're NOT Changing

The four pillars still apply:
1. **Zero Friction** — no signup, no login
2. **Instant Smile** — warm, witty, wonder-filled
3. **Effortlessly Shareable** — every piece of content has a URL and beautiful preview
4. **Rabbit Hole Energy** — "one more click" through genuine curiosity

The existing four features (Roulette, Right Now, World's Most, Six Degrees) stay as the discovery engine that feeds into the map and identity.

---

## Implementation Progress

### Phase 1a: World Map — DONE

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Backfill tours.latitude/longitude from destinations table | **Done** | 136,303 tours updated from destinations join |
| 2 | Rebuild iOS seed DB with lat/lng populated | **Done** | 123MB, kept destinations table + lat/lng |
| 3 | MapKit globe view in iOS app | **Done** | Satellite imagery style, annotation-based pins |
| 4 | Pin clustering at zoom levels | **Done** | Size-based pins (7-18px based on tour count) |
| 5 | "Explored" tracking (tap = explored, glow change) | **Done** | ExploredDestinations (UserDefaults), green=explored, orange=unexplored |
| 6 | Map as new tab or accessible view | **Done** | 5th tab "World Map" with globe icon |
| 7 | Stats overlay ("47 of 3,380 destinations explored") | **Done** | Bottom-left overlay with .ultraThinMaterial |

**New files:** `WorldMapView.swift`, `MapPinView.swift`, `DestinationDetailSheet.swift`, `MilestoneToast.swift`, `ExploredDestinations.swift`, `MapLocationManager`

### Phase 1b: Daily Trivia — DONE

**Design doc**: `docs/trivia-prototype.md`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Prototype question formats | **Done** | 7 formats, 18 sample questions. See `docs/trivia-prototype.md` |
| 2a | SQL generators for 6 formats | **Done** | `data/scripts/5-trivia/generate-pool.ts` — 1,035 questions (200/format, 35 numbers) |
| 2b | Haiku batch for fake tour titles | **Done** | `data/scripts/5-trivia/generate-fakes.ts` — 200 real_or_fake questions via Haiku |
| 2c | DB schema + pool generation | **Done** | 3 tables + 1,235 total questions in trivia_pool. Lazy daily assembly on first API request. |
| 2d | GeoIP2 setup on droplet | **Done** | `libnginx-mod-http-geoip2` + GeoLite2-Country.mmdb + `X-Country-Code` header |
| 3 | Backend API endpoints | **Done** | `backend/src/routes/trivia.ts` — 6 endpoints, deployed to production |
| 4 | iOS game UI + streaks + sharing | **Done** | Daily challenge, practice mode, results screen, streaks/Travel IQ. Smoke tested on device. |
| 5 | Tab restructure (5-tab layout) | **Done** | 5 tabs: Roulette, Discover (RN+WM+SD), World Map, Trivia, Profile. Deep links/intents/widgets preserved. |

### Phase 2: Travel Awareness — NEXT

**Goal:** Make the app alive when it's closed. Detect travel, welcome users to cities, auto-light the World Map.

**Architecture: Two CoreLocation services working together**

```
Significant Location Changes (~500m, cell/Wi-Fi, zero GPS)
    │
    │ fires when user moves ~500m
    ▼
Query bundled DB: "what are the 20 nearest destinations?"
    │
    │ clear old geofences, register 20 nearest
    ▼
CLMonitor (iOS 17+) — 20 CircularGeographicConditions
    │
    │ fires when user enters a destination region
    ▼
Local Notification: "Welcome to Barcelona. 197 tours here..."
    + Mark destination as "visited" on World Map
    + Record CityVisit locally (UserDefaults)
```

**Key constraints:**
- 20 geofence limit per app → "nearest 20 rotation" pattern (recalculate on every significant location change)
- ~500m accuracy is perfect for city-level detection (our destinations ARE cities)
- "Always" authorization required for background/terminated detection
- CLMonitor is iOS 17+ (our deployment target) — use it instead of deprecated CLCircularRegion
- CLMonitor must be singleton (duplicate name = crash)
- Both services work when app is terminated + survive device restart

**Permission flow (earn trust, don't demand it):**
1. App works fully without any location permission
2. World Map tab shows subtle prompt: "Enable Nearby Alerts to auto-discover destinations"
3. User taps → in-app explainer screen (before system prompt): "TourGraph can quietly watch for cities you visit and light up your map automatically. We never store or share your location."
4. User confirms → system "When In Use" prompt
5. After user sees value, prompt upgrade to "Always": "Want TourGraph to detect cities even when the app is closed?"
6. System grants provisional "Always" → iOS later shows confirmation dialog with location map

**Info.plist strings:**
- `NSLocationWhenInUseUsageDescription`: "Your location is used to show nearby tour destinations and light up your personal World Map."
- `NSLocationAlwaysAndWhenInUseUsageDescription`: "Background location lets TourGraph quietly detect when you arrive in cities with tours, so your World Map updates automatically — even when the app is closed."
- `UIBackgroundModes`: `location`

**Data model — local only (no server, no accounts):**
- `CityVisit`: destination ID, city name, arrival date, departure date
- Stored in UserDefaults (small dataset — list of visited destination IDs + dates)
- Powers World Map third pin state (blue = physically visited)

**What's NOT in Phase 2:**
- Live Activities (can't start from background without push infra — defer to post-approval)
- Travel identity / personality (Phase 3 — needs enough visit data)
- Location-aware trivia bonus rounds (easy add-on later)
- Street-level "nearby tour" alerts (city-level coords only)

**Graceful degradation:**
- No permission: all features work, just no background detection. Manual "I've been here" on map.
- "When In Use" only: detection works while app is open. No background.
- "Always": full background detection, auto-journal, city welcome notifications.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | `TravelAwarenessService` — CLLocationManager + CLMonitor singleton | Not Started | @Observable, @MainActor, manages permission state + geofence rotation |
| 2 | Permission flow UI — explainer screen + progressive authorization | Not Started | In-app screen before system prompt, When In Use → Always escalation |
| 3 | Significant location change handler — nearest-20 geofence rotation | Not Started | Query destinations DB, calculate distances, register 20 nearest CLMonitor conditions |
| 4 | Geofence entry handler — city welcome notification | Not Started | Local notification with city name, tour count, top tour one-liner |
| 5 | CityVisit model + UserDefaults persistence | Not Started | Record visits, arrival/departure dates, feed into World Map |
| 6 | World Map integration — third pin color (physically visited) | Not Started | Blue = visited, green = explored in-app, orange = unexplored |
| 7 | Profile tab — travel journal section | Not Started | Recent city visits with dates, fed from CityVisit data |
| 8 | Info.plist + entitlements + background modes | Not Started | Purpose strings, UIBackgroundModes location, privacy descriptions |
| 9 | On-device testing + battery verification | Not Started | Test geofence detection, notification timing, battery impact |

### Phase 3: Polish + Resubmit

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Travel identity / shareable card | Not Started | Evolving archetype from visits + favorites + trivia. Haiku-generated personality. |
| 2 | Full QA pass — all features, deep links, edge cases | Not Started | Systematic test of every tab, deep link, intent, widget |
| 3 | App Store screenshots + preview video | Not Started | Show Map, Trivia, Discover, city welcome notification |
| 4 | App Review notes — detailed feature walkthrough | Not Started | Explain each native integration, how to test background location |
| 5 | Resubmit to App Store | Not Started | v2.0, new screenshots, updated description ||

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 11 | Skip AR for v2 | City-level coords too imprecise, would feel gimmicky |
| Mar 11 | Skip HealthKit | Forced connection, doesn't serve core vision |
| Mar 11 | Skip collaborative/SharePlay | Needs 2 people, Apple tests solo |
| Mar 11 | Start with Phase 1a (map) | Zero research blockers, high visual impact |
| Mar 11 | Phase 1 might be enough to pass Apple | Map + trivia fundamentally changes what the app is |
| Mar 17 | Restructure to 5 tabs (from 6) | 6 tabs triggers iOS "More" overflow. Combine Right Now + World's Most + Six Degrees into "Discover" tab. Add "Profile" tab. Designed for Phase 2: Travel Awareness is background infra feeding World Map, not a new tab. |
| Mar 17 | Defer Live Activities to post-approval | Can't start from background without APNs push infra. Risk/complexity not worth it — travel detection + geofencing + auto-map is already a strong native story. |
| Mar 17 | Visit history stored locally only (UserDefaults) | No server storage of location data. Aligns with "no accounts, no personal data" pillar. Avoids privacy liability Apple would scrutinize. Future: iCloud sync via CloudKit if needed. |
| Mar 17 | Three-color pin scheme for World Map | Blue = physically visited (from travel detection), green = explored in-app, orange = unexplored. Travel detection auto-lights pins without user action. |
| Mar 17 | CLMonitor over deprecated CLCircularRegion | iOS 17+ async/await API, persists conditions across launches, matches our deployment target. Must use singleton pattern (duplicate name crashes). |
| Mar 17 | "Nearest 20 rotation" for geofencing | 20-region iOS limit vs 2,694 destinations. Significant location changes trigger recalculation of 20 nearest, clearing and re-registering geofences. |
| Mar 17 | Progressive permission flow | Never request location at launch. Earn trust → in-app explainer → When In Use → demonstrate value → Always. Apple expects this pattern. |
| Mar 17 | Geofence radius: 1.5km | Large enough to fire reliably (car, transit, foot), small enough to feel like "arriving." No per-city variation — data is city-level. |
| Mar 17 | Notification throttling: 6hr cooldown, 2/day cap | Once per city per trip (6hr away = new trip). Max 2 notifications/day. Never on first launch. User toggle in Profile. "Welcome back" for return visits. Handles "I live here" problem. |

---

## Key Technical Facts

- Destinations: 2,694 with tours + lat/lng shown on map (3,380 total in DB)
- Tours: 136,303/136,303 have lat/lng (backfilled from destinations)
- iOS seed DB: 123MB, bundled in app (includes destinations table + lat/lng)
- iOS deployment target: 17.0
- Xcode simulator: "iPhone 17 Pro"
- Bundle ID: com.nikhilsi.TourGraph
- GRDB.swift for SQLite, @Observable pattern

---

## Open Questions

- [x] Implementation phasing — Phase 1 (Map + Trivia) done, Phase 2 (Travel Awareness) next, Phase 3 (Polish + Resubmit)
- [x] Privacy UX for location opt-in — Progressive flow: explainer → When In Use → Always. Decided Mar 17.
- [x] How to handle graceful degradation if user denies location permission — All features work without it. Decided Mar 17.
- [ ] Haiku cost model for trivia generation + identity descriptions
- [ ] Additional data source integration depth (weather, festivals, currency)
- [ ] Should we request an App Review phone call before resubmitting?
- [x] Geofence radius — 1.5km (1500m). City-level detection, reliable for CLMonitor, matches our data granularity. Decided Mar 17.
- [x] Notification throttling — once per city per trip (6-hour cooldown), max 2/day, never on first launch, user toggle. "Welcome back" for return visits. Decided Mar 17.

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
