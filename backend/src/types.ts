// ============================================================
// Database Row Types (match SQLite schema)
// ============================================================

export interface TourRow {
  id: number;
  product_code: string;
  title: string;
  description: string | null;
  one_liner: string | null;
  destination_id: string | null;
  destination_name: string | null;
  country: string | null;
  continent: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  review_count: number | null;
  from_price: number | null;
  currency: string;
  duration_minutes: number | null;
  image_url: string | null;
  image_urls_json: string | null;
  highlights_json: string | null;
  inclusions_json: string | null;
  viator_url: string | null;
  supplier_name: string | null;
  tags_json: string | null;
  weight_category: string | null;
  status: string;
  indexed_at: string;
  last_seen_at: string;
  summary_hash: string | null;
}

// ============================================================
// API Response Types
// ============================================================

export interface RouletteTour {
  id: number;
  productCode: string;
  title: string;
  oneLiner: string;
  destinationName: string;
  country: string;
  continent: string;
  rating: number;
  reviewCount: number;
  fromPrice: number;
  durationMinutes: number;
  imageUrl: string;
  viatorUrl: string;
  weightCategory: string;
}

export interface TourDetail extends RouletteTour {
  description: string;
  highlights: string[];
  inclusions: string[];
  imageUrls: string[];
  supplierName: string;
}

export type WeightCategory =
  | "highest_rated"
  | "most_reviewed"
  | "most_expensive"
  | "cheapest_5star"
  | "unique"
  | "exotic_location"
  | "wildcard";

export type SuperlativeType =
  | "most-expensive"
  | "cheapest-5star"
  | "longest"
  | "shortest"
  | "most-reviewed"
  | "hidden-gem";

// ============================================================
// Chain Types
// ============================================================

export interface ChainLink {
  city: string;
  country: string;
  tour_title: string;
  tour_id: number;
  connection_to_next: string | null;
  theme: string;
}

export interface ChainData {
  city_from: string;
  city_to: string;
  chain: ChainLink[];
  summary: string;
}

export interface ChainWithMeta extends ChainData {
  id: number;
  slug: string;
  generated_at: string;
}
