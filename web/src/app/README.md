# src/app/ — Next.js App Router

Uses Next.js 16 App Router with React Server Components by default.

## Route Map

```
/                           → page.tsx (Tour Roulette homepage + Right Now teaser)
/roulette/[id]              → roulette/[id]/page.tsx (Tour detail)
/right-now                  → right-now/page.tsx (Right Now Somewhere)
/worlds-most                → worlds-most/page.tsx (Superlatives gallery)
/worlds-most/[slug]         → worlds-most/[slug]/page.tsx (Superlative detail)
/api/roulette/hand          → api/roulette/hand/route.ts (Hand API)
/api/og/roulette/[id]       → api/og/roulette/[id]/route.tsx (Roulette OG image)
/api/og/right-now           → api/og/right-now/route.tsx (Right Now OG image)
/api/og/worlds-most/[slug]  → api/og/worlds-most/[slug]/route.tsx (Superlative OG image)
/icon.svg                   → icon.svg (favicon)
```

## Files

### `layout.tsx` — Root Layout
Wraps all pages with HTML structure, dark mode class, global CSS, and Viator attribution footer. Sets `metadataBase` to `https://tourgraph.ai` for OG image URL resolution.

### `page.tsx` — Homepage
Renders Tour Roulette: brand header, `RouletteView` (client component), Right Now teaser (server component showing "Right now in {city}, it's {time}..."), and `FeatureNav`. The teaser links to `/right-now` and is computed server-side using golden-hour timezone logic.

### `globals.css` — Theme & Design Tokens
Dark theme via CSS custom properties consumed by Tailwind v4's `@theme` directive:
- **Background**: `#0a0a0a` (near black)
- **Accent**: `#f59e0b` (warm amber — makes photos pop on dark)
- **Text hierarchy**: primary `#fafafa` → muted `#a0a0a0` → dim `#666666`

### `error.tsx` — Error Boundary
Client component. Catches unhandled errors and shows a friendly "We hit a bump" message with retry button. Doesn't expose error details to users.

### `roulette/[id]/page.tsx` — Tour Detail Page
Server-rendered tour detail with full description, inclusions, image gallery, Viator booking link, and share button.

**Key patterns:**
- `React.cache()` deduplicates the `getTourById` call between `generateMetadata()` and the render function (same request, one DB query).
- `parseAndValidateId()` validates positive integer ≤ 2^31 before any DB access.
- `withCampaign()` appends `&campaign=roulette` to Viator affiliate URLs for tracking.
- OG metadata points to `/api/og/roulette/[id]` for dynamic branded preview images.

### `roulette/[id]/not-found.tsx` — 404 Page
Shown when `notFound()` is called (invalid or deleted tour). Links back to homepage with "Spin a New One".

### `api/roulette/hand/route.ts` — Hand API
Returns ~20 curated tours for the roulette client.

**Security:**
- In-memory rate limiting: 30 requests per 10-second window per IP.
- Exclude IDs capped at 200 (prevents URL length bomb + SQLite's 999-variable binding limit).
- Numeric validation on all IDs.

**Response shape:**
```json
{
  "hand": [{ "id": 1, "title": "...", "rating": 4.9, ... }],
  "count": 20
}
```

### `api/og/roulette/[id]/route.tsx` — OG Image Generation
Dynamic 1200x630 preview images using Next.js `ImageResponse` (Satori rendering).

**Visual layers (bottom to top):**
1. Tour photo (full bleed)
2. Dark gradient overlay (0.1 → 0.3 → 0.85 opacity) for text readability
3. Content: "Tour Roulette" badge, title, location, stats, "tourgraph.ai" watermark

Uses plain `<img>` tags (not Next.js Image) because Satori doesn't support React components.

### `right-now/page.tsx` — Right Now Somewhere (Phase 2)
Server component showing 6 tours from golden-hour timezones. `force-dynamic` for fresh time data on each request.

**How it works:**
1. `getDistinctTimezones()` gets all IANA timezones from active tours
2. `getGoldenTimezones()` filters to sunrise (6-8) and golden hour (16-18)
3. `getPleasantTimezones()` provides fallback daytime hours (9-15) if golden hours are empty
4. `getRightNowTours()` picks one quality tour per timezone, randomized
5. Each card shows local time, time-of-day label, destination, tour photo + title + stats

Links to `/roulette/[id]` for tour details (reuses existing detail page). Full OG metadata points to `/api/og/right-now`.

### `worlds-most/page.tsx` — Superlatives Gallery (Phase 3)
Server component showing 6 superlative cards (most expensive, cheapest 5-star, longest, shortest, most reviewed, hidden gem). Each card shows the superlative title, key stat, tour photo, title, and destination. Links to `/worlds-most/[slug]`.

### `worlds-most/[slug]/page.tsx` — Superlative Detail (Phase 3)
Server-rendered detail page for each superlative. Same pattern as `/roulette/[id]` — `React.cache()` for dedup, full tour info, Viator booking link with `campaign=worlds-most`, share button. `generateStaticParams()` for all 6 slugs. Validates slug against known types, returns 404 for invalid ones.

### `worlds-most/[slug]/not-found.tsx` — 404 for Invalid Superlatives
Shown when slug doesn't match any of the 6 known superlative types.

### `api/og/right-now/route.tsx` — Right Now OG Image (Phase 2)
Dynamic 1200x630 preview for the Right Now feature page. Picks one golden-hour tour and composites with "Right Now Somewhere..." badge + time overlay.

### `api/og/worlds-most/[slug]/route.tsx` — Superlative OG Images (Phase 3)
Dynamic 1200x630 previews for each superlative. Shows superlative title, large stat in accent color, tour photo + title + location. Validates slug, returns 404 for invalid types.
