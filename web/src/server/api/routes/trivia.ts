import { Hono } from "hono";
import type { AppEnv } from "../env";

const router = new Hono<AppEnv>();

// ============================================================
// Types
// ============================================================

interface PoolRow {
  id: number;
  format: string;
  question_json: string;
  used_date: string | null;
}

interface TriviaQuestion {
  id: number;
  format: string;
  question: string;
  options: { label: string; text: string }[];
  // correctIndex intentionally omitted from client response
}

interface TriviaQuestionWithAnswer extends TriviaQuestion {
  correctIndex: number;
  reveal: { fact: string; imageUrl?: string; imageUrls?: string[] };
}

// ============================================================
// Helpers
// ============================================================

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Daily mix: 5 format slots that rotate across days.
// Slot 1: warm-up (higher_or_lower or odd_one_out)
// Slot 2: geography (where_in_world or city_personality)
// Slot 3: crowd-pleaser (real_or_fake, always included)
// Slot 4: culture (the_connection)
// Slot 5: wild card (numbers_game or any unused format)
export function formatSlots(date: string): string[] {
  const dayNum = Math.floor(
    (new Date(date + "T00:00:00Z").getTime() - new Date("2026-01-01T00:00:00Z").getTime()) /
      86400000
  );
  const warmup = dayNum % 2 === 0 ? "higher_or_lower" : "odd_one_out";
  const geo = dayNum % 2 === 0 ? "where_in_world" : "city_personality";
  const wildcards = ["numbers_game", "higher_or_lower", "odd_one_out", "where_in_world", "city_personality"];
  const wildcard = wildcards[dayNum % wildcards.length];
  return [warmup, geo, "real_or_fake", "the_connection", wildcard];
}

async function readDaily(db: D1Database, date: string): Promise<number[] | null> {
  const row = await db
    .prepare("SELECT question_ids_json FROM trivia_daily WHERE date = ?")
    .bind(date)
    .first<{ question_ids_json: string }>();
  return row ? (JSON.parse(row.question_ids_json) as number[]) : null;
}

/**
 * Lazy daily assembly: the first request for a date picks 5 questions from
 * the pool (one per format slot), saves them to trivia_daily and marks them
 * used. On Workers two first requests can run at once; INSERT OR IGNORE keeps
 * the first set and both requests return what was saved.
 */
async function getOrAssembleDaily(db: D1Database, date: string): Promise<TriviaQuestionWithAnswer[]> {
  const existing = await readDaily(db, date);
  if (existing) return fetchQuestionsByIds(db, existing);

  const pickedIds: number[] = [];
  for (const format of formatSlots(date)) {
    const row =
      (await db
        .prepare(
          `SELECT id FROM trivia_pool
           WHERE format = ? AND used_date IS NULL
             AND id NOT IN (SELECT value FROM json_each(?))
           ORDER BY RANDOM() LIMIT 1`
        )
        .bind(format, JSON.stringify(pickedIds))
        .first<{ id: number }>()) ??
      // Fallback: reuse the oldest used question of this format
      (await db
        .prepare(
          `SELECT id FROM trivia_pool
           WHERE format = ? AND id NOT IN (SELECT value FROM json_each(?))
           ORDER BY used_date ASC LIMIT 1`
        )
        .bind(format, JSON.stringify(pickedIds))
        .first<{ id: number }>());
    if (row) pickedIds.push(row.id);
  }

  if (pickedIds.length === 0) return [];

  const inserted = await db
    .prepare("INSERT OR IGNORE INTO trivia_daily (date, question_ids_json) VALUES (?, ?)")
    .bind(date, JSON.stringify(pickedIds))
    .run();

  if (inserted.meta.changes > 0) {
    await db.batch(
      pickedIds.map((id) => db.prepare("UPDATE trivia_pool SET used_date = ? WHERE id = ?").bind(date, id))
    );
    return fetchQuestionsByIds(db, pickedIds);
  }

  // Another request saved this date first: use its set.
  return fetchQuestionsByIds(db, (await readDaily(db, date)) ?? []);
}

async function fetchQuestionsByIds(db: D1Database, ids: number[]): Promise<TriviaQuestionWithAnswer[]> {
  if (ids.length === 0) return [];
  const { results } = await db
    .prepare(
      "SELECT id, format, question_json FROM trivia_pool WHERE id IN (SELECT value FROM json_each(?))"
    )
    .bind(JSON.stringify(ids))
    .all<PoolRow>();

  // Preserve order from ids array
  const rowMap = new Map(results.map((r) => [r.id, r]));
  return ids
    .map((id) => {
      const row = rowMap.get(id);
      if (!row) return null;
      const parsed = JSON.parse(row.question_json);
      return {
        id: row.id,
        format: row.format,
        question: parsed.question,
        options: parsed.options,
        correctIndex: parsed.correctIndex,
        reveal: parsed.reveal,
      } as TriviaQuestionWithAnswer;
    })
    .filter((q): q is TriviaQuestionWithAnswer => q !== null);
}

function stripAnswers(questions: TriviaQuestionWithAnswer[]): TriviaQuestion[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return questions.map(({ correctIndex, reveal, ...rest }) => rest);
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  const body = await c.req.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

// ============================================================
// GET /trivia/daily: today's 5 questions (no answers)
// ============================================================

router.get("/trivia/daily", async (c) => {
  try {
    const date = todayUTC();
    const questions = await getOrAssembleDaily(c.env.DB, date);
    c.header("Cache-Control", "public, max-age=60");
    return c.json({ date, questions: stripAnswers(questions), questionCount: questions.length });
  } catch (err) {
    console.error("Trivia daily error:", err);
    return c.json({ error: "Failed to fetch daily trivia" }, 500);
  }
});

// ============================================================
// POST /trivia/answer: check the answer to one question
// ============================================================

router.post("/trivia/answer", async (c) => {
  try {
    const { questionId, selectedIndex } = await readJson(c);
    if (typeof questionId !== "number" || typeof selectedIndex !== "number") {
      return c.json({ error: "questionId and selectedIndex required" }, 400);
    }

    const row = await c.env.DB.prepare("SELECT question_json FROM trivia_pool WHERE id = ?")
      .bind(questionId)
      .first<{ question_json: string }>();
    if (!row) return c.json({ error: "Question not found" }, 404);

    const parsed = JSON.parse(row.question_json);
    return c.json({
      correct: selectedIndex === parsed.correctIndex,
      correctIndex: parsed.correctIndex,
      reveal: parsed.reveal,
    });
  } catch (err) {
    console.error("Trivia answer error:", err);
    return c.json({ error: "Failed to check answer" }, 500);
  }
});

// ============================================================
// GET /trivia/results: full results for a day (after completion)
// ============================================================

router.get("/trivia/results", async (c) => {
  try {
    const date = c.req.query("date") || todayUTC();
    // New in the Cloudflare version: a malformed date is refused instead of
    // assembling (and using up questions for) a garbage day.
    if (!DATE_RE.test(date)) return c.json({ error: "Invalid date" }, 400);

    const questions = await getOrAssembleDaily(c.env.DB, date);
    return c.json({
      date,
      questions: questions.map((q) => ({
        id: q.id,
        format: q.format,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        reveal: q.reveal,
      })),
    });
  } catch (err) {
    console.error("Trivia results error:", err);
    return c.json({ error: "Failed to fetch results" }, 500);
  }
});

// ============================================================
// POST /trivia/score: submit a daily score
// ============================================================

router.post("/trivia/score", async (c) => {
  try {
    const { date, score, sessionHash, answers } = await readJson(c);

    if (!date || typeof score !== "number" || !sessionHash) {
      return c.json({ error: "date, score, and sessionHash required" }, 400);
    }
    if (score < 0 || score > 5) return c.json({ error: "score must be 0-5" }, 400);

    // Visitor country from Cloudflare (was nginx GeoIP2's X-Country-Code).
    // "XX" and "T1" mean unknown and Tor; store those as unknown.
    const cfCountry = (c.req.raw as Request & { cf?: { country?: string } }).cf?.country;
    const countryCode = cfCountry && cfCountry !== "XX" && cfCountry !== "T1" ? cfCountry : null;

    // A unique index on (date, session_hash) keeps one score per session per
    // day, so two submissions arriving at once can't both be saved.
    const result = await c.env.DB.prepare(
      `INSERT OR IGNORE INTO trivia_scores (date, score, session_hash, country_code, answers_json)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(date, score, sessionHash, countryCode, answers ? JSON.stringify(answers) : null)
      .run();
    if (result.meta.changes === 0) return c.json({ error: "Score already submitted for this date" }, 409);

    return c.json({ saved: true });
  } catch (err) {
    console.error("Trivia score error:", err);
    return c.json({ error: "Failed to save score" }, 500);
  }
});

// ============================================================
// GET /trivia/stats: anonymous leaderboard data
// ============================================================

router.get("/trivia/stats", async (c) => {
  try {
    const date = c.req.query("date") || todayUTC();
    const db = c.env.DB;

    const [statsRes, distRes] = await db.batch([
      db
        .prepare(
          `SELECT
             COUNT(*) as totalPlayers,
             ROUND(AVG(score), 1) as avgScore,
             MAX(score) as maxScore,
             MIN(score) as minScore
           FROM trivia_scores WHERE date = ?`
        )
        .bind(date),
      db
        .prepare(
          `SELECT score, COUNT(*) as count
           FROM trivia_scores WHERE date = ?
           GROUP BY score ORDER BY score`
        )
        .bind(date),
    ]);
    const stats = statsRes.results[0] as {
      totalPlayers: number;
      avgScore: number | null;
      maxScore: number | null;
      minScore: number | null;
    };

    // Country breakdown (if enough data)
    let countryStats: unknown[] = [];
    if (stats.totalPlayers >= 10) {
      const { results } = await db
        .prepare(
          `SELECT country_code, COUNT(*) as players, ROUND(AVG(score), 1) as avgScore
           FROM trivia_scores
           WHERE date = ? AND country_code IS NOT NULL
           GROUP BY country_code
           HAVING players >= 3
           ORDER BY avgScore DESC`
        )
        .bind(date)
        .all();
      countryStats = results;
    }

    // Percentile for a given score (optional query param)
    let percentile: number | null = null;
    const scoreParam = c.req.query("score");
    const userScore = scoreParam ? parseInt(scoreParam, 10) : null;
    if (userScore !== null && stats.totalPlayers > 0) {
      const below = await db
        .prepare("SELECT COUNT(*) as cnt FROM trivia_scores WHERE date = ? AND score < ?")
        .bind(date, userScore)
        .first<{ cnt: number }>();
      percentile = Math.round(((below?.cnt ?? 0) / stats.totalPlayers) * 100);
    }

    c.header("Cache-Control", "public, max-age=30");
    return c.json({
      date,
      totalPlayers: stats.totalPlayers,
      avgScore: stats.avgScore,
      maxScore: stats.maxScore,
      minScore: stats.minScore,
      distribution: distRes.results,
      countryStats,
      percentile,
    });
  } catch (err) {
    console.error("Trivia stats error:", err);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// ============================================================
// GET /trivia/practice: a random question (unlimited)
// ============================================================

router.get("/trivia/practice", async (c) => {
  try {
    const db = c.env.DB;
    // Exclude today's daily questions to prevent spoilers
    const excludeIds = (await readDaily(db, todayUTC())) ?? [];
    const format = c.req.query("format");

    const row = await db
      .prepare(
        `SELECT id, format, question_json FROM trivia_pool
         WHERE id NOT IN (SELECT value FROM json_each(?))
           ${format ? "AND format = ?" : ""}
         ORDER BY RANDOM() LIMIT 1`
      )
      .bind(...(format ? [JSON.stringify(excludeIds), format] : [JSON.stringify(excludeIds)]))
      .first<PoolRow>();

    if (!row) return c.json({ error: "No questions available" }, 404);

    const parsed = JSON.parse(row.question_json);
    // Returned without the answer; the client checks it via POST /trivia/answer
    return c.json({ id: row.id, format: row.format, question: parsed.question, options: parsed.options });
  } catch (err) {
    console.error("Trivia practice error:", err);
    return c.json({ error: "Failed to fetch practice question" }, 500);
  }
});

export default router;
