// ============================================================
// City Intelligence — Shared logic for city readings & profiles
//
// Used by:
//   - build-city-profiles.ts (writes readings, merges profiles)
//   - backfill-city-readings.ts (loads JSONL, merges profiles)
//
// Design: All AI outputs → city_readings (append-only, permanent)
//         Merge step → city_profiles (materialized view)
// ============================================================

import { getDb } from "./db";

// ============================================================
// Types
// ============================================================

export interface CityInfo {
  name: string;
  country: string;
  continent: string;
  tourCount: number;
}

export interface ReadingRow {
  destination_name: string;
  personality: string;
  themes_json: string;
  standout_tours_json: string;
  model: string;
  generated_at: string;
}

// ============================================================
// Theme normalization
// ============================================================

export const VALID_THEMES = new Set([
  "cuisine", "street-food", "drinks", "sacred", "markets", "street-art",
  "nightlife", "water", "hiking", "dance", "music", "craftsmanship",
  "wildlife", "dark-tourism", "photography", "wellness", "architecture",
  "ancient-history", "colonial-history", "festivals", "geological",
]);

export const THEME_ALIASES: Record<string, string> = {
  geology: "geological",
  food: "cuisine",
  nature: "hiking",
  history: "ancient-history",
  craft: "craftsmanship",
  crafts: "craftsmanship",
  "street-art": "street-art",
  streetfood: "street-food",
  street_food: "street-food",
  dark_tourism: "dark-tourism",
  ancient_history: "ancient-history",
  colonial_history: "colonial-history",
};

export function normalizeThemes(themes: string[]): string[] {
  return themes.map((t) => THEME_ALIASES[t] ?? t);
}

// ============================================================
// Save a single reading to city_readings
// ============================================================

export function saveCityReading(
  destinationName: string,
  batchId: string,
  model: string,
  personality: string,
  themes: string[],
  standoutTours: Array<{ tour_id: number; theme: string; reason: string }>
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO city_readings (destination_name, batch_id, model, personality, themes_json, standout_tours_json, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    destinationName,
    batchId,
    model,
    personality,
    JSON.stringify(themes),
    JSON.stringify(standoutTours),
    new Date().toISOString()
  );
}

// ============================================================
// Get city info (for merge step)
// ============================================================

export function getCityInfo(): Map<string, CityInfo> {
  const db = getDb(true);
  const rows = db
    .prepare(
      `SELECT destination_name as name, country, continent, COUNT(*) as tourCount
       FROM tours
       WHERE status = 'active' AND image_url IS NOT NULL
       GROUP BY destination_name
       HAVING COUNT(*) >= 50`
    )
    .all() as CityInfo[];

  const map = new Map<string, CityInfo>();
  for (const r of rows) map.set(r.name, r);
  return map;
}

// ============================================================
// Merge all readings into city_profiles
// ============================================================

export function mergeReadings(): void {
  const db = getDb();
  const cityInfoMap = getCityInfo();

  // Get all readings grouped by city
  const allReadings = db
    .prepare(
      `SELECT destination_name, personality, themes_json, standout_tours_json, model, generated_at
       FROM city_readings
       ORDER BY destination_name, generated_at`
    )
    .all() as ReadingRow[];

  // Group by city
  const byCity = new Map<string, ReadingRow[]>();
  for (const r of allReadings) {
    const arr = byCity.get(r.destination_name) ?? [];
    arr.push(r);
    byCity.set(r.destination_name, arr);
  }

  console.log(`\nMerging ${byCity.size} cities from ${allReadings.length} total readings...`);

  const upsert = db.prepare(
    `INSERT OR REPLACE INTO city_profiles
     (destination_name, country, continent, tour_count, personality, themes_json, standout_tours_json, reading_count, generated_at, model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let merged = 0;
  let skippedNoInfo = 0;

  const mergeAll = db.transaction(() => {
    for (const [cityName, readings] of byCity) {
      const info = cityInfoMap.get(cityName);
      if (!info) {
        skippedNoInfo++;
        continue;
      }

      // Personality: use the first reading (oldest / batch 1)
      const personality = readings[0].personality;

      // Themes: union of all readings
      const allThemes = new Set<string>();
      for (const r of readings) {
        const themes = JSON.parse(r.themes_json) as string[];
        for (const t of themes) allThemes.add(t);
      }

      // Standout tours: union deduped by tour_id
      const seenTourIds = new Set<number>();
      const allStandouts: Array<{ tour_id: number; theme: string; reason: string }> = [];
      for (const r of readings) {
        const tours = JSON.parse(r.standout_tours_json) as Array<{
          tour_id: number;
          theme: string;
          reason: string;
        }>;
        for (const t of tours) {
          if (!seenTourIds.has(t.tour_id)) {
            seenTourIds.add(t.tour_id);
            allStandouts.push(t);
          }
        }
      }

      // Model: most recent reading's model
      const model = readings[readings.length - 1].model;
      const generatedAt = readings[readings.length - 1].generated_at;

      upsert.run(
        cityName,
        info.country,
        info.continent,
        info.tourCount,
        personality,
        JSON.stringify([...allThemes].sort()),
        JSON.stringify(allStandouts),
        readings.length,
        generatedAt,
        model
      );
      merged++;
    }
  });

  mergeAll();

  console.log(`  Merged: ${merged} cities`);
  console.log(`  Skipped (no tour data): ${skippedNoInfo}`);

  // Stats
  const stats = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         AVG(reading_count) as avg_readings,
         AVG(json_array_length(themes_json)) as avg_themes,
         AVG(json_array_length(standout_tours_json)) as avg_standouts
       FROM city_profiles`
    )
    .get() as { total: number; avg_readings: number; avg_themes: number; avg_standouts: number };

  console.log(`\n  city_profiles stats:`);
  console.log(`    Total cities: ${stats.total}`);
  console.log(`    Avg readings per city: ${stats.avg_readings.toFixed(1)}`);
  console.log(`    Avg themes per city: ${stats.avg_themes.toFixed(1)}`);
  console.log(`    Avg standout tours per city: ${stats.avg_standouts.toFixed(1)}`);
}
