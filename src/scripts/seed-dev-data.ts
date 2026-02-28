// ============================================================
// Seed Development Data
// Indexes ~37 diverse destinations across all continents
// to build a 500+ tour dataset for UI development.
//
// Run: npx tsx src/scripts/seed-dev-data.ts
//       npx tsx src/scripts/seed-dev-data.ts --no-ai
// ============================================================

import { ViatorClient, loadEnv } from "../lib/viator";
import { getActiveTourCount } from "../lib/db";
import { processDestination } from "./indexer";

loadEnv();

// Curated diverse destinations across all 7 continent codes
const SEED_DESTINATIONS = [
  // Europe (code 6)
  479, 737, 525, 511, 541, 538, 523, 919, 909, 546,
  // North America (code 8)
  704, 712, 684, 651, 828, 287,
  // Asia (code 2)
  334, 349, 367, 364, 355, 343,
  // Africa + Middle East (code 1)
  318, 2363, 786, 661, 232,
  // South America (code 9)
  296, 910, 290, 301,
  // Oceania (code 3)
  317, 875, 908, 282,
  // Caribbean (code 4)
  265, 806, 263,
];

async function main() {
  const skipAi = process.argv.includes("--no-ai");
  console.log("Seeding development data...");
  console.log(`Destinations: ${SEED_DESTINATIONS.length}`);
  console.log(`AI one-liners: ${skipAi ? "DISABLED" : "ENABLED"}\n`);

  const client = new ViatorClient();

  // Fetch all Viator destinations once for metadata
  console.log("Fetching destination metadata...");
  const viatorDests = await client.getDestinations();
  const viatorById = new Map(
    viatorDests.map((d) => [d.destinationId, d])
  );

  const startCount = getActiveTourCount();
  console.log(`Current active tours: ${startCount}\n`);

  let totalNew = 0;
  let totalChanged = 0;
  let skipped = 0;

  for (let i = 0; i < SEED_DESTINATIONS.length; i++) {
    const destId = SEED_DESTINATIONS[i];
    const dest = viatorById.get(destId);

    if (!dest) {
      console.log(
        `[${i + 1}/${SEED_DESTINATIONS.length}] ${destId} — not found, skipping`
      );
      skipped++;
      continue;
    }

    console.log(
      `\n[${i + 1}/${SEED_DESTINATIONS.length}] ${dest.name} (${dest.type})`
    );

    try {
      const result = await processDestination(
        client,
        String(destId),
        dest.name,
        dest.lookupId,
        { skipAi }
      );

      totalNew += result.newCount;
      totalChanged += result.changedCount;
      console.log(
        `    → ${result.totalSearched} searched, ${result.newCount} new, ${result.changedCount} changed`
      );
    } catch (error) {
      console.error(`    ⚠ Failed: ${error}`);
    }

    // Small pause between destinations (be a good API citizen)
    if (i < SEED_DESTINATIONS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const endCount = getActiveTourCount();
  console.log(`\n${"=".repeat(50)}`);
  console.log("Seeding complete!");
  console.log(`  Destinations processed: ${SEED_DESTINATIONS.length - skipped}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  New tours: ${totalNew}`);
  console.log(`  Changed tours: ${totalChanged}`);
  console.log(`  Tours before: ${startCount}`);
  console.log(`  Tours after:  ${endCount}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
