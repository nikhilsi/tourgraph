import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { TourRow, RouletteTour, WeightCategory, DestinationRow, SuperlativeType, SuperlativeResult } from "./types";

// ============================================================
// Connection Management
// ============================================================

// Use globalThis to survive Next.js HMR in development (M4)
const globalForDb = globalThis as typeof globalThis & {
  __tourgraphDb?: Database.Database;
};

export function getDb(readOnly = false): Database.Database {
  // Read-only connections are not cached (short-lived)
  if (readOnly) {
    const dbPath = process.env.DATABASE_PATH || "./data/tourgraph.db";
    const conn = new Database(dbPath, { readonly: true });
    conn.pragma("busy_timeout = 5000");
    return conn;
  }

  if (globalForDb.__tourgraphDb) return globalForDb.__tourgraphDb;

  const dbPath = process.env.DATABASE_PATH || "./data/tourgraph.db";
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000"); // H5: prevent SQLITE_BUSY crashes

  initSchema(db);
  globalForDb.__tourgraphDb = db;

  // Clean close on exit
  process.on("exit", () => db.close());

  return db;
}

// ============================================================
// Schema Initialization
// ============================================================

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      one_liner TEXT,
      destination_id TEXT,
      destination_name TEXT,
      country TEXT,
      continent TEXT,
      timezone TEXT,
      latitude REAL,
      longitude REAL,
      rating REAL,
      review_count INTEGER,
      from_price REAL,
      currency TEXT DEFAULT 'USD',
      duration_minutes INTEGER,
      image_url TEXT,
      image_urls_json TEXT,
      highlights_json TEXT,
      inclusions_json TEXT,
      viator_url TEXT,
      supplier_name TEXT,
      tags_json TEXT,
      weight_category TEXT DEFAULT 'wildcard',
      status TEXT DEFAULT 'active',
      indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      summary_hash TEXT,
      CHECK (rating >= 0 AND rating <= 5)
    );

    CREATE INDEX IF NOT EXISTS idx_tours_weight ON tours(weight_category);
    CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
    CREATE INDEX IF NOT EXISTS idx_tours_rating ON tours(rating DESC);
    CREATE INDEX IF NOT EXISTS idx_tours_price ON tours(from_price);
    CREATE INDEX IF NOT EXISTS idx_tours_destination ON tours(destination_id);
    CREATE INDEX IF NOT EXISTS idx_tours_timezone ON tours(timezone);
    CREATE INDEX IF NOT EXISTS idx_tours_indexed ON tours(indexed_at);
    CREATE INDEX IF NOT EXISTS idx_tours_product_code ON tours(product_code);

    CREATE TABLE IF NOT EXISTS superlatives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      tour_id INTEGER REFERENCES tours(id),
      stat_value TEXT,
      stat_label TEXT,
      generated_date DATE NOT NULL,
      UNIQUE(type, generated_date)
    );

    CREATE INDEX IF NOT EXISTS idx_superlatives_date ON superlatives(generated_date);

    CREATE TABLE IF NOT EXISTS destinations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      timezone TEXT,
      latitude REAL,
      longitude REAL
    );

    CREATE TABLE IF NOT EXISTS six_degrees_chains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_from TEXT NOT NULL,
      city_to TEXT NOT NULL,
      chain_json TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(city_from, city_to)
    );

    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ============================================================
// Tour Queries
// ============================================================

export function insertTour(
  tour: Omit<TourRow, "id" | "indexed_at" | "last_seen_at">
): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tours (
      product_code, title, description, one_liner,
      destination_id, destination_name, country, continent, timezone,
      latitude, longitude, rating, review_count, from_price, currency,
      duration_minutes, image_url, image_urls_json, highlights_json,
      inclusions_json, viator_url, supplier_name, tags_json,
      weight_category, status, summary_hash
    ) VALUES (
      @product_code, @title, @description, @one_liner,
      @destination_id, @destination_name, @country, @continent, @timezone,
      @latitude, @longitude, @rating, @review_count, @from_price, @currency,
      @duration_minutes, @image_url, @image_urls_json, @highlights_json,
      @inclusions_json, @viator_url, @supplier_name, @tags_json,
      @weight_category, @status, @summary_hash
    )
  `);
  const result = stmt.run(tour);
  return Number(result.lastInsertRowid);
}

// M9: Use proper UPSERT instead of read-then-write
export function insertOrUpdateTour(
  tour: Omit<TourRow, "id" | "indexed_at" | "last_seen_at">
): number {
  const db = getDb();
  db.prepare(`
    INSERT INTO tours (
      product_code, title, description, one_liner,
      destination_id, destination_name, country, continent, timezone,
      latitude, longitude, rating, review_count, from_price, currency,
      duration_minutes, image_url, image_urls_json, highlights_json,
      inclusions_json, viator_url, supplier_name, tags_json,
      weight_category, status, summary_hash
    ) VALUES (
      @product_code, @title, @description, @one_liner,
      @destination_id, @destination_name, @country, @continent, @timezone,
      @latitude, @longitude, @rating, @review_count, @from_price, @currency,
      @duration_minutes, @image_url, @image_urls_json, @highlights_json,
      @inclusions_json, @viator_url, @supplier_name, @tags_json,
      @weight_category, @status, @summary_hash
    )
    ON CONFLICT(product_code) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      one_liner = COALESCE(excluded.one_liner, tours.one_liner),
      destination_id = excluded.destination_id,
      destination_name = excluded.destination_name,
      country = excluded.country,
      continent = excluded.continent,
      timezone = excluded.timezone,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      rating = excluded.rating,
      review_count = excluded.review_count,
      from_price = excluded.from_price,
      currency = excluded.currency,
      duration_minutes = excluded.duration_minutes,
      image_url = excluded.image_url,
      image_urls_json = excluded.image_urls_json,
      highlights_json = excluded.highlights_json,
      inclusions_json = excluded.inclusions_json,
      viator_url = excluded.viator_url,
      supplier_name = excluded.supplier_name,
      tags_json = excluded.tags_json,
      weight_category = excluded.weight_category,
      status = excluded.status,
      last_seen_at = CURRENT_TIMESTAMP,
      summary_hash = excluded.summary_hash
  `).run(tour);

  const row = db
    .prepare("SELECT id FROM tours WHERE product_code = ?")
    .get(tour.product_code) as { id: number };
  return row.id;
}

// C1: Allowlist column names to prevent SQL injection
const TOUR_COLUMN_ALLOWLIST = new Set<string>([
  "title", "description", "one_liner", "destination_id", "destination_name",
  "country", "continent", "timezone", "latitude", "longitude", "rating",
  "review_count", "from_price", "currency", "duration_minutes", "image_url",
  "image_urls_json", "highlights_json", "inclusions_json", "viator_url",
  "supplier_name", "tags_json", "weight_category", "status", "summary_hash",
]);

export function updateTourFields(
  productCode: string,
  fields: Partial<TourRow>
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { product_code: productCode };

  for (const [key, value] of Object.entries(fields)) {
    if (key === "id" || key === "product_code") continue;
    if (!TOUR_COLUMN_ALLOWLIST.has(key)) {
      throw new Error(`Invalid column name: ${key}`);
    }
    sets.push(`${key} = @${key}`);
    values[key] = value;
  }

  if (sets.length === 0) return;

  db.prepare(
    `UPDATE tours SET ${sets.join(", ")} WHERE product_code = @product_code`
  ).run(values);
}

export function getTourById(id: number): TourRow | undefined {
  const db = getDb(true); // M1: read-only for web
  return db.prepare("SELECT * FROM tours WHERE id = ?").get(id) as
    | TourRow
    | undefined;
}

export function getTourByProductCode(code: string): TourRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM tours WHERE product_code = ?")
    .get(code) as TourRow | undefined;
}

export function getActiveTourCount(): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM tours WHERE status = 'active'")
    .get() as { count: number };
  return row.count;
}

export function getActiveToursForDestination(
  destId: string
): Pick<TourRow, "product_code" | "summary_hash">[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT product_code, summary_hash FROM tours WHERE destination_id = ? AND status = 'active'"
    )
    .all(destId) as Pick<TourRow, "product_code" | "summary_hash">[];
}

export function markToursInactive(productCodes: string[]): void {
  if (productCodes.length === 0) return;
  const db = getDb();
  const placeholders = productCodes.map(() => "?").join(",");
  db.prepare(
    `UPDATE tours SET status = 'inactive' WHERE product_code IN (${placeholders})`
  ).run(...productCodes);
}

// ============================================================
// Roulette Hand Query
// ============================================================

// Hand algorithm: draw tours by category quotas then sequence for contrast.
// Quotas tuned for variety — favors "interesting extremes" over average tours.
// Total drawn = 20 (sum of all quotas). See sequenceHand() for ordering.
const ROULETTE_HAND_QUOTAS: Record<WeightCategory, number> = {
  highest_rated: 4,
  unique: 3,
  cheapest_5star: 3,
  most_expensive: 3,
  exotic_location: 3,
  most_reviewed: 2,
  wildcard: 2,
};

// Sequencing contrast scores
const CONTRAST_CATEGORY_BONUS = 2;
const CONTRAST_CONTINENT_BONUS = 2;
const CONTRAST_PRICE_BONUS = 1;
const CONTRAST_PRICE_RATIO_THRESHOLD = 3;

// M3: Only select columns needed for the hand API response
const HAND_SELECT_COLUMNS = `
  id, product_code, title, one_liner, destination_name, country, continent,
  rating, review_count, from_price, currency, duration_minutes,
  image_url, viator_url, weight_category
`;

function buildExcludeClause(usedIds: Set<number>): { sql: string; params: number[] } {
  if (usedIds.size === 0) return { sql: "", params: [] };
  const ids = [...usedIds];
  return {
    sql: `AND id NOT IN (${ids.map(() => "?").join(",")})`,
    params: ids,
  };
}

export function getRouletteHand(
  excludeIds: number[] = [],
  handSize: number = 20
): TourRow[] {
  const db = getDb(true); // M1: read-only for web

  const hand: TourRow[] = [];
  const usedIds = new Set(excludeIds);

  for (const [category, count] of Object.entries(ROULETTE_HAND_QUOTAS)) {
    const exclude = buildExcludeClause(usedIds);

    const tours = db
      .prepare(
        `SELECT ${HAND_SELECT_COLUMNS} FROM tours
         WHERE weight_category = ? AND status = 'active'
         ${exclude.sql}
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(category, ...exclude.params, count) as TourRow[];

    for (const t of tours) {
      hand.push(t);
      usedIds.add(t.id);
    }
  }

  // Fill remaining slots with random active tours
  if (hand.length < handSize) {
    const remaining = handSize - hand.length;
    const exclude = buildExcludeClause(usedIds);

    const fillers = db
      .prepare(
        `SELECT ${HAND_SELECT_COLUMNS} FROM tours
         WHERE status = 'active'
         ${exclude.sql}
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(...exclude.params, remaining) as TourRow[];

    hand.push(...fillers);
  }

  return sequenceHand(hand);
}

// Greedy nearest-neighbor sequencing for maximum contrast.
// Scores each candidate against the last card: different category (+2),
// different continent (+2), large price difference (+1). Picks highest scorer.
function sequenceHand(tours: TourRow[]): TourRow[] {
  if (tours.length <= 1) return tours;

  const sequenced: TourRow[] = [];
  const remaining = [...tours];

  // Start with a random tour
  const startIdx = Math.floor(Math.random() * remaining.length);
  sequenced.push(remaining.splice(startIdx, 1)[0]);

  while (remaining.length > 0) {
    const last = sequenced[sequenced.length - 1];
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      let score = 0;
      const candidate = remaining[i];

      if (candidate.weight_category !== last.weight_category) score += CONTRAST_CATEGORY_BONUS;
      if (candidate.continent !== last.continent) score += CONTRAST_CONTINENT_BONUS;
      if (last.from_price && candidate.from_price) {
        const priceRatio = candidate.from_price / last.from_price;
        if (priceRatio > CONTRAST_PRICE_RATIO_THRESHOLD || priceRatio < 1 / CONTRAST_PRICE_RATIO_THRESHOLD) {
          score += CONTRAST_PRICE_BONUS;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    sequenced.push(remaining.splice(bestIdx, 1)[0]);
  }

  return sequenced;
}

// ============================================================
// Shared Row → API Transformation
// ============================================================

export function tourRowToRouletteTour(row: TourRow): RouletteTour {
  return {
    id: row.id,
    productCode: row.product_code,
    title: row.title,
    oneLiner: row.one_liner ?? "",
    destinationName: row.destination_name ?? "",
    country: row.country ?? "",
    continent: row.continent ?? "",
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    fromPrice: row.from_price ?? 0,
    durationMinutes: row.duration_minutes ?? 0,
    imageUrl: row.image_url ?? "",
    viatorUrl: row.viator_url ?? "",
    weightCategory: row.weight_category ?? "wildcard",
  };
}

// ============================================================
// Right Now Somewhere Queries
// ============================================================

export function getDistinctTimezones(): string[] {
  const db = getDb(true);
  const rows = db
    .prepare(
      `SELECT DISTINCT timezone FROM tours
       WHERE status = 'active' AND timezone IS NOT NULL`
    )
    .all() as { timezone: string }[];
  return rows.map((r) => r.timezone);
}

// Returns one quality tour per timezone, randomized
export function getRightNowTours(
  timezones: string[],
  count: number
): TourRow[] {
  if (timezones.length === 0) return [];
  const db = getDb(true);

  const results: TourRow[] = [];
  const usedTimezones = new Set<string>();

  // Shuffle timezones for variety across refreshes
  const shuffled = [...timezones].sort(() => Math.random() - 0.5);

  for (const tz of shuffled) {
    if (usedTimezones.has(tz) || results.length >= count) break;

    const tour = db
      .prepare(
        `SELECT ${HAND_SELECT_COLUMNS}, timezone
         FROM tours
         WHERE status = 'active'
           AND timezone = ?
           AND image_url IS NOT NULL
           AND rating >= 4.0
         ORDER BY RANDOM()
         LIMIT 1`
      )
      .get(tz) as TourRow | undefined;

    if (tour) {
      results.push(tour);
      usedTimezones.add(tz);
    }
  }

  return results;
}

// ============================================================
// World's Most Superlative Queries
// ============================================================

const SUPERLATIVE_QUERIES: Record<SuperlativeType, string> = {
  "most-expensive": `
    SELECT ${HAND_SELECT_COLUMNS}
    FROM tours
    WHERE status = 'active' AND from_price IS NOT NULL
      AND from_price <= 50000 AND image_url IS NOT NULL
    ORDER BY from_price DESC LIMIT 1`,
  "cheapest-5star": `
    SELECT ${HAND_SELECT_COLUMNS}
    FROM tours
    WHERE status = 'active' AND rating >= 4.5
      AND from_price IS NOT NULL AND from_price > 0
      AND review_count >= 10 AND image_url IS NOT NULL
    ORDER BY from_price ASC LIMIT 1`,
  "longest": `
    SELECT ${HAND_SELECT_COLUMNS}
    FROM tours
    WHERE status = 'active' AND duration_minutes IS NOT NULL
      AND duration_minutes <= 20160 AND image_url IS NOT NULL
    ORDER BY duration_minutes DESC LIMIT 1`,
  "shortest": `
    SELECT ${HAND_SELECT_COLUMNS}
    FROM tours
    WHERE status = 'active' AND duration_minutes IS NOT NULL
      AND duration_minutes >= 30 AND image_url IS NOT NULL
    ORDER BY duration_minutes ASC LIMIT 1`,
  "most-reviewed": `
    SELECT ${HAND_SELECT_COLUMNS}
    FROM tours
    WHERE status = 'active' AND review_count IS NOT NULL
      AND image_url IS NOT NULL
    ORDER BY review_count DESC LIMIT 1`,
  "hidden-gem": `
    SELECT ${HAND_SELECT_COLUMNS}
    FROM tours
    WHERE status = 'active' AND rating >= 4.8
      AND review_count >= 10 AND review_count <= 100
      AND image_url IS NOT NULL
    ORDER BY rating DESC, review_count ASC LIMIT 1`,
};

export function getSuperlative(type: SuperlativeType): TourRow | undefined {
  const db = getDb(true);
  const sql = SUPERLATIVE_QUERIES[type];
  if (!sql) return undefined;
  return db.prepare(sql).get() as TourRow | undefined;
}

export function getAllSuperlatives(): SuperlativeResult[] {
  const results: SuperlativeResult[] = [];
  for (const type of Object.keys(SUPERLATIVE_QUERIES) as SuperlativeType[]) {
    const tour = getSuperlative(type);
    if (tour) {
      results.push({ type, tour });
    }
  }
  return results;
}

// ============================================================
// Destination Queries
// ============================================================

export function upsertDestination(dest: {
  id: string;
  name: string;
  parentId?: string | null;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): void {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO destinations (id, name, parent_id, timezone, latitude, longitude)
    VALUES (@id, @name, @parentId, @timezone, @latitude, @longitude)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      parent_id = @parentId,
      timezone = @timezone,
      latitude = COALESCE(@latitude, latitude),
      longitude = COALESCE(@longitude, longitude)
  `
  ).run({
    id: dest.id,
    name: dest.name,
    parentId: dest.parentId ?? null,
    timezone: dest.timezone ?? null,
    latitude: dest.latitude ?? null,
    longitude: dest.longitude ?? null,
  });
}

export function getAllDestinations(): DestinationRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM destinations ORDER BY name").all() as DestinationRow[];
}

export function getLeafDestinations(): DestinationRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT d.* FROM destinations d
       LEFT JOIN destinations c ON c.parent_id = d.id
       WHERE c.id IS NULL
       ORDER BY d.name`
    )
    .all() as DestinationRow[];
}

export function getDestinationById(id: string): DestinationRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM destinations WHERE id = ?").get(id) as
    | DestinationRow
    | undefined;
}

// ============================================================
// Six Degrees Chains
// ============================================================

export interface ChainLink {
  city: string;
  country: string;
  tour_title: string;
  tour_id: number;
  connection_to_next: string | null;
  theme: string;
}

export interface ChainData {
  city_from: string;
  city_to: string;
  chain: ChainLink[];
  summary: string;
}

export interface ChainWithMeta extends ChainData {
  id: number;
  slug: string;
  generated_at: string;
}

function chainSlug(cityFrom: string, cityTo: string): string {
  return `${cityFrom}-${cityTo}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function getAllChains(): ChainWithMeta[] {
  const db = getDb(true);
  const rows = db
    .prepare("SELECT * FROM six_degrees_chains ORDER BY id")
    .all() as { id: number; city_from: string; city_to: string; chain_json: string; generated_at: string }[];

  return rows.map((row) => {
    const data = JSON.parse(row.chain_json) as ChainData;
    return {
      ...data,
      id: row.id,
      slug: chainSlug(data.city_from, data.city_to),
      generated_at: row.generated_at,
    };
  });
}

export function getChainBySlug(slug: string): ChainWithMeta | null {
  const chains = getAllChains();
  return chains.find((c) => c.slug === slug) ?? null;
}

// ============================================================
// Indexer State
// ============================================================

export function getIndexerState(key: string): string | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM indexer_state WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setIndexerState(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO indexer_state (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`
  ).run(key, value, value);
}
