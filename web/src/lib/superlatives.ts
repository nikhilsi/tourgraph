import { formatPrice, formatDurationShort, formatDurationLong } from "./format";
import type { SuperlativeType, TourRow } from "./types";

export const VALID_SLUGS: SuperlativeType[] = [
  "most-expensive",
  "cheapest-5star",
  "longest",
  "shortest",
  "most-reviewed",
  "hidden-gem",
];

export function isValidSlug(slug: string): slug is SuperlativeType {
  return VALID_SLUGS.includes(slug as SuperlativeType);
}

export const SUPERLATIVE_TITLES: Record<SuperlativeType, string> = {
  "most-expensive": "Most Expensive Tour",
  "cheapest-5star": "Cheapest 5-Star Experience",
  longest: "Longest Tour on Earth",
  shortest: "Shortest Tour on Earth",
  "most-reviewed": "Most Reviewed Tour",
  "hidden-gem": "Highest-Rated Hidden Gem",
};

export const SUPERLATIVE_DESCRIPTIONS: Record<SuperlativeType, string> = {
  "most-expensive": "The priciest experience money can buy",
  "cheapest-5star": "Top-rated and practically free",
  longest: "Pack your bags — you'll be gone a while",
  shortest: "Blink and you might miss it",
  "most-reviewed": "Everyone's been, and everyone loved it",
  "hidden-gem": "Quietly exceptional",
};

export function superlativeStatShort(type: SuperlativeType, tour: TourRow): string {
  switch (type) {
    case "most-expensive":
    case "cheapest-5star":
      return formatPrice(tour.from_price ?? 0);
    case "longest":
    case "shortest":
      return formatDurationShort(tour.duration_minutes ?? 0);
    case "most-reviewed":
      return `${(tour.review_count ?? 0).toLocaleString("en-US")} reviews`;
    case "hidden-gem":
      return `${(tour.rating ?? 0).toFixed(1)} stars`;
  }
}

export function superlativeStatLong(type: SuperlativeType, tour: TourRow): string {
  switch (type) {
    case "most-expensive":
    case "cheapest-5star":
      return formatPrice(tour.from_price ?? 0);
    case "longest":
    case "shortest":
      return formatDurationLong(tour.duration_minutes ?? 0);
    case "most-reviewed":
      return `${(tour.review_count ?? 0).toLocaleString("en-US")} reviews`;
    case "hidden-gem":
      return `${(tour.rating ?? 0).toFixed(1)} stars`;
  }
}
