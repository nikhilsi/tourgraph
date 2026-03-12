import { Router, Request, Response } from "express";
import { getDb, getWriteDb } from "../db";

const router = Router();

// ============================================================
// Types
// ============================================================

interface PoolRow {
  id: number;
  format: string;
  question_json: string;
  used_date: string | null;
}

interface DailyRow {
  date: string;
  question_ids_json: string;
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

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Lazy daily assembly: on first request for a date, picks 5 unused
 * questions from the pool (one per format slot), writes to trivia_daily,
 * marks them used. Self-healing — no cron needed.
 */
function getOrAssembleDaily(date: string): TriviaQuestionWithAnswer[] {
  const readDb = getDb();

  // Check if already assembled
  const existing = readDb
    .prepare("SELECT question_ids_json FROM trivia_daily WHERE date = ?")
    .get(date) as DailyRow | undefined;

  if (existing) {
    const ids = JSON.parse(existing.question_ids_json) as number[];
    return fetchQuestionsByIds(ids);
  }

  // Assemble: pick from pool using the daily mix rotation
  const writeDb = getWriteDb();

  // Daily mix: 5 format slots that rotate across days
  // Slot 1: warm-up (higher_or_lower or odd_one_out)
  // Slot 2: geography (where_in_world or city_personality)
  // Slot 3: crowd-pleaser (real_or_fake — always included)
  // Slot 4: culture (the_connection)
  // Slot 5: wild card (numbers_game or any unused format)
  const dayNum = Math.floor(
    (new Date(date + "T00:00:00Z").getTime() - new Date("2026-01-01T00:00:00Z").getTime()) /
      86400000
  );

  const warmup = dayNum % 2 === 0 ? "higher_or_lower" : "odd_one_out";
  const geo = dayNum % 2 === 0 ? "where_in_world" : "city_personality";
  const wildcards = ["numbers_game", "higher_or_lower", "odd_one_out", "where_in_world", "city_personality"];
  const wildcard = wildcards[dayNum % wildcards.length];

  const formatSlots = [warmup, geo, "real_or_fake", "the_connection", wildcard];

  const pickedIds: number[] = [];

  for (const format of formatSlots) {
    const row = writeDb
      .prepare(
        `SELECT id FROM trivia_pool
         WHERE format = ? AND used_date IS NULL
         ORDER BY RANDOM() LIMIT 1`
      )
      .get(format) as { id: number } | undefined;

    if (row) {
      pickedIds.push(row.id);
      writeDb.prepare("UPDATE trivia_pool SET used_date = ? WHERE id = ?").run(date, row.id);
    } else {
      // Fallback: reuse oldest used question of this format
      const fallback = writeDb
        .prepare(
          `SELECT id FROM trivia_pool
           WHERE format = ? ORDER BY used_date ASC LIMIT 1`
        )
        .get(format) as { id: number } | undefined;
      if (fallback) {
        pickedIds.push(fallback.id);
        writeDb.prepare("UPDATE trivia_pool SET used_date = ? WHERE id = ?").run(date, fallback.id);
      }
    }
  }

  if (pickedIds.length === 0) {
    return [];
  }

  // Write to trivia_daily
  writeDb
    .prepare("INSERT OR IGNORE INTO trivia_daily (date, question_ids_json) VALUES (?, ?)")
    .run(date, JSON.stringify(pickedIds));

  return fetchQuestionsByIds(pickedIds);
}

function fetchQuestionsByIds(ids: number[]): TriviaQuestionWithAnswer[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT id, format, question_json FROM trivia_pool WHERE id IN (${placeholders})`)
    .all(...ids) as PoolRow[];

  // Preserve order from ids array
  const rowMap = new Map(rows.map((r) => [r.id, r]));
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
  return questions.map(({ correctIndex, reveal, ...rest }) => rest);
}

// ============================================================
// GET /trivia/daily — Today's 5 questions (no answers)
// ============================================================

router.get("/trivia/daily", (req: Request, res: Response) => {
  try {
    const date = todayUTC();
    const questions = getOrAssembleDaily(date);

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      date,
      questions: stripAnswers(questions),
      questionCount: questions.length,
    });
  } catch (err) {
    console.error("Trivia daily error:", err);
    res.status(500).json({ error: "Failed to fetch daily trivia" });
  }
});

// ============================================================
// POST /trivia/answer — Submit answer for one question
// ============================================================

router.post("/trivia/answer", (req: Request, res: Response) => {
  try {
    const { questionId, selectedIndex } = req.body;

    if (typeof questionId !== "number" || typeof selectedIndex !== "number") {
      res.status(400).json({ error: "questionId and selectedIndex required" });
      return;
    }

    const db = getDb();
    const row = db
      .prepare("SELECT question_json FROM trivia_pool WHERE id = ?")
      .get(questionId) as { question_json: string } | undefined;

    if (!row) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    const parsed = JSON.parse(row.question_json);
    const correct = selectedIndex === parsed.correctIndex;

    res.json({
      correct,
      correctIndex: parsed.correctIndex,
      reveal: parsed.reveal,
    });
  } catch (err) {
    console.error("Trivia answer error:", err);
    res.status(500).json({ error: "Failed to check answer" });
  }
});

// ============================================================
// GET /trivia/results — Full results for today (after completion)
// ============================================================

router.get("/trivia/results", (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || todayUTC();
    const questions = getOrAssembleDaily(date);

    res.json({
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
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// ============================================================
// POST /trivia/score — Submit daily score
// ============================================================

router.post("/trivia/score", (req: Request, res: Response) => {
  try {
    const { date, score, sessionHash, answers } = req.body;

    if (!date || typeof score !== "number" || !sessionHash) {
      res.status(400).json({ error: "date, score, and sessionHash required" });
      return;
    }

    if (score < 0 || score > 5) {
      res.status(400).json({ error: "score must be 0-5" });
      return;
    }

    // Get country from nginx GeoIP header (set up in step 2d)
    const countryCode =
      (req.headers["x-country-code"] as string) || null;

    const writeDb = getWriteDb();

    // Prevent duplicate submissions (same session + date)
    const existing = writeDb
      .prepare("SELECT id FROM trivia_scores WHERE date = ? AND session_hash = ?")
      .get(date, sessionHash);

    if (existing) {
      res.status(409).json({ error: "Score already submitted for this date" });
      return;
    }

    writeDb
      .prepare(
        `INSERT INTO trivia_scores (date, score, session_hash, country_code, answers_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        date,
        score,
        sessionHash,
        countryCode,
        answers ? JSON.stringify(answers) : null
      );

    res.json({ saved: true });
  } catch (err) {
    console.error("Trivia score error:", err);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// ============================================================
// GET /trivia/stats — Anonymous leaderboard data
// ============================================================

router.get("/trivia/stats", (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || todayUTC();
    const db = getDb();

    // Overall stats for this date
    const stats = db
      .prepare(
        `SELECT
           COUNT(*) as totalPlayers,
           ROUND(AVG(score), 1) as avgScore,
           MAX(score) as maxScore,
           MIN(score) as minScore
         FROM trivia_scores WHERE date = ?`
      )
      .get(date) as {
        totalPlayers: number;
        avgScore: number;
        maxScore: number;
        minScore: number;
      };

    // Score distribution
    const distribution = db
      .prepare(
        `SELECT score, COUNT(*) as count
         FROM trivia_scores WHERE date = ?
         GROUP BY score ORDER BY score`
      )
      .all(date) as { score: number; count: number }[];

    // Country breakdown (if enough data)
    let countryStats: any[] = [];
    if (stats.totalPlayers >= 10) {
      countryStats = db
        .prepare(
          `SELECT country_code, COUNT(*) as players, ROUND(AVG(score), 1) as avgScore
           FROM trivia_scores
           WHERE date = ? AND country_code IS NOT NULL
           GROUP BY country_code
           HAVING players >= 3
           ORDER BY avgScore DESC`
        )
        .all(date) as any[];
    }

    // Percentile for a given score (optional query param)
    let percentile: number | null = null;
    const userScore = req.query.score ? parseInt(req.query.score as string, 10) : null;
    if (userScore !== null && stats.totalPlayers > 0) {
      const below = db
        .prepare("SELECT COUNT(*) as cnt FROM trivia_scores WHERE date = ? AND score < ?")
        .get(date, userScore) as { cnt: number };
      percentile = Math.round((below.cnt / stats.totalPlayers) * 100);
    }

    res.set("Cache-Control", "public, max-age=30");
    res.json({
      date,
      totalPlayers: stats.totalPlayers,
      avgScore: stats.avgScore,
      maxScore: stats.maxScore,
      minScore: stats.minScore,
      distribution,
      countryStats,
      percentile,
    });
  } catch (err) {
    console.error("Trivia stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ============================================================
// GET /trivia/practice — Random question (unlimited)
// ============================================================

router.get("/trivia/practice", (req: Request, res: Response) => {
  try {
    const db = getDb();
    const today = todayUTC();

    // Exclude today's daily questions to prevent spoilers
    const daily = db
      .prepare("SELECT question_ids_json FROM trivia_daily WHERE date = ?")
      .get(today) as DailyRow | undefined;

    const excludeIds = daily ? (JSON.parse(daily.question_ids_json) as number[]) : [];
    const excludeClause =
      excludeIds.length > 0
        ? `AND id NOT IN (${excludeIds.map(() => "?").join(",")})`
        : "";

    // Optional format filter
    const format = req.query.format as string | undefined;
    const formatClause = format ? "AND format = ?" : "";
    const formatParams = format ? [format] : [];

    const row = db
      .prepare(
        `SELECT id, format, question_json FROM trivia_pool
         WHERE 1=1 ${excludeClause} ${formatClause}
         ORDER BY RANDOM() LIMIT 1`
      )
      .get(...excludeIds, ...formatParams) as PoolRow | undefined;

    if (!row) {
      res.status(404).json({ error: "No questions available" });
      return;
    }

    const parsed = JSON.parse(row.question_json);

    // Return without answer — client submits via POST /trivia/answer
    res.json({
      id: row.id,
      format: row.format,
      question: parsed.question,
      options: parsed.options,
    });
  } catch (err) {
    console.error("Trivia practice error:", err);
    res.status(500).json({ error: "Failed to fetch practice question" });
  }
});

export default router;
