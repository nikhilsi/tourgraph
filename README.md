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
| Frontend | Next.js (React) |
| Hosting | DigitalOcean |
| Data | Viator Partner API (300,000+ experiences) |
| AI | Claude API (witty captions, Six Degrees chains) |
| Cache | Redis or SQLite |
| Domain | [tourgraph.ai](https://tourgraph.ai) |

## Background

TourGraph started as AI-powered supply-side infrastructure for the tours & experiences industry. After competitive validation revealed that Peek, TourRadar, Magpie, and Expedia had all shipped live MCP servers, the original thesis was killed and the project pivoted to this consumer experience. The Phase 0 extraction work (83 products, 7 operators, 95% accuracy) is preserved in `archive/` for reference.

Full story: [docs/thesis_validation.md](docs/thesis_validation.md)

## Project Structure

```
tourgraph/
├── CLAUDE.md              # Development rules & workflow
├── README.md              # This file
├── CURRENT_STATE.md       # What's built & status
├── NOW.md                 # Current priorities
├── CHANGELOG.md           # Version history
├── LICENSE                # MIT License
├── .env.example           # API key template
│
├── docs/
│   ├── product_brief.md   # Product vision (source of truth)
│   └── thesis_validation.md # Why we pivoted
│
└── archive/               # Phase 0 work (preserved for reference)
    ├── scripts/           # Extraction & Viator API scripts
    ├── results/           # 7 operators, 83 products, scorecards
    ├── schemas/           # OCTO extraction schema
    ├── prompts/           # Domain-specific extraction prompts
    ├── docs/              # Old strategy docs, MkDocs site content
    ├── CHANGELOG.md       # Phase 0 version history
    ├── NOW.md             # Phase 0 priorities (final state)
    └── CURRENT_STATE.md   # Phase 0 status (final state)
```

## Getting Started

```bash
# Coming soon — Next.js app not yet scaffolded
# Architecture discussion in progress
```

## License

MIT License. See [LICENSE](LICENSE) for details.
