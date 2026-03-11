// ============================================================
// Six Degrees Chain Generator — Two-Stage Pipeline (v2)
//
// Stage 1: Claude sees all 910 city profiles (~127K tokens),
//          picks 3 intermediate cities per pair.
// Stage 2: Claude gets detailed tours for 5 selected cities,
//          builds the chain.
//
// Both stages use Batch API (50% cost) + prompt caching (90%).
//
// Usage:
//   npx tsx src/scripts/4-chains/generate-chains-v2.ts                           # Full pipeline
//   npx tsx src/scripts/4-chains/generate-chains-v2.ts --pair "Tokyo" "Rome"     # Single pair (sequential)
//   npx tsx src/scripts/4-chains/generate-chains-v2.ts --limit 20               # First N pairs
//   npx tsx src/scripts/4-chains/generate-chains-v2.ts --dry-run                # Preview, no API calls
//   npx tsx src/scripts/4-chains/generate-chains-v2.ts --resume-stage1 <batch>  # Resume Stage 1
//   npx tsx src/scripts/4-chains/generate-chains-v2.ts --from-stage1 <file>     # Skip to Stage 2
//   npx tsx src/scripts/4-chains/generate-chains-v2.ts --resume-stage2 <batch> --stage1-file <file>
//
// Output: six_degrees_chains table, logs/chains-v2-<timestamp>.log
// ============================================================

import { loadEnv } from "../../lib/env";
import { getDb } from "../../lib/db";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

loadEnv();

const MODEL = process.env.CLAUDE_MODEL_CHAIN || "claude-sonnet-4-6";
const POLL_INTERVAL_MS = 30_000;
const LOG_DIR = path.resolve("../logs");

// ============================================================
// Logging — tee to console + file
// ============================================================

let logStream: fs.WriteStream | null = null;

function initLogging(): string {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logPath = path.join(LOG_DIR, `chains-v2-${ts}.log`);
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
  one_liner: string | null;
  destination_name: string;
  country: string;
  rating: number | null;
  review_count: number | null;
  from_price: number | null;
  duration_minutes: number | null;
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

interface Stage1Result {
  intermediates: string[];
  reasoning: string;
}

interface Stage1File {
  batch_id: string;
  model: string;
  created_at: string;
  pairs_submitted: number;
  results: Record<string, Stage1Result>;
  errors: Record<string, string>;
}

interface CityProfile {
  destination_name: string;
  country: string;
  continent: string;
  tour_count: number;
  personality: string;
  themes_json: string;
  standout_tours_json: string;
}

// ============================================================
// CLI helpers
// ============================================================

function getArgValue(flag: string): number | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  const val = parseInt(process.argv[idx + 1], 10);
  return isNaN(val) ? null : val;
}

function getArgString(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

/** Sanitize to Batch API custom_id format: ^[a-zA-Z0-9_-]{1,64}$ */
function sanitizeId(prefix: string, cityA: string, cityB: string): string {
  const a = cityA.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 28);
  const b = cityB.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 28);
  return `${prefix}_${a}_${b}`.slice(0, 64);
}

// ============================================================
// DB Queries (reused from generate-chains.ts)
// ============================================================

function getToursForCity(city: string, limit = 30): TourSummary[] {
  const db = getDb(true);
  const half = Math.ceil(limit / 2);

  const popular = db
    .prepare(
      `SELECT id, title, one_liner, destination_name, country, rating, review_count, from_price, duration_minutes
       FROM tours
       WHERE status = 'active' AND destination_name = ? AND image_url IS NOT NULL
       ORDER BY rating DESC, review_count DESC
       LIMIT ?`
    )
    .all(city, half) as TourSummary[];

  const popularIdList = popular.map((t) => t.id);
  const placeholders =
    popularIdList.length > 0 ? popularIdList.map(() => "?").join(",") : "0";

  const random = db
    .prepare(
      `SELECT id, title, one_liner, destination_name, country, rating, review_count, from_price, duration_minutes
       FROM tours
       WHERE status = 'active' AND destination_name = ? AND image_url IS NOT NULL
         AND id NOT IN (${placeholders})
       ORDER BY RANDOM()
       LIMIT ?`
    )
    .all(city, ...popularIdList, limit - half) as TourSummary[];

  return [...popular, ...random];
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatToursForPrompt(city: string, tours: TourSummary[]): string {
  const lines = tours.map((t) => {
    const parts = [
      `[${t.id}] "${t.title}"`,
      t.one_liner ? `  "${t.one_liner}"` : null,
      `  ${t.rating?.toFixed(1) ?? "?"} stars, ${t.review_count ?? 0} reviews, $${t.from_price ?? "?"}${t.duration_minutes ? `, ${formatDuration(t.duration_minutes)}` : ""}`,
    ].filter(Boolean);
    return parts.join("\n");
  });
  return `${city}:\n${lines.join("\n")}`;
}

function normalizePair(a: string, b: string): [string, string] {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
}

function chainExists(cityFrom: string, cityTo: string): boolean {
  const db = getDb(true);
  const [a, b] = normalizePair(cityFrom, cityTo);
  const row = db
    .prepare(
      "SELECT id FROM six_degrees_chains WHERE city_from = ? AND city_to = ?"
    )
    .get(a, b);
  return !!row;
}

function saveChain(result: ChainResult): void {
  const db = getDb();
  const [a, b] = normalizePair(result.city_from, result.city_to);

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
// Stage 1: City Picker — Prompt Construction
// ============================================================

function buildCityProfilesBlock(): string {
  const db = getDb(true);
  const rows = db
    .prepare(
      `SELECT destination_name, country, continent, tour_count,
              personality, themes_json, standout_tours_json
       FROM city_profiles ORDER BY destination_name`
    )
    .all() as CityProfile[];

  return rows
    .map((row) => {
      const themes = JSON.parse(row.themes_json) as string[];
      const standouts = JSON.parse(row.standout_tours_json) as Array<{
        tour_id: number;
        theme: string;
        reason: string;
      }>;

      const standoutLine = standouts
        .slice(0, 3)
        .map((s) => `${s.theme}: ${s.reason.slice(0, 60)}`)
        .join(", ");

      return [
        `## ${row.destination_name}, ${row.country} (${row.continent}, ${row.tour_count} tours)`,
        `"${row.personality}"`,
        `Themes: ${themes.join(", ")}`,
        `Standout: ${standoutLine}`,
      ].join("\n");
    })
    .join("\n\n");
}

const STAGE1_RULES = `You are a geography and culture expert selecting intermediate cities for thematic tour chains.

Given two endpoint cities, select exactly 3 intermediate cities to form a 5-stop chain:
  EndpointA → Intermediate1 → Intermediate2 → Intermediate3 → EndpointB

SELECTION RULES:
1. Maximize cultural distance between adjacent stops — each hop should feel like a journey
2. Geographic diversity — spread across at least 3 continents total (including endpoints). Never cluster.
3. At least one "wait, that city?" surprise — a lesser-known place that delights
4. Each intermediate should enable a different thematic connection (cuisine, sacred, craftsmanship, music, etc.)
5. Consider the standout tours — these are what Claude will choose from in the next stage. Pick cities whose standout tours connect thematically.
6. Avoid picking a city on the same continent as either endpoint unless it creates an irresistible connection
7. Avoid obvious/generic intermediate choices (no Paris→London, no Tokyo→Kyoto type adjacency)
8. Return city names EXACTLY as they appear in the profile headers below — just the city name, NOT "City, Country". For example: "Marrakech" not "Marrakech, Morocco"

CITY PROFILES (all available cities):

`;

function buildStage1SystemPrompt(): string {
  const profiles = buildCityProfilesBlock();
  return STAGE1_RULES + profiles;
}

function buildStage1UserPrompt(
  cityFrom: string,
  countryFrom: string,
  continentFrom: string,
  cityTo: string,
  countryTo: string,
  continentTo: string
): string {
  return `Select 3 intermediate cities to connect ${cityFrom} (${countryFrom}, ${continentFrom}) to ${cityTo} (${countryTo}, ${continentTo}).

Return ONLY valid JSON, no markdown fences:
{"intermediates": ["City1", "City2", "City3"], "reasoning": "Brief explanation of why these 3 cities create surprising connections"}`;
}

// ============================================================
// Stage 2: Chain Builder — Prompt (v3, from current generator)
// ============================================================

const STAGE2_SYSTEM_PROMPT = `You are a creative travel writer who finds surprising thematic connections between cities around the world. Your tone is warm, witty, and wonder-filled — like a friend sharing travel discoveries over drinks.

Your job: given two cities, build a chain of real tours that connects them through surprising thematic links across MULTIPLE intermediate cities.

HARD RULES:
1. The chain MUST have exactly 5 stops (including the start and end cities, plus 3 intermediate cities).
2. Every stop MUST be in a DIFFERENT city. Never repeat a city.
3. Every connection MUST use a DIFFERENT theme. The theme describes what LINKS two adjacent cities — not what the tour itself is about. Never repeat a theme.
4. You MUST only use tours from the provided list. Each tour has an [id] — include it.
5. Each tour also has a witty one-liner in quotes below the title. Use it to understand what the tour is really about — don't rely only on the title.

Themes to choose from (use a different one for each connection): cuisine, street food, ancient history, colonial history, sacred spaces, markets/bazaars, street art, nightlife, water activities, hiking/nature, wine/spirits, music, dance, craftsmanship, architecture, wildlife, festivals, meditation/wellness, photography, dark tourism/ghost tours.

The chain should feel like a journey of discovery — each connection should make someone think "oh wow, I see the connection!" Prioritize:
- SURPRISING connections over obvious ones
- Lesser-known, quirky tours over generic popular ones — a calligraphy workshop beats a hop-on-hop-off bus
- Cultural distance between stops — don't cluster in the same region
- Tours that genuinely embody the thematic connection`;

function buildStage2UserPrompt(
  cityFrom: string,
  cityTo: string,
  allCities: string[],
  tourSections: string[]
): string {
  return `Connect ${cityFrom} to ${cityTo} through these intermediate cities: ${allCities.slice(1, 4).join(", ")}.

The chain MUST be: ${allCities.join(" → ")}

AVAILABLE TOURS:
${tourSections.join("\n\n")}

Build the chain using EXACTLY these 5 cities in this order. Each adjacent pair must share a surprising thematic connection using a DIFFERENT theme.

Respond in this exact JSON format:
{
  "chain": [
    {
      "city": "City Name",
      "country": "Country",
      "tour_title": "Exact tour title from the list",
      "tour_id": 123,
      "connection_to_next": "A witty 1-2 sentence description of the thematic link to the next city. null for the last stop.",
      "theme": "one-word theme like 'cuisine' or 'sacred spaces'"
    }
  ],
  "summary": "A witty one-line summary of the entire chain (under 120 characters). This appears on share cards."
}

Remember: EXACTLY 5 stops, 4 different themes, 5 different cities. Only return valid JSON. No markdown code fences.`;
}

// ============================================================
// Validation
// ============================================================

/** Clean up Stage 1 intermediates — strip "City, Country" → "City" and trim */
function cleanIntermediates(intermediates: string[]): string[] {
  return intermediates.map((raw) => {
    // Strip "City, Country" pattern
    let city = raw.includes(",") ? raw.split(",")[0].trim() : raw.trim();
    return city;
  });
}

/** Validate Stage 1 output: all intermediates exist in DB */
function validateIntermediates(intermediates: string[]): string[] {
  const db = getDb(true);
  const errors: string[] = [];

  for (const city of intermediates) {
    const row = db
      .prepare(
        "SELECT destination_name FROM city_profiles WHERE destination_name = ?"
      )
      .get(city);
    if (!row) {
      errors.push(`'${city}' not found in city_profiles`);
      continue;
    }

    const tourRow = db
      .prepare(
        "SELECT COUNT(*) as c FROM tours WHERE status = 'active' AND destination_name = ? AND image_url IS NOT NULL"
      )
      .get(city) as { c: number };
    if (tourRow.c < 5) {
      errors.push(`'${city}' has only ${tourRow.c} active tours (need 5+)`);
    }
  }

  return errors;
}

/** Validate Stage 2 chain output */
function validateChain(
  parsed: { chain: ChainLink[]; summary: string },
  cityFrom: string,
  cityTo: string
): string | null {
  if (!parsed.chain || parsed.chain.length !== 5) {
    return `Invalid chain length: ${parsed.chain?.length ?? 0} (expected 5)`;
  }

  const cities = parsed.chain.map((l) => l.city);
  if (new Set(cities).size !== 5) {
    return `Duplicate cities: ${cities.join(", ")}`;
  }

  const themes = parsed.chain.slice(0, 4).map((l) => l.theme);
  if (new Set(themes).size !== 4) {
    return `Duplicate themes: ${themes.join(", ")}`;
  }

  if (!parsed.summary || parsed.summary.length === 0) {
    return "Missing summary";
  }

  return null;
}

/** Parse JSON response, stripping markdown fences if present */
function parseJSON<T>(text: string): T {
  let jsonStr = text.trim();
  // Strip markdown code fences
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  // Try direct parse first
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Claude sometimes adds text after the JSON object — extract just the JSON
    const braceStart = jsonStr.indexOf("{");
    if (braceStart === -1) throw new Error("No JSON object found in response");
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = braceStart; i < jsonStr.length; i++) {
      const ch = jsonStr[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(jsonStr.slice(braceStart, i + 1));
        }
      }
    }
    throw new Error("Unterminated JSON object in response");
  }
}

// ============================================================
// City info lookup (for Stage 1 user prompts)
// ============================================================

function getCityInfo(
  cityName: string
): { country: string; continent: string } | null {
  const db = getDb(true);
  const row = db
    .prepare(
      "SELECT country, continent FROM city_profiles WHERE destination_name = ?"
    )
    .get(cityName) as { country: string; continent: string } | undefined;
  if (!row) {
    // Fallback to tours table
    const tourRow = db
      .prepare(
        "SELECT country, continent FROM tours WHERE destination_name = ? LIMIT 1"
      )
      .get(cityName) as { country: string; continent: string } | undefined;
    return tourRow ?? null;
  }
  return row;
}

// ============================================================
// Sequential Mode (--pair) — Direct API Calls
// ============================================================

async function runSequential(
  client: Anthropic,
  cityFrom: string,
  cityTo: string,
  stage1SystemPrompt: string
): Promise<ChainResult | null> {
  // Stage 1: Pick intermediates
  log(`\nSTAGE 1: Selecting intermediates for ${cityFrom} → ${cityTo}`);

  const fromInfo = getCityInfo(cityFrom);
  const toInfo = getCityInfo(cityTo);
  if (!fromInfo || !toInfo) {
    logError(`City info not found for ${cityFrom} or ${cityTo}`);
    return null;
  }

  const stage1Start = Date.now();
  const stage1Response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text" as const,
        text: stage1SystemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildStage1UserPrompt(
          cityFrom,
          fromInfo.country,
          fromInfo.continent,
          cityTo,
          toInfo.country,
          toInfo.continent
        ),
      },
    ],
  });

  const stage1Text =
    stage1Response.content[0]?.type === "text"
      ? stage1Response.content[0].text
      : null;
  if (!stage1Text) {
    logError("  Empty Stage 1 response");
    return null;
  }

  const stage1Elapsed = ((Date.now() - stage1Start) / 1000).toFixed(1);
  const stage1Parsed = parseJSON<Stage1Result>(stage1Text);
  stage1Parsed.intermediates = cleanIntermediates(stage1Parsed.intermediates);

  log(
    `  Intermediates: ${stage1Parsed.intermediates.join(", ")} (${stage1Elapsed}s)`
  );
  log(`  Reasoning: ${stage1Parsed.reasoning}`);

  // Log cache performance
  const s1Usage = stage1Response.usage as unknown as Record<string, number>;
  if (s1Usage.cache_read_input_tokens) {
    log(
      `  Cache: ${s1Usage.cache_read_input_tokens} read, ${s1Usage.cache_creation_input_tokens ?? 0} created`
    );
  }

  // Validate intermediates
  const valErrors = validateIntermediates(stage1Parsed.intermediates);
  if (valErrors.length > 0) {
    logError(`  Validation errors: ${valErrors.join("; ")}`);
    return null;
  }

  // Stage 2: Build chain (with retry)
  log(`\nSTAGE 2: Building chain`);

  const allCities = [
    cityFrom,
    ...stage1Parsed.intermediates,
    cityTo,
  ];
  const tourSections: string[] = [];
  for (const city of allCities) {
    const tours = getToursForCity(city);
    if (tours.length === 0) {
      logError(`  No tours for ${city}`);
      return null;
    }
    tourSections.push(formatToursForPrompt(city, tours));
  }

  const MAX_RETRIES = 2;
  let stage2Parsed: { chain: ChainLink[]; summary: string } | null = null;
  let stage2Elapsed = "0";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const stage2Start = Date.now();
    try {
      const stage2Response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: [
          {
            type: "text" as const,
            text: STAGE2_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: [
          {
            role: "user",
            content: buildStage2UserPrompt(
              cityFrom,
              cityTo,
              allCities,
              tourSections
            ),
          },
        ],
      });

      const stage2Text =
        stage2Response.content[0]?.type === "text"
          ? stage2Response.content[0].text
          : null;
      if (!stage2Text) {
        logError("  Empty Stage 2 response");
        if (attempt < MAX_RETRIES) {
          log(`  Retrying Stage 2 (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
          continue;
        }
        return null;
      }

      stage2Elapsed = ((Date.now() - stage2Start) / 1000).toFixed(1);
      const parsed = parseJSON<{ chain: ChainLink[]; summary: string }>(stage2Text);
      const chainError = validateChain(parsed, cityFrom, cityTo);

      if (chainError) {
        logError(`  Chain validation failed: ${chainError}`);
        if (attempt < MAX_RETRIES) {
          log(`  Retrying Stage 2 (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
          continue;
        }
        return null;
      }

      stage2Parsed = parsed;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError(`  Stage 2 error: ${msg}`);
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        log(`  Retrying in ${delay}ms (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        return null;
      }
    }
  }

  if (!stage2Parsed) return null;
  log(`  Chain built in ${stage2Elapsed}s`);

  return {
    city_from: cityFrom,
    city_to: cityTo,
    chain: stage2Parsed.chain,
    summary: stage2Parsed.summary,
  };
}

// ============================================================
// Batch Mode — Stage 1
// ============================================================

async function submitStage1Batch(
  client: Anthropic,
  pairs: [string, string][],
  stage1SystemPrompt: string
): Promise<string> {
  const requests: Array<{
    custom_id: string;
    params: {
      model: string;
      max_tokens: number;
      system: Array<{
        type: "text";
        text: string;
        cache_control: { type: "ephemeral" };
      }>;
      messages: Array<{ role: "user"; content: string }>;
    };
  }> = [];

  let skipped = 0;
  for (const [cityFrom, cityTo] of pairs) {
    const fromInfo = getCityInfo(cityFrom);
    const toInfo = getCityInfo(cityTo);
    if (!fromInfo || !toInfo) {
      logError(`  Skipping ${cityFrom}→${cityTo}: city info not found`);
      skipped++;
      continue;
    }

    requests.push({
      custom_id: sanitizeId("s1", ...normalizePair(cityFrom, cityTo)),
      params: {
        model: MODEL,
        max_tokens: 512,
        system: [
          {
            type: "text",
            text: stage1SystemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: buildStage1UserPrompt(
              cityFrom,
              fromInfo.country,
              fromInfo.continent,
              cityTo,
              toInfo.country,
              toInfo.continent
            ),
          },
        ],
      },
    });
  }

  // Check for custom_id collisions
  const ids = new Set(requests.map((r) => r.custom_id));
  if (ids.size !== requests.length) {
    logError(
      `WARNING: ${requests.length - ids.size} custom_id collisions detected`
    );
  }

  log(
    `Built ${requests.length} Stage 1 requests (${skipped} skipped)`
  );

  log(`Submitting Stage 1 batch (${requests.length} requests)...`);
  const batch = await client.messages.batches.create({ requests });
  log(`Stage 1 batch created: ${batch.id}`);

  // Save batch ID for resume
  const batchIdFile = path.join(LOG_DIR, "stage1-batch-id.txt");
  fs.writeFileSync(batchIdFile, batch.id);
  log(`Batch ID saved to ${batchIdFile}`);

  return batch.id;
}

async function pollAndProcessStage1(
  client: Anthropic,
  batchId: string,
  pairs: [string, string][]
): Promise<Stage1File> {
  // Build lookup: custom_id → [cityFrom, cityTo]
  const pairMap = new Map<string, [string, string]>();
  for (const [cityFrom, cityTo] of pairs) {
    const id = sanitizeId("s1", ...normalizePair(cityFrom, cityTo));
    pairMap.set(id, [cityFrom, cityTo]);
  }

  // Poll
  log(`Polling Stage 1 batch ${batchId}...`);
  let batch;
  while (true) {
    batch = await client.messages.batches.retrieve(batchId);
    const c = batch.request_counts;
    log(
      `  Status: ${batch.processing_status} | processing: ${c.processing} | succeeded: ${c.succeeded} | errored: ${c.errored}`
    );
    if (batch.processing_status === "ended") break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  // Process results
  const stage1File: Stage1File = {
    batch_id: batchId,
    model: MODEL,
    created_at: new Date().toISOString(),
    pairs_submitted: pairs.length,
    results: {},
    errors: {},
  };

  let succeeded = 0;
  let failed = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    const customId = result.custom_id;
    const pair = pairMap.get(customId);
    const pairKey = pair
      ? normalizePair(pair[0], pair[1]).join("|")
      : customId;

    if (result.result.type !== "succeeded") {
      stage1File.errors[pairKey] = result.result.type;
      failed++;
      logError(`  ${pairKey}: ${result.result.type}`);
      continue;
    }

    try {
      const message = result.result.message;
      const text =
        message.content[0]?.type === "text" ? message.content[0].text : null;
      if (!text) throw new Error("Empty response");

      const parsed = parseJSON<Stage1Result>(text);

      if (
        !parsed.intermediates ||
        !Array.isArray(parsed.intermediates) ||
        parsed.intermediates.length !== 3
      ) {
        throw new Error(
          `Expected 3 intermediates, got ${parsed.intermediates?.length ?? 0}`
        );
      }

      // Clean up city names (strip "City, Country" → "City")
      parsed.intermediates = cleanIntermediates(parsed.intermediates);

      // Validate intermediates exist in DB
      const valErrors = validateIntermediates(parsed.intermediates);
      if (valErrors.length > 0) {
        stage1File.errors[pairKey] =
          `invalid_intermediate: ${valErrors.join("; ")}`;
        failed++;
        logError(`  ${pairKey}: ${valErrors.join("; ")}`);
        continue;
      }

      stage1File.results[pairKey] = parsed;
      succeeded++;

      if (succeeded % 50 === 0 || succeeded <= 5) {
        log(
          `  ${pairKey}: ${parsed.intermediates.join(", ")}`
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      stage1File.errors[pairKey] = errMsg;
      failed++;
      logError(`  ${pairKey}: ${errMsg}`);
    }
  }

  log(
    `Stage 1 complete: ${succeeded} succeeded, ${failed} failed`
  );

  // Write results to disk
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(LOG_DIR, `stage1-results-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(stage1File, null, 2) + "\n");
  log(`Stage 1 results written to ${outPath}`);

  return stage1File;
}

// ============================================================
// Batch Mode — Stage 2
// ============================================================

async function submitStage2Batch(
  client: Anthropic,
  stage1: Stage1File,
  pairs: [string, string][]
): Promise<string> {
  const requests: Array<{
    custom_id: string;
    params: {
      model: string;
      max_tokens: number;
      system: Array<{
        type: "text";
        text: string;
        cache_control: { type: "ephemeral" };
      }>;
      messages: Array<{ role: "user"; content: string }>;
    };
  }> = [];

  let skipped = 0;
  for (const [cityFrom, cityTo] of pairs) {
    const pairKey = normalizePair(cityFrom, cityTo).join("|");
    const stage1Result = stage1.results[pairKey];
    if (!stage1Result) {
      skipped++;
      continue;
    }

    // Build tour data for all 5 cities
    const allCities = [cityFrom, ...stage1Result.intermediates, cityTo];
    const tourSections: string[] = [];
    let hasTours = true;

    for (const city of allCities) {
      const tours = getToursForCity(city);
      if (tours.length === 0) {
        logError(`  No tours for ${city} (pair: ${pairKey}) — skipping`);
        hasTours = false;
        break;
      }
      tourSections.push(formatToursForPrompt(city, tours));
    }

    if (!hasTours) {
      skipped++;
      continue;
    }

    requests.push({
      custom_id: sanitizeId("s2", ...normalizePair(cityFrom, cityTo)),
      params: {
        model: MODEL,
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: STAGE2_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: buildStage2UserPrompt(
              cityFrom,
              cityTo,
              allCities,
              tourSections
            ),
          },
        ],
      },
    });

    if (requests.length % 100 === 0) {
      log(`  Built ${requests.length} Stage 2 requests...`);
    }
  }

  log(
    `Built ${requests.length} Stage 2 requests (${skipped} skipped)`
  );

  log(`Submitting Stage 2 batch (${requests.length} requests)...`);
  const batch = await client.messages.batches.create({ requests });
  log(`Stage 2 batch created: ${batch.id}`);

  const batchIdFile = path.join(LOG_DIR, "stage2-batch-id.txt");
  fs.writeFileSync(batchIdFile, batch.id);
  log(`Batch ID saved to ${batchIdFile}`);

  return batch.id;
}

async function pollAndProcessStage2(
  client: Anthropic,
  batchId: string,
  stage1: Stage1File,
  pairs: [string, string][]
): Promise<{ succeeded: number; failed: number }> {
  // Build lookup: custom_id → [cityFrom, cityTo]
  const pairMap = new Map<string, [string, string]>();
  for (const [cityFrom, cityTo] of pairs) {
    const pairKey = normalizePair(cityFrom, cityTo).join("|");
    if (stage1.results[pairKey]) {
      const id = sanitizeId("s2", ...normalizePair(cityFrom, cityTo));
      pairMap.set(id, [cityFrom, cityTo]);
    }
  }

  // Poll
  log(`Polling Stage 2 batch ${batchId}...`);
  let batch;
  while (true) {
    batch = await client.messages.batches.retrieve(batchId);
    const c = batch.request_counts;
    log(
      `  Status: ${batch.processing_status} | processing: ${c.processing} | succeeded: ${c.succeeded} | errored: ${c.errored}`
    );
    if (batch.processing_status === "ended") break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  let succeeded = 0;
  let failed = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    const customId = result.custom_id;
    const pair = pairMap.get(customId);
    const pairLabel = pair ? `${pair[0]}→${pair[1]}` : customId;

    if (result.result.type !== "succeeded") {
      logError(`  ${pairLabel}: ${result.result.type}`);
      failed++;
      continue;
    }

    try {
      const message = result.result.message;
      const text =
        message.content[0]?.type === "text" ? message.content[0].text : null;
      if (!text) throw new Error("Empty response");

      const parsed = parseJSON<{ chain: ChainLink[]; summary: string }>(text);

      const cityFrom = pair![0];
      const cityTo = pair![1];
      const chainError = validateChain(parsed, cityFrom, cityTo);
      if (chainError) {
        logError(`  ${pairLabel}: ${chainError}`);
        failed++;
        continue;
      }

      const chainResult: ChainResult = {
        city_from: cityFrom,
        city_to: cityTo,
        chain: parsed.chain,
        summary: parsed.summary,
      };

      saveChain(chainResult);
      succeeded++;

      // Log chain stops
      log(`  ${pairLabel}: "${parsed.summary}"`);
      for (let j = 0; j < parsed.chain.length; j++) {
        const link = parsed.chain[j];
        const arrow =
          j < parsed.chain.length - 1 ? ` → [${link.theme}]` : "";
        log(
          `    ${j + 1}. ${link.city}, ${link.country}: "${link.tour_title}" (id:${link.tour_id})${arrow}`
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logError(`  ${pairLabel}: ${errMsg}`);
      failed++;
    }
  }

  return { succeeded, failed };
}

// ============================================================
// Main
// ============================================================

async function main() {
  const startTime = new Date();
  const logPath = initLogging();

  log("Six Degrees Chain Generator v2 — Two-Stage Pipeline");
  log("====================================================");
  log(`Started: ${startTime.toISOString()}`);
  log(`Log file: ${logPath}`);
  log(`Model: ${MODEL}`);
  log("");

  const dryRun = process.argv.includes("--dry-run");
  const regenerate = process.argv.includes("--regenerate");
  const limit = getArgValue("--limit");
  const pairIdx = process.argv.indexOf("--pair");
  const resumeStage1Id = getArgString("--resume-stage1");
  const resumeStage2Id = getArgString("--resume-stage2");
  const fromStage1Path = getArgString("--from-stage1");
  const stage1FilePath = getArgString("--stage1-file");

  // ── Single pair mode ──────────────────────────────────────
  if (pairIdx !== -1) {
    const cityFrom = process.argv[pairIdx + 1];
    const cityTo = process.argv[pairIdx + 2];
    if (!cityFrom || !cityTo) {
      logError('Usage: --pair "CityFrom" "CityTo"');
      process.exit(1);
    }

    log(`Single pair mode: ${cityFrom} → ${cityTo}`);
    log("Building Stage 1 system prompt...");
    const stage1SystemPrompt = buildStage1SystemPrompt();
    log(
      `System prompt: ${stage1SystemPrompt.length.toLocaleString()} chars (~${Math.round(stage1SystemPrompt.length / 4).toLocaleString()} tokens)`
    );

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const result = await runSequential(
      client,
      cityFrom,
      cityTo,
      stage1SystemPrompt
    );

    if (result) {
      saveChain(result);
      log(`\nChain saved: "${result.summary}"`);
      for (let j = 0; j < result.chain.length; j++) {
        const link = result.chain[j];
        const arrow =
          j < result.chain.length - 1 ? ` → [${link.theme}]` : "";
        log(
          `  ${j + 1}. ${link.city}, ${link.country}: "${link.tour_title}" (id:${link.tour_id})${arrow}`
        );
      }
    } else {
      logError("\nChain generation failed.");
    }

    logStream?.end();
    return;
  }

  // ── Load pairs ────────────────────────────────────────────
  const configPath = path.resolve("src/scripts/4-chains/chain-pairs.json");
  if (!fs.existsSync(configPath)) {
    logError(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  let pairs = JSON.parse(
    fs.readFileSync(configPath, "utf-8")
  ) as [string, string][];

  // Filter existing chains
  let skipped = 0;
  if (!regenerate) {
    pairs = pairs.filter(([a, b]) => {
      if (chainExists(a, b)) {
        skipped++;
        return false;
      }
      return true;
    });
  }

  if (limit && limit < pairs.length) {
    pairs = pairs.slice(0, limit);
  }

  log(
    `Pairs to generate: ${pairs.length}${skipped > 0 ? ` (${skipped} already exist, skipped)` : ""}${limit ? ` (limited to ${limit})` : ""}`
  );

  if (pairs.length === 0) {
    log(
      "\nNothing to generate. Use --regenerate to overwrite existing chains."
    );
    logStream?.end();
    return;
  }

  // ── Build Stage 1 system prompt ───────────────────────────
  log("\nBuilding Stage 1 system prompt...");
  const stage1SystemPrompt = buildStage1SystemPrompt();
  log(
    `System prompt: ${stage1SystemPrompt.length.toLocaleString()} chars (~${Math.round(stage1SystemPrompt.length / 4).toLocaleString()} tokens)`
  );

  if (dryRun) {
    log("\nDry run — pairs that would be generated:\n");
    for (const [a, b] of pairs.slice(0, 20)) {
      log(`  ${a} → ${b}`);
    }
    if (pairs.length > 20) log(`  ... and ${pairs.length - 20} more`);
    log(`\nStage 1 system prompt preview (first 500 chars):`);
    log(stage1SystemPrompt.slice(0, 500));
    logStream?.end();
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // ── Stage 1 ───────────────────────────────────────────────
  let stage1: Stage1File;

  if (fromStage1Path) {
    // Skip Stage 1 entirely — load from file
    log(`\nLoading Stage 1 results from ${fromStage1Path}`);
    stage1 = JSON.parse(
      fs.readFileSync(fromStage1Path, "utf-8")
    ) as Stage1File;
    log(
      `Loaded ${Object.keys(stage1.results).length} results, ${Object.keys(stage1.errors).length} errors`
    );
  } else if (resumeStage1Id) {
    // Resume Stage 1 polling
    log(`\nResuming Stage 1 batch: ${resumeStage1Id}`);
    stage1 = await pollAndProcessStage1(client, resumeStage1Id, pairs);
  } else {
    // Fresh Stage 1 submission
    log("\n── STAGE 1: City Picker ──");
    const batchId = await submitStage1Batch(
      client,
      pairs,
      stage1SystemPrompt
    );
    stage1 = await pollAndProcessStage1(client, batchId, pairs);
  }

  const stage1SuccessCount = Object.keys(stage1.results).length;
  if (stage1SuccessCount === 0) {
    logError("\nNo Stage 1 results — cannot proceed to Stage 2.");
    logStream?.end();
    process.exit(1);
  }

  // ── Stage 2 ───────────────────────────────────────────────
  log("\n── STAGE 2: Chain Builder ──");

  let stage2Results: { succeeded: number; failed: number };

  if (resumeStage2Id) {
    // Resume Stage 2 polling
    if (stage1FilePath && !fromStage1Path) {
      stage1 = JSON.parse(
        fs.readFileSync(stage1FilePath, "utf-8")
      ) as Stage1File;
    }
    log(`Resuming Stage 2 batch: ${resumeStage2Id}`);
    stage2Results = await pollAndProcessStage2(
      client,
      resumeStage2Id,
      stage1,
      pairs
    );
  } else {
    // Fresh Stage 2 submission
    const batchId = await submitStage2Batch(client, stage1, pairs);
    stage2Results = await pollAndProcessStage2(
      client,
      batchId,
      stage1,
      pairs
    );
  }

  // ── Final Summary ─────────────────────────────────────────
  const endTime = new Date();
  const durationSec = Math.floor(
    (endTime.getTime() - startTime.getTime()) / 1000
  );
  const durationMin = Math.floor(durationSec / 60);
  const durationRemSec = durationSec % 60;

  const db = getDb(true);
  const totalChains = (
    db.prepare("SELECT COUNT(*) as c FROM six_degrees_chains").get() as {
      c: number;
    }
  ).c;

  log("\n====================================================");
  log("CHAIN GENERATION COMPLETE");
  log("====================================================");
  log(`  Started:            ${startTime.toISOString()}`);
  log(`  Finished:           ${endTime.toISOString()}`);
  log(`  Duration:           ${durationMin}m ${durationRemSec}s`);
  log(`  Pairs attempted:    ${pairs.length}`);
  log(`  Stage 1 succeeded:  ${stage1SuccessCount}`);
  log(
    `  Stage 1 errors:     ${Object.keys(stage1.errors).length}`
  );
  log(`  Stage 2 generated:  ${stage2Results.succeeded}`);
  log(`  Stage 2 errors:     ${stage2Results.failed}`);
  log(`  Skipped (existing): ${skipped}`);
  log(`  Total chains in DB: ${totalChains}`);
  log(`  Model:              ${MODEL}`);
  log(`  Log file:           ${logPath}`);
  log("====================================================");

  logStream?.end();

  if (stage2Results.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  logError(`Fatal error: ${err}`);
  logStream?.end();
  process.exit(1);
});
