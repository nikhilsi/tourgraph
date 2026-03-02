# Six Degrees Chain Generation

---
**Created**: March 2, 2026
**Status**: Architecture locked — ready for implementation
**Depends on**: `docs/city-intelligence.md` (Stage 0 / city profiles), `docs/data-schema.md` (DB schema)
**Research**: `docs/reference/phase4-six-degrees.md` (early research, UI spec, test results)
---

## What This Doc Covers

How we generate thematic chains connecting cities around the world — the "graph" in TourGraph. Covers Stages 1 and 2 of the three-stage pipeline, plus pair selection, quality standards, and gallery UX.

For Stage 0 (city intelligence) and the data model, see `docs/city-intelligence.md`.

---

## How Chains Work

### Data Structure

Each chain is 5 stops connecting two endpoint cities through 3 intermediate cities, stored in the `six_degrees_chains` table.

**Per-chain AI-generated content:**
- `summary` — One-line overview (under 120 chars, used on share cards)

**Per-node AI-generated content:**
- `connection_to_next` — Witty 1-2 sentence bridge to the next city (null for last stop)
- `theme` — Theme of the connection between adjacent cities (e.g., "craftsmanship", "sacred")

**Per-node from DB (looked up at render time via `tour_id`):**
- Tour photo, title, rating, price, duration, one-liner

**JSON structure:**
```json
{
  "city_from": "Tokyo",
  "city_to": "Buenos Aires",
  "chain": [
    {
      "city": "Tokyo",
      "country": "Japan",
      "tour_title": "Tokyo Sushi Making Class: Sake Ceremony & Matcha Experience",
      "tour_id": 2376,
      "connection_to_next": "From rolling sushi with sake ceremonies in Tokyo, we follow the thread of fermented grain spirits eastward...",
      "theme": "wine/spirits"
    },
    { "city": "...", "..." : "3 more intermediate stops" },
    {
      "city": "Buenos Aires",
      "country": "Argentina",
      "tour_title": "Private Photography Tour in Buenos Aires",
      "tour_id": 8514,
      "connection_to_next": null,
      "theme": "photography"
    }
  ],
  "summary": "From sake ceremonies to tango halls, through alpine trails and Adriatic craft — one world, five stops."
}
```

### What the User Sees

**Gallery page (`/six-degrees`):**
- Curated groupings (like World's Most superlatives pattern), not a flat list of 500 cards
- "Surprise Me" button draws from the full chain pool
- Categories TBD (by continent pair? by theme? editor's picks?)

**Detail page (`/six-degrees/[slug]`):**
- Vertical timeline with numbered circle nodes
- Each node: city label, tour card (photo + title + one-liner + stats), theme badge, connection text
- Share button with OG preview

---

## Three-Stage Generation Pipeline

Chain generation uses a three-stage pipeline where each stage does what it's best at.

| Stage | Name | What it does | Input | Output | Where |
|-------|------|-------------|-------|--------|-------|
| **0** | City Curator | Understands each city | All tours per city | City profile (personality, standout tours, themes) | `docs/city-intelligence.md` |
| **1** | City Picker | Selects intermediate cities | All 910 city profiles (~190K tokens) | 3 intermediate cities per pair | This doc |
| **2** | Chain Builder | Builds the chain | Detailed tours for 5 selected cities | Full chain JSON | This doc |

Stage 0 runs once (builds the `city_profiles` table). Stages 1+2 run per chain.

### Stage 1 — City Picker

**Goal:** For a given endpoint pair (e.g., Tokyo → Buenos Aires), select 3 intermediate cities that maximize cultural distance, thematic surprise, and geographic diversity.

**Input (~190K tokens):**
- System prompt with selection rules (~2K tokens)
- All 910 city profiles from `city_profiles` table (~188K tokens):
  - City name, country, continent, tour count
  - AI personality line
  - 5 standout tours with one-liners and themes
  - AI-curated theme tags

**Why this fits:** 910 cities × 5 standout tours with one-liners = ~186K tokens. Plus system prompt and output buffer = ~195K total. Within the 200K context window.

**Output:** 3 intermediate city names with reasoning.

**Key design principle:** Claude sees the *entire* landscape of 910 cities. No artificial constraints on which cities can be intermediates. The intermediate cities don't need to be in the curated endpoint pool — they can be any of the 910 cities. This is what enables truly surprising chains through places like Ulaanbaatar, Ohrid, or Takayama.

**Prompt approach:**
```
Given the city profiles below, select 3 intermediate cities to connect
[CityA] to [CityB] in a 5-stop chain. Optimize for:
1. Cultural distance between adjacent stops
2. Thematic surprise — connections that make someone think "oh wow, I see it!"
3. Geographic diversity — spread across continents, no clustering
4. At least one "wait, that city?" surprise stop

Return JSON: {"intermediates": ["City1", "City2", "City3"], "reasoning": "..."}
```

### Stage 2 — Chain Builder

**Goal:** Given the 5 cities (2 endpoints + 3 intermediates from Stage 1), build the actual chain with specific tours, thematic connections, and a summary.

**Input (~15-20K tokens):**
- System prompt with chain rules (~2K tokens)
- Detailed tours for each of the 5 cities: 30 tours per city with title, one-liner, rating, reviews, price, duration (~3K per city × 5 = ~15K tokens)

**Output:** Full chain JSON (see data structure above).

**Tour selection per city:** Top 15 by rating + 15 random — same mixed approach as the v3 prompt in `generate-chains.ts`. Ensures both proven quality and quirky finds.

**Prompt (v3, refined):** System prompt emphasizes:
- Theme = connection between cities, not what the tour itself is about
- Prefer surprising, lesser-known tours over generic popular ones
- Each tour has a one-liner — use it to understand the tour's real personality
- Summary under 120 characters (for share cards)
- 5 unique cities, 4 unique themes, no same-country clustering

### Caching & Batch Strategy

**Stage 1:** The system prompt containing all 910 city profiles is identical across all 500 calls → cacheable. Use prompt caching with `cache_control: {"type": "ephemeral", "ttl": "1h"}`. Can submit all 500 via Batch API for 50% cost reduction.

**Stage 2:** Each call has different city data (specific to the 5 selected cities) → not cacheable across calls. The system prompt (rules only, ~2K tokens) is cacheable. Can also batch.

**Claude API features used:**
- **Batch API** — 50% cost reduction, async processing (~1 hour for 500 requests)
- **Prompt caching** — 90% input cost reduction on cached content (Stage 1 system prompt)
- **Files API** (optional) — Upload city profiles as persistent file, reference by `file_id`

---

## Endpoint Pool & Pair Selection

### Endpoint Pool (~100 curated cities)

Endpoints are the "A" and "B" in "A → ... → B." These are the cities we generate chain pairs for. The pool should mix three types:

**Anchors (~25-30)** — Cities everyone recognizes.
Examples: Tokyo, Rome, Paris, London, NYC, Istanbul, Barcelona, Bangkok, Marrakech, Sydney

**Gems (~30-40)** — Aspirational destinations that evoke wanderlust.
Examples: Dubrovnik, Chiang Mai, Medellín, Siem Reap, Queenstown, Budapest, Tbilisi, Hoi An

**Surprises (~20-30)** — Small cities that make people go "wait, THAT exists?"
Examples: Takayama, Asheville, Gozo, Ulaanbaatar, Ohrid, St Kitts, Addis Ababa

**Important distinction:** The endpoint pool constrains which *pairs* we generate. It does NOT constrain intermediates — Claude can route through any of the 910 cities in Stage 1.

**Curation approach:** Use city profiles from Stage 0 (personality lines, themes, standout tours) to inform selection, not raw keyword matching.

### Pair Selection Rules

1. **Cross-continent mandatory** — Endpoints must be on different continents
2. **No same-country** — Dallas↔Austin is meaningless
3. **Cultural distance over geographic distance** — Istanbul↔Kyoto > Istanbul↔Athens
4. **Mix city sizes** — Anchor↔Surprise pairs are often the most delightful
5. **Balanced distribution** — Each city in 8-12 chains, not 2 for some and 30 for others
6. **Thematic diversity** — The full set shouldn't all be food chains

### Pair Generation

Math: 100 cities × ~10 chains each ÷ 2 endpoints per chain = ~500 chains.

Script (`src/scripts/generate-pairs.ts`) creates pairs from the pool following the rules above. Output: `src/scripts/chain-pairs.json`.

---

## Chain Count Tiers

| Tier | City pool | Chains | Per city | Time | Feel |
|------|-----------|--------|----------|------|------|
| **Launch** | ~100 cities | ~500 | ~10 | ~1 hr | Abundant. "Surprise Me" stays fresh for days. |
| Growth | ~150 cities | ~1,000 | ~13 | ~2 hrs | Deep rabbit hole. Hard to see the same chain twice. |
| Full | ~250+ cities | ~2,000+ | ~16 | ~4+ hrs | Inexhaustible. |

**Decision:** Start with ~500 for launch. Evaluate quality and user experience, then expand.

---

## Quality Checklist

**Great chains have:**
- [ ] 5 stops across genuinely different cities (no same-country clusters)
- [ ] 4 distinct themes that feel surprising, not forced
- [ ] `connection_to_next` text that makes you go "oh, I see it!" — warm and narrative
- [ ] At least one intermediate stop that surprises ("wait, that city?")
- [ ] A `summary` that works as a standalone shareable sentence (under 120 chars)
- [ ] Tours that embody the thematic connection (not generic popular tours)

**Red flags:**
- Same continent for all 5 stops
- Theme doesn't match the actual tour
- Generic connection text ("both cities have tours")
- All mega-cities, no surprises
- Tour titles that are pure SEO gibberish

---

## Gallery UX Design

**Current state:** Flat list of all chain cards. Not viable at 500 chains.

**Target:** Curated display following the World's Most superlatives pattern — groupings with one representative chain per group, plus "Surprise Me" from the full pool.

**Open question:** What are the groupings?
- By continent pair (Asia↔Europe, Americas↔Africa, ...)?
- By dominant theme (food chains, sacred chains, nature chains)?
- Editor's picks (hand-curated "best of")?
- Some combination?

This needs design thinking after we have actual chain data to work with.

---

## UI Enhancement: One-Liners on Chain Detail

Currently the chain detail page shows per node: city, tour photo, tour title, stats, theme badge, connection text.

**Missing:** The tour's one-liner. Every tour has one (100% coverage). These are the personality-filled captions that make Tour Roulette delightful. Adding them to chain nodes makes each stop its own moment of delight.

**Implementation:** Small code change — data already available via `getTourById()`.
- Web: `src/app/six-degrees/[slug]/page.tsx`
- iOS: `ChainDetailView.swift`

---

## Decisions Made

- [x] **Three-stage pipeline** — Stage 0 (city intelligence) → Stage 1 (city picker) → Stage 2 (chain builder). Each stage optimized for its job.
- [x] **Intermediates unconstrained** — Claude sees all 910 cities in Stage 1. No artificial limits on which cities can appear as intermediate stops.
- [x] **Batch API + prompt caching** — For quality (full context) and efficiency. Architecture driven by quality, not cost.
- [x] **Chain count** — ~500 for launch, evaluate then expand.
- [x] **Gallery UX** — Curated display (superlatives pattern), not a wall of cards.
- [x] **One-liner on chain detail** — Yes, both web and iOS.
- [x] **v3 prompt refinements** — One-liner context, mixed tour selection, surprise bias, theme clarity, 120-char summary.

## Open Decisions

- [ ] **Endpoint pool composition** — Which ~100 cities? Informed by Stage 0 city profiles.
- [ ] **Gallery categories** — By continent pair? By theme? Editor's picks?
- [ ] **Batch vs. sequential** — Batch faster but variable cache hits. Sequential slower but near-100% hits.

---

## Reference

| What | Where |
|------|-------|
| City intelligence (Stage 0) | `docs/city-intelligence.md` |
| Research & UI spec | `docs/reference/phase4-six-degrees.md` |
| Current generator (v1) | `src/scripts/generate-chains.ts` |
| Test chain outputs | `data/chain-tests/` |
| Current pair config | `src/scripts/chain-pairs.json` |
| DB schema | `docs/data-schema.md` |
| Gallery page | `src/app/six-degrees/page.tsx` |
| Detail page | `src/app/six-degrees/[slug]/page.tsx` |
| DB queries | `src/lib/db.ts` |
| Data baseline | `docs/data-snapshot.md` |
