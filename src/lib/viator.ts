import type {
  ViatorDestination,
  ViatorProductDetail,
  ViatorSearchProduct,
  ViatorSearchResponse,
  ViatorTag,
} from "./types";

const BASE_URL = "https://api.viator.com/partner";

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

  // Rate limiting: pause every 50 requests to stay well under 150/10s
  private async throttle(): Promise<void> {
    this.requestCount++;
    if (this.requestCount % 50 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async request<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    await this.throttle();

    const url = `${BASE_URL}${endpoint}`;
    const headers = { ...this.headers };

    // GET requests don't need Content-Type (matches Python client pattern)
    if (method === "GET") {
      delete headers["Content-Type"];
    }

    const options: RequestInit = { method, headers };

    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Viator API ${method} ${endpoint}: ${response.status} ${response.statusText} — ${text.slice(0, 200)}`
      );
    }

    return response.json() as Promise<T>;
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
  // Used for connectivity test and tag lookups
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
  // Returns all ~3,380 destinations with timezone, geo, hierarchy
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

  // Prefer 720x480 variant (largest landscape)
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
    duration.fixedDurationInMinutes ||
    duration.variableDurationFromMinutes ||
    null
  );
}

export function extractInclusions(product: ViatorProductDetail): string[] {
  return (product.inclusions || [])
    .map((inc) => inc.otherDescription || inc.typeDescription)
    .filter((s): s is string => !!s);
}

// ============================================================
// Env loader for standalone scripts
// ============================================================

export function loadEnv(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs");
  const envPath = ".env.local";
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8") as string;
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
    }
  }
}

// ============================================================
// Self-test (run with: npx tsx src/lib/viator.ts)
// ============================================================

if (require.main === module) {
  (async () => {
    loadEnv();
    console.log("Testing Viator API client...\n");

    const client = new ViatorClient();

    // Test 1: Tags (connectivity check)
    console.log("1. Testing connectivity via /products/tags/...");
    const tags = await client.getTags();
    console.log(`   ✓ ${tags.length} tags loaded`);

    // Test 2: Destinations (GET /destinations)
    console.log("2. Fetching all destinations...");
    const destinations = await client.getDestinations();
    console.log(`   ✓ ${destinations.length} destinations loaded`);
    const seattle = destinations.find((d) => d.destinationId === 704);
    if (seattle) {
      console.log(
        `     Seattle: id=${seattle.destinationId}, type=${seattle.type}, tz=${seattle.timeZone}`
      );
      console.log(
        `     Center: ${seattle.center?.latitude}, ${seattle.center?.longitude}`
      );
    }

    // Test 3: Search products in Seattle (dest_id 704)
    console.log("3. Searching products in Seattle (704)...");
    const searchResults = await client.searchProducts("704", { count: 5 });
    console.log(
      `   ✓ ${searchResults.totalCount} total, showing first ${searchResults.products.length}:`
    );
    for (const p of searchResults.products.slice(0, 3)) {
      const price = p.pricing?.summary?.fromPrice;
      const rating = p.reviews?.combinedAverageRating;
      console.log(
        `     - ${p.productCode}: ${p.title} ($${price}, ${rating}★)`
      );
    }

    // Test 4: Product detail for 5396MTR
    console.log("4. Fetching product detail for 5396MTR...");
    const product = await client.getProduct("5396MTR");
    const coverUrl = extractCoverImageUrl(product);
    const duration = extractDurationMinutes(product);
    console.log(`   ✓ "${product.title}"`);
    console.log(
      `     Rating: ${product.reviews.combinedAverageRating} (${product.reviews.totalReviews} reviews)`
    );
    console.log(`     Duration: ${duration} minutes`);
    console.log(`     Supplier: ${product.supplier.name}`);
    console.log(`     Cover image: ${coverUrl?.slice(0, 80)}...`);
    console.log(`     Viator URL: ${product.productUrl.slice(0, 80)}...`);
    console.log(`     Tags: ${product.tags.join(", ")}`);

    console.log("\nAll Viator API tests passed!");
  })();
}
