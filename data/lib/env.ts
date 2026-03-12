// Environment loader for standalone scripts (indexer, seed, etc.)
// Next.js handles .env.local automatically for the web server.
import dotenv from "dotenv";
import path from "path";

export function loadEnv(): void {
  // Check local data dir first, then web dir (where API keys live)
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
  dotenv.config({ path: path.resolve(__dirname, "../../web/.env.local") });
  dotenv.config({ path: path.resolve(__dirname, "../../web/.env") });
}
