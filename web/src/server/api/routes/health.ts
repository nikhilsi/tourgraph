import { Hono } from "hono";
import { type AppEnv, STARTED_AT, remember } from "../env";

const router = new Hono<AppEnv>();

router.get("/health", async (c) => {
  try {
    const count = await remember("health:tours", async () => {
      const row = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM tours WHERE status = 'active'"
      ).first<{ count: number }>();
      return row?.count ?? 0;
    });
    return c.json({ status: "ok", tours: count, uptime: (Date.now() - STARTED_AT) / 1000 });
  } catch (err) {
    console.error("Health error:", err);
    return c.json({ status: "error" }, 503);
  }
});

// GET /stats: aggregate stats for the about page
router.get("/stats", async (c) => {
  try {
    const stats = await remember("stats", async () => {
      const [tours, destinations, countries] = await c.env.DB.batch<{ c: number }>([
        c.env.DB.prepare("SELECT COUNT(*) as c FROM tours WHERE status = 'active'"),
        c.env.DB.prepare(
          "SELECT COUNT(DISTINCT destination_name) as c FROM tours WHERE status = 'active'"
        ),
        c.env.DB.prepare(
          "SELECT COUNT(DISTINCT country) as c FROM tours WHERE status = 'active' AND country IS NOT NULL"
        ),
      ]);
      return {
        tours: tours.results[0].c,
        destinations: destinations.results[0].c,
        countries: countries.results[0].c,
      };
    });
    c.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return c.json(stats);
  } catch (err) {
    console.error("Stats error:", err);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

export default router;
