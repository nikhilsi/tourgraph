# City Intelligence Pipeline

---
**Created**: March 2, 2026
**Status**: Designed — ready for implementation
**Depends on**: `docs/data-snapshot.md` (data baseline), `docs/data-schema.md` (DB schema)
---

## What This Is

The city intelligence pipeline transforms raw Viator tour data into a curated understanding of what makes every city in the world unique. It is the intellectual core of TourGraph — the layer that turns commodity API data into original IP.

**The problem it solves:** Viator gives us 136,256 tour listings across 910+ cities. But listings are noisy — titles are SEO-optimized, categories are broad, and there's no way to understand what makes Takayama different from Tokyo without reading all 106 of Takayama's tours. SQL keyword matching can detect that a city "has food tours," but can't understand that Takayama's food scene centers on mochi-pounding in Buddhist temples and sake ceremonies in mountain workshops.

**The solution:** Use Claude to read every tour in every city and produce a curated city profile — a personality line, standout tours, and theme analysis — that captures the *vibe* of each place. This becomes the foundation for every feature that needs to understand cities: Six Degrees chains, Tour Roulette weighting, Right Now Somewhere context, and future city discovery pages.

---

## The Data Asset (4 IP Layers)

TourGraph's data is built in layers. Each layer adds original intelligence on top of the previous one.

| Layer | What | Source | Count | Status |
|-------|------|--------|-------|--------|
| 1. Raw Viator Data | Tour listings: titles, photos, ratings, prices, locations | Viator Partner API | 136,256 tours | Complete |
| 2. AI One-Liners | Witty personality captions per tour | Claude Haiku 4.5 | 136,256 (100%) | Complete |
| 3. City Intelligence | City profiles: personality, standout tours, themes | Claude Sonnet 4.6 | 910 cities | **Pending** |
| 4. Chain Connections | Thematic chains connecting cities | Claude Sonnet 4.6 | ~500 chains | **Pending** |

Layer 1 is commodity — anyone with a Viator API key has it. Layer 2 is derivative IP — Viator doesn't have these. Layers 3 and 4 are original intelligence that couldn't be reproduced with the same results. Together, they form a unique understanding of the world's tour landscape that exists nowhere else.

---

## Stage 0: City Curator

Stage 0 is the process that builds Layer 3. For each of the 910 cities with 50+ active tours, we send all of that city's tours to Claude and ask it to produce a curated profile.

### Why AI, Not SQL

We tried keyword matching first (see thematic richness analysis below). It works for rough categorization but fails at nuance:

- `title LIKE '%craft%'` catches "Craft Beer Tour" (drinks, not craftsmanship)
- Misses "Forest Bathing with a Buddhist Monk" as a wellness experience
- Can't understand that a "Mochi Making Experience in a Buddhist Temple" bridges food AND sacred themes
- Applies the same mechanical formula to every city — Seoul gets the same treatment as Takayama

Claude reads all tours for a city and understands what actually makes it special. Every city gets a bespoke analysis instead of pattern matching.

### Input

For each city: all active tours with images and one-liners (50-314 tours per city, avg ~122).

Per tour, Claude sees:
```
[2376] "Tokyo Sushi Making Class: Sake Ceremony & Matcha Experience"
  "Roll your own sushi, sip ceremonial sake, and whisk matcha in a Tsukiji master's kitchen."
  4.8★ | 342 reviews | $89 | 3h
```

Token estimate: ~41 tokens per tour. Largest city (~314 tours) = ~13K tokens input per call. Well within context limits.

### Output

Claude returns a structured city profile:

```json
{
  "personality": "A tiny mountain town where ninja training, mochi-pounding in Buddhist temples, and river trekking through pristine streams make it Japan's most unexpectedly diverse destination.",
  "themes": ["crafts", "sacred", "nature", "food", "wellness"],
  "standout_tours": [
    {
      "tour_id": 45623,
      "theme": "crafts",
      "reason": "Hands-on ninja training — unique cultural experience not found in larger cities"
    },
    {
      "tour_id": 45891,
      "theme": "sacred+food",
      "reason": "Mochi-making in a Buddhist temple bridges sacred traditions with culinary craft"
    },
    {
      "tour_id": 45677,
      "theme": "nature",
      "reason": "River trekking through pristine mountain streams — raw nature immersion"
    },
    {
      "tour_id": 45700,
      "theme": "wellness",
      "reason": "Private tea ceremony with a master — meditative, intimate, unhurried"
    },
    {
      "tour_id": 45812,
      "theme": "crafts",
      "reason": "Day trip connecting traditional craftsmanship across mountain villages"
    }
  ]
}
```

Key design choices:
- **`personality`** — One line capturing what makes this city unique. Written for humans, not machines. Should evoke "oh wow, I didn't know that."
- **`themes`** — AI-determined, not keyword-matched. Can include compound themes ("sacred+food") and themes our keyword list doesn't cover.
- **`standout_tours`** — 5 tours that best represent the city's personality. Selected for uniqueness and surprise, not just highest rating. `reason` captures why each was chosen.
- **`tour_id` references** — Tour details (title, image, rating, price) are always looked up from the `tours` table at render time, keeping profiles fresh if we re-index.

### Prompt Design

System prompt (identical for all 910 calls — cacheable):

```
You are a travel intelligence analyst. Your job is to read all tours available
in a city and produce a curated city profile that captures what makes this
place genuinely special and unique.

You are NOT writing marketing copy. You are identifying the authentic character
of a city as revealed by its tour offerings. What would surprise someone?
What exists here that they wouldn't expect? What makes this city different
from every other city in the world?

Return a JSON object with:

1. "personality" — A single sentence (under 150 characters) that captures what
   makes this city unique. Write it like you're telling a friend something
   surprising you discovered. Not a tagline. Not a slogan. A genuine insight.

2. "themes" — An array of theme tags that this city genuinely covers. Choose
   from: cuisine, street-food, drinks, sacred, markets, street-art, nightlife,
   water, hiking, dance, music, craftsmanship, wildlife, dark-tourism,
   photography, wellness, architecture, ancient-history, colonial-history,
   festivals, geological. Only include themes with real representation.

3. "standout_tours" — Exactly 5 tours that best represent this city's unique
   character. Prioritize:
   - Tours that would make someone say "wait, THAT exists there?"
   - Unique experiences over generic popular ones (a calligraphy workshop
     beats a hop-on-hop-off bus)
   - Diversity across the city's themes (don't pick 5 food tours)
   - Tours with personality — the one-liners tell you which ones have soul

   For each tour, include the tour ID, the theme it represents, and a brief
   reason (under 100 characters) explaining why this tour captures something
   special about the city.

Return only valid JSON. No markdown fences.
```

User prompt (per city):
```
Analyze all tours for [City], [Country] ([Continent]).

TOURS:
[all tours with id, title, one-liner, rating, reviews, price, duration]

Return the city profile JSON.
```

### Execution

| Aspect | Detail |
|--------|--------|
| Total calls | 910 (one per city) |
| Tokens per call | ~2K-13K input, ~500 output |
| Total input tokens | ~6.4M |
| Batchable? | Yes — perfect for Batch API |
| Cacheable? | System prompt is identical across all 910 calls |
| Estimated cost | ~$10-15 at Sonnet 4.6 batch pricing |
| Estimated time | Under 1 hour via Batch API |
| Script | `src/scripts/build-city-profiles.ts` |
| Output | Validated profiles written to `city_profiles` table |

### Validation

Before saving each profile:
- [ ] `personality` exists and is under 150 characters
- [ ] `themes` is a non-empty array of valid theme strings
- [ ] `standout_tours` has exactly 5 entries
- [ ] All `tour_id` values exist in the `tours` table
- [ ] No duplicate `tour_id` values
- [ ] Each standout tour has `theme` and `reason` fields

---

## Data Model

### `city_profiles` Table

```sql
CREATE TABLE city_profiles (
  destination_name TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  continent TEXT,
  tour_count INTEGER NOT NULL,
  personality TEXT NOT NULL,
  themes_json TEXT NOT NULL,
  standout_tours_json TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model TEXT NOT NULL
);
```

| Column | Type | Description |
|--------|------|-------------|
| `destination_name` | TEXT PK | City name, matches `tours.destination_name` |
| `country` | TEXT | Country name |
| `continent` | TEXT | Continent name |
| `tour_count` | INTEGER | Active tours with images at time of generation |
| `personality` | TEXT | AI-generated one-line city personality |
| `themes_json` | TEXT (JSON) | `["crafts","sacred","nature","food","wellness"]` |
| `standout_tours_json` | TEXT (JSON) | `[{"tour_id":123,"theme":"crafts","reason":"..."},...]` |
| `generated_at` | TEXT | ISO timestamp of generation |
| `model` | TEXT | Claude model used (e.g., "claude-sonnet-4-6") |

---

## How City Intelligence Is Used

### Six Degrees (Stages 1+2) — Primary consumer

**Stage 1 (City Picker):** All 910 city profiles are loaded into the system prompt (~190K tokens). For each chain pair, Claude picks 3 intermediate cities from the *entire* set of 910 — no artificial constraints. The personality lines and standout tours give Claude rich context for finding surprising thematic connections.

**Stage 2 (Chain Builder):** Detailed tours for the 5 selected cities. The city profile's themes and personality inform the chain narrative.

See `docs/six-degrees-chains.md` for full chain generation architecture.

### Tour Roulette — Smarter weighting

Current roulette uses rating-based weights. City profiles enable weighting toward standout tours — the ones AI identified as genuinely interesting, not just highly reviewed.

### Right Now Somewhere — City context

Currently shows: "Right now in Kyoto it's 6:47am and you could be doing forest bathing." With city profiles: "Right now in Kyoto — a city where temple tea ceremonies and Michelin street stalls share the same ancient lanes — it's 6:47am..."

### Future: City Discovery Pages

Each city profile is essentially a landing page waiting to happen: personality headline, 5 curated tour cards, theme tags. URL: `/cities/takayama`. OG card: personality line + standout tour photo.

### Future: Theme Browsing

Theme tags enable: "Show me all cities where you can learn to make things with your hands" → filter by `craftsmanship` theme → Takayama, Ubud, Hoi An, Oaxaca City...

### Future: City Siblings

Compare theme profiles to find sister cities: Takayama (crafts, sacred, nature, food, wellness) ↔ Luang Prabang (crafts, sacred, markets, wellness). "If you loved Takayama, you'd love Luang Prabang."

---

## Thematic Richness Analysis (Baseline)

Before running Stage 0, we performed keyword-based theme detection across all 136K tour titles to understand the landscape. This informed the pipeline design but will be superseded by AI-curated themes from Stage 0.

### Data Landscape

| Tier | Cities | Total Tours | Viability |
|------|--------|-------------|-----------|
| 100+ tours | 585 | 87,684 | Excellent — rich theme variety |
| 50-99 tours | 325 | 23,526 | Good — enough for most themes |
| 20-49 tours | 501 | 16,305 | Usable — some themes may be thin |
| 10-19 tours | 352 | 4,896 | Risky — limited theme coverage |
| <10 tours | 865 | 3,522 | Not viable |

**Continent spread (cities with 50+ tours):**
Europe 309, Asia 196, North America 165, Africa 88, South America 82, Caribbean 36, Oceania 34.

### Key Surprises

- **Granada, Nicaragua** (12 keyword themes) — NOT Granada, Spain. Most thematically diverse city in the DB.
- **Lagos, Nigeria** (11 themes) — Far more diverse than expected.
- **Takayama, Japan** (10 themes) — Tiny mountain town with stunning depth.
- **Asheville, USA** (11 themes) — Small city rivaling major destinations.
- **Ulaanbaatar, Mongolia** (8 themes) — Nobody expects Mongolia.
- **St Kitts** (9 themes) — Tiny island punching above its weight.

### Full Keyword Analysis by Continent

Detailed tables of cities with 7+ keyword-detected themes are archived in the git history of `docs/six-degrees-chains.md` (commit f961e95). Stage 0 will produce more accurate AI-curated theme data.

---

## Reference

| What | Where |
|------|-------|
| Data baseline | `docs/data-snapshot.md` |
| DB schema | `docs/data-schema.md` |
| Chain generation (Stages 1+2) | `docs/six-degrees-chains.md` |
| Phase 4 research (Six Degrees) | `docs/reference/phase4-six-degrees.md` |
| Build script (to be created) | `src/scripts/build-city-profiles.ts` |
