// API contract tests: paths, status codes, error bodies, JSON shapes and
// Cache-Control, as documented in docs/reviews/2026-11-01-inventory.md
// section 1, plus the D1-specific fixes (inventory O3, O13).
import { describe, expect, it } from "vitest";
import { CARD_KEYS, DETAIL_KEYS, call, getJson, one, rows } from "./helpers";

type Card = Record<string, unknown> & { id: number };

describe("health and stats", () => {
  it("reports the active tour count and an uptime", async () => {
    const { status, body } = await getJson<{ status: string; tours: number; uptime: number }>("/api/v1/health");
    const { n } = await one<{ n: number }>("SELECT count(*) n FROM tours WHERE status = 'active'");
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.tours).toBe(n);
    expect(typeof body.uptime).toBe("number");
  });

  it("serves stats with an hour of caching", async () => {
    const { status, body, res } = await getJson<Record<string, number>>("/api/v1/stats");
    expect(status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["countries", "destinations", "tours"]);
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");
  });
});

describe("tours", () => {
  it("returns the full detail shape", async () => {
    const { id } = await one<{ id: number }>("SELECT id FROM tours WHERE status = 'active' AND image_urls_json IS NOT NULL LIMIT 1");
    const { status, body, res } = await getJson<Card>(`/api/v1/tours/${id}`);
    expect(status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(DETAIL_KEYS);
    expect(body.id).toBe(id);
    expect(Array.isArray(body.imageUrls)).toBe(true);
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");
  });

  it("returns the card shape", async () => {
    const { id } = await one<{ id: number }>("SELECT id FROM tours WHERE status = 'active' LIMIT 1");
    const { status, body } = await getJson<Card>(`/api/v1/tours/${id}/card`);
    expect(status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(CARD_KEYS);
  });

  it("serves inactive tours on /tours/:id only (inventory O10)", async () => {
    const { id } = await one<{ id: number }>("SELECT id FROM tours WHERE status != 'active' LIMIT 1");
    expect((await call(`/api/v1/tours/${id}`)).status).toBe(200);
    expect((await getJson(`/api/v1/tours/${id}/card`)).body).toEqual({ error: "Tour not found" });
    expect((await getJson(`/api/v1/tours/${id}/enrichment`)).body).toEqual({ error: "Tour not found" });
  });

  it.each(["abc", "0", "-5"])("refuses the id %s with 400", async (bad) => {
    for (const suffix of ["", "/card", "/enrichment"]) {
      const { status, body } = await getJson(`/api/v1/tours/${bad}${suffix}`);
      expect(status).toBe(400);
      expect(body).toEqual({ error: "Invalid tour ID" });
    }
  });

  it("returns 404 for an unknown id", async () => {
    const { status, body } = await getJson("/api/v1/tours/999999999");
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Tour not found" });
  });

  it("serves enrichment, also at the old /api/ios path", async () => {
    const { id } = await one<{ id: number }>("SELECT id FROM tours WHERE status = 'active' LIMIT 1");
    const a = await getJson(`/api/v1/tours/${id}/enrichment`);
    const b = await getJson(`/api/ios/tour/${id}`);
    expect(a.status).toBe(200);
    expect(Object.keys(a.body).sort()).toEqual(["description", "id", "image_urls_json"]);
    expect(b.body).toEqual(a.body);
    expect(a.res.headers.get("cache-control")).toBe("public, max-age=86400, s-maxage=86400");
  });

  it("batches enrichment, active tours only, capped at 50", async () => {
    const ids = (await rows<{ id: number }>("SELECT id FROM tours ORDER BY id LIMIT 80")).map((r) => r.id);
    const { status, body } = await getJson<{ tours: { id: number }[] }>("/api/v1/tours/batch", { json: { ids } });
    const active = (await rows<{ id: number }>(
      "SELECT id FROM tours WHERE status = 'active' AND id IN (SELECT value FROM json_each(?)) ORDER BY id",
      JSON.stringify(ids.slice(0, 50))
    )).map((r) => r.id);
    expect(status).toBe(200);
    expect(body.tours.map((t) => t.id)).toEqual(active);
    const ios = await getJson("/api/ios/tours/batch", { json: { ids } });
    expect(ios.body).toEqual(body);
  });

  it("refuses bad batch bodies with the old messages", async () => {
    expect((await getJson("/api/v1/tours/batch", { json: {} })).body).toEqual({ error: "ids array required" });
    expect((await getJson("/api/v1/tours/batch", { json: { ids: [] } })).body).toEqual({ error: "ids array required" });
    expect((await getJson("/api/v1/tours/batch", { json: { ids: ["x", -1, 1.5] } })).body).toEqual({ error: "No valid IDs" });
    // Not JSON at all: Express answered 500 here (inventory O13); now 400.
    const res = await call("/api/v1/tours/batch", { method: "POST", body: "ids=1", headers: { "content-type": "text/plain" } });
    expect(res.status).toBe(400);
  });
});

describe("roulette", () => {
  it("deals a hand of distinct active tours in the card shape", async () => {
    const { status, body, res } = await getJson<{ hand: Card[] }>("/api/v1/roulette/hand");
    expect(status).toBe(200);
    expect(body.hand.length).toBe(20);
    expect(new Set(body.hand.map((t) => t.id)).size).toBe(20);
    for (const t of body.hand) expect(Object.keys(t).sort()).toEqual(CARD_KEYS);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("honors an exclude list of 200 ids (over D1's 100 parameter limit, inventory O3)", async () => {
    const active = (await rows<{ id: number }>("SELECT id FROM tours WHERE status = 'active' ORDER BY id")).map((r) => r.id);
    const excluded = active.slice(0, 200);
    const { status, body } = await getJson<{ hand: Card[] }>(`/api/v1/roulette/hand?exclude=${excluded.join(",")}`);
    expect(status).toBe(200);
    expect(body.hand.length).toBe(Math.min(20, active.length - 200));
    for (const t of body.hand) expect(excluded).not.toContain(t.id);
  });

  it("caps the exclude list at 200 and ignores junk", async () => {
    const { status } = await getJson(`/api/v1/roulette/hand?exclude=${Array.from({ length: 500 }, (_, i) => i).join(",")},x,,`);
    expect(status).toBe(200);
  });

  it("returns 429 when the rate limiter says no", async () => {
    const limiter = { limit: async () => ({ success: false }) } as unknown as RateLimit;
    const { status, body } = await getJson("/api/v1/roulette/hand", {}, { ROULETTE_LIMITER: limiter });
    expect(status).toBe(429);
    expect(body).toEqual({ hand: [], error: "Too many requests" });
  });
});

describe("right now", () => {
  it("lists every distinct time zone", async () => {
    const want = (await rows<{ timezone: string }>(
      "SELECT DISTINCT timezone FROM tours WHERE status = 'active' AND timezone IS NOT NULL"
    )).map((r) => r.timezone).sort();
    const { body, res } = await getJson<{ timezones: string[] }>("/api/v1/right-now/timezones");
    expect([...body.timezones].sort()).toEqual(want);
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400, s-maxage=86400");
  });

  it("requires the timezones parameter", async () => {
    const { status, body } = await getJson("/api/v1/right-now/tours");
    expect(status).toBe(400);
    expect(body).toEqual({ error: "timezones parameter required" });
  });

  it("returns one rated tour with a photo per time zone, up to count", async () => {
    const zones = (await rows<{ timezone: string }>(
      `SELECT DISTINCT timezone FROM tours
       WHERE status = 'active' AND image_url IS NOT NULL AND rating >= 4.0 AND timezone IS NOT NULL`
    )).map((r) => r.timezone);
    expect(zones.length).toBeGreaterThan(3);
    const q = encodeURIComponent([...zones, zones[0], "Not/AZone"].join(","));
    const { status, body } = await getJson<{ tours: (Card & { timezone: string })[] }>(`/api/v1/right-now/tours?timezones=${q}&count=3`);
    expect(status).toBe(200);
    expect(body.tours.length).toBe(3);
    expect(new Set(body.tours.map((t) => t.timezone)).size).toBe(3);
    for (const t of body.tours) {
      expect(zones).toContain(t.timezone);
      expect(t.rating as number).toBeGreaterThanOrEqual(4);
      expect(Object.keys(t).sort()).toEqual([...CARD_KEYS, "timezone"].sort());
    }
  });

  it("caps count at 20 and returns [] for unknown zones", async () => {
    const { body } = await getJson<{ tours: unknown[] }>("/api/v1/right-now/tours?timezones=Not/AZone&count=99");
    expect(body.tours).toEqual([]);
  });
});

describe("superlatives", () => {
  it("returns one tour per type that has candidates", async () => {
    const { status, body, res } = await getJson<{ superlatives: { type: string; tour: Card }[] }>("/api/v1/superlatives");
    expect(status).toBe(200);
    expect(body.superlatives.length).toBeGreaterThan(0);
    for (const s of body.superlatives) expect(Object.keys(s.tour).sort()).toEqual(CARD_KEYS);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns the detail shape for one type, without description (as before)", async () => {
    const { status, body } = await getJson<{ type: string; tour: Card }>("/api/v1/superlatives/most-expensive");
    expect(status).toBe(200);
    expect(body.type).toBe("most-expensive");
    expect(Object.keys(body.tour).sort()).toEqual(DETAIL_KEYS);
    expect(body.tour.description).toBe("");
  });

  it("refuses an unknown type with the old message", async () => {
    const { status, body } = await getJson("/api/v1/superlatives/bogus");
    expect(status).toBe(400);
    expect(body).toEqual({
      error: "Invalid type. Valid: most-expensive, cheapest-5star, longest, shortest, most-reviewed, hidden-gem",
    });
  });
});

describe("chains", () => {
  it("counts and lists slugs", async () => {
    const { n } = await one<{ n: number }>("SELECT count(*) n FROM six_degrees_chains");
    expect((await getJson("/api/v1/chains/count")).body).toEqual({ count: n });
    const { body } = await getJson<{ slugs: string[] }>("/api/v1/chains/slugs");
    expect(body.slugs.length).toBe(n);
  });

  it("serves a chain by slug with its metadata", async () => {
    const row = await one<{ slug: string; id: number }>("SELECT slug, id FROM six_degrees_chains LIMIT 1");
    const { status, body } = await getJson<Record<string, unknown>>(`/api/v1/chains/${row.slug}`);
    expect(status).toBe(200);
    expect(body.slug).toBe(row.slug);
    expect(body.id).toBe(row.id);
    expect(Array.isArray(body.chain)).toBe(true);
    expect(Object.keys(body)).toEqual(expect.arrayContaining(["city_from", "city_to", "chain", "summary", "generated_at"]));
  });

  it("returns 404 for an unknown slug and a random chain otherwise", async () => {
    expect((await getJson("/api/v1/chains/no-such-chain")).body).toEqual({ error: "Chain not found" });
    const r = await getJson<Record<string, unknown>>("/api/v1/chains/random");
    expect(r.status).toBe(200);
    expect(typeof r.body.slug).toBe("string");
    expect(r.res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("lists all chains", async () => {
    const { body } = await getJson<{ chains: unknown[] }>("/api/v1/chains");
    expect(body.chains.length).toBeGreaterThan(0);
  });
});

describe("app behavior", () => {
  it("sends open CORS and answers preflights", async () => {
    const res = await call("/api/v1/health");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const pre = await call("/api/v1/tours/batch", {
      method: "OPTIONS",
      headers: { origin: "https://example.com", "access-control-request-method": "POST" },
    });
    expect(pre.status).toBe(204);
  });

  it("answers unknown API paths with JSON 404", async () => {
    const { status, body } = await getJson("/api/v1/nope");
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Not found" });
  });

  it("refuses bodies over 100 KB", async () => {
    const res = await call("/api/v1/tours/batch", { json: { ids: [1], pad: "x".repeat(110 * 1024) } });
    expect(res.status).toBe(413);
  });

  it("tolerates a trailing slash", async () => {
    expect((await call("/api/v1/health/")).status).toBe(200);
  });
});
