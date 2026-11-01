import { Hono } from "hono";
import { type AppEnv, remember, logError } from "../env";
import { tourRowToRouletteTour } from "../transform";
import type { TourRow } from "../types";

const router = new Hono<AppEnv>();

const SELECT_COLUMNS = `
  id, product_code, title, one_liner, destination_name, country, continent,
  rating, review_count, from_price, currency, duration_minutes,
  image_url, viator_url, weight_category, timezone
`;

// Time zones are queried in batches of this many, so a page asking for 8
// tours costs one or two D1 round trips instead of one per time zone.
const TZ_BATCH = 25;
// Only names that exist in the data are queried, at most this many (there
// are 289), so a request full of made-up names costs nothing (review R8).
const TZ_MAX = 300;

async function knownTimezones(db: D1Database): Promise<string[]> {
  return remember("timezones", async () => {
    const { results } = await db
      .prepare(
        `SELECT DISTINCT timezone FROM tours
         WHERE status = 'active' AND timezone IS NOT NULL`
      )
      .all<{ timezone: string }>();
    return results.map((r) => r.timezone);
  });
}

type RightNowRow = TourRow & { timezone: string };

// GET /right-now/tours?timezones=America/New_York,Asia/Tokyo&count=8
router.get("/right-now/tours", async (c) => {
  try {
    const tzParam = c.req.query("timezones");
    const count = Math.min(parseInt(c.req.query("count") ?? "") || 8, 20);

    if (!tzParam) return c.json({ error: "timezones parameter required" }, 400);

    const requested = [...new Set(tzParam.split(",").map((s) => s.trim()).filter(Boolean))];
    if (requested.length === 0) return c.json({ tours: [] });
    c.header("Cache-Control", "private, no-store");

    const known = new Set(await knownTimezones(c.env.DB));
    const timezones = requested.filter((tz) => known.has(tz)).slice(0, TZ_MAX);
    if (timezones.length === 0) return c.json({ tours: [] });

    // Shuffle for variety, then take one random tour per time zone in that
    // order until `count` are found (same result as the one-at-a-time loop).
    const shuffled = timezones.sort(() => Math.random() - 0.5);
    const results: RightNowRow[] = [];
    const db = c.env.DB;
    const stmt = db.prepare(
      `SELECT ${SELECT_COLUMNS}
       FROM tours
       WHERE status = 'active'
         AND timezone = ?
         AND image_url IS NOT NULL
         AND rating >= 4.0
       ORDER BY RANDOM()
       LIMIT 1`
    );

    for (let i = 0; i < shuffled.length && results.length < count; i += TZ_BATCH) {
      const chunk = shuffled.slice(i, i + TZ_BATCH);
      const batch = await db.batch<RightNowRow>(chunk.map((tz) => stmt.bind(tz)));
      for (const r of batch) {
        if (results.length >= count) break;
        if (r.results[0]) results.push(r.results[0]);
      }
    }

    return c.json({
      tours: results.map((row) => ({ ...tourRowToRouletteTour(row), timezone: row.timezone })),
    });
  } catch (err) {
    logError("Right Now error", err);
    return c.json({ error: "Failed to fetch tours" }, 500);
  }
});

// GET /right-now/timezones: all distinct time zones in the dataset
router.get("/right-now/timezones", async (c) => {
  try {
    const timezones = await knownTimezones(c.env.DB);
    c.header("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return c.json({ timezones });
  } catch (err) {
    logError("Timezones error", err);
    return c.json({ error: "Failed to fetch timezones" }, 500);
  }
});

export default router;
