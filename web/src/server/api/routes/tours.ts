import { Hono } from "hono";
import { type AppEnv, logError } from "../env";
import { tourRowToRouletteTour, tourRowToDetail } from "../transform";
import type { TourRow } from "../types";

const router = new Hono<AppEnv>();

const MAX_BATCH_SIZE = 50;

type EnrichmentRow = Pick<TourRow, "id" | "description" | "image_urls_json">;

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

// GET /tours/:id: full tour detail
router.get("/tours/:id", async (c) => {
  try {
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Invalid tour ID" }, 400);

    const row = await c.env.DB.prepare("SELECT * FROM tours WHERE id = ?").bind(id).first<TourRow>();
    if (!row) return c.json({ error: "Tour not found" }, 404);

    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.json(tourRowToDetail(row));
  } catch (err) {
    logError("Tour detail error", err);
    return c.json({ error: "Failed to fetch tour" }, 500);
  }
});

// GET /tours/:id/enrichment: lightweight enrichment for the mobile apps
router.get("/tours/:id/enrichment", async (c) => {
  try {
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Invalid tour ID" }, 400);

    const row = await c.env.DB.prepare(
      "SELECT id, description, image_urls_json FROM tours WHERE id = ? AND status = 'active'"
    )
      .bind(id)
      .first<EnrichmentRow>();
    if (!row) return c.json({ error: "Tour not found" }, 404);

    c.header("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return c.json({ id: row.id, description: row.description, image_urls_json: row.image_urls_json });
  } catch (err) {
    logError("Tour enrichment error", err);
    return c.json({ error: "Failed to fetch tour data" }, 500);
  }
});

// POST /tours/batch: batch enrichment for the mobile apps
router.post("/tours/batch", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const ids = (body as { ids?: unknown }).ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: "ids array required" }, 400);
    }

    const validIds = ids
      .filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)
      .slice(0, MAX_BATCH_SIZE);

    if (validIds.length === 0) return c.json({ error: "No valid IDs" }, 400);

    const { results } = await c.env.DB.prepare(
      `SELECT id, description, image_urls_json
       FROM tours WHERE id IN (SELECT value FROM json_each(?)) AND status = 'active'`
    )
      .bind(JSON.stringify(validIds))
      .all<EnrichmentRow>();

    c.header("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return c.json({
      tours: results.map((row) => ({
        id: row.id,
        description: row.description,
        image_urls_json: row.image_urls_json,
      })),
    });
  } catch (err) {
    logError("Batch enrichment error", err);
    return c.json({ error: "Failed to fetch tour data" }, 500);
  }
});

// GET /tours/:id/card: roulette card format (web tour pages)
router.get("/tours/:id/card", async (c) => {
  try {
    const id = parseId(c.req.param("id"));
    if (id === null) return c.json({ error: "Invalid tour ID" }, 400);

    const row = await c.env.DB.prepare("SELECT * FROM tours WHERE id = ? AND status = 'active'")
      .bind(id)
      .first<TourRow>();
    if (!row) return c.json({ error: "Tour not found" }, 404);

    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.json(tourRowToRouletteTour(row));
  } catch (err) {
    logError("Tour card error", err);
    return c.json({ error: "Failed to fetch tour" }, 500);
  }
});

export default router;
