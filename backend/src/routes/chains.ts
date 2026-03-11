import { Router, Request, Response } from "express";
import { getDb } from "../db";
import type { ChainData, ChainWithMeta } from "../types";

const router = Router();

function chainSlug(cityFrom: string, cityTo: string): string {
  return `${cityFrom}-${cityTo}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

interface ChainRow {
  id: number;
  city_from: string;
  city_to: string;
  chain_json: string;
  slug: string;
  generated_at: string;
}

function parseChain(row: ChainRow): ChainWithMeta {
  const data = JSON.parse(row.chain_json) as ChainData;
  return {
    ...data,
    id: row.id,
    slug: row.slug || chainSlug(data.city_from, data.city_to),
    generated_at: row.generated_at,
  };
}

// GET /chains — All chains
router.get("/chains", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM six_degrees_chains ORDER BY id")
      .all() as ChainRow[];

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json({ chains: rows.map(parseChain) });
  } catch (err) {
    console.error("Chains error:", err);
    res.status(500).json({ error: "Failed to fetch chains" });
  }
});

// GET /chains/slugs — All chain slugs (for sitemap)
router.get("/chains/slugs", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT slug FROM six_degrees_chains WHERE slug IS NOT NULL")
      .all() as { slug: string }[];

    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.json({ slugs: rows.map((r) => r.slug) });
  } catch (err) {
    console.error("Chain slugs error:", err);
    res.status(500).json({ error: "Failed to fetch chain slugs" });
  }
});

// GET /chains/count — Chain count
router.get("/chains/count", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT COUNT(*) as cnt FROM six_degrees_chains")
      .get() as { cnt: number };

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json({ count: row.cnt });
  } catch (err) {
    console.error("Chain count error:", err);
    res.status(500).json({ error: "Failed to fetch chain count" });
  }
});

// GET /chains/random — Random chain
router.get("/chains/random", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM six_degrees_chains ORDER BY RANDOM() LIMIT 1")
      .get() as ChainRow | undefined;

    if (!row) {
      res.status(404).json({ error: "No chains found" });
      return;
    }

    res.set("Cache-Control", "private, no-store");
    res.json(parseChain(row));
  } catch (err) {
    console.error("Random chain error:", err);
    res.status(500).json({ error: "Failed to fetch chain" });
  }
});

// GET /chains/:slug — Chain by slug
router.get("/chains/:slug", (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug);
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM six_degrees_chains WHERE slug = ?")
      .get(slug) as ChainRow | undefined;

    if (!row) {
      res.status(404).json({ error: "Chain not found" });
      return;
    }

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json(parseChain(row));
  } catch (err) {
    console.error("Chain by slug error:", err);
    res.status(500).json({ error: "Failed to fetch chain" });
  }
});

export default router;
