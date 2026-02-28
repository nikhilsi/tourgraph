import { NextResponse } from "next/server";
import { getRouletteHand } from "@/lib/db";
import type { TourRow, RouletteTour, RouletteHandResponse } from "@/lib/types";

function tourRowToRouletteTour(row: TourRow): RouletteTour {
  return {
    id: row.id,
    productCode: row.product_code,
    title: row.title,
    oneLiner: row.one_liner || "",
    destinationName: row.destination_name || "",
    country: row.country || "",
    continent: row.continent || "",
    rating: row.rating || 0,
    reviewCount: row.review_count || 0,
    fromPrice: row.from_price || 0,
    durationMinutes: row.duration_minutes || 0,
    imageUrl: row.image_url || "",
    viatorUrl: row.viator_url || "",
    weightCategory: row.weight_category || "wildcard",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Parse exclude parameter: ?exclude=1,2,3
  const excludeParam = searchParams.get("exclude");
  const excludeIds = excludeParam
    ? excludeParam.split(",").map(Number).filter(Boolean)
    : [];

  const hand = getRouletteHand(excludeIds);

  const response: RouletteHandResponse = {
    hand: hand.map(tourRowToRouletteTour),
  };

  return NextResponse.json(response);
}
