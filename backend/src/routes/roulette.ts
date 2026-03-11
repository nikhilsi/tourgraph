import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { tourRowToRouletteTour } from "../transform";
import type { TourRow, WeightCategory } from "../types";

const router = Router();

// ============================================================
// Roulette Hand Algorithm
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

const SELECT_COLUMNS = `
  id, product_code, title, one_liner, destination_name, country, continent,
  rating, review_count, from_price, currency, duration_minutes,
  image_url, viator_url, weight_category
`;

const CONTRAST_CATEGORY_BONUS = 2;
const CONTRAST_CONTINENT_BONUS = 2;
const CONTRAST_PRICE_BONUS = 1;
const CONTRAST_PRICE_RATIO_THRESHOLD = 3;

function buildExcludeClause(usedIds: Set<number>): { sql: string; params: number[] } {
  if (usedIds.size === 0) return { sql: "", params: [] };
  const ids = [...usedIds];
  return {
    sql: `AND id NOT IN (${ids.map(() => "?").join(",")})`,
    params: ids,
  };
}

function sequenceHand(tours: TourRow[]): TourRow[] {
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

function getRouletteHand(excludeIds: number[] = [], handSize: number = 20): TourRow[] {
  const db = getDb();

  const hand: TourRow[] = [];
  const usedIds = new Set(excludeIds);

  for (const [category, count] of Object.entries(HAND_QUOTAS)) {
    const exclude = buildExcludeClause(usedIds);

    const tours = db
      .prepare(
        `SELECT ${SELECT_COLUMNS} FROM tours
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

  if (hand.length < handSize) {
    const remaining = handSize - hand.length;
    const exclude = buildExcludeClause(usedIds);

    const fillers = db
      .prepare(
        `SELECT ${SELECT_COLUMNS} FROM tours
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

// ============================================================
// Rate Limiting (in-memory, per-IP)
// ============================================================

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 10_000; // 10 seconds
const RATE_LIMIT_MAX = 30;

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 60_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const parts = forwarded.split(",").map((s) => s.trim());
    // Rightmost non-private IP (nginx adds to the right)
    for (let i = parts.length - 1; i >= 0; i--) {
      const ip = parts[i];
      if (!ip.startsWith("10.") && !ip.startsWith("192.168.") && !ip.startsWith("172.") && ip !== "127.0.0.1") {
        return ip;
      }
    }
    return parts[0];
  }
  return req.ip || "unknown";
}

// ============================================================
// Routes
// ============================================================

router.get("/roulette/hand", (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ hand: [], error: "Too many requests" });
      return;
    }

    const excludeParam = req.query.exclude as string | undefined;
    let excludeIds: number[] = [];
    if (excludeParam) {
      excludeIds = excludeParam
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n))
        .slice(0, 200); // Cap at 200 to prevent abuse
    }

    const hand = getRouletteHand(excludeIds);
    const tours = hand.map(tourRowToRouletteTour);

    res.set("Cache-Control", "private, no-store");
    res.json({ hand: tours });
  } catch (err) {
    console.error("Roulette hand error:", err);
    res.status(500).json({ hand: [], error: "Failed to fetch tours" });
  }
});

export default router;
