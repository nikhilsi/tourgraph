// ============================================================
// TourGraph Drip + Delta Indexer
//
// Cycles through Viator destinations, searches for tours,
// fetches details for new/changed products, generates
// AI one-liners, and assigns weight categories.
//
// Modes:
//   --dest <id>         Index a single destination
//   --full              Index all leaf destinations (default, skips countries/states)
//   --full --all-destinations   Index ALL destinations (including parents)
//   --continue          Resume from last position
//   --limit <n>         Process at most n destinations
//   --no-ai             Skip one-liner generation (faster)
//
// Logs: Output is written to both console and logs/indexer-<timestamp>.log
//
// Run: npx tsx src/scripts/indexer.ts --dest 704
//      npx tsx src/scripts/indexer.ts --full --no-ai
// ============================================================

import { ViatorClient, extractCoverImageUrl, extractAllImageUrls, extractDurationMinutes, extractInclusions } from "../lib/viator";
import { loadEnv } from "../lib/env";
import {
  getDb,
  insertOrUpdateTour,
  updateTourFields,
  getActiveToursForDestination,
  markToursInactive,
  getIndexerState,
  setIndexerState,
  getAllDestinations,
  getLeafDestinations,
  getActiveTourCount,
} from "../lib/db";
import { generateOneLiner } from "../lib/claude";
import { continentFromLookupId } from "../lib/continents";
import type { ViatorSearchProduct, WeightCategory } from "../lib/types";
import crypto from "crypto";
import fs from "fs";
import path from "path";

loadEnv();

// ============================================================
// Logging — tee to console + file
// ============================================================

let logStream: fs.WriteStream | null = null;

function initLogging(): string {
  const logsDir = path.resolve("logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logPath = path.join(logsDir, `indexer-${timestamp}.log`);
  logStream = fs.createWriteStream(logPath, { flags: "a" });
  return logPath;
}

function closeLogging(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

function log(msg: string): void {
  const line = msg;
  console.log(line);
  logStream?.write(line + "\n");
}

function logError(msg: string): void {
  const line = msg;
  console.error(line);
  logStream?.write("[ERROR] " + line + "\n");
}

// ============================================================
// Formatting helpers
// ============================================================

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================
// Weight category thresholds (M15: named constants)
// ============================================================

const WEIGHT_THRESHOLDS = {
  HIGHEST_RATED_MIN_RATING: 4.9,
  HIGHEST_RATED_MIN_REVIEWS: 50,
  MOST_REVIEWED_MIN_REVIEWS: 1000,
  MOST_EXPENSIVE_MIN_PRICE: 500,
  CHEAPEST_5STAR_MIN_RATING: 4.8,
  CHEAPEST_5STAR_MAX_PRICE: 30,
} as const;

// Tag IDs for "unique" weight category
const UNIQUE_TAG_IDS = new Set([
  21074, // Unique Experiences
  11940, // Once in a Lifetime Experiences
  11923, // Extreme Sports
]);

// ============================================================
// Summary Hash — delta detection
// ============================================================

function computeSummaryHash(p: ViatorSearchProduct): string {
  const data = [
    p.productCode,
    p.title,
    p.pricing?.summary?.fromPrice ?? "",
    p.reviews?.combinedAverageRating ?? "",
    p.reviews?.totalReviews ?? "",
  ].join("|");
  return crypto.createHash("md5").update(data).digest("hex");
}

// ============================================================
// Search a single destination with 4 sort strategies
// ============================================================

async function searchDestination(
  client: ViatorClient,
  destId: string
): Promise<Map<string, ViatorSearchProduct>> {
  const products = new Map<string, ViatorSearchProduct>();

  const strategies: { sort: string; order?: string }[] = [
    { sort: "DEFAULT" },
    { sort: "TRAVELER_RATING", order: "DESCENDING" },
    { sort: "PRICE", order: "ASCENDING" },
    { sort: "PRICE", order: "DESCENDING" },
  ];

  for (const strategy of strategies) {
    try {
      const result = await client.searchProducts(destId, {
        sort: strategy.sort,
        order: strategy.order,
        count: 50,
      });
      for (const p of result.products) {
        if (!products.has(p.productCode)) {
          products.set(p.productCode, p);
        }
      }
    } catch (error) {
      logError(
        `    Search failed (${strategy.sort} ${strategy.order || ""}): ${error}`
      );
    }
  }

  return products;
}

// ============================================================
// Classify products: new, changed, unchanged, missing
// ============================================================

function classifyProducts(
  searchResults: Map<string, ViatorSearchProduct>,
  cachedTours: Map<string, string | null>
): {
  newProducts: ViatorSearchProduct[];
  changedProducts: ViatorSearchProduct[];
  unchangedCodes: string[];
  missingCodes: string[];
} {
  const newProducts: ViatorSearchProduct[] = [];
  const changedProducts: ViatorSearchProduct[] = [];
  const unchangedCodes: string[] = [];

  for (const [code, product] of searchResults) {
    const cachedHash = cachedTours.get(code);
    if (cachedHash === undefined) {
      newProducts.push(product);
    } else {
      const currentHash = computeSummaryHash(product);
      if (currentHash !== cachedHash) {
        changedProducts.push(product);
      } else {
        unchangedCodes.push(code);
      }
    }
  }

  const missingCodes: string[] = [];
  for (const code of cachedTours.keys()) {
    if (!searchResults.has(code)) {
      missingCodes.push(code);
    }
  }

  return { newProducts, changedProducts, unchangedCodes, missingCodes };
}

// ============================================================
// Weight Category Assignment (M15: use named thresholds)
// ============================================================

function assignWeightCategory(tour: {
  rating: number | null;
  reviewCount: number | null;
  fromPrice: number | null;
  tags: number[];
  isTopDestination: boolean;
}): WeightCategory {
  const { rating, reviewCount, fromPrice, tags, isTopDestination } = tour;

  if (rating && rating >= WEIGHT_THRESHOLDS.HIGHEST_RATED_MIN_RATING &&
      reviewCount && reviewCount >= WEIGHT_THRESHOLDS.HIGHEST_RATED_MIN_REVIEWS) {
    return "highest_rated";
  }
  if (reviewCount && reviewCount >= WEIGHT_THRESHOLDS.MOST_REVIEWED_MIN_REVIEWS) {
    return "most_reviewed";
  }
  if (fromPrice && fromPrice >= WEIGHT_THRESHOLDS.MOST_EXPENSIVE_MIN_PRICE) {
    return "most_expensive";
  }
  if (rating && rating >= WEIGHT_THRESHOLDS.CHEAPEST_5STAR_MIN_RATING &&
      fromPrice && fromPrice <= WEIGHT_THRESHOLDS.CHEAPEST_5STAR_MAX_PRICE) {
    return "cheapest_5star";
  }
  if (tags.some((t) => UNIQUE_TAG_IDS.has(t))) {
    return "unique";
  }
  if (!isTopDestination) {
    return "exotic_location";
  }
  return "wildcard";
}

// ============================================================
// Top destinations (for exotic_location classification)
// ============================================================

const TOP_DESTINATION_IDS = new Set([
  // North America
  "684", "704", "712", "651", "828", "662", "286", "298", "287", "641",
  // Europe
  "479", "737", "525", "511", "541", "542", "523", "538", "518", "919",
  // Asia
  "334", "349", "367", "364", "351", "2363", "355", "343", "20044", "317",
  // South America / Africa
  "318", "806", "910", "296", "290",
]);

// ============================================================
// Process a single destination
// ============================================================

export async function processDestination(
  client: ViatorClient,
  destId: string,
  destName: string,
  lookupId: string,
  options: { skipAi: boolean }
): Promise<{ newCount: number; changedCount: number; totalSearched: number; errors: number }> {
  // Step 1: Search with 4 strategies
  const searchResults = await searchDestination(client, destId);

  if (searchResults.size === 0) {
    return { newCount: 0, changedCount: 0, totalSearched: 0, errors: 0 };
  }

  // Step 2: Get cached tours for this destination
  const cachedRows = getActiveToursForDestination(destId);
  const cachedTours = new Map<string, string | null>();
  for (const row of cachedRows) {
    cachedTours.set(row.product_code, row.summary_hash);
  }

  // Step 3: Classify
  const { newProducts, changedProducts, unchangedCodes, missingCodes } =
    classifyProducts(searchResults, cachedTours);

  log(
    `    Found ${searchResults.size} products: ${newProducts.length} new, ${changedProducts.length} changed, ${unchangedCodes.length} unchanged, ${missingCodes.length} missing`
  );

  // M8: Wrap mark-inactive + changed-product updates in a transaction
  const db = getDb();
  try {
    db.transaction(() => {
      // Step 4: Mark missing products inactive
      if (missingCodes.length > 0) {
        markToursInactive(missingCodes);
      }

      // Step 5: Update changed products
      for (const p of changedProducts) {
        updateTourFields(p.productCode, {
          rating: p.reviews?.combinedAverageRating ?? null,
          review_count: p.reviews?.totalReviews ?? null,
          from_price: p.pricing?.summary?.fromPrice ?? null,
          summary_hash: computeSummaryHash(p),
        });
      }
    })();
  } catch (error) {
    // H7: Don't crash the indexer on DB errors
    logError(`    Failed to update existing tours: ${error}`);
  }

  // Step 6: Fetch full details for new products
  const continent = continentFromLookupId(lookupId);
  const countryId = lookupId.split(".")[1];
  const allDests = getAllDestinations();
  const countryDest = allDests.find((d) => d.id === countryId);
  const countryName = countryDest?.name || "Unknown";

  let actuallyInserted = 0;
  let fetchErrors = 0;
  for (const p of newProducts) {
    try {
      const detail = await client.getProduct(p.productCode);

      const coverUrl = extractCoverImageUrl(detail);
      const allImageUrls = extractAllImageUrls(detail);
      const durationMinutes = extractDurationMinutes(detail);
      const inclusions = extractInclusions(detail);

      const tags = detail.tags || [];
      const weightCategory = assignWeightCategory({
        rating: detail.reviews?.combinedAverageRating ?? null,
        reviewCount: detail.reviews?.totalReviews ?? null,
        fromPrice: p.pricing?.summary?.fromPrice ?? null,
        tags,
        isTopDestination: TOP_DESTINATION_IDS.has(destId),
      });

      let oneLiner: string | null = null;
      if (!options.skipAi) {
        oneLiner = await generateOneLiner({
          title: detail.title,
          destinationName: destName,
          country: countryName,
          rating: detail.reviews?.combinedAverageRating ?? null,
          reviewCount: detail.reviews?.totalReviews ?? null,
          fromPrice: p.pricing?.summary?.fromPrice ?? null,
          durationMinutes,
          description: detail.description,
        });
      }

      insertOrUpdateTour({
        product_code: detail.productCode,
        title: detail.title,
        description: detail.description,
        one_liner: oneLiner,
        destination_id: destId,
        destination_name: destName,
        country: countryName,
        continent,
        timezone: detail.timeZone || null,
        latitude: null,
        longitude: null,
        rating: detail.reviews?.combinedAverageRating ?? null,
        review_count: detail.reviews?.totalReviews ?? null,
        from_price: p.pricing?.summary?.fromPrice ?? null,
        currency: p.pricing?.currency || "USD",
        duration_minutes: durationMinutes,
        image_url: coverUrl,
        image_urls_json: JSON.stringify(allImageUrls),
        highlights_json: null,
        inclusions_json: JSON.stringify(inclusions),
        viator_url: detail.productUrl || null,
        supplier_name: detail.supplier?.name || null,
        tags_json: JSON.stringify(tags),
        weight_category: weightCategory,
        status: "active",
        summary_hash: computeSummaryHash(p),
      });

      actuallyInserted++;

      if (oneLiner) {
        log(`      + ${detail.productCode}: "${detail.title}" [${weightCategory}]`);
        log(`        "${oneLiner}"`);
      } else {
        log(`      + ${detail.productCode}: "${detail.title}" [${weightCategory}]`);
      }
    } catch (error) {
      fetchErrors++;
      logError(`      Failed to fetch ${p.productCode}: ${error}`);
    }
  }

  return {
    newCount: actuallyInserted,
    changedCount: changedProducts.length,
    totalSearched: searchResults.size,
    errors: fetchErrors,
  };
}

// ============================================================
// Main
// ============================================================

const BATCH_LOG_INTERVAL = 50;

async function main() {
  const args = process.argv.slice(2);
  const destArg = args.includes("--dest")
    ? args[args.indexOf("--dest") + 1]
    : null;
  const fullMode = args.includes("--full");
  const continueMode = args.includes("--continue");
  const allDestsMode = args.includes("--all-destinations");
  const limitArg = args.includes("--limit")
    ? parseInt(args[args.indexOf("--limit") + 1])
    : null;
  const skipAi = args.includes("--no-ai");

  // Initialize file logging
  const logPath = initLogging();
  const runStartTime = Date.now();

  log("TourGraph Indexer");
  log("=================");
  log(`Started: ${new Date().toISOString()}`);
  log(`Log file: ${logPath}\n`);

  const client = new ViatorClient();

  if (destArg) {
    // Single destination mode
    log(`Mode: single destination (${destArg})`);
    if (skipAi) log("AI one-liners: DISABLED (--no-ai)");

    const viatorDests = await client.getDestinations();
    const dest = viatorDests.find(
      (d) => String(d.destinationId) === destArg
    );

    if (!dest) {
      logError(`Destination ${destArg} not found`);
      closeLogging();
      process.exit(1);
    }

    const destStart = Date.now();
    log(`\n  Processing: ${dest.name} (${dest.type})`);
    const result = await processDestination(
      client,
      destArg,
      dest.name,
      dest.lookupId,
      { skipAi }
    );
    const destElapsed = ((Date.now() - destStart) / 1000).toFixed(1);
    log(
      `\n  Result: ${result.totalSearched} searched, ${result.newCount} new, ${result.changedCount} changed (${destElapsed}s)`
    );

    // Summary
    const totalElapsed = Date.now() - runStartTime;
    log(`\n${"=".repeat(50)}`);
    log(`Duration: ${formatDuration(totalElapsed)}`);
    log(`Viator API calls: ${client.getRequestCount()}`);
    log(`Total active tours in DB: ${getActiveTourCount()}`);

  } else if (fullMode || continueMode) {
    // Multi-destination mode
    const useLeaves = !allDestsMode;
    const destinations = useLeaves ? getLeafDestinations() : getAllDestinations();

    if (destinations.length === 0) {
      logError(
        "No destinations in DB. Run seed-destinations first:\n  npx tsx src/scripts/seed-destinations.ts"
      );
      closeLogging();
      process.exit(1);
    }

    log(`Destination mode: ${useLeaves ? "leaf nodes only" : "ALL destinations (including parents)"}`);
    log(`Total destinations: ${destinations.length}`);
    if (skipAi) log("AI one-liners: DISABLED (--no-ai)");

    // Fetch Viator destinations for lookupId data
    log("\nFetching destination metadata from Viator...");
    const viatorDests = await client.getDestinations();
    const viatorById = new Map(
      viatorDests.map((d) => [String(d.destinationId), d])
    );
    log(`  Viator returned ${viatorDests.length} destinations`);

    // H8: Resume using destination ID, not array index
    let startIdx = 0;
    if (continueMode) {
      const savedDestId = getIndexerState("last_destination_id");
      if (savedDestId) {
        const foundIdx = destinations.findIndex((d) => d.id === savedDestId);
        startIdx = foundIdx >= 0 ? foundIdx + 1 : 0;
        log(`Resuming from destination ${savedDestId} (position ${startIdx})`);
      }
    }

    const limit = limitArg || destinations.length;
    const endIdx = Math.min(startIdx + limit, destinations.length);

    log(
      `\nProcessing destinations ${startIdx + 1} to ${endIdx} of ${destinations.length}`
    );
    log("");

    let totalNew = 0;
    let totalChanged = 0;
    let totalSearched = 0;
    let totalErrors = 0;
    let processed = 0;
    let skipped = 0;
    let emptyDests = 0;
    const destTimes: number[] = [];

    for (let i = startIdx; i < endIdx; i++) {
      const dest = destinations[i];
      const viatorDest = viatorById.get(dest.id);

      if (!viatorDest) {
        log(`  [${i + 1}/${destinations.length}] ${dest.name} — skipped (no Viator metadata)`);
        skipped++;
        continue;
      }

      const destStart = Date.now();

      const result = await processDestination(
        client,
        dest.id,
        dest.name,
        viatorDest.lookupId,
        { skipAi }
      );

      const destElapsed = Date.now() - destStart;
      destTimes.push(destElapsed);
      const destSec = (destElapsed / 1000).toFixed(1);

      totalNew += result.newCount;
      totalChanged += result.changedCount;
      totalSearched += result.totalSearched;
      totalErrors += result.errors;
      processed++;

      if (result.totalSearched === 0) {
        emptyDests++;
        log(`  [${i + 1}/${destinations.length}] ${dest.name} (${destSec}s) — no tours found`);
      } else {
        log(
          `  [${i + 1}/${destinations.length}] ${dest.name} (${destSec}s) — ${result.totalSearched} searched, ${result.newCount} new, ${result.changedCount} changed`
        );
      }

      // H8: Save destination ID (not array index) for resume
      try {
        setIndexerState("last_destination_id", dest.id);
      } catch (error) {
        logError(`    Failed to save indexer state: ${error}`);
      }

      // Batch progress summary
      if (processed % BATCH_LOG_INTERVAL === 0) {
        const avgMs = destTimes.reduce((a, b) => a + b, 0) / destTimes.length;
        const remaining = endIdx - i - 1;
        const etaMs = remaining * avgMs;
        const pct = ((processed / (endIdx - startIdx)) * 100).toFixed(1);

        log(`\n--- Progress: ${processed}/${endIdx - startIdx} (${pct}%) | avg ${(avgMs / 1000).toFixed(1)}s/dest | ETA: ~${formatDuration(etaMs)} remaining ---`);
        log(`    Cumulative: ${totalNew} new, ${totalChanged} changed, ${totalErrors} errors, ${emptyDests} empty`);
        log("");
      }

      // Throttle between destinations
      if (i < endIdx - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Final summary
    const totalElapsed = Date.now() - runStartTime;
    const dbPath = process.env.DATABASE_PATH || "./data/tourgraph.db";
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
    const totalTours = getActiveTourCount();

    log("");
    log("=".repeat(60));
    log("  INDEXER RUN COMPLETE");
    log("=".repeat(60));
    log(`  Started:              ${new Date(runStartTime).toISOString()}`);
    log(`  Finished:             ${new Date().toISOString()}`);
    log(`  Duration:             ${formatDuration(totalElapsed)}`);
    log(`  Destinations:         ${processed} processed${useLeaves ? " (leaf nodes)" : ""}`);
    log(`  Destinations skipped: ${skipped} (no Viator metadata)`);
    log(`  Destinations empty:   ${emptyDests} (no tours found)`);
    log(`  Tours searched:       ${totalSearched}`);
    log(`  New tours added:      ${totalNew}`);
    log(`  Changed tours:        ${totalChanged}`);
    log(`  Errors:               ${totalErrors}`);
    log(`  Viator API calls:     ${client.getRequestCount()}`);
    log(`  Total active tours:   ${totalTours}`);
    log(`  DB size:              ${formatBytes(dbSize)}`);
    log(`  Log file:             ${logPath}`);
    log("=".repeat(60));

  } else {
    log("Usage:");
    log(
      "  npx tsx src/scripts/indexer.ts --dest <id>          Index one destination"
    );
    log(
      "  npx tsx src/scripts/indexer.ts --full [--limit N]   Index all leaf destinations"
    );
    log(
      "  npx tsx src/scripts/indexer.ts --full --all-destinations   Include parent destinations"
    );
    log(
      "  npx tsx src/scripts/indexer.ts --continue            Resume from last position"
    );
    log("  --no-ai                                             Skip one-liner generation");
  }

  closeLogging();
}

main().catch((err) => {
  logError(`Indexer failed: ${err}`);
  closeLogging();
  process.exit(1);
});
