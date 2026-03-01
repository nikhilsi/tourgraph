# TourGraph

A zero-friction site and iOS app that makes people smile using the world's tour data. Discover the weirdest, most wonderful, and most surprising experiences on Earth — one random spin at a time.

## What Is This?

TourGraph surfaces delightful, surprising tours and experiences from around the world. No accounts, no algorithms, no planning tools. Just pure discovery and serendipity.

**Four features:**

- **Tour Roulette** — One button. Random tour. Weighted toward the extremes: highest rated, weirdest, cheapest, most expensive. AI-generated witty one-liner. Press again.
- **Right Now Somewhere...** — Time-zone-aware. Shows a tour happening right now in a place where it's currently beautiful. "Right now in Kyoto it's 6:47am and you could be doing forest bathing with a Buddhist monk. 4.9 stars."
- **The World's Most ___** — Daily superlatives from 300,000+ experiences. Most expensive tour. Cheapest 5-star. Longest duration. Each one a shareable card.
- **Six Degrees of Anywhere** — Type two cities. Get a chain of tours connecting them through surprising thematic links. The graph in TourGraph.

## Design Philosophy

Every decision passes four tests:

1. **Zero Friction** — No signup, no login, no personal data. Delighted in 5 seconds.
2. **Instant Smile** — Warm, witty, wonder-filled. Never snarky or cynical.
3. **Effortlessly Shareable** — Every piece of content has a unique URL and beautiful link preview.
4. **Rabbit Hole Energy** — "One more click" through genuine curiosity, not dark patterns.

## Tech Stack

| Component | Choice |
|-----------|--------|
| Frontend | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 |
| Database | SQLite (better-sqlite3) |
| Hosting | DigitalOcean |
| Data | Viator Partner API (300,000+ experiences) |
| AI | Claude API (Haiku 4.5 for captions, Sonnet 4.6 for chains) |
| Domain | [tourgraph.ai](https://tourgraph.ai) |

## Getting Started

```bash
node --version          # 18+ required
npm install             # Install dependencies
cp .env.example .env.local  # Add your API keys

# Seed destinations from Viator API
npx tsx src/scripts/seed-destinations.ts

# Index tours (single destination)
npx tsx src/scripts/indexer.ts --dest 704

# Or seed a diverse dataset
npx tsx src/scripts/seed-dev-data.ts --no-ai

# Start dev server
npm run dev             # http://localhost:3000
```

## Project Structure

```
tourgraph/
├── CLAUDE.md                 # Development rules & workflow
├── README.md                 # This file
├── CURRENT_STATE.md          # What's built & status
├── NOW.md                    # Current priorities
├── CHANGELOG.md              # Version history
├── .env.example              # API key template
│
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout (dark theme)
│   │   ├── page.tsx          # Homepage — Roulette + Right Now teaser
│   │   ├── globals.css       # Tailwind + theme tokens
│   │   ├── roulette/[id]/    # Tour detail page
│   │   ├── right-now/        # Right Now Somewhere (Phase 2)
│   │   ├── worlds-most/      # Superlatives gallery (Phase 3)
│   │   ├── worlds-most/[slug]/ # Superlative detail (Phase 3)
│   │   ├── api/roulette/hand/  # Hand API endpoint
│   │   ├── api/og/roulette/[id]/ # Roulette OG images
│   │   ├── api/og/right-now/    # Right Now OG image
│   │   └── api/og/worlds-most/[slug]/ # Superlative OG images
│   ├── components/
│   │   ├── TourCard.tsx      # Photo-dominant tour card
│   │   ├── RouletteView.tsx  # Interactive spin + hand cycling
│   │   ├── ShareButton.tsx   # Web Share API + clipboard
│   │   ├── TourCardSkeleton.tsx
│   │   └── FeatureNav.tsx    # Cross-feature navigation
│   ├── lib/
│   │   ├── types.ts          # All TypeScript types
│   │   ├── db.ts             # SQLite layer + all queries
│   │   ├── timezone.ts       # Timezone helpers (Phase 2)
│   │   ├── format.ts         # Shared formatting (price, duration)
│   │   ├── viator.ts         # Viator API client
│   │   ├── claude.ts         # Claude API (one-liners)
│   │   └── continents.ts     # Continent lookup from Viator hierarchy
│   └── scripts/
│       ├── indexer.ts        # Drip + Delta indexer
│       ├── seed-dev-data.ts  # Seeds 43 destinations
│       ├── seed-destinations.ts
│       └── backfill-oneliners.ts # Batch AI one-liner generation
│
├── docs/
│   ├── product_brief.md      # Product vision (source of truth)
│   ├── ux_design.md          # UX design, wireframes, interaction patterns
│   ├── architecture.md       # Technical architecture, schema, indexer design
│   ├── implementation_plan.md # Phase 1-3 build plan
│   ├── viator-api-reference.md # Basic-tier API endpoint summary
│   ├── viator-openapi.json   # Full Viator OpenAPI 3.0 spec
│   └── thesis_validation.md  # Why we pivoted
│
├── data/                     # SQLite database (gitignored)
│
└── archive/                  # Phase 0 work (preserved for reference)
    ├── scripts/              # Extraction & Viator API scripts
    ├── results/              # 7 operators, 83 products, scorecards
    └── docs/                 # Old strategy docs
```

## Background

TourGraph started as AI-powered supply-side infrastructure for the tours & experiences industry. After competitive validation revealed that Peek, TourRadar, Magpie, and Expedia had all shipped live MCP servers, the original thesis was killed and the project pivoted to this consumer experience. The Phase 0 extraction work (83 products, 7 operators, 95% accuracy) is preserved in `archive/` for reference.

Full story: [docs/thesis_validation.md](docs/thesis_validation.md)

## License

MIT License. See [LICENSE](LICENSE) for details.
