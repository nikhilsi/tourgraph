import { Hono } from "hono";
import { type AppEnv, remember, uptimeSeconds, logError } from "../env";

const router = new Hono<AppEnv>();

router.get("/health", async (c) => {
  try {
    // Touch D1 on every call so /health reports an outage; the tour count
    // itself comes from frozen data and is remembered for an hour.
    await c.env.DB.prepare("SELECT 1").first();
    const count = await remember("health:tours", async () => {
      const row = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM tours WHERE status = 'active'"
      ).first<{ count: number }>();
      return row?.count ?? 0;
    });
    return c.json({ status: "ok", tours: count, uptime: uptimeSeconds() });
  } catch (err) {
    logError("Health error", err);
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
    logError("Stats error", err);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

export default router;
