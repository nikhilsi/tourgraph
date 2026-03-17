# NOW — What To Work On Next

**Last Updated**: March 17, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Active: iOS v2 — Breaking the 4.2.2 Rejection Cycle

v1.0 rejected March 5, v1.1 rejected March 11 — both Guideline 4.2.2 (Minimum Functionality). Same boilerplate both times. Native features bolted onto a content viewer don't change Apple's perception. v2 pivots to "travel awareness companion."

**Plan + Tracker**: `docs/ios-v2-plan.md`

### Three Pillars

- **Pillar A: Travel Awareness** — passive location detection, geofenced city welcome, Live Activities
- **Pillar B: Personal World Map** — MapKit globe, explored tracking, travel identity
- **Pillar C: Daily Challenge** — trivia game, streaks, location-aware bonuses

### Phase 1a: World Map — DONE

MapKit satellite globe with 2,694 destination pins, lazy viewport loading, progressive detail by zoom level, explored tracking (green/orange), milestone toasts, location centering, stats overlay.

### Phase 1b: Daily Trivia — DONE

**Design doc**: `docs/trivia-prototype.md`

**Game structure**: Daily Challenge (5 questions, same for everyone, Wordle model) + Practice Mode (unlimited). 7 question formats rotating across days. Anonymous scoring with regional comparison (IP-derived country via nginx GeoIP2).

**7 question formats:**

1. Higher or Lower (Price) — two tours, guess which costs more
2. Where in the World? — one-liner shown, pick city from 4, photo revealed after
3. Real or Fake Tour? — one real title, one Haiku-generated fake
4. The Numbers Game — surprising stats as multiple choice
5. Odd One Out — 3 tours same city + 1 intruder, using one-liners (not titles)
6. The Connection — which theme links two cities (from chain data)
7. City Personality Match — match AI personality to city (from city_profiles)

**Architecture**: Pre-generate large question pool (one-time batch). Lazy daily assembly: first API request for a date picks 5 from pool, writes to `trivia_daily`, everyone gets those 5. No cron jobs, self-healing.

**Gamification**: Streaks (3/7/14/30/60/100 day badges), Travel IQ (levels from Tourist to World Expert), category mastery tracking, feeds into World Map (Pillar B — trivia knowledge as third map layer), shareable results + answer cards.

**Steps:**

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Prototype question formats | **Done** | 7 formats, 18 sample questions, evaluated in `docs/trivia-prototype.md` |
| 2a | SQL generators for 6 formats | **Done** | `data/scripts/5-trivia/generate-pool.ts` — 1,035 questions across 6 formats |
| 2b | Haiku batch for fake tour titles | **Done** | `data/scripts/5-trivia/generate-fakes.ts` — 200 real_or_fake questions via Haiku |
| 2c | DB schema + pool generation script | **Done** | 3 tables (trivia_pool, trivia_daily, trivia_scores) + 1,235 total pool questions |
| 2d | GeoIP2 setup on droplet | **Done** | `libnginx-mod-http-geoip2` + GeoLite2-Country.mmdb + `X-Country-Code` header. Same pattern as ScreenTrades. |
| 3 | Backend API endpoints | **Done** | `backend/src/routes/trivia.ts` — daily, answer, results, score, stats, practice. Lazy daily assembly. |
| 4 | iOS game UI + streaks + sharing | **Done** | Daily challenge, practice mode, results screen, streaks/Travel IQ. Smoke tested on device. |
| 5 | Tab restructure (5-tab layout) | **Done** | 5 tabs: Roulette, Discover (RN+WM+SD), World Map, Trivia, Profile. Deep links/intents/widgets preserved. |

### Phase 2: Travel Awareness — DONE

The app is alive when it's closed. Significant location changes + CLMonitor geofencing detect city arrivals, send welcome notifications, auto-light World Map pins blue. All data local. Progressive permission flow. Map auto-follows location. Tested on device with simulated locations.

Full architecture in `docs/ios-v2-plan.md`.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | `TravelAwarenessService` — CLLocationManager + CLMonitor | **Done** | Singleton, @Observable, manages permissions + geofence rotation |
| 2 | Permission flow UI — explainer + progressive auth | **Done** | NearbyAlertsExplainer sheet, WIU → Always escalation after first detection |
| 3 | Significant location change → nearest-20 geofences | **Done** | Bounding-box pre-filter + distance sort, debug-mode continuous updates |
| 4 | Geofence entry → city welcome notification | **Done** | Foreground banner support, 6hr cooldown, 2/day cap, "Welcome back" for returns |
| 5 | CityVisit model + UserDefaults persistence | **Done** | Cached visitedDestinationIds, separate notification-sent counter |
| 6 | World Map — third pin color (physically visited = blue) | **Done** | Blue/green/orange pin scheme, visited count in stats overlay |
| 7 | Profile tab — travel journal + nearby alerts toggle | **Done** | Recent visits with dates, return badges, toggle in Preferences |
| 8 | Info.plist + entitlements + background modes | **Done** | Both purpose strings, UIBackgroundModes location |
| 9 | Map auto-follow + single location manager | **Done** | Removed redundant MapLocationManager, map re-centers on >1km movement |

### Phase 3: Polish + Resubmit

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Travel identity / shareable card | Not Started | Evolving archetype from visits + favorites + trivia |
| 2 | Full QA pass | Not Started | Every tab, deep link, intent, widget |
| 3 | App Store screenshots + preview video | Not Started | Show Map, Trivia, Discover, city welcome |
| 4 | App Review notes — feature walkthrough | Not Started | Explain native integrations, how to test background location |
| 5 | Resubmit to App Store | Not Started | v2.0 |

## Waiting

### F-Droid Review

Submitted [MR #34392](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/34392). AutoUpdateMode configured.

## Future

- Weekly data refresh + delta sync to mobile apps
- On-demand chain generation (user types two cities)
- iPad layout
- City discovery pages
- Theme browsing
- Android v2 feature parity
- Backend language migration (Python/Go) — structure already supports it
