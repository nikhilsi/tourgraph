import { Hono } from "hono";
import { type AppEnv, remember } from "../env";
import { tourRowToRouletteTour, tourRowToDetail } from "../transform";
import type { TourRow, SuperlativeType } from "../types";

const router = new Hono<AppEnv>();

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
  longest: `
    SELECT ${SELECT_COLUMNS} FROM tours
    WHERE status = 'active' AND duration_minutes IS NOT NULL
      AND duration_minutes <= 20160 AND image_url IS NOT NULL
    ORDER BY duration_minutes DESC LIMIT 10`,
  shortest: `
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

const TYPES = Object.keys(SUPERLATIVE_QUERIES) as SuperlativeType[];
const VALID_TYPES = new Set<string>(TYPES);

// The top-10 candidate lists come from frozen data, so they are read once per
// isolate per hour. Each request still picks one of the 10 at random, as before.
async function candidates(db: D1Database): Promise<Record<SuperlativeType, TourRow[]>> {
  return remember("superlatives", async () => {
    const results = await db.batch<TourRow>(TYPES.map((t) => db.prepare(SUPERLATIVE_QUERIES[t])));
    return Object.fromEntries(TYPES.map((t, i) => [t, results[i].results])) as Record<
      SuperlativeType,
      TourRow[]
    >;
  });
}

function pick(rows: TourRow[]): TourRow | undefined {
  if (rows.length === 0) return undefined;
  return rows[Math.floor(Math.random() * rows.length)];
}

// GET /superlatives: all 6 superlative types
router.get("/superlatives", async (c) => {
  try {
    const all = await candidates(c.env.DB);
    const superlatives: { type: string; tour: ReturnType<typeof tourRowToRouletteTour> }[] = [];
    for (const type of TYPES) {
      const tour = pick(all[type]);
      if (tour) superlatives.push({ type, tour: tourRowToRouletteTour(tour) });
    }
    c.header("Cache-Control", "private, no-store");
    return c.json({ superlatives });
  } catch (err) {
    console.error("Superlatives error:", err);
    return c.json({ error: "Failed to fetch superlatives" }, 500);
  }
});

// GET /superlatives/:type: one superlative. Returns the detail shape, but the
// query has no description or photo columns, so those come back empty: same
// as the Express version.
router.get("/superlatives/:type", async (c) => {
  try {
    const type = c.req.param("type");
    if (!VALID_TYPES.has(type)) {
      return c.json({ error: `Invalid type. Valid: ${TYPES.join(", ")}` }, 400);
    }

    const tour = pick((await candidates(c.env.DB))[type as SuperlativeType]);
    if (!tour) return c.json({ error: "No tour found for this superlative" }, 404);

    c.header("Cache-Control", "private, no-store");
    return c.json({ type, tour: tourRowToDetail(tour) });
  } catch (err) {
    console.error("Superlative error:", err);
    return c.json({ error: "Failed to fetch superlative" }, 500);
  }
});

export default router;
