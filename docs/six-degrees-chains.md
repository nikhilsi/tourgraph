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

## Script Architecture: Parallelized Generation

### Current Script (`generate-chains.ts`)

Fully sequential — `for` loop, one `await generateChain()` at a time.

- 500 chains × 13s = **~108 min (1.8 hrs)** — too slow

### Why We Can't Batch (Like One-Liners)

The one-liner script batches 20 tours per API call. Chains can't batch — each chain needs its own context window (~14K input tokens of city-specific tour data, ~22 cities per prompt). Each chain = one API call.

### But We Can Parallelize API Calls

**Rate limits (Tier 3, Sonnet Active):**

| Limit | Value | Per chain | Max chains/min |
|-------|-------|-----------|---------------|
| Requests/min | 2,000 | 1 | 2,000 (not bottleneck) |
| Input tokens/min | 800K | ~14K | **~57 (bottleneck)** |
| Output tokens/min | 160K | ~600 | ~266 (not bottleneck) |

**Throughput at different concurrency levels:**

| Concurrency | Chains/min | 500 chains | 1,000 chains | Notes |
|-------------|-----------|------------|-------------|-------|
| 1 (current) | ~4.6 | 108 min | 216 min | Too slow |
| 5 | ~23 | 22 min | 43 min | Safe, conservative |
| 8 | ~37 | 14 min | 27 min | Comfortable headroom |
| **10** | **~46** | **11 min** | **22 min** | **Sweet spot** |
| 12 | ~55 | 9 min | 18 min | Close to input token limit |
| 15 | ~69 | 7 min | 14 min | Would exceed token limit |

**Recommended: concurrency 10** — 10x speedup, stays well under rate limits.

### DB Write Safety

Not a concern:
- Each write is one tiny INSERT (~1ms)
- SQLite WAL mode handles concurrent readers + sequential writers
- `busy_timeout(5000)` queues any contention
- At 10 concurrent workers, ~1 write per 1.3s — trivial load

### Script Enhancement Plan

Add `--concurrency N` flag to existing `generate-chains.ts`. Implementation:

1. **Pre-load tour data** — Read all city tour lists upfront (read-only, fast)
2. **Promise pool** — Maintain N in-flight API calls at once (no external dependency — just a simple queue)
3. **As each resolves** — Validate chain, write to DB, log, start next pair
4. **Rate limit safety** — If we get 429s, back off and reduce concurrency
5. **Resume support** — Already exists (skips pairs with existing chains unless `--regenerate`)

```
Usage:
  npx tsx src/scripts/generate-chains.ts                          # Default concurrency (10)
  npx tsx src/scripts/generate-chains.ts --concurrency 5          # Conservative
  npx tsx src/scripts/generate-chains.ts --concurrency 10 --dry-run  # Preview
```

### Cost Estimates (with parallelization)

| Tier | Chains | Cost | Time @ concurrency 10 |
|------|--------|------|----------------------|
| Launch | 500 | ~$10 | ~11 min |
| Growth | 1,000 | ~$20 | ~22 min |
| Full | 2,000 | ~$40 | ~43 min |

---

## Execution Steps (When Ready)

1. **Finalize city pool** — Curate list, review, adjust
2. **Generate pair list** — Script to create cross-continent pairs from pool
3. **Enhance generator** — Add `--concurrency` flag to `generate-chains.ts`
4. **Test batch** — Generate ~10 chains, review quality with full 136K dataset
5. **UI enhancement** — Add one-liner to chain detail cards
6. **Full generation** — Run generator on all pairs (~11 min for 500 chains at concurrency 10)
7. **Quality spot-check** — Review ~10% of chains
8. **Redeploy DB** — `bash deployment/scripts/deploy-db.sh 143.244.186.165`
9. **Verify live** — Check gallery and detail pages on production

---

## Decisions Made

- [x] **Chain count for launch** — ~500. Evaluate, then expand to 1,000+ if needed.
- [x] **Show one-liner on chain detail** — Yes, both web and iOS. Small code change, big delight gain.
- [x] **Gallery UX** — NOT a wall of 500 cards. Curated display (like World's Most superlatives pattern) with "Surprise Me" drawing from the full pool.

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

## Open Decisions

- [ ] **City pool composition** — Which ~100 cities? (thematic richness data above informs this)
- [ ] **Gallery categories** — By continent pair? By theme? Editor's picks?
- [ ] **Daily featured chain?** — Static gallery for now, or highlight one per day?

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
