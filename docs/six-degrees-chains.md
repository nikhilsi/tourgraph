# Six Degrees Chain Generation — Planning & Execution

---
**Created**: March 2, 2026
**Status**: Planning — city pool and chain count under discussion
**Depends on**: `docs/phase4-six-degrees.md` (research & UI spec), `docs/data-snapshot.md` (data baseline)
---

## What This Doc Covers

Everything needed to go from 0 chains to a fully populated Six Degrees feature:
1. How chains work (data structure, generation, display)
2. City pool design (which cities to include and why)
3. Pair selection strategy (which cities to connect)
4. Chain count tiers (launch vs growth vs full)
5. Execution plan (scripts, cost, timeline)
6. Quality checklist (what makes a chain good)

---

## How Chains Work

### Data Structure (per chain)

Each chain is 5 stops connecting two cities through 3 intermediate cities, stored in `six_degrees_chains` table.

**Per-chain AI-generated content:**
- `summary` — One-line overview, e.g. "From sake ceremonies to makgeolli brewing, Mozart's concert hall to Provençal rosé..."

**Per-node AI-generated content:**
- `connection_to_next` — Witty 1-2 sentence bridge to the next city (null for last stop)
- `theme` — One-word theme of the connection (e.g. "craftsmanship", "sacred")

**Per-node from DB (looked up at render time via `tour_id`):**
- Tour photo, title, rating, price, duration
- Tour one-liner (AI-generated during indexing, stored in tours table)

**Full JSON structure:**
```json
{
  "city_from": "Tokyo",
  "city_to": "Rome",
  "chain": [
    {
      "city": "Tokyo",
      "country": "Japan",
      "tour_title": "Tokyo Sushi Making Class: Sake Ceremony & Matcha Experience",
      "tour_id": 2376,
      "connection_to_next": "From rolling sushi with sake ceremonies in Tokyo, we follow the thread of fermented grain spirits eastward...",
      "theme": "wine/spirits"
    },
    // ... 3 more intermediate stops ...
    {
      "city": "Rome",
      "country": "Italy",
      "tour_title": "Rome: Early Morning Trevi Fountain Photoshoot",
      "tour_id": 858,
      "connection_to_next": null,
      "theme": "ancient history"
    }
  ],
  "summary": "From sake ceremonies to makgeolli brewing, Mozart's concert hall to Provençal rosé..."
}
```

### Generation Pipeline

1. Script reads city pairs from `src/scripts/chain-pairs.json`
2. For each pair: fetches top 30 tours for start/end cities + 20 random intermediate cities
3. Sends tour list + prompt to Claude Sonnet 4.6
4. Claude returns JSON with 5-stop chain, themed connections, and summary
5. Script validates (5 unique cities, 4 unique themes) and stores in SQLite
6. Pairs normalized alphabetically for dedup (Tokyo→Rome = Rome→Tokyo)

**Script:** `npx tsx src/scripts/generate-chains.ts`
**Cost:** ~$0.02/chain (Sonnet 4.6, ~14K input / ~600 output tokens)
**Speed:** ~13s per chain
**Reliability:** 8/8 test runs produced valid chains (v2 prompt)

### What the User Sees

**Gallery page (`/six-degrees`):**
- Card per chain: city pair, summary quote, theme list, stop count
- "Surprise Me" button picks random chain

**Detail page (`/six-degrees/[slug]`):**
- Vertical timeline with numbered circle nodes
- Each node: city label, tour card (photo + title + stats), theme badge, connection text
- Tour one-liner: **NOT currently shown** (exists in DB, just not rendered — UI enhancement opportunity)

---

## City Pool Design

### Data Landscape (March 2, 2026)

| Tier | Cities | Total Tours | Chain viability |
|------|--------|-------------|-----------------|
| 100+ tours | 585 | 87,684 | Excellent — rich theme variety |
| 50-99 tours | 325 | 23,526 | Good — enough for most themes |
| 20-49 tours | 501 | 16,305 | Usable — some themes may be thin |
| 10-19 tours | 352 | 4,896 | Risky — limited theme coverage |
| <10 tours | 865 | 3,522 | Not viable for chain endpoints |

**Continent spread (cities with 50+ tours):**
Europe 309, Asia 196, North America 165, Africa 88, South America 82, Caribbean 36, Oceania 34.

### Thematic Richness Analysis

Themes detected by keyword matching across 136K tour titles: food, drinks, sacred, markets, street_art, hiking, water, dance, music, wellness, photography, crafts, wildlife, geological, ancient, dark (ghost/haunted).

**Cities with 7+ distinct themes, by continent:**

#### Africa (19 cities with 7+ themes)
| City | Country | Themes | Notable |
|------|---------|--------|---------|
| Lagos | Nigeria | 11 | 70 themed tours — most diverse in Africa |
| Addis Ababa | Ethiopia | 10 | Sacred, markets, wildlife, dance, music |
| Cape Town | South Africa | 10 | Iconic — wildlife, drinks, street art, hiking |
| Sharm el Sheikh | Egypt | 10 | Water, ancient, wildlife, wellness |
| Tel Aviv | Israel | 9 | Street art, markets, sacred |
| Baku | Azerbaijan | 8 | Geological, ancient, sacred |
| Kigali | Rwanda | 8 | 90 themed tours — wildlife, crafts, dance |
| Muscat | Oman | 8 | Water, sacred, wellness, ancient |
| Zanzibar City | Tanzania | 7 | Wildlife, geological, dance |
| Cairo | Egypt | 7 | Dance, sacred, ancient, markets |
| Marrakech | Morocco | 7 | Markets, crafts, ancient |

#### Asia (80 cities with 7+ themes — most diverse continent)
| City | Country | Themes | Notable |
|------|---------|--------|---------|
| **Seoul** | **South Korea** | **12** | **Most thematically diverse city in Asia** |
| Chiang Mai | Thailand | 11 | Hiking, food, sacred, wellness, dark |
| Kyoto | Japan | 10 | Food, sacred, crafts, wellness, dance |
| Takayama | Japan | 10 | Tiny city, huge depth — food, crafts, sacred, geological |
| Khao Lak | Thailand | 10 | Water, wildlife, sacred |
| Luang Prabang | Laos | 9 | Crafts, sacred, markets, wellness |
| Siem Reap | Cambodia | 9 | Sacred, crafts, dance, wildlife |
| Hoi An | Vietnam | 8 | Food, crafts, photography |
| Ubud | Indonesia | 8 | Dance, crafts, sacred, wellness |
| Ulaanbaatar | Mongolia | 8 | Crafts, wildlife, sacred — "where?!" factor |
| Rishikesh | India | 8 | Wellness, sacred, hiking — yoga capital |
| Varanasi | India | 7 | Sacred, photography, dance |

#### Caribbean (7 cities with 7+ themes)
| City | Country | Themes | Notable |
|------|---------|--------|---------|
| San Juan | Puerto Rico | 11 | Photography, dance, music, dark, crafts |
| St Kitts | St Kitts and Nevis | 9 | Tiny island, surprisingly diverse |
| Trinidad | Trinidad and Tobago | 8 | Music, dance, wildlife |

#### Europe (175 cities with 7+ themes — largest pool)
| City | Country | Themes | Notable |
|------|---------|--------|---------|
| Budapest | Hungary | 11 | Drinks, music, dance, street art, dark |
| Dublin | Ireland | 10 | Food, dance, music, dark, sacred |
| London | United Kingdom | 10 | Markets, dark, music, street art |
| Paphos | Cyprus | 10 | Dance, wildlife, geological |
| Sofia | Bulgaria | 10 | Sacred, dance, street art, wildlife |
| Barcelona | Spain | 9 | Food, dance, sacred, street art |
| Vienna | Austria | 9 | Music, sacred, food, drinks — classic hub |
| Stockholm | Sweden | 9 | Photography, hiking, food |
| Riga | Latvia | 9 | "Where?!" factor — food, markets, sacred |
| Ohrid | North Macedonia | 9 | Same — sacred, crafts, hiking |
| Istanbul | Turkey | 8 | Sacred, markets — proven hub |
| Rome | Italy | 8 | Ancient, sacred, food — proven hub |
| Prague | Czech Republic | 8 | Dark, drinks, sacred |
| Tbilisi | Georgia | 8 | Food, drinks, sacred — rising gem |
| Mostar | Bosnia and Herzegovina | 8 | Crafts, sacred, hiking |
| Gozo | Malta | 8 | Geological, crafts, sacred |
| Reykjavik | Iceland | 7 | Photography, geological, hiking |

#### North America (72 cities with 7+ themes)
| City | Country | Themes | Notable |
|------|---------|--------|---------|
| Asheville | USA | 11 | Hiking, drinks, dark, street art, music |
| Portland | USA | 11 | Food, wildlife, crafts, street art |
| Cozumel | Mexico | 11 | Water, wildlife, geological, sacred |
| Austin | USA | 10 | Food, music, dance, street art, geological |
| Miami | USA | 10 | Street art, dance, wildlife |
| Oaxaca City | Mexico | 9 | Food, crafts, markets, street art |
| Nashville | USA | 9 | Music, food, dance, dark |
| Key West | USA | 9 | Music, dark, crafts, wildlife |
| Seattle | USA | 9 | Food, geological, wildlife, crafts |
| Vancouver | Canada | 9 | Wildlife, drinks, hiking |
| Mexico City | Mexico | 7 | Markets, sacred, street art |
| New York City | USA | 7 | Markets, dark, food |

#### Oceania (12 cities with 7+ themes)
| City | Country | Themes | Notable |
|------|---------|--------|---------|
| Melbourne | Australia | 10 | Street art, dark, drinks, wildlife |
| Perth | Australia | 9 | Wellness, street art, wildlife |
| Sydney | Australia | 8 | Wildlife, water, hiking |
| Queenstown | New Zealand | 7 | Water, hiking, wildlife |
| Wellington | New Zealand | 7 | Food, crafts, hiking |
| Hobart | Australia | 7 | Food, wildlife, drinks |

#### South America (28 cities with 7+ themes)
| City | Country | Themes | Notable |
|------|---------|--------|---------|
| **Granada** | **Nicaragua** | **12** | **Most thematically diverse city in the entire DB** |
| São Paulo | Brazil | 10 | Street art, dance, markets |
| Panama City | Panama | 10 | Wildlife, hiking, dance, music |
| Bogotá | Colombia | 9 | Street art, dance, markets, music |
| Cali | Colombia | 9 | Dance capital — salsa, food |
| Cusco | Peru | 8 | Sacred, crafts, hiking |
| Medellín | Colombia | 8 | Street art, dance, food |
| Buenos Aires | Argentina | 8 | Tango, street art, food, wildlife |
| Cartagena | Colombia | 8 | Dance, food, crafts, water |
| Lima | Peru | 7 | Food capital — markets, crafts |

### Key Surprises from the Data

- **Granada, Nicaragua** (12 themes) — NOT Granada, Spain. The most thematically diverse city in the entire 136K dataset.
- **Lagos, Nigeria** (11 themes) — Far more diverse than expected. Markets, music, wildlife, sacred.
- **Takayama, Japan** (10 themes) — A tiny mountain town with 10 distinct tour themes. Perfect "wait, what?" city.
- **Asheville, USA** (11 themes) — Small mountain city rivaling major destinations in variety.
- **Ohrid, North Macedonia** and **Riga, Latvia** (9 themes each) — "Where is that?" factor.
- **Ulaanbaatar, Mongolia** (8 themes) — Crafts, wildlife, sacred. Nobody expects Mongolia.
- **St Kitts** (9 themes) — Tiny Caribbean island punching way above its weight.

### Natural Chain Hubs

Cities that appear frequently as intermediate stops due to rich thematic coverage (from phase4 test runs):
Rome, Prague, Cape Town, Barcelona, Amsterdam, Vienna, Sydney, Istanbul

### City Pool Categories

The pool should mix three types for maximum delight:

**Anchors (~25-30)** — Cities everyone recognizes. People look for cities they know or dream about.
Examples: Tokyo, Rome, Paris, London, NYC, Istanbul, Barcelona, Bangkok, Marrakech, Sydney, Dubai, Rio de Janeiro, Lisbon, Amsterdam, Prague, Buenos Aires, Cape Town, Kyoto, Seoul, Vienna, Athens, Singapore, Mexico City, Cusco, Reykjavik, Nairobi, Hanoi, Dublin

**Gems (~30-40)** — Strong destinations that evoke wanderlust. The "ooh, I want to go there" tier.
Examples: Dubrovnik, Chiang Mai, Medellín, Fez, Cartagena, Siem Reap, Porto, Queenstown, Budapest, Luang Prabang, Tbilisi, Hoi An, Oaxaca, Zanzibar City, Florence, Krakow, Ubud, Jaipur, Edinburgh, Lima, Petra, Havana, Montenegro, Split

**Surprises (~20-30)** — Smaller, thematically rich cities that make people go "wait, THAT exists?" The "wow" factor.
Examples: Takayama (Japan), Asheville (USA), Gozo (Malta), Addis Ababa (Ethiopia), Luang Prabang (Laos), Nizwa (Oman), Oaxaca City (Mexico), Skaftafell (Iceland), Kotor (Montenegro), Siargao (Philippines), Timișoara (Romania), Greymouth (New Zealand), Nyaung U (Myanmar)

**Why small cities matter:** A chain through Takayama featuring a sake brewery tour nobody knew existed delivers the "oh wow, I didn't know that" moment better than yet another Rome food tour. Small cities with quirky tours are the soul of this feature.

---

## Pair Selection Strategy

### Rules

1. **Cross-continent mandatory** — Endpoints must be on different continents. Dallas→Austin is meaningless. Tokyo→Buenos Aires is magic.
2. **Cultural distance over geographic distance** — Istanbul→Kyoto is more interesting than Istanbul→Athens.
3. **Mix city sizes** — Anchor↔Surprise pairs are often the most delightful. Not just mega-city↔mega-city.
4. **Every city in multiple chains** — No city should appear in only 1 chain. Target: each city in 6-10 chains.
5. **Thematic diversity across gallery** — The full set shouldn't be all food chains. Spread themes.

### Pair Generation Approach

Hand-picking 500 pairs is impractical. Instead:

1. Define the city pool (curated list, ~80-120 cities)
2. Write a pair generation script that:
   - Pairs every city with N cities from other continents
   - Biases toward culturally distant pairs
   - Ensures each city appears in target number of chains
   - Avoids pairing cities from the same country
3. Output `chain-pairs.json`
4. Run generator
5. Review output quality (spot-check ~10%)

---

## Chain Count Tiers

### Launch (~500 chains)

| Parameter | Value |
|-----------|-------|
| City pool | ~100 cities (25 anchors + 40 gems + 35 surprises) |
| Connections per city | ~10 |
| Total chains | ~500 |
| Generation time | ~1.5 hours |
| Cost | ~$10 |
| User feel | Abundant. "Surprise Me" stays fresh for days of casual use. |

### Growth (~1,000 chains)

| Parameter | Value |
|-----------|-------|
| City pool | ~150 cities (expand gems and surprises) |
| Connections per city | ~13 |
| Total chains | ~1,000 |
| Generation time | ~3.5 hours |
| Cost | ~$20 |
| User feel | Deep rabbit hole. Hard to see the same chain twice. |

### Full (~2,000+ chains)

| Parameter | Value |
|-----------|-------|
| City pool | ~250+ cities |
| Connections per city | ~16 |
| Total chains | ~2,000+ |
| Generation time | ~7+ hours |
| Cost | ~$40+ |
| User feel | Inexhaustible. Every "Surprise Me" is genuinely new. |

**Recommendation:** TBD — depends on how launch set feels.

---

## UI Enhancement: Show One-Liners on Chain Detail

Currently the chain detail page shows per node: city, tour photo, tour title, stats, theme badge, connection text.

**Missing:** The tour's one-liner (e.g. "Kayak through karst cliffs and hidden caves in a single perfect day"). Every tour has one — 136,256/136,256 coverage. These are the witty, personality-filled captions that make Tour Roulette delightful.

**Recommendation:** Add the one-liner to tour cards on the chain detail page. It's a one-line code change (the data is already fetched via `getTourById`). Each node becomes its own little moment of delight, not just a waypoint in the chain.

---

## Quality Checklist (What Makes a Chain Good)

From test runs (see `data/chain-tests/`):

**Great chains have:**
- [ ] 5 stops across genuinely different cities (not same-country clusters)
- [ ] 4 distinct themes that feel surprising, not forced
- [ ] `connection_to_next` text that makes you go "oh, I see it!" — warm and narrative
- [ ] At least one intermediate stop that surprises ("wait, that city?")
- [ ] A `summary` that works as a standalone shareable sentence
- [ ] Tours that actually represent the thematic connection (not just highest-rated generic tours)

**Red flags:**
- Same continent for all 5 stops
- Themes that don't match the actual tour (e.g. "hiking/nature" theme but tour is a concert)
- Generic connection text ("both cities have tours")
- All mega-cities, no surprises
- Tour titles that are pure SEO gibberish

**From v2 test results (8/8 success):**
- Average generation time: ~13s
- Best narrative arc: Buenos Aires → Istanbul (art → craftsmanship → community → sacred → ancient history)
- Recurring hubs: Vienna and Istanbul appear often as intermediates (rich thematic coverage)
- Connection writing quality: consistently warm, witty, and surprising

---

## Generation Architecture

### Architecture Evolution

**v1 (current script):** Each API call sends tour data for 2 endpoint cities + 20 random intermediate cities. ~14K tokens per request. Sequential processing. Problems: random intermediate selection → inconsistent quality, same-country clustering, no shared context across calls.

**v2 (proposed):** Upload a curated tour catalog as a shared context. Every API call sees the *full* curated dataset. Use Claude API features (Batch API, prompt caching, Files API) for cost efficiency and quality.

### Why v2 Is Better

| Aspect | v1 (per-request context) | v2 (shared catalog) |
|--------|------------------------|---------------------|
| Intermediate cities | 20 random from 910 | All ~100 curated cities visible |
| Claude's view | Narrow (22 cities) | Full landscape (100 cities) |
| Geographic diversity | Hope for the best | Claude can reason globally |
| Quality consistency | Varies by random draw | Consistent — same data every time |
| Clustering risk | High (3/5 stops in Japan) | Low — Claude sees all continents |
| Cost per chain | ~$0.02 | ~$0.016 (with batch + cache) |
| Total for 500 | ~$10-15 | ~$8 |

The quality argument is the real win. When Claude can see tours from 100 cities across all continents, it can make genuinely surprising connections instead of being forced to pick from a random 20.

### Claude API Features We'll Use

**1. Batch API (`/v1/messages/batches`)**
- Submit all 500 requests in one batch
- **50% cost reduction** on all tokens (input, output, cache write)
- Processing: ~1 hour (async, no streaming needed)
- Results available as `.jsonl` for 29 days
- Max: 100,000 requests or 256 MB per batch

**2. Prompt Caching (`cache_control`)**
- Mark the tour catalog in the system prompt with `cache_control: {"type": "ephemeral", "ttl": "1h"}`
- First request: cache write (1.25x base input cost)
- Subsequent requests: cache read (0.10x base input cost — 90% discount)
- 1-hour TTL recommended for batch processing (better hit rates)
- **Combined with batch: cache reads cost 5% of base input price**
- Minimum cacheable size for Sonnet 4.6: 2,048 tokens (our catalog is ~75K — well above)
- Cache hit rate in batches: 30-98% (best effort, concurrent processing)

**3. Files API (beta: `files-api-2025-04-14`)**
- Upload the curated tour catalog as a plain text file once → get a persistent `file_id`
- Reference `file_id` in every batch request — avoids re-uploading ~75K tokens of text each time
- **Important:** File content still counted as input tokens per call. Cost savings come from caching, not the upload itself.
- Supported formats: plain text, PDF (NOT CSV or SQLite — must convert to text)
- Max file size: 500 MB. Files persist until deleted.
- Alternative: inline the catalog text directly in the system prompt (simpler, same caching behavior). Files API is cleaner for large contexts.

**Features we evaluated but are NOT using:**
- **Extended thinking** — Adds cost for reasoning tokens. Not needed for creative writing. Better for math/logic.
- **Citations** — Structured source referencing. Overkill — we just need tour IDs in the output JSON.
- **Projects/persistent knowledge** — Does not exist in the API. Prompt caching is the closest equivalent.

### Curated Tour Catalog Design

Instead of sending random city subsets per request, we pre-build a single structured text file containing the curated tour dataset for all pool cities.

**Sizing analysis (March 2, 2026):**

| Configuration | Tours | Cities | ~Tokens | Fits 200K context? |
|---------------|-------|--------|---------|---------------------|
| 15 tours × 100 cities | 1,500 | 100 | ~75K | Yes — leaves ~125K headroom |
| 30 tours × 100 cities | 3,000 | 100 | ~150K | Tight — ~50K headroom |
| 15 tours × 910 cities | 13,650 | 910 | ~663K | No — exceeds context window |
| Full DB (136K tours) | 136,256 | 2,628 | ~5M+ | No — far exceeds context |

**Recommended: 15 tours × 100 curated cities = ~75K tokens.** Comfortable headroom for system prompt (~1K tokens) + user prompt (~200 tokens) + output (~2K tokens).

**Tour selection per city:** Top 8 by rating + 7 random (ensures both proven quality and quirky finds).

**Catalog format (plain text, structured for Claude):**
```
=== TOUR CATALOG ===
100 cities across 6 continents. Each city lists 15 tours.

--- Tokyo, Japan (Asia) ---
[2376] "Tokyo Sushi Making Class: Sake Ceremony & Matcha Experience"
  "Roll your own sushi, sip ceremonial sake, and whisk matcha in a Tsukiji master's kitchen."
  4.8★ | 342 reviews | $89 | 3h
[2371] "Tokyo: Calligraphy Workshop & Original T-Shirt Creation"
  "Brush ancient kanji onto cotton and walk out wearing your own handmade souvenir."
  4.9★ | 127 reviews | $65 | 2h
...

--- Buenos Aires, Argentina (South America) ---
[8514] "Private Photography Tour in Buenos Aires"
  "Chase golden light through La Boca's technicolor alleys with a local pro."
  5.0★ | 89 reviews | $120 | 4h
...
```

**Build script:** New `src/scripts/build-tour-catalog.ts` that:
1. Reads the curated city pool list
2. For each city: selects top 8 by rating + 7 random tours
3. Formats as structured plain text
4. Writes to `data/tour-catalog.txt`
5. Optionally uploads to Claude Files API and prints the `file_id`

### Request Structure (v2)

Each batch request looks like:

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 2000,
  "system": [
    {
      "type": "text",
      "text": "You are a creative travel writer... [system prompt with rules]"
    },
    {
      "type": "text",
      "text": "=== TOUR CATALOG ===\n100 cities across 6 continents...",
      "cache_control": {"type": "ephemeral", "ttl": "1h"}
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Connect Tokyo to Buenos Aires. Build a 5-stop chain using ONLY tours from the catalog above. [output format spec]"
    }
  ]
}
```

The system prompt + catalog (~76K tokens) is identical across all 500 requests → cached after the first write. Each user prompt is unique but tiny (~200 tokens).

### Cost Estimates (v2 architecture)

**Sonnet 4.6 pricing (standard → batch → batch+cache):**

| Token type | Standard | Batch (50%) | Batch + Cache Read |
|------------|----------|-------------|---------------------|
| Input | $3.00/MTok | $1.50/MTok | — |
| Cache write | $3.75/MTok | $1.875/MTok | — |
| Cache read | $0.30/MTok | $0.15/MTok | $0.15/MTok |
| Output | $15.00/MTok | $7.50/MTok | — |

**500 chains estimate (conservative 60% cache hit rate in batch):**

| Component | Tokens | Rate | Cost |
|-----------|--------|------|------|
| Cache write (1 request) | 76K | $1.875/MTok | $0.14 |
| Cache miss (200 requests) | 200 × 76K = 15.2M | $1.50/MTok | $22.80 |
| Cache hit (300 requests) | 300 × 76K = 22.8M | $0.15/MTok | $3.42 |
| User prompts (500 requests) | 500 × 200 = 100K | $1.50/MTok | $0.15 |
| Output (500 responses) | 500 × 600 = 300K | $7.50/MTok | $2.25 |
| **Total** | | | **~$28.76** |

**With 90% cache hit rate (optimistic, possible with sequential processing):**

| Component | Tokens | Rate | Cost |
|-----------|--------|------|------|
| Cache write (1 request) | 76K | $1.875/MTok | $0.14 |
| Cache miss (50 requests) | 50 × 76K = 3.8M | $1.50/MTok | $5.70 |
| Cache hit (450 requests) | 450 × 76K = 34.2M | $0.15/MTok | $5.13 |
| User prompts (500 requests) | 500 × 200 = 100K | $1.50/MTok | $0.15 |
| Output (500 responses) | 500 × 600 = 300K | $7.50/MTok | $2.25 |
| **Total** | | | **~$13.37** |

**Comparison:**

| Approach | Quality | Cost (500 chains) | Speed |
|----------|---------|-------------------|-------|
| v1 sequential (current) | Inconsistent | ~$10 | ~1.8 hrs |
| v1 + concurrency 10 | Inconsistent | ~$10 | ~11 min |
| v2 batch + cache (60% hit) | Consistent, high | ~$29 | ~1 hr (async) |
| v2 batch + cache (90% hit) | Consistent, high | ~$13 | ~1 hr (async) |
| v2 sequential + cache | Consistent, high | ~$8 | ~3.5 hrs |

**Key tradeoff:** v2 with batch costs ~$13-29 depending on cache hit rate, vs. v1 at ~$10. The extra cost buys dramatically better quality — Claude sees the entire curated landscape for every chain, eliminating random intermediate selection and geographic clustering.

**Alternative: v2 sequential (no batch)** processes requests one at a time with guaranteed near-100% cache hits. Slowest (~3.5 hrs) but cheapest (~$8) and highest cache hit rate. Could add concurrency 2-3 to speed up while maintaining high hit rates.

### DB Write Safety (unchanged)

Not a concern regardless of approach:
- Each write is one tiny INSERT (~1ms)
- SQLite WAL mode handles concurrent readers + sequential writers
- `busy_timeout(5000)` queues any contention

### Implementation Plan

1. **Build curated city pool** → `src/scripts/city-pool.json` (hand-curated, ~100 cities)
2. **Build catalog script** → `src/scripts/build-tour-catalog.ts` (extracts tours, formats text)
3. **Build pair generator** → `src/scripts/generate-pairs.ts` (cross-continent pairs from pool)
4. **Rewrite chain generator** → `src/scripts/generate-chains-v2.ts` (batch API + cache)
   - Or: update existing `generate-chains.ts` with `--batch` flag
   - Reads catalog from `data/tour-catalog.txt`
   - Submits all pairs as one batch
   - Polls for completion, downloads results
   - Validates and saves to DB
5. **Quality review** → Spot-check ~10%, run quality checklist
6. **Redeploy DB** → `bash deployment/scripts/deploy-db.sh`

---

## Execution Steps (When Ready)

1. **Curate city pool** → Hand-pick ~100 cities across 3 tiers (Anchors/Gems/Surprises), save as `src/scripts/city-pool.json`
2. **Build tour catalog** → Run `build-tour-catalog.ts` to extract 15 tours per city, format as structured text → `data/tour-catalog.txt`
3. **Generate pair list** → Run `generate-pairs.ts` to create ~500 cross-continent pairs → `src/scripts/chain-pairs.json`
4. **Test batch (small)** → Generate ~10-20 chains with v2 architecture (shared catalog), review quality carefully
5. **UI: one-liner on chain detail** → Add `tour.one_liner` to web + iOS chain detail views
6. **Full generation** → Submit all ~500 pairs via Batch API with cached catalog
7. **Quality spot-check** → Review ~10% of chains against quality checklist
8. **Gallery redesign** → Curated groupings (superlatives pattern), "Surprise Me" from full pool
9. **Redeploy DB** → `bash deployment/scripts/deploy-db.sh 143.244.186.165`
10. **Verify live** → Check gallery, detail pages, OG previews on production

---

## Prompt Review & Refinements

### Issues with Current Prompt (v2)

The v2 prompt produces valid chains (8/8 success rate) but has quality gaps that matter at 500-chain scale:

**1. No one-liner in tour data sent to Claude**
Claude sees only: `[id] "title" — rating, reviews, $price`. Tour titles are often Viator SEO-speak ("Best seller! Jerusalem old city four quarters tour"). The one-liner would give Claude the actual personality of the tour. We have 100% coverage — free intelligence left on the table.

**2. Tour selection biased toward popularity**
`ORDER BY rating DESC, review_count DESC` means Claude always sees the most reviewed tours — generic hop-on-hop-off buses, not quirky calligraphy workshops. Should mix popular + random for variety.

**3. Intermediate city selection fully random**
Picks 20 random from all 2,700+ cities with 10+ tours. Most random picks are small cities with nothing interesting. Should bias toward thematically rich cities from our analysis.

**4. No guidance on surprise factor**
Prompt says "not just highly rated" but doesn't explicitly push for surprising, lesser-known tours and cities — the whole product thesis.

**5. Theme mislabeling**
In testing, Vienna's stop was labeled "hiking/nature" but the tour was a concert. Prompt should clarify: theme = what connects two adjacent cities, not what the tour itself is about.

### Changes Made (v3 prompt)

| What | v2 | v3 |
|------|----|----|
| Tour data format | Title + rating + reviews + price | + one-liner + duration |
| Tour selection | Top 30 by rating/reviews | Top 15 by rating + 15 random |
| Intermediate cities | 20 random from all cities | 20 from thematically rich pool |
| Prompt: surprise | "Not just highly rated" | Explicit: prefer surprising, lesser-known |
| Prompt: theme clarity | Implicit | Explicit: theme = connection between cities |
| Prompt: summary length | Unbounded | "Keep under 120 chars" (for share cards) |

Output JSON structure unchanged — no code changes to validation or DB storage.

---

## Decisions Made

- [x] **Generation architecture** — v2: shared tour catalog in system prompt, Claude sees all ~100 curated cities for every chain. Eliminates random intermediate selection, geographic clustering, and quality inconsistency. Uses Batch API + prompt caching for efficiency, but the architecture is driven by quality, not cost.
- [x] **Intermediate city selection** — Solved by v2 architecture. Claude picks intermediates from the full curated pool (~100 cities) instead of a random 20-city subset. No separate intermediate selection logic needed.
- [x] **Chain count for launch** — ~500. Evaluate, then expand to 1,000+ if needed.
- [x] **Show one-liner on chain detail** — Yes, both web and iOS.
- [x] **Gallery UX** — NOT a wall of 500 cards. Curated display (like World's Most superlatives pattern) with "Surprise Me" drawing from the full pool.
- [x] **v3 prompt** — One-liner context, mixed tour selection, surprise bias, theme = connection between cities, summary under 120 chars.

## Open Decisions

- [ ] **City pool composition** — Which ~100 cities? Thematic richness data above informs this. Three tiers: Anchors, Gems, Surprises.
- [ ] **Gallery categories** — By continent pair? By theme? Editor's picks? Needs design thinking.
- [ ] **Tours per city in catalog** — 15 (top 8 + 7 random) seems right. Could test with 20 or 10.
- [ ] **Batch vs. sequential processing** — Batch is faster (~1 hr) but cache hit rate varies (30-98%). Sequential is slower (~3.5 hrs) but near-100% cache hits. Could also do sequential with concurrency 2-3.
- [ ] **Files API vs. inline catalog** — Files API is cleaner for large contexts but adds beta dependency. Inline in system prompt works identically with caching.

---

## Reference

| What | Where |
|------|-------|
| Research & UI spec | `docs/phase4-six-degrees.md` |
| Production generator | `src/scripts/generate-chains.ts` |
| Test generator | `src/scripts/test-chain.ts` |
| Test chain outputs | `data/chain-tests/` |
| Current pair config | `src/scripts/chain-pairs.json` (3 test pairs) |
| DB schema | `docs/data-schema.md` (six_degrees_chains table) |
| Gallery page | `src/app/six-degrees/page.tsx` |
| Detail page | `src/app/six-degrees/[slug]/page.tsx` |
| DB queries | `src/lib/db.ts` (getAllChains, getChainBySlug) |
| Data baseline | `docs/data-snapshot.md` |
