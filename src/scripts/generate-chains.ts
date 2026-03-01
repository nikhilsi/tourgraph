// ============================================================
// Six Degrees Chain Generator
//
// Generates curated chains for Six Degrees of Anywhere feature.
// Reads city pairs from a JSON config, calls Claude to generate
// thematic chains, and stores results in six_degrees_chains table.
//
// Usage:
//   npx tsx src/scripts/generate-chains.ts                    # Generate all pairs in config
//   npx tsx src/scripts/generate-chains.ts --pair "Tokyo" "Rome"  # Generate one pair
//   npx tsx src/scripts/generate-chains.ts --dry-run          # Preview pairs, don't generate
//   npx tsx src/scripts/generate-chains.ts --list-cities      # Show available cities
//
// Config: src/scripts/chain-pairs.json (array of [cityFrom, cityTo] tuples)
//
// Logs: Output written to both console and logs/chains-<timestamp>.log
// ============================================================

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

loadEnv();

const MODEL = process.env.CLAUDE_MODEL_CHAIN || "claude-sonnet-4-6";
const MAX_RETRIES = 2;

// ============================================================
// Logging — tee to console + file
// ============================================================

let logStream: fs.WriteStream | null = null;

function initLogging(): string {
  const logsDir = path.resolve("logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const logPath = path.join(logsDir, `chains-${timestamp}.log`);
  logStream = fs.createWriteStream(logPath, { flags: "a" });
  return logPath;
}

function log(msg: string): void {
  console.log(msg);
  logStream?.write(msg + "\n");
}

function logError(msg: string): void {
  console.error(msg);
  logStream?.write(msg + "\n");
}

// ============================================================
// Types
// ============================================================

interface TourSummary {
  id: number;
  title: string;
  destination_name: string;
  country: string;
  rating: number | null;
  review_count: number | null;
  from_price: number | null;
}

interface ChainLink {
  city: string;
  country: string;
  tour_title: string;
  tour_id: number;
  connection_to_next: string | null;
  theme: string;
}

interface ChainResult {
  city_from: string;
  city_to: string;
  chain: ChainLink[];
  summary: string;
}

// ============================================================
// DB Queries
// ============================================================

function getAvailableCities(): { name: string; country: string; count: number }[] {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT destination_name as name, country, COUNT(*) as count
       FROM tours WHERE status = 'active' AND image_url IS NOT NULL
       GROUP BY destination_name
       HAVING count >= 10
       ORDER BY count DESC`
    )
    .all() as { name: string; country: string; count: number }[];
}

function getToursForCity(city: string, limit = 30): TourSummary[] {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT id, title, destination_name, country, rating, review_count, from_price
       FROM tours
       WHERE status = 'active' AND destination_name = ? AND image_url IS NOT NULL
       ORDER BY rating DESC, review_count DESC
       LIMIT ?`
    )
    .all(city, limit) as TourSummary[];
}

function getIntermediateTours(
  excludeCities: string[],
  limit = 15
): Map<string, TourSummary[]> {
  const db = getDb(true);
  const cities = getAvailableCities().filter(
    (c) => !excludeCities.includes(c.name)
  );

  const result = new Map<string, TourSummary[]>();
  for (const city of cities) {
    const tours = db
      .prepare(
        `SELECT id, title, destination_name, country, rating, review_count, from_price
         FROM tours
         WHERE status = 'active' AND destination_name = ? AND image_url IS NOT NULL
         ORDER BY rating DESC, review_count DESC
         LIMIT ?`
      )
      .all(city.name, limit) as TourSummary[];
    if (tours.length > 0) {
      result.set(city.name, tours);
    }
  }
  return result;
}

function formatToursForPrompt(city: string, tours: TourSummary[]): string {
  const lines = tours.map(
    (t) =>
      `  [${t.id}] "${t.title}" — ${t.rating?.toFixed(1) ?? "?"} stars, ${t.review_count ?? 0} reviews, $${t.from_price ?? "?"}`
  );
  return `${city}:\n${lines.join("\n")}`;
}

/** Normalize pair for dedup: alphabetical order */
function normalizePair(a: string, b: string): [string, string] {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
}

function chainExists(cityFrom: string, cityTo: string): boolean {
  const db = getDb(true);
  const [a, b] = normalizePair(cityFrom, cityTo);
  const row = db
    .prepare(
      `SELECT id FROM six_degrees_chains WHERE city_from = ? AND city_to = ?`
    )
    .get(a, b);
  return !!row;
}

function saveChain(result: ChainResult): void {
  const db = getDb();
  const [a, b] = normalizePair(result.city_from, result.city_to);

  // Store with normalized order; UI reverses if needed
  const chainData = {
    city_from: result.city_from,
    city_to: result.city_to,
    chain: result.chain,
    summary: result.summary,
  };

  db.prepare(
    `INSERT INTO six_degrees_chains (city_from, city_to, chain_json, generated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(city_from, city_to) DO UPDATE SET
       chain_json = excluded.chain_json,
       generated_at = excluded.generated_at`
  ).run(a, b, JSON.stringify(chainData));
}

// ============================================================
// Chain Generation (Claude)
// ============================================================

async function generateChain(
  client: Anthropic,
  cityFrom: string,
  cityTo: string
): Promise<ChainResult | null> {
  const toursFrom = getToursForCity(cityFrom);
  const toursTo = getToursForCity(cityTo);

  if (toursFrom.length === 0) {
    logError(`  No tours found for "${cityFrom}" — skipping`);
    return null;
  }
  if (toursTo.length === 0) {
    logError(`  No tours found for "${cityTo}" — skipping`);
    return null;
  }

  // Build tour data for prompt
  const tourSections: string[] = [];
  tourSections.push(formatToursForPrompt(cityFrom, toursFrom));
  tourSections.push(formatToursForPrompt(cityTo, toursTo));

  // Add intermediate cities (shuffle and cap at 20)
  const intermediateTours = getIntermediateTours([cityFrom, cityTo]);
  const shuffled = [...intermediateTours.keys()].sort(() => Math.random() - 0.5).slice(0, 20);
  for (const city of shuffled) {
    tourSections.push(formatToursForPrompt(city, intermediateTours.get(city)!));
  }

  const systemPrompt = `You are a creative travel writer who finds surprising thematic connections between cities around the world. Your tone is warm, witty, and wonder-filled — like a friend sharing travel discoveries over drinks.

Your job: given two cities, build a chain of real tours that connects them through surprising thematic links across MULTIPLE intermediate cities.

HARD RULES:
1. The chain MUST have exactly 5 stops (including the start and end cities, plus 3 intermediate cities).
2. Every stop MUST be in a DIFFERENT city. Never repeat a city.
3. Every connection MUST use a DIFFERENT theme. Never repeat a theme.
4. You MUST only use tours from the provided list. Each tour has an [id] — include it.

Themes to choose from (use a different one for each connection): cuisine, street food, ancient history, colonial history, sacred spaces, markets/bazaars, street art, nightlife, water activities, hiking/nature, wine/spirits, music, dance, craftsmanship, architecture, wildlife, festivals, meditation/wellness, photography, dark tourism/ghost tours.

The chain should feel like a journey of discovery — each connection should make someone think "oh wow, I see the connection!" Not obvious geographic proximity, but genuine cultural/thematic threads.

Pick tours that best represent the thematic connection, not just highly rated ones.`;

  const userPrompt = `Connect ${cityFrom} to ${cityTo} using ONLY tours from this list.

AVAILABLE TOURS:
${tourSections.join("\n\n")}

Build a chain of EXACTLY 5 stops: ${cityFrom} → City2 → City3 → City4 → ${cityTo}. Each adjacent pair must share a surprising thematic connection using a DIFFERENT theme. All 5 cities must be different.

Respond in this exact JSON format:
{
  "chain": [
    {
      "city": "City Name",
      "country": "Country",
      "tour_title": "Exact tour title from the list",
      "tour_id": 123,
      "connection_to_next": "A witty 1-2 sentence description of the thematic link to the next city. null for the last stop.",
      "theme": "one-word theme like 'cuisine' or 'sacred'"
    }
  ],
  "summary": "A witty one-line summary of the entire chain, e.g. 'From sushi to pasta, connected by ancient temples and street art'"
}

Remember: EXACTLY 5 stops, 4 different themes, 5 different cities. Only return valid JSON. No markdown code fences.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : null;

  if (!text) {
    logError(`  Empty response from Claude`);
    return null;
  }

  // Parse JSON (strip markdown fences if present)
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as { chain: ChainLink[]; summary: string };

  // Validate chain structure
  if (!parsed.chain || parsed.chain.length !== 5) {
    logError(`  Invalid chain length: ${parsed.chain?.length ?? 0} (expected 5)`);
    return null;
  }

  const cities = parsed.chain.map((l) => l.city);
  if (new Set(cities).size !== 5) {
    logError(`  Duplicate cities in chain: ${cities.join(", ")}`);
    return null;
  }

  const themes = parsed.chain.slice(0, 4).map((l) => l.theme);
  if (new Set(themes).size !== 4) {
    logError(`  Duplicate themes in chain: ${themes.join(", ")}`);
    return null;
  }

  return {
    city_from: cityFrom,
    city_to: cityTo,
    chain: parsed.chain,
    summary: parsed.summary,
  };
}

// ============================================================
// Main
// ============================================================

async function main() {
  const startTime = new Date();
  const logPath = initLogging();

  log("Six Degrees Chain Generator");
  log("===========================");
  log(`Started: ${startTime.toISOString()}`);
  log(`Log file: ${logPath}`);
  log(`Model: ${MODEL}`);
  log("");

  // --list-cities
  if (process.argv.includes("--list-cities")) {
    const cities = getAvailableCities();
    log(`${cities.length} cities with 10+ tours:\n`);
    for (const c of cities) {
      log(`  ${c.name}, ${c.country} (${c.count} tours)`);
    }
    logStream?.end();
    return;
  }

  // Determine pairs to generate
  let pairs: [string, string][];

  const pairIdx = process.argv.indexOf("--pair");
  if (pairIdx !== -1) {
    const cityFrom = process.argv[pairIdx + 1];
    const cityTo = process.argv[pairIdx + 2];
    if (!cityFrom || !cityTo) {
      logError('Usage: --pair "CityFrom" "CityTo"');
      process.exit(1);
    }
    pairs = [[cityFrom, cityTo]];
  } else {
    // Load from config file
    const configPath = path.resolve("src/scripts/chain-pairs.json");
    if (!fs.existsSync(configPath)) {
      logError(`Config file not found: ${configPath}`);
      logError(`Create it with an array of [cityFrom, cityTo] pairs, e.g.:`);
      logError(`  [["Tokyo", "Rome"], ["Paris", "Buenos Aires"]]`);
      process.exit(1);
    }
    pairs = JSON.parse(fs.readFileSync(configPath, "utf-8")) as [string, string][];
  }

  const dryRun = process.argv.includes("--dry-run");
  const skipExisting = !process.argv.includes("--regenerate");

  // Filter out existing chains unless --regenerate
  let skipped = 0;
  if (skipExisting && !dryRun) {
    pairs = pairs.filter(([a, b]) => {
      if (chainExists(a, b)) {
        skipped++;
        return false;
      }
      return true;
    });
  }

  log(`Pairs to generate: ${pairs.length}${skipped > 0 ? ` (${skipped} already exist, skipped)` : ""}`);

  if (dryRun) {
    log("\nDry run — pairs that would be generated:\n");
    for (const [a, b] of pairs) {
      const exists = chainExists(a, b);
      log(`  ${a} → ${b}${exists ? " (exists, would skip)" : ""}`);
    }
    logStream?.end();
    return;
  }

  if (pairs.length === 0) {
    log("\nNothing to generate. Use --regenerate to overwrite existing chains.");
    logStream?.end();
    return;
  }

  log("");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let generated = 0;
  let errors = 0;
  const timings: number[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const [cityFrom, cityTo] = pairs[i];
    const pairNum = i + 1;

    log(`[${pairNum}/${pairs.length}] ${cityFrom} → ${cityTo}`);

    const pairStart = Date.now();
    let result: ChainResult | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await generateChain(client, cityFrom, cityTo);
        if (result) break;

        if (attempt < MAX_RETRIES) {
          log(`  Retrying (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError(`  Error: ${msg}`);

        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          log(`  Retrying in ${delay}ms (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    const elapsed = (Date.now() - pairStart) / 1000;
    timings.push(elapsed);

    if (result) {
      saveChain(result);
      generated++;
      log(`  ✓ ${result.chain.length} stops, "${result.summary}" (${elapsed.toFixed(1)}s)`);

      // Log the chain stops
      for (let j = 0; j < result.chain.length; j++) {
        const link = result.chain[j];
        const arrow = j < result.chain.length - 1 ? ` → [${link.theme}]` : "";
        log(`    ${j + 1}. ${link.city}, ${link.country}: "${link.tour_title}" (id:${link.tour_id})${arrow}`);
      }
    } else {
      errors++;
      logError(`  ✗ Failed after ${MAX_RETRIES + 1} attempts (${elapsed.toFixed(1)}s)`);
    }

    // ETA every 10 pairs or on last pair
    if (pairNum % 10 === 0 || pairNum === pairs.length) {
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const remaining = pairs.length - pairNum;
      const etaMin = (remaining * avgTime) / 60;
      log(`\n  Progress: ${pairNum}/${pairs.length} — ${generated} generated, ${errors} errors — avg ${avgTime.toFixed(1)}s/pair${remaining > 0 ? ` — ~${etaMin.toFixed(0)} min remaining` : ""}\n`);
    }
  }

  // ============================================================
  // Final Summary
  // ============================================================

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationSec = Math.floor(durationMs / 1000);
  const durationMin = Math.floor(durationSec / 60);
  const durationRemSec = durationSec % 60;

  const db = getDb(true);
  const totalChains = (
    db.prepare("SELECT COUNT(*) as c FROM six_degrees_chains").get() as { c: number }
  ).c;

  log("==================================================");
  log("CHAIN GENERATION COMPLETE");
  log("==================================================");
  log(`  Started:           ${startTime.toISOString()}`);
  log(`  Finished:          ${endTime.toISOString()}`);
  log(`  Duration:          ${durationMin}m ${durationRemSec}s`);
  log(`  Pairs attempted:   ${pairs.length}`);
  log(`  Chains generated:  ${generated}`);
  log(`  Skipped (existing):${skipped}`);
  log(`  Errors:            ${errors}`);
  log(`  Total chains in DB:${totalChains}`);
  log(`  Model:             ${MODEL}`);
  log(`  Log file:          ${logPath}`);
  log("==================================================");

  logStream?.end();

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  logError(`Fatal error: ${err}`);
  logStream?.end();
  process.exit(1);
});
