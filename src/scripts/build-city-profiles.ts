// ============================================================
// Build City Profiles (Stage 0 — City Intelligence Pipeline)
//
// For each city with 50+ active tours, sends all tours to Claude
// Sonnet and gets back a curated profile: personality line,
// 5 standout tours, and theme tags.
//
// Uses the Anthropic Batch API for 50% cost savings and efficient
// processing of all 910 cities in a single batch (~1 hour).
//
// Run: npx tsx src/scripts/build-city-profiles.ts
//      npx tsx src/scripts/build-city-profiles.ts --dry-run
//      npx tsx src/scripts/build-city-profiles.ts --limit 5
//      npx tsx src/scripts/build-city-profiles.ts --sequential
//      npx tsx src/scripts/build-city-profiles.ts --resume <batch-id>
//
// See: docs/city-intelligence.md
// ============================================================

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

loadEnv();

const CLAUDE_MODEL = process.env.CLAUDE_MODEL_CHAIN || "claude-sonnet-4-6";
const MIN_TOURS = 50;
const POLL_INTERVAL_MS = 30_000; // 30 seconds
const SEQUENTIAL_DELAY_MS = 500;

// ============================================================
// System Prompt (identical for all cities — cacheable)
// ============================================================

const SYSTEM_PROMPT = `You are a travel intelligence analyst. Your job is to read all tours available in a city and produce a curated city profile that captures what makes this place genuinely special and unique.

You are NOT writing marketing copy. You are identifying the authentic character of a city as revealed by its tour offerings. What would surprise someone? What exists here that they wouldn't expect? What makes this city different from every other city in the world?

Return a JSON object with:

1. "personality" — A single sentence (under 150 characters) that captures what makes this city unique. Write it like you're telling a friend something surprising you discovered. Not a tagline. Not a slogan. A genuine insight.

2. "themes" — An array of theme tags that this city genuinely covers. Choose from: cuisine, street-food, drinks, sacred, markets, street-art, nightlife, water, hiking, dance, music, craftsmanship, wildlife, dark-tourism, photography, wellness, architecture, ancient-history, colonial-history, festivals, geological. Only include themes with real representation.

3. "standout_tours" — Exactly 5 tours that best represent this city's unique character. Prioritize:
   - Tours that would make someone say "wait, THAT exists there?"
   - Unique experiences over generic popular ones (a calligraphy workshop beats a hop-on-hop-off bus)
   - Diversity across the city's themes (don't pick 5 food tours)
   - Tours with personality — the one-liners tell you which ones have soul

   For each tour, include the tour ID, the theme it represents, and a brief reason (under 100 characters) explaining why this tour captures something special about the city.

Return only valid JSON. No markdown fences.`;

// ============================================================
// Types
// ============================================================

interface CityInfo {
  name: string;
  country: string;
  continent: string;
  tourCount: number;
}

interface TourForPrompt {
  id: number;
  title: string;
  one_liner: string | null;
  rating: number | null;
  review_count: number | null;
  from_price: number | null;
  duration_minutes: number | null;
}

interface StandoutTour {
  tour_id: number;
  theme: string;
  reason: string;
}

interface CityProfile {
  personality: string;
  themes: string[];
  standout_tours: StandoutTour[];
}

// ============================================================
// Logging
// ============================================================

const LOG_DIR = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const LOG_FILE = path.join(LOG_DIR, `city-profiles-${timestamp}.log`);

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function logError(msg: string) {
  const line = `[${new Date().toISOString()}] ERROR: ${msg}`;
  console.error(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// ============================================================
// Database Queries
// ============================================================

function ensureSchema(): void {
  // Trigger initSchema by opening a read-write connection once
  getDb();
}

function getCitiesWithMinTours(minTours: number): CityInfo[] {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT destination_name as name, country, continent, COUNT(*) as tourCount
       FROM tours
       WHERE status = 'active' AND image_url IS NOT NULL
       GROUP BY destination_name
       HAVING COUNT(*) >= ?
       ORDER BY COUNT(*) DESC`
    )
    .all(minTours) as CityInfo[];
}

function getToursForCity(cityName: string): TourForPrompt[] {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT id, title, one_liner, rating, review_count, from_price, duration_minutes
       FROM tours
       WHERE destination_name = ? AND status = 'active' AND image_url IS NOT NULL
       ORDER BY review_count DESC`
    )
    .all(cityName) as TourForPrompt[];
}

function getExistingProfiles(): Set<string> {
  const db = getDb(true);
  const rows = db
    .prepare("SELECT destination_name FROM city_profiles")
    .all() as { destination_name: string }[];
  return new Set(rows.map((r) => r.destination_name));
}

function saveCityProfile(
  city: CityInfo,
  profile: CityProfile,
  model: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO city_profiles
     (destination_name, country, continent, tour_count, personality, themes_json, standout_tours_json, generated_at, model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    city.name,
    city.country,
    city.continent,
    city.tourCount,
    profile.personality,
    JSON.stringify(profile.themes),
    JSON.stringify(profile.standout_tours),
    new Date().toISOString(),
    model
  );
}

// ============================================================
// Tour Formatting
// ============================================================

function formatTourForPrompt(tour: TourForPrompt): string {
  const rating = tour.rating != null ? `${tour.rating.toFixed(1)}★` : "N/A";
  const reviews = tour.review_count ?? 0;
  const price = tour.from_price != null ? `$${Math.round(tour.from_price)}` : "N/A";
  const duration =
    tour.duration_minutes != null
      ? tour.duration_minutes >= 60
        ? `${Math.round(tour.duration_minutes / 60)}h`
        : `${tour.duration_minutes}m`
      : "N/A";
  const oneLiner = tour.one_liner ? `\n  "${tour.one_liner}"` : "";

  return `[${tour.id}] "${tour.title}"${oneLiner}\n  ${rating} | ${reviews} reviews | ${price} | ${duration}`;
}

function buildUserPrompt(city: CityInfo, tours: TourForPrompt[]): string {
  const toursText = tours.map(formatTourForPrompt).join("\n\n");
  return `Analyze all ${tours.length} tours for ${city.name}, ${city.country} (${city.continent}).\n\nTOURS:\n${toursText}\n\nReturn the city profile JSON.`;
}

// ============================================================
// Validation
// ============================================================

const VALID_THEMES = new Set([
  "cuisine", "street-food", "drinks", "sacred", "markets", "street-art",
  "nightlife", "water", "hiking", "dance", "music", "craftsmanship",
  "wildlife", "dark-tourism", "photography", "wellness", "architecture",
  "ancient-history", "colonial-history", "festivals", "geological",
]);

// Common variations Claude produces — normalize to our canonical names
const THEME_ALIASES: Record<string, string> = {
  "geology": "geological",
  "food": "cuisine",
  "nature": "hiking",
  "history": "ancient-history",
  "craft": "craftsmanship",
  "crafts": "craftsmanship",
  "street-art": "street-art",
  "streetfood": "street-food",
  "street_food": "street-food",
  "dark_tourism": "dark-tourism",
  "ancient_history": "ancient-history",
  "colonial_history": "colonial-history",
};

interface ValidationResult {
  errors: string[];   // Hard failures — don't save
  warnings: string[]; // Soft issues — save anyway, log for review
}

function validateProfile(
  profile: CityProfile,
  cityName: string,
  validTourIds: Set<number>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Personality
  if (!profile.personality || typeof profile.personality !== "string") {
    errors.push("Missing personality");
  } else if (profile.personality.length > 200) {
    errors.push(`Personality too long: ${profile.personality.length} chars`);
  } else if (profile.personality.length > 150) {
    warnings.push(`Personality ${profile.personality.length} chars (target: 150)`);
  }

  // Themes
  if (!Array.isArray(profile.themes) || profile.themes.length === 0) {
    errors.push("Missing or empty themes array");
  } else {
    const unknownThemes = profile.themes.filter((t) => !VALID_THEMES.has(t));
    if (unknownThemes.length > 0) {
      warnings.push(`Unknown themes: ${unknownThemes.join(", ")}`);
    }
  }

  // Standout tours
  if (!Array.isArray(profile.standout_tours)) {
    errors.push("Missing standout_tours array");
  } else if (profile.standout_tours.length < 3) {
    errors.push(`Too few standout tours: ${profile.standout_tours.length}`);
  } else {
    if (profile.standout_tours.length !== 5) {
      warnings.push(`Expected 5 standout tours, got ${profile.standout_tours.length}`);
    }
    const tourIds = new Set<number>();
    for (const st of profile.standout_tours) {
      if (!st.tour_id || !st.theme || !st.reason) {
        errors.push(`Standout tour missing fields: ${JSON.stringify(st)}`);
      }
      if (st.tour_id && !validTourIds.has(st.tour_id)) {
        warnings.push(`tour_id ${st.tour_id} not in DB for ${cityName}`);
      }
      if (st.tour_id && tourIds.has(st.tour_id)) {
        warnings.push(`Duplicate tour_id ${st.tour_id}`);
      }
      tourIds.add(st.tour_id);
    }
  }

  return { errors, warnings };
}

// ============================================================
// Response Parsing
// ============================================================

function parseProfileResponse(text: string): CityProfile {
  let jsonStr = text.trim();

  // Handle markdown fences
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const raw = JSON.parse(jsonStr);

  // Normalize standout_tours: Claude sometimes returns "id" instead of "tour_id"
  if (Array.isArray(raw.standout_tours)) {
    raw.standout_tours = raw.standout_tours.map(
      (st: Record<string, unknown>) => ({
        tour_id: st.tour_id ?? st.id,
        theme: st.theme,
        reason: st.reason,
      })
    );
  }

  // Normalize themes: map common aliases to canonical names
  if (Array.isArray(raw.themes)) {
    raw.themes = raw.themes.map(
      (t: string) => THEME_ALIASES[t] ?? t
    );
  }

  return raw as CityProfile;
}

// ============================================================
// Sequential Mode (one city at a time)
// ============================================================

async function runSequential(
  cities: CityInfo[],
  client: Anthropic,
  dryRun: boolean
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const tours = getToursForCity(city.name);

    if (tours.length === 0) {
      logError(`No tours found for ${city.name} — skipping`);
      failed++;
      continue;
    }

    try {
      const userPrompt = buildUserPrompt(city, tours);

      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const text =
        response.content[0]?.type === "text" ? response.content[0].text : null;
      if (!text) throw new Error("Empty response from Claude");

      const profile = parseProfileResponse(text);
      const validTourIds = new Set(tours.map((t) => t.id));
      const { errors, warnings } = validateProfile(profile, city.name, validTourIds);

      if (warnings.length > 0) {
        log(`  WARN ${city.name}: ${warnings.join("; ")}`);
      }

      if (errors.length > 0) {
        logError(
          `Validation errors for ${city.name}: ${errors.join("; ")}`
        );
        failed++;
        continue;
      }

      if (!dryRun) {
        saveCityProfile(city, profile, CLAUDE_MODEL);
      }

      succeeded++;

      // Progress
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = succeeded / (Number(elapsed) || 1);
      const remaining = cities.length - (i + 1);
      const eta = rate > 0 ? Math.round(remaining / rate) : 0;
      const etaMin = Math.floor(eta / 60);

      log(
        `[${i + 1}/${cities.length}] ${city.name}, ${city.country} — ` +
          `"${profile.personality.slice(0, 60)}..." | ` +
          `${profile.themes.length} themes | ${elapsed}s elapsed | ETA: ${etaMin}m`
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logError(`Failed for ${city.name}: ${errMsg}`);
      failed++;
    }

    // Rate limiting
    if (i < cities.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, SEQUENTIAL_DELAY_MS)
      );
    }
  }

  return { succeeded, failed };
}

// ============================================================
// Batch Mode (Anthropic Batch API)
// ============================================================

async function runBatch(
  cities: CityInfo[],
  client: Anthropic,
  dryRun: boolean
): Promise<{ succeeded: number; failed: number }> {
  // Build batch requests
  log("Building batch requests...");
  const requests: Array<{
    custom_id: string;
    params: {
      model: string;
      max_tokens: number;
      system: Array<{ type: "text"; text: string; cache_control: { type: "ephemeral" } }>;
      messages: Array<{ role: "user"; content: string }>;
    };
  }> = [];

  const cityMap = new Map<string, { city: CityInfo; tours: TourForPrompt[] }>();

  for (const city of cities) {
    const tours = getToursForCity(city.name);
    if (tours.length === 0) {
      logError(`No tours for ${city.name} — skipping`);
      continue;
    }
    cityMap.set(city.name, { city, tours });

    requests.push({
      custom_id: city.name,
      params: {
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: buildUserPrompt(city, tours) }],
      },
    });
  }

  log(`Built ${requests.length} batch requests`);

  if (dryRun) {
    log("DRY RUN — would submit batch. Showing first request:");
    log(JSON.stringify(requests[0], null, 2).slice(0, 500));
    return { succeeded: 0, failed: 0 };
  }

  // Submit batch
  log("Submitting batch to Anthropic...");
  const batch = await client.messages.batches.create({ requests });
  log(`Batch created: ${batch.id}`);
  log(`Status: ${batch.processing_status}`);

  // Save batch ID to file for resume capability
  const batchIdFile = path.join(LOG_DIR, "city-profiles-batch-id.txt");
  fs.writeFileSync(batchIdFile, batch.id);
  log(`Batch ID saved to ${batchIdFile}`);

  return await pollAndProcessBatch(batch.id, client, cityMap);
}

async function resumeBatch(
  batchId: string,
  client: Anthropic,
  cities: CityInfo[]
): Promise<{ succeeded: number; failed: number }> {
  // Rebuild city map for validation
  const cityMap = new Map<string, { city: CityInfo; tours: TourForPrompt[] }>();
  for (const city of cities) {
    const tours = getToursForCity(city.name);
    if (tours.length > 0) {
      cityMap.set(city.name, { city, tours });
    }
  }

  log(`Resuming batch ${batchId}...`);
  return await pollAndProcessBatch(batchId, client, cityMap);
}

async function pollAndProcessBatch(
  batchId: string,
  client: Anthropic,
  cityMap: Map<string, { city: CityInfo; tours: TourForPrompt[] }>
): Promise<{ succeeded: number; failed: number }> {
  // Poll for completion
  let completedBatch;
  while (true) {
    completedBatch = await client.messages.batches.retrieve(batchId);
    const counts = completedBatch.request_counts;
    log(
      `Batch ${batchId} — status: ${completedBatch.processing_status} | ` +
        `processing: ${counts.processing} | succeeded: ${counts.succeeded} | ` +
        `errored: ${counts.errored}`
    );

    if (completedBatch.processing_status === "ended") break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  log(
    `Batch complete. Succeeded: ${completedBatch.request_counts.succeeded}, ` +
      `Errored: ${completedBatch.request_counts.errored}, ` +
      `Expired: ${completedBatch.request_counts.expired}`
  );

  // Process results
  let succeeded = 0;
  let failed = 0;

  for await (const result of await client.messages.batches.results(batchId)) {
    const cityName = result.custom_id;
    const cityData = cityMap.get(cityName);

    if (!cityData) {
      logError(`Unknown city in results: ${cityName}`);
      failed++;
      continue;
    }

    if (result.result.type !== "succeeded") {
      logError(`${cityName}: ${result.result.type}`);
      failed++;
      continue;
    }

    try {
      const message = result.result.message;
      const text =
        message.content[0]?.type === "text" ? message.content[0].text : null;
      if (!text) throw new Error("Empty response");

      const profile = parseProfileResponse(text);
      const validTourIds = new Set(cityData.tours.map((t) => t.id));
      const { errors, warnings } = validateProfile(profile, cityName, validTourIds);

      if (warnings.length > 0) {
        log(`  WARN ${cityName}: ${warnings.join("; ")}`);
      }

      if (errors.length > 0) {
        logError(`Validation errors for ${cityName}: ${errors.join("; ")}`);
        failed++;
        continue;
      }

      saveCityProfile(cityData.city, profile, CLAUDE_MODEL);
      succeeded++;

      if (succeeded % 50 === 0 || succeeded <= 5) {
        log(
          `  ${cityName}: "${profile.personality.slice(0, 70)}..." [${profile.themes.join(", ")}]`
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logError(`Failed to parse ${cityName}: ${errMsg}`);
      failed++;
    }
  }

  return { succeeded, failed };
}

// ============================================================
// Main
// ============================================================

async function main() {
  const limit = getArgValue("--limit");
  const dryRun = process.argv.includes("--dry-run");
  const sequential = process.argv.includes("--sequential");
  const resumeId = getArgStringValue("--resume");

  log("=".repeat(60));
  log("City Intelligence Pipeline — Stage 0");
  log(`Model: ${CLAUDE_MODEL}`);
  log(`Min tours per city: ${MIN_TOURS}`);
  log(`Mode: ${dryRun ? "DRY RUN" : sequential ? "SEQUENTIAL" : "BATCH"}`);
  if (resumeId) log(`Resuming batch: ${resumeId}`);
  log(`Log file: ${LOG_FILE}`);
  log("=".repeat(60));

  // Ensure city_profiles table exists
  ensureSchema();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required in .env.local");
  const client = new Anthropic({ apiKey });

  // Get eligible cities
  const allCities = getCitiesWithMinTours(MIN_TOURS);
  log(`Found ${allCities.length} cities with ${MIN_TOURS}+ tours`);

  // Skip cities that already have profiles (unless resuming a batch)
  const existing = resumeId ? new Set<string>() : getExistingProfiles();
  const cities = allCities.filter((c) => !existing.has(c.name));
  log(`Already profiled: ${existing.size} | Remaining: ${cities.length}`);

  if (cities.length === 0) {
    log("All cities already profiled. Nothing to do!");
    return;
  }

  // Apply limit
  const processCities = limit ? cities.slice(0, limit) : cities;
  log(`Will process: ${processCities.length} cities`);

  // Sample what the prompt looks like
  const sampleCity = processCities[0];
  const sampleTours = getToursForCity(sampleCity.name);
  const samplePrompt = buildUserPrompt(sampleCity, sampleTours);
  log(`\nSample: ${sampleCity.name} (${sampleTours.length} tours, ~${Math.round(samplePrompt.length / 4)} tokens)`);
  log(`System prompt: ~${Math.round(SYSTEM_PROMPT.length / 4)} tokens`);

  let results: { succeeded: number; failed: number };

  if (resumeId) {
    results = await resumeBatch(resumeId, client, processCities);
  } else if (sequential) {
    results = await runSequential(processCities, client, dryRun);
  } else {
    results = await runBatch(processCities, client, dryRun);
  }

  log("");
  log("=".repeat(60));
  log("City Intelligence Pipeline — Complete");
  log(`  Succeeded: ${results.succeeded}`);
  log(`  Failed: ${results.failed}`);
  log(`  Total: ${results.succeeded + results.failed}`);
  log("=".repeat(60));
}

function getArgValue(flag: string): number | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  const val = parseInt(process.argv[idx + 1], 10);
  return isNaN(val) ? null : val;
}

function getArgStringValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

main().catch((err) => {
  logError(`Fatal error: ${err}`);
  process.exit(1);
});
