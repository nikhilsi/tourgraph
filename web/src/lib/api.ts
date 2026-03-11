// API client — all data fetched from the backend API server.
// In production: localhost:3001 (same droplet). In dev: same.

const API_URL = process.env.API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    cache: "no-store", // Server Components: always fresh
  });
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ============================================================
// Types (match backend response shapes)
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

export interface ChainLink {
  city: string;
  country: string;
  tour_title: string;
  tour_id: number;
  connection_to_next: string | null;
  theme: string;
}

export interface ChainWithMeta {
  id: number;
  slug: string;
  city_from: string;
  city_to: string;
  chain: ChainLink[];
  summary: string;
  generated_at: string;
}

// ============================================================
// Roulette
// ============================================================

export async function getRouletteHand(excludeIds: number[] = []): Promise<RouletteTour[]> {
  const exclude = excludeIds.length > 0 ? `?exclude=${excludeIds.join(",")}` : "";
  const data = await apiFetch<{ hand: RouletteTour[] }>(`/roulette/hand${exclude}`);
  return data.hand;
}

// ============================================================
// Tours
// ============================================================

export async function getTourDetail(id: number): Promise<TourDetail | null> {
  try {
    return await apiFetch<TourDetail>(`/tours/${id}`);
  } catch {
    return null;
  }
}

export async function getTourCard(id: number): Promise<RouletteTour | null> {
  try {
    return await apiFetch<RouletteTour>(`/tours/${id}/card`);
  } catch {
    return null;
  }
}

// ============================================================
// Right Now
// ============================================================

export async function getTimezones(): Promise<string[]> {
  const data = await apiFetch<{ timezones: string[] }>("/right-now/timezones");
  return data.timezones;
}

export async function getRightNowTours(
  timezones: string[],
  count: number
): Promise<(RouletteTour & { timezone: string })[]> {
  const params = `?timezones=${timezones.join(",")}&count=${count}`;
  const data = await apiFetch<{ tours: (RouletteTour & { timezone: string })[] }>(
    `/right-now/tours${params}`
  );
  return data.tours;
}

// ============================================================
// Superlatives
// ============================================================

export async function getAllSuperlatives(): Promise<{ type: string; tour: RouletteTour }[]> {
  const data = await apiFetch<{ superlatives: { type: string; tour: RouletteTour }[] }>(
    "/superlatives"
  );
  return data.superlatives;
}

export async function getSuperlative(type: string): Promise<TourDetail | null> {
  try {
    const data = await apiFetch<{ type: string; tour: TourDetail }>(`/superlatives/${type}`);
    return data.tour;
  } catch {
    return null;
  }
}

// ============================================================
// Chains
// ============================================================

export async function getRandomChain(): Promise<ChainWithMeta | null> {
  try {
    return await apiFetch<ChainWithMeta>("/chains/random");
  } catch {
    return null;
  }
}

export async function getChainBySlug(slug: string): Promise<ChainWithMeta | null> {
  try {
    return await apiFetch<ChainWithMeta>(`/chains/${slug}`);
  } catch {
    return null;
  }
}

export async function getChainCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>("/chains/count");
  return data.count;
}

export async function getChainSlugs(): Promise<string[]> {
  const data = await apiFetch<{ slugs: string[] }>("/chains/slugs");
  return data.slugs;
}

// ============================================================
// Stats
// ============================================================

export async function getStats(): Promise<{ tours: number; destinations: number; countries: number }> {
  return apiFetch("/stats");
}
