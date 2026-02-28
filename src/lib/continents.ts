// ============================================================
// Continent Mapping
//
// Viator's lookupId hierarchy encodes continent as the first
// segment. These codes are derived from analyzing all 3,380
// destinations returned by GET /destinations.
// ============================================================

export const VIATOR_CONTINENT_CODES: Record<string, string> = {
  "1": "Africa",
  "2": "Asia",
  "3": "Oceania",
  "4": "Caribbean",
  "6": "Europe",
  "8": "North America",
  "9": "South America",
};

/**
 * Extract continent name from a Viator destination's lookupId.
 * lookupId format: "continentCode.countryId[.regionId.cityId...]"
 */
export function continentFromLookupId(lookupId: string): string {
  const code = lookupId.split(".")[0];
  return VIATOR_CONTINENT_CODES[code] || "Unknown";
}
