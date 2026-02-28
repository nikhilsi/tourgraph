// ============================================================
// Backfill One-Liners
// Generates AI one-liners for tours that don't have them yet.
//
// Run: npx tsx src/scripts/backfill-oneliners.ts
//       npx tsx src/scripts/backfill-oneliners.ts --limit 100
//       npx tsx src/scripts/backfill-oneliners.ts --dry-run
// ============================================================

import { loadEnv } from "../lib/env";
import { getDb, updateTourFields } from "../lib/db";
import { generateOneLiner } from "../lib/claude";

loadEnv();

const BATCH_SIZE = 20;
const DELAY_BETWEEN_CALLS_MS = 200;

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

async function main() {
  const limit = getArgValue("--limit");
  const dryRun = process.argv.includes("--dry-run");

  const db = getDb(true);
  const writeDb = dryRun ? null : getDb();

  const countRow = db
    .prepare(
      "SELECT COUNT(*) as c FROM tours WHERE one_liner IS NULL AND status = 'active'"
    )
    .get() as { c: number };

  const effectiveLimit = limit ? Math.min(limit, countRow.c) : countRow.c;

  console.log(`Tours missing one-liners: ${countRow.c}`);
  console.log(`Will process: ${effectiveLimit}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  if (effectiveLimit === 0) {
    console.log("Nothing to do!");
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

  for (let i = 0; i < tours.length; i++) {
    const tour = tours[i];
    const progress = `[${i + 1}/${tours.length}]`;

    try {
      const oneLiner = await generateOneLiner({
        title: tour.title,
        destinationName: tour.destination_name,
        country: tour.country,
        rating: tour.rating,
        reviewCount: tour.review_count,
        fromPrice: tour.from_price,
        durationMinutes: tour.duration_minutes,
        description: tour.description,
      });

      if (oneLiner) {
        if (!dryRun && writeDb) {
          updateTourFields(tour.product_code, { one_liner: oneLiner });
        }
        generated++;
        console.log(`${progress} ${tour.title}`);
        console.log(`         → "${oneLiner}"`);
      } else {
        failed++;
        console.log(`${progress} ${tour.title} — no result`);
      }
    } catch (error) {
      failed++;
      console.error(`${progress} ${tour.title} — error: ${error}`);
    }

    // Rate limiting
    if (i < tours.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    }

    // Progress summary every batch
    if ((i + 1) % BATCH_SIZE === 0) {
      console.log(
        `\n--- Progress: ${i + 1}/${tours.length} (${generated} generated, ${failed} failed) ---\n`
      );
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("Backfill complete!");
  console.log(`  Processed: ${tours.length}`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Failed: ${failed}`);
}

function getArgValue(flag: string): number | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  const val = parseInt(process.argv[idx + 1], 10);
  return isNaN(val) ? null : val;
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
