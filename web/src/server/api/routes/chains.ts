import { Hono } from "hono";
import { type AppEnv, remember, logError } from "../env";
import type { ChainData, ChainWithMeta } from "../types";

const router = new Hono<AppEnv>();

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

// GET /chains: all chains
router.get("/chains", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT * FROM six_degrees_chains ORDER BY id").all<ChainRow>();
    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.json({ chains: results.map(parseChain) });
  } catch (err) {
    logError("Chains error", err);
    return c.json({ error: "Failed to fetch chains" }, 500);
  }
});

// GET /chains/slugs: all chain slugs (for the sitemap)
router.get("/chains/slugs", async (c) => {
  try {
    const slugs = await remember("chains:slugs", async () => {
      const { results } = await c.env.DB.prepare(
        "SELECT slug FROM six_degrees_chains WHERE slug IS NOT NULL"
      ).all<{ slug: string }>();
      return results.map((r) => r.slug);
    });
    c.header("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return c.json({ slugs });
  } catch (err) {
    logError("Chain slugs error", err);
    return c.json({ error: "Failed to fetch chain slugs" }, 500);
  }
});

// GET /chains/count: chain count
router.get("/chains/count", async (c) => {
  try {
    const count = await remember("chains:count", async () => {
      const row = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM six_degrees_chains").first<{ cnt: number }>();
      return row?.cnt ?? 0;
    });
    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.json({ count });
  } catch (err) {
    logError("Chain count error", err);
    return c.json({ error: "Failed to fetch chain count" }, 500);
  }
});

// GET /chains/random: random chain
router.get("/chains/random", async (c) => {
  try {
    const row = await c.env.DB.prepare(
      "SELECT * FROM six_degrees_chains ORDER BY RANDOM() LIMIT 1"
    ).first<ChainRow>();
    if (!row) return c.json({ error: "No chains found" }, 404);
    c.header("Cache-Control", "private, no-store");
    return c.json(parseChain(row));
  } catch (err) {
    logError("Random chain error", err);
    return c.json({ error: "Failed to fetch chain" }, 500);
  }
});

// GET /chains/:slug: chain by slug
router.get("/chains/:slug", async (c) => {
  try {
    const row = await c.env.DB.prepare("SELECT * FROM six_degrees_chains WHERE slug = ?")
      .bind(c.req.param("slug"))
      .first<ChainRow>();
    if (!row) return c.json({ error: "Chain not found" }, 404);
    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.json(parseChain(row));
  } catch (err) {
    logError("Chain by slug error", err);
    return c.json({ error: "Failed to fetch chain" }, 500);
  }
});

export default router;
