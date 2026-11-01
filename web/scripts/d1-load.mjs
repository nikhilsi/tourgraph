#!/usr/bin/env node
// Load the API's tables from data/tourgraph.db into D1, then prove the copy
// matches. Run from web/.
//   node scripts/d1-load.mjs --local            (wrangler's local D1, for dev)
//   node scripts/d1-load.mjs --remote           (production D1 tourgraph-db)
//   node scripts/d1-load.mjs --remote --verify  (only compare fingerprints)
//   node scripts/d1-load.mjs --fixture          (test/fixtures/seed.json for the unit tests)
//
// The source file is opened read-only. Rows go out as multi-row INSERTs of at
// most 90 KB each (D1 refuses statements over 100 KB), in files of about 40 MB.
// The tables must exist and be empty: apply migrations first
// (npx wrangler d1 migrations apply tourgraph-db --local|--remote).
//
// Verification runs the same fingerprint query on the source and on D1 for
// every table: row count, and per column the count of non-nulls, the total
// length, the sum of numbers, and the code points of the first and last
// characters. Any difference fails the run.
//
// Remote runs read the OmSpark token from ~/.secrets/cloudflare/tourgraph.env.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const webDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(webDir, "../data/tourgraph.db");
const DB_NAME = "tourgraph-db";
const TABLES = ["tours", "six_degrees_chains", "trivia_pool", "trivia_daily", "trivia_scores"];
const MAX_STATEMENT = 90 * 1024;
const MAX_FILE = 40 * 1024 * 1024;

const args = process.argv.slice(2);
const mode = args.includes("--remote") ? "remote" : args.includes("--local") ? "local" : args.includes("--fixture") ? "fixture" : null;
if (!mode) {
  console.error("usage: node scripts/d1-load.mjs --local | --remote [--verify] | --fixture");
  process.exit(2);
}
const verifyOnly = args.includes("--verify");

function loadToken() {
  const file = join(homedir(), ".secrets/cloudflare/tourgraph.env");
  if (!existsSync(file)) throw new Error(`missing ${file} (see docs/deploy-runbook.md)`);
  const env = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) throw new Error(`${file} lacks the token or account id`);
  return env;
}

const cfEnv = mode === "remote" ? loadToken() : {};

function wrangler(argv, { json = false } = {}) {
  const out = execFileSync("npx", ["wrangler", ...argv], {
    cwd: webDir,
    env: { ...process.env, ...cfEnv },
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: json ? ["ignore", "pipe", "inherit"] : ["ignore", "inherit", "inherit"],
  });
  return json ? JSON.parse(out) : null;
}

function d1Query(sql) {
  const res = wrangler(["d1", "execute", DB_NAME, `--${mode}`, "--json", "--command", sql], { json: true });
  return res[0].results;
}

const src = new DatabaseSync(SOURCE, { readOnly: true });

function columns(table) {
  return src.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name);
}

function sqlValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`non-finite number ${v}`);
    return String(v);
  }
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") return `'${v.replaceAll("'", "''")}'`;
  if (v instanceof Uint8Array) return `X'${Buffer.from(v).toString("hex")}'`;
  throw new Error(`unexpected value type ${typeof v}`);
}

// Fingerprints

// D1 caps the number of columns in a result, so the fingerprint is taken in
// groups of 8 source columns (one query per group).
function fingerprintSqls(table) {
  const cols = columns(table);
  const sqls = [];
  for (let start = 0; start < cols.length; start += 8) {
    sqls.push(fingerprintSql(table, cols.slice(start, start + 8), start));
  }
  return sqls;
}

function fingerprintSql(table, cols, offset) {
  const parts = ["count(*) AS n"];
  cols.forEach((c, j) => {
    const i = offset + j;
    const q = `"${c}"`;
    // Lengths and characters are taken from text only: SQLite versions can
    // print the same REAL differently, so numbers are compared as sums.
    const text = (expr) => `total(CASE WHEN typeof(${q}) = 'text' THEN ${expr} END)`;
    parts.push(
      `count(${q}) AS c${i}`,
      `sum(typeof(${q}) = 'text') AS t${i}`,
      text(`length(${q})`) + ` AS l${i}`,
      `total(CASE WHEN typeof(${q}) IN ('integer','real') THEN ${q} END) AS s${i}`,
      text(`unicode(${q})`) + ` AS f${i}`,
      text(`unicode(substr(${q}, -1))`) + ` AS e${i}`,
      text(`unicode(substr(${q}, (length(${q}) + 1) / 2, 1))`) + ` AS m${i}`
    );
  });
  return `SELECT ${parts.join(", ")} FROM "${table}"`;
}

function verify() {
  let failed = 0;
  for (const table of TABLES) {
    const want = {};
    const got = {};
    for (const sql of fingerprintSqls(table)) {
      Object.assign(want, src.prepare(sql).get());
      Object.assign(got, d1Query(sql)[0]);
    }
    const diffs = Object.keys(want).filter((k) => {
      const a = want[k];
      const b = got[k];
      // Sums of REAL values can differ in the last bits with summation order.
      return typeof a === "number" && typeof b === "number"
        ? Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a))
        : a !== b;
    });
    if (diffs.length === 0) {
      console.log(`  ok    ${table}: ${want.n} rows, fingerprint matches`);
    } else {
      failed++;
      console.log(`  FAIL  ${table}: ${diffs.length} fingerprint values differ (${diffs.slice(0, 6).join(", ")})`);
    }
  }
  if (failed) throw new Error(`${failed} table(s) differ`);
}

// Export

function* statements(table, where = "") {
  const cols = columns(table);
  const head = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES `;
  let rows = [];
  let size = head.length;
  for (const row of src.prepare(`SELECT * FROM "${table}" ${where} ORDER BY rowid`).iterate()) {
    const tuple = `(${cols.map((c) => sqlValue(row[c])).join(", ")})`;
    if (head.length + tuple.length + 2 > MAX_STATEMENT) throw new Error(`${table} row too large for one statement`);
    if (rows.length && size + tuple.length + 2 > MAX_STATEMENT) {
      yield head + rows.join(", ") + ";";
      rows = [];
      size = head.length;
    }
    rows.push(tuple);
    size += tuple.length + 2;
  }
  if (rows.length) yield head + rows.join(", ") + ";";
}

function exportFiles(dir) {
  mkdirSync(dir, { recursive: true });
  const files = [];
  let buf = [];
  let size = 0;
  const flush = () => {
    if (!buf.length) return;
    const file = join(dir, `part-${String(files.length + 1).padStart(3, "0")}.sql`);
    writeFileSync(file, buf.join("\n") + "\n");
    files.push(file);
    buf = [];
    size = 0;
  };
  for (const table of TABLES) {
    for (const stmt of statements(table)) {
      if (size + stmt.length > MAX_FILE) flush();
      buf.push(stmt);
      size += stmt.length + 1;
    }
  }
  flush();
  return files;
}

// A small, deterministic slice for the unit tests, written as JSON rows:
// the first 40 chains and the tours they reference, every inactive tour,
// about 150 more tours spread across the table, and the whole trivia pool.
function exportFixture() {
  const chains = src.prepare("SELECT * FROM six_degrees_chains WHERE id <= 40 ORDER BY id").all();
  const chainTourIds = new Set();
  for (const r of chains) {
    for (const link of JSON.parse(r.chain_json).chain ?? []) if (link.tour_id) chainTourIds.add(link.tour_id);
  }
  const tours = src
    .prepare(
      `SELECT * FROM tours
       WHERE id IN (SELECT value FROM json_each(?)) OR status != 'active' OR id % 900 = 0
       ORDER BY id`
    )
    .all(JSON.stringify([...chainTourIds]));
  const pool = src.prepare("SELECT * FROM trivia_pool ORDER BY id").all();
  const plain = (rows) => rows.map((r) => ({ ...r }));
  const out = { tours: plain(tours), six_degrees_chains: plain(chains), trivia_pool: plain(pool) };
  const file = join(webDir, "test/fixtures/seed.json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out));
  console.log(`wrote ${file}: ${tours.length} tours, ${chains.length} chains, ${pool.length} questions`);
}

// Main

if (mode === "fixture") {
  exportFixture();
} else {
  console.log(`D1 ${DB_NAME} (${mode}), source ${SOURCE}\n`);
  if (!verifyOnly) {
    for (const table of TABLES) {
      const n = d1Query(`SELECT count(*) AS n FROM "${table}"`)[0].n;
      if (n !== 0) throw new Error(`${table} already has ${n} rows in D1; empty it first`);
    }
    const dir = join(tmpdir(), `tourgraph-d1-load-${Date.now()}`);
    const files = exportFiles(dir);
    console.log(`exported ${files.length} files to ${dir}`);
    files.forEach((file, i) => {
      const t0 = Date.now();
      wrangler(["d1", "execute", DB_NAME, `--${mode}`, "--yes", "--file", file]);
      console.log(`loaded ${i + 1}/${files.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    });
    rmSync(dir, { recursive: true, force: true });
    // Give the query planner statistics (runs ANALYZE). Without them SQLite
    // picks the status index, which matches every row (inventory O1).
    wrangler(["d1", "execute", DB_NAME, `--${mode}`, "--yes", "--command", "PRAGMA optimize=0x10002"]);
    console.log("ran PRAGMA optimize");
  }
  console.log("\nverifying");
  verify();
  console.log("\nD1 matches data/tourgraph.db for every table.");
}
