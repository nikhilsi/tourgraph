import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { tourRowToRouletteTour, tourRowToDetail } from "../transform";
import type { TourRow } from "../types";

const router = Router();

const MAX_BATCH_SIZE = 50;

// GET /tours/:id — Full tour detail
router.get("/tours/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid tour ID" });
      return;
    }

    const db = getDb();
    const row = db.prepare("SELECT * FROM tours WHERE id = ?").get(id) as TourRow | undefined;

    if (!row) {
      res.status(404).json({ error: "Tour not found" });
      return;
    }

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json(tourRowToDetail(row));
  } catch (err) {
    console.error("Tour detail error:", err);
    res.status(500).json({ error: "Failed to fetch tour" });
  }
});

// GET /tours/:id/enrichment — Lightweight enrichment for mobile apps
router.get("/tours/:id/enrichment", (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid tour ID" });
      return;
    }

    const db = getDb();
    const row = db
      .prepare("SELECT id, description, image_urls_json FROM tours WHERE id = ? AND status = 'active'")
      .get(id) as Pick<TourRow, "id" | "description" | "image_urls_json"> | undefined;

    if (!row) {
      res.status(404).json({ error: "Tour not found" });
      return;
    }

    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.json({
      id: row.id,
      description: row.description,
      image_urls_json: row.image_urls_json,
    });
  } catch (err) {
    console.error("Tour enrichment error:", err);
    res.status(500).json({ error: "Failed to fetch tour data" });
  }
});

// POST /tours/batch — Batch enrichment for mobile apps
router.post("/tours/batch", (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array required" });
      return;
    }

    const validIds = ids
      .filter((id) => typeof id === "number" && Number.isInteger(id) && id > 0)
      .slice(0, MAX_BATCH_SIZE);

    if (validIds.length === 0) {
      res.status(400).json({ error: "No valid IDs" });
      return;
    }

    const db = getDb();
    const placeholders = validIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT id, description, image_urls_json
         FROM tours WHERE id IN (${placeholders}) AND status = 'active'`
      )
      .all(...validIds) as Pick<TourRow, "id" | "description" | "image_urls_json">[];

    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.json({
      tours: rows.map((row) => ({
        id: row.id,
        description: row.description,
        image_urls_json: row.image_urls_json,
      })),
    });
  } catch (err) {
    console.error("Batch enrichment error:", err);
    res.status(500).json({ error: "Failed to fetch tour data" });
  }
});

// GET /tours/:id/card — Roulette card format (used by web frontend for individual tour pages)
router.get("/tours/:id/card", (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid tour ID" });
      return;
    }

    const db = getDb();
    const row = db.prepare("SELECT * FROM tours WHERE id = ? AND status = 'active'").get(id) as TourRow | undefined;

    if (!row) {
      res.status(404).json({ error: "Tour not found" });
      return;
    }

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json(tourRowToRouletteTour(row));
  } catch (err) {
    console.error("Tour card error:", err);
    res.status(500).json({ error: "Failed to fetch tour" });
  }
});

export default router;
