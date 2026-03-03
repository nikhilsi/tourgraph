import { NextResponse } from "next/server";
import { getRouletteHand, tourRowToRouletteTour } from "@/lib/db";
import type { RouletteHandResponse } from "@/lib/types";

const MAX_EXCLUDE_IDS = 200; // H3: Cap to prevent URL/SQL bombs

// Simple in-memory rate limiter (H2)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_MAX_ENTRIES = 10_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Evict stale entries periodically to prevent unbounded growth
  if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

/** Extract client IP: use rightmost non-private IP from X-Forwarded-For (set by Nginx) */
function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (!xff) return "unknown";
  // Rightmost entry is the one appended by our trusted Nginx proxy
  const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || "unknown";
}

export async function GET(request: Request) {
  try {
    // H2: Rate limiting
    const ip = getClientIp(request);
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
