/**
 * Trivia Pool Generator
 *
 * Generates a large pool of trivia questions from existing tour data.
 * Questions are stored in the trivia_pool table for lazy daily assembly.
 *
 * Usage:
 *   npx tsx scripts/5-trivia/generate-pool.ts              # Generate default counts
 *   npx tsx scripts/5-trivia/generate-pool.ts --count 500   # Generate 500 per format
 *   npx tsx scripts/5-trivia/generate-pool.ts --format higher_or_lower  # Single format
 */

import { getDb } from "../../lib/db";
import type Database from "better-sqlite3";

// ============================================================
// Types
// ============================================================

interface TriviaQuestion {
  format: string;
  question: string;
  options: TriviaOption[];
  correctIndex: number;
  reveal: {
    fact: string;
    imageUrl?: string;
    imageUrls?: string[];
  };
}

interface TriviaOption {
  label: string;
  text: string;
  tourId?: number;
}

type FormatGenerator = (db: Database.Database, count: number) => TriviaQuestion[];

// ============================================================
// Helpers
// ============================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${Math.round(price).toLocaleString()}`;
  if (price >= 100) return `$${Math.round(price)}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${minutes}m`;
}

const LABELS = ["A", "B", "C", "D"];

// ============================================================
// Format 1: Higher or Lower (Price)
// ============================================================

function generateHigherOrLower(db: Database.Database, count: number): TriviaQuestion[] {
  // Get tours with good data for price comparison
  const tours = db.prepare(`
    SELECT id, title, destination_name, country, from_price, rating, review_count,
           duration_minutes, image_url, one_liner
    FROM tours
    WHERE status = 'active'
      AND from_price IS NOT NULL AND from_price > 0 AND from_price < 100000
      AND image_url IS NOT NULL
      AND one_liner IS NOT NULL
      AND rating >= 3.0
      AND review_count >= 5
    ORDER BY RANDOM()
    LIMIT ?
  `).all(count * 6) as any[];

  const questions: TriviaQuestion[] = [];

  for (let i = 0; i < tours.length - 1 && questions.length < count; i += 2) {
    const a = tours[i];
    const b = tours[i + 1];
    if (!a || !b) break;

    // Skip boring pairs (prices too similar)
    const ratio = Math.max(a.from_price, b.from_price) / Math.min(a.from_price, b.from_price);
    if (ratio < 2 && ratio > 0.95) continue;

    const expensive = a.from_price >= b.from_price ? a : b;
    const cheap = a.from_price >= b.from_price ? b : a;

    // Randomize which appears as A vs B
    const options = shuffle([
      { tour: expensive, price: expensive.from_price },
      { tour: cheap, price: cheap.from_price },
    ]);

    const correctIndex = options.findIndex(o => o.tour.id === expensive.id);

    const durationA = options[0].tour.duration_minutes
      ? ` — ${formatDuration(options[0].tour.duration_minutes)}`
      : "";
    const durationB = options[1].tour.duration_minutes
      ? ` — ${formatDuration(options[1].tour.duration_minutes)}`
      : "";

    questions.push({
      format: "higher_or_lower",
      question: "Which costs more?",
      options: [
        {
          label: "A",
          text: `${options[0].tour.title} (${options[0].tour.destination_name}, ${options[0].tour.country})${durationA}`,
          tourId: options[0].tour.id,
        },
        {
          label: "B",
          text: `${options[1].tour.title} (${options[1].tour.destination_name}, ${options[1].tour.country})${durationB}`,
          tourId: options[1].tour.id,
        },
      ],
      correctIndex,
      reveal: {
        fact: `${formatPrice(expensive.from_price)} vs ${formatPrice(cheap.from_price)}. ${expensive.one_liner}`,
        imageUrl: expensive.image_url,
        imageUrls: [options[0].tour.image_url, options[1].tour.image_url],
      },
    });
  }

  return questions;
}

// ============================================================
// Format 2: Where in the World?
// ============================================================

function generateWhereInWorld(db: Database.Database, count: number): TriviaQuestion[] {
  // Tours with good one-liners that don't mention the city/country
  const tours = db.prepare(`
    SELECT id, title, destination_name, country, continent, from_price,
           rating, review_count, image_url, one_liner
    FROM tours
    WHERE status = 'active'
      AND one_liner IS NOT NULL
      AND image_url IS NOT NULL
      AND rating >= 4.0
      AND review_count >= 10
      AND LENGTH(one_liner) >= 40
    ORDER BY RANDOM()
    LIMIT ?
  `).all(count * 3) as any[];

  // Get all destinations grouped by continent for plausible wrong answers
  const destinations = db.prepare(`
    SELECT DISTINCT destination_name, country, continent
    FROM tours
    WHERE status = 'active' AND destination_name IS NOT NULL AND continent IS NOT NULL
    GROUP BY destination_name
    HAVING COUNT(*) >= 5
  `).all() as any[];

  const destByContinent = new Map<string, any[]>();
  for (const d of destinations) {
    const list = destByContinent.get(d.continent) || [];
    list.push(d);
    destByContinent.set(d.continent, list);
  }

  const questions: TriviaQuestion[] = [];

  for (const tour of tours) {
    if (questions.length >= count) break;

    // Skip if one-liner contains the destination or country name
    const linerLower = tour.one_liner.toLowerCase();
    if (
      linerLower.includes(tour.destination_name.toLowerCase()) ||
      linerLower.includes(tour.country.toLowerCase())
    ) {
      continue;
    }

    // Pick 3 wrong answers: prefer same continent for plausibility
    const sameContinent = (destByContinent.get(tour.continent) || []).filter(
      (d: any) => d.destination_name !== tour.destination_name
    );
    const otherContinents = destinations.filter(
      (d: any) => d.continent !== tour.continent && d.destination_name !== tour.destination_name
    );

    const wrongPool = shuffle([...shuffle(sameContinent).slice(0, 6), ...shuffle(otherContinents).slice(0, 3)]);
    const wrongs = wrongPool.slice(0, 3);
    if (wrongs.length < 3) continue;

    const allOptions = shuffle([
      { text: `${tour.destination_name}, ${tour.country}`, isCorrect: true },
      { text: `${wrongs[0].destination_name}, ${wrongs[0].country}`, isCorrect: false },
      { text: `${wrongs[1].destination_name}, ${wrongs[1].country}`, isCorrect: false },
      { text: `${wrongs[2].destination_name}, ${wrongs[2].country}`, isCorrect: false },
    ]);

    const correctIndex = allOptions.findIndex(o => o.isCorrect);

    questions.push({
      format: "where_in_world",
      question: tour.one_liner,
      options: allOptions.map((o, i) => ({
        label: LABELS[i],
        text: o.text,
        tourId: o.isCorrect ? tour.id : undefined,
      })),
      correctIndex,
      reveal: {
        fact: `${tour.title} in ${tour.destination_name}, ${tour.country}. ${tour.rating}★ with ${tour.review_count} reviews.`,
        imageUrl: tour.image_url,
      },
    });
  }

  return questions;
}

// ============================================================
// Format 4: The Numbers Game
// ============================================================

interface StatTemplate {
  query: string;
  questionTemplate: (value: number, label: string) => string;
  factTemplate: (value: number, label: string) => string;
  generateOptions: (value: number) => number[];
  isCurrency?: boolean;
}

function generateNumbersGame(db: Database.Database, count: number): TriviaQuestion[] {
  const templates: StatTemplate[] = [
    // Tour count by city
    {
      query: `SELECT destination_name as label, COUNT(*) as value FROM tours
              WHERE status='active' GROUP BY destination_name HAVING value >= 50
              ORDER BY RANDOM() LIMIT 1`,
      questionTemplate: (v, l) => `How many tours can you book in ${l}?`,
      factTemplate: (v, l) => `${l} has ${v} bookable tours on Viator.`,
      generateOptions: (v) => generateNumericOptions(v),
    },
    // Average price by country
    {
      query: `SELECT country as label, ROUND(AVG(from_price), 0) as value FROM tours
              WHERE status='active' AND from_price > 0 AND from_price < 100000
              GROUP BY country HAVING COUNT(*) >= 50
              ORDER BY RANDOM() LIMIT 1`,
      questionTemplate: (v, l) => `What's the average tour price in ${l}?`,
      factTemplate: (v, l) => `The average tour in ${l} costs ${formatPrice(v)}.`,
      generateOptions: (v) => generateNumericOptions(v, true),
      isCurrency: true,
    },
    // Most reviewed tour overall
    {
      query: `SELECT title as label, review_count as value FROM tours
              WHERE status='active' ORDER BY review_count DESC LIMIT 1`,
      questionTemplate: (v, l) => `The most-reviewed tour on Viator has how many reviews?`,
      factTemplate: (v, l) => `"${l}" has ${v.toLocaleString()} reviews.`,
      generateOptions: (v) => generateNumericOptions(v),
    },
    // Tour count by country
    {
      query: `SELECT country as label, COUNT(*) as value FROM tours
              WHERE status='active' GROUP BY country HAVING value >= 100
              ORDER BY RANDOM() LIMIT 1`,
      questionTemplate: (v, l) => `How many tours are available in ${l}?`,
      factTemplate: (v, l) => `${l} has ${v.toLocaleString()} tours on Viator.`,
      generateOptions: (v) => generateNumericOptions(v),
    },
    // Number of countries
    {
      query: `SELECT 'TourGraph' as label, COUNT(DISTINCT country) as value FROM tours WHERE status='active'`,
      questionTemplate: (v, l) => `How many countries have tours on TourGraph?`,
      factTemplate: (v, l) => `${v} countries — more than the UN has members.`,
      generateOptions: (v) => generateNumericOptions(v),
    },
    // Highest rating with many reviews
    {
      query: `SELECT destination_name as label, MAX(review_count) as value FROM tours
              WHERE status='active' AND rating = 5.0 AND review_count >= 100
              GROUP BY destination_name ORDER BY value DESC LIMIT 1`,
      questionTemplate: (v, l) => `The highest number of reviews for a perfect 5.0★ tour in ${l}?`,
      factTemplate: (v, l) => `A perfect 5.0★ tour in ${l} has ${v.toLocaleString()} reviews.`,
      generateOptions: (v) => generateNumericOptions(v),
    },
    // Number of destinations
    {
      query: `SELECT 'TourGraph' as label, COUNT(DISTINCT destination_name) as value FROM tours WHERE status='active'`,
      questionTemplate: (v, l) => `How many destinations worldwide have tours on TourGraph?`,
      factTemplate: (v, l) => `${v.toLocaleString()} destinations across 7 continents.`,
      generateOptions: (v) => generateNumericOptions(v),
    },
  ];

  const questions: TriviaQuestion[] = [];
  const shuffledTemplates = shuffle(templates);

  for (let round = 0; questions.length < count; round++) {
    for (const tmpl of shuffledTemplates) {
      if (questions.length >= count) break;

      const row = db.prepare(tmpl.query).get() as { label: string; value: number } | undefined;
      if (!row || !row.value) continue;

      const options = tmpl.generateOptions(row.value);
      const allOptions = shuffle(
        options.map(v => ({ value: v, isCorrect: v === row.value }))
      );
      // Ensure the correct answer is actually in the options
      if (!allOptions.find(o => o.isCorrect)) {
        allOptions[0] = { value: row.value, isCorrect: true };
      }

      const correctIndex = allOptions.findIndex(o => o.isCorrect);

      questions.push({
        format: "numbers_game",
        question: tmpl.questionTemplate(row.value, row.label),
        options: allOptions.map((o, i) => ({
          label: LABELS[i],
          text: tmpl.isCurrency ? formatPrice(o.value) : o.value.toLocaleString(),
        })),
        correctIndex,
        reveal: {
          fact: tmpl.factTemplate(row.value, row.label),
        },
      });
    }
    if (round > 3) break; // Safety valve
  }

  return questions;
}

function generateNumericOptions(correct: number, isCurrency = false): number[] {
  // Generate 3 plausible wrong answers
  const multipliers = [0.25, 0.4, 0.6, 1.5, 2.0, 3.0, 4.0];
  const wrongs: number[] = [];
  const shuffledMult = shuffle(multipliers);

  for (const m of shuffledMult) {
    if (wrongs.length >= 3) break;
    let wrong = Math.round(correct * m);
    if (wrong === correct) wrong = Math.round(correct * (m + 0.1));
    if (wrong <= 0) continue;
    if (wrongs.includes(wrong)) continue;
    if (isCurrency) wrong = Math.round(wrong / 10) * 10; // Round currency to nearest 10
    wrongs.push(wrong);
  }

  // Fill if needed
  while (wrongs.length < 3) {
    wrongs.push(Math.round(correct * (0.3 + Math.random() * 3)));
  }

  return [correct, ...wrongs.slice(0, 3)];
}

// ============================================================
// Format 5: Odd One Out
// ============================================================

function generateOddOneOut(db: Database.Database, count: number): TriviaQuestion[] {
  // Get cities with enough tours that have one-liners
  const cities = db.prepare(`
    SELECT destination_name, country, continent, COUNT(*) as cnt
    FROM tours
    WHERE status = 'active' AND one_liner IS NOT NULL AND image_url IS NOT NULL
    GROUP BY destination_name
    HAVING cnt >= 10
    ORDER BY RANDOM()
    LIMIT ?
  `).all(count * 3) as any[];

  const questions: TriviaQuestion[] = [];

  for (const city of cities) {
    if (questions.length >= count) break;

    // Get 3 tours from this city with one-liners that don't mention the city
    const sameCityTours = db.prepare(`
      SELECT id, one_liner, destination_name, country, image_url
      FROM tours
      WHERE status = 'active'
        AND destination_name = ?
        AND one_liner IS NOT NULL
        AND LOWER(one_liner) NOT LIKE ?
        AND LOWER(one_liner) NOT LIKE ?
      ORDER BY RANDOM()
      LIMIT 3
    `).all(
      city.destination_name,
      `%${city.destination_name.toLowerCase()}%`,
      `%${city.country.toLowerCase()}%`
    ) as any[];

    if (sameCityTours.length < 3) continue;

    // Get 1 tour from a different city (same continent for plausibility)
    const oddTour = db.prepare(`
      SELECT id, one_liner, destination_name, country, image_url
      FROM tours
      WHERE status = 'active'
        AND destination_name != ?
        AND continent = ?
        AND one_liner IS NOT NULL
        AND LOWER(one_liner) NOT LIKE ?
        AND LOWER(one_liner) NOT LIKE ?
      ORDER BY RANDOM()
      LIMIT 1
    `).all(
      city.destination_name,
      city.continent,
      `%${city.destination_name.toLowerCase()}%`,
      `%${city.country.toLowerCase()}%`
    ) as any[];

    if (oddTour.length === 0) continue;

    const allOptions = shuffle([
      ...sameCityTours.map((t: any) => ({ ...t, isOdd: false })),
      { ...oddTour[0], isOdd: true },
    ]);

    const correctIndex = allOptions.findIndex((o: any) => o.isOdd);

    questions.push({
      format: "odd_one_out",
      question: `Three of these tours are in the same city. Which is the odd one out?`,
      options: allOptions.map((o: any, i: number) => ({
        label: LABELS[i],
        text: o.one_liner,
        tourId: o.id,
      })),
      correctIndex,
      reveal: {
        fact: `The odd one out is in ${oddTour[0].destination_name}, ${oddTour[0].country}. The other three are all in ${city.destination_name}, ${city.country}.`,
        imageUrl: oddTour[0].image_url,
      },
    });
  }

  return questions;
}

// ============================================================
// Format 6: The Connection (Chain-Inspired)
// ============================================================

function generateTheConnection(db: Database.Database, count: number): TriviaQuestion[] {
  const chains = db.prepare(`
    SELECT id, city_from, city_to, chain_json FROM six_degrees_chains
    ORDER BY RANDOM() LIMIT ?
  `).all(count * 2) as any[];

  // Collect all known themes for wrong answers
  const allThemes = db.prepare(`
    SELECT DISTINCT json_each.value as theme
    FROM city_profiles, json_each(city_profiles.themes_json)
  `).all() as { theme: string }[];
  const themePool = allThemes.map(t => t.theme);

  const questions: TriviaQuestion[] = [];

  for (const chain of chains) {
    if (questions.length >= count) break;

    let parsed: any;
    try {
      parsed = JSON.parse(chain.chain_json);
    } catch {
      continue;
    }

    const stops = parsed.chain || parsed.stops;
    if (!stops || stops.length < 2) continue;

    // Pick a random consecutive pair from the chain
    const pairIndex = Math.floor(Math.random() * (stops.length - 1));
    const cityA = stops[pairIndex];
    const cityB = stops[pairIndex + 1];
    const connectingTheme = cityA.theme || cityB.theme;

    if (!connectingTheme) continue;

    // Generate 3 wrong themes
    const wrongThemes = shuffle(themePool.filter(t => t !== connectingTheme)).slice(0, 3);
    if (wrongThemes.length < 3) continue;

    const allOptions = shuffle([
      { text: connectingTheme, isCorrect: true },
      { text: wrongThemes[0], isCorrect: false },
      { text: wrongThemes[1], isCorrect: false },
      { text: wrongThemes[2], isCorrect: false },
    ]);

    const correctIndex = allOptions.findIndex(o => o.isCorrect);
    const connection = cityA.connection_to_next || "";

    questions.push({
      format: "the_connection",
      question: `What theme connects ${cityA.city} and ${cityB.city} in our Six Degrees chain?`,
      options: allOptions.map((o, i) => ({
        label: LABELS[i],
        text: o.text.charAt(0).toUpperCase() + o.text.slice(1),
      })),
      correctIndex,
      reveal: {
        fact: connection
          ? `${connectingTheme.charAt(0).toUpperCase() + connectingTheme.slice(1)}. ${connection.slice(0, 150)}`
          : `${connectingTheme.charAt(0).toUpperCase() + connectingTheme.slice(1)} connects ${cityA.city} to ${cityB.city}.`,
      },
    });
  }

  return questions;
}

// ============================================================
// Format 7: City Personality Match
// ============================================================

function generateCityPersonality(db: Database.Database, count: number): TriviaQuestion[] {
  const profiles = db.prepare(`
    SELECT destination_name, country, continent, personality, tour_count
    FROM city_profiles
    WHERE LENGTH(personality) >= 50 AND tour_count >= 20
    ORDER BY RANDOM()
    LIMIT ?
  `).all(count * 2) as any[];

  const allCities = db.prepare(`
    SELECT destination_name, country, continent
    FROM city_profiles
    WHERE tour_count >= 20
  `).all() as any[];

  const citiesByContinent = new Map<string, any[]>();
  for (const c of allCities) {
    const list = citiesByContinent.get(c.continent) || [];
    list.push(c);
    citiesByContinent.set(c.continent, list);
  }

  const questions: TriviaQuestion[] = [];

  for (const profile of profiles) {
    if (questions.length >= count) break;

    // Wrong answers: same continent or neighboring region for plausibility
    const sameContinent = (citiesByContinent.get(profile.continent) || []).filter(
      (c: any) => c.destination_name !== profile.destination_name
    );
    const otherCities = allCities.filter(
      (c: any) => c.continent !== profile.continent && c.destination_name !== profile.destination_name
    );

    const wrongPool = shuffle([...shuffle(sameContinent).slice(0, 5), ...shuffle(otherCities).slice(0, 3)]);
    const wrongs = wrongPool.slice(0, 3);
    if (wrongs.length < 3) continue;

    const allOptions = shuffle([
      { text: `${profile.destination_name}, ${profile.country}`, isCorrect: true },
      { text: `${wrongs[0].destination_name}, ${wrongs[0].country}`, isCorrect: false },
      { text: `${wrongs[1].destination_name}, ${wrongs[1].country}`, isCorrect: false },
      { text: `${wrongs[2].destination_name}, ${wrongs[2].country}`, isCorrect: false },
    ]);

    const correctIndex = allOptions.findIndex(o => o.isCorrect);

    questions.push({
      format: "city_personality",
      question: profile.personality,
      options: allOptions.map((o, i) => ({
        label: LABELS[i],
        text: o.text,
      })),
      correctIndex,
      reveal: {
        fact: `${profile.destination_name}, ${profile.country} — with ${profile.tour_count} tours to explore.`,
      },
    });
  }

  return questions;
}

// ============================================================
// Main: Generate and Insert Pool
// ============================================================

const GENERATORS: Record<string, FormatGenerator> = {
  higher_or_lower: generateHigherOrLower,
  where_in_world: generateWhereInWorld,
  // real_or_fake: handled separately in step 2b (needs Haiku)
  numbers_game: generateNumbersGame,
  odd_one_out: generateOddOneOut,
  the_connection: generateTheConnection,
  city_personality: generateCityPersonality,
};

function main() {
  const args = process.argv.slice(2);
  const countArg = args.indexOf("--count");
  const formatArg = args.indexOf("--format");
  const perFormat = countArg >= 0 ? parseInt(args[countArg + 1], 10) : 200;
  const onlyFormat = formatArg >= 0 ? args[formatArg + 1] : null;

  const db = getDb();

  // Check existing pool
  const existing = db.prepare("SELECT format, COUNT(*) as cnt FROM trivia_pool GROUP BY format").all() as any[];
  if (existing.length > 0) {
    console.log("\nExisting pool:");
    for (const row of existing) {
      console.log(`  ${row.format}: ${row.cnt} questions`);
    }
    console.log("");
  }

  const insert = db.prepare(`
    INSERT INTO trivia_pool (format, question_json) VALUES (?, ?)
  `);

  let totalGenerated = 0;

  const formats = onlyFormat ? { [onlyFormat]: GENERATORS[onlyFormat] } : GENERATORS;

  for (const [format, generator] of Object.entries(formats)) {
    if (!generator) {
      console.log(`Unknown format: ${format}`);
      continue;
    }

    console.log(`Generating ${perFormat} ${format} questions...`);
    const questions = generator(db, perFormat);

    const insertBatch = db.transaction(() => {
      for (const q of questions) {
        insert.run(format, JSON.stringify(q));
      }
    });
    insertBatch();

    console.log(`  → ${questions.length} generated`);
    totalGenerated += questions.length;
  }

  console.log(`\nTotal: ${totalGenerated} questions added to trivia_pool`);

  // Final counts
  const final = db.prepare("SELECT format, COUNT(*) as cnt FROM trivia_pool GROUP BY format").all() as any[];
  console.log("\nPool totals:");
  for (const row of final) {
    console.log(`  ${(row as any).format}: ${(row as any).cnt}`);
  }
}

main();
