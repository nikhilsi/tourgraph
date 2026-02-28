// ============================================================
// Seed Development Data
// Indexes 43 diverse destinations across all continents
// to build a 5,000+ tour dataset for UI development.
//
// Run: npx tsx src/scripts/seed-dev-data.ts
//       npx tsx src/scripts/seed-dev-data.ts --no-ai
// ============================================================

import { ViatorClient } from "../lib/viator";
import { loadEnv } from "../lib/env";
import { getActiveTourCount } from "../lib/db";
import { processDestination } from "./indexer";

loadEnv();

// Curated diverse destinations — all IDs verified against Viator API
const SEED_DESTINATIONS = [
  // Europe (12)
  479,  // Paris
  737,  // London
  525,  // Amsterdam
  511,  // Rome
  538,  // Lisbon
  562,  // Barcelona
  462,  // Prague
  454,  // Vienna
  739,  // Edinburgh
  496,  // Athens
  904,  // Dubrovnik
  585,  // Istanbul
  // North America (7)
  687,  // New York City
  704,  // Seattle
  684,  // Las Vegas
  651,  // San Francisco
  645,  // Los Angeles
  631,  // Cancun
  628,  // Mexico City
  // Asia (9)
  334,  // Tokyo
  332,  // Kyoto
  343,  // Bangkok
  349,  // Phuket
  98,   // Bali
  18,   // Singapore
  973,  // Seoul
  352,  // Ho Chi Minh City
  953,  // Mumbai
  // Africa + Middle East (7)
  318,  // Cape Town
  828,  // Dubai
  782,  // Cairo
  5408, // Marrakech
  5280, // Nairobi
  5590, // Zanzibar
  24520, // Petra
  // South America (5)
  712,  // Rio de Janeiro
  901,  // Buenos Aires
  937,  // Cusco
  928,  // Lima
  4498, // Cartagena (Colombia)
  // Oceania (3)
  357,  // Sydney
  407,  // Queenstown
  905,  // Reykjavik (technically Europe but adds diversity)
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
