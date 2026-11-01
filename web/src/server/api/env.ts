// Bindings the Worker gets from wrangler.jsonc.
export interface Env {
  DB: D1Database;
  // Per-IP limit on /roulette/hand (30 per 10 s, as the Express version had).
  // Missing in unit tests, where the limit is skipped.
  ROULETTE_LIMITER?: RateLimit;
  ASSETS?: Fetcher;
}

export type AppEnv = { Bindings: Env };

// Time this isolate started. /health reports uptime from it, the way the
// Express server reported process uptime.
export const STARTED_AT = Date.now();

// Small per-isolate memo for answers that come from frozen data (counts,
// distinct lists). The tour data is not refreshed, so an hour is safe and it
// saves D1 from re-reading 136K rows on every homepage load.
const memo = new Map<string, { at: number; value: unknown }>();
const MEMO_MS = 60 * 60 * 1000;

export async function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value as T;
  const value = await load();
  memo.set(key, { at: Date.now(), value });
  return value;
}

export function clearMemo(): void {
  memo.clear();
}
