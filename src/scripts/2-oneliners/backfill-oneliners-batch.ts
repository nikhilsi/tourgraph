// ============================================================
// Batch Backfill One-Liners (20 tours per API call)
// Generates AI one-liners using Claude Haiku in batches of 20.
// ~15-20x faster than the single-tour version.
//
// Run: npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts
//      npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts --limit 1000
//      npx tsx src/scripts/2-oneliners/backfill-oneliners-batch.ts --dry-run
// ============================================================

import { loadEnv } from "../../lib/env";
import { getDb, updateTourFields } from "../../lib/db";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

loadEnv();

const BATCH_SIZE = 20;
const DELAY_BETWEEN_CALLS_MS = 300;
const MAX_ONE_LINER_LENGTH = 150;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You write witty, warm, one-line descriptions of tours and experiences.
Your tone is wonder-filled and playful — never snarky or mean.
The goal is to make someone smile and want to share this with a friend.
Keep each one-liner under ${MAX_ONE_LINER_LENGTH} characters. No hashtags, no emojis.

You will receive a batch of tours. Return a JSON object mapping each product_code to its one-liner.
Example: {"PROD1": "Your witty line here", "PROD2": "Another witty line"}
Return ONLY valid JSON, nothing else.`;

interface TourRow {
  product_code: string;
  title: string;
  destination_name: string;
  country: string;
  rating: number | null;
  review_count: number | null;
  from_price: number | null;
  duration_minutes: number | null;
  description: string | null;
}

// ============================================================
// Logging
// ============================================================

const LOG_DIR = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const LOG_FILE = path.join(LOG_DIR, `backfill-batch-${timestamp}.log`);

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function logError(msg: string) {
  const line = `[${new Date().toISOString()}] ERROR: ${msg}`;
  console.error(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// ============================================================
// Claude client
// ============================================================

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  client = new Anthropic({ apiKey });
  return client;
}

// ============================================================
// Batch generation
// ============================================================

function formatTourForPrompt(tour: TourRow): string {
  const duration = tour.duration_minutes
    ? `${Math.round((tour.duration_minutes / 60) * 10) / 10} hours`
    : "unknown";
  const desc = (tour.description ?? "").slice(0, 150);

  return `[${tour.product_code}] ${tour.title}
  Location: ${tour.destination_name}, ${tour.country}
  Rating: ${tour.rating ?? "N/A"}★ (${tour.review_count ?? 0} reviews) | $${tour.from_price ?? "N/A"} | ${duration}
  ${desc ? `Description: ${desc}` : ""}`;
}

async function generateBatch(
  tours: TourRow[]
): Promise<Record<string, string>> {
  const toursText = tours.map(formatTourForPrompt).join("\n\n");

  const userPrompt = `Write a witty one-liner for each of these ${tours.length} tours. Return JSON mapping product_code to one-liner.\n\n${toursText}`;

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : null;
  if (!text) throw new Error("Empty response from Claude");

  // Extract JSON — handle cases where model wraps in ```json blocks
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object, got: ${typeof parsed}`);
  }

  // Validate and clean each one-liner
  const result: Record<string, string> = {};
  for (const [code, liner] of Object.entries(parsed)) {
    if (typeof liner !== "string" || liner.trim().length === 0) continue;

    let clean = liner.trim();
    // Remove surrounding quotes
    if (
      (clean.startsWith('"') && clean.endsWith('"')) ||
      (clean.startsWith("'") && clean.endsWith("'"))
    ) {
      clean = clean.slice(1, -1);
    }
    // Truncate at word boundary if too long
    if (clean.length > MAX_ONE_LINER_LENGTH) {
      const trimmed = clean.slice(0, MAX_ONE_LINER_LENGTH - 1);
      const lastSpace = trimmed.lastIndexOf(" ");
      clean = (lastSpace > 80 ? trimmed.slice(0, lastSpace) : trimmed) + "…";
    }
    result[code] = clean;
  }

  return result;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const limit = getArgValue("--limit");
  const dryRun = process.argv.includes("--dry-run");

  log("=".repeat(60));
  log("Batch One-Liner Backfill");
  log(`Model: ${CLAUDE_MODEL}`);
  log(`Batch size: ${BATCH_SIZE}`);
  log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  log(`Log file: ${LOG_FILE}`);
  log("=".repeat(60));

  const db = getDb(true);

  const countRow = db
    .prepare(
      "SELECT COUNT(*) as c FROM tours WHERE one_liner IS NULL AND status = 'active'"
    )
    .get() as { c: number };

  const effectiveLimit = limit ? Math.min(limit, countRow.c) : countRow.c;

  log(`Tours missing one-liners: ${countRow.c}`);
  log(`Will process: ${effectiveLimit}`);

  if (effectiveLimit === 0) {
    log("Nothing to do!");
    return;
  }

  const tours = db
    .prepare(
      `SELECT product_code, title, destination_name, country, rating, review_count,
              from_price, duration_minutes, description
       FROM tours
       WHERE one_liner IS NULL AND status = 'active'
       ORDER BY review_count DESC
       LIMIT ?`
    )
    .all(effectiveLimit) as TourRow[];

  let generated = 0;
  let failed = 0;
  let batchErrors = 0;
  const startTime = Date.now();

  const totalBatches = Math.ceil(tours.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = tours.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = batchIdx + 1;

    try {
      const results = await generateBatch(batch);
      const returnedCount = Object.keys(results).length;

      // Write each result to DB
      for (const tour of batch) {
        const oneLiner = results[tour.product_code];
        if (oneLiner) {
          if (!dryRun) {
            updateTourFields(tour.product_code, { one_liner: oneLiner });
          }
          generated++;
        } else {
          failed++;
          logError(
            `Missing in response: ${tour.product_code} — ${tour.title}`
          );
        }
      }

      // Progress
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = generated / (Number(elapsed) || 1);
      const remaining = effectiveLimit - (batchStart + batch.length);
      const eta = rate > 0 ? Math.round(remaining / rate) : 0;
      const etaMin = Math.floor(eta / 60);
      const etaSec = eta % 60;

      log(
        `Batch ${batchNum}/${totalBatches}: ${returnedCount}/${batch.length} generated | ` +
          `Total: ${generated}/${batchStart + batch.length} | ` +
          `${elapsed}s elapsed | ETA: ${etaMin}m${etaSec}s`
      );

      // Log a sample one-liner from this batch
      const sampleCode = Object.keys(results)[0];
      if (sampleCode) {
        const sampleTour = batch.find((t) => t.product_code === sampleCode);
        log(`  Sample: "${sampleTour?.title}" → "${results[sampleCode]}"`);
      }
    } catch (error) {
      batchErrors++;
      const errMsg =
        error instanceof Error ? error.message : String(error);
      logError(
        `Batch ${batchNum} failed: ${errMsg}`
      );

      // Log which tours were in the failed batch
      for (const tour of batch) {
        failed++;
        logError(`  Skipped: ${tour.product_code} — ${tour.title}`);
      }

      // If too many consecutive batch errors, something is wrong
      if (batchErrors >= 5) {
        logError("Too many consecutive batch errors. Stopping.");
        break;
      }
    }

    // Rate limiting
    if (batchIdx < totalBatches - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_CALLS_MS)
      );
    }

    // Reset consecutive error count on success
    if (batchErrors > 0 && batchIdx > 0) {
      // Only reset if the last batch succeeded (no error thrown)
      batchErrors = 0;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  log("");
  log("=".repeat(60));
  log("Backfill complete!");
  log(`  Processed: ${tours.length}`);
  log(`  Generated: ${generated}`);
  log(`  Failed: ${failed}`);
  log(`  Batch errors: ${batchErrors}`);
  log(`  Time: ${totalTime}s`);
  log(`  Rate: ${(generated / (Number(totalTime) || 1)).toFixed(1)} tours/sec`);
  log("=".repeat(60));
}

function getArgValue(flag: string): number | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  const val = parseInt(process.argv[idx + 1], 10);
  return isNaN(val) ? null : val;
}

main().catch((err) => {
  logError(`Fatal error: ${err}`);
  process.exit(1);
});
