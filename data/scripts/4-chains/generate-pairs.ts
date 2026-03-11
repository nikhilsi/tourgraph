// ============================================================
// Pair Generator — Cross-Continent Endpoint Pairing
//
// Generates ~500 pairs from the 100-city endpoint pool.
// Two algorithms: balanced random vs. thematic-distance scoring.
// Compare outputs to pick the best approach.
//
// Usage:
//   npx tsx src/scripts/4-chains/generate-pairs.ts                # Default: scored approach
//   npx tsx src/scripts/4-chains/generate-pairs.ts --random       # Balanced random approach
//   npx tsx src/scripts/4-chains/generate-pairs.ts --compare      # Run both, compare side-by-side
//   npx tsx src/scripts/4-chains/generate-pairs.ts --dry-run      # Stats only, don't write
//
// Output: src/scripts/4-chains/chain-pairs.json
// ============================================================

import { getDb } from "../../lib/db";
import fs from "fs";
import path from "path";

const TARGET_PAIRS = 500;
const MIN_PER_CITY = 8;
const MAX_PER_CITY = 12;
const TARGET_PER_CITY = 10;
const SEED = 42; // Fixed seed for reproducibility

// ============================================================
// Seeded random (deterministic)
// ============================================================

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ============================================================
// Data loading
// ============================================================

interface PoolCity {
  city: string;
  country: string;
  continent: string; // corrected continent
  tier: "anchor" | "gem" | "surprise";
  themes: string[];
}

function loadPool(): PoolCity[] {
  const poolPath = path.resolve(__dirname, "city-pool.json");
  const raw = JSON.parse(fs.readFileSync(poolPath, "utf-8"));
  const overrides: Record<string, string> = raw.continent_overrides || {};

  const cities: PoolCity[] = [];
  for (const tier of ["anchors", "gems", "surprises"] as const) {
    const tierName = tier.slice(0, -1) as "anchor" | "gem" | "surprise";
    for (const c of raw[tier]) {
      cities.push({
        city: c.city,
        country: c.country,
        continent: overrides[c.city] || c.continent,
        tier: tierName,
        themes: [], // filled from DB below
      });
    }
  }
  return cities;
}

function loadThemes(cities: PoolCity[]): void {
  const db = getDb(true);
  for (const c of cities) {
    const row = db
      .prepare("SELECT themes_json FROM city_profiles WHERE destination_name = ?")
      .get(c.city) as { themes_json: string } | undefined;
    if (row) {
      c.themes = JSON.parse(row.themes_json);
    }
  }
  db.close();
}

// ============================================================
// Valid pairs generation
// ============================================================

type Pair = [string, string];

function normalize(a: string, b: string): Pair {
  return a < b ? [a, b] : [b, a];
}

function getAllValidPairs(cities: PoolCity[]): Pair[] {
  const pairs: Pair[] = [];
  const cityMap = new Map(cities.map((c) => [c.city, c]));

  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const a = cities[i];
      const b = cities[j];
      // Cross-continent mandatory
      if (a.continent === b.continent) continue;
      // No same-country
      if (a.country === b.country) continue;
      pairs.push(normalize(a.city, b.city));
    }
  }
  return pairs;
}

// ============================================================
// Scoring
// ============================================================

function jaccardDistance(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 1;
  return 1 - intersection / union;
}

function tierMixScore(tierA: string, tierB: string): number {
  // Anchor↔Surprise is most delightful
  const mix = [tierA, tierB].sort().join("+");
  if (mix === "anchor+surprise") return 0.3;
  if (mix === "gem+surprise") return 0.2;
  if (mix === "anchor+gem") return 0.1;
  return 0; // same tier
}

function scorePair(a: PoolCity, b: PoolCity): number {
  const thematicDist = jaccardDistance(a.themes, b.themes);
  const tierBonus = tierMixScore(a.tier, b.tier);
  // Slight bonus for cross-continent distance (different continent pairs get variety)
  return thematicDist + tierBonus;
}

// ============================================================
// Approach 1: Balanced Random
// ============================================================

function balancedRandom(
  validPairs: Pair[],
  cities: PoolCity[],
  rng: () => number
): Pair[] {
  const selected: Pair[] = [];
  const counts = new Map<string, number>();
  for (const c of cities) counts.set(c.city, 0);

  // Shuffle pairs
  const shuffled = [...validPairs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Pass 1: Add pairs where both cities are underpaired
  for (const pair of shuffled) {
    if (selected.length >= TARGET_PAIRS) break;
    const [a, b] = pair;
    const ca = counts.get(a)!;
    const cb = counts.get(b)!;
    if (ca < TARGET_PER_CITY && cb < TARGET_PER_CITY) {
      selected.push(pair);
      counts.set(a, ca + 1);
      counts.set(b, cb + 1);
    }
  }

  // Pass 2: Fill remaining, allow up to MAX_PER_CITY
  if (selected.length < TARGET_PAIRS) {
    const remaining = shuffled.filter(
      (p) => !selected.some((s) => s[0] === p[0] && s[1] === p[1])
    );
    for (const pair of remaining) {
      if (selected.length >= TARGET_PAIRS) break;
      const [a, b] = pair;
      const ca = counts.get(a)!;
      const cb = counts.get(b)!;
      if (ca < MAX_PER_CITY && cb < MAX_PER_CITY) {
        selected.push(pair);
        counts.set(a, ca + 1);
        counts.set(b, cb + 1);
      }
    }
  }

  return selected;
}

// ============================================================
// Approach 4: Score + Greedy Select
// ============================================================

function scoredGreedy(
  validPairs: Pair[],
  cities: PoolCity[]
): Pair[] {
  const cityMap = new Map(cities.map((c) => [c.city, c]));
  const counts = new Map<string, number>();
  for (const c of cities) counts.set(c.city, 0);

  // Track continent-pair diversity
  const continentPairCounts = new Map<string, number>();

  // Build adjacency: for each city, its valid pairs sorted by score
  const pairsForCity = new Map<string, { partner: string; score: number }[]>();
  for (const c of cities) pairsForCity.set(c.city, []);

  for (const pair of validPairs) {
    const a = cityMap.get(pair[0])!;
    const b = cityMap.get(pair[1])!;
    const score = scorePair(a, b);
    pairsForCity.get(pair[0])!.push({ partner: pair[1], score });
    pairsForCity.get(pair[1])!.push({ partner: pair[0], score });
  }

  // Sort each city's options by score descending
  for (const options of pairsForCity.values()) {
    options.sort((a, b) => b.score - a.score);
  }

  const selected: Pair[] = [];
  const selectedSet = new Set<string>();

  // Round-robin: repeatedly pick the most underpaired city,
  // then choose its highest-scoring available partner
  while (selected.length < TARGET_PAIRS) {
    // Find the most underpaired city (lowest count, break ties randomly)
    let minCount = Infinity;
    for (const [, count] of counts) {
      if (count < minCount) minCount = count;
    }

    // All cities at or above target? Raise the bar
    if (minCount >= TARGET_PER_CITY) {
      // Check if we can still add pairs under MAX
      const canAdd = [...counts.entries()].some(([, c]) => c < MAX_PER_CITY);
      if (!canAdd) break;
    }

    // Get all cities at minimum count
    const underpaired = [...counts.entries()]
      .filter(([, c]) => c === minCount && c < MAX_PER_CITY)
      .map(([city]) => city);

    if (underpaired.length === 0) break;

    // Try each underpaired city, pick the best available pair
    let bestPair: Pair | null = null;
    let bestScore = -1;

    for (const city of underpaired) {
      const options = pairsForCity.get(city)!;
      for (const opt of options) {
        const pairKey = normalize(city, opt.partner).join("|");
        if (selectedSet.has(pairKey)) continue;

        const partnerCount = counts.get(opt.partner)!;
        if (partnerCount >= MAX_PER_CITY) continue;

        // Continent pair diversity check
        const contA = cityMap.get(city)!.continent;
        const contB = cityMap.get(opt.partner)!.continent;
        const contPairKey = [contA, contB].sort().join("↔");
        const contPairCount = continentPairCounts.get(contPairKey) || 0;
        if (contPairCount > TARGET_PAIRS * 0.2 && selected.length < TARGET_PAIRS * 0.9) {
          continue;
        }

        // Boost score for partners that are also underpaired
        let adjustedScore = opt.score;
        if (partnerCount < TARGET_PER_CITY) adjustedScore += 0.2;
        if (partnerCount < MIN_PER_CITY) adjustedScore += 0.3;

        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestPair = normalize(city, opt.partner);
        }
        break; // Take this city's best option (already sorted by score)
      }
    }

    if (!bestPair) break; // No valid pairs left

    selected.push(bestPair);
    selectedSet.add(bestPair.join("|"));
    counts.set(bestPair[0], counts.get(bestPair[0])! + 1);
    counts.set(bestPair[1], counts.get(bestPair[1])! + 1);

    const contA = cityMap.get(bestPair[0])!.continent;
    const contB = cityMap.get(bestPair[1])!.continent;
    const contPairKey = [contA, contB].sort().join("↔");
    continentPairCounts.set(contPairKey, (continentPairCounts.get(contPairKey) || 0) + 1);
  }

  return selected;
}

// ============================================================
// Stats & Reporting
// ============================================================

function reportStats(
  label: string,
  pairs: Pair[],
  cities: PoolCity[]
): void {
  const cityMap = new Map(cities.map((c) => [c.city, c]));
  const counts = new Map<string, number>();
  for (const c of cities) counts.set(c.city, 0);
  for (const [a, b] of pairs) {
    counts.set(a, (counts.get(a) || 0) + 1);
    counts.set(b, (counts.get(b) || 0) + 1);
  }

  const countValues = [...counts.values()];
  const min = Math.min(...countValues);
  const max = Math.max(...countValues);
  const avg = (countValues.reduce((a, b) => a + b, 0) / countValues.length).toFixed(1);
  const underMin = countValues.filter((v) => v < MIN_PER_CITY).length;
  const overMax = countValues.filter((v) => v > MAX_PER_CITY).length;
  const inRange = countValues.filter((v) => v >= MIN_PER_CITY && v <= MAX_PER_CITY).length;

  // Continent pair distribution
  const contPairs = new Map<string, number>();
  for (const [a, b] of pairs) {
    const ca = cityMap.get(a)!.continent;
    const cb = cityMap.get(b)!.continent;
    const key = [ca, cb].sort().join("↔");
    contPairs.set(key, (contPairs.get(key) || 0) + 1);
  }

  // Tier mix distribution
  const tierMixes = new Map<string, number>();
  for (const [a, b] of pairs) {
    const ta = cityMap.get(a)!.tier;
    const tb = cityMap.get(b)!.tier;
    const key = [ta, tb].sort().join("↔");
    tierMixes.set(key, (tierMixes.get(key) || 0) + 1);
  }

  // Average thematic distance
  let totalDist = 0;
  for (const [a, b] of pairs) {
    const ca = cityMap.get(a)!;
    const cb = cityMap.get(b)!;
    totalDist += jaccardDistance(ca.themes, cb.themes);
  }
  const avgDist = (totalDist / pairs.length).toFixed(3);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Total pairs: ${pairs.length}`);
  console.log(`  Per-city: min=${min}, max=${max}, avg=${avg}`);
  console.log(`  In range (${MIN_PER_CITY}-${MAX_PER_CITY}): ${inRange}/100, under: ${underMin}, over: ${overMax}`);
  console.log(`  Avg thematic distance: ${avgDist}`);

  console.log(`\n  Continent pairs:`);
  for (const [key, count] of [...contPairs.entries()].sort((a, b) => b[1] - a[1])) {
    const pct = ((count / pairs.length) * 100).toFixed(1);
    console.log(`    ${key.padEnd(30)} ${String(count).padStart(4)} (${pct}%)`);
  }

  console.log(`\n  Tier mixes:`);
  for (const [key, count] of [...tierMixes.entries()].sort((a, b) => b[1] - a[1])) {
    const pct = ((count / pairs.length) * 100).toFixed(1);
    console.log(`    ${key.padEnd(25)} ${String(count).padStart(4)} (${pct}%)`);
  }

  // Sample 10 pairs
  console.log(`\n  Sample pairs (first 10):`);
  for (const [a, b] of pairs.slice(0, 10)) {
    const ca = cityMap.get(a)!;
    const cb = cityMap.get(b)!;
    const dist = jaccardDistance(ca.themes, cb.themes).toFixed(2);
    console.log(`    ${a} (${ca.tier}/${ca.continent}) ↔ ${b} (${cb.tier}/${cb.continent})  dist=${dist}`);
  }
}

// ============================================================
// Main
// ============================================================

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes("--random")
    ? "random"
    : args.includes("--compare")
    ? "compare"
    : "scored";
  const dryRun = args.includes("--dry-run");

  console.log("Loading city pool...");
  const cities = loadPool();
  console.log(`Loaded ${cities.length} cities`);

  console.log("Loading themes from DB...");
  loadThemes(cities);
  const withThemes = cities.filter((c) => c.themes.length > 0);
  console.log(`${withThemes.length} cities have theme data`);

  console.log("Generating valid pairs...");
  const validPairs = getAllValidPairs(cities);
  console.log(`${validPairs.length} valid cross-continent pairs`);

  const rng = createRng(SEED);

  if (mode === "compare" || mode === "random") {
    const randomPairs = balancedRandom(validPairs, cities, rng);
    reportStats("APPROACH 1: Balanced Random", randomPairs, cities);
  }

  if (mode === "compare" || mode === "scored") {
    const scoredPairs = scoredGreedy(validPairs, cities);
    reportStats("APPROACH 4: Score + Greedy Select", scoredPairs, cities);
  }

  // Write the winning approach (or the one requested)
  if (!dryRun) {
    const rng2 = createRng(SEED);
    const finalPairs =
      mode === "random"
        ? balancedRandom(validPairs, cities, rng2)
        : scoredGreedy(validPairs, cities);

    const outPath = path.resolve(__dirname, "chain-pairs.json");
    fs.writeFileSync(outPath, JSON.stringify(finalPairs, null, 2) + "\n");
    console.log(`\nWritten ${finalPairs.length} pairs to ${outPath}`);
  } else {
    console.log("\nDry run — no file written.");
  }
}

main();
