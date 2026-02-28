// ============================================================
// Seed Destinations
// Fetches all Viator destinations and inserts into SQLite.
// Derives country and continent from the lookupId hierarchy.
//
// Run: npx tsx src/scripts/seed-destinations.ts
// ============================================================

import { ViatorClient, loadEnv } from "../lib/viator";
import { upsertDestination, getDb } from "../lib/db";
import { continentFromLookupId } from "../lib/continents";
import type { ViatorDestination } from "../lib/types";

loadEnv();

async function main() {
  console.log("Seeding destinations from Viator API...\n");

  const client = new ViatorClient();
  const destinations = await client.getDestinations();
  console.log(`Fetched ${destinations.length} destinations from API`);

  // Build a lookup map for resolving country names from IDs
  const byId = new Map<number, ViatorDestination>();
  for (const d of destinations) {
    byId.set(d.destinationId, d);
  }

  // Insert all destinations
  let inserted = 0;
  const db = getDb();
  const insertMany = db.transaction(() => {
    for (const d of destinations) {
      upsertDestination({
        id: String(d.destinationId),
        name: d.name,
        parentId: d.parentDestinationId
          ? String(d.parentDestinationId)
          : null,
        timezone: d.timeZone || null,
        latitude: d.center?.latitude ?? null,
        longitude: d.center?.longitude ?? null,
      });
      inserted++;
    }
  });
  insertMany();

  console.log(`Inserted/updated ${inserted} destinations\n`);

  // Verify with spot checks
  const spotChecks = [
    { id: 704, expected: "Seattle" },
    { id: 479, expected: "Paris" },
    { id: 334, expected: "Tokyo" },
    { id: 318, expected: "Cape Town" },
    { id: 737, expected: "London" },
  ];

  console.log("Spot checks:");
  for (const check of spotChecks) {
    const d = byId.get(check.id);
    if (d) {
      const continent = continentFromLookupId(d.lookupId);
      // Country is the second segment of lookupId
      const countryId = Number(d.lookupId.split(".")[1]);
      const country = byId.get(countryId);
      console.log(
        `  ${check.id} = "${d.name}" (${d.type}) — ${country?.name || "?"}, ${continent} — tz: ${d.timeZone}`
      );
      if (d.name !== check.expected) {
        console.log(`    ⚠ Expected "${check.expected}"!`);
      }
    } else {
      console.log(`  ${check.id} = NOT FOUND (expected "${check.expected}")`);
    }
  }

  // Stats
  const types: Record<string, number> = {};
  const continents: Record<string, number> = {};
  for (const d of destinations) {
    types[d.type] = (types[d.type] || 0) + 1;
    const continent = continentFromLookupId(d.lookupId);
    continents[continent] = (continents[continent] || 0) + 1;
  }

  console.log("\nBy type:");
  for (const [type, count] of Object.entries(types).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nBy continent:");
  for (const [continent, count] of Object.entries(continents).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${continent}: ${count}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
