// ============================================================
// TourGraph Drip + Delta Indexer
//
// Cycles through Viator destinations, searches for tours,
// fetches details for new/changed products, generates
// AI one-liners, and assigns weight categories.
//
// Modes:
//   --dest <id>         Index a single destination
//   --full              Index all destinations (initial build)
//   --continue          Resume from last position
//   --limit <n>         Process at most n destinations
//   --no-ai             Skip one-liner generation (faster)
//
// Run: npx tsx src/scripts/indexer.ts --dest 704
// ============================================================

import { ViatorClient, loadEnv, extractCoverImageUrl, extractAllImageUrls, extractDurationMinutes, extractInclusions } from "../lib/viator";
import {
  getDb,
  insertOrUpdateTour,
  updateTourFields,
  getActiveToursForDestination,
  markToursInactive,
  getIndexerState,
  setIndexerState,
  getAllDestinations,
  getActiveTourCount,
} from "../lib/db";
import { generateOneLiner } from "../lib/claude";
import { continentFromLookupId } from "../lib/continents";
import type { ViatorSearchProduct, ViatorDestination } from "../lib/types";
import crypto from "crypto";

loadEnv();

// ============================================================
// Tag IDs for "unique" weight category
// ============================================================

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
  return crypto.createHash("md5").update(data).digest("hex").slice(0, 12);
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
      console.error(
        `    ⚠ Search failed (${strategy.sort} ${strategy.order || ""}): ${error}`
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
  cachedTours: Map<string, string | null> // productCode → summaryHash
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
      // Never seen this product
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

  // Products in cache but not in search results
  const missingCodes: string[] = [];
  for (const code of cachedTours.keys()) {
    if (!searchResults.has(code)) {
      missingCodes.push(code);
    }
  }

  return { newProducts, changedProducts, unchangedCodes, missingCodes };
}

// ============================================================
// Weight Category Assignment
// ============================================================

function assignWeightCategory(tour: {
  rating: number | null;
  reviewCount: number | null;
  fromPrice: number | null;
  tags: number[];
  isTopDestination: boolean;
}): string {
  const { rating, reviewCount, fromPrice, tags, isTopDestination } = tour;

  // Priority order (first match wins)
  if (rating && rating >= 4.9 && reviewCount && reviewCount >= 50) {
    return "highest_rated";
  }
  if (reviewCount && reviewCount >= 1000) {
    return "most_reviewed";
  }
  if (fromPrice && fromPrice >= 500) {
    return "most_expensive";
  }
  if (rating && rating >= 4.8 && fromPrice && fromPrice <= 30) {
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
  "684", // Las Vegas
  "704", // Seattle
  "712", // New York
  "651", // San Francisco
  "828", // Orlando
  "662", // Los Angeles
  "286", // Miami
  "298", // Washington DC region
  "287", // Chicago
  "641", // Honolulu
  // Europe
  "479", // Paris
  "737", // London
  "525", // Barcelona
  "511", // Rome
  "541", // Amsterdam
  "542", // Berlin
  "523", // Lisbon
  "538", // Prague
  "518", // Dublin
  "919", // Istanbul
  // Asia
  "334", // Tokyo
  "349", // Bangkok
  "367", // Bali
  "364", // Singapore
  "351", // Hong Kong
  "2363", // Dubai
  "355", // Phuket
  "343", // Seoul
  "20044", // Hanoi
  "317", // Sydney
  // South America
  "318", // Cape Town
  "806", // Cancun
  "910", // Rio de Janeiro
  "296", // Cusco
  "290", // Buenos Aires
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
): Promise<{ newCount: number; changedCount: number; totalSearched: number }> {
  // Step 1: Search with 4 strategies
  const searchResults = await searchDestination(client, destId);

  if (searchResults.size === 0) {
    return { newCount: 0, changedCount: 0, totalSearched: 0 };
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

  console.log(
    `    Found ${searchResults.size} products: ${newProducts.length} new, ${changedProducts.length} changed, ${unchangedCodes.length} unchanged, ${missingCodes.length} missing`
  );

  // Step 4: Mark missing products inactive
  if (missingCodes.length > 0) {
    markToursInactive(missingCodes);
  }

  // Step 5: Update changed products (price/rating from search, no detail fetch needed)
  for (const p of changedProducts) {
    updateTourFields(p.productCode, {
      rating: p.reviews?.combinedAverageRating ?? null,
      review_count: p.reviews?.totalReviews ?? null,
      from_price: p.pricing?.summary?.fromPrice ?? null,
      summary_hash: computeSummaryHash(p),
    });
  }

  // Step 6: Fetch full details for new products
  const continent = continentFromLookupId(lookupId);
  // Derive country from lookupId: second segment is country ID
  const countryId = lookupId.split(".")[1];
  // We need the country name — check if we have destinations loaded
  const allDests = getAllDestinations();
  const countryDest = allDests.find((d) => d.id === countryId);
  const countryName = countryDest?.name || "Unknown";

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

      // Generate one-liner (if AI enabled)
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
        latitude: null, // Could resolve from /locations/bulk if needed
        longitude: null,
        rating: detail.reviews?.combinedAverageRating ?? null,
        review_count: detail.reviews?.totalReviews ?? null,
        from_price: p.pricing?.summary?.fromPrice ?? null,
        currency: p.pricing?.currency || "USD",
        duration_minutes: durationMinutes,
        image_url: coverUrl,
        image_urls_json: JSON.stringify(allImageUrls),
        highlights_json: null, // Highlights not directly in product detail
        inclusions_json: JSON.stringify(inclusions),
        viator_url: detail.productUrl || null,
        supplier_name: detail.supplier?.name || null,
        tags_json: JSON.stringify(tags),
        weight_category: weightCategory,
        status: "active",
        summary_hash: computeSummaryHash(p),
      });

      if (oneLiner) {
        console.log(`      + ${detail.productCode}: "${detail.title}" [${weightCategory}]`);
        console.log(`        "${oneLiner}"`);
      } else {
        console.log(`      + ${detail.productCode}: "${detail.title}" [${weightCategory}]`);
      }
    } catch (error) {
      console.error(`      ⚠ Failed to fetch ${p.productCode}: ${error}`);
    }
  }

  return {
    newCount: newProducts.length,
    changedCount: changedProducts.length,
    totalSearched: searchResults.size,
  };
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const destArg = args.includes("--dest")
    ? args[args.indexOf("--dest") + 1]
    : null;
  const fullMode = args.includes("--full");
  const continueMode = args.includes("--continue");
  const limitArg = args.includes("--limit")
    ? parseInt(args[args.indexOf("--limit") + 1])
    : null;
  const skipAi = args.includes("--no-ai");

  console.log("TourGraph Indexer");
  console.log("=================\n");

  const client = new ViatorClient();

  if (destArg) {
    // Single destination mode
    console.log(`Mode: single destination (${destArg})`);

    // Fetch destination metadata from Viator API
    const viatorDests = await client.getDestinations();
    const dest = viatorDests.find(
      (d) => String(d.destinationId) === destArg
    );

    if (!dest) {
      console.error(`Destination ${destArg} not found`);
      process.exit(1);
    }

    console.log(`\n  Processing: ${dest.name} (${dest.type})`);
    const result = await processDestination(
      client,
      destArg,
      dest.name,
      dest.lookupId,
      { skipAi }
    );
    console.log(
      `\n  Result: ${result.totalSearched} searched, ${result.newCount} new, ${result.changedCount} changed`
    );
  } else if (fullMode || continueMode) {
    // Multi-destination mode
    const allDests = getAllDestinations();
    if (allDests.length === 0) {
      console.error(
        "No destinations in DB. Run seed-destinations first:\n  npx tsx src/scripts/seed-destinations.ts"
      );
      process.exit(1);
    }

    // Fetch Viator destinations for lookupId data
    console.log("Fetching destination metadata from Viator...");
    const viatorDests = await client.getDestinations();
    const viatorById = new Map(
      viatorDests.map((d) => [String(d.destinationId), d])
    );

    // Resume from last position if --continue
    let startIdx = 0;
    if (continueMode) {
      const savedPos = getIndexerState("last_position");
      if (savedPos) {
        startIdx = parseInt(savedPos) + 1;
        console.log(`Resuming from position ${startIdx}`);
      }
    }

    const limit = limitArg || allDests.length;
    const endIdx = Math.min(startIdx + limit, allDests.length);

    console.log(
      `Mode: ${fullMode ? "full" : "continue"} — processing destinations ${startIdx} to ${endIdx - 1} of ${allDests.length}`
    );
    if (skipAi) console.log("AI one-liners: DISABLED (--no-ai)");

    let totalNew = 0;
    let totalChanged = 0;
    let processed = 0;

    for (let i = startIdx; i < endIdx; i++) {
      const dest = allDests[i];
      const viatorDest = viatorById.get(dest.id);

      if (!viatorDest) {
        console.log(`  [${i}] ${dest.name} — skipped (no Viator metadata)`);
        continue;
      }

      console.log(
        `\n  [${i}/${allDests.length}] ${dest.name} (${viatorDest.type})`
      );

      const result = await processDestination(
        client,
        dest.id,
        dest.name,
        viatorDest.lookupId,
        { skipAi }
      );

      totalNew += result.newCount;
      totalChanged += result.changedCount;
      processed++;

      // Save position
      setIndexerState("last_position", String(i));

      // Throttle between destinations (be a good API citizen)
      if (i < endIdx - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const totalTours = getActiveTourCount();
    console.log(`\n${"=".repeat(50)}`);
    console.log(`Indexer complete:`);
    console.log(`  Destinations processed: ${processed}`);
    console.log(`  New tours: ${totalNew}`);
    console.log(`  Changed tours: ${totalChanged}`);
    console.log(`  Total active tours in DB: ${totalTours}`);
  } else {
    console.log("Usage:");
    console.log(
      "  npx tsx src/scripts/indexer.ts --dest <id>          Index one destination"
    );
    console.log(
      "  npx tsx src/scripts/indexer.ts --full [--limit N]   Index all destinations"
    );
    console.log(
      "  npx tsx src/scripts/indexer.ts --continue            Resume from last position"
    );
    console.log("  --no-ai                                             Skip one-liner generation");
  }
}

main().catch((err) => {
  console.error("Indexer failed:", err);
  process.exit(1);
});
