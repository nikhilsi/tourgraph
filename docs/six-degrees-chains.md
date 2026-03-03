# Six Degrees Chain Generation

---
**Created**: March 2, 2026
**Updated**: March 3, 2026
**Status**: Complete — 491 chains generated, gallery redesigned as chain roulette
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

**Gallery page (`/six-degrees`):** Chain roulette — one random chain displayed with full inline timeline (same visual as detail page). "Surprise Me" button loads another random chain. No categories, no filtering, no click-through needed. The gallery page IS the experience.

**Detail page (`/six-degrees/[slug]`):** Same vertical timeline, used for direct/shared links. Vertical timeline with numbered circle nodes. Each node: city label, tour card (photo + title + one-liner + stats), theme badge, connection text. Share button with OG preview.

---

## Three-Stage Generation Pipeline

Chain generation uses a three-stage pipeline where each stage does what it's best at.

| Stage | Name | What it does | Input | Output | Where |
|-------|------|-------------|-------|--------|-------|
| **0** | City Curator | Understands each city | All tours per city | City profile (personality, standout tours, themes) | `docs/city-intelligence.md` |
| **1** | City Picker | Selects intermediate cities | All 910 city profiles (~125K tokens) | 3 intermediate cities per pair | This doc |
| **2** | Chain Builder | Builds the chain | Detailed tours for 5 selected cities | Full chain JSON | This doc |

Stage 0 runs once (builds the `city_profiles` table). Stages 1+2 run per chain.

### Stage 1 — City Picker

**Goal:** For a given endpoint pair (e.g., Tokyo → Buenos Aires), select 3 intermediate cities that maximize cultural distance, thematic surprise, and geographic diversity.

**Input (~125K tokens):**
- System prompt with selection rules (~2K tokens)
- All 910 city profiles from `city_profiles` table in compact format (~123K tokens):
  - City name, country, continent, tour count
  - AI personality line
  - 3 standout tours per city with 60-char truncated reasons
  - AI-curated theme tags

**Why this fits:** 910 cities in compact format (3 standout tours, 60-char reasons) = ~499K chars → ~125K tokens. Plus system prompt rules (~2K tokens) and output buffer. Within the 200K context window.

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

Script (`src/scripts/4-chains/generate-pairs.ts`) creates pairs from the pool following the rules above. Output: `src/scripts/4-chains/chain-pairs.json`.

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

**Implemented:** Chain roulette — single random chain with full inline timeline + "Surprise Me" to refresh. Same pattern as Tour Roulette (the app's core loop). Gallery page IS the experience, no click-through needed.

**Design evolution:** Initially planned as 5-6 theme-based category cards (Sacred Journeys, Rhythm & Movement, etc.), but simplified to single-chain roulette after realizing categories add cognitive overhead. User preference: "a few chains, not 8-10. Few allows the user to focus. Too much is a distraction." Taken further: why not just one, with refresh?

**How it works:**
- Web (`/six-degrees`): Server component picks one random chain, renders full timeline inline. "Surprise Me" calls `router.refresh()` to re-render with a new random chain.
- iOS: `SixDegreesSection` loads all chains, picks random one, renders timeline inline. "Surprise Me" calls `pickRandom()`.
- Detail page (`/six-degrees/[slug]`) still exists for shared/direct links.

### Data Analysis Reference (March 3, 2026)

**Theme distribution (top 10):** markets/bazaars (234), craftsmanship (205), sacred spaces (182), cuisine (174), dark tourism (173), music (154), dance (140), photography (121), meditation/wellness (120), wine/spirits (117). 20 themes total.

**Continent pairs (top 5):** Asia↔Europe (82), Africa↔Europe (62), Europe↔South America (62), Asia↔South America (36), Europe↔North America (35).

**Top intermediate hubs:** Addis Ababa (195/491 = 40%), Varanasi (166 = 34%), Dakar (155 = 32%), Cartagena (113), Accra (108), Zanzibar City (107).

**Continents per chain:** 2 (22%), 3 (51%), 4 (25%), 5 (3%). Average 3.08.

**146 unique cities** appear across all chains. 785 unique tours referenced (0.6% of catalog). Summary quality: avg 104 chars, range 81-136.

---

## UI Enhancement: One-Liners on Chain Detail

Currently the chain detail page shows per node: city, tour photo, tour title, stats, theme badge, connection text.

**Missing:** The tour's one-liner. Every tour has one (100% coverage). These are the personality-filled captions that make Tour Roulette delightful. Adding them to chain nodes makes each stop its own moment of delight.

**Implementation:** Small code change — data already available via `getTourById()`.
- Web: `src/app/six-degrees/[slug]/page.tsx`
- iOS: `ChainDetailView.swift`

---

## Generation Results

**Full run (March 3, 2026):**

| Metric | Value |
|--------|-------|
| Total pairs | 500 |
| Chains generated (first pass) | 453 (90.6%) |
| Stage 1 failures | 34 (19 invalid city names, 15 JSON parse errors) |
| Stage 2 failures | 16 (7 duplicate themes, 6 JSON parse errors, 3 duplicate cities) |
| Retry pass | 50 pairs resubmitted with improved JSON parser |
| Batch API cost | ~$20 estimated |

**Common failure patterns:**
- "Havana" hallucinated 7 times (not in our 910-city DB)
- "Bali" hallucinated 3 times (we have "Ubud" not "Bali")
- "craftsmanship" most frequently duplicated theme
- JSON parse errors: Claude added explanatory text after valid JSON — fixed with robust parser

**Batch IDs (Anthropic portal):**
- Stage 1 test: `msgbatch_013B25p6Nkmh46NEkDErRmFH` (20/20)
- Stage 2 test: `msgbatch_01C4z3cBsrowHfuzAZhJRDgR` (20/20)
- Stage 1 full: `msgbatch_01Ru73vyj5gv2MuJJhef8TDP` (482/482)
- Stage 2 full: `msgbatch_01MYDG4BWgkDfT6jfE8m2qE5` (448/448)

---

## Decisions Made

- [x] **Three-stage pipeline** — Stage 0 (city intelligence) → Stage 1 (city picker) → Stage 2 (chain builder). Each stage optimized for its job.
- [x] **Intermediates unconstrained** — Claude sees all 910 cities in Stage 1. No artificial limits on which cities can appear as intermediate stops.
- [x] **Batch API + prompt caching** — For quality (full context) and efficiency. Architecture driven by quality, not cost.
- [x] **Chain count** — ~500 for launch, evaluate then expand.
- [x] **Gallery UX** — Chain roulette: single random chain with full inline timeline + "Surprise Me" to refresh. Simpler than the initially planned 6-category approach.
- [x] **One-liner on chain detail** — Yes, both web and iOS.
- [x] **v3 prompt refinements** — One-liner context, mixed tour selection, surprise bias, theme clarity, 120-char summary.
- [x] **Endpoint pool composition** — 100 cities (30 anchors, 40 gems, 30 surprises) in `city-pool.json`. AI-curated + manually rebalanced.
- [x] **Pair selection** — 500 pairs in `chain-pairs.json`. Scored greedy algorithm (Jaccard theme distance + tier mixing).
- [x] **Two-stage pipeline** — `generate-chains-v2.ts`. Stage 1 system prompt: ~125K tokens (910 city profiles), cached. Batch API for both stages.
- [x] **Batch mode** — Batch API for full runs (~40 min Stage 1, ~1 hr Stage 2). Prompt caching confirmed on Stage 1.

## Open Decisions

- [x] **Gallery design** — Chain roulette (single random chain + refresh). Evolved from 6-category plan to simpler single-chain pattern. See Gallery UX Design section above.

---

## Reference

| What | Where |
|------|-------|
| City intelligence (Stage 0) | `docs/city-intelligence.md` |
| Research & UI spec | `docs/reference/phase4-six-degrees.md` |
| Two-stage generator (v2) | `src/scripts/4-chains/generate-chains-v2.ts` |
| Legacy generator (v1) | `src/scripts/4-chains/generate-chains.ts` |
| Test chain outputs | `data/chain-tests/` |
| Pair generator | `src/scripts/4-chains/generate-pairs.ts` |
| 500 pairs config | `src/scripts/4-chains/chain-pairs.json` |
| 100-city endpoint pool | `src/scripts/4-chains/city-pool.json` |
| City pool curator | `src/scripts/4-chains/curate-city-pool.ts` |
| DB schema | `docs/data-schema.md` |
| Gallery page | `src/app/six-degrees/page.tsx` |
| Detail page | `src/app/six-degrees/[slug]/page.tsx` |
| DB queries | `src/lib/db.ts` |
| Data baseline | `docs/data-snapshot.md` |
