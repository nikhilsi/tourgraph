// Storage is isolated per test file: apply the schema and load the fixture
// (a slice of data/tourgraph.db made by `node scripts/d1-load.mjs --fixture`).
import { applyD1Migrations, env } from "cloudflare:test";
import seed from "./fixtures/seed.json";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

for (const [table, rows] of Object.entries(seed as Record<string, Record<string, unknown>[]>)) {
  const statements = rows.map((row) => {
    const cols = Object.keys(row);
    return env.DB.prepare(
      `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
    ).bind(...cols.map((c) => row[c]));
  });
  for (let i = 0; i < statements.length; i += 100) await env.DB.batch(statements.slice(i, i + 100));
}
