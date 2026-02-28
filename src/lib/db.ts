import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { TourRow, DestinationRow } from "./types";

// ============================================================
// Connection Management
// ============================================================

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || "./data/tourgraph.db";
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
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
      weight_category TEXT,
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
      value TEXT NOT NULL
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

export function insertOrUpdateTour(
  tour: Omit<TourRow, "id" | "indexed_at" | "last_seen_at">
): number {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM tours WHERE product_code = ?")
    .get(tour.product_code) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `
      UPDATE tours SET
        title = @title, description = @description, one_liner = COALESCE(@one_liner, one_liner),
        destination_id = @destination_id, destination_name = @destination_name,
        country = @country, continent = @continent, timezone = @timezone,
        latitude = @latitude, longitude = @longitude,
        rating = @rating, review_count = @review_count,
        from_price = @from_price, currency = @currency,
        duration_minutes = @duration_minutes,
        image_url = @image_url, image_urls_json = @image_urls_json,
        highlights_json = @highlights_json, inclusions_json = @inclusions_json,
        viator_url = @viator_url, supplier_name = @supplier_name,
        tags_json = @tags_json, weight_category = @weight_category,
        status = @status, last_seen_at = CURRENT_TIMESTAMP,
        summary_hash = @summary_hash
      WHERE product_code = @product_code
    `
    ).run(tour);
    return existing.id;
  }

  return insertTour(tour);
}

export function updateTourFields(
  productCode: string,
  fields: Partial<TourRow>
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { product_code: productCode };

  for (const [key, value] of Object.entries(fields)) {
    if (key === "id" || key === "product_code") continue;
    sets.push(`${key} = @${key}`);
    values[key] = value;
  }

  if (sets.length === 0) return;

  db.prepare(
    `UPDATE tours SET ${sets.join(", ")} WHERE product_code = @product_code`
  ).run(values);
}

export function getTourById(id: number): TourRow | undefined {
  const db = getDb();
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

export function getRouletteHand(
  excludeIds: number[] = [],
  handSize: number = 20
): TourRow[] {
  const db = getDb();

  const quotas: Record<string, number> = {
    highest_rated: 4,
    unique: 3,
    cheapest_5star: 3,
    most_expensive: 3,
    exotic_location: 3,
    most_reviewed: 2,
    wildcard: 2,
  };

  const hand: TourRow[] = [];
  const usedIds = new Set(excludeIds);

  for (const [category, count] of Object.entries(quotas)) {
    const excludePlaceholders =
      usedIds.size > 0
        ? `AND id NOT IN (${[...usedIds].map(() => "?").join(",")})`
        : "";

    const tours = db
      .prepare(
        `SELECT * FROM tours
         WHERE weight_category = ? AND status = 'active'
         ${excludePlaceholders}
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(category, ...[...usedIds], count) as TourRow[];

    for (const t of tours) {
      hand.push(t);
      usedIds.add(t.id);
    }
  }

  // If we didn't fill the hand (not enough tours in some categories),
  // fill remaining slots with random active tours
  if (hand.length < handSize) {
    const remaining = handSize - hand.length;
    const excludePlaceholders =
      usedIds.size > 0
        ? `AND id NOT IN (${[...usedIds].map(() => "?").join(",")})`
        : "";

    const fillers = db
      .prepare(
        `SELECT * FROM tours
         WHERE status = 'active'
         ${excludePlaceholders}
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(...[...usedIds], remaining) as TourRow[];

    hand.push(...fillers);
  }

  return sequenceHand(hand);
}

// Sequence hand for maximum contrast between consecutive cards
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

      // Different category = +2
      if (candidate.weight_category !== last.weight_category) score += 2;
      // Different continent = +2
      if (candidate.continent !== last.continent) score += 2;
      // Price contrast = +1
      if (last.from_price && candidate.from_price) {
        const priceRatio = candidate.from_price / last.from_price;
        if (priceRatio > 3 || priceRatio < 0.33) score += 1;
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

export function getDestinationById(id: string): DestinationRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM destinations WHERE id = ?").get(id) as
    | DestinationRow
    | undefined;
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
    `INSERT INTO indexer_state (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`
  ).run(key, value, value);
}

// ============================================================
// Self-test (run with: npx tsx src/lib/db.ts)
// ============================================================

if (require.main === module) {
  console.log("Testing database layer...\n");

  const db = getDb();
  console.log("✓ Database created/connected");

  // Check tables exist
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    .all() as { name: string }[];
  console.log(
    "✓ Tables:",
    tables.map((t) => t.name).join(", ")
  );

  // Insert a test tour
  const testId = insertOrUpdateTour({
    product_code: "TEST-001",
    title: "Test Tour",
    description: "A test tour for validation",
    one_liner: "Testing is the best adventure.",
    destination_id: "704",
    destination_name: "Seattle",
    country: "United States",
    continent: "Americas",
    timezone: "America/Los_Angeles",
    latitude: 47.6,
    longitude: -122.3,
    rating: 4.9,
    review_count: 100,
    from_price: 99.99,
    currency: "USD",
    duration_minutes: 120,
    image_url: "https://example.com/photo.jpg",
    image_urls_json: JSON.stringify(["https://example.com/photo.jpg"]),
    highlights_json: JSON.stringify(["Great views", "Expert guide"]),
    inclusions_json: JSON.stringify(["Lunch", "Transport"]),
    viator_url: "https://www.viator.com/tours/Seattle/Test",
    supplier_name: "Test Operator",
    tags_json: JSON.stringify([11928, 21972]),
    weight_category: "highest_rated",
    status: "active",
    summary_hash: "abc123",
  });
  console.log(`✓ Inserted test tour (id: ${testId})`);

  // Query it back
  const tour = getTourById(testId);
  console.log(`✓ Retrieved tour: "${tour?.title}" (${tour?.destination_name})`);

  // Count
  const count = getActiveTourCount();
  console.log(`✓ Active tour count: ${count}`);

  // Clean up
  db.prepare("DELETE FROM tours WHERE product_code = 'TEST-001'").run();
  console.log("✓ Cleaned up test tour");

  const finalCount = getActiveTourCount();
  console.log(`✓ Final count: ${finalCount}`);

  console.log("\nAll database tests passed!");
}
