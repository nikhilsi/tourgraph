import type { TourRow, RouletteTour, TourDetail } from "./types";

// Row → API card format (used by roulette, right-now, superlatives)
export function tourRowToRouletteTour(row: TourRow): RouletteTour {
  return {
    id: row.id,
    productCode: row.product_code,
    title: row.title,
    oneLiner: row.one_liner ?? "",
    destinationName: row.destination_name ?? "",
    country: row.country ?? "",
    continent: row.continent ?? "",
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    fromPrice: row.from_price ?? 0,
    durationMinutes: row.duration_minutes ?? 0,
    imageUrl: row.image_url ?? "",
    viatorUrl: row.viator_url ?? "",
    weightCategory: row.weight_category ?? "wildcard",
  };
}

// Row → full detail format (used by tour detail pages)
export function tourRowToDetail(row: TourRow): TourDetail {
  return {
    ...tourRowToRouletteTour(row),
    description: row.description ?? "",
    highlights: safeParseJson(row.highlights_json),
    inclusions: safeParseJson(row.inclusions_json),
    imageUrls: safeParseJson(row.image_urls_json),
    supplierName: row.supplier_name ?? "",
  };
}

function safeParseJson(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
