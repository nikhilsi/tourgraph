// Bindings the Worker gets from wrangler.jsonc.
export interface Env {
  DB: D1Database;
  // Per-IP limit on /roulette/hand (30 per 10 s, as the Express version had).
  // Missing in unit tests, where the limit is skipped.
  ROULETTE_LIMITER?: RateLimit;
  ASSETS?: Fetcher;
}

export type AppEnv = { Bindings: Env };

// Seconds since this isolate served its first request: /health's "uptime"
// (Express reported process uptime). Taken on the first request, because
// Workers' clock reads 0 at module load (review R6).
let startedAt = 0;
export function uptimeSeconds(): number {
  const now = Date.now();
  if (!startedAt) startedAt = now;
  return (now - startedAt) / 1000;
}

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

// Log an error with its message and cause. D1 errors logged as plain objects
// showed only a stack in Workers Logs, without the D1 message.
export function logError(label: string, err: unknown): void {
  const e = err as { message?: string; cause?: { message?: string } } | undefined;
  const cause = e?.cause ? ` | cause: ${e.cause.message ?? String(e.cause)}` : "";
  console.error(`${label}: ${e?.message ?? String(err)}${cause}`);
}
