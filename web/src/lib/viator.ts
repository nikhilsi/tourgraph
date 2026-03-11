import type {
  ViatorDestination,
  ViatorProductDetail,
  ViatorSearchProduct,
  ViatorSearchResponse,
  ViatorTag,
} from "./types";

const BASE_URL = "https://api.viator.com/partner";

// Rate limiting constants
const THROTTLE_BATCH_SIZE = 50;
const THROTTLE_PAUSE_MS = 1000;
const MAX_RETRIES = 3;
const LOW_REMAINING_THRESHOLD = 10;
const LOW_REMAINING_PAUSE_MS = 2000;

// ============================================================
// Viator API Client
// Ported from archive/scripts/viator_compare.py
// ============================================================

export class ViatorClient {
  private apiKey: string;
  private requestCount = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VIATOR_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("VIATOR_API_KEY is required");
    }
  }

  private get headers(): Record<string, string> {
    return {
      "exp-api-key": this.apiKey,
      Accept: "application/json;version=2.0",
      "Accept-Language": "en-US",
      "Content-Type": "application/json",
    };
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  // Rate limiting: pause every THROTTLE_BATCH_SIZE requests
  private async throttle(): Promise<void> {
    this.requestCount++;
    if (this.requestCount % THROTTLE_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, THROTTLE_PAUSE_MS));
    }
  }

  // H6/H12: Retry with exponential backoff, read rate limit headers
  private async request<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await this.throttle();

      const url = `${BASE_URL}${endpoint}`;
      const headers = { ...this.headers };

      // GET requests don't need Content-Type
      if (method === "GET") {
        delete headers["Content-Type"];
      }

      const options: RequestInit = { method, headers };
      if (body && method === "POST") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      // Read rate limit headers for proactive throttling
      const remaining = parseInt(response.headers.get("RateLimit-Remaining") || "100");
      if (remaining < LOW_REMAINING_THRESHOLD) {
        await new Promise((resolve) => setTimeout(resolve, LOW_REMAINING_PAUSE_MS));
      }

      // Retry on transient errors (429, 5xx)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.warn(
            `  Viator API ${response.status} on ${endpoint}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Viator API ${method} ${endpoint}: ${response.status} ${response.statusText} — ${text.slice(0, 200)}`
        );
      }

      return response.json() as Promise<T>;
    }

    // Should not reach here, but TypeScript needs a return
    throw new Error(`Viator API ${method} ${endpoint}: max retries exceeded`);
  }

  // ============================================================
  // Product Search (POST /products/search)
  // ============================================================

  async searchProducts(
    destId: string,
    options?: {
      sort?: string;
      order?: string;
      count?: number;
      start?: number;
    }
  ): Promise<ViatorSearchResponse> {
    const { sort = "DEFAULT", order, count = 50, start = 1 } = options || {};

    const sorting: Record<string, string> = { sort };
    if (order) sorting.order = order;

    const response = await this.request<{
      products: ViatorSearchProduct[];
      totalCount: number;
    }>("POST", "/products/search", {
      filtering: { destination: destId },
      sorting,
      pagination: { start, count },
      currency: "USD",
    });

    return {
      products: response.products || [],
      totalCount: response.totalCount || 0,
    };
  }

  // ============================================================
  // Product Details (GET /products/{code})
  // ============================================================

  async getProduct(productCode: string): Promise<ViatorProductDetail> {
    return this.request<ViatorProductDetail>(
      "GET",
      `/products/${productCode}`
    );
  }

  // ============================================================
  // Tags (GET /products/tags/)
  // ============================================================

  async getTags(): Promise<ViatorTag[]> {
    const response = await this.request<{ tags: ViatorTag[] }>(
      "GET",
      "/products/tags/"
    );
    return response.tags || [];
  }

  // ============================================================
  // Destinations (GET /destinations)
  // ============================================================

  async getDestinations(): Promise<ViatorDestination[]> {
    const response = await this.request<{
      destinations: ViatorDestination[];
      totalCount: number;
    }>("GET", "/destinations");
    return response.destinations || [];
  }
}

// ============================================================
// Helpers: Extract fields from Viator product detail
// ============================================================

export function extractCoverImageUrl(
  product: ViatorProductDetail
): string | null {
  const coverImage =
    product.images.find((img) => img.isCover) || product.images[0];
  if (!coverImage) return null;

  const hero = coverImage.variants.find(
    (v) => v.width === 720 && v.height === 480
  );
  return hero?.url || coverImage.variants[coverImage.variants.length - 1]?.url || null;
}

export function extractAllImageUrls(product: ViatorProductDetail): string[] {
  return product.images
    .map((img) => {
      const variant = img.variants.find(
        (v) => v.width === 720 && v.height === 480
      );
      return variant?.url || img.variants[img.variants.length - 1]?.url;
    })
    .filter((url): url is string => !!url);
}

export function extractDurationMinutes(
  product: ViatorProductDetail
): number | null {
  const duration = product.itinerary?.duration;
  if (!duration) return null;
  return (
    duration.fixedDurationInMinutes ??
    duration.variableDurationFromMinutes ??
    null
  );
}

export function extractInclusions(product: ViatorProductDetail): string[] {
  return (product.inclusions || [])
    .map((inc) => inc.otherDescription || inc.typeDescription)
    .filter((s): s is string => !!s);
}
