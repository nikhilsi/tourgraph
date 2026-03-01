// ============================================================
// Test Chain Generator
// Prototype script for Six Degrees of Anywhere chain generation.
// Pulls real tours from our DB, sends to Claude, prints the chain.
//
// Usage:
//   npx tsx src/scripts/test-chain.ts "Tokyo" "Rome"
//   npx tsx src/scripts/test-chain.ts "Paris" "Buenos Aires"
//   npx tsx src/scripts/test-chain.ts --random
//   npx tsx src/scripts/test-chain.ts --list-cities
// ============================================================

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import Anthropic from "@anthropic-ai/sdk";

loadEnv();

const MODEL = process.env.CLAUDE_MODEL_CHAIN || "claude-sonnet-4-6";

interface TourSummary {
  id: number;
  title: string;
  destination_name: string;
  country: string;
  rating: number | null;
  review_count: number | null;
  from_price: number | null;
  duration_minutes: number | null;
  image_url: string | null;
}

interface ChainLink {
  city: string;
  country: string;
  tour_title: string;
  tour_id: number;
  connection_to_next: string | null;
  theme: string;
}

interface ChainResult {
  city_from: string;
  city_to: string;
  chain: ChainLink[];
  summary: string;
}

// Get all cities that have tours
function getAvailableCities(): { name: string; country: string; count: number }[] {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT destination_name as name, country, COUNT(*) as count
       FROM tours WHERE status = 'active' AND image_url IS NOT NULL
       GROUP BY destination_name
       HAVING count >= 10
       ORDER BY count DESC`
    )
    .all() as { name: string; country: string; count: number }[];
}

// Get tours for a specific city, summarized for the prompt
function getToursForCity(city: string, limit = 30): TourSummary[] {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT id, title, destination_name, country, rating, review_count,
              from_price, duration_minutes, image_url
       FROM tours
       WHERE status = 'active' AND destination_name = ? AND image_url IS NOT NULL
       ORDER BY rating DESC, review_count DESC
       LIMIT ?`
    )
    .all(city, limit) as TourSummary[];
}

// Get tours for intermediate cities (cities not in start/end)
function getToursForIntermediateCities(
  excludeCities: string[],
  limit = 15
): Map<string, TourSummary[]> {
  const db = getDb(true);
  const cities = getAvailableCities().filter(
    (c) => !excludeCities.includes(c.name)
  );

  const result = new Map<string, TourSummary[]>();
  for (const city of cities) {
    const tours = db
      .prepare(
        `SELECT id, title, destination_name, country, rating, review_count,
                from_price, duration_minutes, image_url
         FROM tours
         WHERE status = 'active' AND destination_name = ? AND image_url IS NOT NULL
         ORDER BY rating DESC, review_count DESC
         LIMIT ?`
      )
      .all(city.name, limit) as TourSummary[];
    if (tours.length > 0) {
      result.set(city.name, tours);
    }
  }
  return result;
}

function formatToursForPrompt(city: string, tours: TourSummary[]): string {
  const lines = tours.map(
    (t) =>
      `  [${t.id}] "${t.title}" — ${t.rating?.toFixed(1) ?? "?"} stars, ${t.review_count ?? 0} reviews, $${t.from_price ?? "?"}`
  );
  return `${city}:\n${lines.join("\n")}`;
}

async function generateChain(
  cityFrom: string,
  cityTo: string
): Promise<ChainResult | null> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // Get tours for start and end cities
  const toursFrom = getToursForCity(cityFrom);
  const toursTo = getToursForCity(cityTo);

  if (toursFrom.length === 0) {
    console.error(`No tours found for "${cityFrom}"`);
    return null;
  }
  if (toursTo.length === 0) {
    console.error(`No tours found for "${cityTo}"`);
    return null;
  }

  // Get tours for all intermediate cities
  const intermediateTours = getToursForIntermediateCities([cityFrom, cityTo]);

  // Build the available tours section
  const tourSections: string[] = [];
  tourSections.push(formatToursForPrompt(cityFrom, toursFrom));
  tourSections.push(formatToursForPrompt(cityTo, toursTo));

  // Add intermediate cities (sample to keep prompt manageable)
  const intermediateCities = [...intermediateTours.keys()];
  // Shuffle and take up to 20 intermediate cities
  const shuffled = intermediateCities.sort(() => Math.random() - 0.5).slice(0, 20);
  for (const city of shuffled) {
    const tours = intermediateTours.get(city)!;
    tourSections.push(formatToursForPrompt(city, tours));
  }

  const systemPrompt = `You are a creative travel writer who finds surprising thematic connections between cities around the world. Your tone is warm, witty, and wonder-filled — like a friend sharing travel discoveries over drinks.

Your job: given two cities, build a chain of real tours that connects them through surprising thematic links across MULTIPLE intermediate cities.

HARD RULES:
1. The chain MUST have exactly 5 stops (including the start and end cities, plus 3 intermediate cities).
2. Every stop MUST be in a DIFFERENT city. Never repeat a city.
3. Every connection MUST use a DIFFERENT theme. Never repeat a theme.
4. You MUST only use tours from the provided list. Each tour has an [id] — include it.

Themes to choose from (use a different one for each connection): cuisine, street food, ancient history, colonial history, sacred spaces, markets/bazaars, street art, nightlife, water activities, hiking/nature, wine/spirits, music, dance, craftsmanship, architecture, wildlife, festivals, meditation/wellness, photography, dark tourism/ghost tours.

The chain should feel like a journey of discovery — each connection should make someone think "oh wow, I see the connection!" Not obvious geographic proximity, but genuine cultural/thematic threads.

Pick tours that best represent the thematic connection, not just highly rated ones.`;

  const userPrompt = `Connect ${cityFrom} to ${cityTo} using ONLY tours from this list.

AVAILABLE TOURS:
${tourSections.join("\n\n")}

Build a chain of EXACTLY 5 stops: ${cityFrom} → City2 → City3 → City4 → ${cityTo}. Each adjacent pair must share a surprising thematic connection using a DIFFERENT theme. All 5 cities must be different.

Respond in this exact JSON format:
{
  "chain": [
    {
      "city": "City Name",
      "country": "Country",
      "tour_title": "Exact tour title from the list",
      "tour_id": 123,
      "connection_to_next": "A witty 1-2 sentence description of the thematic link to the next city. null for the last stop.",
      "theme": "one-word theme like 'cuisine' or 'sacred'"
    }
  ],
  "summary": "A witty one-line summary of the entire chain, e.g. 'From sushi to pasta, connected by ancient temples and street art'"
}

Remember: EXACTLY 5 stops, 4 different themes, 5 different cities. Only return valid JSON. No markdown code fences.`;

  console.log(`\nGenerating chain: ${cityFrom} → ${cityTo}`);
  console.log(`Sending ${tourSections.length} cities of tour data to Claude...`);

  const startTime = Date.now();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const text =
    response.content[0]?.type === "text" ? response.content[0].text : null;

  if (!text) {
    console.error("No response from Claude");
    return null;
  }

  console.log(`Response received in ${elapsed}s`);
  console.log(
    `Tokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`
  );

  // Parse JSON (strip markdown fences if present)
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const result = JSON.parse(jsonStr) as { chain: ChainLink[]; summary: string };
    return {
      city_from: cityFrom,
      city_to: cityTo,
      chain: result.chain,
      summary: result.summary,
    };
  } catch (err) {
    console.error("Failed to parse JSON response:");
    console.error(text);
    return null;
  }
}

function printChain(result: ChainResult): void {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${result.city_from} → ${result.city_to}`);
  console.log(`  "${result.summary}"`);
  console.log("=".repeat(60));

  for (let i = 0; i < result.chain.length; i++) {
    const link = result.chain[i];
    const num = i + 1;

    console.log(
      `\n  ${num}. ${link.city}, ${link.country} [${link.theme}]`
    );
    console.log(`     Tour: "${link.tour_title}" (id: ${link.tour_id})`);

    if (link.connection_to_next) {
      console.log(`     ↓ ${link.connection_to_next}`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

async function main() {
  if (process.argv.includes("--list-cities")) {
    const cities = getAvailableCities();
    console.log(`\n${cities.length} cities with 10+ tours:\n`);
    for (const c of cities) {
      console.log(`  ${c.name}, ${c.country} (${c.count} tours)`);
    }
    return;
  }

  let cityFrom: string;
  let cityTo: string;

  if (process.argv.includes("--random")) {
    const cities = getAvailableCities();
    const shuffled = cities.sort(() => Math.random() - 0.5);
    cityFrom = shuffled[0].name;
    cityTo = shuffled[1].name;
    console.log(`Random pair: ${cityFrom} → ${cityTo}`);
  } else {
    const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    if (args.length < 2) {
      console.log("Usage:");
      console.log('  npx tsx src/scripts/test-chain.ts "Tokyo" "Rome"');
      console.log("  npx tsx src/scripts/test-chain.ts --random");
      console.log("  npx tsx src/scripts/test-chain.ts --list-cities");
      process.exit(1);
    }
    cityFrom = args[0];
    cityTo = args[1];
  }

  const result = await generateChain(cityFrom, cityTo);

  if (result) {
    printChain(result);

    // Also dump raw JSON for inspection
    console.log("\nRaw JSON:");
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
