# NOW — What To Work On Next

**Last Updated**: March 11, 2026
**Context**: See CURRENT_STATE.md for what's built, CHANGELOG.md for history

## Just Completed: Backend Extraction (v10.0.0)

Extracted all DB access into standalone Express API backend (`backend/`). Web frontend (`web/`) is now a pure API consumer via `src/lib/api.ts`. Data pipeline scripts moved to `data/`. Two PM2 processes in production. See CHANGELOG.md [10.0.0] for full details.

## Active: iOS v2 — Breaking the 4.2.2 Rejection Cycle

v1.0 rejected March 5, v1.1 rejected March 11 — both Guideline 4.2.2 (Minimum Functionality). Same boilerplate both times. Native features bolted onto a content viewer don't change Apple's perception. v2 pivots to "travel awareness companion."

**Plan + Tracker**: `docs/ios-v2-plan.md`

### Three Pillars

- **Pillar A: Travel Awareness** — passive location detection, geofenced city welcome, Live Activities
- **Pillar B: Personal World Map** — MapKit globe, explored tracking, travel identity
- **Pillar C: Daily Challenge** — trivia game, streaks, location-aware bonuses

### Phase 1a: World Map — DONE

MapKit satellite globe with 2,694 destination pins, lazy viewport loading, progressive detail by zoom level, explored tracking (green/orange), milestone toasts, location centering, stats overlay.

### Phase 1b: Daily Trivia — UP NEXT

- Prototype question formats from existing data
- Design Haiku prompt for batch question generation
- Build server endpoint + game UI + streaks

### Phase 2: Travel Awareness (after Phase 1)

- CoreLocation significant monitoring research
- Passive travel detection + auto-journal
- Geofenced city welcome notifications
- Live Activities during travel

### Phase 3: Polish + Resubmit

- Travel identity / shareable card
- Privacy opt-in UX
- Screenshots + App Store resubmission

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
