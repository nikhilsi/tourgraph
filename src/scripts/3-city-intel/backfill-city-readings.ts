// ============================================================
// Backfill City Readings from Batch Result Files
//
// Loads raw batch JSONL files into the city_readings table,
// then merges all readings into city_profiles.
//
// Use this when you have downloaded batch result files from
// the Anthropic Console and want to load them into the DB.
//
// Run: npx tsx src/scripts/3-city-intel/backfill-city-readings.ts <file1.jsonl> [file2.jsonl ...]
//      npx tsx src/scripts/3-city-intel/backfill-city-readings.ts --merge-only
//
// See: docs/city-intelligence.md
// ============================================================

import { loadEnv } from "../../lib/env";
import { getDb } from "../../lib/db";
import { normalizeThemes, mergeReadings, type ReadingRow } from "../../lib/city-intel";
import fs from "fs";

loadEnv();

// ============================================================
// Parse a single batch result line
// ============================================================

interface ParsedReading {
  customId: string;
  personality: string;
  themes: string[];
  standoutTours: Array<{ tour_id: number; theme: string; reason: string }>;
}

function parseResultLine(line: string): ParsedReading | null {
  const r = JSON.parse(line);

  if (r.result.type !== "succeeded") return null;

  const text = r.result.message?.content?.[0]?.text;
  if (!text) return null;

  let jsonStr = text.trim();
  const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) jsonStr = m[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  if (!parsed.personality || !Array.isArray(parsed.themes) || !Array.isArray(parsed.standout_tours)) {
    return null;
  }

  // Normalize
  const themes = normalizeThemes(parsed.themes);
  const standoutTours = parsed.standout_tours.map(
    (st: Record<string, unknown>) => ({
      tour_id: (st.tour_id ?? st.id) as number,
      theme: st.theme as string,
      reason: st.reason as string,
    })
  );

  return {
    customId: r.custom_id,
    personality: parsed.personality,
    themes,
    standoutTours,
  };
}

// ============================================================
// Load a batch file into city_readings
// ============================================================

function loadBatchFile(filePath: string, batchId: string): number {
  const db = getDb();
  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");

  // Build a map from custom_id -> real city name using tours table
  const cityMap = new Map<string, string>();
  const allCities = db
    .prepare(
      `SELECT DISTINCT destination_name FROM tours WHERE status = 'active' AND image_url IS NOT NULL`
    )
    .all() as { destination_name: string }[];

  for (const row of allCities) {
    const sanitized = row.destination_name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 64);
    cityMap.set(sanitized, row.destination_name);
  }

  const insert = db.prepare(
    `INSERT INTO city_readings (destination_name, batch_id, model, personality, themes_json, standout_tours_json, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // Check what's already loaded for this batch
  const existing = new Set(
    (
      db
        .prepare("SELECT DISTINCT destination_name FROM city_readings WHERE batch_id = ?")
        .all(batchId) as { destination_name: string }[]
    ).map((r) => r.destination_name)
  );

  let loaded = 0;
  let skipped = 0;
  let failed = 0;

  const insertMany = db.transaction(() => {
    for (const line of lines) {
      const reading = parseResultLine(line);
      if (!reading) {
        failed++;
        continue;
      }

      const cityName = cityMap.get(reading.customId) ?? reading.customId.replace(/_/g, " ");

      if (existing.has(cityName)) {
        skipped++;
        continue;
      }

      insert.run(
        cityName,
        batchId,
        "claude-sonnet-4-6",
        reading.personality,
        JSON.stringify(reading.themes),
        JSON.stringify(reading.standoutTours),
        new Date().toISOString()
      );
      loaded++;
    }
  });

  insertMany();

  console.log(
    `  ${filePath}: ${loaded} loaded, ${skipped} skipped (already exists), ${failed} failed`
  );
  return loaded;
}

// ============================================================
// Backfill existing city_profiles data as readings
// (one-time migration for cities processed via old sequential mode)
// ============================================================

function backfillFromExistingProfiles(): number {
  const db = getDb();

  // Find cities in city_profiles that have NO readings yet
  const orphans = db
    .prepare(
      `SELECT cp.destination_name, cp.personality, cp.themes_json, cp.standout_tours_json, cp.model, cp.generated_at
       FROM city_profiles cp
       LEFT JOIN city_readings cr ON cp.destination_name = cr.destination_name
       WHERE cr.id IS NULL`
    )
    .all() as ReadingRow[];

  if (orphans.length === 0) return 0;

  const insert = db.prepare(
    `INSERT INTO city_readings (destination_name, batch_id, model, personality, themes_json, standout_tours_json, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertAll = db.transaction(() => {
    for (const r of orphans) {
      insert.run(
        r.destination_name,
        "sequential-backfill",
        r.model,
        r.personality,
        r.themes_json,
        r.standout_tours_json,
        r.generated_at
      );
    }
  });

  insertAll();
  console.log(`  Backfilled ${orphans.length} existing profiles as readings`);
  return orphans.length;
}

// ============================================================
// Main
// ============================================================

function main() {
  const args = process.argv.slice(2);
  const mergeOnly = args.includes("--merge-only");

  // Ensure tables exist
  getDb();

  if (!mergeOnly) {
    const files = args.filter((a) => !a.startsWith("--"));

    if (files.length === 0) {
      console.log("Usage: npx tsx src/scripts/3-city-intel/backfill-city-readings.ts <file1.jsonl> [file2.jsonl ...]");
      console.log("       npx tsx src/scripts/3-city-intel/backfill-city-readings.ts --merge-only");
      process.exit(1);
    }

    console.log("Loading batch result files into city_readings...\n");

    for (const file of files) {
      // Extract batch ID from filename
      const match = file.match(/(msgbatch_[a-zA-Z0-9]+)/);
      const batchId = match ? match[1] : file;
      loadBatchFile(file, batchId);
    }
  }

  // Backfill any profiles that came from sequential runs
  console.log("\nChecking for sequential-run profiles to backfill...");
  backfillFromExistingProfiles();

  // Merge all readings into city_profiles
  mergeReadings();
}

main();
