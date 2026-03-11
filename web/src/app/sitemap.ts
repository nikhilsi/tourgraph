import type { MetadataRoute } from "next";
import { getChainSlugs } from "@/lib/api";
import { VALID_SLUGS } from "@/lib/superlatives";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://tourgraph.ai";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/right-now`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/worlds-most`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/six-degrees`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/story`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Superlative detail pages
  const superlativePages: MetadataRoute.Sitemap = VALID_SLUGS.map((slug) => ({
    url: `${base}/worlds-most/${slug}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Six Degrees chain pages
  let chainPages: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getChainSlugs();
    chainPages = slugs.map((slug) => ({
      url: `${base}/six-degrees/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // API might not be available during build
  }

  return [...staticPages, ...superlativePages, ...chainPages];
}
