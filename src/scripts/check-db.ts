import { getDb, getActiveTourCount } from "../lib/db";

const db = getDb();

const rows = db
  .prepare(
    "SELECT weight_category, COUNT(*) as count FROM tours WHERE status = 'active' GROUP BY weight_category ORDER BY count DESC"
  )
  .all() as { weight_category: string; count: number }[];

console.log("Weight categories:");
for (const r of rows) {
  console.log(`  ${r.weight_category}: ${r.count}`);
}

const total = getActiveTourCount();
console.log(`\nTotal active tours: ${total}`);

const withOneLiner = db
  .prepare(
    "SELECT COUNT(*) as count FROM tours WHERE status = 'active' AND one_liner IS NOT NULL"
  )
  .get() as { count: number };
console.log(`With one-liners: ${withOneLiner.count}`);

const continents = db
  .prepare(
    "SELECT continent, COUNT(*) as count FROM tours WHERE status = 'active' GROUP BY continent ORDER BY count DESC"
  )
  .all() as { continent: string; count: number }[];
console.log("\nContinents:");
for (const c of continents) {
  console.log(`  ${c.continent}: ${c.count}`);
}

const destinations = db
  .prepare(
    "SELECT destination_name, COUNT(*) as count FROM tours WHERE status = 'active' GROUP BY destination_name ORDER BY count DESC LIMIT 10"
  )
  .all() as { destination_name: string; count: number }[];
console.log("\nTop destinations:");
for (const d of destinations) {
  console.log(`  ${d.destination_name}: ${d.count}`);
}
