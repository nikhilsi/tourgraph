import Database from "better-sqlite3";
import path from "path";

// ============================================================
// Read-Only Database Connection
// ============================================================
// Backend serves data only — all writes happen through web/src/scripts/.
// Single connection, read-only, WAL mode for concurrent reads.

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "../../data/tourgraph.db");

  db = new Database(dbPath, { readonly: true });
  db.pragma("busy_timeout = 5000");

  // Clean close on exit
  process.on("exit", () => db?.close());

  return db;
}
