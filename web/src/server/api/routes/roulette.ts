import { Hono } from "hono";
import type { AppEnv } from "../env";
import { tourRowToRouletteTour } from "../transform";
import type { TourRow, WeightCategory } from "../types";

const router = new Hono<AppEnv>();

// ============================================================
// Roulette Hand Algorithm (same quotas and sequencing as the Express version)
// ============================================================

const HAND_QUOTAS: Record<WeightCategory, number> = {
  highest_rated: 4,
  unique: 3,
  cheapest_5star: 3,
  most_expensive: 3,
  exotic_location: 3,
  most_reviewed: 2,
  wildcard: 2,
};

const HAND_SIZE = 20;

const SELECT_COLUMNS = `
  id, product_code, title, one_liner, destination_name, country, continent,
  rating, review_count, from_price, currency, duration_minutes,
  image_url, viator_url, weight_category
`;

const CONTRAST_CATEGORY_BONUS = 2;
const CONTRAST_CONTINENT_BONUS = 2;
const CONTRAST_PRICE_BONUS = 1;
const CONTRAST_PRICE_RATIO_THRESHOLD = 3;

export function sequenceHand(tours: TourRow[]): TourRow[] {
  if (tours.length <= 1) return tours;

  const sequenced: TourRow[] = [];
  const remaining = [...tours];

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
        if (
          priceRatio > CONTRAST_PRICE_RATIO_THRESHOLD ||
          priceRatio < 1 / CONTRAST_PRICE_RATIO_THRESHOLD
        ) {
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

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Excluded ids go in as one JSON parameter: D1 allows at most 100 bound
// parameters per query and the client may send up to 200 ids.
async function getRouletteHand(db: D1Database, excludeIds: number[]): Promise<TourRow[]> {
  const excludeJson = JSON.stringify(excludeIds);

  // Each tour has one weight_category, so the category queries can't pick the
  // same tour twice and can run together in one batch. The random pick runs
  // on the weight_category index (ids only); just the chosen rows are read in
  // full. The Express version sorted every full row in the category.
  const categories = Object.entries(HAND_QUOTAS);
  const results = await db.batch<TourRow>(
    categories.map(([category, count]) =>
      db
        .prepare(
          `SELECT ${SELECT_COLUMNS} FROM tours
           WHERE id IN (
             SELECT id FROM tours
             WHERE weight_category = ? AND status = 'active'
               AND id NOT IN (SELECT value FROM json_each(?))
             ORDER BY RANDOM()
             LIMIT ?
           )`
        )
        .bind(category, excludeJson, count)
    )
  );

  // Rows come back in id order; shuffle each category so the order the
  // sequencer sees is random, as it was with ORDER BY RANDOM().
  const hand: TourRow[] = results.flatMap((r) => shuffle(r.results));

  if (hand.length < HAND_SIZE) {
    const used = JSON.stringify([...excludeIds, ...hand.map((t) => t.id)]);
    const fillers = await db
      .prepare(
        `SELECT ${SELECT_COLUMNS} FROM tours
         WHERE id IN (
           SELECT id FROM tours
           WHERE status = 'active'
             AND id NOT IN (SELECT value FROM json_each(?))
           ORDER BY RANDOM()
           LIMIT ?
         )`
      )
      .bind(used, HAND_SIZE - hand.length)
      .all<TourRow>();
    hand.push(...shuffle(fillers.results));
  }

  return sequenceHand(hand);
}

export function parseExclude(param: string | undefined): number[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n))
    .slice(0, 200); // Cap at 200 to prevent abuse
}

// ============================================================
// Routes
// ============================================================

router.get("/roulette/hand", async (c) => {
  try {
    // Per-IP limit: 30 requests per 10 seconds, as before. Cloudflare's
    // rate limiter counts per location, so it is approximate.
    const ip = c.req.header("cf-connecting-ip") || "unknown";
    if (c.env.ROULETTE_LIMITER) {
      const { success } = await c.env.ROULETTE_LIMITER.limit({ key: ip });
      if (!success) return c.json({ hand: [], error: "Too many requests" }, 429);
    }

    const hand = await getRouletteHand(c.env.DB, parseExclude(c.req.query("exclude")));
    c.header("Cache-Control", "private, no-store");
    return c.json({ hand: hand.map(tourRowToRouletteTour) });
  } catch (err) {
    console.error("Roulette hand error:", err);
    return c.json({ hand: [], error: "Failed to fetch tours" }, 500);
  }
});

export default router;
