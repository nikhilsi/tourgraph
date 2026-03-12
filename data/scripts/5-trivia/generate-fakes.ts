/**
 * Generate fake tour titles using Claude Haiku for Format 3 (Real or Fake?)
 *
 * Generates convincing but fake tour titles that could plausibly exist,
 * then pairs each with a real tour to create Real or Fake trivia questions.
 *
 * Usage:
 *   npx tsx scripts/5-trivia/generate-fakes.ts              # Generate 200 questions
 *   npx tsx scripts/5-trivia/generate-fakes.ts --count 50   # Generate 50 questions
 *   npx tsx scripts/5-trivia/generate-fakes.ts --dry-run    # Preview without inserting
 */

import { loadEnv } from "../../lib/env";
import { getDb } from "../../lib/db";
import Anthropic from "@anthropic-ai/sdk";
import type Database from "better-sqlite3";

loadEnv();

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
const BATCH_SIZE = 20; // Fakes per API call
const DELAY_MS = 500;

// ============================================================
// Prompt
// ============================================================

const SYSTEM_PROMPT = `You generate convincing fake tour titles that could plausibly exist on a travel booking platform like Viator or GetYourGuide.

Rules:
- Each fake title should sound like a real bookable tour but NOT actually exist
- Match the naming patterns of real tours: specific locations, activities, durations, unique selling points
- Make some sound amazing (the kind of tour people wish existed)
- Make some sound mundane (to be harder to distinguish from real ones)
- Include the destination city/country in each title, just like real tours do
- Vary the style: some formal, some casual, some with colons, some with dashes
- Do NOT make them obviously absurd or comedic — they should genuinely fool people

You will receive a list of real tour titles as style reference. Generate fake titles for the specified destinations.

Return ONLY a JSON array of objects: [{"title": "...", "destination": "City, Country"}]
No markdown, no explanation, just the JSON array.`;

// ============================================================
// Get sample real titles for style reference
// ============================================================

function getSampleTitles(db: Database.Database, count: number): string[] {
  const rows = db
    .prepare(
      `SELECT title, destination_name, country FROM tours
     WHERE status = 'active' AND rating >= 4.0 AND review_count >= 20
     ORDER BY RANDOM() LIMIT ?`
    )
    .all(count) as { title: string; destination_name: string; country: string }[];

  return rows.map(
    (r) => `${r.title} (${r.destination_name}, ${r.country})`
  );
}

// ============================================================
// Get random destinations for fake generation
// ============================================================

function getRandomDestinations(db: Database.Database, count: number): { name: string; country: string }[] {
  return db
    .prepare(
      `SELECT destination_name as name, country
     FROM city_profiles
     WHERE tour_count >= 20
     ORDER BY RANDOM() LIMIT ?`
    )
    .all(count) as { name: string; country: string }[];
}

// ============================================================
// Get real tours to pair with fakes
// ============================================================

function getRealToursForPairing(db: Database.Database, count: number): any[] {
  return db
    .prepare(
      `SELECT id, title, destination_name, country, rating, review_count, image_url
     FROM tours
     WHERE status = 'active'
       AND rating >= 4.0
       AND review_count >= 10
       AND image_url IS NOT NULL
       AND LENGTH(title) >= 20
     ORDER BY RANDOM() LIMIT ?`
    )
    .all(count) as any[];
}

// ============================================================
// Generate fake titles via Haiku
// ============================================================

async function generateFakeBatch(
  client: Anthropic,
  sampleTitles: string[],
  destinations: { name: string; country: string }[]
): Promise<{ title: string; destination: string }[]> {
  const destList = destinations
    .map((d) => `${d.name}, ${d.country}`)
    .join("\n");

  const userPrompt = `Here are ${sampleTitles.length} real tour titles for style reference:

${sampleTitles.slice(0, 10).join("\n")}

Generate ${destinations.length} fake tour titles for these destinations (one per destination):
${destList}

Return ONLY the JSON array.`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Handle potential markdown wrapping
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Haiku response:", text.slice(0, 200));
    return [];
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const countIdx = args.indexOf("--count");
  const targetCount = countIdx >= 0 ? parseInt(args[countIdx + 1], 10) : 200;
  const dryRun = args.includes("--dry-run");

  const db = getDb();
  const client = new Anthropic();

  // Check existing
  const existing = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM trivia_pool WHERE format = 'real_or_fake'"
    )
    .get() as { cnt: number };
  console.log(`Existing real_or_fake questions: ${existing.cnt}`);

  const sampleTitles = getSampleTitles(db, 50);
  console.log(`Loaded ${sampleTitles.length} sample titles for style reference`);

  const LABELS = ["A", "B"];
  let generated = 0;

  const insert = db.prepare(
    "INSERT INTO trivia_pool (format, question_json) VALUES (?, ?)"
  );

  while (generated < targetCount) {
    const batchSize = Math.min(BATCH_SIZE, targetCount - generated);

    // Get destinations and generate fakes
    const destinations = getRandomDestinations(db, batchSize);
    if (destinations.length === 0) {
      console.error("No destinations found");
      break;
    }

    console.log(`Generating batch of ${destinations.length} fakes...`);
    const fakes = await generateFakeBatch(client, sampleTitles, destinations);

    if (fakes.length === 0) {
      console.error("Haiku returned empty batch, retrying...");
      await new Promise((r) => setTimeout(r, DELAY_MS * 2));
      continue;
    }

    // Get real tours to pair with
    const realTours = getRealToursForPairing(db, fakes.length);

    // Create questions by pairing each fake with a real tour
    const questions: any[] = [];

    for (let i = 0; i < Math.min(fakes.length, realTours.length); i++) {
      const fake = fakes[i];
      const real = realTours[i];

      // Randomize which is A vs B
      const realFirst = Math.random() > 0.5;
      const correctIndex = realFirst ? 0 : 1;

      const options = realFirst
        ? [
            {
              label: "A",
              text: `${real.title} (${real.destination_name}, ${real.country})`,
              tourId: real.id,
            },
            {
              label: "B",
              text: fake.title.includes(fake.destination)
                ? fake.title
                : `${fake.title} (${fake.destination})`,
            },
          ]
        : [
            {
              label: "A",
              text: fake.title.includes(fake.destination)
                ? fake.title
                : `${fake.title} (${fake.destination})`,
            },
            {
              label: "B",
              text: `${real.title} (${real.destination_name}, ${real.country})`,
              tourId: real.id,
            },
          ];

      const question = {
        format: "real_or_fake",
        question: "Which is a REAL tour you can actually book?",
        options,
        correctIndex,
        reveal: {
          fact: `"${real.title}" is real — ${Number(real.rating).toFixed(1)}★ with ${real.review_count} reviews in ${real.destination_name}. The other one? Made up.`,
          imageUrl: real.image_url,
        },
      };

      questions.push(question);
    }

    if (!dryRun) {
      const insertBatch = db.transaction(() => {
        for (const q of questions) {
          insert.run("real_or_fake", JSON.stringify(q));
        }
      });
      insertBatch();
    }

    generated += questions.length;
    console.log(
      `  → ${questions.length} real_or_fake questions${dryRun ? " (dry run)" : " inserted"} (${generated}/${targetCount})`
    );

    if (dryRun && questions.length > 0) {
      console.log("\nSample question:");
      console.log(JSON.stringify(questions[0], null, 2));
    }

    if (generated < targetCount) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\nTotal: ${generated} real_or_fake questions generated`);

  // Final pool counts
  const final = db
    .prepare(
      "SELECT format, COUNT(*) as cnt FROM trivia_pool GROUP BY format"
    )
    .all() as any[];
  console.log("\nPool totals:");
  for (const row of final) {
    console.log(`  ${row.format}: ${row.cnt}`);
  }
}

main().catch(console.error);
