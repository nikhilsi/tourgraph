# src/components/ — React Components

All reusable UI components. Client components are marked with `"use client"` — everything else is a server component.

## Component Map

```
RouletteView (client)     — Core game loop: fetches hand, cycles cards
  └── TourCard            — Single tour card display
       └── ShareButton (client) — Share / clipboard copy
  └── TourCardSkeleton    — Loading placeholder

FeatureNav                — Cross-feature text navigation
```

## Files

### `RouletteView.tsx` (client)
The core interaction loop. Fetches a "hand" of ~20 tours from `/api/roulette/hand`, displays one at a time, advances on button press, and auto-fetches a new hand when exhausted.

**State management:**
- `hand` — Current batch of tours from API
- `currentIndex` — Which tour in the hand is visible
- `seenIds` — All tour IDs shown this session (capped at 200, passed as `?exclude=` on refetch)
- `loading` / `error` — Fetch lifecycle

**Safety:**
- `AbortController` cancels in-flight requests on re-fetch or unmount (prevents race conditions)
- Rapid-click guard: `handleSpin()` is a no-op while loading
- `seenIds` capped at 200 to prevent URL length explosion and SQLite variable limit

### `TourCard.tsx`
The atomic visual unit. Photo-dominant card with title, location, AI one-liner, stats (rating/price/duration), and share button.

- **Image**: 3:2 aspect ratio, Next.js `<Image>` with responsive `sizes`
- **Priority prop**: Controls eager vs lazy image loading (first card should be eager)
- **Stats row**: Only renders stats with values > 0 (avoids displaying bare "0")
- **Links**: Both photo and title link to `/roulette/[id]` detail page

### `ShareButton.tsx` (client)
Attempts Web Share API (mobile native sheet) → clipboard copy (desktop fallback).
Shows "Copied!" for 2 seconds after clipboard success. Silent failure on both — no error toast.

### `TourCardSkeleton.tsx`
Animated placeholder matching TourCard's exact layout (3:2 photo, text lines, stats row). Uses Tailwind `animate-pulse`. Dimensions must match TourCard to prevent layout shift during loading.

### `FeatureNav.tsx`
Horizontal text navigation: `roulette · right now · world's most · six degrees`. Current feature shown as highlighted text, others as links. Roulette → `/`, Right Now → `/right-now`, World's Most → `/worlds-most`. Six Degrees points to `/` (Phase 4 not built yet).
