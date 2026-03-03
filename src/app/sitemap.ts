import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { VALID_SLUGS } from "@/lib/superlatives";

export default function sitemap(): MetadataRoute.Sitemap {
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
  const db = getDb(true);
  const chains = db
    .prepare("SELECT slug FROM six_degrees_chains WHERE slug IS NOT NULL")
    .all() as { slug: string }[];

  const chainPages: MetadataRoute.Sitemap = chains.map((row) => ({
    url: `${base}/six-degrees/${row.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...superlativePages, ...chainPages];
}
