# src/app/ — Next.js App Router

Uses Next.js 16 App Router with React Server Components by default.

## Route Map

```
/                           → page.tsx (Tour Roulette homepage)
/roulette/[id]              → roulette/[id]/page.tsx (Tour detail)
/api/roulette/hand          → api/roulette/hand/route.ts (Hand API)
/api/og/roulette/[id]       → api/og/roulette/[id]/route.tsx (OG image)
/icon.svg                   → icon.svg (favicon)
```

## Files

### `layout.tsx` — Root Layout
Wraps all pages with HTML structure, dark mode class, global CSS, and Viator attribution footer. Sets `metadataBase` to `https://tourgraph.ai` for OG image URL resolution.

### `page.tsx` — Homepage
Renders Tour Roulette: brand header, `RouletteView` (client component), and `FeatureNav`. Minimal server component — delegates interactivity to client.

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
