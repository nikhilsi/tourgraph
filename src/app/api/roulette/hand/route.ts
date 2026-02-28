import { NextResponse } from "next/server";
import { getRouletteHand } from "@/lib/db";
import type { TourRow, RouletteTour, RouletteHandResponse } from "@/lib/types";

const MAX_EXCLUDE_IDS = 200; // H3: Cap to prevent URL/SQL bombs

// Simple in-memory rate limiter (H2)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function tourRowToRouletteTour(row: TourRow): RouletteTour {
  return {
    id: row.id,
    productCode: row.product_code,
    title: row.title,
    oneLiner: row.one_liner ?? "",
    destinationName: row.destination_name ?? "",
    country: row.country ?? "",
    continent: row.continent ?? "",
    rating: row.rating ?? 0,       // M6: ?? instead of ||
    reviewCount: row.review_count ?? 0,
    fromPrice: row.from_price ?? 0,
    durationMinutes: row.duration_minutes ?? 0,
    imageUrl: row.image_url ?? "",
    viatorUrl: row.viator_url ?? "",
    weightCategory: row.weight_category ?? "wildcard",
  };
}

export async function GET(request: Request) {
  try {
    // H2: Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { hand: [], error: "Too many requests" },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);

    // H3: Parse and cap exclude parameter
    const excludeParam = searchParams.get("exclude");
    const excludeIds = excludeParam
      ? excludeParam
          .split(",")
          .slice(0, MAX_EXCLUDE_IDS)
          .map(Number)
          .filter((n) => n > 0 && Number.isInteger(n))
      : [];

    const hand = getRouletteHand(excludeIds);

    const response: RouletteHandResponse = {
      hand: hand.map(tourRowToRouletteTour),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Roulette hand error:", error);
    return NextResponse.json(
      { hand: [], error: "Failed to fetch tours" },
      { status: 500 }
    );
  }
}
