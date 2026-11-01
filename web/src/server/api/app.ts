// TourGraph API on Cloudflare: the Express routes from backend/, ported to
// Hono on D1. Same paths, same JSON. Served by worker.ts for /api/v1/* and
// /api/ios/*, and called in-process by the website (src/lib/api.ts).
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "./env";

import healthRoutes from "./routes/health";
import rouletteRoutes from "./routes/roulette";
import tourRoutes from "./routes/tours";
import rightNowRoutes from "./routes/right-now";
import superlativeRoutes from "./routes/superlatives";
import chainRoutes from "./routes/chains";
import triviaRoutes from "./routes/trivia";

const v1 = new Hono<AppEnv>({ strict: false });
v1.route("/", healthRoutes);
v1.route("/", rouletteRoutes);
v1.route("/", tourRoutes);
v1.route("/", rightNowRoutes);
v1.route("/", superlativeRoutes);
v1.route("/", chainRoutes);
v1.route("/", triviaRoutes);

export const api = new Hono<AppEnv>({ strict: false });

api.use("*", cors()); // open CORS, as the Express app had
api.use("*", etag({ weak: true }));
// Express's JSON parser refused bodies over 100 KB.
api.use("*", bodyLimit({ maxSize: 100 * 1024, onError: (c) => c.json({ error: "Payload too large" }, 413) }));

api.route("/api/v1", v1);

// Mobile compatibility paths. nginx rewrote these two to the v1 routes.
function forward(c: Context<AppEnv>, path: string) {
  const url = new URL(c.req.url);
  url.pathname = path;
  let ctx: ExecutionContext | undefined;
  try {
    ctx = c.executionCtx as unknown as ExecutionContext;
  } catch {
    // no execution context in unit tests
  }
  return api.fetch(new Request(url, c.req.raw), c.env, ctx);
}
api.all("/api/ios/tour/:id{.+}", (c) => forward(c, `/api/v1/tours/${c.req.param("id")}/enrichment`));
api.all("/api/ios/tours/batch", (c) => forward(c, "/api/v1/tours/batch"));

api.notFound((c) => c.json({ error: "Not found" }, 404));
api.onError((err, c) => {
  console.error("API error:", err);
  return c.json({ error: "Internal error" }, 500);
});
