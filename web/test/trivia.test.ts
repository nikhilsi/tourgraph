// Trivia: lazy daily assembly, answers, scores and stats, including the two
// D1 race fixes (inventory 3.3) and the date check on /trivia/results.
import { describe, expect, it } from "vitest";
import { formatSlots, todayUTC } from "../src/server/api/routes/trivia";
import { getJson, one, rows } from "./helpers";

type Q = { id: number; format: string; question: string; options: unknown[]; correctIndex?: number; reveal?: unknown };

describe("daily", () => {
  it("assembles five questions in the day's format order, without answers", async () => {
    const { status, body, res } = await getJson<{ date: string; questions: Q[]; questionCount: number }>("/api/v1/trivia/daily");
    expect(status).toBe(200);
    expect(body.date).toBe(todayUTC());
    expect(body.questionCount).toBe(5);
    expect(body.questions.map((q) => q.format)).toEqual(formatSlots(body.date));
    expect(new Set(body.questions.map((q) => q.id)).size).toBe(5);
    for (const q of body.questions) {
      expect(Object.keys(q).sort()).toEqual(["format", "id", "options", "question"]);
    }
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");

    const again = await getJson<{ questions: Q[] }>("/api/v1/trivia/daily");
    expect(again.body.questions.map((q) => q.id)).toEqual(body.questions.map((q) => q.id));
    const used = await rows("SELECT id FROM trivia_pool WHERE used_date = ?", body.date);
    expect(used.length).toBe(5);
  });

  it("gives two simultaneous first requests the same set and burns only five", async () => {
    const date = "2027-03-03";
    const [a, b] = await Promise.all([
      getJson<{ questions: Q[] }>(`/api/v1/trivia/results?date=${date}`),
      getJson<{ questions: Q[] }>(`/api/v1/trivia/results?date=${date}`),
    ]);
    expect(a.body.questions.map((q) => q.id)).toEqual(b.body.questions.map((q) => q.id));
    const stored = await one<{ question_ids_json: string }>("SELECT question_ids_json FROM trivia_daily WHERE date = ?", date);
    expect(JSON.parse(stored.question_ids_json)).toEqual(a.body.questions.map((q) => q.id));
    const used = await rows("SELECT id FROM trivia_pool WHERE used_date = ?", date);
    expect(used.length).toBe(5);
  });
});

describe("results", () => {
  it("returns answers and reveals for a day", async () => {
    const { status, body } = await getJson<{ date: string; questions: Q[] }>("/api/v1/trivia/results?date=2027-01-02");
    expect(status).toBe(200);
    expect(body.date).toBe("2027-01-02");
    for (const q of body.questions) {
      expect(Object.keys(q).sort()).toEqual(["correctIndex", "format", "id", "options", "question", "reveal"]);
    }
  });

  it("refuses a malformed date instead of assembling it", async () => {
    const { status, body } = await getJson("/api/v1/trivia/results?date=garbage");
    expect(status).toBe(400);
    expect(body).toEqual({ error: "Invalid date" });
    expect((await rows("SELECT date FROM trivia_daily WHERE date = 'garbage'")).length).toBe(0);
  });
});

describe("answer", () => {
  it("checks an answer", async () => {
    const row = await one<{ id: number; question_json: string }>("SELECT id, question_json FROM trivia_pool LIMIT 1");
    const correctIndex = JSON.parse(row.question_json).correctIndex as number;
    const right = await getJson<{ correct: boolean; correctIndex: number }>("/api/v1/trivia/answer", {
      json: { questionId: row.id, selectedIndex: correctIndex },
    });
    expect(right.body.correct).toBe(true);
    expect(right.body.correctIndex).toBe(correctIndex);
    const wrong = await getJson<{ correct: boolean }>("/api/v1/trivia/answer", {
      json: { questionId: row.id, selectedIndex: correctIndex + 1 },
    });
    expect(wrong.body.correct).toBe(false);
  });

  it("validates input", async () => {
    expect((await getJson("/api/v1/trivia/answer", { json: {} })).body).toEqual({ error: "questionId and selectedIndex required" });
    const missing = await getJson("/api/v1/trivia/answer", { json: { questionId: 99999999, selectedIndex: 0 } });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "Question not found" });
  });
});

describe("score and stats", () => {
  it("saves one score per session per day, even when two arrive at once", async () => {
    const payload = { date: "2027-05-05", score: 4, sessionHash: "abc123", answers: [{ questionId: 1, correct: true }] };
    const results = await Promise.all([
      getJson("/api/v1/trivia/score", { json: payload }),
      getJson("/api/v1/trivia/score", { json: payload }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    expect(results.find((r) => r.status === 200)!.body).toEqual({ saved: true });
    expect(results.find((r) => r.status === 409)!.body).toEqual({ error: "Score already submitted for this date" });
    const saved = await rows<{ country_code: string | null }>("SELECT country_code FROM trivia_scores WHERE date = ?", "2027-05-05");
    expect(saved.length).toBe(1);
  });

  it("validates scores", async () => {
    expect((await getJson("/api/v1/trivia/score", { json: { date: "2027-05-06", score: 9, sessionHash: "x" } })).body).toEqual({
      error: "score must be 0-5",
    });
    expect((await getJson("/api/v1/trivia/score", { json: { score: 1 } })).body).toEqual({
      error: "date, score, and sessionHash required",
    });
  });

  it("reports stats for a day", async () => {
    for (const [i, score] of [1, 3, 3, 5].entries()) {
      await getJson("/api/v1/trivia/score", { json: { date: "2027-06-06", score, sessionHash: `s${i}` } });
    }
    const { body, res } = await getJson<Record<string, unknown>>("/api/v1/trivia/stats?date=2027-06-06&score=3");
    expect(body).toMatchObject({ date: "2027-06-06", totalPlayers: 4, avgScore: 3, maxScore: 5, minScore: 1, percentile: 25 });
    expect(body.distribution).toEqual([
      { score: 1, count: 1 },
      { score: 3, count: 2 },
      { score: 5, count: 1 },
    ]);
    expect(body.countryStats).toEqual([]);
    expect(res.headers.get("cache-control")).toBe("public, max-age=30");
  });

  it("reports empty stats as nulls", async () => {
    const { body } = await getJson<Record<string, unknown>>("/api/v1/trivia/stats?date=2001-01-01");
    expect(body).toMatchObject({ totalPlayers: 0, avgScore: null, maxScore: null, minScore: null, distribution: [], percentile: null });
  });
});

describe("practice", () => {
  it("serves a question without its answer, never one from today's daily", async () => {
    const daily = await getJson<{ questions: Q[] }>("/api/v1/trivia/daily");
    const dailyIds = daily.body.questions.map((q) => q.id);
    for (let i = 0; i < 10; i++) {
      const { status, body } = await getJson<Q>("/api/v1/trivia/practice?format=real_or_fake");
      expect(status).toBe(200);
      expect(body.format).toBe("real_or_fake");
      expect(Object.keys(body).sort()).toEqual(["format", "id", "options", "question"]);
      expect(dailyIds).not.toContain(body.id);
    }
  });

  it("returns 404 for a format with no questions", async () => {
    const { status, body } = await getJson("/api/v1/trivia/practice?format=nope");
    expect(status).toBe(404);
    expect(body).toEqual({ error: "No questions available" });
  });
});
