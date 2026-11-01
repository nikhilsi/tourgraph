#!/usr/bin/env node
// Load test for OpenNext issue #1381 (pages rendered per request failing with
// error 1102 after about 120 renders per isolate). Run before the switchover
// and after big upgrades. Run from web/.
//   node scripts/loadtest.mjs --base https://tourgraph.nikhil-58a.workers.dev [--n 400] [--concurrency 8]
//
// Sends n page requests (half one at a time, half in parallel) across every
// per-request page, plus a few OG images. Exits non-zero on any 5xx. Pair it
// with `npx wrangler tail tourgraph --format json` to see each request's
// outcome (ok, exceededCpu, exception) in Cloudflare's own words.

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt("--base", "").replace(/\/$/, "");
const N = Number(opt("--n", "400"));
const CONCURRENCY = Number(opt("--concurrency", "8"));
if (!BASE) {
  console.error("usage: node scripts/loadtest.mjs --base <url> [--n 400] [--concurrency 8]");
  process.exit(2);
}

const slugs = (await (await fetch(`${BASE}/api/v1/chains/slugs`)).json()).slugs;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const TYPES = ["most-expensive", "cheapest-5star", "longest", "shortest", "most-reviewed", "hidden-gem"];

function nextPath(i) {
  const tourId = 1 + ((i * 7919) % 140000);
  const paths = [
    "/",
    "/right-now",
    "/worlds-most",
    `/worlds-most/${pick(TYPES)}`,
    "/six-degrees",
    `/six-degrees/${pick(slugs)}`,
    `/roulette/${tourId}`,
    "/about",
  ];
  if (i % 25 === 0) return `/api/og/roulette/${tourId}`;
  if (i % 25 === 12) return "/api/og/right-now";
  return paths[i % paths.length];
}

const results = [];
async function hit(i) {
  const path = nextPath(i);
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
    await res.arrayBuffer();
    results.push({ path, status: res.status, ms: performance.now() - t0 });
  } catch (err) {
    results.push({ path, status: 0, ms: performance.now() - t0, error: String(err) });
  }
}

const half = Math.floor(N / 2);
console.log(`${BASE}: ${half} sequential, then ${N - half} at ${CONCURRENCY} in parallel`);
for (let i = 0; i < half; i++) await hit(i);
let next = half;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < N) await hit(next++);
  })
);

const family = (p) => p.replace(/\/\d+$/, "/:id").replace(/six-degrees\/.+/, "six-degrees/:slug").replace(/worlds-most\/.+/, "worlds-most/:type");
const byFamily = new Map();
for (const r of results) {
  const f = family(r.path);
  if (!byFamily.has(f)) byFamily.set(f, []);
  byFamily.get(f).push(r);
}
const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
console.log("\npath                          n   p50 ms   p95 ms   max ms  statuses");
for (const [f, rs] of [...byFamily].sort()) {
  const ms = rs.map((r) => r.ms).sort((a, b) => a - b);
  const statuses = {};
  for (const r of rs) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
  console.log(
    `${f.padEnd(28)} ${String(rs.length).padStart(3)} ${pct(ms, 50).toFixed(0).padStart(8)} ${pct(ms, 95).toFixed(0).padStart(8)} ${ms[ms.length - 1].toFixed(0).padStart(8)}  ${JSON.stringify(statuses)}`
  );
}
const bad = results.filter((r) => r.status === 0 || r.status >= 500);
console.log(`\n${results.length} requests, ${bad.length} failed (5xx or no answer)`);
for (const r of bad.slice(0, 10)) console.log(`  ${r.status} ${r.path} ${r.error ?? ""}`);
process.exit(bad.length ? 1 : 0);
