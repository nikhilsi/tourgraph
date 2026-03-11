import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { tourRowToRouletteTour } from "../transform";
import type { TourRow } from "../types";

const router = Router();

const SELECT_COLUMNS = `
  id, product_code, title, one_liner, destination_name, country, continent,
  rating, review_count, from_price, currency, duration_minutes,
  image_url, viator_url, weight_category, timezone
`;

// GET /right-now/tours?timezones=America/New_York,Asia/Tokyo&count=8
router.get("/right-now/tours", (req: Request, res: Response) => {
  try {
    const tzParam = req.query.timezones as string | undefined;
    const count = Math.min(parseInt(req.query.count as string) || 8, 20);

    if (!tzParam) {
      res.status(400).json({ error: "timezones parameter required" });
      return;
    }

    const timezones = tzParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (timezones.length === 0) {
      res.json({ tours: [] });
      return;
    }

    const db = getDb();
    const results: (TourRow & { timezone: string })[] = [];
    const usedTimezones = new Set<string>();

    // Shuffle for variety
    const shuffled = [...timezones].sort(() => Math.random() - 0.5);

    for (const tz of shuffled) {
      if (usedTimezones.has(tz) || results.length >= count) break;

      const tour = db
        .prepare(
          `SELECT ${SELECT_COLUMNS}
           FROM tours
           WHERE status = 'active'
             AND timezone = ?
             AND image_url IS NOT NULL
             AND rating >= 4.0
           ORDER BY RANDOM()
           LIMIT 1`
        )
        .get(tz) as (TourRow & { timezone: string }) | undefined;

      if (tour) {
        results.push(tour);
        usedTimezones.add(tz);
      }
    }

    res.set("Cache-Control", "private, no-store");
    res.json({
      tours: results.map((row) => ({
        ...tourRowToRouletteTour(row),
        timezone: row.timezone,
      })),
    });
  } catch (err) {
    console.error("Right Now error:", err);
    res.status(500).json({ error: "Failed to fetch tours" });
  }
});

// GET /right-now/timezones — All distinct timezones in the dataset
router.get("/right-now/timezones", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT DISTINCT timezone FROM tours
         WHERE status = 'active' AND timezone IS NOT NULL`
      )
      .all() as { timezone: string }[];

    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.json({ timezones: rows.map((r) => r.timezone) });
  } catch (err) {
    console.error("Timezones error:", err);
    res.status(500).json({ error: "Failed to fetch timezones" });
  }
});

export default router;
