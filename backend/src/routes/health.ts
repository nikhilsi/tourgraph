import { Router } from "express";
import { getDb } from "../db";

const router = Router();

router.get("/health", (_req, res) => {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM tours WHERE status = 'active'")
      .get() as { count: number };

    res.json({
      status: "ok",
      tours: row.count,
      uptime: process.uptime(),
    });
  } catch {
    res.status(503).json({ status: "error" });
  }
});

// GET /stats — Aggregate stats for the about page
router.get("/stats", (_req, res) => {
  try {
    const db = getDb();
    const tours = (
      db.prepare("SELECT COUNT(*) as c FROM tours WHERE status = 'active'").get() as { c: number }
    ).c;
    const destinations = (
      db.prepare("SELECT COUNT(DISTINCT destination_name) as c FROM tours WHERE status = 'active'").get() as { c: number }
    ).c;
    const countries = (
      db.prepare("SELECT COUNT(DISTINCT country) as c FROM tours WHERE status = 'active' AND country IS NOT NULL").get() as { c: number }
    ).c;

    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json({ tours, destinations, countries });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
