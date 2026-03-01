// ============================================================
// Database Row Types (match SQLite schema in architecture.md)
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

export interface DestinationRow {
  id: string;
  name: string;
  parent_id: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface SuperlativeRow {
  id: number;
  type: string;
  tour_id: number;
  stat_value: string;
  stat_label: string;
  generated_date: string;
}

export interface SixDegreesChainRow {
  id: number;
  city_from: string;
  city_to: string;
  chain_json: string;
  generated_at: string;
}

// ============================================================
// API Response Types (Roulette Hand)
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

export interface RouletteHandResponse {
  hand: RouletteTour[];
}

// ============================================================
// Tour Detail (full data for detail page)
// ============================================================

export interface TourDetail extends RouletteTour {
  description: string;
  highlights: string[];
  inclusions: string[];
  imageUrls: string[];
  supplierName: string;
}

// ============================================================
// Right Now Somewhere
// ============================================================

export interface RightNowMoment {
  tour: RouletteTour;
  timezone: string;
  localTime: string;
  timeOfDayLabel: string;
}

// ============================================================
// World's Most Superlatives
// ============================================================

export type SuperlativeType =
  | "most-expensive"
  | "cheapest-5star"
  | "longest"
  | "shortest"
  | "most-reviewed"
  | "hidden-gem";

export interface SuperlativeConfig {
  type: SuperlativeType;
  title: string;
  statLabel: string;
}

export interface SuperlativeResult {
  type: SuperlativeType;
  tour: TourRow;
}

// ============================================================
// Weight Categories (Roulette Hand Algorithm)
// ============================================================

export type WeightCategory =
  | "highest_rated"
  | "most_reviewed"
  | "most_expensive"
  | "cheapest_5star"
  | "unique"
  | "exotic_location"
  | "wildcard";

// ============================================================
// Viator API Types (from real API responses)
// ============================================================

export interface ViatorImageVariant {
  height: number;
  width: number;
  url: string;
}

export interface ViatorImage {
  imageSource: string;
  caption: string;
  isCover: boolean;
  variants: ViatorImageVariant[];
}

export interface ViatorReviewSource {
  provider: string;
  totalCount: number;
  averageRating: number;
}

export interface ViatorReviews {
  sources: ViatorReviewSource[];
  totalReviews: number;
  combinedAverageRating: number;
}

export interface ViatorDuration {
  fixedDurationInMinutes?: number;
  variableDurationFromMinutes?: number;
  variableDurationToMinutes?: number;
}

export interface ViatorItinerary {
  itineraryType: string;
  skipTheLine?: boolean;
  privateTour?: boolean;
  duration?: ViatorDuration;
}

export interface ViatorInclusion {
  category: string;
  categoryDescription: string;
  type: string;
  typeDescription: string;
  otherDescription?: string;
}

export interface ViatorDestinationRef {
  ref: string;
  primary: boolean;
}

export interface ViatorSupplier {
  name: string;
  reference: string;
}

export interface ViatorProductDetail {
  status: string;
  productCode: string;
  language: string;
  title: string;
  description: string;
  images: ViatorImage[];
  reviews: ViatorReviews;
  destinations: ViatorDestinationRef[];
  timeZone: string;
  itinerary: ViatorItinerary;
  inclusions: ViatorInclusion[];
  tags: number[];
  supplier: ViatorSupplier;
  productUrl: string;
}

// Search result product (subset of fields returned by /products/search)
export interface ViatorSearchProduct {
  productCode: string;
  title: string;
  description?: string;
  images: ViatorImage[];
  reviews?: {
    combinedAverageRating: number;
    totalReviews: number;
  };
  pricing?: {
    summary: {
      fromPrice: number;
    };
    currency?: string;
  };
  destinations?: ViatorDestinationRef[];
  tags?: number[];
  productUrl?: string;
}

export interface ViatorSearchResponse {
  products: ViatorSearchProduct[];
  totalCount: number;
}

// Destination from GET /destinations
export interface ViatorDestination {
  destinationId: number;
  name: string;
  type: string;
  parentDestinationId: number;
  lookupId: string;
  timeZone?: string;
  center?: { latitude: number; longitude: number };
  defaultCurrencyCode?: string;
  iataCodes?: string[];
  destinationUrl?: string;
}

// Tag from /products/tags
export interface ViatorTag {
  tagId: number;
  parentTagIds: number[];
  allNamesByLocale: Record<string, string>;
}
