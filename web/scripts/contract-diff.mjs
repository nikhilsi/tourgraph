#!/usr/bin/env node
// Compare the API on two deployments: the old droplet and the new Worker.
//   node scripts/contract-diff.mjs --old https://tourgraph.ai --new http://localhost:8787
//
// Deterministic endpoints must return the same status, the same JSON and the
// same Cache-Control and CORS headers. Random endpoints (roulette, superlatives,
// random chain, right-now tours, practice trivia) must return the same shape.
// Read-only: the only POSTs are /tours/batch and /trivia/answer, which write
// nothing. /trivia/daily is not called on the old side, because the first call
// of a day saves that day's questions there.
// Tour ids and chain slugs are sampled from data/tourgraph.db (read-only).

import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1].replace(/\/$/, "") : null;
};
const OLD = arg("--old");
const NEW = arg("--new");
if (!OLD || !NEW) {
  console.error("usage: node scripts/contract-diff.mjs --old <url> --new <url>");
  process.exit(2);
}

const db = new DatabaseSync(join(dirname(fileURLToPath(import.meta.url)), "../../data/tourgraph.db"), { readOnly: true });
const sample = (sql) => db.prepare(sql).all();
const tourIds = sample(
  "SELECT id FROM tours WHERE id % 4093 = 7 OR id IN (507, 1, 2) OR status != 'active' ORDER BY id LIMIT 40"
).map((r) => r.id);
const inactive = sample("SELECT id FROM tours WHERE status != 'active' LIMIT 3").map((r) => r.id);
const slugs = sample("SELECT slug FROM six_degrees_chains WHERE id % 25 = 3").map((r) => r.slug);
const questionId = sample("SELECT id FROM trivia_pool LIMIT 1")[0].id;

let failures = 0;
let passes = 0;

async function call(base, path, init) {
  const res = await fetch(base + path, { ...init, redirect: "manual", signal: AbortSignal.timeout(90_000) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return {
    status: res.status,
    json,
    cache: res.headers.get("cache-control"),
    cors: res.headers.get("access-control-allow-origin"),
  };
}

function shape(v) {
  if (Array.isArray(v)) return v.length ? [shape(v[0])] : [];
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])]));
  return v === null ? "null" : typeof v;
}

function report(name, ok, detail) {
  if (ok) passes++;
  else failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `: ${detail}`}`);
}

async function compare(path, { init, mode = "exact", normalize = (x) => x } = {}) {
  const [a, b] = await Promise.all([call(OLD, path, init), call(NEW, path, init)]);
  const problems = [];
  if (a.status !== b.status) problems.push(`status ${a.status} vs ${b.status}`);
  if (a.cache !== b.cache) problems.push(`cache-control "${a.cache}" vs "${b.cache}"`);
  if (a.cors !== b.cors) problems.push(`cors "${a.cors}" vs "${b.cors}"`);
  const view = (j) =>
    mode === "shape" ? shape(normalize(j)) : mode === "keys" ? Object.keys(normalize(j) ?? {}).sort() : normalize(j);
  const left = view(a.json);
  const right = view(b.json);
  if (!isDeepStrictEqual(left, right)) {
    problems.push(`${mode === "exact" ? "body" : mode} differs: ${JSON.stringify(left)?.slice(0, 160)} vs ${JSON.stringify(right)?.slice(0, 160)}`);
  }
  report(`${init?.method ?? "GET"} ${path}`, problems.length === 0, problems.join("; "));
}

const post = (body) => ({ init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } });
const sortedTimezones = (j) => (j?.timezones ? { timezones: [...j.timezones].sort() } : j);
const healthTours = (j) => (j ? { status: j.status, tours: j.tours } : j);
// Roulette may legitimately return fewer tours than 20 on the old side if its
// shared rate limit trips; compare the first card's shape.
const firstCard = (j) => (j?.hand ? { hand: j.hand.slice(0, 1) } : j);

console.log(`old ${OLD}\nnew ${NEW}\n`);

console.log("health and stats");
await compare("/api/v1/health", { normalize: healthTours });
await compare("/api/v1/stats");

console.log("tours");
for (const id of tourIds) {
  await compare(`/api/v1/tours/${id}`);
  await compare(`/api/v1/tours/${id}/card`);
  await compare(`/api/v1/tours/${id}/enrichment`);
}
await compare(`/api/ios/tour/${tourIds[3]}`);
await compare("/api/v1/tours/batch", post({ ids: [...tourIds.slice(0, 12), ...inactive] }));
await compare("/api/ios/tours/batch", post({ ids: tourIds.slice(5, 9) }));
await compare("/api/v1/tours/batch", post({}));
await compare("/api/v1/tours/batch", post({ ids: ["x", -1] }));
for (const bad of ["abc", "0", "-5", "999999999"]) {
  await compare(`/api/v1/tours/${bad}`);
  await compare(`/api/v1/tours/${bad}/card`);
}

console.log("chains");
await compare("/api/v1/chains/count");
await compare("/api/v1/chains/slugs");
await compare("/api/v1/chains");
for (const slug of slugs) await compare(`/api/v1/chains/${slug}`);
await compare("/api/v1/chains/no-such-chain");
await compare("/api/v1/chains/random", { mode: "shape" });

console.log("right now");
await compare("/api/v1/right-now/timezones", { normalize: sortedTimezones });
await compare("/api/v1/right-now/tours");
await compare("/api/v1/right-now/tours?timezones=Asia/Tokyo,Europe/Paris&count=2", { mode: "shape" });
await compare("/api/v1/right-now/tours?timezones=Not/AZone", {});

console.log("superlatives");
await compare("/api/v1/superlatives", { mode: "shape" });
for (const t of ["most-expensive", "cheapest-5star", "longest", "shortest", "most-reviewed", "hidden-gem"]) {
  await compare(`/api/v1/superlatives/${t}`, { mode: "shape" });
}
await compare("/api/v1/superlatives/bogus");

console.log("roulette");
await compare("/api/v1/roulette/hand?exclude=1,2,3", { mode: "shape", normalize: firstCard });

console.log("trivia (read-only)");
// Option shapes vary by question (inventory O7), so only top-level fields.
await compare("/api/v1/trivia/practice", { mode: "keys" });
await compare("/api/v1/trivia/answer", post({ questionId, selectedIndex: 0 }));
await compare("/api/v1/trivia/answer", post({ questionId: 99999999, selectedIndex: 0 }));
await compare("/api/v1/trivia/answer", post({}));
await compare("/api/v1/trivia/stats?date=2026-01-01");

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
