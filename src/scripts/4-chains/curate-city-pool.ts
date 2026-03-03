// ============================================================
// City Pool Curator — AI-Assisted Endpoint Selection
//
// Sends all 910 city profiles to Claude and asks it to curate
// ~96 endpoint cities for Six Degrees chain generation.
//
// Usage:
//   npx tsx src/scripts/4-chains/curate-city-pool.ts          # Run curation
//   npx tsx src/scripts/4-chains/curate-city-pool.ts --dry-run # Preview prompt only
//
// Output: src/scripts/4-chains/city-pool.json
// ============================================================

import { loadEnv } from "../../lib/env";
import { getDb } from "../../lib/db";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

loadEnv();

const MODEL = "claude-sonnet-4-6";

// Cities where Viator merges multiple real-world places into one entry
const COLLISION_CITIES = [
  "Naples", "La Paz", "San Jose", "Portland", "Lagos", "Santa Cruz",
];

// Viator classifies Middle East under Africa — correct to Asia
const CONTINENT_OVERRIDES: Record<string, string> = {
  "Dubai": "Asia",
  "Muscat": "Asia",
  "Amman": "Asia",
  "Baku": "Asia",
  "Doha": "Asia",
};

interface CityProfile {
  destination_name: string;
  country: string;
  continent: string;
  tour_count: number;
  themes_json: string;
  personality: string;
}

function getAllCityProfiles(): CityProfile[] {
  const db = getDb(true);
  const rows = db.prepare(`
    SELECT destination_name, country, continent, tour_count, themes_json, personality
    FROM city_profiles
    ORDER BY continent, country, destination_name
  `).all() as CityProfile[];
  db.close();
  return rows;
}

function formatCityForPrompt(city: CityProfile): string {
  const themes = JSON.parse(city.themes_json) as string[];
  const continent = CONTINENT_OVERRIDES[city.destination_name] || city.continent;
  const collision = COLLISION_CITIES.includes(city.destination_name) ? " [NAME COLLISION — EXCLUDE]" : "";
  return `${city.destination_name} | ${city.country} | ${continent} | ${city.tour_count} tours | ${themes.length} themes: ${themes.join(", ")} | "${city.personality}"${collision}`;
}

const SYSTEM_PROMPT = `You are a travel curator selecting endpoint cities for a "Six Degrees of Anywhere" feature — chains connecting two cities through 3 intermediate stops via thematic tour connections.

Your job: select ~96 endpoint cities from the list of 910 cities I'll provide. These endpoints define which city PAIRS we generate chains for. The intermediate stops are unconstrained (any of the 910 cities can be an intermediate), so you're only picking the "A" and "B" cities.

## How These Cities Will Be Used

After curation, we generate ~500 cross-continent pairs from this pool:
- Every pair MUST be cross-continent (Tokyo↔Buenos Aires, not Tokyo↔Kyoto)
- Each city appears in 8-12 chains
- We need enough cities per continent to create diverse pairings without repetition

This means EVERY continent needs meaningful representation. A continent with only 2 cities gets paired with the same cities repeatedly. Caribbean with 0 cities means an entire region of the world is invisible.

## Three Tiers

**Anchors (~28 cities)** — Cities everyone recognizes. If someone's never traveled, they still know these names. The "of course that's on the list" cities.

**Gems (~39 cities)** — Aspirational destinations that evoke wanderlust. Travelers dream of visiting these. Not household names globally, but anyone who's traveled knows them. The "ooh, I've always wanted to go there" cities.

**Surprises (~29 cities)** — Small or unexpected cities that make people go "wait, THAT exists?" High thematic richness relative to their size. The "I had no idea you could do that there" cities. These are what make the feature special.

## Constraints

YOU MUST FILL EACH CONTINENT'S QUOTA EXACTLY. Select cities continent-by-continent.

### Continent quotas (EXACT numbers):

**Europe — pick exactly 26 cities** (mix of anchors, gems, surprises)
**Asia — pick exactly 20 cities** (includes Middle East: UAE, Qatar, Oman, Jordan, Israel, Saudi Arabia, Azerbaijan)
**North America — pick exactly 10 cities** (USA, Mexico, Canada, Costa Rica — these have great cities, don't skip them!)
**South America — pick exactly 10 cities**
**Africa — pick exactly 8 cities** (TRUE Africa only — Morocco, Egypt, Kenya, Tanzania, Ethiopia, etc. Middle East countries are NOT Africa.)
**Caribbean — pick exactly 5 cities** (islands: Puerto Rico, Bahamas, Trinidad, Curaçao, Dominica, etc.)
**Oceania — pick exactly 5 cities** (Australia, New Zealand, Fiji, etc.)

That's 84 cities. You may add up to 12 more (to any continents) to reach ~96 total. Spread bonus cities where you see the most compelling options.

### Within each continent, assign tiers:
- ~30% Anchors (iconic, everyone knows them)
- ~40% Gems (aspirational, travelers dream of these)
- ~30% Surprises (small, unexpected, "wait THAT exists?")

### Other rules:

1. **Country caps: max 4 per country, prefer 3.** Spread picks across dramatically different cities.

2. **Exclude name-collision cities** marked [NAME COLLISION — EXCLUDE].

3. **Only pick cities that appear in the data.** Do NOT invent cities. Every city in your output must match a city name from the list I provide.

4. **Thematic diversity**: Include cities known for cuisine, sacred sites, dark tourism, wildlife, extreme nature, craftsmanship, nightlife, ancient history, street art, wellness, etc.

5. **For Middle East cities**: write "Asia" as the continent in your JSON output. These countries are Asia: UAE, Qatar, Oman, Jordan, Israel, Saudi Arabia, Azerbaijan, Bahrain, Kuwait.

6. **Personality matters**: Read each city's personality line. Pick cities with compelling, surprising stories.

## Output Format

Return ONLY valid JSON, no markdown fences, no backticks:

{
  "anchors": [
    { "city": "London", "country": "United Kingdom", "continent": "Europe", "reason": "Global icon, 2000 years of layers" }
  ],
  "gems": [ ... ],
  "surprises": [ ... ]
}

For the "continent" field, use the CORRECTED continent (e.g., Dubai should say "Asia", not "Africa").

The "reason" should be a brief (under 80 chars) note on why this city belongs in its tier. For Surprises, explain what makes it surprising.`;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("Loading city profiles...");
  const cities = getAllCityProfiles();
  console.log(`Loaded ${cities.length} city profiles`);

  const collisionCount = cities.filter(c => COLLISION_CITIES.includes(c.destination_name)).length;
  console.log(`Name-collision cities marked for exclusion: ${collisionCount}`);

  // Group cities by continent (with overrides applied)
  const byContinent: Record<string, CityProfile[]> = {};
  for (const city of cities) {
    const continent = CONTINENT_OVERRIDES[city.destination_name] || city.continent;
    if (!byContinent[continent]) byContinent[continent] = [];
    byContinent[continent].push(city);
  }

  // Build continent-grouped prompt
  const continentSections: string[] = [];
  const continentOrder = ["Europe", "Asia", "North America", "South America", "Africa", "Caribbean", "Oceania"];
  const quotas: Record<string, number> = {
    "Europe": 26, "Asia": 20, "North America": 10,
    "South America": 10, "Africa": 8, "Caribbean": 5, "Oceania": 5,
  };

  for (const continent of continentOrder) {
    const citiesInContinent = byContinent[continent] || [];
    const quota = quotas[continent] || 5;
    continentSections.push(
      `\n=== ${continent.toUpperCase()} — PICK EXACTLY ${quota} CITIES (from ${citiesInContinent.length} available) ===\n` +
      citiesInContinent.map(formatCityForPrompt).join("\n")
    );
  }

  const userPrompt = `Here are all ${cities.length} city profiles, GROUPED BY CONTINENT. Pick the exact number specified for each continent.

${continentSections.join("\n")}

Return the curated pool as JSON. Group all picks into anchors/gems/surprises arrays (NOT by continent).`;

  // Token estimate
  const estimatedTokens = Math.round((SYSTEM_PROMPT.length + userPrompt.length) / 4);
  console.log(`\nEstimated input: ~${estimatedTokens.toLocaleString()} tokens`);

  if (dryRun) {
    console.log("\n--- DRY RUN: System prompt ---");
    console.log(SYSTEM_PROMPT);
    console.log("\n--- DRY RUN: First 20 city lines ---");
    console.log(cities.slice(0, 20).map(formatCityForPrompt).join("\n"));
    console.log(`\n... and ${cities.length - 20} more cities`);
    console.log("\nDry run complete. Run without --dry-run to call Claude.");
    return;
  }

  console.log(`\nCalling Claude (${MODEL})...`);
  const startTime = Date.now();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Response received in ${elapsed}s`);

  // Extract text
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Parse JSON — strip markdown fences if present
  let jsonText = text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  let pool: { anchors: any[]; gems: any[]; surprises: any[] };
  try {
    pool = JSON.parse(jsonText);
  } catch {
    console.error("Failed to parse JSON response. Raw text:");
    console.error(text);
    return;
  }

  // Validate
  const allCities = [...pool.anchors, ...pool.gems, ...pool.surprises];
  const cityNames = new Set(allCities.map((c: any) => c.city));

  console.log(`\n=== Results ===`);
  console.log(`Anchors:   ${pool.anchors.length}`);
  console.log(`Gems:      ${pool.gems.length}`);
  console.log(`Surprises: ${pool.surprises.length}`);
  console.log(`Total:     ${allCities.length}`);

  // Check for duplicates
  if (cityNames.size !== allCities.length) {
    console.log(`\nWARNING: ${allCities.length - cityNames.size} duplicate cities detected!`);
  }

  // Check all cities exist in DB
  const dbCities = new Set(cities.map(c => c.destination_name));
  const missing = allCities.filter((c: any) => !dbCities.has(c.city));
  if (missing.length > 0) {
    console.log(`\nWARNING: ${missing.length} cities not found in DB:`);
    missing.forEach((c: any) => console.log(`  - ${c.city} (${c.country})`));
  }

  // Continent distribution
  console.log(`\nContinent distribution:`);
  const byCont: Record<string, { a: number; g: number; s: number }> = {};
  for (const c of pool.anchors) {
    const cont = CONTINENT_OVERRIDES[c.city] || c.continent;
    byCont[cont] = byCont[cont] || { a: 0, g: 0, s: 0 };
    byCont[cont].a++;
  }
  for (const c of pool.gems) {
    const cont = CONTINENT_OVERRIDES[c.city] || c.continent;
    byCont[cont] = byCont[cont] || { a: 0, g: 0, s: 0 };
    byCont[cont].g++;
  }
  for (const c of pool.surprises) {
    const cont = CONTINENT_OVERRIDES[c.city] || c.continent;
    byCont[cont] = byCont[cont] || { a: 0, g: 0, s: 0 };
    byCont[cont].s++;
  }
  for (const [cont, counts] of Object.entries(byCont).sort()) {
    const total = counts.a + counts.g + counts.s;
    console.log(`  ${cont.padEnd(16)} A:${counts.a}  G:${counts.g}  S:${counts.s}  = ${total}`);
  }

  // Country distribution
  const byCountry: Record<string, number> = {};
  for (const c of allCities) {
    byCountry[c.country] = (byCountry[c.country] || 0) + 1;
  }
  const overCap = Object.entries(byCountry).filter(([, n]) => n > 4);
  if (overCap.length > 0) {
    console.log(`\nWARNING: Countries over cap (>4):`);
    overCap.forEach(([country, n]) => console.log(`  ${country}: ${n}`));
  }

  // Print full selection
  console.log(`\n--- ANCHORS (${pool.anchors.length}) ---`);
  for (const c of pool.anchors) {
    console.log(`  ${c.city}, ${c.country} — ${c.reason}`);
  }
  console.log(`\n--- GEMS (${pool.gems.length}) ---`);
  for (const c of pool.gems) {
    console.log(`  ${c.city}, ${c.country} — ${c.reason}`);
  }
  console.log(`\n--- SURPRISES (${pool.surprises.length}) ---`);
  for (const c of pool.surprises) {
    console.log(`  ${c.city}, ${c.country} — ${c.reason}`);
  }

  // Write output
  const output = {
    version: 1,
    generated: new Date().toISOString().slice(0, 10),
    notes: "AI-curated endpoint pool for Six Degrees chains. Intermediates unconstrained (any of 910 cities).",
    continent_overrides: CONTINENT_OVERRIDES,
    anchors: pool.anchors,
    gems: pool.gems,
    surprises: pool.surprises,
  };

  const outPath = path.resolve(__dirname, "city-pool.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nWritten to ${outPath}`);

  // Usage stats
  console.log(`\nToken usage: ${response.usage.input_tokens.toLocaleString()} input, ${response.usage.output_tokens.toLocaleString()} output`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
