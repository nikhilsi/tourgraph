import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { tourRowToRouletteTour, tourRowToDetail } from "../transform";
import type { TourRow, SuperlativeType } from "../types";

const router = Router();

const SELECT_COLUMNS = `
  id, product_code, title, one_liner, destination_name, country, continent,
  rating, review_count, from_price, currency, duration_minutes,
  image_url, viator_url, weight_category
`;

const SUPERLATIVE_QUERIES: Record<SuperlativeType, string> = {
  "most-expensive": `
    SELECT ${SELECT_COLUMNS} FROM tours
    WHERE status = 'active' AND from_price IS NOT NULL
      AND from_price <= 50000 AND image_url IS NOT NULL
    ORDER BY from_price DESC LIMIT 10`,
  "cheapest-5star": `
    SELECT ${SELECT_COLUMNS} FROM tours
    WHERE status = 'active' AND rating >= 4.5
      AND from_price IS NOT NULL AND from_price > 0
      AND review_count >= 10 AND image_url IS NOT NULL
    ORDER BY from_price ASC LIMIT 10`,
  "longest": `
    SELECT ${SELECT_COLUMNS} FROM tours
    WHERE status = 'active' AND duration_minutes IS NOT NULL
      AND duration_minutes <= 20160 AND image_url IS NOT NULL
    ORDER BY duration_minutes DESC LIMIT 10`,
  "shortest": `
    SELECT ${SELECT_COLUMNS} FROM tours
    WHERE status = 'active' AND duration_minutes IS NOT NULL
      AND duration_minutes >= 30 AND image_url IS NOT NULL
    ORDER BY duration_minutes ASC LIMIT 10`,
  "most-reviewed": `
    SELECT ${SELECT_COLUMNS} FROM tours
    WHERE status = 'active' AND review_count IS NOT NULL
      AND image_url IS NOT NULL
    ORDER BY review_count DESC LIMIT 10`,
  "hidden-gem": `
    SELECT ${SELECT_COLUMNS} FROM tours
    WHERE status = 'active' AND rating >= 4.8
      AND review_count >= 10 AND review_count <= 100
      AND image_url IS NOT NULL
    ORDER BY rating DESC, review_count ASC LIMIT 10`,
};

const VALID_TYPES = new Set(Object.keys(SUPERLATIVE_QUERIES));

function getSuperlative(type: SuperlativeType): TourRow | undefined {
  const db = getDb();
  const sql = SUPERLATIVE_QUERIES[type];
  if (!sql) return undefined;
  const candidates = db.prepare(sql).all() as TourRow[];
  if (candidates.length === 0) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// GET /superlatives — All 6 superlative types
router.get("/superlatives", (_req: Request, res: Response) => {
  try {
    const results: { type: string; tour: ReturnType<typeof tourRowToRouletteTour> }[] = [];

    for (const type of Object.keys(SUPERLATIVE_QUERIES) as SuperlativeType[]) {
      const tour = getSuperlative(type);
      if (tour) {
        results.push({ type, tour: tourRowToRouletteTour(tour) });
      }
    }

    res.set("Cache-Control", "private, no-store");
    res.json({ superlatives: results });
  } catch (err) {
    console.error("Superlatives error:", err);
    res.status(500).json({ error: "Failed to fetch superlatives" });
  }
});

// GET /superlatives/:type — Single superlative (returns full TourDetail for detail pages)
router.get("/superlatives/:type", (req: Request, res: Response) => {
  try {
    const type = String(req.params.type) as SuperlativeType;
    if (!VALID_TYPES.has(type)) {
      res.status(400).json({ error: `Invalid type. Valid: ${[...VALID_TYPES].join(", ")}` });
      return;
    }

    const tour = getSuperlative(type);
    if (!tour) {
      res.status(404).json({ error: "No tour found for this superlative" });
      return;
    }

    res.set("Cache-Control", "private, no-store");
    res.json({ type, tour: tourRowToDetail(tour) });
  } catch (err) {
    console.error("Superlative error:", err);
    res.status(500).json({ error: "Failed to fetch superlative" });
  }
});

export default router;
