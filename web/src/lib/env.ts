// Environment loader for standalone scripts (indexer, seed, etc.)
// Next.js handles .env.local automatically for the web server.
import dotenv from "dotenv";

export function loadEnv(): void {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" }); // fallback
}
