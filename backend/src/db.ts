import Database from "better-sqlite3";
import path from "path";

// ============================================================
// Database Connections
// ============================================================
// Primary: read-only for serving data (roulette, chains, etc.)
// Write: read-write for trivia (scores, daily assembly)

let readDb: Database.Database | null = null;
let writeDb: Database.Database | null = null;

function resolveDbPath(): string {
  return process.env.DATABASE_PATH || path.join(__dirname, "../../data/tourgraph.db");
}

export function getDb(): Database.Database {
  if (readDb) return readDb;

  readDb = new Database(resolveDbPath(), { readonly: true });
  readDb.pragma("busy_timeout = 5000");

  process.on("exit", () => readDb?.close());

  return readDb;
}

export function getWriteDb(): Database.Database {
  if (writeDb) return writeDb;

  writeDb = new Database(resolveDbPath());
  writeDb.pragma("journal_mode = WAL");
  writeDb.pragma("busy_timeout = 5000");

  process.on("exit", () => writeDb?.close());

  return writeDb;
}
