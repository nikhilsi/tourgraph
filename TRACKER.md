# Implementation Tracker — iOS v2

---
**Purpose**: Live progress tracker. Updated by Claude Code during implementation. Read this file after any context compaction to restore state.
**Plan**: `docs/ios-v2-plan.md` — the full v2 plan with 3 pillars, 10 ideas evaluated, architecture
**Role**: Partner-level architect. Think critically, don't rush, challenge bad ideas, maintain quality bar.
---

## Current Phase: 1b — Daily Trivia

### Context
Apple rejected iOS v1.0 and v1.1 under Guideline 4.2.2 (Minimum Functionality). Both times same boilerplate — "content aggregated from the Internet." Adding widgets/Siri/Spotlight wasn't enough. v2 pivots to "travel awareness companion" — three pillars: Travel Awareness (location), Personal World Map, Daily Trivia. Phase 1a has zero research blockers, so we start here.

### Steps — Phase 1a

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Backfill tours.latitude/longitude from destinations table | **Done** | 136,303 tours updated from destinations join |
| 2 | Rebuild iOS seed DB with lat/lng populated | **Done** | 123MB, kept destinations table + lat/lng |
| 3 | MapKit globe view in iOS app | **Done** | Satellite imagery style, annotation-based pins |
| 4 | Pin clustering at zoom levels | **Done** | Size-based pins (7-18px based on tour count) |
| 5 | "Explored" tracking (tap = explored, glow change) | **Done** | ExploredDestinations (UserDefaults), green=explored, orange=unexplored |
| 6 | Map as new tab or accessible view | **Done** | 5th tab "World Map" with globe icon |
| 7 | Stats overlay ("47 of 3,380 destinations explored") | **Done** | Bottom-left overlay with .ultraThinMaterial |

### Steps — Phase 1b (parallel — trivia research)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Prototype 20-30 questions by hand | Not Started | Find formats that spark joy |
| 2 | Design Haiku prompt for question generation | Not Started | |
| 3 | Build server endpoint for daily questions | Not Started | |
| 4 | Game UI + streaks | Not Started | |

### Steps — Phase 2 (after Phase 1)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | CoreLocation research spike | Not Started | Significant monitoring, geofencing limits |
| 2 | Passive travel detection | Not Started | |
| 3 | Geofenced city welcome | Not Started | |
| 4 | Live Activities | Not Started | |

### Steps — Phase 3 (polish)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Travel identity / shareable card | Not Started | |
| 2 | Privacy opt-in UX | Not Started | |
| 3 | Screenshots + resubmit | Not Started | |

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 11 | Skip AR for v2 | City-level coords too imprecise, would feel gimmicky |
| Mar 11 | Skip HealthKit | Forced connection, doesn't serve core vision |
| Mar 11 | Skip collaborative/SharePlay | Needs 2 people, Apple tests solo |
| Mar 11 | Start with Phase 1a (map) | Zero research blockers, high visual impact |
| Mar 11 | Phase 1 might be enough to pass Apple | Map + trivia fundamentally changes what the app is |

## Key Technical Facts

- Destinations: 2,694 with tours + lat/lng shown on map (3,380 total in DB)
- Tours: 136,303/136,303 have lat/lng (backfilled from destinations)
- iOS seed DB: 123MB, bundled in app (includes destinations table + lat/lng)
- iOS deployment target: 17.0
- Xcode simulator: "iPhone 17 Pro"
- Bundle ID: com.nikhilsi.TourGraph
- GRDB.swift for SQLite, @Observable pattern
